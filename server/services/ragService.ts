// server/services/ragService.ts
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { Groq } from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface RetrievedDoc {
  id:         string;
  title:      string;
  content:    string;
  source:     string;
  subject:    string;
  similarity: number;
}

export interface RAGResult {
  response:   string;
  source:     string | null;
  session_id: string;
  docs_used:  number;
  provider:   AIProvider;
}

export interface ChatMessage {
  sender: 'student' | 'tutor';
  text:   string;
}

export type AIProvider = 'openai' | 'gemini' | 'groq' | 'huggingface' | 'none';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_QUESTION_LENGTH = 1_000;  // chars sanitized before LLM
const MAX_CONTENT_PER_DOC = 800;   // chars per retrieved doc chunk
const MAX_CONTEXT_DOCS    = 5;     // max docs injected into prompt
const MAX_HISTORY_TURNS   = 6;     // message pairs kept for context
const OPENAI_TIMEOUT_MS   = 15_000;
const LLM_MAX_TOKENS      = 700;
const LLM_TEMPERATURE     = 0.4;

// ✅ Model constants — change here only, reflected everywhere
const EMBED_MODEL       = 'text-embedding-3-small'; // 1536 dims — must match pgvector column
const OPENAI_CHAT_MODEL = 'gpt-4o-mini';
// ✅ gemini-3.5-flash is the modern, highly intelligent recommended model in current @google/genai SDK
const GEMINI_CHAT_MODEL = 'gemini-3.5-flash';

// Similarity threshold — lowered from 0.65 to catch more relevant docs
// on short/vague questions. Still filters pure noise below 0.50.
const SIMILARITY_THRESHOLD = 0.50;

// ─────────────────────────────────────────────────────────────────────────────
// Environment helpers
// ─────────────────────────────────────────────────────────────────────────────
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value === 'undefined' || value.trim() === '') {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
      `   Add it to your .env file and restart the server.`
    );
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  if (!value || value === 'undefined' || value.trim() === '') return null;
  return value.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Supabase checker — returns null instead of throwing when unconfigured
// This is used by "non-critical" paths (session + message saving)
// ─────────────────────────────────────────────────────────────────────────────
function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy singleton clients
// ─────────────────────────────────────────────────────────────────────────────
let _openai:   OpenAI         | null = null;
let _supabase: SupabaseClient | null = null;
let _gemini:   GoogleGenAI    | null = null;
let _groq:     Groq           | null = null;
let _hf:       HfInference    | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey:  requireEnv('OPENAI_API_KEY'),
      timeout: OPENAI_TIMEOUT_MS,
    });
  }
  return _openai;
}

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession:   false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _supabase;
}

