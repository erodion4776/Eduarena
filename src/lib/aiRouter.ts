/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

interface AIResponse {
  answer: string;
  source?: string;
  provider: string;
}

export const aiRouter = {
  async askTutorChuks(prompt: string, context?: string): Promise<AIResponse> {
    const fullPrompt = context 
      ? `Act as Tutor Chuks. The student asked: "${prompt}". Here is the exact textbook paragraph: [${context}]. Use this text to explain the answer using a relatable Nigerian analogy. Be encouraging but firm.`
      : `Act as Tutor Chuks. The student asked: "${prompt}". You are a brilliant Nigerian tutor. Explain the concept clearly using a relatable analogy. Be encouraging but firm.`;

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
