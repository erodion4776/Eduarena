
import { ALOCQuestion } from '../types';
import { supabase } from './supabase';
import { alocService } from './alocService';
import { cacheService } from './cacheService';

/**
 * Question Router: Intelligent Fetching Layer
 * Determines whether to pull from Supabase Global Vault, Local Vault, or fetch fresh from ALOC API.
 */
export const questionRouter = {
  async getSmartQuestion(subject: string = 'english', type: string = 'utme', year?: string): Promise<ALOCQuestion> {
    
    // 1. Check Local Vault First (Highest Priority for API reduction)
    const localStats = cacheService.getVaultStats();
    const localSubjectCount = localStats.bySubject[subject] || 0;
    
    if (localSubjectCount > 20 && Math.random() < 0.4) {
      const cachedLocal = cacheService.fetchFromLocalVault(subject, type, year);
      if (cachedLocal) {
        console.log("Question retrieved from Local Cache");
        return { ...cachedLocal, source: 'vault' };
      }
    }

    // 2. Check if Supabase is connected
    if (!supabase) {
      const freshQuestions = await alocService.fetchLiveQuestions(subject, type, year, 1);
      const q = freshQuestions[0];
      cacheService.saveToLocalVault(q);
      return q;
    }

    try {
      // 3. 70% chance to fetch from Global Vault
      const shouldCheckVault = Math.random() < 0.7;
      
      if (shouldCheckVault) {
        // Use a random offset approach for small/medium datasets
        const { count } = await supabase
          .from('global_questions_vault')
          .select('*', { count: 'exact', head: true })
          .eq('subject', subject.toLowerCase())
          .eq('exam_type', type.toLowerCase());

        if (count && count > 0) {
          const randomOffset = Math.floor(Math.random() * count);
          const { data, error } = await supabase
            .from('global_questions_vault')
            .select('question_data')
            .eq('subject', subject.toLowerCase())
            .eq('exam_type', type.toLowerCase())
            .range(randomOffset, randomOffset)
            .single();

          if (!error && data) {
            console.log("Question retrieved from Global Vault");
            const q = data.question_data as ALOCQuestion;
            return {
              ...q,
              source: 'vault'
            };
          }
        }
      }

      // 4. Fallback or 30% fetch fresh from ALOC API
      console.log("Fetching fresh question from Satellite (ALOC API)");
      const freshBatch = await alocService.fetchLiveQuestions(subject, type, year, 1);
      const freshQuestion = freshBatch[0];

      // 5. Async Sync: Upsert to Global Vault & Local Cache
      this.syncToGlobalVault(freshQuestion).catch(console.error);
      cacheService.saveToLocalVault(freshQuestion);

      return {
        ...freshQuestion,
        source: 'live'
      };

    } catch (err) {
      console.error("Smart Router Error:", err);
      const backup = await alocService.fetchLiveQuestions(subject, type, year, 1);
      const q = backup[0];
      cacheService.saveToLocalVault(q);
      return q;
    }
  },

  async syncToGlobalVault(question: ALOCQuestion) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('global_questions_vault')
        .upsert({
          id: question.id,
          subject: (question.subject || 'unknown').toLowerCase(),
          exam_type: question.examType.toLowerCase(),
          question_data: question
        }, { onConflict: 'id' });

      if (error) console.error("Global Vault Sync Error:", error);
      else console.log(`Question ID ${question.id} synced to Global Vault.`);
    } catch (e) {
      console.error("Sync Exception:", e);
    }
  }
};
