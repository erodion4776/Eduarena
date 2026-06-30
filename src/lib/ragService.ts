import { supabase } from './supabase';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';
import { HfInference } from '@huggingface/inference';

// ─────────────────────────────────────────────
// PDF.js Worker
// ─────────────────────────────────────────────

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const GEMINI_API_KEY =
  (import.meta as any).env.VITE_GEMINI_API_KEY ||
  (import.meta as any).env.GEMINI_API_KEY;

const HF_API_KEY = (import.meta as any).env.VITE_HF_API_KEY;

const RATE_LIMIT_DELAY_MS = 200;
const BATCH_SIZE          = 10;
const CHUNK_MAX_WORDS     = 250;
const CHUNK_OVERLAP_WORDS = 30;

// ─────────────────────────────────────────────
// Singletons
// ─────────────────────────────────────────────

let _genAI: GoogleGenAI | null = null;
let _hf: HfInference   | null = null;

function getGenAIClient(): GoogleGenAI {
  if (!_genAI) _genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return _genAI;
}

function getHFClient(): HfInference {
  if (!_hf) _hf = new HfInference(HF_API_KEY);
  return _hf;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripHtml(html: string): string {
  return (html ?? "").replace(/<[^>]*>/g, "").trim();
}

/**
 * Sentence-aware chunking with overlap for semantic coherence.
 */
function chunkText(
  text: string,
  maxWords:     number = CHUNK_MAX_WORDS,
  overlapWords: number = CHUNK_OVERLAP_WORDS
): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  let currentWords: string[] = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/);

    if (wordCount + sentenceWords.length > maxWords && currentWords.length > 0) {
      chunks.push(currentWords.join(" "));

      // Overlap: retain last N words for context continuity
      const overlapStart = Math.max(0, currentWords.length - overlapWords);
      currentWords = currentWords.slice(overlapStart);
      wordCount    = currentWords.length;
    }

    currentWords.push(...sentenceWords);
    wordCount += sentenceWords.length;
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }

  return chunks.filter(c => c.trim().length > 10);
}

/**
 * FIX 1: Use .contains() instead of ->> operator.
 * .contains() works correctly on both json and jsonb column types.
 * ->> silently returns no rows when metadata is stored as plain json.
 */
async function isDuplicateChunk(
  source:     string,
  chunkIndex: number
): Promise<boolean> {
  if (!supabase) return false;

  const { data } = await supabase
    .from('knowledge_vault')
    .select('id')
    .contains('metadata', { source, chunk_index: chunkIndex }) // ✅ works on json + jsonb
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ─────────────────────────────────────────────
// Shared Batch Insert Helper
// ─────────────────────────────────────────────

/**
 * FIX 2: Reports progress BEFORE and AFTER each batch save.
 * Prevents silent gaps that look like hangs during large ingestions.
 */
async function batchInsert(
  rows:       any[],
  onProgress: (msg: string) => void
): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialised.');

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE);
    const batchEnd = Math.min(i + BATCH_SIZE, rows.length);

    // Report BEFORE save so UI never appears frozen
    onProgress(`SAVING BATCH [${i + 1}–${batchEnd} of ${rows.length}]...`);

    const { error } = await supabase
      .from('knowledge_vault')
      .insert(batch);

    if (error) throw error;

    onProgress(`BATCH SAVED  [${batchEnd}/${rows.length}] ✓`);
  }
}

// ─────────────────────────────────────────────
// RAG Service
// ─────────────────────────────────────────────

