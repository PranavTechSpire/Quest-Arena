const CuratorController = require('../../../controllers/curator.controller');

async function curatorRoutes(fastify, options) {
  const controller = new CuratorController(fastify);

  // Schema for generation request
  const generateSchema = {
    body: {
      type: 'object',
      required: ['exam', 'subject', 'topic'],
      properties: {
        exam: { type: 'string' },
        subject: { type: 'string' },
        topic: { type: 'string' }
      }
    }
  };

  fastify.post('/generate', { 
    schema: generateSchema,
    preValidation: [fastify.authenticate] 
  }, controller.generateQuestion.bind(controller));

  fastify.get('/pending', { 
    preValidation: [fastify.authenticate] 
  }, controller.getPendingQuestions.bind(controller));

  fastify.post('/approve/:id', { 
    preValidation: [fastify.authenticate] 
  }, controller.approveQuestion.bind(controller));
}

module.exports = curatorRoutes;
