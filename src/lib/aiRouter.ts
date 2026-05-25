interface AIResponse {
  answer: string;
  source?: string;
  provider: string;
}

interface Message {
  sender: 'tutor' | 'student';
  text: string;
}

export const aiRouter = {
  async askTutorChuks(prompt: string, history: Message[] = []): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt, 
          history 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        answer: data.response || "Omo, I am having trouble thinking right now. Ask me again!",
        source: data.source,
        provider: data.provider || 'gemini'
      };
    } catch (e) {
      console.error("AI Router failed to fetch server API:", e);
      return {
        answer: "Omo, network is behaving somehow! But look, keep studying. If you can't reach me, check your textbooks for a bit, I'll be back online shortly.",
        provider: 'emergency-fallback'
      };
    }
  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks(`Explain ${topic}`, []);
  }
};
