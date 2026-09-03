class HealthRepository {
  constructor(fastify) {
    this.fastify = fastify;
  }

  async checkDatabase() {
    try {
      // Test the connection by running a simple query
      const { data, error } = await this.fastify.supabase.from('users').select('id').limit(1);
      if (error) {
        this.fastify.log.error('DB check failed:', error);
        return false;
      }
      return true;
    } catch (err) {
      this.fastify.log.error('DB check exception:', err);
      return false;
    }
  }

  async checkRedis() {
    try {
      const ping = await this.fastify.redis.ping();
      return ping === 'PONG';
    } catch (err) {
      this.fastify.log.error('Redis check exception:', err);
      return false;
    }
  }
}

module.exports = HealthRepository;
