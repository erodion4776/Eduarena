import { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import Navbar from '@/src/components/layout/Navbar';
import StudyDashboard from '@/src/components/modes/StudyDashboard';
import ArenaDashboard from '@/src/components/modes/ArenaDashboard';
import KnowledgeHub from '@/src/components/hub/KnowledgeHub';
import SolutionsEngine from '@/src/components/solutions/SolutionsEngine';
import ExamOracle from '@/src/components/oracle/ExamOracle';
import VideoLearning from '@/src/components/hub/VideoLearning';
import QuestionDetail from '@/src/components/hub/QuestionDetail';
import PracticeMode from '@/src/components/hub/PracticeMode';
import ScholarLounge from '@/src/components/social/ScholarLounge';
import Inventory from '@/src/components/profile/Inventory';
import JackpotWidget from '@/src/components/economy/JackpotWidget';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BookOpen, Trophy, Swords, MessageSquare, Ghost, Sparkles } from 'lucide-react';

type View = 'dashboard' | 'hub' | 'solutions' | 'oracle' | 'learning' | 'question' | 'practice' | 'lounge' | 'inventory' | 'arena';

export default function Dashboard() {
  const { mode, setMode } = useThemeStore();
  const [view, setView] = useState<View>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [initialSolutionId, setInitialSolutionId] = useState<string | null>(null);

  useEffect(() => {
    const handleNavigateArena = (e: any) => {
      setView('arena');
    };
    const handleNavigateSolution = (e: any) => {
      setInitialSolutionId(e.detail.solutionId);
      setView('solutions');
    };
    window.addEventListener('navigate-to-arena', handleNavigateArena);
    window.addEventListener('navigate-to-solution', handleNavigateSolution);
    return () => {
      window.removeEventListener('navigate-to-arena', handleNavigateArena);
      window.removeEventListener('navigate-to-solution', handleNavigateSolution);
    };
  }, []);

  useEffect(() => {
    const handleArenaNav = () => {
      setMode('arena');
      setView('arena');
    };
    window.addEventListener('navigate-to-arena', handleArenaNav);
    return () => window.removeEventListener('navigate-to-arena', handleArenaNav);
  }, [setMode]);

  useEffect(() => {
    if (view === 'arena') {
      setMode('arena');
    } else {
      setMode('study');
    }
  }, [view, setMode]);

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <StudyDashboard />;
      case 'arena':
        return <ArenaDashboard />;
      case 'oracle':
        return <ExamOracle />;
      case 'solutions':
        return <SolutionsEngine initialSolutionId={initialSolutionId} />;
      case 'hub':
        return (
          <KnowledgeHub 
            onSelectCourse={(course: any) => {
              setSelectedCourse(course);
              setView('learning');
            }}
            onSelectQuestion={(q: any) => {
              setSelectedQuestion(q);
              setView('question');
            }}
          />
        );
      case 'learning':
        return (
          <VideoLearning 
            course={selectedCourse} 
            onBack={() => setView('hub')} 
            onStartPractice={(lesson: any) => {
              setSelectedLesson(lesson);
              setView('practice');
            }}
          />
        );
      case 'question':
        return <QuestionDetail question={selectedQuestion} onBack={() => setView('hub')} />;
      case 'practice':
        return (
          <PracticeMode 
            lesson={selectedLesson} 
            onComplete={(coins: number) => {
              setView('learning');
            }} 
          />
        );
      case 'lounge':
        return <ScholarLounge />;
      case 'inventory':
        return <Inventory />;
      default:
        return <StudyDashboard />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${mode === 'arena' ? 'mode-arena' : 'mode-study'}`}>
      <Navbar />
      
      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className={`p-1 rounded-xl flex-wrap h-auto ${mode === 'arena' ? 'bg-white/5 border border-white/10' : 'bg-slate-100/50'}`}>
              <TabsTrigger 
                value="dashboard" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="hub" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <BookOpen className="w-4 h-4" /> Knowledge Hub
              </TabsTrigger>
              <TabsTrigger 
                value="solutions" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <BookOpen className="w-4 h-4" /> Solutions
              </TabsTrigger>
              <TabsTrigger 
                value="oracle" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <Sparkles className="w-4 h-4" /> Exam Oracle
              </TabsTrigger>
              <TabsTrigger 
                value="arena" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <Swords className="w-4 h-4" /> Battle Arena
              </TabsTrigger>
              <TabsTrigger 
                value="lounge" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <MessageSquare className="w-4 h-4" /> Lounge
              </TabsTrigger>
              <TabsTrigger 
                value="inventory" 
                className={`rounded-lg gap-2 font-bold ${mode === 'arena' ? 'data-[state=active]:bg-arena-primary data-[state=active]:text-white text-slate-400 hover:text-white' : 'data-[state=active]:bg-white data-[state=active]:shadow-sm'}`}
              >
                <Ghost className="w-4 h-4" /> Vault
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {view === 'dashboard' && (
          <div className="w-full md:w-80">
            <JackpotWidget />
          </div>
        )}
      </div>

      <main className="pb-20">
        {renderView()}
      </main>
    </div>
  );
}
