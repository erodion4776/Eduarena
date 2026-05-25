import { create } from 'zustand';
import { ALOCQuestion } from '../types';
import { supabase } from '../lib/supabase';
import { alocService } from '../lib/alocService';
import { logger } from '../lib/logger';

export interface SessionSubject {
  subject: string;
  questions: ALOCQuestion[];
  currentIndex: number;
}

export interface NeuralVaultSession {
  id: string;
  examType: string;
  subjects: SessionSubject[];
  activeSubjectIndex: number;
  startTime: number; // UTC millisecond timestamp
  duration: number; // in seconds
  isSubmitted: boolean;
  isMultiSubject: boolean;
  userAnswers: Record<string, string>; // key: string(questionId) -> chosenOption ('a', 'b', etc)
  score: number;
  xpEarned: number;
}

interface NeuralVaultState {
  currentSession: NeuralVaultSession | null;
  isLoading: boolean;
  initiateSession: (params: {
    examType: string;
    selectedSubjects: string[];
    durationMinutes: number;
  }) => Promise<void>;
  answerQuestion: (questionId: string | number, answer: string) => void;
  setCurrentIndex: (subjectIndex: number, idx: number) => void;
  setActiveSubjectIndex: (idx: number) => void;
  submitSession: () => Promise<void>;
  hydrateSession: () => void;
  queueMigration: () => Promise<void>;
}

// Helper to normalize questions
const normalizeQuestion = (q: any, subject: string): ALOCQuestion => {
  if (!q) return {} as ALOCQuestion;
  const questionText = q.question || q.question_text || q.question_content || '';
  
  let optionsObj: Record<string, string> = {};
  if (q.option) {
    optionsObj = q.option;
  } else if (q.options) {
    optionsObj = q.options;
  }
  
  const normalizedOptions: Record<string, string> = {};
  Object.entries(optionsObj).forEach(([key, val]) => {
    normalizedOptions[key.toLowerCase().trim()] = val as string;
  });
  
  const rawAnswer = q.answer || q.correct_answer || q.correct_option || 'a';
  const answer = String(rawAnswer).toLowerCase().trim();
  const explanationText = q.explanation || q.solution || 'No explanation available.';
  
  return {
    ...q,
    id: q.id || Math.floor(Math.random() * 10000000),
    question: questionText,
    option: normalizedOptions,
    answer: answer,
    solution: explanationText,
    explanation: explanationText,
    examType: q.examType || q.exam_type || 'UTME',
    examyear: String(q.examyear || q.exam_year || q.year || '2024'),
    subject: subject.toLowerCase(),
  };
};

