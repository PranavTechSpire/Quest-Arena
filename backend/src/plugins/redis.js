const fp = require('fastify-plugin');
const Redis = require('ioredis');
const config = require('../config/env');

async function redisPlugin(fastify, options) {
  const redisUrl = config.REDIS_URL || 'redis://localhost:6379';
  
  const redis = new Redis(redisUrl);

  redis.on('error', (err) => {
    fastify.log.error('Redis error', err);
  });

  fastify.decorate('redis', redis);
  
  fastify.addHook('onClose', async (instance, done) => {
    await instance.redis.quit();
    done();
  });
}

module.exports = fp(redisPlugin);
