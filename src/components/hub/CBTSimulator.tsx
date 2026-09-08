import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animations
import { 
  Timer, ChevronLeft, ChevronRight, Send, 
  BookOpen, CheckCircle2, XCircle, Info, 
  Home, Book, Eye // Cleanly imported Eye icon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ENGLISH_ARCHIVE, JambQuestion } from '@/src/data/englishArchive';

// Key-Value pair structure for student answers (e.g., { 1: "A", 2: "C" })
interface SelectedOptions {
  [questionId: number]: string;
}

interface CBTSimulatorProps {
  onBack: () => void;
}

export default function CBTSimulator({ onBack }: CBTSimulatorProps) {
  // --- STATE MANAGEMENT ---
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<SelectedOptions>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [score, setScore] = useState(0);

  // Memoize questions so we don't reload or randomize them on every render
  const questions = useMemo(() => ENGLISH_ARCHIVE || [], []);
  
  // Safe fallback to prevent crashes if questions aren't loaded yet
  const currentQ = questions[currentIdx] || {
    id: 0,
    hasPassage: 0,
    section: "",
    question: "No question text available",
    option: {},
    answer: "",
    solution: ""
  };

  // --- AUTOMATIC EXAM SUBMITTER ---
  const handleSubmit = () => {
    let totalScore = 0;
    questions.forEach((q) => {
      // Safely compare user answer to correct key
      if (answers[q.id]?.toLowerCase() === q.answer?.toLowerCase()) {
        totalScore++;
      }
    });
    setScore(totalScore);
    setIsSubmitted(true);
  };

  // --- TIMER EFFECT ---
  useEffect(() => {
    if (isSubmitted) return;

    if (timeLeft <= 0) {
      handleSubmit(); // Automatically submit the exam when time runs out!
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, timeLeft]);

  // --- CONVERT SECONDS TO MM:SS ---
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RECORD STUDENT SELECTION ---
  const handleSelect = (optionKey: string) => {
    if (isSubmitted || isReviewMode) return; // Prevent changing choices after submitting
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionKey }));
  };

  // --- SCREEN 1: SCORE SUMMARY (POST-EXAM) ---
  if (isSubmitted && !isReviewMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-cyan-400" />
            </div>
            
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Exam Complete</h2>
            <p className="text-slate-400 font-medium">JAMB Mock - English Language</p>
          </div>

          <div className="py-8 border-y border-white/5">
            <div className="text-7xl font-black text-cyan-400 italic">
              {score}<span className="text-2xl text-slate-600 not-italic">/{questions.length}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">Performance Score</p>
          </div>

          <div className="space-y-4">
            <Button 
                onClick={() => setIsReviewMode(true)}
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl gap-2 transition-all"
            >
                <Eye className="w-5 h-5" /> Review Answers
            </Button>
            <Button 
                variant="outline"
                onClick={onBack}
                className="w-full h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl gap-2 transition-all"
            >
                <Home className="w-5 h-5" /> Back to Hub
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- SCREEN 2: ACTIVE EXAM & REVIEW BOARD ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* Header Panel */}
      <header className="h-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <Book className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-black italic tracking-tighter text-white uppercase text-lg">JAMB CBT Arena</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              English Language • {questions.length} Questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Ticking Clock HUD */}
          <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border transition-all ${
            timeLeft < 300 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' : 'bg-slate-900 border-white/10 text-cyan-400'
          }`}>
            <Timer className="w-5 h-5" />
            <span className="text-2xl font-black italic tabular-nums">{formatTime(timeLeft)}</span>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitted && !isReviewMode}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 rounded-xl px-8 gap-2 shadow-lg shadow-cyan-500/20 border-none transition-all"
          >
            <Send className="w-4 h-4" /> Final Submit
          </Button>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
            
            {/* Left Column: Comprehension Passage (If Available) */}
            {currentQ.hasPassage === 1 && (
                <div className="w-1/2 border-r border-white/5 bg-slate-900/20 flex flex-col p-8">
                    <div className="flex items-center gap-2 mb-6 text-cyan-400 font-black text-xs uppercase tracking-widest">
                        <BookOpen className="w-4 h-4" /> Reading Passage
                    </div>
                    <ScrollArea className="flex-1 pr-6 pb-6">
                        <div 
                            className="text-slate-300 leading-relaxed text-lg italic prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: currentQ.section }}
                        />
                    </ScrollArea>
                </div>
            )}

            {/* Right Column: Question Prompt */}
            <div className={`flex-1 flex flex-col p-12 overflow-y-auto ${currentQ.hasPassage === 1 ? 'w-1/2' : 'w-full max-w-3xl mx-auto'}`}>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-bold px-4 py-1 text-xs">
                           QUESTION {currentIdx + 1} OF {questions.length}
                        </Badge>
                        <h2 
                            className="text-2xl md:text-3xl font-bold leading-tight text-white"
                            dangerouslySetInnerHTML={{ __html: currentQ.question }}
                        />
                    </div>

                    {/* MCQ Options */}
                    <div className="space-y-3">
                        {Object.entries(currentQ.option || {}).map(([key, value]) => {
                            if (!value || key === 'e') return null; // Ignore empty values

                            const isSelected = answers[currentQ.id]?.toLowerCase() === key.toLowerCase();
                            const isCorrect = isReviewMode && currentQ.answer?.toLowerCase() === key.toLowerCase();
                            const isWrong = isReviewMode && isSelected && !isCorrect;

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleSelect(key)}
                                    disabled={isReviewMode}
                                    className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group text-left ${
                                        isCorrect 
                                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                                          : isWrong
                                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                                          : isSelected
                                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                                          : 'bg-white/5 border-transparent hover:border-white/10 text-slate-400'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg uppercase transition-all ${
                                        isCorrect ? 'bg-emerald-500 text-slate-950' : 
                                        isWrong ? 'bg-rose-500 text-white' :
                                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500 group-hover:text-cyan-400'
                                    }`}>
                                        {key}
                                    </div>
                                    <span className="flex-1 font-semibold text-lg">{value}</span>
                                    {isReviewMode && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                                    {isReviewMode && isWrong && <XCircle className="w-6 h-6 text-rose-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* AI Tutor Explanation Box (Only shown in Review Mode) */}
                    {isReviewMode && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 rounded-[2rem] bg-slate-900 border border-white/5 space-y-4 shadow-xl"
                        >
                            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest">
                                <Info className="w-4 h-4" /> Classroom Explanation
                            </div>
                            <div className="flex gap-4">
                               <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/20 border border-white/10 overflow-hidden flex items-center justify-center p-1">
                                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Chuks" alt="Tutor avatar" />
                               </div>
                               <div className="space-y-4">
                                   <div className="bg-slate-800 p-6 rounded-tr-3xl rounded-br-3xl rounded-bl-3xl text-slate-300 leading-relaxed text-sm">
                                       {currentQ.solution || "This choice follows fundamental English grammar guidelines. Revise similar concepts in the course module if you're stuck."}
                                   </div>
                                   <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 py-1.5 font-bold">
                                      CORRECT KEY: {currentQ.answer?.toUpperCase()}
                                   </Badge>
                               </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Footer Controls & Questions Jump Pad */}
      <footer className="h-32 border-t border-white/5 bg-slate-950 px-8 flex items-center justify-between gap-12">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="h-14 w-14 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button 
            variant="outline"
            className="h-14 w-14 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Quick Question Select Pad */}
        <div className="flex-1 flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar justify-center">
            {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isActive = currentIdx === i;
                const isCorrect = isReviewMode && answers[q.id]?.toLowerCase() === q.answer?.toLowerCase();
                const isWrong = isReviewMode && isAnswered && !isCorrect;

                return (
                    <button
                        key={q.id}
                        onClick={() => setCurrentIdx(i)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${
                            isCorrect ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 
                            isWrong ? 'bg-rose-500 border-rose-400 text-white' :
                            isActive ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black' :
                            isAnswered ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' :
                            'bg-slate-900 border-white/10 text-slate-600 hover:border-white/25'
                        }`}
                    >
                        {i + 1}
                    </button>
                );
            })}
        </div>

        <div className="flex gap-3">
          {isReviewMode ? (
              <Button 
                onClick={onBack}
                className="h-14 px-8 rounded-2xl bg-slate-900 border border-white/10 text-white font-bold gap-2"
              >
                <Home className="w-5 h-5" /> Go Back Hub
              </Button>
          ) : (
             <Button 
                variant="outline"
                onClick={onBack}
                className="h-14 px-8 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold gap-2"
              >
                Quit Exam
              </Button>
          )}
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
