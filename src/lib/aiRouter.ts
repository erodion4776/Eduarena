/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

interface AIResponse {
  answer: string;
  source?: string;
  provider: string;
}

export const aiRouter = {
  async askTutorChuks(prompt: string, context?: string): Promise<{ answer: string, source?: string, provider: string }> {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey || geminiKey === 'undefined') {
        throw new Error("Gemini Key Missing");
      }

      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const fullPrompt = context 
        ? `Act as Tutor Chuks. The student asked: "${prompt}". Here is the exact textbook paragraph: [${context}]. Use this text to explain the answer using a relatable Nigerian analogy. Be encouraging but firm.`
        : `Act as Tutor Chuks. The student asked: "${prompt}". You are a brilliant Nigerian tutor. Explain the concept clearly using a relatable analogy.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      if (response.text) {
        return { answer: response.text, provider: 'gemini' };
      }
      throw new Error("No response text");
    } catch (e) {
      console.warn("AI Proxy Error, falling back to simulated:", e);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            answer: `Ah ah, Boss! I hear you. The textbook states: "${context || 'It is an important concept'}". Think of it like making correct Jollof rice — if the base is wrong, everything is wrong. Don't worry, we'll fix it!`,
            provider: 'simulated'
          });
        }, 1500);
      });
    }
  },

  async getIntervention(topic: string): Promise<{ answer: string, source?: string, provider: string }> {
    return this.askTutorChuks(`Explain ${topic}`, topic);
  }
};

