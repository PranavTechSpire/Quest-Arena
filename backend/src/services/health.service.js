const HealthRepository = require('../repositories/health.repository');

class HealthService {
  constructor(fastify) {
    this.repository = new HealthRepository(fastify);
  }

  async getSystemHealth() {
    const dbHealthy = await this.repository.checkDatabase();
    const redisHealthy = await this.repository.checkRedis();

    return {
      isHealthy: dbHealthy && redisHealthy,
      dbStatus: dbHealthy ? 'ok' : 'error',
      redisStatus: redisHealthy ? 'ok' : 'error',
    };
  }
}

module.exports = HealthService;
