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
import { LayoutDashboard, BookOpen, Swords, MessageSquare, Sparkles, Database, Zap, Target, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type View = 'dashboard' | 'hub' | 'solutions' | 'oracle' | 'lounge' | 'admin';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('dashboard');
  const [isArenaOpen, setIsArenaOpen] = useState(false);

  useEffect(() => {
    setMode('arena'); // Force dark cyber mode everywhere
  }, [setMode]);

  if (isArenaOpen) {
    return <ExamArena onExit={() => setIsArenaOpen(false)} />;
  }

  const renderView = () => {
    if (view === 'hub') return <KnowledgeHub />;
    if (view === 'solutions') return <SolutionsEngine initialSolutionId={null} />;
    if (view === 'oracle') return <ExamOracle />;
    if (view === 'lounge') return <ScholarLounge />;

    // The AI-Driven Dashboard Home
    return (
      <div className="flex flex-col gap-12 font-sans relative z-10 px-6 pt-12 pb-24 max-w-6xl mx-auto">
        {/* Welcome Section */}
        <section className="space-y-6">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(34,211,238,0.15)]">
             <Zap className="w-4 h-4 text-cyan-300" /> System Diagnostics Complete
           </div>
           <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
             Welcome Boss, <br className="md:hidden" />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 italic">
               {user?.name?.split(' ')[0] || 'Scholar'}
             </span>.
           </h1>
           <p className="text-xl text-slate-400 max-w-3xl font-medium leading-relaxed">
             I noticed your <span className="text-rose-400 font-bold">Biology</span> score dropped slightly yesterday. I've pulled Chapter 2 from the syllabus to get you back on track.
           </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Weakness Radar */}
           <div className="col-span-1 md:col-span-2 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3 relative z-10">
                 <Target className="w-5 h-5 text-cyan-500" /> Weakness Radar
              </h2>
              
              <div className="space-y-8 relative z-10">
                 <div>
                    <div className="flex justify-between text-sm font-black mb-3 uppercase tracking-wider text-slate-200">
                       <span>Physics (Mechanics)</span>
                       <span className="text-emerald-400">85% - Strong</span>
                    </div>
                    <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[85%] shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-full" />
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between text-sm font-black mb-3 uppercase tracking-wider text-slate-200">
                       <span>Biology (Cells)</span>
                       <span className="text-rose-400 animate-pulse">42% - Critical</span>
                    </div>
                    <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 w-[42%] shadow-[0_0_15px_rgba(244,63,94,0.5)] rounded-full" />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-sm font-black mb-3 uppercase tracking-wider text-slate-200">
                       <span>Mathematics (Calculus)</span>
                       <span className="text-cyan-400">68% - Stable</span>
                    </div>
                    <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 w-[68%] shadow-[0_0_15px_rgba(6,182,212,0.5)] rounded-full" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Enter The Arena */}
           <div className="col-span-1 flex flex-col justify-end h-full">
              <Button 
                 onClick={() => setIsArenaOpen(true)}
                 className="relative group h-full min-h-[200px] w-full overflow-hidden rounded-[40px] border border-cyan-500/50 bg-gradient-to-br from-cyan-950/40 to-blue-900/20 hover:scale-[1.02] transition-all duration-500 backdrop-blur-xl flex flex-col items-center justify-center gap-6 p-0 shadow-[0_0_30px_rgba(34,211,238,0.15)] hover:shadow-[0_0_50px_rgba(34,211,238,0.3)]"
              >
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                 <Swords className="w-16 h-16 text-cyan-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                 <span className="text-2xl font-black uppercase tracking-[0.2em] text-white relative z-10">Enter The Arena</span>
              </Button>
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
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList className="p-1.5 rounded-2xl flex-wrap h-auto bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg inline-flex min-w-max">
                <TabsTrigger 
                  value="dashboard" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" /> AI Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="hub" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Library
                </TabsTrigger>
                <TabsTrigger 
                  value="solutions" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Solutions
                </TabsTrigger>
                <TabsTrigger 
                  value="oracle" 
                  className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 text-slate-400 hover:text-white border border-transparent transition-all"
                >
                  <Sparkles className="w-4 h-4" /> Oracle
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <>
                    <TabsTrigger 
                      value="admin" 
                      onClick={() => navigate('/admin')}
                      className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 text-rose-400 hover:text-rose-300 border border-transparent hover:bg-rose-500/10 transition-all"
                    >
                      <Database className="w-4 h-4" /> Factory
                    </TabsTrigger>
                    <TabsTrigger 
                      value="admin-arena" 
                      onClick={() => navigate('/admin/arena')}
                      className="rounded-xl gap-2 font-black uppercase tracking-wider text-xs px-5 py-3 text-emerald-400 hover:text-emerald-300 border border-transparent hover:bg-emerald-500/10 transition-all"
                    >
                      <Command className="w-4 h-4" /> Arena Command
                    </TabsTrigger>
                  </>
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
