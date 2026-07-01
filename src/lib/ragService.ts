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

const HF_API_KEY          = (import.meta as any).env.VITE_HF_API_KEY;
const RATE_LIMIT_DELAY_MS = 200;
const BATCH_SIZE          = 10;
const CHUNK_MAX_WORDS     = 250;
const CHUNK_OVERLAP_WORDS = 30;

// ─────────────────────────────────────────────
// Hardcoded FK Registry
//
// Source of truth: your actual Supabase rows.
// No runtime DB lookups needed — resolution is
// a pure in-memory dictionary lookup, O(1).
//
// To add a new subject/topic:
//   1. INSERT into Supabase
//   2. Add the UUID + aliases here
// ─────────────────────────────────────────────

const SUBJECT_ID = {
  english: 'ef4e9b92-c05a-4cfd-b358-ed7ea261dee4',
} as const;

const TOPIC_ID = {
  'others':    'c3e7f777-ff8c-42f5-a2a2-ac75110e4b63',
  'passage-a': 'f631ff14-9a32-4bea-b80a-b2e0ed07d480',
  'passage-b': 'db3f8a42-90e0-4061-b063-831bcdec0604',
  'passage-c': '2768f2f0-5259-4929-ae3a-00d8a038efa9',
  'register':  '9a62e59c-cfd3-4cd5-b1ae-017021383c40',
} as const;

type SubjectSlug = keyof typeof SUBJECT_ID;
type TopicSlug   = keyof typeof TOPIC_ID;

// ─────────────────────────────────────────────
// Subject Alias Map
//
// Every variation a JSON file might use for a
// subject name → canonical SubjectSlug key.
// ─────────────────────────────────────────────

const SUBJECT_ALIAS: Record<string, SubjectSlug> = {
  // English
  'english':           'english',
  'eng':               'english',
  'english language':  'english',
  'use of english':    'english',
  'use-of-english':    'english',
  'uoe':               'english',
};

// ─────────────────────────────────────────────
// Topic Alias Map
//
// Every variation a JSON file might use for a
// topic name → canonical TopicSlug key.
// Unknown topics fall back to "others".
// ─────────────────────────────────────────────

