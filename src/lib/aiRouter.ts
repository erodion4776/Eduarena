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
    // Basic examination intent detection: Match year and subject keywords
    const yearMatch = prompt.match(/\b(20\d{2})\b/);
    const subjectMatch = prompt.toLowerCase().match(/\b(biology|chemistry|physics|mathematics|english)\b/);
    let dbContext = context;

    if (supabase && (yearMatch || subjectMatch)) {
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        const subjectName = subjectMatch ? subjectMatch[1] : null;

        let query = supabase.from('questions').select('question_content, options, correct_answer, explanation');
        
        if (year) query = query.eq('year', year);
        
        if (subjectName && !year) {
            query = query.ilike('question_content', `%${subjectName}%`);
        } else if (!year && prompt.length > 10) {
            // General keyword search if no specific subject/year
            query = query.textSearch('question_content', prompt.split(' ').join(' & '));
        }

        const { data: questions } = await query.limit(5);
        
        if (questions && questions.length > 0) {
            dbContext = `Extracted Database Records (Official Past Questions): ` + 
                questions.map(q => `[Q]: ${q.question_content} | [Options]: ${JSON.stringify(q.options)} | [Key]: ${q.correct_answer}`).join('\n\n');
        }
    } else if (supabase && prompt.length > 15) {
        // Fallback broad search for long queries
        const { data: searchResults } = await supabase
            .from('questions')
            .select('question_content, correct_answer')
            .ilike('question_content', `%${prompt.substring(0, 20)}%`)
            .limit(3);
        
        if (searchResults && searchResults.length > 0) {
            dbContext = "Relevant database matches: " + searchResults.map(r => r.question_content).join('; ');
        }
    }

    const fullPrompt = dbContext 
      ? `Act as Tutor Chuks, a brilliant and concise Nigerian tutor. 
         USER QUERY: "${prompt}"
         DATABASE CONTEXT: [${dbContext}]
         
         INSTRUCTIONS:
         - Answer the query directly using the provided context.
         - If providing questions, list them clearly.
         - Use a very brief, smart Nigerian analogy *only* if helpful.
         - Keep response under 150 words.`
      : `Act as Tutor Chuks, a brilliant and concise Nigerian tutor.
         USER QUERY: "${prompt}"
         
         INSTRUCTIONS:
         - Be polite, helpful, and direct.
         - Use a brief Nigerian analogy for greetings or general questions.
         - For greetings (hi, hello), keep it snappy.
         - Keep response under 100 words.`;

    // 1. Attempt Gemini
    try {
      const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: fullPrompt,
        });
        if (response.text) return { answer: response.text, provider: 'gemini' };
      }
    } catch (e) {
      console.warn("Gemini failed, trying Groq...", e);
    }

    // 2. Fallback to Groq
    try {
      const groqKey = (import.meta as any).env.VITE_GROK_API_KEY;
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
      const hfKey = (import.meta as any).env.VITE_HF_API_KEY;
      if (hfKey) {
        const hf = new HfInference(hfKey);
        const response = await hf.textGeneration({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          inputs: fullPrompt,
          parameters: { max_new_tokens: 400 }
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
      answer: `Ah Boss, networking is acting up! But based on what I know: ${dbContext?.substring(0, 50) || 'we are on it'}. Try again in a second, we'll conquer this!`,
      provider: 'simulated'
    };

  },

  async getIntervention(topic: string): Promise<AIResponse> {
    return this.askTutorChuks(`Explain ${topic}`, topic);
  }
};
