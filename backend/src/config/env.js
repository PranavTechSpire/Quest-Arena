const envSchema = require('env-schema');

const schema = {
  type: 'object',
  required: [ 'PORT' ],
  properties: {
    PORT: {
      type: 'integer',
      default: 3000
    },
    SUPABASE_URL: {
      type: 'string',
      default: 'http://localhost:54321'
    },
    SUPABASE_ANON_KEY: {
      type: 'string',
      default: 'dummy_key'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      type: 'string'
    },
    REDIS_URL: {
      type: 'string',
      default: 'redis://localhost:6379'
    },
    GEMINI_API_KEY: {
      type: 'string'
    },
    NODE_ENV: {
      type: 'string',
      default: 'development'
    }
  }
};

const config = envSchema({
  schema: schema,
  data: process.env,
  dotenv: true
});

module.exports = config;
