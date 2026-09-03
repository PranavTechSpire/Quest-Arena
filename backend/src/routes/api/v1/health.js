const HealthController = require('../../../controllers/health.controller');
const { healthResponseSchema } = require('../../../schemas/health.schema');

async function healthRoutes(fastify, options) {
  fastify.get('/health', {
    schema: {
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema
      }
    }
  }, HealthController.check);
}

module.exports = healthRoutes;
