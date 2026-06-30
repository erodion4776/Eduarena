// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AIResponse {
  answer:     string;
  source?:    string;
  provider:   string;
  matchCount?: number; // RAG match count from server
}

export interface Message {
  sender: 'tutor' | 'student';
  text:   string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const REQUEST_TIMEOUT_MS  = 30_000; // 30 seconds
const MAX_HISTORY_ENTRIES = 10;
const FALLBACK_MESSAGE    = "Omo, I am having trouble thinking right now. Ask me again!";
const NETWORK_MESSAGE     = "Omo, network is behaving somehow! Keep studying — check your textbooks, I'll be back shortly.";
const TIMEOUT_MESSAGE     = "Tutor Chuks is taking too long to respond. Please try again in a moment!";

// ─────────────────────────────────────────────
// AI Router
// ─────────────────────────────────────────────

export const aiRouter = {

  /**
   * Send a message to Tutor Chuks via the server-side AI endpoint.
   * Includes timeout guard, history sanitisation, and rich error handling.
   */
  async askTutorChuks(
    prompt:  string,
    history: Message[] = []
  ): Promise<AIResponse> {

    // 1. Validate prompt
    const trimmedPrompt = prompt?.trim() ?? '';
    if (!trimmedPrompt) {
      return {
        answer:   'Please type a question so I can help you!',
        provider: 'validation',
      };
    }

    // 2. Sanitise history — remove blanks, cap at last 10
    const sanitisedHistory = history
      .filter(m => m.text?.trim().length > 0)
      .slice(-MAX_HISTORY_ENTRIES);

    // 3. Timeout guard
    const controller = new AbortController();
    const timeoutId  = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch('/api/ai/tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: trimmedPrompt,
          history: sanitisedHistory,
        }),
        signal: controller.signal,
      });

      // 4. Read server error body before throwing
      if (!response.ok) {
        let serverMessage = '';
        try {
          const errBody  = await response.json();
          serverMessage  = errBody?.error ?? errBody?.message ?? '';
        } catch {
          // body was not JSON — ignore
        }
        throw new Error(
          `Server error ${response.status}${serverMessage ? `: ${serverMessage}` : ''}`
        );
      }

      const data = await response.json();

      return {
        answer:     data.response ?? data.answer ?? data.text ?? FALLBACK_MESSAGE,
        source:     data.source      ?? undefined,
        provider:   data.provider    ?? 'unknown',
        matchCount: data.matchCount  ?? 0,
      };

    } catch (e: any) {
      // 5. Distinguish timeout from network errors
      if (e.name === 'AbortError') {
        console.warn('[AIRouter] Request timed out after', REQUEST_TIMEOUT_MS, 'ms');
        return { answer: TIMEOUT_MESSAGE, provider: 'timeout-fallback' };
      }

      console.error('[AIRouter] fetch failed:', e);
      return { answer: NETWORK_MESSAGE, provider: 'emergency-fallback' };

    } finally {
      // 6. Always clean up the timeout timer
      clearTimeout(timeoutId);
    }
  },

  /**
   * Request a focused explanation of a specific exam topic.
   */
  async getIntervention(topic: string): Promise<AIResponse> {
    const trimmedTopic = topic?.trim() ?? '';

    if (!trimmedTopic) {
      return {
        answer:   'Please specify a topic for me to explain!',
        provider: 'validation',
      };
    }

    return this.askTutorChuks(
      `Explain the following topic clearly for a Nigerian WAEC/JAMB exam student: ${trimmedTopic}`,
      [] // interventions are standalone — no history needed
    );
  },
};