export const ragService = {

  /**
   * Generate an embedding vector for a text string.
   * Tries Gemini first, falls back to HuggingFace.
   */
  async getEmbedding(text: string): Promise<number[]> {

    // 1. Gemini
    if (GEMINI_API_KEY) {
      try {
        const genAI    = getGenAIClient();
        const response = await genAI.models.embedContent({
          model:    "text-embedding-004",
          contents: text,
        });

        const embedding =
          response?.embeddings?.[0]?.values ??
          (response as any)?.embedding?.values;

        if (!embedding?.length) {
          throw new Error("Gemini returned an empty embedding.");
        }

        return embedding;
      } catch (e) {
        console.warn("[RAGService] Gemini embedding failed, trying HF...", e);
      }
    }

    // 2. HuggingFace fallback
    if (HF_API_KEY) {
      try {
        const hf     = getHFClient();
        const output = await hf.featureExtraction({
          model:  'sentence-transformers/all-MiniLM-L6-v2',
          inputs: text,
        });

        // sentence-transformers returns number[][] — extract first vector
        const vector = Array.isArray(output[0])
          ? (output as number[][])[0]
          : (output as number[]);

        if (!vector?.length) {
          throw new Error("HuggingFace returned an empty vector.");
        }

        return vector;
      } catch (e) {
        console.error("[RAGService] HuggingFace embedding failed:", e);
      }
    }

    throw new Error(
      "No embedding provider available. Set VITE_GEMINI_API_KEY or VITE_HF_API_KEY."
    );
  },

  /**
   * Ingest a PDF file into the Supabase knowledge vault.
   */
  async processPDF(
    file:       File,
    subject:    string,
    topic:      string,
    onProgress: (msg: string) => void
  ): Promise<void> {
    if (!supabase) throw new Error("Supabase client is not initialised.");

    onProgress('READING_PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page        = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + ' ';
    }

    const chunks = chunkText(fullText);
    onProgress(`EXTRACTED ${chunks.length} CHUNKS — BEGINNING INGESTION`);

    // Build rows with embeddings (rate-limited)
    const rows: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      // Skip duplicates
      const isDupe = await isDuplicateChunk(file.name, i);
      if (isDupe) {
        onProgress(`SKIP [${i + 1}/${chunks.length}] — already in vault`);
        continue;
      }

      onProgress(`EMBEDDING [${i + 1}/${chunks.length}]`);
      const embedding = await this.getEmbedding(chunks[i]);

      rows.push({
        content:   chunks[i],
        embedding,
        metadata:  {
          source:      file.name,
          subject,
          topic,
          type:        'pdf_chunk',
          chunk_index: i,
        },
      });

      if (i < chunks.length - 1) await delay(RATE_LIMIT_DELAY_MS);
    }

    // Shared batch insert with before+after progress (fix 2)
    await batchInsert(rows, onProgress);

    onProgress('INGESTION COMPLETE ✓');
  },

  /**
   * Ingest a JSON array of question objects into the knowledge vault.
   */
  async processJSON(
    data:       any[],
    onProgress: (msg: string) => void
  ): Promise<void> {
    if (!supabase) throw new Error("Supabase client is not initialised.");

    onProgress(`PREPARING ${data.length} OBJECTS FOR INGESTION`);

    const rows: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const q = data[i];

      // Clean and validate text before embedding
      const parts = [
        q.question_content ?? q.question_text ?? q.question ?? "",
        q.explanation      ?? q.solution      ?? "",
        q.correct_answer   ?? q.correct_option ?? "",
      ].map(p => stripHtml(String(p)).trim());

      const textToEmbed = parts.filter(Boolean).join(" ").trim();

      if (!textToEmbed) {
        onProgress(`SKIP [${i + 1}/${data.length}] — empty content`);
        continue;
      }

      onProgress(`EMBEDDING [${i + 1}/${data.length}]`);
      const embedding = await this.getEmbedding(textToEmbed);

      rows.push({
        content:   textToEmbed,
        embedding,
        metadata:  { ...q, type: 'json_data' },
      });

      if (i < data.length - 1) await delay(RATE_LIMIT_DELAY_MS);
    }

    // Shared batch insert with before+after progress (fix 2)
    await batchInsert(rows, onProgress);

    onProgress('DATA VAULT SYNCHRONISED ✓');
  },

  /**
   * Retrieve relevant context for a query from the knowledge vault.
   *
   * FIX 3: Explicit supabase null guard replaces the unsafe ! assertion.
   * Prefer memoryManager.getRelevantContext() for the full RAG pipeline.
   */
  async retrieveContext(query: string): Promise<string | null> {
    // ✅ Explicit guard — no non-null assertion needed
    if (!supabase) {
      console.warn('[RAGService] retrieveContext: Supabase client not available.');
      return null;
    }

    try {
      const embedding    = await this.getEmbedding(query);
      const { data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count:     5,
      });

      if (error) {
        console.warn("[RAGService] retrieveContext RPC error:", error.message);
        return null;
      }

      if (!data?.length) return null;

      return data.map((d: any) => d.content).join('\n\n');
    } catch (err) {
      console.warn("[RAGService] retrieveContext failed:", err);
      return null;
    }
  },
};

