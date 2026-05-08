import { supabase } from './supabase';

export const questionImportService = {
  async importQuestionsBatch(questions: any[], onProgress: (msg: string) => void): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    try {
      onProgress(`Starting import of ${questions.length} questions...`);

      // 1. Fetch/Cache existing Subjects and Topics
      onProgress('Resolving Subjects and Topics...');
      const { data: existingSubjects, error: subErr } = await supabase.from('subjects').select('id, name');
      if (subErr) throw new Error(`Subject fetch failed: ${subErr.message}`);
      
      const { data: existingTopics, error: topErr } = await supabase.from('topics').select('id, name, subject_id');
      if (topErr) throw new Error(`Topic fetch failed: ${topErr.message}`);

      // Case-insensitive maps
      const subjectMap = new Map<string, string>();
      existingSubjects?.forEach(s => subjectMap.set(s.name.toLowerCase().trim(), s.id));

      const topicMap = new Map<string, string>(); // key: "subjectId|topicName"
      existingTopics?.forEach(t => topicMap.set(`${t.subject_id}|${t.name.toLowerCase().trim()}`, t.id));

      // 2. Pre-process questions to map names to IDs
      onProgress('Mapping data...');
      const preparedBatch = [];

      for (const q of questions) {
        let subject_id = q.subject_id;
        let topic_id = q.topic_id;

        // If they provided a name but no ID
        if (!subject_id && q.subject_name) {
           const sName = String(q.subject_name).toLowerCase().trim();
           if (subjectMap.has(sName)) {
             subject_id = subjectMap.get(sName);
           } else {
             // Create missing subject
             onProgress(`Creating missing subject: ${q.subject_name}`);
             const { data: newSub, error: nsErr } = await supabase.from('subjects').insert({ name: q.subject_name, color: 'sky' }).select().single();
             if (nsErr) throw new Error(`Failed to create subject: ${nsErr.message}`);
             subject_id = newSub.id;
             subjectMap.set(sName, newSub.id);
           }
        }

        if (subject_id && !topic_id && q.topic_name) {
           const tKey = `${subject_id}|${String(q.topic_name).toLowerCase().trim()}`;
           if (topicMap.has(tKey)) {
             topic_id = topicMap.get(tKey);
           } else {
             // Create missing topic
             onProgress(`Creating missing topic: ${q.topic_name}`);
             const { data: newTop, error: ntErr } = await supabase.from('topics').insert({ name: q.topic_name, subject_id }).select().single();
             if (ntErr) throw new Error(`Failed to create topic: ${ntErr.message}`);
             topic_id = newTop.id;
             topicMap.set(tKey, newTop.id);
           }
        }

        preparedBatch.push({
          subject_id,
          topic_id,
          question_content: q.question_content,
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || null,
          difficulty_level: q.difficulty_level || 1,
          year: q.year || null
        });
      }

      onProgress(`Successfully validated ${preparedBatch.length} questions. Starting bulk insertion...`);

      const batchSize = 100;
      let totalInserted = 0;

      for (let i = 0; i < preparedBatch.length; i += batchSize) {
        const batch = preparedBatch.slice(i, i + batchSize);
        onProgress(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)...`);

        const { error } = await supabase.from('questions').insert(batch);
        
        if (error) {
           throw new Error(`Batch insertion failed: ${error.message}`);
        }
        
        totalInserted += batch.length;
        onProgress(`Inserted ${totalInserted}/${preparedBatch.length} questions...`);
      }

      onProgress('COMPLETE: All past questions have been imported successfully!');
    } catch (e: any) {
      console.error(e);
      onProgress(`ERROR: ${e.message || 'Import failed'}`);
      throw e;
    }
  }
};
