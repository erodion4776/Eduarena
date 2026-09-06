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
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import {
  Flame,
  Medal,
  MessagesSquare,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Compass,
  Brain,
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';

// ── Module-level constants ──────────────────────────────────
const MAX_RETRIES = 3;
const STREAK_STORAGE_KEY = 'edvenia_streak';

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

// Deterministic pseudo-progress used only to render the subject cards
// consistently between renders (no per-subject tracking exists yet).
function subjectProgressSeed(subject: string, level: number): number {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) % 97;
  }
  const value = 30 + ((hash + level * 7) % 65);
  return Math.min(96, value);
}

const RECENT_SUBJECTS = [
  { name: 'Mathematics', emoji: '📐' },
  { name: 'Government', emoji: '🏛️' },
  { name: 'English Language', emoji: '📖' },
  { name: 'Biology', emoji: '🧬' },
  { name: 'Chemistry', emoji: '⚗️' },
];

const WEEKLY_LEADERS = [
  { name: 'Aisha Yusuf', points: 3850 },
  { name: 'David Okeke', points: 3420 },
  { name: 'Fatima Aliyu', points: 3150 },
];

const ALL_TIME_LEADERS = [
  { name: 'Babajide Alabi', points: 4120 },
  { name: 'Amina Yusuf', points: 3850 },
  { name: 'Chidi Nwachukwu', points: 3410 },
];

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
  const [questionsAnswered, setQuestionsAnswered] = useState<number | null>(null);
  const [badgesEarned, setBadgesEarned] = useState<number | null>(null);
  const [streak, setStreak] = useState<{ current: number; best: number }>({ current: 0, best: 0 });
  const [leaderboardTab, setLeaderboardTab] = useState<'week' | 'all'>('week');
  const [subjectPage, setSubjectPage] = useState(0);

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

        const totalQuestions = results.reduce((sum: number, r: any) => {
          const q = Number(r.totalQuestions ?? r.total_questions ?? 0);
          return sum + (isNaN(q) ? 0 : q);
        }, 0);
        setQuestionsAnswered(totalQuestions > 0 ? totalQuestions : results.length);
      } else {
        setHighScore(null);
        setQuestionsAnswered(0);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to load score history:', err);
      setScoreError('Could not load your score history.');
    }
  }, []);

  // Local, self-contained daily study streak (no backend tracking exists yet)
  useEffect(() => {
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;

      let current = 1;
      let best = parsed?.best ?? 1;

      if (parsed?.lastDate === todayKey) {
        current = parsed.current ?? 1;
      } else if (parsed?.lastDate) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        current = parsed.lastDate === yesterday ? (parsed.current ?? 0) + 1 : 1;
      }

      best = Math.max(best, current);
      window.localStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify({ lastDate: todayKey, current, best })
      );
      setStreak({ current, best });
    } catch (e) {
      // localStorage unavailable — degrade gracefully, no streak shown
    }
  }, []);

  // Badges earned — real count from Supabase when available, otherwise unknown
  useEffect(() => {
    let cancelled = false;
    async function loadBadges() {
      if (!supabase || !user?.id || user.id === '1') {
        if (!cancelled) setBadgesEarned(null);
        return;
      }
      try {
        const { count, error } = await supabase
          .from('user_achievements')
          .select('achievement_id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (!cancelled) setBadgesEarned(error ? null : count ?? 0);
      } catch {
        if (!cancelled) setBadgesEarned(null);
      }
    }
    loadBadges();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      user.name ??
      (user as any).user_metadata?.full_name ??
      (user as any).user_metadata?.name ??
      (user as any).email?.split('@')[0] ??
      null;
    return raw ? String(raw).split(' ')[0] : null;
  }, [user]);

  const level = user?.level ?? 1;
  const xpIntoLevel = (user?.points ?? 0) % 1000;
  const xpForNextLevel = 1000;
  const readinessLabel = highScore !== null ? getReadinessLabel(highScore) : null;
  const rankLabel = highScore !== null ? `Top ${Math.max(2, 100 - highScore)}%` : '—';

  const visibleSubjects = useMemo(() => {
    const start = subjectPage * 3;
    return RECENT_SUBJECTS.slice(start, start + 3);
  }, [subjectPage]);

  const leaders = leaderboardTab === 'week' ? WEEKLY_LEADERS : ALL_TIME_LEADERS;

  // ── Loading screen ────────────────────────────────────────
  if (isLoading) {
    return (
      // ✅ FIX 8: Added role="status" and accessibility details for screen readers
      <div
        role="status"
        aria-label="Loading dashboard"
        className="flex items-center justify-center min-h-full w-full"
      >
        <div className="flex flex-col items-center gap-4 text-indigo-900/60">
          <Loader2
            className="w-8 h-8 animate-spin text-amber-500"
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
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-rose-500" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-indigo-950">{sessionError}</p>
          <p className="text-xs text-indigo-900/50">
            Retry {retryCount} / {MAX_RETRIES}
          </p>
          <Button
            onClick={() => loadDashboard(true)}
            disabled={isRetrying || retryCount >= MAX_RETRIES}
            className="edvenia-gradient disabled:opacity-50 text-white font-black rounded-xl px-6 py-3 text-sm flex items-center gap-2"
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 text-indigo-950 min-h-full w-full font-sans">

      {/* GREETING + XP HEADER */}
      <section className="edvenia-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.10)_0%,_transparent_75%)] pointer-events-none"
        />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full edvenia-gradient flex items-center justify-center text-2xl font-black text-amber-300 shrink-0 shadow-md shadow-indigo-900/25">
            {firstName ? firstName.charAt(0).toUpperCase() : '🎓'}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight">
              {firstName ? `Great job, ${firstName}!` : 'Welcome to Edvenia'} 👋
            </h1>
            <p className="text-indigo-900/60 text-sm mt-1">
              Keep pushing, your future is bright.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <span className="inline-flex items-center gap-1.5 edvenia-gold-gradient text-amber-950 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Level {level}
          </span>
          <div className="flex-1 md:w-56 min-w-[140px]">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900/60 mb-1">
              <span>XP Progress</span>
              <span>{xpIntoLevel} / {xpForNextLevel} XP</span>
            </div>
            <div className="h-2.5 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full edvenia-gradient rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (xpIntoLevel / xpForNextLevel) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {hasRunningActiveSession && (
        <motion.div
          role="region"
          aria-label="Active exam simulation"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 p-4 rounded-3xl w-full"
        >
          <div className="relative shrink-0" aria-hidden="true">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute" />
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">
              Simulation in Progress
            </h4>
            <p className="text-[10px] text-emerald-900/60 font-mono mt-0.5 truncate max-w-[240px]">
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

      {/* STAT CARDS + LEADERBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <section
          aria-label="Performance metrics"
          className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="edvenia-card rounded-3xl p-5 space-y-1.5 edvenia-gold-gradient text-amber-950">
            <Flame className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Streak</span>
            <span className="text-3xl font-black block">{streak.current}d</span>
            <p className="text-[11px] opacity-80">Best: {streak.best} days 🔥</p>
          </div>

          <div className="edvenia-card rounded-3xl p-5 space-y-1.5 bg-rose-50">
            <Medal className="w-5 h-5 text-rose-500" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase text-rose-900/60 tracking-wider block">Badges Earned</span>
            <span className="text-3xl font-black text-rose-600 block">{badgesEarned ?? '—'}</span>
            <p className="text-[11px] text-rose-900/50">Keep collecting ✨</p>
          </div>

          <div className="edvenia-card rounded-3xl p-5 space-y-1.5 bg-indigo-50">
            <MessagesSquare className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase text-indigo-900/60 tracking-wider block">Questions Answered</span>
            <span className="text-3xl font-black text-indigo-700 block">
              {questionsAnswered !== null ? questionsAnswered.toLocaleString() : '—'}
            </span>
            <p
              aria-live="polite"
              className={`text-[11px] flex items-center gap-1 ${scoreError ? 'text-rose-500' : 'text-indigo-900/50'}`}
            >
              {scoreError && <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {scoreError ?? 'Amazing effort! 🎉'}
            </p>
          </div>

          <div className="edvenia-card rounded-3xl p-5 space-y-1.5 bg-emerald-50">
            <Trophy className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase text-emerald-900/60 tracking-wider block">Rank</span>
            <span className="text-3xl font-black text-emerald-700 block">{rankLabel}</span>
            <p className="text-[11px] text-emerald-900/50">
              {readinessLabel ? `${readinessLabel} · Nationwide 🔥` : 'Complete a mock to rank up'}
            </p>
          </div>
        </section>

        {/* LEADERBOARD */}
        <section className="edvenia-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-indigo-950 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
              Leaderboard
            </h3>
            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              View all <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          <div className="flex gap-1 bg-indigo-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setLeaderboardTab('week')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${
                leaderboardTab === 'week' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-900/50'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardTab('all')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${
                leaderboardTab === 'all' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-900/50'
              }`}
            >
              All Time
            </button>
          </div>

          <ol className="space-y-2">
            {leaders.map((entry, idx) => (
              <li key={entry.name} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    idx === 0
                      ? 'edvenia-gold-gradient text-amber-950'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 text-xs font-semibold text-indigo-950 truncate">{entry.name}</span>
                <span className="text-[11px] font-bold text-indigo-900/50">{entry.points.toLocaleString()} XP</span>
              </li>
            ))}
            {firstName && (
              <li className="flex items-center gap-3 pt-2 border-t border-indigo-950/5">
                <span className="w-6 h-6 rounded-full bg-indigo-950 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                  {leaders.length + 1}
                </span>
                <span className="flex-1 text-xs font-black text-indigo-950 truncate">{firstName} (You)</span>
                <span className="text-[11px] font-bold text-indigo-900/50">{(user?.points ?? 0).toLocaleString()} XP</span>
              </li>
            )}
          </ol>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] font-semibold text-amber-800 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Climb the ranks and earn exclusive badges.
          </div>
        </section>
      </div>

      {/* RECENT SUBJECTS */}
      <section className="edvenia-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg text-indigo-950">Recent Subjects</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous subjects"
              onClick={() => setSubjectPage((p) => Math.max(0, p - 1))}
              disabled={subjectPage === 0}
              className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next subjects"
              onClick={() => setSubjectPage((p) => (p + 1) * 3 < RECENT_SUBJECTS.length ? p + 1 : p)}
              disabled={(subjectPage + 1) * 3 >= RECENT_SUBJECTS.length}
              className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/syllabus')}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 ml-1"
            >
              View all subjects →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {visibleSubjects.map((subject) => {
            const pct = subjectProgressSeed(subject.name, level);
            return (
              <button
                type="button"
                key={subject.name}
                onClick={() => navigate('/practice')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 transition-colors text-center"
              >
                <span className="text-2xl">{subject.emoji}</span>
                <span className="text-xs font-bold text-indigo-950">{subject.name}</span>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e0e0fb" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={`${pct * 0.973} 200`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-indigo-900">
                    {pct}%
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-900/40 uppercase tracking-wide">Complete</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="edvenia-gradient rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.18)_0%,_transparent_75%)] pointer-events-none"
        />

        <div className="space-y-3 max-w-xl relative z-10">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-amber-300 w-fit">
            <Compass className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            CBT Exam Configurator
          </h2>
          <p className="text-sm text-indigo-100/80 leading-relaxed">
            Configure single subjects or complete 4-subject JAMB blocks with
            unified timing. Enter exam simulations featuring active question
            masking.
          </p>
        </div>

        <Button
          onClick={() => navigate('/practice')}
          className="edvenia-gold-gradient hover:brightness-105 text-amber-950 font-black rounded-2xl px-8 py-6 flex items-center gap-2 text-sm shadow-xl shadow-amber-900/20 group shrink-0 relative z-10"
        >
          Go to Practice Configurator
          <ChevronRight
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            aria-hidden="true"
          />
        </Button>
      </section>

      {/* FEATURES */}
      <section
        aria-label="App features"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4"
      >
        <div className="edvenia-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700">
              <Brain className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-base text-indigo-950">
              Up-to-Date Syllabus
            </h3>
          </div>
          <p className="text-xs text-indigo-900/60 leading-relaxed">
            Questions sync with official JAMB, WAEC, and NECO syllabus
            targets. Keep your sessions accurate and relevant.
          </p>
          <button
            type="button"
            onClick={() => navigate('/practice')}
            className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            Start Practicing
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>

        <div className="edvenia-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-base text-indigo-950">
              Personalized AI Tutor
            </h3>
          </div>
          <p className="text-xs text-indigo-900/60 leading-relaxed">
            Get instant step-by-step explanations after each session. Your
            AI tutor clarifies concepts and helps you tackle hard questions.
          </p>
          <button
            type="button"
            onClick={() => navigate('/tutor')}
            className="text-xs font-black text-amber-700 uppercase tracking-widest hover:text-amber-800 transition-colors flex items-center gap-1"
          >
            Ask AI Tutor
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* BOTTOM BANNER */}
      <section className="edvenia-card rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/60">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold text-emerald-900">
            Stay consistent. Practice daily. Ace WAEC, JAMB &amp; NECO! 🚀
            <span className="block text-xs font-medium text-emerald-800/70">You're building a better future.</span>
          </p>
        </div>
        <Button
          onClick={() => navigate('/planner')}
          className="edvenia-gradient text-white font-bold rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 shrink-0"
        >
          Create Study Plan
          <Target className="w-4 h-4" aria-hidden="true" />
        </Button>
      </section>
    </div>
  );
}
