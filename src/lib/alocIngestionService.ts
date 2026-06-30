import { supabase } from './supabase';

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return (html ?? '').replace(/<[^>]*>/g, '').trim();
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IngestResult {
  status: 'success' | 'skipped';
  id:     string | number;
}

export interface FetchResult {
  data:     any[];
  page:     number;
  pageSize: number;
  total:    number;
  hasMore:  boolean;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const alocIngestionService = {

  /**
   * Request an embedding vector from the secure server-side proxy.
   * Includes 15-second timeout and full error body extraction.
   */
  async generateEmbedding(textToEmbed: string): Promise<number[]> {
    const controller = new AbortController();
    const timerId    = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('/api/admin/embeddings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: textToEmbed }),
        signal:  controller.signal,
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body?.error ?? body?.message ?? '';
        } catch { /* non-JSON body — ignore */ }
        throw new Error(
          `Embedding API error ${response.status}${detail ? `: ${detail}` : ''}`
        );
      }

      const { embedding } = await response.json();

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Embedding API returned an empty or invalid vector.');
      }

      return embedding;

    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error('Embedding API request timed out after 15 seconds.');
      }
      throw e;
    } finally {
      clearTimeout(timerId);
    }
  },

  /**
   * Ingest a single ALOC question record into the Supabase questions table.
   * Skips duplicates detected by source_id.
   */
  async ingestQuestion(
    record:   any,
    subject:  string,
    examType: string
  ): Promise<IngestResult> {
    if (!supabase) {
      throw new Error('[AlocIngestion] Supabase client is not initialised.');
    }

    // Validate required field before any network calls
    const questionText = stripHtml(record?.question ?? '');
    if (!questionText) {
      throw new Error(
        `Record ${record?.id ?? 'unknown'} is missing question text — cannot ingest.`
      );
    }

    // 1. Duplicate check
    const { data: existing, error: checkErr } = await supabase
      .from('questions')
      .select('id, source_id')
      .eq('source_id', record.id)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) return { status: 'skipped', id: record.id };

    // 2. Build options — include E if present
    const rebuiltOptions: Record<string, string> = {
      a: record.option?.a ?? '',
      b: record.option?.b ?? '',
      c: record.option?.c ?? '',
      d: record.option?.d ?? '',
      ...(record.option?.e ? { e: record.option.e } : {}),
    };

    // 3. Build clean text for embedding (HTML stripped)
    const textToEmbed = [
      `Subject: ${record.subject   ?? subject}`,
      `Topic: ${record.section     ?? 'General'}`,
      `Question: ${questionText}`,
      `Explanation: ${stripHtml(record.solution ?? 'None provided.')}`,
    ].join('\n');

    // 4. Generate embedding vector
    const vectorData = await this.generateEmbedding(textToEmbed);

    // 5. Upsert — idempotent on source_id conflict
    const { error: insertErr } = await supabase
      .from('questions')
      .upsert(
        {
          source_id:      record.id,
          subject:        (record.subject  ?? subject).toLowerCase(),
          exam_type:      (record.examtype ?? examType).toLowerCase(),
          year:           parseInt(record.examyear, 10) || 0, // ✅ radix 10
          question_text:  record.question,
          options:        rebuiltOptions,
          correct_answer: record.answer ?? 'a',
          explanation:    record.solution ?? '',
          topic:          record.section  ?? 'General',
          embedding:      vectorData,
        },
        { onConflict: 'source_id' }
      );

    if (insertErr) throw insertErr;

    return { status: 'success', id: record.id };
  },

  /**
   * Fetch questions with pagination.
   * Never fetches the full table in one call.
   */
  async fetchAllQuestions(
    page:     number = 1,
    pageSize: number = 100
  ): Promise<FetchResult> {
    if (!supabase) {
      throw new Error('[AlocIngestion] Supabase client is not initialised.');
    }

    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('questions')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('id', { ascending: true });

    if (error) throw error;

    return {
      data:     data ?? [],
      page,
      pageSize,
      total:    count ?? 0,
      hasMore:  (count ?? 0) > page * pageSize,
    };
  },
};
