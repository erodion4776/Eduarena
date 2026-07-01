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

    // 1. Duplicate check in global_questions_vault
    const { data: existing, error: checkErr } = await supabase
      .from('global_questions_vault')
      .select('id')
      .eq('id', record.id)
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

    // 5. Upsert to global_questions_vault
    const { error: insertErr } = await supabase
      .from('global_questions_vault')
      .upsert(
        {
          id:             record.id,
          subject:        (record.subject  ?? subject).toLowerCase(),
          exam_type:      (record.examtype ?? examType).toLowerCase(),
          question_data:  { ...record, subject: record.subject ?? subject, examType: record.examtype ?? examType, embedding: vectorData },
        },
        { onConflict: 'id' }
      );

    if (insertErr) throw insertErr;

    // 6. Graceful Sync to standard questions table
    try {
      let subject_id = null;
      let topic_id = null;

      const { data: existingSubjects } = await supabase.from('subjects').select('id, name');
      const sName = (record.subject ?? subject).toLowerCase().trim();
      let subjectRow = existingSubjects?.find((s: any) => s.name.toLowerCase().trim() === sName);
      
      if (subjectRow) {
        subject_id = subjectRow.id;
      } else {
        const { data: newSub } = await supabase.from('subjects').insert({ name: record.subject ?? subject }).select().single();
        subject_id = newSub?.id;
      }

      if (subject_id) {
        const { data: existingTopics } = await supabase.from('topics').select('id, name').eq('subject_id', subject_id);
        const tName = (record.section || 'General').toLowerCase().trim();
        let topicRow = existingTopics?.find((t: any) => t.name.toLowerCase().trim() === tName);
        
        if (topicRow) {
          topic_id = topicRow.id;
        } else {
          const { data: newTop } = await supabase.from('topics').insert({ name: record.section || 'General', subject_id }).select().single();
          topic_id = newTop?.id;
        }
      }

      if (subject_id && topic_id) {
        const optionsArray = [
          record.option?.a ?? '',
          record.option?.b ?? '',
          record.option?.c ?? '',
          record.option?.d ?? '',
          ...(record.option?.e ? [record.option.e] : []),
        ].filter(Boolean);

        await supabase.from('questions').insert({
          subject_id,
          topic_id,
          question_content: questionText,
          options: optionsArray,
          correct_answer: record.answer ?? 'a',
          explanation: record.solution ?? '',
          year: parseInt(record.examyear, 10) || 0,
        });
      }
    } catch (stdSyncErr) {
      console.warn("Standard CBT questions mapping skipped or failed:", stdSyncErr);
    }

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
