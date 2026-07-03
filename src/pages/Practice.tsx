import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useNeuralVaultStore } from '@/src/store/useNeuralVaultStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import {
  Zap,
  Layers,
  Check,
  Clock,
  Play,
  Sparkles,
  Award,
  ShieldAlert,
  History,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

// ── Module-level constants ──────────────────────────────────
const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO'] as const;
type ExamType = typeof EXAM_TYPES[number];

const FALLBACK_SUBJECTS: SubjectDef[] = [
  { id: 'english',     name: 'Use of English',       icon: '📝', color: 'text-cyan-400 bg-cyan-950/20' },
  { id: 'mathematics', name: 'Mathematics',           icon: '🧮', color: 'text-emerald-400 bg-emerald-950/30' },
  { id: 'physics',     name: 'Physics',               icon: '⚡', color: 'text-purple-400 bg-purple-950/20' },
  { id: 'chemistry',   name: 'Chemistry',             icon: '🧪', color: 'text-amber-400 bg-amber-950/20' },
  { id: 'biology',     name: 'Biology',               icon: '🧬', color: 'text-rose-400 bg-rose-950/20' },
  { id: 'economics',   name: 'Economics',             icon: '📈', color: 'text-indigo-400 bg-indigo-950/20' },
  { id: 'government',  name: 'Government',            icon: '🏛️', color: 'text-orange-400 bg-orange-950/20' },
  { id: 'literature',  name: 'Literature in English', icon: '📚', color: 'text-pink-400 bg-pink-950/20' },
  { id: 'geography',   name: 'Geography',             icon: '🌍', color: 'text-teal-400 bg-teal-950/20' },
  { id: 'history',     name: 'History',               icon: '🏺', color: 'text-yellow-400 bg-yellow-950/20' },
  { id: 'commerce',    name: 'Commerce',              icon: '💼', color: 'text-blue-400 bg-blue-950/20' },
  { id: 'accounting',  name: 'Financial Accounting',  icon: '🧾', color: 'text-green-400 bg-green-950/20' },
  { id: 'crk',         name: 'CRK',                  icon: '✝️', color: 'text-sky-400 bg-sky-950/20' },
  { id: 'irk',         name: 'Islamic Studies',       icon: '☪️', color: 'text-lime-400 bg-lime-950/20' },
  { id: 'agric',       name: 'Agricultural Science',  icon: '🌱', color: 'text-green-500 bg-green-950/20' },
  { id: 'technical',   name: 'Technical Drawing',     icon: '📐', color: 'text-violet-400 bg-violet-950/20' },
  { id: 'french',      name: 'French',                icon: '🇫🇷', color: 'text-blue-300 bg-blue-950/20' },
  { id: 'yoruba',      name: 'Yoruba',                icon: '🗣️', color: 'text-amber-300 bg-amber-950/20' },
  { id: 'igbo',         name: 'Igbo',                   icon: '🗣️', color: 'text-red-400 bg-red-950/20' },
  { id: 'hausa',       name: 'Hausa',                 icon: '🗣️', color: 'text-emerald-300 bg-emerald-950/20' },
];

const DEFAULT_MULTI_SUBJECTS = ['english', 'mathematics', 'physics', 'chemistry'];
const DEFAULT_SINGLE_SUBJECT = ['english'];

// ── Types ───────────────────────────────────────────────────
interface SubjectDef {
  id: string;
  supabaseId?: string;
  name: string;
  icon: string;
  color: string;
}

interface Topic {
  id: string;
  topic_name: string;
  subject_id: string;
  exam_type: string;
}

interface RecentSession {
  id?: string;
  subject: string;
  score?: number;
  timestamp?: string;
}

