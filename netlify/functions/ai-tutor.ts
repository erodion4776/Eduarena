// netlify/functions/ai-tutor.ts
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HistoryTurn {
  sender: 'student' | 'tutor';
  text:   string;
}

interface RequestBody {
  message:     string;
  history?:    HistoryTurn[];
  subject?:    string | null;
  context?:    string;
  session_id?: string | null;
  user_id?:    string | null;
}

interface ChatMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

// ─────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                 'application/json',
};

// ─────────────────────────────────────────────
// Helper — safe JSON response
// ─────────────────────────────────────────────
function jsonResponse(statusCode: number, data: object) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body:    JSON.stringify(data),
  };
}

// =============================================================================
// AI PROVIDERS
// =============================================================================

// ─────────────────────────────────────────────
// 1. GEMINI  (Primary)
// ─────────────────────────────────────────────
async function callGemini(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in Netlify environment variables.');

  // Separate system prompt from chat turns
  const systemMsg = messages.find(m => m.role === 'system');
  const chatTurns = messages.filter(m => m.role !== 'system');

  // Convert to Gemini format
  const contents = chatTurns.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const requestBody = {
    contents,
    systemInstruction: systemMsg
      ? { parts: [{ text: systemMsg.content }] }
      : undefined,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature:     0.4,
    },
  };

  console.log('[Gemini] Calling API...');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(requestBody),
    },
  );

  const rawText = await res.text();
  console.log('[Gemini] Status:', res.status);
  console.log('[Gemini] Raw (first 300):', rawText.substring(0, 300));

  if (!rawText.trim()) {
    throw new Error(`Gemini returned empty body (HTTP ${res.status})`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${rawText.substring(0, 150)}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  // Extract text safely
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || !content.trim()) {
    const reason = data?.candidates?.[0]?.finishReason ?? 'unknown';
    console.error('[Gemini] No content. Full response:', JSON.stringify(data, null, 2));
    throw new Error(`Gemini returned no text content. finishReason="${reason}"`);
  }

  console.log('[Gemini] ✅ Success, length:', content.length);
  return content.trim();
}

// ─────────────────────────────────────────────
// 2. GROQ  (First Fallback)
// ─────────────────────────────────────────────
async function callGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in Netlify environment variables.');

  console.log('[Groq] Calling API...');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile', // fast + free tier available
      messages,
      max_tokens:  1024,
      temperature: 0.4,
      stream:      false,
    }),
  });

  const rawText = await res.text();
  console.log('[Groq] Status:', res.status);
  console.log('[Groq] Raw (first 300):', rawText.substring(0, 300));

  if (!rawText.trim()) {
    throw new Error(`Groq returned empty body (HTTP ${res.status})`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${rawText.substring(0, 150)}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Groq API error: ${msg}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    const reason = data?.choices?.[0]?.finish_reason ?? 'unknown';
    throw new Error(`Groq returned no content. finish_reason="${reason}"`);
  }

  console.log('[Groq] ✅ Success, length:', content.length);
  return content.trim();
}

// ─────────────────────────────────────────────
// 3. HUGGING FACE  (Last Resort)
// ─────────────────────────────────────────────
async function callHuggingFace(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error('HF_API_KEY is not set in Netlify environment variables.');

  // HuggingFace Inference API — using a good free model
  const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

  // Convert messages to a single prompt string (HF format)
  const prompt = messages
    .map(m => {
      if (m.role === 'system')    return `<s>[INST] <<SYS>>\n${m.content}\n<</SYS>>\n\n`;
      if (m.role === 'user')      return `${m.content} [/INST]`;
      if (m.role === 'assistant') return `${m.content} </s><s>[INST] `;
      return '';
    })
    .join('');

  console.log('[HuggingFace] Calling API, model:', HF_MODEL);

  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens:  800,
          temperature:     0.4,
          return_full_text: false,   // only return new tokens
          do_sample:       true,
        },
      }),
    },
  );

  const rawText = await res.text();
  console.log('[HuggingFace] Status:', res.status);
  console.log('[HuggingFace] Raw (first 300):', rawText.substring(0, 300));

  if (!rawText.trim()) {
    throw new Error(`HuggingFace returned empty body (HTTP ${res.status})`);
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`HuggingFace returned invalid JSON: ${rawText.substring(0, 150)}`);
  }

  if (!res.ok) {
    // Model may be loading — common HF error
    if (data?.error?.includes('loading')) {
      throw new Error('HuggingFace model is loading. Please try again in 20 seconds.');
    }
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(`HuggingFace API error: ${msg}`);
  }

  // HF returns array of generated texts
  const content =
    data?.[0]?.generated_text ||
    data?.generated_text       ||
    (typeof data === 'string' ? data : null);

  if (!content || !content.trim()) {
    console.error('[HuggingFace] Unexpected shape:', JSON.stringify(data, null, 2));
    throw new Error('HuggingFace returned no generated text.');
  }

  console.log('[HuggingFace] ✅ Success, length:', content.length);
  return content.trim();
}

