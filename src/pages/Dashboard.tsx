/// <reference types="vite/client" />
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNeuralVaultStore } from '@/src/store/useNeuralVaultStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import {
  Zap,
  Target,
  Compass,
  Award,
  ChevronRight,
  ShieldCheck,
  Brain,
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ── Module-level constants ──────────────────────────────────
const MAX_RETRIES = 3;

// ✅ FIX 1: Native Vite env using standard triple-slash reference directive at the top
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Pure utility functions ──────────────────────────────────
function roundScore(score: number): number {
  return Math.round(score);
}

function getReadinessLabel(score: number): string {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Advanced';
  if (score >= 50) return 'Developing';
  return 'Beginner';
}

function getScoreFeedback(score: number | null): string {
  if (score === null) return 'No mock exams completed yet. Start practicing!';
  if (score >= 85) return '🎉 Excellent! You are well on track for admission.';
  if (score >= 70) return 'Good progress! Aim for 85% to secure your dream course.';
  if (score >= 50) return 'Keep going! Consistent practice will push your score up.';
  return 'Early days! Focus on your weak subjects and keep practicing.';
}

// ── Component ───────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const currentSession = useNeuralVaultStore((s) => s.currentSession);
  const hydrateSession = useNeuralVaultStore((s) => s.hydrateSession);

  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);
  
  // Track retry count in state for visual representation
  const [retryCount, setRetryCount] = useState(0);

  const isInitialLoadDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // ✅ FIX 2 & 3: Stable ref tracking for retries to prevent re-creating loadDashboard callback
  const retryCountRef = useRef(0);

  const fetchResults = useCallback(async (signal: AbortSignal) => {
    setScoreError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/practice/session/results`,
        { signal }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const results: any[] = data.results ?? [];

      if (results.length > 0) {
        const scores = results.map((r: any) => {
          const val = Number(r.finalScore ?? r.score ?? 0);
          return isNaN(val) ? 0 : val;
        });
        setHighScore(roundScore(Math.max(...scores)));
      } else {
        setHighScore(null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to load score history:', err);
      setScoreError('Could not load your score history.');
    }
  }, []);

  // ✅ FIX 2 & 3: loadDashboard is stable without retryCount dependency
  const loadDashboard = useCallback(
    async (isRetry: boolean) => {
      if (isRetry) {
        if (retryCountRef.current >= MAX_RETRIES) {
          setSessionError(
            `Maximum retries reached (${MAX_RETRIES}). Please refresh the page.`
          );
          return;
        }
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        setIsRetrying(true);
      } else {
        setIsLoading(true);
      }

      setSessionError(null);

      // ✅ FIX 7: Guard aborting previous fetch only if initial load was already completed
      if (isInitialLoadDone.current) {
        abortRef.current?.abort();
      }
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      // ✅ FIX 4: Cleaner, unified execution using Promise.allSettled and direct rejection check
      const results = await Promise.allSettled([
        hydrateSession(),
        fetchResults(signal),
      ]);

      if (results[0].status === 'rejected') {
        console.error('hydrateSession failed:', results[0].reason);
        setSessionError('Failed to load your session. Please try again.');
      }

      setIsLoading(false);
      setIsRetrying(false);
      isInitialLoadDone.current = true;
    },
    [hydrateSession, fetchResults]
  );

  // Initial load — runs exactly once because loadDashboard is highly stable
  useEffect(() => {
    loadDashboard(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [loadDashboard]);

  // Refresh score on tab focus — only after initial load is fully completed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isInitialLoadDone.current
      ) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        fetchResults(abortRef.current.signal);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchResults]);

  // ── Derived values ──────────────────────────────────────
  const hasRunningActiveSession = useMemo(
    () => !!(currentSession && !currentSession.isSubmitted),
    [currentSession]
  );

  const sessionSubjectsLabel = useMemo(() => {
    // ✅ FIX 5: Simplified - map guaranteed strings directly without dead filter logic
    if (!currentSession?.subjects?.length) return 'Session Active';
    const label = currentSession.subjects
      .map((s: any) => s?.subject ?? 'Unknown')
      .join(' + ');
    return label || 'Session Active';
  }, [currentSession]);

  // ✅ FIX 6: Consistently memoized to prevent unnecessary re-computations
  const scoreFeedback = useMemo(() => getScoreFeedback(highScore), [highScore]);

  const firstName = useMemo(() => {
    if (!user) return null;
    const raw =
      (user as any).user_metadata?.full_name ??
      (user as any).user_metadata?.name ??
      (user as any).email?.split('@')[0] ??
      null;
    return raw ? String(raw).split(' ')[0] : null;
  }, [user]);

  // ── Loading screen ────────────────────────────────────────
  if (isLoading) {
    return (
      // ✅ FIX 8: Added role="status" and accessibility details for screen readers
      <div
        role="status"
        aria-label="Loading dashboard"
        className="flex items-center justify-center min-h-full w-full"
      >
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2
            className="w-8 h-8 animate-spin text-cyan-500"
            aria-hidden="true"
          />
          <p className="text-sm font-bold uppercase tracking-widest">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ── Session error screen ──────────────────────────────────
  if (sessionError && !currentSession) {
    return (
      <div
        role="alert"
        className="flex items-center justify-center min-h-full w-full p-8"
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-zinc-300">{sessionError}</p>
          <p className="text-xs text-zinc-500">
            Retry {retryCount} / {MAX_RETRIES}
          </p>
          <Button
            onClick={() => loadDashboard(true)}
            disabled={isRetrying || retryCount >= MAX_RETRIES}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-xl px-6 py-3 text-sm flex items-center gap-2"
          >
            {isRetrying ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 text-white min-h-full w-full font-sans selection:bg-cyan-500/30">

      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-8 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.15)_0%,_transparent_75%)] pointer-events-none"
        />

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
            <Zap className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            Personal Exam Prep Terminal
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            {firstName
              ? `Welcome back, ${firstName}.`
              : 'Smart CBT Dashboard'}
          </h1>

          <p className="text-zinc-400 mt-2 text-sm md:text-base">
            Master your exams with real past questions, complete offline
            practice, and instant virtual tutor guidance.
          </p>
        </div>

        {/* ✅ FIX 9: Proper role="region" landmark with descriptive label on simulation panel */}
        {hasRunningActiveSession && (
          <motion.div
            role="region"
            aria-label="Active exam simulation"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-3xl w-full md:w-auto"
          >
            <div className="relative shrink-0" aria-hidden="true">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                Simulation in Progress
              </h4>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate max-w-[160px]">
                {sessionSubjectsLabel}
              </p>
            </div>

            <Button
              onClick={() => navigate('/arena')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1 shrink-0"
            >
              Resume Arena
            </Button>
          </motion.div>
        )}
      </header>

      {/* CTA */}
      <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.12)_0%,_transparent_75%)] pointer-events-none"
        />

        <div className="space-y-3 max-w-xl">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400 w-fit">
            <Compass className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            CBT Exam Configurator
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Configure single subjects or complete 4-subject JAMB blocks with
            unified timing. Enter exam simulations featuring active question
            masking.
          </p>
        </div>

        <Button
          onClick={() => navigate('/practice')}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl px-8 py-6 flex items-center gap-2 text-sm shadow-xl shadow-cyan-600/15 group shrink-0"
        >
          Go to Practice Configurator
          <ChevronRight
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            aria-hidden="true"
          />
        </Button>
      </section>

      {/* METRICS */}
      <section
        aria-label="Performance metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2">
          <Award className="w-5 h-5 text-amber-500" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">
            Readiness Level
          </span>
          <span className="text-3xl font-black text-white block">
            {highScore !== null ? getReadinessLabel(highScore) : '—'}
          </span>
          <p className="text-[11px] text-zinc-400">
            {highScore !== null
              ? `Based on your ${highScore}% best mock score.`
              : 'Complete a mock exam to see your level.'}
          </p>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2">
          <Target className="w-5 h-5 text-rose-500" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">
            Best Mock Score
          </span>
          <span className="text-3xl font-black text-cyan-400 block">
            {highScore !== null ? `${highScore}%` : '—'}
          </span>
          <p
            aria-live="polite"
            className={`text-[11px] flex items-center gap-1 ${
              scoreError ? 'text-rose-400' : 'text-zinc-400'
            }`}
          >
            {scoreError && (
              <AlertCircle
                className="w-3 h-3 shrink-0"
                aria-hidden="true"
              />
            )}
            {scoreError ?? scoreFeedback}
          </p>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2">
          <ShieldCheck
            className="w-5 h-5 text-emerald-500"
            aria-hidden="true"
          />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">
            Offline Access
          </span>
          <span className="text-3xl font-black text-emerald-400 block">
            Active
          </span>
          <p className="text-[11px] text-zinc-400">
            Practice history saved locally — no internet needed.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section
        aria-label="App features"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
      >
        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Brain className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-base text-zinc-200">
              Up-to-Date Syllabus
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Questions sync with official JAMB, WAEC, and NECO syllabus
            targets. Keep your sessions accurate and relevant.
          </p>
          {/* ✅ FIX 10: Explicit type="button" to prevent accidental submits */}
          <button
            type="button"
            onClick={() => navigate('/practice')}
            className="text-xs font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            Start Practicing
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/25 text-emerald-400">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-base text-zinc-200">
              Personalized AI Tutor
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Get instant step-by-step explanations after each session. Your
            AI tutor clarifies concepts and helps you tackle hard questions.
          </p>
          {/* ✅ FIX 10: Explicit type="button" to prevent accidental submits */}
          <button
            type="button"
            onClick={() => navigate('/tutor')}
            className="text-xs font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            Ask AI Tutor
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