function getGemini(): GoogleGenAI | null {
  const key = optionalEnv('GEMINI_API_KEY');
  if (!key) return null;
  if (!_gemini) {
    _gemini = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return _gemini;
}

function getGroq(): Groq | null {
  const key = optionalEnv('GROQ_API_KEY') || optionalEnv('VITE_GROQ_API_KEY') || optionalEnv('GROK_API_KEY') || optionalEnv('VITE_GROK_API_KEY');
  if (!key) return null;
  if (!_groq) {
    _groq = new Groq({ apiKey: key });
  }
  return _groq;
}

function getHF(): HfInference | null {
  const key = optionalEnv('HF_API_KEY') || optionalEnv('VITE_HF_API_KEY');
  if (!key) return null;
  if (!_hf) {
    _hf = new HfInference(key);
  }
  return _hf;
}

function extractHFAnswer(generatedText: string): string {
  const marker     = '<|assistant|>';
  const markerIdx  = generatedText.lastIndexOf(marker);
  return markerIdx !== -1
    ? generatedText.slice(markerIdx + marker.length).trim()
    : generatedText.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider detection — call on app startup for early warnings
// ─────────────────────────────────────────────────────────────────────────────
export function detectProviders(): {
  openai:   boolean;
  gemini:   boolean;
  supabase: boolean;
  warnings: string[];
} {
  const hasOpenAI   = Boolean(optionalEnv('OPENAI_API_KEY'));
  const hasGemini   = Boolean(optionalEnv('GEMINI_API_KEY'));
  const hasSupabase = Boolean(
    optionalEnv('SUPABASE_URL') &&
    optionalEnv('SUPABASE_SERVICE_ROLE_KEY')
  );

  const warnings: string[] = [];

  if (!hasOpenAI && !hasGemini) {
    warnings.push('🔴 No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
  } else {
    if (!hasOpenAI) {
      warnings.push('🟡 OpenAI not configured. Using Gemini only — RAG vector search disabled.');
    }
    if (!hasGemini) {
      warnings.push('🟡 Gemini not configured. No fallback if OpenAI fails.');
    }
  }

  if (!hasSupabase) {
    warnings.push('🔴 Supabase not configured — chat history and vector search disabled.');
  }

  // Print on startup so developer sees them immediately
  warnings.forEach(w => console.warn(w));

  return { openai: hasOpenAI, gemini: hasGemini, supabase: hasSupabase, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input sanitizer
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeInput(text: string, maxLength = MAX_QUESTION_LENGTH): string {
  return text
    // Strip ASCII control characters except tab (\x09) and newline (\x0A \x0D)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mask session ID for safe logging
// ─────────────────────────────────────────────────────────────────────────────
function maskSessionId(sessionId: string): string {
  if (sessionId.length <= 8) return '***';
  return `...${sessionId.slice(-8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Embed user query with OpenAI
//
// DIMENSION RULE:
//   text-embedding-3-small = 1536 dims
//   pgvector column MUST be declared as vector(1536)
//   Never mix embedding models across documents in the same DB.
//   If OpenAI is unavailable → return [] → caller skips retrieval.
// ─────────────────────────────────────────────────────────────────────────────
export async function embedQuery(
  text: string
): Promise<{ embedding: number[]; provider: AIProvider }> {
  if (optionalEnv('OPENAI_API_KEY')) {
    try {
      const openai = getOpenAI();
      const res    = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: text.slice(0, 8_000),
      });

      const { embedding } = res.data[0];
      console.log(`✅ Embedded (${embedding.length} dims) via OpenAI`);
      return { embedding, provider: 'openai' };

    } catch (err: any) {
      console.error('❌ OpenAI embedding failed, falling back to Gemini:', err.message);
    }
  }

  const gemini = getGemini();
  if (gemini) {
    try {
      console.log('Embedding via Gemini (gemini-embedding-2-preview, 768 dims)...');
      const response = await gemini.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text.slice(0, 8_000),
        config: {
          outputDimensionality: 768
        }
      });
      const embedding = response.embeddings?.[0]?.values ?? (response as any).embedding?.values;
      if (embedding && embedding.length > 0) {
        console.log(`✅ Embedded (${embedding.length} dims) via Gemini`);
        return { embedding, provider: 'gemini' };
      }
    } catch (err: any) {
      console.error('❌ Gemini embedding failed:', err.message);
    }
  }

  console.warn('⚠️ No embedding provider succeeded — skipping vector retrieval.');
  return { embedding: [], provider: 'none' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Retrieve relevant documents from pgvector
// ─────────────────────────────────────────────────────────────────────────────
export async function retrieveDocuments(
  queryEmbedding: number[],
  subject?:       string,
  matchCount      = MAX_CONTEXT_DOCS,
  // ✅ Lowered from 0.65 — catches more relevant docs on short questions
  threshold       = SIMILARITY_THRESHOLD
): Promise<RetrievedDoc[]> {
  if (queryEmbedding.length === 0) {
    console.log('ℹ️ No embedding — skipping vector retrieval.');
    return [];
  }

  // ✅ Use tryGetSupabase so missing config logs a warning, not a crash
  const supabase = tryGetSupabase();
  if (!supabase) {
    console.warn('⚠️ Supabase not configured — skipping vector retrieval.');
    return [];
  }

  // 1. Try match_document_chunks first (standard schema in supabase_schema.sql)
  try {
    console.log('🔍 Querying match_document_chunks RPC...');
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count:     matchCount,
      filter_subject:  subject ?? null,
    });

    if (!error && data) {
      const docs = ((data as any[]) ?? []).map(doc => ({
        id: doc.id,
        title: doc.topic || doc.title || 'Concept',
        content: doc.content || '',
        source: doc.source || 'Textbook',
        subject: doc.subject || '',
        similarity: doc.similarity || 0
      }));
      console.log(`✅ Retrieved ${docs.length} doc(s) via match_document_chunks`);
      return docs;
    }
    if (error) {
      console.warn('⚠️ match_document_chunks RPC returned error, trying match_documents:', error.message);
    }
  } catch (err: any) {
    console.warn('⚠️ match_document_chunks exception, trying match_documents:', err.message);
  }

  // 2. Fallback to match_documents (alternate schema)
  try {
    console.log('🔍 Querying match_documents RPC...');
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count:     matchCount,
      filter_subject:  subject ?? null,
    });

    if (error) {
      console.error('❌ match_documents RPC error:', error.message);
      return [];
    }

    const docs = ((data as any[]) ?? []).map(doc => ({
      id: doc.id,
      title: doc.title || doc.topic || 'Concept',
      content: doc.content || '',
      source: doc.source || 'Textbook',
      subject: doc.subject || '',
      similarity: doc.similarity || 0
    }));
    console.log(`✅ Retrieved ${docs.length} doc(s) via match_documents`);
    return docs;

  } catch (err: any) {
    console.error('❌ Vector retrieval exception:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Build context string from retrieved docs
// ─────────────────────────────────────────────────────────────────────────────
export function buildContext(docs: RetrievedDoc[]): string {
  if (docs.length === 0) return '';

  return docs
    .slice(0, MAX_CONTEXT_DOCS)
    .map((doc, i) => {
      const truncated = doc.content.trim().slice(0, MAX_CONTENT_PER_DOC);
      const ellipsis  = doc.content.trim().length > MAX_CONTENT_PER_DOC
        ? ' ...[truncated]'
        : '';

      return (
        `[Source ${i + 1}: ${doc.title} — ${doc.subject} | ` +
        `Relevance: ${(doc.similarity * 100).toFixed(0)}%]\n` +
        `${truncated}${ellipsis}`
      );
    })
    .join('\n\n---\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Build system prompt
//
// ✅ Fixed: use explicit string concatenation instead of .filter(Boolean)
//    so that intentional blank lines are preserved in the prompt.
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(context: string, subject?: string): string {
  const subjectLine = subject
    ? `CURRENT SUBJECT: ${subject}\n`
    : '';

  const contextBlock = context
    ? (
        `RETRIEVED KNOWLEDGE BASE CONTEXT:\n` +
        `${context}\n\n` +
        `Use the above context to answer accurately and cite sources where helpful.`
      )
    : `⚠️ No documents retrieved from knowledge base. Answering from general training knowledge.`;

  // ✅ Template literal preserves blank lines — no .filter() needed
  return `You are Tutor Chuks, an expert AI tutor for West African exam prep (WAEC, JAMB, NECO).

PERSONALITY:
- Friendly, encouraging, and clear
- Use Nigerian examples and relatable analogies
- Break down complex topics step by step
- Connect answers to exam relevance

RESPONSE RULES:
- Base answers primarily on the provided context when available
- If context is absent, use training knowledge and say so explicitly
- Use numbered lists and **bold key terms**
- End every response with: 💡 Exam Tip: [one actionable tip]
- Stay under 400 words unless the student explicitly asks for more detail
- Never fabricate facts — say "I'm not sure" when uncertain

${subjectLine}${contextBlock}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Build Gemini content array
//
// Gemini strict requirements:
//   • First turn must be role:'user'
//   • Roles must strictly alternate user → model → user → model
//   • No two consecutive messages from the same role
// ─────────────────────────────────────────────────────────────────────────────
type GeminiRole    = 'user' | 'model';
type GeminiContent = { role: GeminiRole; parts: { text: string }[] };

function buildGeminiHistory(
  history:         ChatMessage[],
  currentQuestion: string       // ✅ Accept question here to avoid caller mutation
): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const msg of history.slice(-MAX_HISTORY_TURNS)) {
    const role: GeminiRole = msg.sender === 'student' ? 'user' : 'model';
    const last = contents[contents.length - 1];

    if (last && last.role === role) {
      // Merge consecutive same-role messages into one part
      // instead of silently dropping them (preserves context)
      last.parts.push({ text: msg.text });
      continue;
    }

    contents.push({ role, parts: [{ text: msg.text }] });
  }

  // First turn must be 'user' — remove leading model turns
  while (contents.length > 0 && contents[0].role === 'model') {
    contents.shift();
  }

  // ✅ Append current question as final user turn (done here, not in caller)
  contents.push({
    role:  'user',
    parts: [{ text: currentQuestion }],
  });

  return contents;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Generate AI response (Gemini primary → Fallbacks)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRAGResponse(
  question: string,
  context:  string,
  history:  ChatMessage[],
  subject?: string
): Promise<{ response: string; provider: AIProvider }> {
  const systemPrompt = buildSystemPrompt(context, subject);
  let lastError: Error | null = null;

  console.log(`[AI Tutor] Generating response for: "${question.substring(0, 50)}..."`);

  // ── Gemini primary ──────────────────────────────────────────────────────
  const gemini = getGemini();
  if (gemini) {
    try {
      console.log(`🤖 Attempting response via Gemini (${GEMINI_CHAT_MODEL})...`);
      const contents = buildGeminiHistory(history, question);

      const res = await gemini.models.generateContent({
        model:    GEMINI_CHAT_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature:       LLM_TEMPERATURE,
        },
      });

      const text = res.text?.trim();
      
      // ── BUG FIX: Validate output ──────────────────────
      if (!text) throw new Error('Gemini returned empty content.');

      console.log(`✅ Response via Gemini ${GEMINI_CHAT_MODEL}`);
      return { response: text, provider: 'gemini' };

    } catch (err: any) {
      console.warn('⚠️ Gemini failed, falling back to Groq:', err.message);
      lastError = err;
    }
  }

  // ── Groq fallback ────────────────────────────────────────────────────────
  const groqClient = getGroq();
  if (groqClient) {
    try {
      console.log(`🤖 Attempting fallback response via Groq...`);
      const historyMessages = history.slice(-MAX_HISTORY_TURNS).map(msg => ({
        role:    msg.sender === 'student' ? 'user' as const : 'assistant' as const,
        content: msg.text,
      }));

      // ── BUG FIX: Check API key exists ──────────────────────
      if (!process.env.GROQ_API_KEY && !process.env.VITE_GROQ_API_KEY && !process.env.GROK_API_KEY && !process.env.VITE_GROK_API_KEY) {
        throw new Error('GROQ_API_KEY not configured.');
      }

      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: LLM_TEMPERATURE,
        max_completion_tokens: LLM_MAX_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user',   content: question },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim();
      
      // ── BUG FIX: Validate output ──────────────────────
      if (!text) throw new Error('Groq returned empty content.');

      console.log(`✅ Response via Groq llama-3.3-70b-versatile (fallback)`);
      return { response: text, provider: 'groq' };

    } catch (err: any) {
      console.warn('⚠️ Groq fallback failed, falling back to Hugging Face:', err.message);
      lastError = err;
    }
  }

  // ── Hugging Face fallback ───────────────────────────────────────────────
  const hfClient = getHF();
  if (hfClient) {
    try {
      console.log(`🤖 Attempting fallback response via Hugging Face...`);
      const historyStr = history
        .slice(-MAX_HISTORY_TURNS)
        .map(msg => {
          const role = msg.sender === 'student' ? 'user' : 'assistant';
          return `<|${role}|>\n${msg.text}`;
        })
        .join('\n');

      const inputs = `<|system|>\n${systemPrompt}\n${historyStr}\n<|user|>\n${question}\n<|assistant|>`;

      const response = await hfClient.textGeneration({
        model:      'meta-llama/Llama-3.2-3B-Instruct',
        inputs,
        parameters: { max_new_tokens: LLM_MAX_TOKENS },
      });

      const text = extractHFAnswer(response.generated_text ?? '').trim();
      if (!text) throw new Error('Hugging Face returned empty content.');

      console.log(`✅ Response via Hugging Face Llama-3.2-3B-Instruct (fallback)`);
      return { response: text, provider: 'huggingface' };

    } catch (err: any) {
      console.warn('⚠️ Hugging Face fallback failed, falling back to OpenAI:', err.message);
      lastError = err;
    }
  }

  // ── OpenAI fallback ─────────────────────────────────────────────────────
  if (optionalEnv('OPENAI_API_KEY')) {
    try {
      console.log(`🤖 Attempting fallback response via OpenAI (${OPENAI_CHAT_MODEL})...`);
      const openai = getOpenAI();

      const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
        history.slice(-MAX_HISTORY_TURNS).map(msg => ({
          role:    msg.sender === 'student' ? 'user' : 'assistant',
          content: msg.text,
        }));

      const completion = await openai.chat.completions.create({
        model:       OPENAI_CHAT_MODEL,
        temperature: LLM_TEMPERATURE,
        max_tokens:  LLM_MAX_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user',   content: question },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error('OpenAI returned empty content.');

      console.log(`✅ Response via OpenAI ${OPENAI_CHAT_MODEL} (fallback)`);
      return { response: text, provider: 'openai' };

    } catch (err: any) {
      console.error('❌ OpenAI fallback failed:', err.message);
      lastError = err;
    }
  }

  // ── No providers succeeded ──────────────────────────────────────────────
  if (lastError) {
    throw new Error(`All AI providers failed. Last error: ${lastError.message}`);
  }
  throw new Error(
    'No AI provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, HF_API_KEY, or OPENAI_API_KEY.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — Persist chat message
//
// ✅ Uses tryGetSupabase() so missing Supabase config never crashes
//    this non-critical path.
// ─────────────────────────────────────────────────────────────────────────────
export async function saveChatMessage(
  sessionId: string,
  role:      'user' | 'assistant',
  content:   string,
  metadata:  Record<string, unknown> = {}
): Promise<void> {
  const supabase = tryGetSupabase(); // ✅ Safe — returns null if not configured
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('⚠️ saveChatMessage failed (non-fatal):', error.message);
    }
  } catch (err: any) {
    console.warn('⚠️ saveChatMessage exception (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 8 — Ensure session row exists
//
// ✅ Uses tryGetSupabase() — non-critical path, never throws.
// ─────────────────────────────────────────────────────────────────────────────
export async function ensureSession(
  sessionId: string,
  userId?:   string
): Promise<void> {
  const supabase = tryGetSupabase(); // ✅ Safe
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('chat_sessions')
      .upsert(
        {
          session_id: sessionId,
          user_id:    userId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );

    if (error) {
      console.warn('⚠️ ensureSession failed (non-fatal):', error.message);
    }
  } catch (err: any) {
    console.warn('⚠️ ensureSession exception (non-fatal):', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Source label helper
// ─────────────────────────────────────────────────────────────────────────────
function buildSourceLabel(docs: RetrievedDoc[]): string | null {
  if (docs.length === 0) return null;
  if (docs.length === 1) return docs[0].title;
  return `${docs[0].title} +${docs.length - 1} more`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main RAG Pipeline
// ─────────────────────────────────────────────────────────────────────────────
export async function runRAGPipeline(
  question:  string,
  history:   ChatMessage[],
  sessionId: string,
  subject?:  string,
  userId?:   string
): Promise<RAGResult> {
  const start = Date.now();

  // ✅ Sanitize all inputs before they touch the LLM
  const cleanQuestion = sanitizeInput(question);
  const cleanSubject  = subject ? sanitizeInput(subject, 50) : undefined;

  console.log(`\n🔍 RAG Pipeline`);
  console.log(`   Question : ${cleanQuestion.slice(0, 80)}${cleanQuestion.length > 80 ? '…' : ''}`);
  console.log(`   Subject  : ${cleanSubject ?? 'none'}`);
  console.log(`   Session  : ${maskSessionId(sessionId)}`);

  if (!cleanQuestion) {
    throw new Error('Question is empty after sanitization.');
  }

  // ── 1. Session + user message ─────────────────────────────────────────────
  // Awaited (not fire-and-forget) so failures appear in logs before
  // the expensive LLM call, making debugging much easier.
  await Promise.allSettled([
    ensureSession(sessionId, userId),
    saveChatMessage(sessionId, 'user', cleanQuestion, { subject: cleanSubject }),
  ]);

  // ── 2. Embed ──────────────────────────────────────────────────────────────
  const { embedding } = await embedQuery(cleanQuestion);

  // ── 3. Retrieve ───────────────────────────────────────────────────────────
  const docs    = await retrieveDocuments(embedding, cleanSubject);
  const context = buildContext(docs);

  // ── 4. Generate ───────────────────────────────────────────────────────────
  const { response, provider } = await generateRAGResponse(
    cleanQuestion,
    context,
    history,
    cleanSubject
  );

  // ── 5. Save AI response ───────────────────────────────────────────────────
  // Awaited for same reason as step 1 — easier debugging
  const sourceLabel = buildSourceLabel(docs);

  console.log('[RAG Pipeline] Final result:', {
    response: response.substring(0, 50) + '...',
    source: sourceLabel,
    session_id: sessionId,
    docs_used: docs.length,
    provider
  });

  await saveChatMessage(sessionId, 'assistant', response, {
    source:    docs[0]?.source ?? null,
    docs_used: docs.length,
    provider,
  });

  const elapsed = Date.now() - start;
  console.log(
    `✅ RAG complete — ${docs.length} doc(s), ` +
    `provider: ${provider}, ${elapsed}ms\n`
  );

  return {
    response,
    source:     sourceLabel,
    session_id: sessionId,
    docs_used:  docs.length,
    provider,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming variant — for future use with SSE / WebSocket
// ─────────────────────────────────────────────────────────────────────────────
export async function* streamRAGResponse(
  question:  string,
  history:   ChatMessage[],
  sessionId: string,
  subject?:  string,
  userId?:   string
): AsyncGenerator<{ chunk: string; done: false } | { chunk: ''; done: true; result: RAGResult }> {
  const cleanQuestion = sanitizeInput(question);
  const cleanSubject  = subject ? sanitizeInput(subject, 50) : undefined;

  if (!cleanQuestion) throw new Error('Question is empty after sanitization.');
  if (!optionalEnv('OPENAI_API_KEY')) {
    // Gemini streaming not implemented — fall back to non-streaming
    const result = await runRAGPipeline(question, history, sessionId, subject, userId);
    yield { chunk: result.response, done: false };
    yield { chunk: '', done: true, result };
    return;
  }

  await Promise.allSettled([
    ensureSession(sessionId, userId),
    saveChatMessage(sessionId, 'user', cleanQuestion, { subject: cleanSubject }),
  ]);

  const { embedding } = await embedQuery(cleanQuestion);
  const docs          = await retrieveDocuments(embedding, cleanSubject);
  const context       = buildContext(docs);
  const systemPrompt  = buildSystemPrompt(context, cleanSubject);

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
    history.slice(-MAX_HISTORY_TURNS).map(msg => ({
      role:    msg.sender === 'student' ? 'user' : 'assistant',
      content: msg.text,
    }));

  const openai = getOpenAI();
  const stream = await openai.chat.completions.create({
    model:       OPENAI_CHAT_MODEL,
    temperature: LLM_TEMPERATURE,
    max_tokens:  LLM_MAX_TOKENS,
    stream:      true,           // ✅ Enable streaming
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user',   content: cleanQuestion },
    ],
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      fullResponse += text;
      yield { chunk: text, done: false };
    }
  }

  await saveChatMessage(sessionId, 'assistant', fullResponse, {
    source:    docs[0]?.source ?? null,
    docs_used: docs.length,
    provider:  'openai',
  });

  yield {
    chunk: '',
    done:  true,
    result: {
      response:   fullResponse,
      source:     buildSourceLabel(docs),
      session_id: sessionId,
      docs_used:  docs.length,
      provider:   'openai',
    },
  };
}
