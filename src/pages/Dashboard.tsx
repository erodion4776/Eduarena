import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useNeuralVaultStore } from '@/src/store/useNeuralVaultStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { 
  Zap, 
  Target, 
  BookOpen, 
  Compass, 
  Sparkles, 
  Award,
  ChevronRight,
  ShieldCheck,
  Brain,
  MessageSquare
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSession, hydrateSession } = useNeuralVaultStore();
  const [highScore, setHighScore] = useState(78);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const hasRunningActiveSession = currentSession && !currentSession.isSubmitted;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 text-white min-h-full w-full font-sans selection:bg-cyan-500/30">
      {/* Welcome Block Overlay */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.15)_0%,_transparent_75%)] pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Personal Exam Prep Terminal
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            Smart CBT Dashboard
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">
            Master your exams with real past questions, complete offline practice, and instant virtual tutor guidance.
          </p>
        </div>

        {hasRunningActiveSession && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-3xl w-full md:w-auto"
          >
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
            </div>
            <div className="flex-1">
              <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">Simulation in Progress</h4>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 max-w-[150px] truncate">
                {currentSession.subjects.map(s => s.subject).join(' + ')}
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

      {/* CALL TO ACTION CARD: Practice configurator routing */}
      <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.12)_0%,_transparent_75%)] pointer-events-none" />
        <div className="space-y-3 max-w-xl">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400 w-fit">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '40s' }} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">CBT Exam Configurator awaits you on the Practice page</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Configure single subjects or complete 4-subject JAMB blocks with unified timing. Enter exam simulations featuring active question masking.
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/practice')}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl px-8 py-6 flex items-center gap-2 text-sm shadow-xl shadow-cyan-600/15 group shrink-0"
        >
          Go to Practice Configurator
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </section>

      {/* METRICS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2 relative overflow-hidden">
          <Award className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">Average Readiness Rank</span>
          <span className="text-3xl font-black text-white block">Alpha Beta 1</span>
          <p className="text-[11px] text-zinc-400 mt-2">You are scoring higher than 85% of peers preparing for this year's exam.</p>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2 relative overflow-hidden">
          <Target className="w-5 h-5 text-rose-500" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">Your Mock Exam Performance</span>
          <span className="text-3xl font-black text-cyan-400 block">{highScore}% score</span>
          <p className="text-[11px] text-zinc-400 mt-2">A great start! Aim for 85% to confidently secure admission into your dream course.</p>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl space-y-2 relative overflow-hidden">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">Study Anywhere (Offline Access)</span>
          <span className="text-3xl font-black text-emerald-400 block">Fully Active</span>
          <p className="text-[11px] text-zinc-400 mt-2">Your practice history and answers are backed up locally to study even without internet connection.</p>
        </div>
      </section>

      {/* SPECIAL FEATURES HIGHLIGHT */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-200">Up-to-Date Syllabus</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Practice questions sync automatically with updated official syllabus targets (covering JAMB, WAEC, and NECO templates). Keep your practice sessions accurate and relevant.
          </p>
        </div>

        <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/25 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-zinc-200">Personalized AI Tutor</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Get step-by-step explanations and diagnostic tips instantly after you submit each session. Our virtual AI tutor is always ready to clarify concepts and help you crush hard questions.
          </p>
        </div>
      </section>
    </div>
  );
}
