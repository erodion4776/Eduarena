import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

import { ALOCQuestion, TutorResponse } from '../types';
import { cacheService } from './cacheService';

// ─────────────────────────────────────────────
// Constants — read once at module level
// ─────────────────────────────────────────────

const GEMINI_API_KEY =
  (import.meta as any).env.VITE_GEMINI_API_KEY ||
  (import.meta as any).env.GEMINI_API_KEY;

const GROQ_API_KEY = (import.meta as any).env.VITE_GROQ_API_KEY;
const HF_API_KEY   = (import.meta as any).env.VITE_HF_API_KEY;

const REQUEST_TIMEOUT_MS = 15_000; // 15 seconds per provider

// ─────────────────────────────────────────────
// Singletons
// ─────────────────────────────────────────────

let _genAI: GoogleGenAI | null = null;
let _groq:  Groq        | null = null;
let _hf:    HfInference | null = null;

function getGenAI(): GoogleGenAI {
  if (!_genAI) {
    _genAI = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return _genAI;
}

function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return _groq;
}

function getHF(): HfInference {
  if (!_hf) _hf = new HfInference(HF_API_KEY);
  return _hf;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/**
 * Wrap a promise with a timeout.
 * Cleans up the timer whether the promise resolves or rejects.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timerId: any;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([
    promise.finally(() => {
      if (timerId !== undefined) clearTimeout(timerId);
    }),
    timeout,
  ]);
}

/**
 * Build structured knowledge context for the system prompt.
 */
function buildContext(question: ALOCQuestion, vaultTotal: number): string {
  const optionE = question.option.e ? ` E) ${question.option.e}` : '';

  return [
    `[HIDDEN_KNOWLEDGE: ALOC_API_SOURCE]`,
    `DATA_SOURCE: ${question.source === 'vault' ? 'GLOBAL_VAULT' : 'LIVE_SATELLITE'}`,
    `VAULT_TOTAL: ${vaultTotal}`,
    `SECTION/INSTRUCTION: ${question.section  ?? 'N/A'}`,
    `PASSAGE: ${question.passage  ?? 'N/A'}`,
    `VISUAL_DIAGRAM_PRESENT: ${question.image ? 'YES' : 'NO'}`,
    `QUESTION: ${question.question}`,
    `OPTIONS: A) ${question.option.a} B) ${question.option.b} C) ${question.option.c} D) ${question.option.d}${optionE}`,
    `CORRECT_ANSWER: ${question.answer.toUpperCase()}`,
    `EXPLANATION: ${question.solution || question.explanation || 'Not provided by question bank'}`,
    `YEAR: ${question.examyear}`,
  ].join('\n');
}

/**
 * Strip the input prompt from HuggingFace textGeneration output.
 * HF returns the full input + completion concatenated.
 */
function extractHFAnswer(generatedText: string): string {
  const marker     = '<|assistant|>';
  const markerIdx  = generatedText.lastIndexOf(marker);
  return markerIdx !== -1
    ? generatedText.slice(markerIdx + marker.length).trim()
    : generatedText.trim();
}

// ─────────────────────────────────────────────
// AI Tutor
// ─────────────────────────────────────────────

export const aiTutor = {

  async askTutorChuksLive(
    userQuery: string,
    question:  ALOCQuestion,
    userChoice: string
  ): Promise<TutorResponse> {

    // 1. Validate input
    const trimmedQuery = userQuery?.trim() ?? '';
    if (!trimmedQuery) {
      return {
        answer:   'Please ask a specific question so I can help you!',
        provider: 'validation',
      };
    }

    // 2. Build prompt components
    const stats = cacheService.getVaultStats();
    const context = buildContext(question, stats.total);

    const systemInstruction = `You are Tutor Chuks, a brilliant and direct Nigerian teacher.
Use the following question data, including SECTION/SYLLABUS context, to help the student:
${context}
STUDENT_CHOICE: ${userChoice}

Your task:
- Explain clearly why the correct answer is ${question.answer.toUpperCase()}.
- Reference the specific SECTION if available in the context.
- Use a relatable Nigerian analogy to make it memorable.
- Explain why the student's choice (${userChoice}) was wrong, based on the correct syllabus knowledge.
- Mention subtly that our system is growing smarter (vault now has ${stats.total} questions synced).
- Be extremely concise — under 80 words. Speak like a trusted mentor.`;

    const fullPrompt = `Student Question: ${trimmedQuery}`;

    // ── Level 1: Gemini ──────────────────────────────────────────
    if (GEMINI_API_KEY) {
      try {
        const result = await withTimeout(
          getGenAI().models.generateContent({
            model:    'gemini-1.5-flash', // ✅ corrected — was 'gemini-3.5-flash'
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config:   { systemInstruction },
          }),
          REQUEST_TIMEOUT_MS
        );

        const text = result.text?.trim();
        if (text) return { answer: text, provider: 'gemini' };

      } catch (e) {
        console.warn('[AICascade] Gemini failed, trying Groq...', e);
      }
    }

    // ── Level 2: Groq ────────────────────────────────────────────
    if (GROQ_API_KEY) {
      try {
        const completion = await withTimeout(
          getGroq().chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user',   content: fullPrompt },
            ],
            max_completion_tokens: 250,
          }),
          REQUEST_TIMEOUT_MS
        );

        const text = completion.choices[0]?.message?.content?.trim();
        if (text) return { answer: text, provider: 'groq' };

      } catch (e) {
        console.warn('[AICascade] Groq failed, trying HuggingFace...', e);
      }
    }

    // ── Level 3: HuggingFace ─────────────────────────────────────
    if (HF_API_KEY) {
      try {
        const response = await withTimeout(
          getHF().textGeneration({
            model:      'meta-llama/Llama-3.2-3B-Instruct',
            inputs:     `<|system|>\n${systemInstruction}\n<|user|>\n${fullPrompt}\n<|assistant|>`,
            parameters: { max_new_tokens: 250 },
          }),
          REQUEST_TIMEOUT_MS
        );

        // ✅ Strip input prefix from HF output
        const cleanAnswer = extractHFAnswer(response.generated_text ?? '');
        if (cleanAnswer) return { answer: cleanAnswer, provider: 'huggingface' };

      } catch (e) {
        console.error('[AICascade] HuggingFace failed.', e);
      }
    }

    // ── Level 4: Static Fallback ─────────────────────────────────
    const explanationStr = question.solution || question.explanation || '';
    return {
      answer: `Ah ah, network is misbehaving! But look — the answer is clearly ${question.answer.toUpperCase()}. ${explanationStr ? `Here is why: ${explanationStr}` : "Review your notes on this topic and you will crack it!"} Don't let gravity weigh you down, study hard!`,
      provider: 'fallback',
    };
  },
};
