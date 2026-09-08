import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

import { ALOCQuestion, TutorResponse } from '../types';
import { cacheService } from './cacheService';

// ─────────────────────────────────────────────
// Environment Variable Helper (Vite & Next.js Safe)
// ─────────────────────────────────────────────

function getEnvVar(key: string): string | undefined {
  try {
    // 1. Check Vite environment
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key];
      if (val) return val;
    }
  } catch {
    // Ignore environment lookup errors
  }

  try {
    // 2. Check standard Node / Next.js environment
    if (typeof process !== 'undefined' && process.env) {
      return process.env[`NEXT_PUBLIC_${key}`] || process.env[`VITE_${key}`] || process.env[key];
    }
  } catch {
    // Ignore environment lookup errors
  }

  return undefined;
}

const GEMINI_API_KEY = getEnvVar('GEMINI_API_KEY');
const GROQ_API_KEY   = getEnvVar('GROQ_API_KEY');
const HF_API_KEY     = getEnvVar('HF_API_KEY');

const REQUEST_TIMEOUT_MS = 12_000; // 12 seconds per provider

// ─────────────────────────────────────────────
// Client Singletons (Lazy Loaded)
// ─────────────────────────────────────────────

let _genAI: GoogleGenAI | null = null;
let _groq:  Groq        | null = null;
let _hf:    HfInference | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!_genAI && GEMINI_API_KEY) {
    _genAI = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
  }
  return _genAI;
}

function getGroq(): Groq | null {
  if (!_groq && GROQ_API_KEY) {
    _groq = new Groq({
      apiKey: GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return _groq;
}

function getHF(): HfInference | null {
  if (!_hf && HF_API_KEY) {
    _hf = new HfInference(HF_API_KEY);
  }
  return _hf;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/**
 * Timeout Guard: Ensures network requests don't hang indefinitely.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });

  return Promise.race([
    promise.finally(() => {
      if (timerId !== undefined) clearTimeout(timerId);
    }),
    timeout,
  ]);
}

/**
 * Builds structured study context from the question data.
 */
function buildContext(question: ALOCQuestion, vaultTotal: number): string {
  const options = question.option || {};
  const optionA = options.a ? `A) ${options.a}` : '';
  const optionB = options.b ? `B) ${options.b}` : '';
  const optionC = options.c ? `C) ${options.c}` : '';
  const optionD = options.d ? `D) ${options.d}` : '';
  const optionE = options.e ? `E) ${options.e}` : '';
  const optionsList = [optionA, optionB, optionC, optionD, optionE].filter(Boolean).join(' | ');

  return [
    `SUBJECT: ${question.subject || 'General Studies'}`,
    `YEAR: ${question.examyear || 'Recent Exam'}`,
    `QUESTION: ${question.question || ''}`,
    `OPTIONS: ${optionsList}`,
    `CORRECT_ANSWER: ${(question.answer || '').toUpperCase()}`,
    `EXPLANATION_GUIDE: ${question.solution || question.explanation || 'Apply standard syllabus rules.'}`,
  ].join('\n');
}

/**
 * Clean up output formatting from Hugging Face models.
 */
function extractHFAnswer(generatedText: string): string {
  const marker = '<|assistant|>';
  const markerIdx = generatedText.lastIndexOf(marker);
  return markerIdx !== -1
    ? generatedText.slice(markerIdx + marker.length).trim()
    : generatedText.trim();
}

// ─────────────────────────────────────────────
// AI Tutor Service (Multi-Provider Cascade)
// ─────────────────────────────────────────────

export const aiTutor = {

  /**
   * Explain a question using a 4-tier cascade:
   * Level 1: Google Gemini (Fast & detailed)
   * Level 2: Groq Llama 3 (Ultra low latency)
   * Level 3: Hugging Face Inference
   * Level 4: Static verified textbook notes
   */
  async askTutorChuksLive(
    userQuery: string,
    question: ALOCQuestion,
    userChoice: string
  ): Promise<TutorResponse> {

    // 1. Validate query
    const trimmedQuery = userQuery?.trim() ?? '';
    if (!trimmedQuery) {
      return {
        answer: 'Please ask a question about this problem so I can guide you!',
        provider: 'validation',
      };
    }

    // 2. Prepare structured classroom prompt
    const stats = cacheService?.getVaultStats ? cacheService.getVaultStats() : { total: 1000 };
    const context = buildContext(question, stats.total);

    const systemInstruction = `You are Tutor Chuks, a supportive, encouraging, and knowledgeable teacher for Nigerian secondary school students preparing for WAEC, JAMB, and NECO exams.

Question Context:
${context}

Student Selected: Option ${userChoice.toUpperCase()}

Instructions:
1. Explain clearly why Option ${(question.answer || '').toUpperCase()} is the correct answer.
2. If the student chose an incorrect option, kindly point out the common misconception without discouraging them.
3. Use simple, clear language with relatable examples or analogies.
4. Keep the tone warm, academic, and motivating!`;

    const fullPrompt = `Student Question: ${trimmedQuery}`;

    // ── LEVEL 1: Google Gemini ───────────────────
    const genAI = getGenAI();
    if (genAI) {
      try {
        const result = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            config: { systemInstruction },
          }),
          REQUEST_TIMEOUT_MS
        );

        const text = result.text?.trim();
        if (text) return { answer: text, provider: 'gemini' };
      } catch {
        // Continue down the cascade
      }
    }

    // ── LEVEL 2: Groq (Llama 3) ──────────────────
    const groq = getGroq();
    if (groq) {
      try {
        const completion = await withTimeout(
          groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user',   content: fullPrompt },
            ],
            max_completion_tokens: 300,
          }),
          REQUEST_TIMEOUT_MS
        );

        const text = completion.choices[0]?.message?.content?.trim();
        if (text) return { answer: text, provider: 'groq' };
      } catch {
        // Continue down the cascade
      }
    }

    // ── LEVEL 3: Hugging Face ────────────────────
    const hf = getHF();
    if (hf) {
      try {
        const response = await withTimeout(
          hf.textGeneration({
            model: 'meta-llama/Llama-3.2-3B-Instruct',
            inputs: `<|system|>\n${systemInstruction}\n<|user|>\n${fullPrompt}\n<|assistant|>`,
            parameters: { max_new_tokens: 300 },
          }),
          REQUEST_TIMEOUT_MS
        );

        const cleanAnswer = extractHFAnswer(response.generated_text ?? '');
        if (cleanAnswer) return { answer: cleanAnswer, provider: 'huggingface' };
      } catch {
        // Continue down the cascade
      }
    }

    // ── LEVEL 4: Static Teacher Fallback ─────────
    const correctKey = (question.answer || 'the indicated option').toUpperCase();
    const solutionText = question.solution || question.explanation || '';

    return {
      answer: `The correct answer to this question is **Option ${correctKey}**.\n\n${
        solutionText 
          ? `**Explanation:** ${solutionText}` 
          : 'Review the key definitions and formulas in this syllabus chapter to master this topic!'
      }\n\nKeep practicing — consistency is the key to exam success! 🎓`,
      provider: 'course-notes',
    };
  },
};
