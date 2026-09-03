const Ajv = require('ajv');

const ajv = new Ajv();

const questionSchema = {
  type: "object",
  properties: {
    exam_type: { type: "string" },
    subject: { type: "string" },
    language: { type: "string" },
    question_text: { type: "string" },
    options: {
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "string" },
        c: { type: "string" },
        d: { type: "string" }
      },
      required: ["a", "b", "c", "d"],
      additionalProperties: false
    },
    correct_option: { type: "string", enum: ["a", "b", "c", "d"] },
    explanation: { type: "string" },
    elimination_tips: { type: "string" },
    source_reference: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    status: { type: "string" }
  },
  required: [
    "exam_type", "subject", "question_text", "options", "correct_option",
    "explanation", "difficulty"
  ],
  additionalProperties: true // Gemini might add other properties, we extract what we need
};

const validateSchema = ajv.compile(questionSchema);

class ValidationService {
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * Validates the generated JSON against the required schema.
   */
  validateFormat(generatedQuestion) {
    const valid = validateSchema(generatedQuestion);
    if (!valid) {
      this.fastify.log.warn('Question schema validation failed:', validateSchema.errors);
      return false;
    }
    return true;
  }

  /**
   * Checks for similarity using pgvector in Supabase.
   * Returns true if it's a duplicate (> threshold).
   */
  async checkDuplicate(embedding, threshold = 0.82) {
    // We call the match_questions RPC
    const { data, error } = await this.fastify.supabaseAdmin.rpc('match_questions', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 1
    });

    if (error) {
      this.fastify.log.error('Error during duplicate check:', error);
      throw new Error('Failed to check duplicate');
    }

    if (data && data.length > 0) {
      this.fastify.log.info(`Duplicate found. ID: ${data[0].id}, Similarity: ${data[0].similarity}`);
      return true; // Is a duplicate
    }

    return false; // Not a duplicate
  }
}

module.exports = ValidationService;
