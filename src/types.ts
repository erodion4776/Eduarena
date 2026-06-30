
export interface ALOCQuestion {
  id: number;
  question: string;
  option: { a: string; b: string; c: string; d: string; e?: string };
  answer: string;
  solution: string;
  explanation?: string;
  examType: string;
  examyear: string;
  subject?: string;
  image?: string;
  section?: string;
  passage?: string;
  source?: 'live' | 'vault';
}

export interface TutorResponse {
  answer: string;
  provider: 'gemini' | 'groq' | 'huggingface' | 'fallback' | 'validation';
}
