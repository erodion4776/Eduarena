import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';
import { ragDatabase } from './ragDatabase';
import { STATIC_QUESTIONS } from '../data/staticData';
import { syllabusData } from '../data/syllabus';

// ─────────────────────────────────────────────
// Constants & Configuration
// ─────────────────────────────────────────────

const GEMINI_API_KEY =
  (import.meta as any).env.VITE_GEMINI_API_KEY ||
  (import.meta as any).env.GEMINI_API_KEY;

/** How many top matches to return */
const MAX_CONTEXT_MATCHES = 3;

/** Words to exclude from keyword matching */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'you', 'what', 'how', 'are',
  'can', 'with', 'this', 'who', 'its', 'from', 'then',
  'them', 'that', 'have', 'was', 'but', 'not', 'they',
]);

// Source weights — centralised so tuning is explicit
const WEIGHTS = {
  ragDatabase:      3,
  syllabusData:     2,
  staticQuestions:  1.5,
} as const;

// Per-source thresholds to ensure single-word queries match correctly
const THRESHOLDS = {
  ragDatabase:     3,   // weight=3, needs 1+ token match
  syllabusData:    2,   // weight=2, needs 1+ token match
  staticQuestions: 1.5, // weight=1.5, needs 1+ token match
} as const;

// ─────────────────────────────────────────────
// Singleton: Gemini Client
// ─────────────────────────────────────────────

let _genAI: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!_genAI) {
    _genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return _genAI;
}

// ─────────────────────────────────────────────
// Singleton: Query Cache (FIFO Eviction Pattern)
// ─────────────────────────────────────────────

interface CacheEntry {
  context: string;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): string | null {
  const entry = queryCache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    queryCache.delete(key);
    return null;
  }

  return entry.context;
}

/**
 * @note Cache eviction operates on a FIFO (First-In, First-Out) model
 * to safely cap the query cache size to 100 entries.
 */
function setCache(key: string, context: string): void {
  if (queryCache.size >= 100) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }
  queryCache.set(key, { context, timestamp: Date.now() });
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ScoredMatch {
  content: string;
  source: string;
  score: number;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/**
 * Sanitise and tokenise a query into unique meaningful keywords.
 * Returns an empty array if the query is blank or too short.
 */
function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  return [...new Set(tokens)]; // Deduplicate tokens to prevent redundant scoring bias
}

/**
 * Strip HTML tags from a string safely.
 * Uses DOMParser in browser environments; falls back to regex.
 */
function stripHtml(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent ?? '';
    } catch {
      // fall through to regex
    }
  }
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Count how many query tokens appear as whole words in a body of text.
 * Uses word boundaries (\b) to avoid false positives (e.g. matching "cell" in "excellence").
 */
function scoreText(text: string, tokens: string[], weight: number): number {
  const lower = text.toLowerCase();
  return tokens.reduce((acc, token) => {
    try {
      // Escape special characters in the token to prevent regex errors
      const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedToken}\\b`, 'i');
      return regex.test(lower) ? acc + weight : acc;
    } catch {
      // Fallback to simpler check if regex fails
      return lower.includes(token) ? acc + weight : acc;
    }
  }, 0);
}

// ─────────────────────────────────────────────
// Local RAG Sources
// ─────────────────────────────────────────────

function searchRagDatabase(tokens: string[]): ScoredMatch[] {
  return ragDatabase.reduce<ScoredMatch[]>((acc, item) => {
    const text = `${item.subject} ${item.topic} ${item.content}`;
    const score = scoreText(text, tokens, WEIGHTS.ragDatabase);
    if (score >= THRESHOLDS.ragDatabase) {
      acc.push({
        content: item.content,
        source: item.source ?? `Study Guide: ${item.subject} (${item.topic})`,
        score,
      });
    }
    return acc;
  }, []);
}

function searchSyllabus(tokens: string[]): ScoredMatch[] {
  if (!syllabusData) return [];

  const matches: ScoredMatch[] = [];

  for (const [subjectName, topics] of Object.entries(syllabusData)) {
    for (const topicItem of topics) {
      const objectives: string[] = topicItem.objectives ?? [];
      const text = `${subjectName} ${topicItem.topic} ${objectives.join(' ')}`;
      const score = scoreText(text, tokens, WEIGHTS.syllabusData);

      if (score >= THRESHOLDS.syllabusData) {
        const objectivesStr = objectives
          .slice(0, 3)
          .map(o => `- ${o}`)
          .join('\n');

        matches.push({
          content: `Syllabus Topic: ${topicItem.topic}\nLearning Objectives:\n${objectivesStr}`,
          source: `${topicItem.examType ?? 'WAEC'} Official Syllabus - ${subjectName}`,
          score,
        });
      }
    }
  }

  return matches;
}

function searchStaticQuestions(tokens: string[]): ScoredMatch[] {
  if (!STATIC_QUESTIONS) return [];

  return STATIC_QUESTIONS.reduce<ScoredMatch[]>((acc, q) => {
    const rawText = `${q.subject ?? ''} ${q.question ?? ''} ${q.solution ?? ''}`;
    const score = scoreText(rawText, tokens, WEIGHTS.staticQuestions);

    if (score >= THRESHOLDS.staticQuestions) {
      const cleanQuestion = stripHtml(q.question ?? '');
      const explanation = stripHtml(q.solution ?? '');
      const correctAnswer = String(q.answer ?? 'A').toUpperCase();

      const optionsStr = Object.entries(q.option ?? {})
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`)
        .join('\n');

      let content = `Past Question:\nQ: ${cleanQuestion}\n${optionsStr}\nAnswer: ${correctAnswer}`;
      if (explanation) content += `\nExplanation: ${explanation}`;

      acc.push({
        content,
        source: `${String(q.examtype ?? 'UTME').toUpperCase()} ${q.examyear ?? '2024'} — Q${q.questionNub ?? q.id}`,
        score,
      });
    }

    return acc;
  }, []);
}