// ─────────────────────────────────────────────
// AI Fallback Chain
// Gemini → Groq → HuggingFace
// ─────────────────────────────────────────────
async function callAIWithFallback(
  messages: ChatMessage[],
): Promise<{ text: string; provider: string }> {

  const providers = [
    { name: 'Gemini',      fn: () => callGemini(messages)      },
    { name: 'Groq',        fn: () => callGroq(messages)        },
    { name: 'HuggingFace', fn: () => callHuggingFace(messages) },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[AI Chain] Trying ${provider.name}...`);
      const text = await provider.fn();
      console.log(`[AI Chain] ✅ ${provider.name} succeeded`);
      return { text, provider: provider.name };
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown error';
      console.warn(`[AI Chain] ❌ ${provider.name} failed:`, msg);
      errors.push(`${provider.name}: ${msg}`);
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(
    `All AI providers failed.\n${errors.join('\n')}`
  );
}

// =============================================================================
// SUPABASE HELPERS
// =============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

// ─────────────────────────────────────────────
// RAG context retrieval
// ─────────────────────────────────────────────
async function getRAGContext(
  query:    string,
  subject?: string | null,
): Promise<{ context: string; source?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[RAG] Supabase not configured — skipping');
      return { context: '' };
    }

    let q = supabase
      .from('documents')
      .select('content, subject, title')
      .textSearch('content', query, { type: 'websearch' })
      .limit(3);

    if (subject) {
      q = q.eq('subject', subject);
    }

    const { data, error } = await q;

    if (error || !data?.length) {
      console.log('[RAG] No results:', error?.message ?? 'empty');
      return { context: '' };
    }

    const context = data
      .map((d: any, i: number) =>
        `[Reference ${i + 1} — ${d.title ?? d.subject ?? 'Knowledge Base'}]:\n${d.content}`
      )
      .join('\n\n');

    return { context, source: 'Knowledge Base' };

  } catch (err: any) {
    console.warn('[RAG] Error (non-fatal):', err.message);
    return { context: '' };
  }
}

// ─────────────────────────────────────────────
// Save conversation
// ─────────────────────────────────────────────
async function saveChat(params: {
  session_id:  string;
  user_id?:    string | null;
  userMessage: string;
  aiResponse:  string;
  subject?:    string | null;
  provider?:   string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from('chat_messages').insert([
      {
        session_id: params.session_id,
        user_id:    params.user_id ?? null,
        role:       'user',
        content:    params.userMessage,
        metadata:   { subject: params.subject },
      },
      {
        session_id: params.session_id,
        user_id:    params.user_id ?? null,
        role:       'assistant',
        content:    params.aiResponse,
        metadata:   {
          subject:  params.subject,
          provider: params.provider,     // track which AI answered
        },
      },
    ]);

    console.log('[Supabase] ✅ Chat saved, session:', params.session_id);
  } catch (err: any) {
    console.warn('[Supabase] Save failed (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────
// Build system prompt
// ─────────────────────────────────────────────
function buildSystemPrompt(ragContext: string, subject?: string | null): string {
  const lines = [
    'You are Tutor Chuks, a friendly and expert AI tutor helping West African',
    'students prepare for WAEC, JAMB, and NECO examinations.',
    '\n\nYour guidelines:',
    '- Use clear, simple English with relatable Nigerian/West African examples.',
    '- For math or science problems, show every step clearly.',
    '- Keep answers focused: 2 to 4 paragraphs unless more detail is needed.',
    '- Always end with a short encouraging line for the student.',
    '- If you are unsure about something, say so honestly.',
  ];

  if (subject) {
    lines.push(`\n\nThe student is currently studying: ${subject}.`);
  }

  if (ragContext) {
    lines.push(`\n\nUse the following reference material in your answer:\n---\n${ragContext}\n---`);
  }

  return lines.join(' ');
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed', message: 'Use POST.' });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    if (!event.body) throw new Error('Request body is empty.');
    body = JSON.parse(event.body);
  } catch (err: any) {
    return jsonResponse(400, {
      error:   'Bad Request',
      message: `Cannot parse request body: ${err.message}`,
    });
  }

  const {
    message,
    history    = [],
    subject    = null,
    session_id = null,
    user_id    = null,
  } = body;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!message || typeof message !== 'string' || !message.trim()) {
    return jsonResponse(400, {
      error:   'Bad Request',
      message: '"message" field is required and must not be empty.',
    });
  }

  // ── Check at least one AI key exists ───────────────────────────────────────
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq   = !!process.env.GROQ_API_KEY;
  const hasHF     = !!process.env.HF_API_KEY;

  console.log('[ai-tutor] ENV check — Gemini:', hasGemini, '| Groq:', hasGroq, '| HF:', hasHF);

  if (!hasGemini && !hasGroq && !hasHF) {
    return jsonResponse(500, {
      error:   'Configuration Error',
      message: 'No AI API keys are configured. Add GEMINI_API_KEY, GROQ_API_KEY, or HF_API_KEY in Netlify environment variables (without the VITE_ prefix).',
    });
  }

  console.log('[ai-tutor] Request:', {
    preview:  message.substring(0, 80),
    history:  history.length,
    subject,
    session_id,
  });

  try {
    // ── 1. RAG ───────────────────────────────────────────────────────────────
    const { context: ragContext, source } = await getRAGContext(message, subject);

    // ── 2. Build messages ────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(ragContext, subject);

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter((h): h is HistoryTurn => !!h?.text?.trim())
        .map(h => ({
          role:    (h.sender === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.text,
        })),
      { role: 'user', content: message.trim() },
    ];

    // ── 3. Call AI with fallback chain ───────────────────────────────────────
    const { text: aiResponse, provider } = await callAIWithFallback(chatMessages);

    // ── 4. Save to Supabase ──────────────────────────────────────────────────
    const resolvedSessionId =
      session_id ??
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await saveChat({
      session_id:  resolvedSessionId,
      user_id,
      userMessage: message,
      aiResponse,
      subject,
      provider,
    });

    // ── 5. Respond ───────────────────────────────────────────────────────────
    return jsonResponse(200, {
      response:   aiResponse,          // ← frontend reads this field
      source:     source ?? null,
      provider,                        // useful for debugging
      session_id: resolvedSessionId,
    });

  } catch (err: any) {
    console.error('[ai-tutor] Fatal error:', err.message);

    return jsonResponse(500, {
      error:   'Internal Server Error',
      message: err.message ?? 'An unexpected error occurred.',
    });
  }
};

export { handler };
