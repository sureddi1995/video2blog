import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

/**
 * Shared Gemini client. Uses GEMINI_API_KEY.
 */
export function getGemini() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in .env');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}
