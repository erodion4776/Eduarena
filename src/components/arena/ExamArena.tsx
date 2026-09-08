import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library
import { Clock, ShieldAlert, Sparkles, ChevronRight, BookOpen, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiRouter } from '@/src/lib/aiRouter';

// Study questions list
const MOCK_QUESTIONS = [
  {
    id: 1,
    subject: "Physics",
    topic: "Mechanics",
    text: "Which of the following describes an object in uniform motion?",
    options: ["Accelerating", "Moving at constant velocity", "Decelerating", "At rest"],
    answer: "Moving at constant velocity"
  },
  {
    id: 2,
    subject: "Biology",
    topic: "Cells",
    text: "What is the primary function of the mitochondrion?",
    options: ["Protein synthesis", "Photosynthesis", "Energy generation (ATP)", "Cell division"],
    answer: "Energy generation (ATP)"
  }
];

interface ExamArenaProps {
  onExit: () => void;
}

export default function ExamArena({ onExit }: ExamArenaProps) {
  // --- STATE MANAGEMENT ---
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [intervention, setIntervention] = useState<{ answer: string; source?: string } | null>(null);
  const [isLoadingIntervention, setIsLoadingIntervention] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60 * 45); // 45 minutes countdown

  // Get current active question safely
  const currentQuestion = MOCK_QUESTIONS[currentIdx] || MOCK_QUESTIONS[0];

  // --- COUNTDOWN TIMER EFFECT ---
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- HANDLE ANSWER SELECTION ---
  const handleSelect = async (selectedOption: string) => {
    // Prevent double submissions while processing
    if (selected || isWrong || isLoadingIntervention) return;
    
    if (selectedOption === currentQuestion.answer) {
      setSelected(selectedOption);
      
      // Short delay so the user sees the green success animation before moving on
      setTimeout(() => {
         setSelected(null);
         if (currentIdx < MOCK_QUESTIONS.length - 1) {
            setCurrentIdx(currentIdx + 1);
         } else {
            onExit();
         }
      }, 1000);
    } else {
      // Trigger help panel on incorrect answers
      setIsWrong(true);
      setIsLoadingIntervention(true);
      
      try {
        // Fetch helpful content based on the question topic
        const response = await aiRouter.getIntervention(currentQuestion.topic);
        setIntervention(response);
      } catch (error) {
        // Safe fallback in case of connection or route issues
        setIntervention({
          answer: "Let's review this concept together! Keep in mind the definition of key terms associated with this chapter topic.",
          source: "Course Syllabus Guide"
        });
      } finally {
        setIsLoadingIntervention(false);
      }
    }
  };

  // --- PROGRESS TO NEXT QUESTION ---
  const handleNextAfterIntervention = () => {
    setIsWrong(false);
    setIntervention(null);
    setSelected(null);
    
    if (currentIdx < MOCK_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onExit();
    }
  };

  // --- FORMAT TIMER ---
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col font-sans selection:bg-cyan-500/30">
      
      {/* Top HUD Bar */}
      <div className="h-20 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="px-4 py-2 bg-gradient-to-r from-cyan-900/60 to-blue-900/60 text-cyan-400 rounded-xl max-w-fit text-sm font-black tracking-widest uppercase border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
             {currentQuestion.subject}
           </div>
           <div className="text-slate-400 font-bold flex items-center gap-2">
             <span className="text-cyan-500">Question</span> {currentIdx + 1} / {MOCK_QUESTIONS.length}
           </div>
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-3 bg-rose-950/30 px-5 py-2.5 rounded-2xl border border-rose-900/50 text-rose-500 font-mono text-2xl font-black tracking-widest shadow-inner">
           <Clock className="w-6 h-6 animate-pulse" />
           {formatTime(timeLeft)}
        </div>
        
        <Button 
          variant="outline" 
          onClick={onExit} 
          className="border-rose-900/50 text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 uppercase text-xs font-black tracking-widest h-12 px-6 rounded-xl"
        >
           Exit Exam
        </Button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12 max-w-5xl mx-auto w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={currentQuestion.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="w-full space-y-16"
             >
                <h2 className="text-4xl md:text-5xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 drop-shadow-sm">
                   {currentQuestion.text}
                </h2>
                
                {/* Options List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {currentQuestion.options.map((opt, i) => {
                     const isCorrectAns = selected === opt && opt === currentQuestion.answer;
                     const isWrongAns = isWrong && opt !== currentQuestion.answer;
                     const isNeutralSelected = selected === opt && opt !== currentQuestion.answer;
                     
                     return (
                       <Button
                         key={opt}
                         onClick={() => handleSelect(opt)}
                         disabled={selected !== null || isWrong}
                         className={`h-28 text-left justify-start px-8 rounded-3xl text-xl font-bold border-2 transition-all duration-300 relative overflow-hidden group ${
                           isCorrectAns ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.3)]' :
                           isNeutralSelected ? 'bg-rose-500/20 border-rose-500 text-rose-300' :
                           isWrongAns ? 'opacity-30 border-white/5 bg-white/5 saturate-0' : 
                           'border-white/10 bg-slate-900/60 hover:bg-slate-800 hover:border-cyan-500/50 text-slate-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                         }`}
                       >
                         <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <span className="text-slate-500 font-mono mr-4">{String.fromCharCode(65 + i)}.</span> {opt}
                       </Button>
                     );
                   })}
                </div>
             </motion.div>
           </AnimatePresence>
        </div>

        {/* AI Learning Intervention Sidebar */}
        <AnimatePresence>
          {isWrong && (
             <motion.div
               initial={{ x: '100%', opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: '100%', opacity: 0 }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="absolute top-0 right-0 w-full md:w-[450px] h-full bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col p-8 z-10 font-sans"
             >
                <div className="flex items-center gap-4 text-rose-500 mb-8 pb-6 border-b border-white/5">
                   <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                     <ShieldAlert className="w-8 h-8" />
                   </div>
                   <div>
                     <h3 className="font-black text-2xl uppercase tracking-tighter italic">Review Time</h3>
                     <p className="text-xs font-bold text-rose-400/70 tracking-widest uppercase mt-1">Personal Tutor Active</p>
                   </div>
                </div>

                {isLoadingIntervention ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-cyan-500 space-y-6">
                     <div className="relative">
                       <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                       <Sparkles className="w-12 h-12 animate-spin relative z-10" />
                     </div>
                     <p className="text-sm font-mono font-bold uppercase tracking-widest animate-pulse opacity-80">Consulting Coursebook...</p>
                   </div>
                ) : (
                   <div className="flex-1 space-y-8 overflow-y-auto pr-2 pb-6">
                      <div className="p-5 bg-gradient-to-br from-rose-950/50 to-black rounded-2xl border border-rose-900/50 text-rose-200 text-base font-medium shadow-inner">
                         Let's take a look at the concept before moving on.
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-cyan-950/40 to-slate-900 rounded-3xl border border-cyan-500/30 relative shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                         <div className="absolute -top-4 left-6 bg-slate-950 border border-cyan-500/50 px-3 py-1.5 rounded-lg text-xs font-black text-cyan-300 uppercase tracking-widest flex items-center gap-2 shadow-lg">
                            <Bot className="w-4 h-4" /> Study Buddy AI
                         </div>
                         <p className="text-slate-200 text-lg leading-relaxed mt-4">{intervention?.answer}</p>
                         
                         {intervention?.source && (
                            <div className="mt-6 flex items-center gap-3 text-xs text-emerald-300 font-bold bg-emerald-950/40 px-4 py-3 rounded-xl border border-emerald-500/30 shadow-inner">
                               <BookOpen className="w-5 h-5 flex-shrink-0" /> Recommended Study Source: {intervention.source}
                            </div>
                         )}
                      </div>
                   </div>
                )}

                <Button 
                   onClick={handleNextAfterIntervention} 
                   disabled={isLoadingIntervention}
                   className="w-full h-16 mt-6 bg-white hover:bg-cyan-50 text-slate-950 font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 rounded-2xl shadow-[0_10px_20px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02]"
                >
                   Got It, Next <ChevronRight className="w-6 h-6" />
                </Button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
