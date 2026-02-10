import { getGemini } from './geminiClient.js';

const languagePrompts = {
  'en': `You are an expert SEO content writer. Given a transcript from a video, write a complete, long-form SEO blog article in English.`,
  'hi': `Aap ek visheshagya SEO content lekhak hain. Ek video ke transcript ko dekhte hue, ek purn, dirghakaalin SEO blog lekh likhen.`,
  'te': `Meeru oka nipuna SEO content rachayita. Oka video transcript nu icchina sampurna, sudeergha SEO blog kathanani vrayandi.`,
  'ta': `Ningal oru SEO content ezhuthalar. Oru video transcript kodupppatta, muzhu, neel SEO blog katuhai ezhutuvum.`,
};

async function generateBlog(transcript, language = 'en') {
  if (!transcript || !transcript.trim()) {
    throw new Error('Transcript is empty; cannot generate blog.');
  }

  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const systemPrompt = languagePrompts[language] || languagePrompts['en'];
  const languageLabel = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil' }[language] || 'English';
  
  console.log(`[Gemini] Generating blog in ${languageLabel} (${language})`);
  
  const prompt = `${systemPrompt}\n\nGenerate the SEO blog article from this video transcript:\n\n${transcript}`;

  const result = await model.generateContent(prompt);
  const content = result.response.text();

  if (!content) {
    throw new Error('Gemini returned no content');
  }
  return content;
}

export { generateBlog };