// ─────────────────────────────────────────────
// Local Context Entry Point
// ─────────────────────────────────────────────

/**
 * Search all local knowledge sources and return the most relevant
 * context snippets as a formatted string.
 */
function getLocalContextMatches(userQuery: string): string {
  const tokens = tokenizeQuery(userQuery);
  if (tokens.length === 0) return '';

  const allMatches: ScoredMatch[] = [
    ...searchRagDatabase(tokens),
    ...searchSyllabus(tokens),
    ...searchStaticQuestions(tokens),
  ];

  const topMatches = allMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXT_MATCHES);

  if (topMatches.length === 0) return '';

  return topMatches
    .map(m => `[Source: ${m.source}]\n${m.content}`)
    .join('\n\n---\n\n');
}

// ─────────────────────────────────────────────
// Cloud Vector Search
// ─────────────────────────────────────────────

async function getCloudContext(userQuery: string): Promise<string | null> {
  const genAI = getGenAIClient();

  const response = await genAI.models.embedContent({
    model: 'text-embedding-004',
    contents: userQuery, // Plain string (correct @google/genai SDK format)
  });

  // Safe fallback to handle both singular and array response shapes
  const embedding =
    response?.embeddings?.[0]?.values ??
    (response as any)?.embedding?.values;

  if (!embedding?.length) {
    console.warn('[MemoryManager] Empty or missing embedding returned.');
    return null;
  }

  const { data: matches, error } = await supabase.rpc('match_knowledge', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: MAX_CONTEXT_MATCHES,
  });

  if (error) {
    console.warn('[MemoryManager] Supabase RPC search error:', error.message);
    return null;
  }

  if (!matches?.length) return null;

  return matches
    .map((m: any) => `[Source: ${m.metadata?.source ?? 'Knowledge Vault'}]\n${m.content}`)
    .join('\n\n---\n\n');
}

// ─────────────────────────────────────────────
// Helper Utilities
// ─────────────────────────────────────────────

/**
 * Executes a promise with an automatic timeout guard.
 * Safely clears background timers on resolution to avoid leak paths.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timerId = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timerId!)),
    timeout,
  ]);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Retrieve relevant educational context for a user query.
 *
 * Strategy:
 *  1. Return cached result if available (case-insensitive keys)
 *  2. Attempt cloud vector search (preserves casing for maximum semantic parsing resolution)
 *  3. Fall back to local keyword search across all knowledge sources
 */
export async function getRelevantContext(userQuery: string): Promise<string> {
  const trimmedQuery = userQuery.trim();
  if (!trimmedQuery) return '';

  // Normalise ONLY for cache indexing
  const cacheKey = trimmedQuery.toLowerCase();

  // 1. Cache check
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  let context = '';

  // 2. Cloud path — verified via precise environment check
  const hasCloudInfra =
    Boolean((import.meta as any).env.VITE_SUPABASE_URL) &&
    Boolean(GEMINI_API_KEY) &&
    GEMINI_API_KEY !== 'undefined';

  if (hasCloudInfra) {
    try {
      // 3-second timeout guard on cloud path to keep performance high
      context = await withTimeout(
        getCloudContext(trimmedQuery).then(r => r ?? ''),
        3000,
        ''
      );
    } catch (err) {
      console.warn('[MemoryManager] Cloud search failed. Using local fallback.', err);
    }
  }

  // 3. Local fallback if cloud returned nothing or timed out
  if (!context) {
    context = getLocalContextMatches(trimmedQuery);
  }

  // 4. Cache and return
  setCache(cacheKey, context);
  return context;
}
