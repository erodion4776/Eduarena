import { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import Navbar from '@/src/components/layout/Navbar';
import ExamArena from '@/src/components/arena/ExamArena';
import AIChatWidget from '@/src/components/ai/AIChatWidget';
import KnowledgeHub from '@/src/components/hub/KnowledgeHub';
import SolutionsEngine from '@/src/components/solutions/SolutionsEngine';
import ExamOracle from '@/src/components/oracle/ExamOracle';
import ScholarLounge from '@/src/components/social/ScholarLounge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BookOpen, FileEdit, ScrollText, BarChart3, Target, Zap, Activity, Cpu, Swords, ArrowRight, Command } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type View = 'mock-arena' | 'tutorial-hub' | 'syllabus' | 'scholar-stats' | 'admin';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('mock-arena');

  useEffect(() => {
    setMode('arena'); // Force dark cyber mode everywhere
  }, [setMode]);

  const renderView = () => {
    // SYLLABUS / TOPIC MASTERY DATA
    const subjects = [
      { name: 'Physics', progress: 85, color: 'emerald' },
      { name: 'Biology', progress: 42, color: 'rose' },
      { name: 'Mathematics', progress: 68, color: 'cyan' },
      { name: 'Chemistry', progress: 55, color: 'blue' },
    ];

    if (view === 'tutorial-hub') return (
      <div className="max-w-6xl mx-auto px-6 pt-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <BookOpen className="w-16 h-16 text-cyan-500 mb-6" />
        <h2 className="text-3xl font-black text-white mb-4">Neural Tutorial Hub</h2>
        <p className="text-slate-400 max-w-lg">Study with Tutor Chuks. AI-powered explanations from official textbooks are being indexed in the cloud.</p>
      </div>
    );
    
    if (view === 'syllabus') return (
      <div className="max-w-6xl mx-auto px-6 pt-12">
        <h2 className="text-3xl font-black text-white mb-8 border-l-4 border-cyan-500 pl-4">JAMB Official Syllabus</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub, i) => (
             <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center transition-all hover:bg-white/10">
                <span className="font-bold text-lg">{sub.name}</span>
                <span className="text-sm font-mono text-zinc-500 uppercase">Indexing Modules...</span>
             </div>
          ))}
        </div>
      </div>
    );

    if (view === 'scholar-stats') return (
      <div className="max-w-6xl mx-auto px-6 pt-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <BarChart3 className="w-16 h-16 text-emerald-500 mb-6" />
        <h2 className="text-3xl font-black text-white mb-4">Scholar Analytics</h2>
        <p className="text-slate-400 max-w-lg">Deep performance metrics including percentile ranking and topic weaknesses.</p>
      </div>
    );
    
    // The "MOCK ARENA" Dashboard Home
    return (
      <div className="flex flex-col gap-10 font-sans relative z-10 px-6 pt-12 pb-24 max-w-6xl mx-auto">
        {/* Welcome Section */}
        <section className="space-y-6">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(34,211,238,0.15)]">
             <Zap className="w-4 h-4 text-cyan-300" /> Neural Link Established
           </div>
           <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
             Welcome Boss, <br className="md:hidden" />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 italic">
               {user?.name?.split(' ')[0] || 'Scholar'}
             </span>.
           </h1>
           <p className="text-xl text-slate-400 max-w-3xl font-medium leading-relaxed">
             I noticed your <span className="text-rose-400 font-bold">Biology</span> score dropped slightly. I've prepared a refresh on <span className="text-cyan-400 font-bold underline underline-offset-4 decoration-cyan-500/50">Cell Biology</span> to bridge the gap.
           </p>
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[minmax(300px,_auto)]">
           {/* Card 1: ENTER THE ARENA (spanning 7 cols) */}
           <div className="lg:col-span-7 group relative flex flex-col justify-between p-10 rounded-[2.5rem] bg-gradient-to-br from-cyan-900/40 to-blue-950/40 border border-cyan-500/30 overflow-hidden shadow-2xl transition-all hover:border-cyan-500/60">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                <Swords className="w-32 h-32 text-cyan-400 -rotate-12" />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Enter the Arena</h3>
                <p className="text-slate-300 text-lg max-w-xs leading-snug">Simulate JAMB, WAEC, or NECO conditions in a precision CBT environment.</p>
              </div>
              <div className="relative z-10 mt-8">
                 <Button 
                   onClick={() => navigate('/arena')}
                   className="h-16 px-10 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(34,211,238,0.4)] group-hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all flex items-center gap-3"
                 >
                   Start CBT <ArrowRight className="w-5 h-5" />
                 </Button>
              </div>
           </div>

           {/* Card 2: NEURAL TUTORIALS (spanning 5 cols) */}
           <div className="lg:col-span-5 p-8 rounded-[2.5rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Neural Tutorials</h3>
                <p className="text-slate-400 leading-relaxed">Study with Tutor Chuks. AI-powered explanations indexed from the latest official textbooks.</p>
              </div>
              <div className="mt-6 flex items-center gap-4 text-emerald-400 font-bold text-sm group-hover:translate-x-2 transition-transform cursor-pointer">
                 OPEN HUB <ArrowRight className="w-4 h-4" />
              </div>
           </div>

           {/* Card 3: TOPIC MASTERY (spanning 12 cols) */}
           <div className="lg:col-span-12 p-10 rounded-[2.5rem] bg-zinc-950/40 backdrop-blur-3xl border border-white/5 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                 <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <Target className="w-6 h-6 text-rose-500" /> Topic Mastery
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1">Syllabus coverage based on active Neural Analytics</p>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Activity className="w-3 h-3 text-emerald-500" /> Live Updates
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {subjects.map((sub, i) => (
                    <div key={i} className="space-y-3">
                       <div className="flex justify-between items-end">
                          <span className="text-sm font-black text-zinc-300 uppercase tracking-wider">{sub.name}</span>
                          <span className={`text-xs font-mono font-bold ${sub.progress > 80 ? 'text-emerald-400' : sub.progress > 60 ? 'text-cyan-400' : 'text-rose-400'}`}>
                             {sub.progress}%
                          </span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${sub.progress}%` }}
                             className={`h-full bg-gradient-to-r ${
                               sub.color === 'emerald' ? 'from-emerald-600 to-emerald-400' :
                               sub.color === 'rose' ? 'from-rose-600 to-rose-400' :
                               'from-cyan-600 to-cyan-400'
                             }`}
                          />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-8 pt-6 border-t border-white/5">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Neural Link: <span className="text-emerald-400">Optimal</span></span>
           </div>
           <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Nodes: <span className="text-cyan-400">3 Standby</span></span>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 relative overflow-hidden transition-colors duration-1000">
      {/* Heavy Cyber Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[1000px] h-[1000px] bg-blue-600/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950/90 to-black rounded-full" />
      </div>
      
      <div className="relative z-20">
        <Navbar />
        
        {/* Main Navigation */}
        <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1 w-full overflow-x-auto pb-4 hide-scrollbar">
            <Tabs value={view} onValueChange={(v) => {
              if (v === 'admin-arena') {
                navigate('/admin/arena');
                return;
              }
              if (v !== 'admin') {
                setView(v as View);
              }
            }}>
              <TabsList className="p-1.5 rounded-2xl flex-wrap h-auto bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg inline-flex min-w-max">
                <TabsTrigger 
                  value="mock-arena" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <FileEdit className="w-4 h-4" /> Mock Arena
                </TabsTrigger>
                <TabsTrigger 
                  value="tutorial-hub" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Tutorial Hub
                </TabsTrigger>
                <TabsTrigger 
                  value="syllabus" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <ScrollText className="w-4 h-4" /> Syllabus
                </TabsTrigger>
                <TabsTrigger 
                  value="scholar-stats" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <BarChart3 className="w-4 h-4" /> Scholar Stats
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <TabsTrigger 
                    value="admin-arena" 
                    className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 text-emerald-400 hover:text-emerald-300 border border-transparent hover:bg-emerald-500/10 transition-all"
                  >
                    <Command className="w-4 h-4" /> Arena Command
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <main className="pb-20">
          {renderView()}
        </main>
      </div>

      <AIChatWidget />
    </div>
  );
}
