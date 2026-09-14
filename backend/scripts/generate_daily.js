require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fastify = require('fastify')({ logger: true });

// Register required plugins for GenerationService
fastify.register(require('../src/plugins/supabase'));

const GenerationService = require('../src/services/generation.service');

const UPSC_SUBJECTS = ['History', 'Polity', 'Geography', 'Economy', 'Environment', 'Science & Technology'];
const MPSC_SUBJECTS = ['History of Maharashtra', 'Geography of Maharashtra', 'Indian Polity', 'Economy'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  await fastify.ready();
  
  const generationService = new GenerationService(fastify);
  
  // We don't have a "curator" id since this is a cron job. We'll use a hardcoded UUID or let the DB default it if it's nullable.
  // Actually, created_by requires a valid UUID. Let's get the first user in the system to attribute it to, or leave it null if allowed.
  if (!fastify.supabaseAdmin) {
    fastify.log.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY! Please ensure GitHub Secrets are added correctly.');
    process.exit(1);
  }
  
  if (!require('../src/config/env').GEMINI_API_KEY) {
    fastify.log.error('❌ Missing GEMINI_API_KEY! Please ensure GitHub Secrets are added correctly.');
    process.exit(1);
  }

  let adminId = null;
  const { data: user } = await fastify.supabaseAdmin.from('users').select('id').limit(1).single();
  if (user) adminId = user.id;

  const examsToGenerate = [
    { exam: 'UPSC_GS1', count: 10, subjects: UPSC_SUBJECTS },
    { exam: 'MPSC_PRELIMS', count: 10, subjects: MPSC_SUBJECTS }
  ];

  let totalSuccess = 0;

  for (const config of examsToGenerate) {
    fastify.log.info(`Generating ${config.count} questions for ${config.exam}...`);
    
    for (let i = 0; i < config.count; i++) {
      const subject = getRandomElement(config.subjects);
      const topic = `Random Topic ${Date.now()}`; // The AI will pick a real topic within the subject
      
      try {
        const result = await generationService.generateAndSave(config.exam, subject, topic, adminId, 3);
        
        if (result && result.success) {
          // Immediately approve the question since this is an automated cron job
          await fastify.supabaseAdmin
            .from('questions')
            .update({ status: 'approved' })
            .eq('id', result.id);
            
          totalSuccess++;
          fastify.log.info(`[${config.exam}] Generated and Approved question ${i+1}/${config.count} - ID: ${result.id}`);
        }
      } catch (e) {
        fastify.log.error(`Failed to generate question ${i+1} for ${config.exam}: ${e.message}`);
      }
    }
  }

  fastify.log.info(`\n✅ Daily Generation Complete! Successfully generated and approved ${totalSuccess} questions.`);
  process.exit(0);
}

run();
