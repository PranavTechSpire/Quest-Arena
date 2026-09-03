const GenerationService = require('../services/generation.service');

class CuratorController {
  constructor(fastify) {
    this.fastify = fastify;
    this.generationService = new GenerationService(fastify);
  }

  async generateQuestion(request, reply) {
    const { exam, subject, topic } = request.body;
    const userId = request.user.id; // User must be authenticated

    // Realistically, check if user has 'curator' or 'admin' role here
    // For MVP phase 2, we trust authenticated users for now or explicitly check
    const { data: user, error } = await this.fastify.supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user || !['admin', 'curator'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden: Curator access required' });
    }

    try {
      const result = await this.generationService.generateAndSave(exam, subject, topic, userId);
      reply.status(201).send(result);
    } catch (err) {
      this.fastify.log.error('Curator generate endpoint error:', err);
      reply.status(500).send({ error: err.message || 'Generation failed' });
    }
  }

  async getPendingQuestions(request, reply) {
    const { data, error } = await this.fastify.supabaseAdmin
      .from('questions')
      .select('*')
      .eq('status', 'pending_review');

    if (error) {
      this.fastify.log.error('Failed to fetch pending questions:', error);
      return reply.status(500).send({ error: 'Database error' });
    }

    reply.send(data);
  }

  async approveQuestion(request, reply) {
    const { id } = request.params;
    const userId = request.user.id;

    // Optional: Log this action into curator_audit_logs using RPC or direct insert
    await this.fastify.supabaseAdmin.from('curator_audit_logs').insert({
      actor_id: userId,
      action: 'approve',
      entity_type: 'question',
      entity_id: id,
      reason: 'Manual review'
    });

    const { data, error } = await this.fastify.supabaseAdmin
      .from('questions')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to approve question' });
    }

    reply.send({ success: true, question: data });
  }
}

module.exports = CuratorController;
