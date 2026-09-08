// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

export interface AIResponse {
  answer: string;
  source?: string;
  provider?: string;
}

export interface Message {
  sender: 'tutor' | 'student';
  text: string;
}

// ─────────────────────────────────────────────
// Configuration & Fallback Messages
// ─────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 25_000; // 25-second timeout limit
const MAX_HISTORY_ENTRIES = 10;

const DEFAULT_TIMEOUT_MESSAGE = 
  "Tutor Chuks is taking a bit longer than usual to review the notes. Please try asking your question again!";

const DEFAULT_OFFLINE_MESSAGE = 
  "Here is a quick study tip: When tackling this concept, remember to break down the formula or definition into smaller parts and eliminate incorrect options first!";

// ─────────────────────────────────────────────
// Offline Topic Knowledge Generator
// (Provides helpful tips even if the backend is temporarily offline)
// ─────────────────────────────────────────────

function getOfflineTopicTip(topic: string): string {
  const lowerTopic = topic.toLowerCase();

  if (lowerTopic.includes('mechanic') || lowerTopic.includes('motion') || lowerTopic.includes('physic')) {
    return `When reviewing **${topic}**, remember to check your units (m/s, kg, N) and recall standard equations of motion: $v = u + at$ and $s = ut + \\frac{1}{2}at^2$.`;
  }
  if (lowerTopic.includes('cell') || lowerTopic.includes('bio') || lowerTopic.includes('mitochon')) {
    return `For **${topic}**, focus on organelle functions! For example, mitochondria produce ATP energy, while ribosomes synthesize proteins.`;
  }
  if (lowerTopic.includes('quadratic') || lowerTopic.includes('math') || lowerTopic.includes('calculus')) {
    return `When solving **${topic}**, always check the discriminant ($b^2 - 4ac$) first to identify if the roots will be real, repeated, or imaginary.`;
  }
  if (lowerTopic.includes('english') || lowerTopic.includes('grammar') || lowerTopic.includes('concord')) {
    return `For **${topic}**, pay close attention to subject-verb agreement and singular vs. plural contexts in the sentence.`;
  }

  return `Let's break down **${topic}** together! Review the core definitions in your textbook and practice at least two sample questions on this concept.`;
}

// ─────────────────────────────────────────────
// AI Router Service
// ─────────────────────────────────────────────

export const aiRouter = {

  /**
   * Send a question to Tutor Chuks with automatic timeout protection
   * and clean history sanitization.
   */
  async askTutorChuks(
    prompt: string,
    history: Message[] = []
  ): Promise<AIResponse> {

    // 1. Validate prompt input
    const trimmedPrompt = prompt?.trim() ?? '';
    if (!trimmedPrompt) {
      return {
        answer: 'Please type a question so I can help you study!',
        provider: 'assistant',
      };
    }

    // 2. Clean and limit conversation history for optimal performance
    const sanitisedHistory = history
      .filter((m) => m.text?.trim().length > 0)
      .slice(-MAX_HISTORY_ENTRIES);

    // 3. Set up timeout guard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // Primary API endpoint
      const response = await fetch('/.netlify/functions/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedPrompt,
          history: sanitisedHistory,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Service status: ${response.status}`);
      }

      const data = await response.json();

      return {
        answer: data.response || data.answer || data.text || DEFAULT_OFFLINE_MESSAGE,
        source: data.source || 'Curriculum Syllabus Guide',
        provider: data.provider || 'tutor-ai',
      };

    } catch (error: any) {
      // Handle request timeout gracefully
      if (error.name === 'AbortError') {
        return {
          answer: DEFAULT_TIMEOUT_MESSAGE,
          provider: 'timeout-handler',
        };
      }

      // Offline friendly fallback for local development or disconnected mode
      return {
        answer: getOfflineTopicTip(trimmedPrompt),
        source: 'Recommended Coursebook Review',
        provider: 'study-guide',
      };

    } finally {
      // Always clear the timer to prevent memory leaks
      clearTimeout(timeoutId);
    }
  },

  /**
   * Request a quick, targeted explanation of an exam concept.
   */
  async getIntervention(topic: string): Promise<AIResponse> {
    const trimmedTopic = topic?.trim() ?? '';

    if (!trimmedTopic) {
      return {
        answer: 'Please pick a topic to review!',
        provider: 'assistant',
      };
    }

    return this.askTutorChuks(
      `Please explain this concept clearly for high school exam revision: ${trimmedTopic}`,
      [] // Topic reviews are standalone queries
    );
  },
};
