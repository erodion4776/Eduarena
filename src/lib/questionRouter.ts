
import { ALOCQuestion } from '../types';
import { supabase } from './supabase';
import { alocService } from './alocService';
import { cacheService } from './cacheService';
import { logger } from './logger';

/**
 * Question Router: Intelligent Fetching Layer
 * Determines whether to pull from Supabase Global Vault, Local Vault, or fetch fresh from ALOC API.
 */
export const questionRouter = {
  async getSmartQuestion(subject: string = 'english', type: string = 'utme', year?: string, forceLive: boolean = false): Promise<ALOCQuestion> {
    
    // 1. Check Local Vault First (Highest Priority for API reduction)
    if (!forceLive) {
      const localStats = cacheService.getVaultStats();
      const localSubjectCount = localStats.bySubject[subject] || 0;
      
      if (localSubjectCount > 20 && Math.random() < 0.4) {
        const cachedLocal = cacheService.fetchFromLocalVault(subject, type, year);
        if (cachedLocal) {
          logger.info("Question retrieved from Local Cache");
          return { ...cachedLocal, source: 'vault' };
        }
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
      const shouldCheckVault = !forceLive && Math.random() < 0.7;
      
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
            logger.info("Question retrieved from Global Vault");
            const q = data.question_data as ALOCQuestion;
            return {
              ...q,
              source: 'vault'
            };
          }
        }
      }

      // 4. Fallback or 30% fetch fresh from ALOC API
      logger.info("Fetching fresh question from Satellite (ALOC API)");
      const freshBatch = await alocService.fetchLiveQuestions(subject, type, year, 1);
      const freshQuestion = freshBatch[0];

      // 5. Async Sync: Upsert to Global Vault & Local Cache
      this.syncToGlobalVault(freshQuestion).catch(e => logger.error("Async Sync Failed", e));
      cacheService.saveToLocalVault(freshQuestion);

      return {
        ...freshQuestion,
        source: 'live'
      };

    } catch (err) {
      logger.error("Smart Router Error", err);
      const backup = await alocService.fetchLiveQuestions(subject, type, year, 1);
      const q = backup[0];
      cacheService.saveToLocalVault(q);
      return q;
    }
  },

  async syncToGlobalVault(question: ALOCQuestion) {
    if (!supabase) {
      logger.warn("Supabase Sync Skipped: Client not configured.");
      return;
    }

    if (!question || !question.id) {
      logger.warn("Sync Skipped: Invalid question data received.", question);
      return;
    }

    logger.info(`Attempting to sync Question ID ${question.id}...`);
    try {
      const payload = {
        id: question.id,
        subject: (question.subject || 'unknown').toLowerCase(),
        exam_type: (question.examType || 'unknown').toLowerCase(),
        question_data: question
      };

      const { error, status } = await supabase
        .from('global_questions_vault')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        if (status === 401 || status === 403 || error.code === '42501') {
          logger.error("🛑 SECURITY_VIOLATION: Check Supabase RLS Policies. Permission Denied.", { status, code: error.code });
        } else {
          logger.error("Global Vault Sync Error", {
            message: error.message,
            code: error.code,
            status
          });
        }
      } else {
        logger.info(`Question ID ${question.id} synced successfully.`);
        // Dispatch event for real-time UI refresh
        window.dispatchEvent(new CustomEvent('VAULT_SYNCED'));
      }
    } catch (e) {
      logger.error("Cloud Bridge Critical Exception during Sync", e);
    }
  },

  /**
   * One-time migration: Pushes any locally cached questions to Supabase if they aren't there.
   * Optimized with batch sync (5 items per batch)
   */
  async migrateLocalToGlobal() {
    if (!supabase) {
      logger.warn("Migration Aborted: Supabase not initialized.");
      return;
    }
    
    try {
      const vaultStr = localStorage.getItem('EDU_ARENA_LOCAL_VAULT');
      if (!vaultStr) {
        logger.info("Local Cache is clear. No migration needed.");
        return;
      }
      
      const localVault: ALOCQuestion[] = JSON.parse(vaultStr);
      const validQuestions = localVault.filter(q => q && q.id);
      
      if (validQuestions.length === 0) {
        logger.info("Local Cache empty or contains invalid data.");
        return;
      }

      logger.info(`Migration starting for ${validQuestions.length} items in batches of 5...`);
      
      // Batch sync Logic
      const BATCH_SIZE = 5;
      for (let i = 0; i < validQuestions.length; i += BATCH_SIZE) {
        const batch = validQuestions.slice(i, i + BATCH_SIZE);
        const toSync = batch.map(q => ({
          id: q.id,
          subject: (q.subject || 'unknown').toLowerCase(),
          exam_type: (q.examType || 'unknown').toLowerCase(),
          question_data: q
        }));

        const { error, status } = await supabase
          .from('global_questions_vault')
          .upsert(toSync, { onConflict: 'id' });

        if (error) {
          if (status === 401 || status === 403 || error.code === '42501') {
            logger.error("🛑 BATCH_SYNC_SECURITY_ERROR: Check RLS Policies.", { status, code: error.code });
            break; // Stop migration if RLS is blocking us
          }
          logger.error(`Migration Batch [${i/BATCH_SIZE}] Failed`, { message: error.message, code: error.code });
        } else {
          logger.info(`Sync Cluster [${i/BATCH_SIZE + 1}] merged successfully.`);
        }
        
        // Brief pause to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
      }
      
      logger.info("Full Migration Sequence Complete.");
      window.dispatchEvent(new CustomEvent('VAULT_SYNCED'));
    } catch (e) {
      logger.error("Migration Exception", e);
    }
  }
};