const TOPIC_ALIAS: Record<string, TopicSlug> = {
  // passage-a
  'passage-a':             'passage-a',
  'passage a':             'passage-a',
  'passagea':              'passage-a',
  'passage 1':             'passage-a',
  'comprehension a':       'passage-a',
  'comprehension-a':       'passage-a',
  'reading passage a':     'passage-a',
  'reading-passage-a':     'passage-a',

  // passage-b
  'passage-b':             'passage-b',
  'passage b':             'passage-b',
  'passageb':              'passage-b',
  'passage 2':             'passage-b',
  'comprehension b':       'passage-b',
  'comprehension-b':       'passage-b',
  'reading passage b':     'passage-b',
  'reading-passage-b':     'passage-b',

  // passage-c
  'passage-c':             'passage-c',
  'passage c':             'passage-c',
  'passagec':              'passage-c',
  'passage 3':             'passage-c',
  'comprehension c':       'passage-c',
  'comprehension-c':       'passage-c',
  'reading passage c':     'passage-c',
  'reading-passage-c':     'passage-c',

  // register
  'register':              'register',
  'registers':             'register',
  'language register':     'register',
  'language-register':     'register',
  'registers of english':  'register',
  'word register':         'register',
  'variety of language':   'register',
  'varieties of language': 'register',

  // others — catch-all for everything unrecognised
  'others':                'others',
  'other':                 'others',
  'general':               'others',
  'general english':       'others',
  'miscellaneous':         'others',
  'lexis':                 'others',
  'lexis and structure':   'others',
  'lexis & structure':     'others',
  'structure':             'others',
  'oral english':          'others',
  'spoken english':        'others',
  'phonology':             'others',
  'literature':            'others',
  'summary':               'others',
  'essay':                 'others',
  'letter writing':        'others',
  'letter-writing':        'others',
  'narrative essay':       'others',
  'expository essay':      'others',
  'argumentative essay':   'others',
  'vocabulary':            'others',
  'idioms':                'others',
  'proverbs':              'others',
  'antonyms':              'others',
  'synonyms':              'others',
  'word usage':            'others',
  'word-usage':            'others',
  'figures of speech':     'others',
  'figures-of-speech':     'others',
  'tenses':                'others',
  'grammar':               'others',
  '':                      'others',  // missing topic → others
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface QuestionRow {
  subject_id:       string;
  topic_id:         string;
  question_content: string;
  options:          string[];
  correct_answer:   string;
  explanation:      string | null;
  difficulty_level: number | null;
  year:             number | null;
  subject:          string | null;
  topic:            string | null;
  exam_type:        string | null;
  aloc_id:          string | null;
}

type ProgressCallback = (msg: string) => void;

// ─────────────────────────────────────────────
// Singletons
// ─────────────────────────────────────────────

let _genAI: GoogleGenAI | null = null;
let _hf:    HfInference | null = null;

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
  return (html ?? '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Normalise any raw string for alias map lookup.
 * "Passage A"  → "passage a"   (lowercase, trimmed)
 * "REGISTER"   → "register"
 * "Lexis & Structure" → "lexis & structure"
 *
 * Deliberately keeps spaces so alias keys can use
 * natural spacing ("passage a") rather than slugs.
 */
function normalise(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Resolve a raw subject string to its UUID.
 * Returns null if no match found — row is skipped.
 */
function lookupSubjectId(
  raw:        string,
  onProgress: ProgressCallback,
  rowNum:     number
): string | null {
  const key   = normalise(raw);
  const slug  = SUBJECT_ALIAS[key];

  if (!slug) {
    onProgress(
      `⚠️  SKIP row ${rowNum}: unknown subject "${raw}". ` +
      `Known: ${Object.keys(SUBJECT_ID).join(', ')}`
    );
    return null;
  }

  return SUBJECT_ID[slug];
}

/**
 * Resolve a raw topic string to its UUID.
 * Unknown topics fall back to "others" — never null.
 */
function lookupTopicId(
  raw:        string,
  onProgress: ProgressCallback,
  rowNum:     number
): string {
  const key  = normalise(raw);
  const slug = TOPIC_ALIAS[key] ?? 'others';

  if (!TOPIC_ALIAS[key]) {
    onProgress(
      `⚠️  Row ${rowNum}: unknown topic "${raw}" → falling back to "others"`
    );
  }

  return TOPIC_ID[slug];
}

function chunkText(
  text:         string,
  maxWords:     number = CHUNK_MAX_WORDS,
  overlapWords: number = CHUNK_OVERLAP_WORDS
): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  const chunks:       string[] = [];
  let   currentWords: string[] = [];
  let   wordCount:    number   = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/);
    if (
      wordCount + sentenceWords.length > maxWords &&
      currentWords.length > 0
    ) {
      chunks.push(currentWords.join(' '));
      const overlapStart = Math.max(0, currentWords.length - overlapWords);
      currentWords       = currentWords.slice(overlapStart);
      wordCount          = currentWords.length;
    }
    currentWords.push(...sentenceWords);
    wordCount += sentenceWords.length;
  }

  if (currentWords.length > 0) chunks.push(currentWords.join(' '));
  return chunks.filter(c => c.trim().length > 10);
}

async function isDuplicateChunk(
  source:     string,
  chunkIndex: number
): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from('knowledge_vault')
    .select('id')
    .contains('metadata', { source, chunk_index: chunkIndex })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ─────────────────────────────────────────────
// Row Builder — pure, synchronous FK resolution
// ─────────────────────────────────────────────