// ── Component ───────────────────────────────────────────────
export default function Practice() {
  const navigate = useNavigate();

  const currentSession = useNeuralVaultStore((s) => s.currentSession);
  const initiateSession = useNeuralVaultStore((s) => s.initiateSession);
  const hydrateSession = useNeuralVaultStore((s) => s.hydrateSession);

  const [examType, setExamType] = useState<ExamType>('JAMB');
  const [sessionMode, setSessionMode] = useState<'single' | 'multi'>('multi');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(DEFAULT_MULTI_SUBJECTS);

  const [availableTopics, setAvailableTopics] = useState<Record<string, Topic[]>>({});
  const [selectedTopics, setSelectedTopics] = useState<Record<string, string[]>>({});
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [topicsLoading, setTopicsLoading] = useState<Record<string, boolean>>({});

  const [availableSubjects, setAvailableSubjects] = useState<SubjectDef[]>(FALLBACK_SUBJECTS);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [duration, setDuration] = useState(120);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Use ref for topics cache so fetchTopicsForSubject is stable and avoids dependency cycles
  const availableTopicsRef = useRef<Record<string, Topic[]>>({});

  const setTopicsCache = useCallback(
    (subjectId: string, topics: Topic[]) => {
      availableTopicsRef.current = {
        ...availableTopicsRef.current,
        [subjectId]: topics,
      };
      setAvailableTopics({ ...availableTopicsRef.current });
    },
    []
  );

  // ── Initial data load ─────────────────────────────────────
  useEffect(() => {
    hydrateSession();

    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    const fetchHistories = async () => {
      try {
        const res = await fetch('/api/stats', { signal });
        if (res.ok) {
          const data = await res.json();
          if (data?.recentPractices) {
            setRecentSessions(data.recentPractices.slice(0, 5));
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.warn('Stats fetch failed:', e);
      }
    };

    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        if (!supabase) {
          setAvailableSubjects(FALLBACK_SUBJECTS);
          return;
        }

        const { data, error } = await supabase
          .from('subjects')
          .select('id, name, icon, color')
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          const seen = new Set<string>();
          const mapped: SubjectDef[] = [];

          for (const s of data) {
            const fallback = FALLBACK_SUBJECTS.find(
              (f) =>
                f.name.toLowerCase() === s.name.toLowerCase() ||
                f.id === s.name.toLowerCase()
            );
            const localId = fallback
              ? fallback.id
              : s.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            if (!seen.has(localId)) {
              seen.add(localId);
              mapped.push({
                id: localId,
                supabaseId: s.id,
                name: s.name,
                icon: s.icon ?? fallback?.icon ?? '📖',
                color: s.color ?? fallback?.color ?? 'text-zinc-400 bg-zinc-950/20',
              });
            }
          }

          setAvailableSubjects(mapped);

          setSelectedSubjects((prev) => {
            const validIds = new Set(mapped.map((s) => s.id));
            const stillValid = prev.filter((id) => validIds.has(id));
            return stillValid.length > 0 ? stillValid : [mapped[0]?.id ?? 'english'];
          });
        } else {
          setAvailableSubjects(FALLBACK_SUBJECTS);
        }
      } catch (err) {
        console.warn('Subject fetch failed, using fallback:', err);
        setAvailableSubjects(FALLBACK_SUBJECTS);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchHistories();
    fetchSubjects();

    return () => {
      abortRef.current?.abort();
    };
  }, [hydrateSession]);

  // fetchTopicsForSubject is stable — no availableTopics state in deps
  const fetchTopicsForSubject = useCallback(
    async (subjectId: string, currentExamType: ExamType) => {
      if (availableTopicsRef.current[subjectId]) return;

      const subDef = availableSubjects.find((s) => s.id === subjectId);
      const supabaseId = subDef?.supabaseId;

      if (!supabaseId || !supabase) {
        setTopicsCache(subjectId, []);
        return;
      }

      setTopicsLoading((prev) => ({ ...prev, [subjectId]: true }));

      try {
        const { data, error } = await supabase
          .from('topics')
          .select('id, name, subject_id')
          .eq('subject_id', supabaseId)
          .order('name');

        if (error) throw error;

        const mapped: Topic[] = (data ?? []).map((t: any) => ({
          id: t.id,
          topic_name: t.name,
          subject_id: subjectId,
          exam_type: currentExamType,
        }));

        setTopicsCache(subjectId, mapped);
      } catch (err) {
        console.error(`Failed to fetch topics for ${subjectId}:`, err);
        toast.error('Could not load topics for this subject.');
        setTopicsCache(subjectId, []);
      } finally {
        setTopicsLoading((prev) => ({ ...prev, [subjectId]: false }));
      }
    },
    [availableSubjects, setTopicsCache]
  );

  // Clear topic cache when examType changes so fresh data loads
  useEffect(() => {
    availableTopicsRef.current = {};
    setAvailableTopics({});
    setSelectedTopics({});
    setExpandedSubject(null);
  }, [examType]);

  // ── Mode toggle ───────────────────────────────────────────
  const prevModeRef = useRef<'single' | 'multi' | null>(null);

  useEffect(() => {
    if (prevModeRef.current === null) {
      prevModeRef.current = sessionMode;
      return;
    }
    if (prevModeRef.current === sessionMode) return;
    prevModeRef.current = sessionMode;

    if (sessionMode === 'single') {
      setSelectedSubjects(DEFAULT_SINGLE_SUBJECT);
      setDuration(40);
    } else {
      setSelectedSubjects(DEFAULT_MULTI_SUBJECTS);
      setDuration(120);
    }
    setSelectedTopics({});
    setExpandedSubject(null);
  }, [sessionMode]);

  // ── Subject toggle ────────────────────────────────────────
  const handleSubjectToggle = useCallback(
    (subId: string) => {
      if (sessionMode === 'single') {
        setSelectedSubjects([subId]);
        setSelectedTopics({});
        setExpandedSubject(subId);
        fetchTopicsForSubject(subId, examType);
        return;
      }

      setSelectedSubjects((prev) => {
        if (prev.includes(subId)) {
          if (prev.length <= 1) {
            toast.error('You must select at least 1 subject');
            return prev;
          }
          setSelectedTopics((t) => {
            const copy = { ...t };
            delete copy[subId];
            return copy;
          });
          return prev.filter((s) => s !== subId);
        }

        if (prev.length >= 4) {
          toast.error('Maximum 4 subjects for a JAMB block');
          return prev;
        }

        return [...prev, subId];
      });

      if (!selectedSubjects.includes(subId) && selectedSubjects.length < 4) {
        fetchTopicsForSubject(subId, examType);
      }
    },
    [sessionMode, examType, fetchTopicsForSubject, selectedSubjects]
  );

  const handleTopicToggle = useCallback(
    (subjectId: string, topicId: string) => {
      setSelectedTopics((prev) => {
        const current = prev[subjectId] ?? [];
        const updated = current.includes(topicId)
          ? current.filter((t) => t !== topicId)
          : [...current, topicId];
        return { ...prev, [subjectId]: updated };
      });
    },
    []
  );

  const handleSelectAllTopics = useCallback(
    (subjectId: string) => {
      const topics = availableTopicsRef.current[subjectId] ?? [];
      setSelectedTopics((prev) => ({
        ...prev,
        [subjectId]: topics.map((t) => t.id),
      }));
    },
    []
  );

  const handleExpandSubject = useCallback(
    async (subId: string) => {
      if (expandedSubject === subId) {
        setExpandedSubject(null);
        return;
      }
      try {
        await fetchTopicsForSubject(subId, examType);
        setExpandedSubject(subId);
      } catch (err) {
        console.error('Failed to expand subject topics:', err);
        toast.error('Could not load topics. Please try again.');
      }
    },
    [expandedSubject, examType, fetchTopicsForSubject]
  );

  const handleLaunchSession = useCallback(async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please pick at least one subject to start.');
      return;
    }

    if (sessionMode === 'multi' && selectedSubjects.length !== 4) {
      toast.message(
        `Note: Standard JAMB uses 4 subjects. Running with ${selectedSubjects.length}.`
      );
    }

    setLoading(true);
    try {
      const subjectTopicContext = selectedSubjects.map((subId) => {
        const subDef = availableSubjects.find((s) => s.id === subId);
        const topicIds = selectedTopics[subId] ?? [];
        const cachedTopics = availableTopicsRef.current[subId] ?? [];
        const topicObjects =
          topicIds.length === 0
            ? cachedTopics
            : cachedTopics.filter((t) => topicIds.includes(t.id));

        return {
          subject: subDef?.name ?? subId,
          subjectId: subId,
          supabaseSubjectId: subDef?.supabaseId,
          examType,
          topics: topicObjects.map((t) => ({
            id: t.id,
            name: t.topic_name,
          })),
          allTopicsSelected: topicIds.length === 0,
        };
      });

      await initiateSession({
        examType,
        selectedSubjects,
        durationMinutes: duration,
        questionCount,
        topicContext: subjectTopicContext,
      });

      toast.success('Exam arena loaded! Good luck! 🎯');
      navigate('/arena');
    } catch (err) {
      console.error('Failed to initialize session:', err);
      toast.error('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedSubjects,
    selectedTopics,
    sessionMode,
    examType,
    duration,
    questionCount,
    availableSubjects,
    initiateSession,
    navigate,
  ]);

  // ── Derived values ────────────────────────────────────────
  const hasRunningActiveSession = useMemo(
    () => !!(currentSession && !currentSession.isSubmitted),
    [currentSession]
  );

  const activeSessionLabel = useMemo(() => {
    if (!hasRunningActiveSession) return '';
    return (
      (currentSession!.subjects ?? [])
        .map((s: any) => s?.subject ?? 'Unknown')
        .join(' + ') || 'Session Active'
    );
  }, [hasRunningActiveSession, currentSession]);

  const totalSelectedTopics = useMemo(
    () => Object.values(selectedTopics).reduce((sum, arr) => sum + arr.length, 0),
    [selectedTopics]
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 text-white min-h-full w-full font-sans">

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">
            <Zap className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            Practice & Assessment Deck
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            Smart CBT Practice
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">
            Configure unified assessments or 4-subject JAMB blocks with
            high-precision simulation timing.
          </p>
        </div>

        {hasRunningActiveSession && (
          <motion.div
            role="region"
            aria-label="Active exam session"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-3xl w-full lg:w-auto"
          >
            <div className="relative shrink-0" aria-hidden="true">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                Session Active
              </h4>
              <p className="text-[11px] text-zinc-300 font-mono mt-0.5 max-w-[200px] truncate">
                {activeSessionLabel}
              </p>
            </div>
            <Button
              onClick={() => navigate('/arena')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Resume Arena
            </Button>
          </motion.div>
        )}
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* CONFIGURATOR */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.15)_0%,_transparent_75%)] pointer-events-none"
          />

          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
              <Layers className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">CBT Session Configurator</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Setup multi-subject blocks or focused single-subject sessions
              </p>
            </div>
          </div>

          {/* Exam type + mode selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Exam Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EXAM_TYPES.map((auth) => (
                  <button
                    key={auth}
                    type="button"
                    onClick={() => setExamType(auth)}
                    className={`py-3 rounded-2xl font-black text-xs border transition-all ${
                      examType === auth
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-zinc-950 border-white/5 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {auth}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Session Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'single', name: 'Single Subject' },
                  { id: 'multi', name: '4-Subject Block' },
                ] as const).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSessionMode(mode.id)}
                    className={`py-3 rounded-2xl font-black text-xs border transition-all ${
                      sessionMode === mode.id
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-zinc-950 border-white/5 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {sessionMode === 'single' ? 'Select Subject' : 'Select up to 4 Subjects'}
              </label>
              <div className="flex items-center gap-2">
                {subjectsLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" aria-hidden="true" />
                )}
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {selectedSubjects.length} of{' '}
                  {sessionMode === 'single' ? '1' : '4'} selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubjects.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubjectToggle(sub.id)}
                    aria-pressed={isSelected}
                    className={`p-4 rounded-2xl flex items-center justify-between border text-left transition-all ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-cyan-500 shadow-sm'
                        : 'bg-zinc-950/30 border-white/5 text-zinc-400 hover:bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl text-base ${sub.color}`} aria-hidden="true">
                        {sub.icon}
                      </span>
                      <span className="text-xs font-bold leading-snug">{sub.name}</span>
                    </div>
                    {isSelected && (
                      <Check
                        className="w-4 h-4 shrink-0 text-cyan-400 stroke-[3px]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic picker */}
          {selectedSubjects.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Topic Focus{' '}
                  <span className="text-zinc-500 normal-case font-normal">
                    (optional — blank = all topics)
                  </span>
                </label>
                {totalSelectedTopics > 0 && (
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    {totalSelectedTopics} topic(s) pinned
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {selectedSubjects.map((subId) => {
                  const subDef = availableSubjects.find((s) => s.id === subId);
                  const topics = availableTopics[subId] ?? [];
                  const isExpanded = expandedSubject === subId;
                  const isLoadingTopics = topicsLoading[subId] ?? false;
                  const selectedForSub = selectedTopics[subId] ?? [];

                  return (
                    <div
                      key={subId}
                      className="bg-zinc-950/60 border border-white/5 rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`topics-${subId}`}
                        onClick={() => handleExpandSubject(subId)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base" aria-hidden="true">
                            {subDef?.icon ?? '📖'}
                          </span>
                          <div>
                            <span className="text-xs font-black text-zinc-200">
                              {subDef?.name ?? subId}
                            </span>
                            {selectedForSub.length > 0 && (
                              <span className="text-[10px] text-cyan-400 font-mono ml-2">
                                {selectedForSub.length} pinned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" aria-hidden="true">
                          {isLoadingTopics && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div
                          id={`topics-${subId}`}
                          className="px-4 pb-4 space-y-3 border-t border-white/5"
                        >
                          {isLoadingTopics ? (
                            <div className="flex items-center justify-center py-6 gap-2 text-zinc-500">
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              <span className="text-xs">Loading syllabus topics...</span>
                            </div>
                          ) : topics.length === 0 ? (
                            <div className="flex items-center gap-2 py-4 text-zinc-500">
                              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                              <span className="text-xs">
                                No topics found for {examType}. All questions will
                                be included.
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                  {topics.length} topics
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllTopics(subId)}
                                    className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300 transition-colors"
                                  >
                                    Select All
                                  </button>
                                  <span className="text-zinc-600" aria-hidden="true">·</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedTopics((prev) => ({
                                        ...prev,
                                        [subId]: [],
                                      }))
                                    }
                                    className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                {topics.map((topic) => {
                                  const isTopicSelected = selectedForSub.includes(topic.id);
                                  return (
                                    <button
                                      key={topic.id}
                                      type="button"
                                      aria-pressed={isTopicSelected}
                                      onClick={() => handleTopicToggle(subId, topic.id)}
                                      className={`p-3 rounded-xl text-left border transition-all flex items-center justify-between gap-2 ${
                                        isTopicSelected
                                          ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/10'
                                      }`}
                                    >
                                      <span className="text-[11px] font-bold leading-snug">
                                        {topic.topic_name}
                                      </span>
                                      {isTopicSelected && (
                                        <Check
                                          className="w-3 h-3 shrink-0 text-cyan-400 stroke-[3px]"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timer & Launch */}
          <div className="pt-6 border-t border-white/5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                <div>
                  <label
                    htmlFor="duration-select"
                    className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block"
                  >
                    Countdown Timer
                  </label>
                  <select
                    id="duration-select"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="bg-zinc-950 border border-white/5 text-xs p-2 rounded-xl text-white outline-none focus:border-cyan-500 mt-1 cursor-pointer font-bold"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={40}>40 Minutes (Single Subject)</option>
                    <option value={60}>60 Minutes</option>
                    <option value={120}>120 Minutes (JAMB Block)</option>
                    <option value={180}>180 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                <div>
                  <label
                    htmlFor="question-count-select"
                    className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block"
                  >
                    Questions per Subject
                  </label>
                  <select
                    id="question-count-select"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                    className="bg-zinc-950 border border-white/5 text-xs p-2 rounded-xl text-white outline-none focus:border-cyan-500 mt-1 cursor-pointer font-bold"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions (Standard)</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={30}>30 Questions</option>
                    <option value={40}>40 Questions</option>
                    <option value={50}>50 Questions</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              disabled={loading}
              onClick={handleLaunchSession}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-2xl px-8 py-6 flex items-center gap-2 text-sm shadow-xl shadow-cyan-600/15 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Building Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" aria-hidden="true" />
                  Launch Exam
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" aria-hidden="true" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-300">
                Simulation Architecture
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every mock establishes standard JAMB parameters. Telemetry
              persists instantly — no progress lost on network outages.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Exam Masking', value: 'ACTIVE' },
                { label: 'Zero Loss Cache', value: 'ACTIVE' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center"
                >
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block">
                    {label}
                  </span>
                  <span className="text-xs font-black text-emerald-400 mt-1.5 block">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {totalSelectedTopics > 0 && (
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Topic Focus Active
                  </span>
                </div>
                <div className="space-y-1">
                  {selectedSubjects.map((subId) => {
                    const count = (selectedTopics[subId] ?? []).length;
                    if (count === 0) return null;
                    const subDef = availableSubjects.find((s) => s.id === subId);
                    return (
                      <div
                        key={subId}
                        className="flex justify-between items-center text-xs text-zinc-400"
                      >
                        <span>{subDef?.name ?? subId}</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {count} topic{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  AI will focus exclusively on your selected topics.
                </p>
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-dashed border-white/10 p-6 rounded-3xl space-y-3 text-center">
            <ShieldAlert className="w-8 h-8 text-cyan-500/60 mx-auto" aria-hidden="true" />
            <h4 className="font-black text-xs text-zinc-300">Continuous Timer Sync</h4>
            <p className="text-[11px] text-zinc-500 leading-normal">
              On reload or accidental close, timing resumes from the exact
              millisecond of your session start timestamp.
            </p>
          </div>
        </div>
      </div>

      {/* RECENT SESSIONS */}
      {recentSessions.length > 0 && (
        <section
          aria-label="Session history"
          className="bg-zinc-900/10 border border-white/5 p-6 rounded-3xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <h3 className="font-black text-xs uppercase tracking-wider text-zinc-400">
              Session History
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSessions.map((hist, idx) => (
              <div
                key={hist.id ?? `${hist.subject}-${idx}`}
                className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold uppercase truncate max-w-[150px]">
                    {hist.subject}
                  </h4>
                  <span className="text-[10px] text-zinc-500 block font-mono mt-1">
                    {hist.timestamp ?? '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-cyan-400 font-mono">
                    {hist.score !== undefined ? `${Math.round(hist.score)}%` : '—'}
                  </span>
                  <span className="text-[9px] text-zinc-500 block">Score</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
