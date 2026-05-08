/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import { supabase } from './supabase';

interface AIResponse {
  answer: string;
  source?: string;
  provider: string;
}

export const aiRouter = {
  async askTutorChuks(prompt: string, context?: string): Promise<AIResponse> {
    // Basic examination intent detection
    const biology2010Match = prompt.toLowerCase().match(/(2010|2011|2012).*biology/);
    let dbContext = context;

    if (biology2010Match) {
        const year = parseInt(biology2010Match[1]);
        const { data: questions, error } = await supabase
            .from('questions_bank')
            .select('question_content, options, correct_option')
            .eq('year', year)
            // Just assume a broad subject filter or none for now, 
            // since filtering by subject requires subject_id lookup.
            .limit(3);
        
        if (questions && questions.length > 0) {
            dbContext = `Here are some extracted questions from Biology ${year}: ` + 
                questions.map(q => `${q.question_content} Options: ${JSON.stringify(q.options)}. Answer: ${q.correct_option}`).join('\n');
        }
    }

    const fullPrompt = dbContext 
      ? `Act as Tutor Chuks, a brilliant Nigerian tutor. The student asked: "${prompt}".
         Use the provided database context to answer directly.
         Guidelines:
         - Be polite, direct, and helpful.
         - Show the questions clearly if providing past exam data.
         - If providing answers, explain them simply using a relatable Nigerian analogy.
         - Keep answers concise and exam-focused.
         Database Context: [${dbContext}]`
      : `Act as Tutor Chuks, a brilliant Nigerian tutor. The student asked: "${prompt}".
         Guidelines:
         - Be polite, direct, and helpful.
         - If the request is for specific past questions, try to be general until they provide exam details.
         - Keep answers concise and exam-focused.
         - Use a brief, smart Nigerian analogy *only* if it helps clarify the point.`;

    // 1. Attempt Gemini
    try {
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });
        if (response.text) return { answer: response.text, provider: 'gemini' };
      }
    } catch (e) {
      console.warn("Gemini failed, trying Groq...", e);
    }

    // 2. Fallback to Groq
    try {
      const groqKey = import.meta.env.VITE_GROK_API_KEY;
      if (groqKey) {
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: fullPrompt }],
          model: "llama-3.3-70b-versatile",
        });
        if (chatCompletion.choices[0]?.message?.content) {
          return { answer: chatCompletion.choices[0].message.content, provider: 'groq' };
        }
      }
    } catch (e) {
      console.warn("Groq failed, trying Hugging Face...", e);
    }

    // 3. Fallback to Hugging Face
    try {
      const hfKey = import.meta.env.VITE_HF_API_KEY;
      if (hfKey) {
        const hf = new HfInference(hfKey);
        const response = await hf.textGeneration({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          inputs: fullPrompt,
          parameters: { max_new_tokens: 500 }
        });
        if (response.generated_text) {
          return { answer: response.generated_text, provider: 'huggingface' };
        }
      }
    } catch (e) {
      console.error("All AI providers failed:", e);
    }

    // Final fallback
    return {
      answer: `Ah ah, Boss! I hear you. The textbook states: "${context || 'It is an important concept'}". Think of it like making correct Jollof rice — if the base is wrong, everything is wrong. Don't worry, we'll fix it!`,
      provider: 'simulated'
    };
  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks(`Explain ${topic}`, topic);
  }
};
