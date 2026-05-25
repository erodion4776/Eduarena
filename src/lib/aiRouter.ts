/// <reference types="vite/client" />
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import { getRelevantContext } from './memoryManager';

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
    // 1. Fetch relevant context from Supabase or Local Fallback (RAG)
    const retrievedKnowledge = await getRelevantContext(prompt);
    
    // Extract exact source label dynamically from retrieved Knowledge [Source: X] metadata
    const sourceName = (() => {
      if (!retrievedKnowledge) return undefined;
      const match = retrievedKnowledge.match(/\[Source:\s*([^\]]+)\]/);
      return match ? match[1] : "Edu Vault";
    })();
    
    // 2. Format Chat History (Last 5 messages)
    const chatHistoryContext = history.slice(-5).map(m => 
      `${m.sender === 'student' ? 'Student' : 'Tutor'}: ${m.text}`
    ).join("\n");

    const systemInstruction = `Act as Tutor Chuks, a brilliant and direct Nigerian tutor. 
Focus strictly on exam success. Use relatable Nigerian analogies but stay professional.
Retrieved Knowledge: ${retrievedKnowledge || "No specific database entry found. Use your general training."}
Conversation History:
${chatHistoryContext}

Rules:
- Be concise (Under 100 words).
- If specific past questions are in the 'Retrieved Knowledge', refer to them.
- If the student asks something outside of academics, politely guide them back to their studies.`;

    const fullPrompt = `Student Query: ${prompt}`;

    // 1. Attempt Gemini (Primary)
    try {
      const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
      if (geminiKey) {
        const genAI = new GoogleGenAI({ apiKey: geminiKey });
        const result = await genAI.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            systemInstruction
          }
        });
        const text = result.text;
        if (text) return { answer: text.trim(), provider: 'gemini', source: sourceName };
      }
    } catch (e) {
      console.warn("Gemini Level 1 Failed. Cascading to Groq...", e);
    }

    // 2. Fallback to Groq (Level 2)
    try {
      const groqKey = (import.meta as any).env.VITE_GROQ_API_KEY;
      if (groqKey) {
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: fullPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          max_completion_tokens: 300
        });
        const text = completion.choices[0]?.message?.content;
        if (text) return { answer: text.trim(), provider: 'groq', source: sourceName };
      }
    } catch (e) {
      console.warn("Groq Level 2 Failed. Cascading to Hugging Face...", e);
    }

    // 3. Fallback to Hugging Face (Level 3 - Last Stand)
    try {
      const hfKey = (import.meta as any).env.VITE_HF_API_KEY;
      if (hfKey) {
        const hf = new HfInference(hfKey);
        const response = await hf.textGeneration({
          model: 'meta-llama/Llama-3.2-3B-Instruct',
          inputs: `<|system|>\n${systemInstruction}<|user|>\n${fullPrompt}<|assistant|>`,
          parameters: { max_new_tokens: 300 }
        });
        if (response.generated_text) {
          return { answer: response.generated_text.trim(), provider: 'huggingface', source: sourceName };
        }
      }
    } catch (e) {
      console.error("All AI providers reached critical failure.", e);
    }

    return {
      answer: "Omo, network is behaving somehow! But look, keep studying. If you can't reach me, check your textbooks for a bit, I'll be back online shortly.",
      provider: 'emergency-fallback'
    };
  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks(`Explain ${topic}`, []);
  }
};
