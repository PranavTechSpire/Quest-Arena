const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

class AIService {
  constructor(fastify) {
    this.fastify = fastify;
    // Initialize Gemini API client if key is provided
    if (config.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    } else {
      this.fastify.log.warn('GEMINI_API_KEY is not configured. AI generation will fail.');
    }
  }

  /**
   * Generates a question based on exam and topic using Gemini.
   */
  async generateQuestion(exam, subject, topic) {
    if (!this.ai) throw new Error('AI client is not initialized.');

    const prompt = `Generate a highly realistic, original multiple-choice question for the following competitive exam.
Exam: ${exam}
Subject: ${subject}
Topic: ${topic}

Constraints:
- Return exactly one question.
- Do not make it trivially easy. It should test conceptual clarity or factual depth appropriate for the exam.
- The 'options' object must contain exactly four keys: "a", "b", "c", "d".
- The 'correct_option' must be a single letter ("a", "b", "c", or "d").
- The 'explanation' must justify the correct option clearly.
- The 'elimination_tips' must explain how a student could logically eliminate at least one wrong option.
- The 'source_reference' should name the standard textbook, historical event, or concept being tested.
- Output ONLY valid JSON matching the schema. No markdown wrapping or other text.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      const text = response.text;
      return JSON.parse(text);
    } catch (err) {
      this.fastify.log.error(`Gemini generateContent error: ${err.message}`, err);
      throw new Error(`Failed to generate question: ${err.message}`);
    }
  }

  /**
   * Generates an embedding vector for the question text.
   */
  async generateEmbedding(questionText) {
    if (!this.ai) throw new Error('AI client is not initialized.');

    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: questionText
      });
      return response.embeddings[0].values;
    } catch (err) {
      this.fastify.log.error('Gemini embedContent error:', err);
      throw new Error(`Failed to generate embedding: ${err.message}`);
    }
  }
}

module.exports = AIService;
