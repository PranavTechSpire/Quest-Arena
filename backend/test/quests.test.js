const { test } = require('tap');
const Fastify = require('fastify');
const questsRoutes = require('../src/routes/api/v1/quests');

test('Quests Routes', async (t) => {
  const fastify = Fastify();
  
  fastify.decorate('authenticate', async (request, reply) => {
    request.user = { id: 'test-user-id' };
  });

  fastify.decorate('supabaseAdmin', {
    from: (table) => {
      return {
        select: (fields, options) => {
          let methods = {
            eq: () => methods,
            gte: () => methods,
            not: () => methods,
            limit: () => methods,
            single: async () => {
              if (table === 'users') return { data: { exam_preference: 'UPSC' }, error: null };
              if (table === 'daily_attempts') return { data: null, error: null }; // No previous attempt
              if (table === 'questions') return { 
                data: { correct_option: 'b', explanation: 'Test explanation', elimination_tips: 'Test tips' }, 
                error: null 
              };
              return { data: null, error: null };
            },
            then: (resolve) => {
              if (table === 'questions') {
                resolve({ data: [{ id: 'q1', question_text: 'Test?' }], error: null });
              } else if (table === 'daily_attempts') {
                if (options && options.count === 'exact') resolve({ count: 10, error: null });
                else resolve({ data: [], error: null });
              }
            }
          };
          return methods;
        },
        insert: () => ({ error: null })
      };
    },
    rpc: async (func, args) => {
      return { error: null };
    }
  });

  fastify.register(questsRoutes, { prefix: '/api/v1/quests' });

  t.test('GET /api/v1/quests/daily returns quests', async (t) => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/v1/quests/daily'
    });
    
    t.equal(response.statusCode, 200);
    const data = JSON.parse(response.payload);
    t.equal(data.length, 1);
    t.equal(data[0].id, 'q1');
  });

  t.test('POST /api/v1/quests/submit accepts answer', async (t) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/v1/quests/submit',
      payload: {
        question_id: 'q1',
        selected_option: 'b',
        time_taken_ms: 1500
      }
    });
    
    t.equal(response.statusCode, 200);
    const data = JSON.parse(response.payload);
    t.equal(data.is_correct, true);
    t.equal(data.score_awarded, 2.0);
    t.equal(data.streak_updated, true); // Since count is mocked to 10
  });

  t.teardown(async () => {
    await fastify.close();
  });
});
