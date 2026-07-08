import React, { 
  useState, useEffect, useRef, 
  useCallback, useMemo
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, ChevronRight, ChevronLeft,
  Clock, Award, Lock, CheckCircle2, 
  XCircle, Volume2, VolumeX, AlertCircle,
  HelpCircle, RotateCcw, ShieldAlert, LogOut,
  Loader2, Sparkles, BookOpen
} from 'lucide-react';
import { useNeuralVaultStore } from '../store/useNeuralVaultStore';
import { useAuthStore } from '../store/useAuthStore';
import { aiTutor } from '../lib/aiTutor';
import { voiceService } from '../lib/voiceService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SubjectResult {
  subject: string;
  correct: number;
  total: number;
  percent: number;
}

interface SessionResult {
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  xpEarned: number;
  subjectBreakdown: SubjectResult[];
}

// ─────────────────────────────────────────────
// Pure result calculator
// ─────────────────────────────────────────────
function computeResults(session: any): SessionResult | null {
  if (!session) return null;

  const { subjects, userAnswers } = session;
  let totalQuestions = 0;
  let correctAnswers = 0;
  const subjectBreakdown: SubjectResult[] = [];

  subjects.forEach((sub: any) => {
    let subCorrect = 0;
    sub.questions.forEach((q: any) => {
      totalQuestions++;
      const userAns    = (userAnswers[String(q.id)] ?? '').toLowerCase().trim();
      const correctAns = (q.answer ?? '').toLowerCase().trim();
      if (userAns && userAns === correctAns) {
        correctAnswers++;
        subCorrect++;
      }
    });
    subjectBreakdown.push({
      subject: sub.subject,
      correct: subCorrect,
      total:   sub.questions.length,
      percent: Math.round(
        (subCorrect / Math.max(sub.questions.length, 1)) * 100
      ),
    });
  });

  return {
    totalQuestions,
    correctAnswers,
    scorePercent: totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0,
    xpEarned: correctAnswers * 12,
    subjectBreakdown,
  };
}