function buildQuestionRow(
  raw:        any,
  index:      number,
  onProgress: ProgressCallback
): QuestionRow | null {
  const rowNum = index + 1;

  // ── Extract fields ─────────────────────────────────────────────
  const subjectRaw = stripHtml(
    raw.subject_name ?? raw.subject ?? raw.Subject ?? ''
  ).trim();

  const topicRaw = stripHtml(
    raw.topic_name ?? raw.topic ?? raw.Topic ?? ''
  ).trim();

  const question_content = stripHtml(
    raw.question_content ??
    raw.question_text    ??
    raw.question         ??
    raw.Question         ??
    ''
  ).trim();

  let options: string[] = [];
  if (Array.isArray(raw.options)) {
    options = raw.options.map((o: any) => stripHtml(String(o)).trim());
  } else if (raw.options && typeof raw.options === 'object') {
    options = Object.values(raw.options)
      .map((o: any) => stripHtml(String(o)).trim());
  }

  const correct_answer = stripHtml(
    raw.correct_answer ??
    raw.correct_option ??
    raw.answer         ??
    ''
  ).trim();

  const explanation      = stripHtml(raw.explanation ?? raw.solution ?? '').trim() || null;
  const difficulty_level = raw.difficulty_level != null ? Number(raw.difficulty_level) : null;
  const year             = raw.year             != null ? Number(raw.year)             : null;
  const exam_type        = raw.exam_type        ?? raw.examType ?? null;
  const aloc_id          = raw.aloc_id          ?? null;

  // ── Validate text fields ───────────────────────────────────────
  if (!subjectRaw) {
    onProgress(`⚠️  SKIP row ${rowNum}: missing subject_name`);
    return null;
  }
  if (!question_content) {
    onProgress(`⚠️  SKIP row ${rowNum}: missing question_content`);
    return null;
  }
  if (options.length < 2) {
    onProgress(`⚠️  SKIP row ${rowNum}: needs ≥2 options (got ${options.length})`);
    return null;
  }
  if (!correct_answer) {
    onProgress(`⚠️  SKIP row ${rowNum}: missing correct_answer`);
    return null;
  }

  // ── Resolve UUIDs — pure dictionary lookup, no await ──────────
  const subject_id = lookupSubjectId(subjectRaw, onProgress, rowNum);
  if (!subject_id) return null;

  // topic_id always resolves (falls back to "others")
  const topic_id = lookupTopicId(topicRaw, onProgress, rowNum);

  return {
    subject_id,
    topic_id,
    question_content,
    options,
    correct_answer,
    explanation,
    difficulty_level,
    year,
    subject:  subjectRaw,
    topic:    topicRaw || null,
    exam_type,
    aloc_id,
  };
}

// ─────────────────────────────────────────────
// Batch Insert Helpers
// ─────────────────────────────────────────────

async function batchInsertVault(
  rows:       any[],
  onProgress: ProgressCallback
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialised.');

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE);
    const batchEnd = Math.min(i + BATCH_SIZE, rows.length);
    onProgress(`SAVING VAULT BATCH [${i + 1}–${batchEnd}/${rows.length}]...`);
    const { error } = await supabase.from('knowledge_vault').insert(batch);
    if (error) throw error;
    onProgress(`VAULT BATCH SAVED [${batchEnd}/${rows.length}] ✓`);
  }
}

async function batchInsertQuestions(
  rows:       QuestionRow[],
  onProgress: ProgressCallback
): Promise<{ inserted: number; failed: number }> {
  if (!supabase) throw new Error('Supabase client not initialised.');

  let inserted = 0;
  let failed   = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch    = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total    = Math.ceil(rows.length / BATCH_SIZE);
    const batchEnd = Math.min(i + BATCH_SIZE, rows.length);

    onProgress(
      `⚙️  INSERTING BATCH ${batchNum}/${total} ` +
      `[rows ${i + 1}–${batchEnd} of ${rows.length}]...`
    );

    const { data, error } = await supabase
      .from('questions')
      .insert(batch)
      .select('id');

    if (error) {
      onProgress(
        `❌ BATCH ${batchNum} FAILED: ${error.message} [${error.code}]`
      );
      console.error('[batchInsertQuestions]', error);
      failed += batch.length;
      continue;
    }

    inserted += data?.length ?? batch.length;
    onProgress(
      `✅ COMMITTED: ${inserted}/${rows.length} [batch ${batchNum}/${total}]`
    );
  }

  return { inserted, failed };
}

// ─────────────────────────────────────────────
// RAG Service — public API
// ─────────────────────────────────────────────

