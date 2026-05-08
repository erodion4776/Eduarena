/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';

interface AIResponse {
  answer: string;
  source?: string;
  provider: 'gemini' | 'grok' | 'huggingface' | 'simulated';
}

export const aiRouter = {
  async askTutorChuks(prompt: string, context?: string): Promise<{ answer: string, source?: string, provider: string }> {
    try {
      const res = await fetch('/api/oracle/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      throw new Error("Backend AI Proxy failed");
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

