const fp = require('fastify-plugin');

async function authMiddleware(fastify, options) {
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Missing Authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // In production, we verify the JWT via Supabase
      const { data: { user }, error } = await fastify.supabase.auth.getUser(token);
      
      if (error || !user) {
        fastify.log.warn('JWT verification failed:', error);
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }

      request.user = user;
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: 'Authentication processing failed' });
    }
  });
}

module.exports = fp(authMiddleware);