// ─────────────────────────────────────────────
// Supabase persistence
// ─────────────────────────────────────────────
async function persistResultsToSupabase(
  userId: string,
  session: any,
  results: SessionResult
): Promise<void> {
  if (!supabase) {
    console.warn('Supabase client not initialized — skipping persistence.');
    return;
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('exam_sessions')
    .insert({
      user_id:          userId,
      exam_type:        session.examType,
      score:            results.correctAnswers,
      total_questions:  results.totalQuestions,
      score_percent:    results.scorePercent,
      xp_earned:        results.xpEarned,
      duration_seconds: session.duration,
      is_submitted:     true,
      submitted_at:     new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionError) throw sessionError;

  if (sessionData?.id && results.subjectBreakdown.length > 0) {
    if (!supabase) {
        console.warn('Supabase client not initialized — skipping subject results.');
        return;
    }
    const { error: subError } = await supabase
      .from('session_subject_results')
      .insert(
        results.subjectBreakdown.map(sub => ({
          session_id:      sessionData.id,
          user_id:         userId,
          subject_name:    sub.subject,
          correct_answers: sub.correct,
          total_questions: sub.total,
          score_percent:   sub.percent,
        }))
      );
    if (subError) {
      console.warn('Subject breakdown save failed:', subError.message);
    }
  }
}

// ─────────────────────────────────────────────
// Confirm Submit Dialog
// ─────────────────────────────────────────────
function ConfirmSubmitDialog({
  unanswered,
  onConfirm,
  onCancel,
}: {
  unanswered: number;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide text-white">
              Submit Exam?
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {unanswered > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-400">
            ⚠️ You have{' '}
            <span className="font-black">{unanswered}</span>{' '}
            unanswered question{unanswered !== 1 ? 's' : ''}.
            Unanswered questions score zero.
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-white/10 hover:bg-zinc-800 text-white text-xs font-black rounded-2xl py-5"
          >
            Continue Exam
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-2xl py-5"
          >
            Submit Now
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Exit Warning Dialog (new component)
// ─────────────────────────────────────────────
function ExitWarningDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide text-white">
              Leave Exam?
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Your answers are saved locally. You can resume later.
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-400">
          ⚠️ The exam timer will continue running while you are away.
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-white/10 hover:bg-zinc-800 text-white text-xs font-black rounded-2xl py-5"
          >
            Stay in Exam
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-2xl py-5"
          >
            Leave Anyway
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ExamArena() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentSession,
    isLoading,
    answerQuestion,
    setCurrentIndex,
    setActiveSubjectIndex,
    submitSession,
    hydrateSession,
  } = useNeuralVaultStore();

  // ── State ──────────────────────────────────
  const [timeLeft,           setTimeLeft]           = useState(0);
  const [aiResponse,         setAiResponse]         = useState<any>(null);
  const [isAiProcessing,     setIsAiProcessing]     = useState(false);
  const [isSpeaking,         setIsSpeaking]         = useState(false);
  const [showResultsModal,   setShowResultsModal]   = useState(false);
  const [showConfirmDialog,  setShowConfirmDialog]  = useState(false);
  const [showExitWarning,    setShowExitWarning]    = useState(false);
  const [isSavingToDb,       setIsSavingToDb]       = useState(false);
  const [frozenResult,       setFrozenResult]       = useState<SessionResult | null>(null);
  const [failedExplanations, setFailedExplanations] = useState<Record<string, { answer: string; provider: string }>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [explainingAll,      setExplainingAll]      = useState(false);

  // ── Refs ────────────────────────────────────
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);
  const dbSavedRef      = useRef(false);
  const handleSubmitRef = useRef<(() => Promise<void>) | null>(null);

  // ── Hydrate ────────────────────────────────
  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  // ── Voice ──────────────────────────────────
  useEffect(() => {
    voiceService.setChangeListener(setIsSpeaking);
    return () => voiceService.stop();
  }, []);

  // ── Submit handler ─────────────────────────
  const handleSubmit = useCallback(async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const snapshot        = computeResults(currentSession);
    const snapshotSession = currentSession;

    try {
      await submitSession();
      setFrozenResult(snapshot);
      setShowResultsModal(true);

      if (snapshot && snapshotSession && user?.id && !dbSavedRef.current) {
        dbSavedRef.current = true;
        setIsSavingToDb(true);

        persistResultsToSupabase(user.id, snapshotSession, snapshot)
          .then(() => toast.success('Results saved!', { duration: 3000 }))
          .catch(err => {
            console.error('DB save failed:', err);
            dbSavedRef.current = false;
          })
          .finally(() => setIsSavingToDb(false));
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Submission failed. Progress cached locally.');
      hasSubmittedRef.current = false;
    }
  }, [currentSession, submitSession, user?.id]);

  // Keep submit ref current
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // ── Timer ──────────────────────────────────
  useEffect(() => {
    const sessionId   = currentSession?.id;
    const startTime   = currentSession?.startTime;
    const duration    = currentSession?.duration;
    const isSubmitted = currentSession?.isSubmitted;

    if (!sessionId || isSubmitted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) return;

    const calcRemaining = () =>
      Math.max(0, duration! - Math.floor((Date.now() - startTime!) / 1000));

    setTimeLeft(calcRemaining());

    timerRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        toast.error('Time is up! Submitting automatically.', { duration: 6000 });
        handleSubmitRef.current?.();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    currentSession?.id,
    currentSession?.isSubmitted,
    currentSession?.startTime,
    currentSession?.duration,
  ]);

  // ── Keyboard navigation ────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;
      if (!currentSession || currentSession.isSubmitted) return;

      const { activeSubjectIndex, subjects } = currentSession;
      const activeSub = subjects[activeSubjectIndex];
      const currIdx   = activeSub?.currentIndex ?? 0;
      const totalQ    = activeSub?.questions?.length ?? 0;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currIdx < totalQ - 1) {
            setCurrentIndex(activeSubjectIndex, currIdx + 1);
            setAiResponse(null);
          }
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currIdx > 0) {
            setCurrentIndex(activeSubjectIndex, currIdx - 1);
            setAiResponse(null);
          }
          break;

        case 'a': case 'A':
        case 'b': case 'B':
        case 'c': case 'C':
        case 'd': case 'D': {
          const question = activeSub?.questions?.[currIdx];
          if (!question) break;
          const optionKey = e.key.toLowerCase();
          if (question.option?.[optionKey]) {
            answerQuestion(question.id, optionKey);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession, setCurrentIndex, answerQuestion]);

  // ── Browser back button guard ──────────────
  useEffect(() => {
    if (!currentSession || currentSession.isSubmitted) return;

    window.history.pushState({ examGuard: true }, '');

    const handlePopState = () => {
      window.history.pushState({ examGuard: true }, '');
      setShowExitWarning(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentSession?.id, currentSession?.isSubmitted]);

  // ── AI Tutor ───────────────────────────────
  const queryTutorChuks = useCallback(async (question: any) => {
    if (!currentSession?.isSubmitted) return;
    if (!user) {
      toast.error('Please log in to use AI Tutor.');
      return;
    }
    if (!question) return;

    setIsAiProcessing(true);
    setAiResponse(null);

    try {
      const response = await aiTutor.askTutorChuksLive(
        'Explain the logic and concept step-by-step.',
        question
      );
      setAiResponse(response);
    } catch {
      toast.error('Failed to connect to Tutor Chuks. Try again.');
    } finally {
      setIsAiProcessing(false);
    }
  }, [currentSession?.isSubmitted, user]);

  const failedQuestions = useMemo(() => {
    if (!currentSession) return [];
    const failed: { question: any; subject: string; chosen: string; correct: string }[] = [];
    currentSession.subjects.forEach(sub => {
      sub.questions.forEach(q => {
        const userAns = (currentSession.userAnswers[String(q.id)] ?? '').toLowerCase().trim();
        const correctAns = (q.answer ?? '').toLowerCase().trim();
        if (userAns !== correctAns) {
          failed.push({
            question: q,
            subject: sub.subject,
            chosen: userAns || 'Unanswered',
            correct: correctAns
          });
        }
      });
    });
    return failed;
  }, [currentSession]);

  const explainFailedQuestion = useCallback(async (q: any) => {
    if (failedExplanations[q.id] || loadingExplanations[q.id]) return;
    setLoadingExplanations(prev => ({ ...prev, [q.id]: true }));
    try {
      const response = await aiTutor.askTutorChuksLive(
        'Explain why this is correct and why my choice was wrong.',
        q
      );
      setFailedExplanations(prev => ({ ...prev, [q.id]: response }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to get AI explanation for this question.');
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [q.id]: false }));
    }
  }, [failedExplanations, loadingExplanations]);

  const explainAllFailed = useCallback(async () => {
    if (failedQuestions.length === 0) return;
    setExplainingAll(true);
    toast.info('Starting AI analysis for all failed questions. Hold tight!', { duration: 3000 });
    
    try {
      for (const item of failedQuestions) {
        const q = item.question;
        if (!failedExplanations[q.id]) {
          setLoadingExplanations(prev => ({ ...prev, [q.id]: true }));
          try {
            const response = await aiTutor.askTutorChuksLive(
              'Explain why this is correct and why my choice was wrong.',
              q
            );
            setFailedExplanations(prev => ({ ...prev, [q.id]: response }));
          } catch (err) {
            console.warn(`Failed to explain question ${q.id}`, err);
          } finally {
            setLoadingExplanations(prev => ({ ...prev, [q.id]: false }));
          }
        }
      }
      toast.success('AI Diagnostics complete! All failed questions have been explained.');
    } catch (err) {
      console.error(err);
      toast.error('Batch AI diagnostics encountered an error.');
    } finally {
      setExplainingAll(false);
    }
  }, [failedQuestions, failedExplanations]);

  // ─────────────────────────────────────────────
  // GUARDS
  // ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm font-black uppercase tracking-widest animate-pulse">
          Engaging Quantum Link...
        </p>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-full w-full text-white p-4 md:p-8 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/90 border border-white/5 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              NeuralLink Inactive
            </h1>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              No active test block found. Configure a session from the command deck.
            </p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest"
          >
            Configure CBT Block
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────
  const {
    subjects,
    activeSubjectIndex,
    isSubmitted,
    userAnswers,
    examType,
  } = currentSession;

  const activeSubject = subjects[activeSubjectIndex];

  if (!activeSubject?.questions?.length) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-black">No questions found.</h2>
        <p className="text-sm text-zinc-400 max-w-sm">
          Failed to retrieve questions for this subject.
        </p>
        <Button onClick={() => navigate('/')} className="bg-zinc-800 rounded-xl">
          Return to Command Deck
        </Button>
      </div>
    );
  }

  const rawIndex     = activeSubject.currentIndex ?? 0;
  const currentIndex = Math.min(rawIndex, activeSubject.questions.length - 1);
  const currentQuestion = activeSubject.questions[currentIndex];

  const currentAnswer = userAnswers[String(currentQuestion.id)];

  // Live counters
  let totalSessionQ    = 0;
  let answeredSessionQ = 0;
  subjects.forEach(s => {
    s.questions.forEach((q: any) => {
      totalSessionQ++;
      if (userAnswers[String(q.id)] !== undefined) answeredSessionQ++;
    });
  });
  const unansweredCount = totalSessionQ - answeredSessionQ;

  const getAnsweredCount = (sub: typeof activeSubject) =>
    sub.questions.filter(q => userAnswers[String(q.id)] !== undefined).length;

  const formatTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleBackButton = () => {
    if (isSubmitted) {
      navigate('/');
    } else {
      setShowExitWarning(true);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-full text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30 overflow-x-hidden w-full relative">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HUD Header ────────────────────── */}
        <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 bg-zinc-900 border border-white/5 p-4 md:p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackButton}
              className="p-3 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded-2xl transition-all"
              title={isSubmitted ? 'Back to Dashboard' : 'Leave exam (timer continues)'}
            >
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                  {examType} ACTIVE BLOCK
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Cloud Sync
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-black mt-1 leading-snug">
                Unified Mock Simulation
              </h1>
              <p className="text-[10px] text-zinc-600 mt-0.5 hidden md:block">
                ← → to navigate · A B C D to answer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${
              isSubmitted
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : timeLeft < 300
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 animate-pulse'
                  : 'bg-zinc-950 border-white/5 text-cyan-400'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm font-black font-mono tracking-widest">
                {isSubmitted ? 'SUBMITTED' : formatTimer(timeLeft)}
              </span>
            </div>

            {!isSubmitted && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl py-6 px-6 text-xs uppercase tracking-wider"
              >
                End & Submit
              </Button>
            )}
          </div>
        </header>

        {/* ── Subject Tabs ──────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subjects.map((sub, idx) => {
            const isSelected = idx === activeSubjectIndex;
            const answered   = getAnsweredCount(sub);
            const total      = sub.questions.length;

            return (
              <button
                key={sub.subject}
                onClick={() => {
                  setActiveSubjectIndex(idx);
                  setAiResponse(null);
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-cyan-500 shadow-md shadow-cyan-500/5'
                    : 'bg-zinc-900/40 border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider truncate max-w-[120px]">
                    {sub.subject}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">
                    {answered}/{total}
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-3 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isSelected ? 'bg-cyan-500' : 'bg-zinc-600'
                    }`}
                    style={{ width: `${(answered / Math.max(total, 1)) * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </section>

        {/* ── Main Content ──────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Question Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

              {/* Counter + bubbles */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                  Question {currentIndex + 1} of {activeSubject.questions.length}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSubject.questions.map((q: any, idx: number) => {
                    const isCurrent = idx === currentIndex;
                    const ans       = userAnswers[String(q.id)];
                    const isAns     = ans !== undefined;

                    let bubbleStyle = 'bg-zinc-950 border-white/5 text-zinc-500';
                    if (isCurrent) {
                      bubbleStyle = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                    } else if (isAns) {
                      bubbleStyle = 'bg-zinc-800 border-zinc-700 text-zinc-300';
                    }
                    if (isSubmitted && isAns) {
                      const isCorrect =
                        ans.toLowerCase().trim() ===
                        (q.answer ?? '').toLowerCase().trim();
                      bubbleStyle = isCorrect
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-rose-500/20 border-rose-500 text-rose-400';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(activeSubjectIndex, idx)}
                        className={`w-7 h-7 rounded-lg border text-[11px] font-mono flex items-center justify-center transition-all hover:scale-110 ${bubbleStyle}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passage */}
              {currentQuestion.passage && (
                <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl text-xs leading-relaxed text-zinc-300 max-h-[220px] overflow-y-auto">
                  <span className="font-black text-[9px] uppercase tracking-widest text-cyan-400 block mb-2">
                    Comprehension Passage
                  </span>
                  <div dangerouslySetInnerHTML={{ __html: currentQuestion.passage }} />
                </div>
              )}

              {/* Image */}
              {currentQuestion.image && (
                <div className="flex justify-center bg-white p-4 rounded-2xl border border-white/10 max-h-48 overflow-hidden">
                  <img
                    src={
                      currentQuestion.image.startsWith('http')
                        ? currentQuestion.image
                        : `https://questions.aloc.com.ng/storage/${currentQuestion.image}`
                    }
                    alt="Question Diagram"
                    className="max-h-40 object-contain"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Question text */}
              <div
                className="text-base md:text-xl font-bold tracking-tight text-white leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question ?? '' }}
              />

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.option &&
                  Object.entries(currentQuestion.option)
                    .filter(([, value]) => (value as string)?.trim() !== '')
                    .map(([key, value]) => {
                      const isSelected = currentAnswer === key;
                      const isCorrect  =
                        (currentQuestion.answer ?? '')
                          .toLowerCase().trim() === key.toLowerCase().trim();

                      let buttonStyle = 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10';
                      let badgeStyle  = 'bg-zinc-900 border-white/10 text-zinc-500';

                      if (!isSubmitted) {
                        if (isSelected) {
                          buttonStyle = 'bg-cyan-950/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/5';
                          badgeStyle  = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                        }
                      } else {
                        if (isCorrect) {
                          buttonStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
                          badgeStyle  = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black';
                        } else if (isSelected && !isCorrect) {
                          buttonStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                          badgeStyle  = 'bg-rose-500/20 border-rose-500 text-rose-400 font-black';
                        } else {
                          buttonStyle = 'bg-zinc-950/20 border-white/5 text-zinc-600 opacity-40';
                        }
                      }

                      return (
                        <button
                          key={key}
                          disabled={isSubmitted}
                          onClick={() => {
                            if (!isSubmitted) answerQuestion(currentQuestion.id, key);
                          }}
                          className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${buttonStyle}`}
                        >
                          <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs shrink-0 ${badgeStyle}`}>
                            {key.toUpperCase()}
                          </span>
                          <div
                            className="text-sm font-medium flex-1 pr-4"
                            dangerouslySetInnerHTML={{ __html: value as string }}
                          />
                          {isSubmitted && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          {isSubmitted && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      setCurrentIndex(activeSubjectIndex, currentIndex - 1);
                      setAiResponse(null);
                    }}
                    className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl disabled:opacity-30 text-xs font-bold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={currentIndex === activeSubject.questions.length - 1}
                    onClick={() => {
                      setCurrentIndex(activeSubjectIndex, currentIndex + 1);
                      setAiResponse(null);
                    }}
                    className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl disabled:opacity-30 text-xs font-bold flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {isSubmitted && (
                  <Button
                    onClick={() => queryTutorChuks(currentQuestion)}
                    disabled={isAiProcessing}
                    className="bg-cyan-600 hover:bg-cyan-500 font-black text-xs uppercase px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    {isAiProcessing ? 'Processing...' : 'Explain Solution'}
                  </Button>
                )}
              </div>
            </div>

            {/* Explanation */}
            {isSubmitted && currentQuestion.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/40 border border-emerald-500/10 p-6 rounded-3xl"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase mb-3">
                  <HelpCircle className="w-4 h-4" />
                  Syllabus Reference Solution
                </div>
                <div
                  className="text-zinc-300 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                />
              </motion.div>
            )}
          </div>

          {/* ── AI Panel ──────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            {!isSubmitted ? (
              <div className="bg-zinc-900 border border-dashed border-white/5 rounded-3xl p-6 text-center space-y-4">
                <Lock className="w-8 h-8 text-cyan-500/40 mx-auto animate-pulse" />
                <h3 className="font-extrabold text-sm uppercase text-zinc-300">
                  Tutor Link Encrypted
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Submit your exam to unlock Tutor Chuks diagnostics.
                </p>
                <div className="bg-zinc-950 rounded-2xl p-4 border border-white/5 text-left text-xs font-mono space-y-2">
                  <div className="text-[10px] text-zinc-400 uppercase font-black">
                    Live Diagnostics
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Answered:</span>
                    <span className="text-cyan-400 font-bold">
                      {answeredSessionQ} / {totalSessionQ}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Unanswered:</span>
                    <span className={`font-bold ${
                      unansweredCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {unansweredCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Time Left:</span>
                    <span className={`font-bold ${
                      timeLeft < 300 ? 'text-rose-400' : 'text-cyan-400'
                    }`}>
                      {formatTimer(timeLeft)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-500"
                      style={{
                        width: `${(answeredSessionQ / Math.max(totalSessionQ, 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-black text-sm uppercase">Tutor Chuks</h3>
                  </div>
                  {aiResponse && (
                    <button
                      onClick={() =>
                        isSpeaking
                          ? voiceService.stop()
                          : voiceService.speak(aiResponse?.answer ?? '')
                      }
                      className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 rounded-xl border border-white/5 transition-colors"
                    >
                      {isSpeaking
                        ? <VolumeX className="w-4 h-4 text-orange-400 animate-pulse" />
                        : <Volume2 className="w-4 h-4" />
                      }
                    </button>
                  )}
                </div>

                {isAiProcessing ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
                    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-xs text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                      Running Neural Inference...
                    </p>
                  </div>
                ) : aiResponse ? (
                  <div className="space-y-4">
                    <div className="text-xs text-zinc-300 bg-zinc-950 p-4 rounded-2xl border border-white/5 whitespace-pre-line leading-relaxed max-h-[280px] overflow-y-auto">
                      {aiResponse.answer}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 text-right">
                      via {aiResponse.provider} Network
                    </div>
                    <button
                      onClick={() => setAiResponse(null)}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-zinc-950/50 rounded-2xl border border-dashed border-white/5 text-zinc-500 text-xs">
                    Click{' '}
                    <span className="text-cyan-400 font-bold">Explain Solution</span>
                    {' '}on any question to get a full breakdown.
                  </div>
                )}

                {isSavingToDb && (
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                    <div className="w-3 h-3 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                    Saving to cloud...
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* AI Mistakes Diagnostic & Explanations */}
        {isSubmitted && (
          <div className="mt-8 bg-zinc-900 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
                  <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                  AI Diagnostics Desk
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Mistakes Analysis & AI Explanations
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Review each question you got wrong and let Tutor Chuks explain the concept.
                </p>
              </div>

              {failedQuestions.length > 0 && (
                <Button
                  onClick={explainAllFailed}
                  disabled={explainingAll}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase px-5 py-4 rounded-2xl flex items-center gap-2 disabled:opacity-40 shadow-lg shadow-rose-600/15"
                >
                  {explainingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing all...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      Explain All Mistakes
                    </>
                  )}
                </Button>
              )}
            </div>

            {failedQuestions.length === 0 ? (
              <div className="text-center py-10 space-y-3 bg-zinc-950/40 border border-emerald-500/10 rounded-2xl p-6">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-emerald-400 uppercase tracking-wider">
                  Flawless Run!
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  You got every single question correct! Brilliant performance. No failed questions to analyze.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {failedQuestions.map((item, index) => {
                  const q = item.question;
                  const explanation = failedExplanations[q.id];
                  const isLoading = loadingExplanations[q.id];

                  return (
                    <div
                      key={q.id}
                      className="bg-zinc-950/60 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 hover:border-white/10 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2.5 py-1 rounded-md tracking-wider">
                          {item.subject} · Mistake #{index + 1}
                        </span>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-500 font-mono">
                            Your Choice:{' '}
                            <span className="text-rose-400 font-bold uppercase">
                              {item.chosen}
                            </span>
                          </span>
                          <span className="text-zinc-600" aria-hidden="true">|</span>
                          <span className="text-zinc-500 font-mono">
                            Correct Answer:{' '}
                            <span className="text-emerald-400 font-bold uppercase">
                              {item.correct}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="space-y-3">
                        <div
                          className="text-sm md:text-base font-bold text-zinc-200 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: q.question }}
                        />

                        {/* Options list for context */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.option &&
                            Object.entries(q.option)
                              .filter(([, value]) => (value as string)?.trim() !== '')
                              .map(([key, value]) => {
                                const isUserAns = item.chosen === key;
                                const isCorrectAns = item.correct === key;
                                return (
                                  <div
                                    key={key}
                                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                                      isCorrectAns
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                                        : isUserAns
                                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                          : 'bg-zinc-900/40 border-white/5 text-zinc-400'
                                    }`}
                                  >
                                    <span className="font-bold uppercase">{key})</span>
                                    <span dangerouslySetInnerHTML={{ __html: value as string }} />
                                  </div>
                                );
                              })}
                        </div>
                      </div>

                      {/* AI Explanation Area */}
                      <div className="pt-4 border-t border-white/5">
                        {explanation ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                              <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                              Tutor Chuks Diagnostic Explanation:
                            </div>
                            <div className="text-xs text-zinc-300 bg-zinc-900/50 p-4 rounded-xl border border-white/5 whitespace-pre-line leading-relaxed">
                              {explanation.answer}
                            </div>
                            <div className="text-[9px] font-mono text-zinc-500 text-right">
                              via {explanation.provider} Network
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                              Understand this topic before the real exam.
                            </span>
                            <Button
                              onClick={() => explainFailedQuestion(q)}
                              disabled={isLoading}
                              className="bg-cyan-950/60 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 font-black text-xs uppercase px-4 py-3 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Querying AI...
                                </>
                              ) : (
                                <>
                                  <BrainCircuit className="w-3.5 h-3.5" />
                                  Explain Mistake
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Exit Warning ──────────────────────── */}
      <AnimatePresence>
        {showExitWarning && (
          <ExitWarningDialog
            onConfirm={() => {
              window.history.go(-2);
              setTimeout(() => navigate('/'), 50);
            }}
            onCancel={() => setShowExitWarning(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Submit ────────────────────── */}
      <AnimatePresence>
        {showConfirmDialog && (
          <ConfirmSubmitDialog
            unanswered={unansweredCount}
            onConfirm={() => {
              setShowConfirmDialog(false);
              handleSubmit();
            }}
            onCancel={() => setShowConfirmDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Results Modal ─────────────────────── */}
      <AnimatePresence>
        {showResultsModal && frozenResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-zinc-900 border border-white/10 max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  CBT Simulation Complete
                </h2>
                <p className="text-xs text-zinc-500">
                  {isSavingToDb
                    ? 'Saving results to your profile...'
                    : 'Results saved to your neural cloud profile.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider block">Score</span>
                  <span className={`text-2xl font-black block mt-1 ${
                    frozenResult.scorePercent >= 70
                      ? 'text-emerald-400'
                      : frozenResult.scorePercent >= 50
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                  }`}>
                    {frozenResult.scorePercent}%
                  </span>
                </div>
                <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider block">Correct</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {frozenResult.correctAnswers}
                    <span className="text-xs text-zinc-500 font-normal">
                      /{frozenResult.totalQuestions}
                    </span>
                  </span>
                </div>
                <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider block">XP Earned</span>
                  <span className="text-2xl font-black text-amber-400 block mt-1">
                    +{frozenResult.xpEarned}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Subject Breakdown
                </span>
                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                  {frozenResult.subjectBreakdown.map(sub => (
                    <div key={sub.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs bg-zinc-950 px-3 py-2 border border-white/5 rounded-xl">
                        <span className="uppercase font-medium text-zinc-300 truncate max-w-[150px]">
                          {sub.subject}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-zinc-500 font-mono text-[10px]">
                            {sub.correct}/{sub.total}
                          </span>
                          <span className={`font-black font-mono w-10 text-right ${
                            sub.percent >= 70
                              ? 'text-emerald-400'
                              : sub.percent >= 50
                                ? 'text-cyan-400'
                                : 'text-rose-400'
                          }`}>
                            {sub.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            sub.percent >= 70
                              ? 'bg-emerald-500'
                              : sub.percent >= 50
                                ? 'bg-cyan-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${sub.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1 py-4 border-white/10 hover:bg-zinc-800 text-xs text-white uppercase font-black tracking-wider rounded-2xl"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={() => setShowResultsModal(false)}
                  className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs uppercase font-black tracking-wider rounded-2xl"
                >
                  Review Questions
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
