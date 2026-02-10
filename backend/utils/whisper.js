import { promises as fs } from 'fs';
import { createClient } from '@deepgram/sdk';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isRetryableConnectionError(err) {
  const code = err?.code ?? err?.cause?.code;
  const message = (err?.message ?? '').toLowerCase();
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    message.includes('connection') ||
    message.includes('econnreset')
  );
}

/**
 * Transcribe audio file using Deepgram (free tier: 25 hrs/month).
 * Uses Deepgram SDK v3+ API format.
 * @param {string} audioPath - Full path to audio file (.mp3)
 * @param {string} [hintLanguage] - Optional language hint (en, hi, te, ta, or 'auto')
 * @returns {Promise<{transcript: string, language: string}>} - Transcript and detected language
 */
async function transcribeAudio(audioPath, hintLanguage = 'auto') {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is not set in .env');
  }

  // If user provided a specific language, use it directly
  if (hintLanguage && hintLanguage !== 'auto') {
    console.log(`[Deepgram] Using user-provided language hint: ${hintLanguage}`);
    return transcribeWithLanguage(audioPath, apiKey, hintLanguage);
  }

  // Otherwise, auto-detect
  console.log(`[Deepgram] Auto-detecting language from audio...`);
  return transcribeWithLanguage(audioPath, apiKey, 'multi');
}

/**
 * Internal function to perform transcription with specified language
 */
async function transcribeWithLanguage(audioPath, apiKey, language) {
  
  const deepgram = createClient({
    apiKey: apiKey,
  });
  
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Deepgram] Attempt ${attempt}: Reading audio file: ${audioPath}`);
      const audioData = await fs.readFile(audioPath);
      console.log(`[Deepgram] Audio file size: ${audioData.length} bytes`);

      console.log(`[Deepgram] Calling prerecorded transcription...`);
      
      const response = await deepgram.listen.prerecorded.transcribeFile(
        audioData,
        {
          model: 'nova-3',
          language: language,  // 'multi' for auto-detect, or specific language code
          smart_format: true,
        }
      );

      console.log(`[Deepgram] Response received`);
      
      const transcript = response.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      
      // Extract detected language from words array (most frequent language)
      // Each word in the Deepgram response has a 'language' property
      const words = response.result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
      let detectedLanguage = language !== 'multi' ? language : 'unknown';
      let languageCounts = {};
      
      // If auto-detect mode, analyze word-level language properties
      if (language === 'multi' && words.length > 0) {
        words.forEach((word) => {
          if (word.language) {
            languageCounts[word.language] = (languageCounts[word.language] || 0) + 1;
          }
        });
        
        // Find the most common language
        if (Object.keys(languageCounts).length > 0) {
          detectedLanguage = Object.keys(languageCounts).reduce((a, b) =>
            languageCounts[a] > languageCounts[b] ? a : b
          );
        }
      }
      
      console.log(`[Deepgram] Detected language: ${detectedLanguage}`);
      if (Object.keys(languageCounts).length > 0) {
        console.log(`[Deepgram] Language distribution:`, languageCounts);
        console.log(`[Deepgram] Total words analyzed: ${words.length}`);
      }
      
      // Log sample words to help debug language detection
      if (words.length > 0) {
        const sampleWords = words.slice(0, 10).map(w => ({ word: w.punctuated_word, lang: w.language }));
        console.log(`[Deepgram] First 10 words:`, JSON.stringify(sampleWords));
      }
      
      console.log(`[Deepgram] Extracted transcript (${transcript.length} chars): ${transcript.substring(0, 100)}`);

      if (!transcript) {
        throw new Error('Deepgram returned no transcript');
      }

      return { transcript, language: detectedLanguage };
    } catch (err) {
      console.error(`[Deepgram] Attempt ${attempt} error:`, err.message);
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableConnectionError(err)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export { transcribeAudio };
