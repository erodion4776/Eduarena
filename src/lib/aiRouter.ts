import { GoogleGenAI } from '@google/genai';

interface AIResponse {
  answer: string;
  source?: string;
  provider: 'gemini' | 'grok' | 'huggingface' | 'simulated';
}

export const aiRouter = {
  async askTutorChuks(prompt: string, context?: string): Promise<AIResponse> {
    const fullPrompt = context 
      ? `Act as Tutor Chuks. The student asked: "${prompt}". Here is the exact textbook paragraph: [${context}]. Use this text to explain the answer using a relatable Nigerian analogy. Be encouraging but firm.`
      : `Act as Tutor Chuks. The student asked: "${prompt}". You are a brilliant Nigerian tutor. Explain the concept clearly using a relatable analogy.`;

    // 1. Try Gemini
    try {
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (geminiKey && geminiKey !== 'undefined') {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });
        if (response.text) {
          return { answer: response.text, provider: 'gemini' };
        }
      } else {
        throw new Error("Gemini Key Missing");
      }
    } catch (e) {
      console.warn("Gemini Error or missing key:", e);
    }

    // 2. Try Grok (Fallback 1)
    try {
      const grokKey = import.meta.env.VITE_GROK_API_KEY;
      if (grokKey && grokKey !== 'undefined') {
        // Simulate Grok API call layout
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${grokKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: fullPrompt }],
            model: "grok-beta"
          })
        });
        if (res.ok) {
          const data = await res.json();
          return { answer: data.choices[0].message.content, provider: 'grok' };
        }
        throw new Error("Grok Request Failed");
      } else {
        throw new Error("Grok Key Missing");
      }
    } catch (e) {
      console.warn("Grok Error or missing key:", e);
    }

    // 3. Try Hugging Face (Fallback 2)
    try {
      const hfKey = import.meta.env.VITE_HF_API_KEY;
      if (hfKey && hfKey !== 'undefined') {
        const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: fullPrompt })
        });
        if (res.ok) {
          const data = await res.json();
          return { answer: data[0].generated_text, provider: 'huggingface' };
        }
        throw new Error("Hugging Face Request Failed");
      } else {
        throw new Error("HF Key Missing");
      }
    } catch (e) {
      console.warn("Hugging Face Error or missing key:", e);
    }

    // 4. Simulated Success (Fallback 3 for UI testing)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          answer: `Ah ah, Boss! I hear you. The textbook states: "${context || 'It is an important concept'}". Think of it like making correct Jollof rice — if the base is wrong, everything is wrong. Don't worry, we'll fix it!`,
          provider: 'simulated'
        });
      }, 1500);
    });
  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks('Explain ' + topic, topic);
  }
};
