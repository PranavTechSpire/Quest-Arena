const { test } = require('tap');
const Fastify = require('fastify');
const profileRoutes = require('../src/routes/api/v1/profile');

test('Profile Routes', async (t) => {
  const fastify = Fastify();
  
  fastify.decorate('authenticate', async (request, reply) => {
    request.user = { id: 'test-user-id' };
  });

  fastify.decorate('supabaseAdmin', {
    from: (table) => {
      return {
        select: (fields, options) => {
          return {
            eq: (field, value) => {
              if (table === 'users') {
                return {
                  single: async () => ({
                    data: { id: 'test-user-id', username: 'tester', current_streak: 5 },
                    error: null
                  })
                };
              }
              return {
                gte: async () => {
                  if (options && options.count === 'exact') {
                    return { count: 10, error: null };
                  }
                  return { data: [], error: null };
                }
              };
            },
            update: (updates) => ({
              eq: (field, value) => ({
                select: () => ({
                  single: async () => ({ data: { id: 'test-user-id', exam_preference: updates.exam_preference }, error: null })
                })
              })
            })
          };
        },
        update: (updates) => ({
          eq: (field, value) => ({
            select: () => ({
              single: async () => ({ data: { id: 'test-user-id', exam_preference: updates.exam_preference }, error: null })
            })
          })
        })
      };
    }
  });

  fastify.register(profileRoutes, { prefix: '/api/v1' });

  t.test('GET /api/v1/profile returns profile data', async (t) => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/v1/profile'
    });
    
    t.equal(response.statusCode, 200);
    const data = JSON.parse(response.payload);
    t.equal(data.username, 'tester');
    t.equal(data.questions_answered_today, 10);
  });
  
  t.test('PUT /api/v1/profile updates data', async (t) => {
    const response = await fastify.inject({
      method: 'PUT',
      url: '/api/v1/profile',
      payload: {
        exam_preference: 'MPSC'
      }
    });
    
    t.equal(response.statusCode, 200);
    const data = JSON.parse(response.payload);
    t.equal(data.exam_preference, 'MPSC');
  });

  t.teardown(async () => {
    await fastify.close();
  });
});
