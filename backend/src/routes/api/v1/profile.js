async function profileRoutes(fastify, options) {
  fastify.get('/profile', {
    preHandler: fastify.authenticate,
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
            exam_preference: { type: 'string', nullable: true },
            avatar_state: { type: 'string' },
            current_streak: { type: 'integer' },
            max_streak: { type: 'integer' },
            total_score: { type: 'number' },
            questions_answered_today: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;

    const { data: profile, error } = await fastify.supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      fastify.log.error('Profile fetch error', error);
      return reply.status(404).send({ error: 'Profile not found' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    const { count } = await fastify.supabaseAdmin
      .from('daily_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('attempt_date', startOfDay.toISOString());

    return reply.send({
      ...profile,
      questions_answered_today: count || 0
    });
  });

  fastify.put('/profile', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        properties: {
          exam_preference: { type: 'string' },
          avatar_state: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.id;
    const { exam_preference, avatar_state } = request.body;
    
    const updates = {};
    if (exam_preference) updates.exam_preference = exam_preference;
    if (avatar_state) updates.avatar_state = avatar_state;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await fastify.supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      fastify.log.error('Error updating profile:', error);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }

    reply.send(data);
  });
}

module.exports = profileRoutes;
