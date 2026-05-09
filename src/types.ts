
export interface ALOCQuestion {
  id: number;
  question: string;
  option: { a: string; b: string; c: string; d: string; e?: string };
  answer: string;
  solution: string;
  examType: string;
  examyear: string;
  image?: string;
  section?: string;
  passage?: string;
}

export interface TutorResponse {
  answer: string;
  provider: 'gemini' | 'groq' | 'huggingface' | 'fallback';
}
