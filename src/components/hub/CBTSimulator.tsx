import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, ChevronLeft, ChevronRight, Send, 
  BookOpen, CheckCircle2, XCircle, Info, RotateCcw, 
  Home, Book
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ENGLISH_ARCHIVE, JambQuestion } from '@/src/data/englishArchive';

interface SelectedOptions {
  [questionId: number]: string;
}

export default function CBTSimulator({ onBack }: { onBack: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<SelectedOptions>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [score, setScore] = useState(0);

  const questions = useMemo(() => ENGLISH_ARCHIVE, []);
  const currentQ = questions[currentIdx];

  // Timer Logic
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (option: string) => {
    if (isSubmitted && !isReviewMode) return;
    if (isReviewMode) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
  };

  const handleSubmit = () => {
    let totalScore = 0;
    questions.forEach(q => {
      if (answers[q.id]?.toLowerCase() === q.answer?.toLowerCase()) {
        totalScore++;
      }
    });
    setScore(totalScore);
    setIsSubmitted(true);
  };

  if (isSubmitted && !isReviewMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
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
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl gap-2"
            >
                <Eye className="w-5 h-5" /> Review Answers
            </Button>
            <Button 
                variant="outline"
                onClick={onBack}
                className="w-full h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl gap-2"
            >
                <Home className="w-5 h-5" /> Back to Hub
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="h-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <Book className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-black italic tracking-tighter text-white uppercase text-lg">JAMB Mock Exam</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">English Language • {questions.length} Questions</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border transition-all ${
            timeLeft < 300 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-900 border-white/10 text-cyan-400'
          }`}>
            <Timer className={`w-5 h-5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
            <span className="text-2xl font-black italic tabular-nums">{formatTime(timeLeft)}</span>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isSubmitted && !isReviewMode}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 rounded-xl px-8 gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" /> Final Submit
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
            {/* Left: Passage */}
            {currentQ.hasPassage === 1 && (
                <div className="w-1/2 border-r border-white/5 bg-slate-900/20 flex flex-col p-8">
                    <div className="flex items-center gap-2 mb-6 text-cyan-400 font-black text-xs uppercase tracking-[0.2em]">
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

            {/* Right: Question */}
            <div className={`flex-1 flex flex-col p-12 overflow-y-auto ${currentQ.hasPassage === 1 ? 'w-1/2' : 'w-full max-w-3xl mx-auto'}`}>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-black px-4 py-1 text-xs">
                           QUESTION {currentIdx + 1} OF {questions.length}
                        </Badge>
                        <h2 
                            className="text-2xl md:text-3xl font-bold leading-tight text-white"
                            dangerouslySetInnerHTML={{ __html: currentQ.question }}
                        />
                    </div>

                    <div className="space-y-3">
                        {Object.entries(currentQ.option).map(([key, value]) => {
                            if (!value || key === 'e') return null;
                            const isSelected = answers[currentQ.id]?.toLowerCase() === key.toLowerCase();
                            const isCorrect = isReviewMode && currentQ.answer?.toLowerCase() === key.toLowerCase();
                            const isWrong = isReviewMode && isSelected && !isCorrect;

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleSelect(key)}
                                    disabled={isReviewMode}
                                    className={`w-full p-6 p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group text-left ${
                                        isCorrect 
                                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                                          : isWrong
                                          ? 'bg-red-500/10 border-red-500/50 text-red-300'
                                          : isSelected
                                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                                          : 'bg-white/5 border-transparent hover:border-white/10 text-slate-400'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg uppercase transition-all ${
                                        isCorrect ? 'bg-emerald-500 text-slate-950' : 
                                        isWrong ? 'bg-red-500 text-white' :
                                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500 group-hover:text-cyan-400'
                                    }`}>
                                        {key}
                                    </div>
                                    <span className="flex-1 font-semibold text-lg">{value}</span>
                                    {isReviewMode && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                                    {isReviewMode && isWrong && <XCircle className="w-6 h-6 text-red-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {isReviewMode && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-8 rounded-[2rem] bg-slate-900 border border-white/5 space-y-4 shadow-xl"
                        >
                            <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-widest">
                                <Info className="w-4 h-4" /> Tutor Explanation
                            </div>
                            <div className="flex gap-4">
                               <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/20 border border-white/10 overflow-hidden flex items-center justify-center p-1">
                                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Chuks" alt="Tutor" />
                               </div>
                               <div className="space-y-4">
                                   <div className="bg-slate-800 p-6 rounded-tr-3xl rounded-br-3xl rounded-bl-3xl text-slate-300 leading-relaxed text-sm">
                                       {currentQ.solution || "This follows standard grammatical rules for this sub-category. Let's break it down further if you need clarification!"}
                                   </div>
                                   <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-1">
                                      CORRECT KEY: {currentQ.answer.toUpperCase()}
                                   </Badge>
                               </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="h-32 border-t border-white/5 bg-slate-950 px-8 flex items-center justify-between gap-12">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="h-14 w-14 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button 
            variant="outline"
            className="h-14 w-14 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

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
                            isWrong ? 'bg-red-500 border-red-400 text-white' :
                            isActive ? 'bg-cyan-500 border-cyan-400 text-slate-950' :
                            isAnswered ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' :
                            'bg-slate-900 border-white/10 text-slate-600'
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
                <Home className="w-5 h-5" /> Hub
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

function Eye({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
