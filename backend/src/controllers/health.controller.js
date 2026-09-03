const HealthService = require('../services/health.service');

class HealthController {
  static async check(request, reply) {
    const service = new HealthService(request.server);
    const health = await service.getSystemHealth();

    const response = {
      status: health.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: health.dbStatus,
        redis: health.redisStatus
      }
    };

    if (!health.isHealthy) {
      return reply.status(503).send(response);
    }
    
    return reply.send(response);
  }
}

module.exports = HealthController;
