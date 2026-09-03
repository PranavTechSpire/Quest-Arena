const { test } = require('tap');
const Fastify = require('fastify');
const sinon = require('sinon');
const AIService = require('../src/services/ai.service');

// Mock data
const mockGeneratedQuestion = {
  exam_type: 'UPSC_GS1',
  subject: 'POLITY',
  language: 'en',
  question_text: 'What is the minimum age to be elected as the President of India?',
  options: {
    a: '25 years',
    b: '30 years',
    c: '35 years',
    d: '40 years'
  },
  correct_option: 'c',
  explanation: 'Article 58 of the Constitution states that a candidate must have completed 35 years of age.',
  difficulty: 'easy',
  status: 'pending_review'
};

const mockEmbedding = new Array(768).fill(0.01);

test('Curator /generate endpoint (Mocked AI)', async (t) => {
  // Stub AIService to avoid hitting real Gemini API
  const generateStub = sinon.stub(AIService.prototype, 'generateQuestion').resolves(mockGeneratedQuestion);
  const embedStub = sinon.stub(AIService.prototype, 'generateEmbedding').resolves(mockEmbedding);

  const fastify = Fastify();
  
  // Mock authenticate middleware
  fastify.decorate('authenticate', async (request, reply) => {
    request.user = { id: 'admin-uuid' };
  });

  // Mock Supabase Admin
  fastify.decorate('supabaseAdmin', {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: 'admin' }, error: null })
        })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'q-uuid' }, error: null })
        })
      })
    }),
    rpc: async () => ({ data: [], error: null }) // no duplicates
  });

  fastify.register(require('../src/routes/api/v1/curator'), { prefix: '/api/v1/curator' });

  const response = await fastify.inject({
    method: 'POST',
    url: '/api/v1/curator/generate',
    payload: {
      exam: 'UPSC_GS1',
      subject: 'POLITY',
      topic: 'President'
    }
  });

  t.equal(response.statusCode, 201);
  const result = JSON.parse(response.payload);
  t.equal(result.success, true);
  t.equal(result.id, 'q-uuid');
  
  generateStub.restore();
  embedStub.restore();
  
  await fastify.close();
});
