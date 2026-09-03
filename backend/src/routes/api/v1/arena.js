const fp = require('fastify-plugin');
const crypto = require('crypto');

async function arenaRoutes(fastify, options) {
  
  // 1. Create a match room
  fastify.post('/create', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    const userId = request.user.id;
    
    // Get user exam preference
    const { data: user } = await fastify.supabaseAdmin
      .from('users')
      .select('exam_preference')
      .eq('id', userId)
      .single();
      
    const exam = user?.exam_preference || 'UPSC_GS1';
    const roomCode = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 char hex
    
    const { data: match, error } = await fastify.supabaseAdmin
      .from('custom_matches')
      .insert({
        room_code: roomCode,
        host_id: userId,
        exam: exam,
        status: 'waiting'
      })
      .select()
      .single();
      
    if (error) {
      fastify.log.error('Failed to create match:', error);
      return reply.status(500).send({ error: 'Failed to create match' });
    }
    
    reply.send(match);
  });

  // 2. Join a match room
  fastify.post('/join', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['room_code'],
        properties: { room_code: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { room_code } = request.body;
    
    const { data: match, error: fetchErr } = await fastify.supabaseAdmin
      .from('custom_matches')
      .select('*')
      .eq('room_code', room_code.toUpperCase())
      .eq('status', 'waiting')
      .single();
      
    if (fetchErr || !match) {
      return reply.status(404).send({ error: 'Room not found or already started' });
    }
    
    if (match.host_id === userId) {
      return reply.send(match); // Host re-joining
    }
    
    const { data: updatedMatch, error: updateErr } = await fastify.supabaseAdmin
      .from('custom_matches')
      .update({ guest_id: userId })
      .eq('id', match.id)
      .select()
      .single();
      
    if (updateErr) {
      return reply.status(500).send({ error: 'Failed to join room' });
    }
    
    reply.send(updatedMatch);
  });

  // 3. Start a match (Host only)
  fastify.post('/start', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['match_id'],
        properties: { match_id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { match_id } = request.body;
    
    const { data: match } = await fastify.supabaseAdmin
      .from('custom_matches')
      .select('*')
      .eq('id', match_id)
      .single();
      
    if (!match || match.host_id !== userId) {
      return reply.status(403).send({ error: 'Unauthorized or match not found' });
    }
    
    // Fetch 5 random questions for this exam
    // In a real app, use a randomized RPC, but for MVP we use .limit() on approved questions
    const { data: questions } = await fastify.supabaseAdmin
      .from('questions')
      .select('id')
      .eq('exam', match.exam)
      .eq('status', 'approved')
      .limit(5);
      
    if (!questions || questions.length === 0) {
      return reply.status(400).send({ error: 'Not enough questions available' });
    }
    
    // Insert rounds
    const rounds = questions.map((q, idx) => ({
      match_id: match.id,
      question_id: q.id,
      round_number: idx + 1
    }));
    
    await fastify.supabaseAdmin.from('match_rounds').insert(rounds);
    
    // Update match status to active
    await fastify.supabaseAdmin
      .from('custom_matches')
      .update({ status: 'active' })
      .eq('id', match.id);
      
    reply.send({ success: true, total_rounds: questions.length });
  });

  // 4. Submit answer for a round
  fastify.post('/submit', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['match_id', 'round_number', 'selected_option', 'time_taken_ms'],
        properties: {
          match_id: { type: 'string' },
          round_number: { type: 'integer' },
          selected_option: { type: 'string' },
          time_taken_ms: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { match_id, round_number, selected_option, time_taken_ms } = request.body;
    
    const { data: match } = await fastify.supabaseAdmin
      .from('custom_matches')
      .select('*')
      .eq('id', match_id)
      .single();
      
    if (!match || (match.host_id !== userId && match.guest_id !== userId)) {
      return reply.status(403).send({ error: 'Not part of this match' });
    }
    
    const isHost = match.host_id === userId;
    
    const { data: round } = await fastify.supabaseAdmin
      .from('match_rounds')
      .select('id, question_id, host_answer, guest_answer')
      .eq('match_id', match_id)
      .eq('round_number', round_number)
      .single();
      
    if (!round) return reply.status(404).send({ error: 'Round not found' });
    if ((isHost && round.host_answer) || (!isHost && round.guest_answer)) {
      return reply.status(409).send({ error: 'Already answered this round' });
    }
    
    // Check answer correctness
    const { data: question } = await fastify.supabaseAdmin
      .from('questions')
      .select('correct_option')
      .eq('id', round.question_id)
      .single();
      
    const isCorrect = question.correct_option === selected_option;
    const score = isCorrect ? 2.0 : (selected_option === 'timeout' ? 0 : -0.66);
    
    // Update round
    const updateData = isHost 
      ? { host_answer: selected_option, host_time_ms: time_taken_ms, host_score: score }
      : { guest_answer: selected_option, guest_time_ms: time_taken_ms, guest_score: score };
      
    await fastify.supabaseAdmin
      .from('match_rounds')
      .update(updateData)
      .eq('id', round.id);
      
    // Update overall match score
    const scoreField = isHost ? 'host_score' : 'guest_score';
    const currentMatchScore = isHost ? match.host_score : match.guest_score;
    
    await fastify.supabaseAdmin
      .from('custom_matches')
      .update({ [scoreField]: currentMatchScore + score })
      .eq('id', match.id);
      
    reply.send({ is_correct: isCorrect, score_awarded: score });
  });

}

module.exports = arenaRoutes;
