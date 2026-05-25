import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNeuralVaultStore } from '@/src/store/useNeuralVaultStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Target, 
  BookOpen, 
  Layers, 
  Check, 
  Clock, 
  Play, 
  AlertCircle, 
  Sparkles,
  Award,
  BookMarked,
  ShieldAlert,
  HelpCircle,
  History
} from 'lucide-react';
import { toast } from 'sonner';

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSession, initiateSession, hydrateSession } = useNeuralVaultStore();

  const [examType, setExamType] = useState('JAMB');
  const [sessionMode, setSessionMode] = useState<'single' | 'multi'>('multi'); // default 4-subject block
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['english', 'mathematics', 'physics', 'chemistry']);
  const [duration, setDuration] = useState(120); // 120 minutes default
  const [loading, setLoading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    hydrateSession();
    // Fetch recent simulated histories for display in practice lists
    const fetchHistories = async () => {
      try {
        const res = await fetch('/api/stats'); // fallback or recent sessions logs
        if (res.ok) {
          const statsData = await res.json();
          // parse recent sessions
          if (statsData?.recentPractices) {
            setRecentSessions(statsData.recentPractices.slice(0, 5));
          }
        }
      } catch (e) {
        // silent fallback
      }
    };
    fetchHistories();
  }, [hydrateSession]);

  // Adjust defaults on mode toggle
  useEffect(() => {
    if (sessionMode === 'single') {
      setSelectedSubjects(['english']);
      setDuration(40);
    } else {
      setSelectedSubjects(['english', 'mathematics', 'physics', 'chemistry']);
      setDuration(120);
    }
  }, [sessionMode]);

  const availableSubjects = [
    { id: 'english', name: 'Use of English', icon: '📝', color: 'text-cyan-400 bg-cyan-950/20' },
    { id: 'mathematics', name: 'Mathematics', icon: '🧮', color: 'text-emerald-400 bg-emerald-950/30' },
    { id: 'physics', name: 'Physics', icon: '⚡', color: 'text-purple-400 bg-purple-950/20' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', color: 'text-amber-400 bg-amber-950/20' },
    { id: 'biology', name: 'Biology', icon: '🧬', color: 'text-rose-400 bg-rose-950/20' },
    { id: 'economics', name: 'Economics', icon: '📈', color: 'text-indigo-400 bg-indigo-950/20' },
    { id: 'government', name: 'Government', icon: '🏛️', color: 'text-orange-400 bg-orange-950/20' },
  ];

  const handleSubjectToggle = (subId: string) => {
    if (sessionMode === 'single') {
      setSelectedSubjects([subId]);
    } else {
      if (selectedSubjects.includes(subId)) {
        if (selectedSubjects.length <= 1) {
          toast.error("You must select at least 1 subject");
          return;
        }
        setSelectedSubjects(selectedSubjects.filter(sub => sub !== subId));
      } else {
        if (selectedSubjects.length >= 4) {
          toast.error("A standard JAMB block allows a maximum of 4 subjects");
          return;
        }
        setSelectedSubjects([...selectedSubjects, subId]);
      }
    }
  };

  const handleLaunchSession = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Please pick at least one subject to initiate your CBT session.");
      return;
    }

    if (sessionMode === 'multi' && selectedSubjects.length !== 4) {
      toast.warning(`Note: Standard JAMB block consists of exactly 4 subjects. Running simulation with ${selectedSubjects.length} subjects.`);
    }

    setLoading(true);
    try {
      await initiateSession({
        examType,
        selectedSubjects,
        durationMinutes: duration
      });
      toast.success("Quantum Link Authenticated! Entering Exam Arena...");
      navigate('/arena');
    } catch (err) {
      console.error("Failed to initialize session", err);
      toast.error("Critical Connection Link Error. Please check database configuration.");
    } finally {
      setLoading(false);
    }
  };

  const hasRunningActiveSession = currentSession && !currentSession.isSubmitted;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 text-white min-h-full w-full font-sans">
      {/* HUD Header */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-3">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Practice & Assessment Deck
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            Smart CBT Practice
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">Configure standard unified assessments or 4-subject JAMB blocks with high-precision simulation timing.</p>
        </div>

        {hasRunningActiveSession && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-3xl w-full lg:w-auto"
          >
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Session Active</h4>
              <p className="text-[11px] text-zinc-300 font-mono mt-0.5 max-w-[200px] truncate">
                {currentSession.subjects.map(s => s.subject).join(' + ')}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/arena')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume Arena
            </Button>
          </motion.div>
        )}
      </header>

      {/* Main Grid: Configurator & Secondary stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CONFIGURATOR MODULE */}
        <div className="lg:col-span-8 bg-zinc-900/80 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.15)_0%,_transparent_75%)] pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">CBT Session Authority</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Setup nested multi-subject blocks or focused deep dives</p>
            </div>
          </div>

          {/* Exam Type & Subject Block layout selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Authority</label>
              <div className="grid grid-cols-3 gap-2">
                {['JAMB', 'WAEC', 'NECO'].map((auth) => (
                  <button
                    key={auth}
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
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Block Mode Layout</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'single', name: 'Single Subject' },
                  { id: 'multi', name: '4-Subject Block' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSessionMode(mode.id as 'single' | 'multi')}
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

          {/* Subject Options Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {sessionMode === 'single' ? 'Select Active Subject' : 'Select up to 4 subjects'}
              </label>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {selectedSubjects.length} of {sessionMode === 'single' ? '1' : '4'} active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubjects.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSubjectToggle(sub.id)}
                    className={`p-4 rounded-2xl flex items-center justify-between border text-left transition-all ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-cyan-500 shadow-sm'
                        : 'bg-zinc-950/30 border-white/5 text-zinc-400 hover:bg-zinc-950 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl text-lg ${sub.color}`}>{sub.icon}</span>
                      <span className="text-xs font-bold">{sub.name}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-cyan-500/20 border border-cyan-500 rounded-full flex items-center justify-center text-cyan-400">
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer Selector & Launch Panel */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-zinc-500" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Unified Countdown Timer</span>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="bg-zinc-950 border border-white/5 text-xs p-2 rounded-xl text-white outline-none focus:border-cyan-500 mt-1 cursor-pointer font-bold"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={40}>40 Minutes (Standard Single Subject)</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={120}>120 Minutes (Standard JAMB Block)</option>
                  <option value={180}>180 Minutes (3 Hours)</option>
                </select>
              </div>
            </div>

            <Button
              disabled={loading}
              onClick={handleLaunchSession}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black rounded-2xl px-8 py-6 flex items-center gap-2 text-sm shadow-xl shadow-cyan-600/15"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Building Deck...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  Launch Unified Exam
                </>
              )}
            </Button>
          </div>
        </div>

        {/* METRICS & RESILIENT TECHNOLOGY GUIDE */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-300">Resilient Simulation Architecture</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every mock configuration establishes standard JAMB parameters. Question attempt telemetry persists instantly to ensure no progress is lost on standard network outages.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block font-mono">Exam Masking</span>
                <span className="text-xs font-black text-emerald-400 mt-1.5 block">ACTIVE</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest block font-mono">Zero Loss Cache</span>
                <span className="text-xs font-black text-emerald-400 mt-1.5 block">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Resilience Warning */}
          <div className="bg-zinc-950 border border-dashed border-white/10 p-6 rounded-3xl space-y-3 text-center">
            <ShieldAlert className="w-8 h-8 text-cyan-500/60 mx-auto" />
            <h4 className="font-black text-xs text-zinc-300">Continuous Countdown Syncing</h4>
            <p className="text-[11px] text-zinc-500 leading-normal">
              In cases of browser updates or accidental reloads, timing continues calculation from the exact millisecond of the authorized link start timestamp.
            </p>
          </div>
        </div>
      </div>

      {/* COMPLETED EXAMS / SYLLABUS REFERENCE HISTORIES */}
      {recentSessions && recentSessions.length > 0 && (
        <section className="bg-zinc-900/10 border border-white/5 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="font-black text-xs uppercase tracking-wider text-zinc-400">Session Engagement History</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSessions.map((hist, idx) => (
              <div key={idx} className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase truncate max-w-[150px]">{hist.subject} Simulation</h4>
                  <span className="text-[10px] text-zinc-500 block font-mono mt-1">{hist.timestamp || 'Passed'}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-cyan-400 font-mono">{Math.round(hist.score ?? 80)}%</span>
                  <span className="text-[9px] text-zinc-500 block">Sustained</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