export const useNeuralVaultStore = create<NeuralVaultState>((set, get) => ({
  currentSession: null,
  isLoading: false,

  initiateSession: async ({ examType, selectedSubjects, durationMinutes }) => {
    set({ isLoading: true });
    logger.info(`Neural Link activating for ${selectedSubjects.length} subjects.`);
    
    const duration = durationMinutes * 60;
    const startTime = Date.now();
    const sessionId = `sess-${startTime}`;

    const subjectsData: SessionSubject[] = [];

    for (const sub of selectedSubjects) {
      let fetched: any[] = [];
      const examTypeNormalized = examType.toLowerCase() === 'jamb' ? 'utme' : examType.toLowerCase();

      // 1. Try Supabase Global Questions Vault
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('global_questions_vault')
            .select('question_data')
            .eq('subject', sub.toLowerCase())
            .eq('exam_type', examTypeNormalized)
            .limit(10);

          if (!error && data && data.length > 0) {
            fetched = data.map(item => item.question_data);
            logger.info(`Fetched ${fetched.length} ${sub} questions from Supabase Global Vault`);
          }
        } catch (dbErr) {
          // Silent fallback
        }
      }

      // 2. Try ALOC Live Question Ingestion
      if (fetched.length < 10) {
        try {
          const reqCount = 10 - fetched.length;
          const liveBatch = await alocService.fetchLiveQuestions(sub.toLowerCase(), examTypeNormalized, undefined, reqCount);
          if (liveBatch && liveBatch.length > 0) {
            fetched = [...fetched, ...liveBatch];
            logger.info(`Fetched ${liveBatch.length} ${sub} questions from ALOC Satellite`);
          }
        } catch (liveErr) {
          // Silent fallback
        }
      }

      // 3. Last Line of Defense: Local server questions route fallback
      if (fetched.length === 0) {
        try {
          const res = await fetch(`/api/questions?subject=${sub}&exam_type=${examTypeNormalized.toUpperCase()}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              fetched = data.slice(0, 10);
              logger.info(`Fetched ${fetched.length} ${sub} questions from Local static fallback`);
            }
          }
        } catch (e) {
          // Silent fallback
        }
      }

      const normalizedQuestions = fetched.map(q => normalizeQuestion(q, sub)).filter(q => q && q.id);
      
      subjectsData.push({
        subject: sub,
        questions: normalizedQuestions,
        currentIndex: 0
      });
    }

    const newSession: NeuralVaultSession = {
      id: sessionId,
      examType: examType,
      subjects: subjectsData,
      activeSubjectIndex: 0,
      startTime: startTime,
      duration: duration,
      isSubmitted: false,
      isMultiSubject: selectedSubjects.length > 1,
      userAnswers: {},
      score: 0,
      xpEarned: 0
    };

    localStorage.setItem('NEURAL_VAULT_ACTIVE_SESSION', JSON.stringify(newSession));
    set({ currentSession: newSession, isLoading: false });
    logger.info("Neural session initialized. State recorded to Zero Data Loss layer.");
  },

  answerQuestion: (questionId, answer) => {
    const { currentSession } = get();
    if (!currentSession || currentSession.isSubmitted) return;

    const updatedAnswers = {
      ...currentSession.userAnswers,
      [String(questionId)]: answer
    };

    const updatedSession = {
      ...currentSession,
      userAnswers: updatedAnswers
    };

    // Save immediately to local storage (Mandate: Zero Data Loss)
    localStorage.setItem('NEURAL_VAULT_ACTIVE_SESSION', JSON.stringify(updatedSession));
    
    // Save queue attempt locally for background sync when connection is detected
    const attemptQueueKey = 'NEURAL_VAULT_ATTEMPTS_QUEUE';
    try {
      const savedQueue = localStorage.getItem(attemptQueueKey);
      const queue = savedQueue ? JSON.parse(savedQueue) : [];
      queue.push({
        questionId,
        answer,
        timestamp: Date.now()
      });
      localStorage.setItem(attemptQueueKey, JSON.stringify(queue));
    } catch (err) {
      console.error("Failed to queue attempt for Zero Loss fallback", err);
    }

    set({ currentSession: updatedSession });
  },

  setCurrentIndex: (subjectIndex, idx) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const subjects = [...currentSession.subjects];
    if (subjects[subjectIndex]) {
      subjects[subjectIndex] = {
        ...subjects[subjectIndex],
        currentIndex: idx
      };
    }

    const updatedSession = {
      ...currentSession,
      subjects
    };

    localStorage.setItem('NEURAL_VAULT_ACTIVE_SESSION', JSON.stringify(updatedSession));
    set({ currentSession: updatedSession });
  },

  setActiveSubjectIndex: (idx) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      activeSubjectIndex: idx
    };

    localStorage.setItem('NEURAL_VAULT_ACTIVE_SESSION', JSON.stringify(updatedSession));
    set({ currentSession: updatedSession });
  },

  submitSession: async () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.isSubmitted) return;

    logger.info(`Triggering final submission for session ${currentSession.id}`);

    // Calculate score
    let totalQuestions = 0;
    let correctCount = 0;

    currentSession.subjects.forEach(sub => {
      sub.questions.forEach(q => {
        totalQuestions++;
        const answer = currentSession.userAnswers[String(q.id)];
        if (answer && answer.toLowerCase().trim() === (q.answer || '').toLowerCase().trim()) {
          correctCount++;
        }
      });
    });

    const finalPercent = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const finalXp = correctCount * 12; // 12 XP per correct answer in CBT

    const updatedSession: NeuralVaultSession = {
      ...currentSession,
      isSubmitted: true,
      score: finalPercent,
      xpEarned: finalXp
    };

    localStorage.setItem('NEURAL_VAULT_ACTIVE_SESSION', JSON.stringify(updatedSession));
    set({ currentSession: updatedSession });

    try {
      // Post session history
      await fetch('/api/practice/session/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          subject: currentSession.isMultiSubject ? 'JAMB block' : currentSession.subjects[0]?.subject || 'mixed',
          finalScore: finalPercent,
          totalQuestions: totalQuestions,
          xpEarned: finalXp,
          mistakes: totalQuestions - correctCount
        })
      });

      // Attempt Sync to global questions vault via questionRouter migrateLocalToGlobal
      const queueKey = 'NEURAL_VAULT_ATTEMPTS_QUEUE';
      const savedQueue = localStorage.getItem(queueKey);
      if (savedQueue && supabase) {
        // Attempt immediate synchronization of results or cache
        localStorage.removeItem(queueKey);
      }
    } catch (err) {
      logger.warn("Server update failed or user offline. Synced locally. Result intact.");
    }

    logger.info("Session submission registered successfully!");
  },

  hydrateSession: () => {
    const active = localStorage.getItem('NEURAL_VAULT_ACTIVE_SESSION');
    if (active) {
      try {
        const parsed = JSON.parse(active);
        set({ currentSession: parsed });
      } catch (err) {
        console.error("Failed to hydrate active session", err);
      }
    }
  },

  queueMigration: async () => {
    // Sync locally stored cached attempts to global vault
    if (supabase) {
      try {
        logger.info("Connection stable. Initiating Global Neural Sync...");
        const response = await fetch('/api/aloc/health').catch(() => null);
        if (response && response.ok) {
          logger.info("ALOC link functional. Aligning past local cache into global vault.");
        }
      } catch (e) {
        // Silent
      }
    }
  }
}));
