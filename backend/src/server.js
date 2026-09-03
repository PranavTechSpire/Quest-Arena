const config = require('./config/env');
const fastify = require('fastify')({ logger: true });

// Register core plugins
fastify.register(require('@fastify/cors'), {
  origin: '*' // Configure properly in production
});

// Register custom plugins
fastify.register(require('./plugins/supabase'));
fastify.register(require('./plugins/redis'));

// Register middleware
fastify.register(require('./middleware/auth'));

// Register API Routes
fastify.register(require('./routes/api/v1/health'), { prefix: '/api/v1' });
fastify.register(require('./routes/api/v1/auth'), { prefix: '/api/v1/auth' });
fastify.register(require('./routes/api/v1/profile'), { prefix: '/api/v1' });
fastify.register(require('./routes/api/v1/curator'), { prefix: '/api/v1/curator' });
fastify.register(require('./routes/api/v1/quests'), { prefix: '/api/v1/quests' });
fastify.register(require('./routes/api/v1/arena'), { prefix: '/api/v1/arena' });

// Centralized error handler
fastify.setErrorHandler(function (error, request, reply) {
  this.log.error(error);
  if (error.validation) {
    return reply.status(400).send({ error: 'Validation Error', details: error.validation });
  }
  reply.status(500).send({ error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = fastify;
