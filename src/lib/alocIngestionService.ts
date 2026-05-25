import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// If you need to use different service role keys for admin actions, handle that here.
// Assuming for this App, it's already configured securely.
// Note: Generating embeddings requires external APIs (OpenAI/Gemini). 
// These keys must be handled server-side.

export const alocIngestionService = {
  async generateEmbedding(textToEmbed: string): Promise<number[]> {
    // This should logically be handled server-side to keep keys secure.
    // For now, implementing the logic similar to the script, which assumes 
    // secure env access to OPENAI_API_KEY/GEMINI_API_KEY.
    
    // As per infrastructure guidelines, this should be an API route proxy.
    // For this implementation, I will just ensure the structure calls an API.
    const response = await fetch('/api/admin/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToEmbed }),
    });

    if (!response.ok) throw new Error('Failed to generate embedding');
    const { embedding } = await response.json();
    return embedding;
  },

  async ingestQuestion(record: any, subject: string, examType: string) {
    // 1. Check for duplicate
    const { data: existing, error: checkErr } = await supabase
      .from('questions') // Changed to public.questions table name per SQL provided
      .select('id, source_id')
      .eq('source_id', record.id)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) return { status: 'skipped', id: record.id };

    // 2. Prepare Data
    const rebuiltOptions = {
        a: record.option?.a || '',
        b: record.option?.b || '',
        c: record.option?.c || '',
        d: record.option?.d || '',
    };

    const textToEmbed = `Subject: ${record.subject || subject}\nTopic: ${record.section || 'General'}\nQuestion: ${record.question}\nAnswer Explanation: ${record.solution || 'None provided.'}`;
    
    // 3. Generate Embedding
    const vectorData = await this.generateEmbedding(textToEmbed);

    // 4. Atomic Upsert
    const { error: insertErr } = await supabase
        .from('questions')
        .upsert({
            source_id: record.id,
            subject: (record.subject || subject).toLowerCase(),
            exam_type: (record.examtype || examType).toLowerCase(),
            year: parseInt(record.examyear) || 0,
            question_text: record.question,
            options: rebuiltOptions,
            correct_answer: record.answer || 'a',
            explanation: record.solution || '',
            topic: record.section || 'General',
            embedding: vectorData
        }, { onConflict: 'source_id' });

    if (insertErr) throw insertErr;
    return { status: 'success', id: record.id };
  },

  async fetchAllQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('*');
    
    if (error) throw error;
    return data;
  }
};
