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
    let finalContext = context || "";

    // 1. Fetch relevant context from local API if prompt looks like a question or greeting
    if (!context && prompt.length > 2) {
        try {
            const apiRes = await fetch(`/api/ai/query?q=${encodeURIComponent(prompt)}`);
            const apiData = await apiRes.json();
            if (apiData.context) {
                finalContext = apiData.context;
            }
        } catch (e) {
            console.warn("Context API fetch failed", e);
        }
    }

    const fullPrompt = finalContext 
      ? `USER QUERY: "${prompt}"
         DATABASE CONTEXT: [${finalContext}]
         
         Act as Tutor Chuks, a concise Nigerian tutor.
         - Answer DIRECTLY using the context.
         - If context is empty, say you don't know the exact past question but explain the general concept.
         - Keep it under 100 words.`
      : `USER QUERY: "${prompt}"
         
         Act as Tutor Chuks, a snappy Nigerian tutor.
         - For greetings, be politely brief.
         - For general help, give one smart analogy.
         - No rambling. Under 60 words.`;

    const systemInstruction = "Act as Tutor Chuks, a brilliant but direct Nigerian tutor. Focus strictly on exam success. No long introductory chatter.";

    // 1. Attempt Gemini
    try {
      const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
      if (geminiKey) {
        const genAI = new GoogleGenAI({ apiKey: geminiKey });
        const response = await genAI.models.generateContent({ 
            model: 'gemini-3-flash-preview',
            contents: fullPrompt,
            config: {
                systemInstruction
            }
        });
        const text = response.text;
        if (text) return { answer: text.trim(), provider: 'gemini', source: finalContext ? "Exam Bank" : undefined };
      }
    } catch (e) {
      console.warn("Gemini failed, trying Groq...", e);
    }

    // 2. Fallback to Groq
    try {
      const groqKey = (import.meta as any).env.VITE_GROQ_API_KEY || (import.meta as any).env.VITE_GROK_API_KEY;
      if (groqKey) {
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        const chatCompletion = await groq.chat.completions.create({
          messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: fullPrompt }
          ],
          model: "llama-3.3-70b-versatile",
        });
        if (chatCompletion.choices[0]?.message?.content) {
          return { answer: chatCompletion.choices[0].message.content, provider: 'groq', source: finalContext ? "Exam Bank" : undefined };
        }
      }
    } catch (e) {
      console.warn("Groq failed, trying Hugging Face...", e);
    }

    // 3. Fallback to Hugging Face
    try {
      const hfKey = (import.meta as any).env.VITE_HF_API_KEY;
      if (hfKey) {
        const hf = new HfInference(hfKey);
        const response = await hf.textGeneration({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          inputs: `<|system|>\n${systemInstruction}<|user|>\n${fullPrompt}<|assistant|>`,
          parameters: { max_new_tokens: 300 }
        });
        if (response.generated_text) {
          return { answer: response.generated_text.trim(), provider: 'huggingface', source: finalContext ? "Exam Bank" : undefined };
        }
      }
    } catch (e) {
      console.error("All AI providers failed:", e);
    }

    // Final fallback (Keep it short as requested)
    return {
      answer: finalContext 
        ? `Boss, the bank says: ${finalContext.substring(0, 100)}... Let's use this for now!`
        : `Ah ah, we are on it! Just keep pushing, we'll conquer. Ask me something specific about JAMB or Biology!`,
      provider: 'simulated'
    };

  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks(`Explain ${topic}`, topic);
  }
};
