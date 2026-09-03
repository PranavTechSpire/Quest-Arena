const AIService = require('./ai.service');
const ValidationService = require('./validation.service');

class GenerationService {
  constructor(fastify) {
    this.fastify = fastify;
    this.aiService = new AIService(fastify);
    this.validationService = new ValidationService(fastify);
  }

  /**
   * Orchestrates the entire generation, validation, deduplication, and saving process.
   */
  async generateAndSave(exam, subject, topic, creatorId, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        this.fastify.log.info(`Generation attempt ${attempt} for ${exam} - ${subject} - ${topic}`);
        
        // 1. Generate structured output
        const generatedData = await this.aiService.generateQuestion(exam, subject, topic);
        
        // 2. Validate format
        if (!this.validationService.validateFormat(generatedData)) {
          this.fastify.log.warn('Validation failed, retrying...');
          continue;
        }

        // 3. Generate embedding for similarity check
        const embedding = await this.aiService.generateEmbedding(generatedData.question_text);

        // 4. Check for duplicates
        const isDuplicate = await this.validationService.checkDuplicate(embedding);
        if (isDuplicate) {
          this.fastify.log.warn('Duplicate detected, retrying generation...');
          continue;
        }

        // 5. Save to database (pending_review)
        const { data: questionData, error: qError } = await this.fastify.supabaseAdmin
          .from('questions')
          .insert({
            exam: generatedData.exam_type || exam,
            subject: generatedData.subject || subject,
            topic: topic,
            question_text: generatedData.question_text,
            options: generatedData.options,
            correct_option: generatedData.correct_option,
            explanation: generatedData.explanation,
            status: 'pending_review',
            created_by: creatorId
          })
          .select('id')
          .single();

        if (qError) throw new Error(`Database insert failed: ${qError.message}`);

        // 6. Save embedding
        const { error: eError } = await this.fastify.supabaseAdmin
          .from('question_embeddings')
          .insert({
            question_id: questionData.id,
            embedding: embedding
          });
          
        if (eError) throw new Error(`Embedding insert failed: ${eError.message}`);

        this.fastify.log.info(`Question generated and saved successfully. ID: ${questionData.id}`);
        return { success: true, id: questionData.id, question: generatedData };

      } catch (err) {
        this.fastify.log.error(`Attempt ${attempt} failed:`, err);
        if (attempt >= maxRetries) {
          throw new Error('Max retries exceeded for generation');
        }
      }
    }
  }
}

module.exports = GenerationService;
