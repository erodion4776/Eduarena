import { create }      from 'zustand';
import { ALOCQuestion } from '../types';
import { supabase }    from '../lib/supabase';
import { alocService } from '../lib/alocService';
import { logger }      from '../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface SessionSubject {
  subject:      string;
  questions:    ALOCQuestion[];
  currentIndex: number;
}

export interface NeuralVaultSession {
  id:                 string;
  examType:           string;
  subjects:           SessionSubject[];
  activeSubjectIndex: number;
  startTime:          number;   // UTC ms timestamp
  duration:           number;   // seconds
  isSubmitted:        boolean;
  isMultiSubject:     boolean;
  userAnswers:        Record<string, string>; // questionId → 'a'|'b'|'c'|'d'
  score:              number;
  xpEarned:           number;
  topicContext?:      any;
}

interface NeuralVaultState {
  currentSession: NeuralVaultSession | null;
  isLoading:      boolean;
  error:          string | null;

  initiateSession: (params: {
    examType:         string;
    selectedSubjects: string[];
    durationMinutes:  number;
    questionCount?:   number;
    topicContext?:    any;
  }) => Promise<void>;

  answerQuestion:      (questionId: string | number, answer: string) => void;
  setCurrentIndex:     (subjectIndex: number, idx: number) => void;
  setActiveSubjectIndex: (idx: number) => void;
  submitSession:       () => Promise<void>;
  hydrateSession:      () => void;
  clearSession:        () => void;
  queueMigration:      () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SESSION_KEY      = 'NEURAL_VAULT_ACTIVE_SESSION';
const ATTEMPTS_KEY     = 'NEURAL_VAULT_ATTEMPTS_QUEUE';
const SESSION_MAX_AGE  = 24 * 60 * 60 * 1000; // 24 hours in ms

// ✅ Maps frontend subject names to exactly how they are stored in Supabase
const SUBJECT_DB_MAP: Record<string, string> = {
  mathematics: 'Mathematics',
  biology:     'Biology',
  physics:     'Physics',
  chemistry:   'Chemistry',
  english:     'English',
  government:  'Government',
  economics:   'Economics',
  commerce:    'Commerce',
  accounting:  'Accounting',
  literature:  'Literature',
  geography:   'Geography',
};

// ✅ Maps frontend exam type to exactly how stored in Supabase
const EXAM_TYPE_DB_MAP: Record<string, string> = {
  jamb:   'JAMB',
  utme:   'JAMB',
  waec:   'WAEC',
  wassce: 'WAEC',
  neco:   'NECO',
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalize any question shape into ALOCQuestion
// ─────────────────────────────────────────────────────────────────────────────
const normalizeQuestion = (q: any, subject: string): ALOCQuestion | null => {
  if (!q) return null;

  // Unwrap question_data JSONB if fetched from Supabase vault
  const raw = q.question_data ?? q;

  const questionText = (
    raw.question      ??
    raw.question_text ??
    raw.question_content ?? ''
  ).trim();

  if (!questionText) return null;

  // Normalize options to lowercase keys
  const optionsRaw: Record<string, string> =
    raw.option   ??
    raw.options  ??
    raw.choices  ?? {};

  const option: Record<string, string> = {};
  Object.entries(optionsRaw).forEach(([k, v]) => {
    option[k.toLowerCase().trim()] = String(v ?? '').trim();
  });

  // Must have at least 2 options
  if (Object.keys(option).length < 2) return null;

  const rawAnswer = (
    raw.answer         ??
    raw.correct_answer ??
    raw.correct_option ?? 'a'
  );
  const answer = String(rawAnswer).toLowerCase().trim().charAt(0); // 'a'|'b'|'c'|'d'

  const solution = (
    raw.explanation ??
    raw.solution    ??
    'No explanation available.'
  ).trim();

  // Generate stable ID
  const id = raw.id ?? q.id ?? Math.floor(Math.random() * 10_000_000);

  return {
    ...raw,
    id,
    question:  questionText,
    option: option as any,
    answer,
    solution,
    explanation: solution,
    examType:    raw.examType  ?? raw.exam_type ?? 'UTME',
    examyear:    String(raw.examyear ?? raw.exam_year ?? raw.year ?? '2024'),
    subject:     subject,
  } as ALOCQuestion;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch questions from Supabase — fixed case sensitivity
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromSupabase(
  subject:   string,
  examType:  string,
  count:     number
): Promise<any[]> {
  if (!supabase) {
    logger.warn('Supabase client not initialized — skipping vault fetch.');
    return [];
  }

  // ✅ Map to exact DB casing
  const dbSubject  = SUBJECT_DB_MAP[subject.toLowerCase()] ?? subject;
  const dbExamType = EXAM_TYPE_DB_MAP[examType.toLowerCase()] ?? examType.toUpperCase();

  logger.info(`Querying Supabase: subject="${dbSubject}" exam_type="${dbExamType}" limit=${count * 5}`);

  try {
    const { data, error } = await supabase
      .from('global_questions_vault')
      .select('id, subject, exam_type, question_data') // ✅ select specific cols (excluding top level year as it doesn't exist)
      .eq('subject',   dbSubject)   // ✅ exact case match
      .eq('exam_type', dbExamType)  // ✅ exact case match
      .limit(count * 5);

    if (error) {
      logger.warn(`Supabase vault error: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) {
      logger.warn(`No questions found in Supabase for ${dbSubject} / ${dbExamType}`);
      return [];
    }

    logger.info(`✅ Supabase returned ${data.length} questions for ${dbSubject}`);

    // ✅ Unwrap question_data and merge top-level fields
    return data.map(row => ({
      ...row.question_data,
      id:        row.id,
      subject:   row.subject,
      exam_type: row.exam_type,
    }));

  } catch (err: any) {
    logger.warn(`Supabase fetch exception: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch from ALOC live API
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromALOC(
  subject:  string,
  examType: string,
  count:    number
): Promise<any[]> {
  try {
    // ALOC uses 'utme' not 'jamb'
    const alocType = examType.toLowerCase() === 'jamb'
      ? 'utme'
      : examType.toLowerCase();

    const batch = await alocService.fetchLiveQuestions(
      subject.toLowerCase(),
      alocType,
      undefined,
      count
    );

    if (batch && batch.length > 0) {
      logger.info(`✅ ALOC returned ${batch.length} questions for ${subject}`);
      return batch;
    }

    return [];
  } catch (err: any) {
    logger.warn(`ALOC fetch failed for ${subject}: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch from local server fallback
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromLocalServer(
  subject:  string,
  examType: string,
  count:    number
): Promise<any[]> {
  try {
    const url = `/api/questions?subject=${encodeURIComponent(subject)}&exam_type=${encodeURIComponent(examType.toUpperCase())}`;
    const res = await fetch(url);

    if (!res.ok) {
      logger.warn(`Local server returned ${res.status} for ${subject}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    logger.info(`✅ Local server returned ${Math.min(data.length, count)} questions for ${subject}`);
    return data.slice(0, count);

  } catch (err: any) {
    logger.warn(`Local server fetch failed: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Save session to localStorage safely
// ─────────────────────────────────────────────────────────────────────────────
function persistSession(session: NeuralVaultSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    logger.warn('Failed to persist session to localStorage');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────
export const useNeuralVaultStore = create<NeuralVaultState>((set, get) => ({
  currentSession: null,
  isLoading:      false,
  error:          null,

  // ── Initiate Session ───────────────────────────────────────────────────────
  initiateSession: async ({
    examType,
    selectedSubjects,
    durationMinutes,
    questionCount = 10,
    topicContext,
  }) => {
    set({ isLoading: true, error: null });

    logger.info(
      `Neural Link activating — subjects: ${selectedSubjects.join(', ')}, ` +
      `exam: ${examType}, questions/subject: ${questionCount}`
    );

    const startTime = Date.now();
    const sessionId = `sess-${startTime}`;
    const duration  = durationMinutes * 60;
    const subjectsData: SessionSubject[] = [];

    for (const sub of selectedSubjects) {
      let fetched: any[] = [];

      // ── Priority 1: Supabase Global Vault ─────────────────────────────────
      fetched = await fetchFromSupabase(sub, examType, questionCount);

      // ── Priority 2: ALOC Live API ──────────────────────────────────────────
      if (fetched.length < questionCount) {
        const needed   = questionCount - fetched.length;
        const liveBatch = await fetchFromALOC(sub, examType, needed);
        fetched = [...fetched, ...liveBatch];
      }

      // ── Priority 3: Local server fallback ─────────────────────────────────
      if (fetched.length === 0) {
        fetched = await fetchFromLocalServer(sub, examType, questionCount);
      }

      // ── Normalize & filter invalid questions ──────────────────────────────
      const normalized = fetched
        .map(q => normalizeQuestion(q, sub))
        .filter((q): q is ALOCQuestion => q !== null && Boolean(q.id));

      // ✅ Sort by year descending (newest first) to avoid random mixed years
      const sortedByYear = [...normalized].sort((a, b) => {
        const yearA = parseInt(a.examyear || '0', 10);
        const yearB = parseInt(b.examyear || '0', 10);
        return yearB - yearA;
      });

      // ✅ Slice to requested question count
      const finalQuestions = sortedByYear.slice(0, questionCount);

      // Shuffle for variety
      const shuffled = [...finalQuestions].sort(() => Math.random() - 0.5);

      logger.info(
        `Subject "${sub}": ${shuffled.length} valid questions ready ` +
        `(${fetched.length} raw fetched)`
      );

      subjectsData.push({
        subject:      sub,
        questions:    shuffled,
        currentIndex: 0,
      });
    }

    const newSession: NeuralVaultSession = {
      id:                 sessionId,
      examType,
      subjects:           subjectsData,
      activeSubjectIndex: 0,
      startTime,
      duration,
      isSubmitted:        false,
      isMultiSubject:     selectedSubjects.length > 1,
      userAnswers:        {},
      score:              0,
      xpEarned:           0,
      topicContext:       topicContext ?? null,
    };

    persistSession(newSession);
    set({ currentSession: newSession, isLoading: false });
    logger.info(`✅ Session ${sessionId} initialized with ${subjectsData.length} subject(s).`);
  },

  // ── Answer Question ────────────────────────────────────────────────────────
  answerQuestion: (questionId, answer) => {
    const { currentSession } = get();
    if (!currentSession || currentSession.isSubmitted) return;

    const key = String(questionId);

    // ✅ Skip if answer unchanged — avoid unnecessary re-renders + localStorage writes
    if (currentSession.userAnswers[key] === answer) return;

    const updatedSession: NeuralVaultSession = {
      ...currentSession,
      userAnswers: {
        ...currentSession.userAnswers,
        [key]: answer.toLowerCase().trim(),
      },
    };

    persistSession(updatedSession);

    // Save queue attempt locally for background sync when connection is detected
    const attemptQueueKey = 'NEURAL_VAULT_ATTEMPTS_QUEUE';
    try {
      const savedQueue = localStorage.getItem(attemptQueueKey);
      const queue = savedQueue ? JSON.parse(savedQueue) : [];
      queue.push({
        questionId,
        answer: answer.toLowerCase().trim(),
        timestamp: Date.now()
      });
      localStorage.setItem(attemptQueueKey, JSON.stringify(queue));
    } catch (err) {
      console.error("Failed to queue attempt for Zero Loss fallback", err);
    }

    set({ currentSession: updatedSession });
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  setCurrentIndex: (subjectIndex, idx) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const subjects = currentSession.subjects.map((s, i) =>
      i === subjectIndex ? { ...s, currentIndex: idx } : s
    );

    const updated = { ...currentSession, subjects };
    persistSession(updated);
    set({ currentSession: updated });
  },

  setActiveSubjectIndex: (idx) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const updated = { ...currentSession, activeSubjectIndex: idx };
    persistSession(updated);
    set({ currentSession: updated });
  },

  // ── Submit Session ─────────────────────────────────────────────────────────
  submitSession: async () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.isSubmitted) return;

    logger.info(`Submitting session ${currentSession.id}...`);

    // ── Calculate score ───────────────────────────────────────────────────
    let totalQuestions = 0;
    let correctCount   = 0;

    // ✅ Build detailed mistakes array (not just a count)
    const mistakes: Array<{
      questionId: string;
      question:   string;
      userAnswer: string;
      correct:    string;
      subject:    string;
    }> = [];

    currentSession.subjects.forEach(sub => {
      sub.questions.forEach(q => {
        totalQuestions++;
        const userAnswer = (currentSession.userAnswers[String(q.id)] ?? '').toLowerCase().trim();
        const correct    = (q.answer ?? '').toLowerCase().trim();

        if (userAnswer === correct) {
          correctCount++;
        } else {
          mistakes.push({
            questionId: String(q.id),
            question:   q.question,
            userAnswer: userAnswer || 'unanswered',
            correct,
            subject:    sub.subject,
          });
        }
      });
    });

    const finalPercent = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    const finalXp = correctCount * 12;

    const submittedSession: NeuralVaultSession = {
      ...currentSession,
      isSubmitted: true,
      score:       finalPercent,
      xpEarned:    finalXp,
    };

    persistSession(submittedSession);
    set({ currentSession: submittedSession });

    // ── Persist to server ─────────────────────────────────────────────────
    try {
      const res = await fetch('/.netlify/functions/practice-session-save-result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:      currentSession.id,
          subject:        currentSession.isMultiSubject
            ? 'Multi-Subject'
            : currentSession.subjects[0]?.subject ?? 'Mixed',
          finalScore:     finalPercent,
          totalQuestions,
          xpEarned:       finalXp,
          mistakes,        // ✅ Full array not just count
          metadata: {
            examType:    currentSession.examType,
            subjects:    currentSession.subjects.map(s => s.subject),
            duration:    currentSession.duration,
            answeredCount: Object.keys(currentSession.userAnswers).length,
          },
        }),
      });

      if (!res.ok) {
        logger.warn(`Server save returned ${res.status} — result preserved locally.`);
      } else {
        logger.info('✅ Session result saved to server.');
        // Clear attempts queue now that server confirmed receipt
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    } catch (err: any) {
      logger.warn(`Server save failed (offline?): ${err.message} — result intact locally.`);
    }

    // ── Also save to Supabase directly if available ───────────────────────
    if (supabase) {
      try {
        const { error } = await supabase
          .from('practice_results')
          .insert({
            user_id:         'anonymous', // replace with real user ID if auth available
            session_id:      currentSession.id,
            subject:         currentSession.isMultiSubject
              ? 'Multi-Subject'
              : currentSession.subjects[0]?.subject ?? 'Mixed',
            score:           finalPercent,
            total_questions: totalQuestions,
            xp_earned:       finalXp,
            mistakes:        mistakes,
            metadata: {
              examType: currentSession.examType,
              subjects: currentSession.subjects.map(s => s.subject),
            },
            created_at: new Date().toISOString(),
          });

        if (error) {
          logger.warn(`Supabase practice_results insert failed: ${error.message}`);
        } else {
          logger.info('✅ Session result saved to Supabase practice_results.');
        }
      } catch (err: any) {
        logger.warn(`Supabase direct save failed: ${err.message}`);
      }
    }

    logger.info(
      `✅ Session complete — score: ${finalPercent}%, ` +
      `correct: ${correctCount}/${totalQuestions}, XP: ${finalXp}`
    );
  },

  // ── Hydrate Session from localStorage ─────────────────────────────────────
  hydrateSession: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;

      const parsed: NeuralVaultSession = JSON.parse(raw);

      // ✅ Don't restore sessions older than 24 hours
      const age = Date.now() - (parsed.startTime ?? 0);
      if (age > SESSION_MAX_AGE) {
        logger.info('Stored session expired — clearing.');
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      // ✅ Don't restore already-submitted sessions on fresh load
      if (parsed.isSubmitted) {
        logger.info('Stored session already submitted — not restoring.');
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      // ✅ Validate structure before restoring
      if (
        !parsed.id        ||
        !parsed.subjects  ||
        !Array.isArray(parsed.subjects)
      ) {
        logger.warn('Stored session has invalid structure — clearing.');
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      set({ currentSession: parsed });
      logger.info(`✅ Hydrated session ${parsed.id} from localStorage.`);

    } catch (err) {
      logger.warn('Failed to hydrate session — clearing corrupt data.');
      localStorage.removeItem(SESSION_KEY);
    }
  },

  // ── Clear Session ──────────────────────────────────────────────────────────
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
    set({ currentSession: null, error: null });
    logger.info('Session cleared.');
  },

  // ── Queue Migration — sync local attempts to Supabase ─────────────────────
  queueMigration: async () => {
    if (!supabase) return;

    try {
      const raw = localStorage.getItem(ATTEMPTS_KEY);
      if (!raw) return;

      const queue: Array<{
        questionId: string;
        answer:     string;
        timestamp:  number;
      }> = JSON.parse(raw);

      if (queue.length === 0) return;

      logger.info(`Syncing ${queue.length} queued attempts to Supabase...`);

      // ✅ Actually does something now — saves attempts to Supabase
      const { error } = await supabase
        .from('practice_results')
        .insert({
          user_id:    'anonymous',
          session_id: `migrated-${Date.now()}`,
          metadata: {
            source:   'queue_migration',
            attempts: queue,
          },
          score:           0,
          total_questions: queue.length,
          created_at:      new Date().toISOString(),
        });

      if (error) {
        logger.warn(`Queue migration failed: ${error.message}`);
      } else {
        localStorage.removeItem(ATTEMPTS_KEY);
        logger.info('✅ Queue migration complete.');
      }
    } catch (err: any) {
      logger.warn(`queueMigration exception: ${err.message}`);
    }
  },
}));
