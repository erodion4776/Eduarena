import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

import { ALOCQuestion, TutorResponse } from '../types';
import { cacheService } from './cacheService';

export const aiTutor = {
  async askTutorChuksLive(userQuery: string, question: ALOCQuestion): Promise<TutorResponse> {
    const stats = cacheService.getVaultStats();

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery, question, stats })
      });

      if (!response.ok) {
        throw new Error('Server rejected neural request');
      }

      return await response.json();
    } catch (e) {
      console.error("AI Proxy failure", e);
      return {
        answer: "Ah ah, network is misbehaving! But look, the answer is clearly " + question.answer.toUpperCase() + ". Don't let gravity weigh you down, study hard!",
        provider: 'fallback'
      };
    }
  }
};
