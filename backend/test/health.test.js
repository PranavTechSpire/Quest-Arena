const tap = require('tap');
const fastify = require('fastify');
const config = require('../src/config/env');

tap.test('GET /api/v1/health route', async (t) => {
  const app = fastify();
  
  // Mock plugins and middleware
  app.decorate('supabase', {
    from: () => ({
      select: () => ({
        limit: async () => ({ data: [{ id: '123' }], error: null })
      })
    })
  });

  app.decorate('redis', {
    ping: async () => 'PONG'
  });

  app.register(require('../src/middleware/auth'));
  app.register(require('../src/routes/api/v1/health'), { prefix: '/api/v1' });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/health'
  });

  t.equal(response.statusCode, 200, 'returns a status code of 200');
  
  const payload = JSON.parse(response.payload);
  t.equal(payload.status, 'healthy', 'status is healthy');
  t.equal(payload.services.database, 'ok', 'database is ok');
  t.equal(payload.services.redis, 'ok', 'redis is ok');
  t.ok(payload.timestamp, 'timestamp is present');

  t.end();
});

tap.test('GET /api/v1/profile protected route without token', async (t) => {
  const app = fastify();
  
  app.decorate('supabase', {}); // Not needed for missing token rejection
  app.register(require('../src/middleware/auth'));
  app.register(require('../src/routes/api/v1/profile'), { prefix: '/api/v1' });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/profile'
  });

  t.equal(response.statusCode, 401, 'returns a status code of 401');
  const payload = JSON.parse(response.payload);
  t.equal(payload.error, 'Missing Authorization header', 'Correct error message');

  t.end();
});
