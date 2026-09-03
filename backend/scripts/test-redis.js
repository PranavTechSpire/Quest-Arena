require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);
redis.on('error', (err) => {
  console.error('Redis error:', err);
});
redis.on('connect', () => {
  console.log('Redis connected successfully!');
  process.exit(0);
});
