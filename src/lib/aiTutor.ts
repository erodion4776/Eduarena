import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

import { ALOCQuestion, TutorResponse } from '../types';

export const aiTutor = {
  async askTutorChuksLive(userQuery: string, question: ALOCQuestion): Promise<TutorResponse> {
    const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
    const groqKey = (import.meta as any).env.VITE_GROQ_API_KEY;
    const hfKey = (import.meta as any).env.VITE_HF_API_KEY;

    const apiDataContext = `
[HIDDEN_KNOWLEDGE: ALOC_API_SOURCE]
SECTION/INSTRUCTION: ${question.section || "N/A"}
PASSAGE: ${question.passage || "N/A"}
QUESTION: ${question.question}
OPTIONS: A) ${question.option.a}, B) ${question.option.b}, C) ${question.option.c}, D) ${question.option.d}, E) ${question.option.e || "N/A"}
CORRECT_ANSWER: ${question.answer.toUpperCase()}
EXPLANATION_FROM_SOURCE: ${question.solution || "Not provided by bank"}
YEAR: ${question.examyear}
`;

    const systemInstruction = `You are Tutor Chuks, a brilliant and direct Nigerian teacher. 
Use the following API data to help the student: ${apiDataContext}.
Explain why the correct answer is ${question.answer.toUpperCase()} using a relatable Nigerian analogy.
Be extremely concise (under 80 words). Speak like a mentor.`;

    const fullPrompt = `Student Question: ${userQuery}`;

    // 1. Level One: Gemini
    if (geminiKey) {
      try {
        const genAI = new GoogleGenAI({ apiKey: geminiKey });
        const result = await genAI.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: { systemInstruction }
        });
        if (result.text) return { answer: result.text.trim(), provider: 'gemini' };
      } catch (e) {
        console.warn("Cascade: Gemini failed, trying Groq...", e);
      }
    }

    // 2. Level Two: Groq
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: fullPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          max_completion_tokens: 250
        });
        const text = completion.choices[0]?.message?.content;
        if (text) return { answer: text.trim(), provider: 'groq' };
      } catch (e) {
        console.warn("Cascade: Groq failed, trying Hugging Face...", e);
      }
    }

    // 3. Level Three: Hugging Face
    if (hfKey) {
      try {
        const hf = new HfInference(hfKey);
        const response = await hf.textGeneration({
          model: 'meta-llama/Llama-3.2-3B-Instruct',
          inputs: `<|system|>\n${systemInstruction}<|user|>\n${fullPrompt}<|assistant|>`,
          parameters: { max_new_tokens: 250 }
        });
        if (response.generated_text) return { answer: response.generated_text.trim(), provider: 'huggingface' };
      } catch (e) {
        console.error("Cascade: Hugging Face failure.", e);
      }
    }

    return {
      answer: "Ah ah, network is misbehaving! But look, the answer is clearly " + question.answer.toUpperCase() + ". Don't let gravity weigh you down, study hard!",
      provider: 'fallback'
    };
  }
};
