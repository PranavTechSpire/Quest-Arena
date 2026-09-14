const fp = require('fastify-plugin');

async function questsRoutes(fastify, options) {
  
  fastify.get('/daily', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    const userId = request.user.id;
    
    // 1. Get user exam preference
    const { data: user, error: userErr } = await fastify.supabaseAdmin
      .from('users')
      .select('exam_preference')
      .eq('id', userId)
      .single();
      
    if (userErr || !user) return reply.status(404).send({ error: 'User not found' });
    
    const exam = user.exam_preference || 'UPSC_GS1';
    
    // 2. Fetch questions for this exam
    // To ensure idempotency and non-repetition, we exclude questions already answered successfully
    // We fetch questions that don't have a matching successful daily_attempt for this user
    
    // For MVP efficiency: fetch 10 active questions not in user's daily_attempts today.
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    // We could do this purely in SQL using a query or RPC.
    // Let's use RPC for robustness, or fetch via supabase-js filters.
    // A simpler way: fetch 10 random questions, filter by answered.
    
    // Fetch attempted question IDs from user_question_log
    const { data: attempts } = await fastify.supabaseAdmin
      .from('user_question_log')
      .select('question_id')
      .eq('user_id', userId);
      
    const attemptedIds = attempts ? attempts.map(a => a.question_id) : [];
    
    let query = fastify.supabaseAdmin
      .from('questions')
      .select('id, exam, subject, question_text, options, difficulty, source_reference')
      .eq('exam', exam)
      .eq('status', 'approved'); // Fetch all approved questions
      
    if (attemptedIds.length > 0) {
      query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
    }
    
    const { data: allQuestions, error: qErr } = await query;
    
    // Shuffle and pick 10 random questions
    const questions = (allQuestions || []).sort(() => 0.5 - Math.random()).slice(0, 10);
    
    if (qErr) {
      fastify.log.error('Failed fetching daily quests:', qErr);
      return reply.status(500).send({ error: 'Failed fetching daily questions' });
    }
    
    reply.send(questions);
  });

  fastify.post('/submit', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['question_id', 'selected_option', 'time_taken_ms'],
        properties: {
          question_id: { type: 'string' },
          selected_option: { type: 'string' }, // "a", "b", "c", "d" or "timeout"
          time_taken_ms: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { question_id, selected_option, time_taken_ms } = request.body;

    // 1. Validate if already attempted today
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    const { data: existing } = await fastify.supabaseAdmin
      .from('user_question_log')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', question_id)
      .single();
      
    if (existing) {
      return reply.status(409).send({ error: 'Question already attempted today' });
    }

    // 2. Fetch correct answer from DB
    const { data: question, error: qErr } = await fastify.supabaseAdmin
      .from('questions')
      .select('exam, correct_option, explanation, elimination_tips, subject')
      .eq('id', question_id)
      .single();
      
    if (qErr || !question) return reply.status(404).send({ error: 'Question not found' });
    
    // 3. Score the answer (Server authoritative)
    const isCorrect = selected_option === question.correct_option;
    const isTimeout = selected_option === 'timeout';
    
    let score = 0;
    if (isTimeout) score = 0;
    else if (isCorrect) score = 2.0;
    else score = -0.66;
    
    // 4. Save attempt in user_question_log
    const { error: attemptErr } = await fastify.supabaseAdmin
      .from('user_question_log')
      .insert({
        user_id: userId,
        question_id: question_id,
        is_correct: isCorrect,
        score: score,
        time_taken_ms: time_taken_ms
      });
      
    if (attemptErr) {
      fastify.log.error('Failed saving attempt:', attemptErr);
      return reply.status(500).send({ error: 'Failed saving attempt' });
    }
    
    // 4b. Upsert daily aggregate
    await fastify.supabaseAdmin.rpc('increment_user_score', { 
      u_id: userId, 
      score_val: score 
    });
    
    // Using simple upsert logic for daily_attempts without an RPC for now
    const { data: dailyAttempt } = await fastify.supabaseAdmin
      .from('daily_attempts')
      .select('id, correct_count, incorrect_count, timeout_count, net_score')
      .eq('user_id', userId)
      .eq('exam', question.exam || 'UPSC_GS1')
      .eq('attempt_date', startOfDay.toISOString().split('T')[0])
      .single();

    if (dailyAttempt) {
      await fastify.supabaseAdmin
        .from('daily_attempts')
        .update({
          correct_count: dailyAttempt.correct_count + (isCorrect ? 1 : 0),
          incorrect_count: dailyAttempt.incorrect_count + (!isCorrect && !isTimeout ? 1 : 0),
          timeout_count: dailyAttempt.timeout_count + (isTimeout ? 1 : 0),
          net_score: dailyAttempt.net_score + score,
        })
        .eq('id', dailyAttempt.id);
    } else {
      await fastify.supabaseAdmin
        .from('daily_attempts')
        .insert({
          user_id: userId,
          exam: question.exam || 'UPSC_GS1',
          attempt_date: startOfDay.toISOString().split('T')[0],
          correct_count: isCorrect ? 1 : 0,
          incorrect_count: !isCorrect && !isTimeout ? 1 : 0,
          timeout_count: isTimeout ? 1 : 0,
          net_score: score
        });
    }

    // 6. Streak check
    const { count } = await fastify.supabaseAdmin
      .from('user_question_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());
      
    let streak_updated = false;
    // Assuming exactly 10 questions complete the daily quest
    if (count === 10) {
      await fastify.supabaseAdmin.rpc('increment_user_streak', { u_id: userId });
      streak_updated = true;
    }

    // 7. Generate Anime Companion Feedback using Gemini API
    let companion_message = "Keep going!";
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an energetic Anime companion character for a UPSC preparation app. The student just answered a question on ${question.subject}. They got it ${isCorrect ? 'correct! (+2 points)' : 'wrong (-0.66 points)'}. Give a very short (1-2 sentences max), highly enthusiastic, in-character response to encourage them. Use anime tropes (e.g., "Senpai", "Gambatte", or just high energy).`;
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const geminiData = await geminiRes.json();
        if (geminiData.candidates && geminiData.candidates[0].content.parts[0].text) {
          companion_message = geminiData.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        fastify.log.error('Gemini API Error:', e);
      }
    }

    // 8. Return feedback
    reply.send({
      is_correct: isCorrect,
      correct_option: question.correct_option,
      explanation: question.explanation,
      elimination_tips: question.elimination_tips,
      score_awarded: score,
      streak_updated: streak_updated,
      companion_message: companion_message
    });
  });
}

module.exports = questsRoutes;