export const ragService = {

  // ─── Embedding ────────────────────────────────────────────────

  async getEmbedding(text: string): Promise<number[]> {
    if (GEMINI_API_KEY) {
      try {
        const res = await getGenAIClient().models.embedContent({
          model:    'text-embedding-004',
          contents: text,
        });
        const embedding =
          res?.embeddings?.[0]?.values ??
          (res as any)?.embedding?.values;
        if (embedding?.length) return embedding;
        throw new Error('empty embedding');
      } catch (e) {
        console.warn('[RAGService] Gemini → trying HF...', e);
      }
    }

    if (HF_API_KEY) {
      try {
        const output = await getHFClient().featureExtraction({
          model:  'sentence-transformers/all-MiniLM-L6-v2',
          inputs: text,
        });
        const vector = Array.isArray(output[0])
          ? (output as number[][])[0]
          : (output as number[]);
        if (vector?.length) return vector;
        throw new Error('empty vector');
      } catch (e) {
        console.error('[RAGService] HF failed:', e);
      }
    }

    throw new Error(
      'No embedding provider. Set VITE_GEMINI_API_KEY or VITE_HF_API_KEY.'
    );
  },

  // ─── PDF → knowledge_vault ────────────────────────────────────

  async processPDF(
    file:       File,
    subject:    string,
    topic:      string,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialised.');

    onProgress('READING PDF...');
    const pdf = await pdfjsLib
      .getDocument({ data: await file.arrayBuffer() })
      .promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      fullText  +=
        (await page.getTextContent())
          .items.map((item: any) => item.str)
          .join(' ') + ' ';
    }

    const chunks = chunkText(fullText);
    onProgress(`EXTRACTED ${chunks.length} CHUNKS — BEGINNING INGESTION`);

    const rows: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (await isDuplicateChunk(file.name, i)) {
        onProgress(`SKIP [${i + 1}/${chunks.length}] — already in vault`);
        continue;
      }
      onProgress(`EMBEDDING [${i + 1}/${chunks.length}]`);
      const embedding = await this.getEmbedding(chunks[i]);
      rows.push({
        content:  chunks[i],
        embedding,
        metadata: {
          source:      file.name,
          subject,
          topic,
          type:        'pdf_chunk',
          chunk_index: i,
        },
      });
      if (i < chunks.length - 1) await delay(RATE_LIMIT_DELAY_MS);
    }

    await batchInsertVault(rows, onProgress);
    onProgress('INGESTION COMPLETE ✓');
  },

  // ─── JSON → questions table ───────────────────────────────────

  async processJSON(
    data:       any[],
    onProgress: ProgressCallback
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialised.');

    // Print the registry so the admin can confirm what's loaded
    onProgress('📋 SUBJECT REGISTRY:');
    Object.entries(SUBJECT_ID).forEach(([slug, uuid]) => {
      onProgress(`   "${slug}" → ${uuid}`);
    });

    onProgress('📋 TOPIC REGISTRY:');
    Object.entries(TOPIC_ID).forEach(([slug, uuid]) => {
      onProgress(`   "${slug}" → ${uuid}`);
    });

    onProgress(`\n📦 RECEIVED ${data.length} RECORDS — BUILDING ROWS...`);

    // ── Step 1: Build all rows (synchronous — no DB calls) ────────
    const validRows: QuestionRow[] = [];
    let   skipped = 0;

    for (let i = 0; i < data.length; i++) {
      if (i > 0 && i % 100 === 0) {
        onProgress(`🔍 Processed ${i}/${data.length} rows...`);
      }

      const row = buildQuestionRow(data[i], i, onProgress);
      if (row) {
        validRows.push(row);
      } else {
        skipped++;
      }
    }

    onProgress(
      `\n✅ ${validRows.length} VALID  |  ⚠️  ${skipped} SKIPPED`
    );

    if (validRows.length === 0) {
      onProgress('❌ No valid records to import. Aborting.');
      return;
    }

    // ── Step 2: Batch insert ───────────────────────────────────────
    const { inserted, failed } = await batchInsertQuestions(
      validRows,
      onProgress
    );

    // ── Step 3: Summary ────────────────────────────────────────────
    if (failed === 0) {
      onProgress(`\n🎉 IMPORT COMPLETE — ${inserted} questions saved.`);
    } else {
      onProgress(
        `\n⚠️  PARTIAL IMPORT — ${inserted} saved, ${failed} failed.`
      );
    }
  },

  // ─── Context Retrieval ────────────────────────────────────────

  async retrieveContext(query: string): Promise<string | null> {
    if (!supabase) return null;
    try {
      const embedding       = await this.getEmbedding(query);
      const { data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count:     5,
      });
      if (error) {
        console.warn('[RAGService] RPC error:', error.message);
        return null;
      }
      return data?.length
        ? data.map((d: any) => d.content).join('\n\n')
        : null;
    } catch (err) {
      console.warn('[RAGService] retrieveContext failed:', err);
      return null;
    }
  },
};
