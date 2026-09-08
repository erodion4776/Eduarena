import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Timer, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library

interface Lesson {
  id: string;
  title: string;
}

interface PracticeModeProps {
  lesson?: Lesson;
  onComplete: (coins: number) => void;
}

export default function PracticeMode({ lesson, onComplete }: PracticeModeProps) {
  // --- SAFE FALLBACKS ---
  // Prevents crash if the component is mounted without a valid lesson object
  const activeLesson = lesson || { id: 'default-lesson', title: 'Revision Topic' };

  // --- STATE MANAGEMENT ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // --- FETCH / POPULATE PRACTICE QUESTIONS ---
  useEffect(() => {
    // Simulated database query for lesson-specific questions
    setQuestions([
      {
        id: '1',
        text: 'What is the first step in solving a linear equation?',
        options: ['Multiply everything', 'Isolate the variable', 'Square both sides', 'Divide by zero'],
        correct: 'Isolate the variable',
        explanation: 'The goal is to get the variable by itself on one side of the equation.'
      },
      {
        id: '2',
        text: 'If 3x = 12, what is x?',
        options: ['3', '4', '6', '36'],
        correct: '4',
        explanation: 'Divide both sides by 3: 12 / 3 = 4.'
      }
    ]);
  }, [activeLesson.id]);

  // --- QUESTION TIMER TIMER ---
  useEffect(() => {
    if (showResult || isAnswered) return;

    if (timeLeft <= 0) {
      // Auto-fail/Timeout state if time runs out
      setIsAnswered(true);
      setSelectedAnswer(""); // Empty choice represents a timeout
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isAnswered, showResult]);

  // --- HANDLE OPTION SELECT ---
  const handleAnswer = (option: string) => {
    if (isAnswered) return; // Prevent double submissions
    setSelectedAnswer(option);
    setIsAnswered(true);

    if (option === questions[currentIndex].correct) {
      setScore((prevScore) => prevScore + 1);
    }
  };

  // --- PROCEED TO NEXT TOPIC CARD ---
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(30); // Reset clock back to 30s
    } else {
      setShowResult(true);
    }
  };

  // --- FRIENDLY LOADING VIEW ---
  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <Card className="p-12 border-none bg-slate-900/10">
          <p className="text-slate-500 font-medium animate-pulse">Assembling study deck...</p>
        </Card>
      </div>
    );
  }

  // --- SUMMARY RESULTS SCREEN ---
  if (showResult) {
    const coinsEarned = score * 50;
    const accuracy = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="relative inline-block">
          <Trophy className="w-32 h-32 text-yellow-500 mx-auto" />
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full"
          >
            <CheckCircle2 className="w-6 h-6" />
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Practice Complete!</h1>
          <p className="text-slate-500 text-lg">You've finished the exercises in: <span className="font-bold text-slate-950">{activeLesson.title}</span></p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 bg-slate-50 border-none shadow-sm rounded-3xl">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Accuracy</div>
            <div className="text-4xl font-black text-slate-900 mt-1">{accuracy}%</div>
          </Card>
          
          <Card className="p-6 bg-blue-600 text-white border-none shadow-xl shadow-blue-600/20 rounded-3xl">
            <div className="text-blue-100 text-xs font-bold uppercase tracking-widest">Edu-Coins Earned</div>
            <div className="text-4xl font-black mt-1">+{coinsEarned}</div>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 py-8 text-lg font-bold rounded-2xl border-2 hover:bg-slate-50"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          <Button 
            className="flex-1 py-8 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 border-none"
            onClick={() => onComplete(coinsEarned)}
          >
            Claim Rewards
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      
      {/* HUD Header Bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Badge className="bg-blue-600 hover:bg-blue-600 border-none text-white uppercase tracking-widest font-bold text-[10px]">
            Practice Mode
          </Badge>
          <h2 className="text-sm font-bold text-slate-400">Question {currentIndex + 1} of {questions.length}</h2>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-sm ${
          timeLeft < 10 
            ? 'bg-red-100 text-red-600 animate-pulse' 
            : 'bg-slate-100 text-slate-600'
        }`}>
          <Timer className="w-4 h-4" /> {timeLeft}s
        </div>
      </div>

      {/* Progress Bar indicator */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          className="h-full bg-blue-600"
        />
      </div>

      {/* Question Card */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
        <CardHeader className="p-8 md:p-10 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
            {currentQ.text}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8 md:p-10 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((option: string) => {
              const isCorrect = option === currentQ.correct;
              const isSelected = option === selectedAnswer;
              
              // Dynamic buttons state stylings
              let statusStyle = "border-slate-100 hover:border-blue-600 hover:bg-blue-50/50";
              
              if (isAnswered) {
                if (isCorrect) {
                  statusStyle = "border-green-500 bg-green-50 text-green-700";
                } else if (isSelected) {
                  statusStyle = "border-red-500 bg-red-50 text-red-700";
                } else {
                  statusStyle = "opacity-50 border-slate-100";
                }
              }

              return (
                <Button 
                  key={option} 
                  variant="outline"
                  className={`py-8 text-base md:text-lg font-bold rounded-2xl border-2 transition-all text-left px-6 justify-start h-auto w-full ${statusStyle}`}
                  onClick={() => handleAnswer(option)}
                  disabled={isAnswered}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 ml-2" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-600 shrink-0 ml-2" />}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Explanation panel slides up when answered */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border-2 ${
                  selectedAnswer === currentQ.correct 
                    ? 'bg-green-50/50 border-green-100' 
                    : 'bg-red-50/50 border-red-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 shrink-0 ${selectedAnswer === currentQ.correct ? 'text-green-600' : 'text-red-600'}`}>
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className={`font-black uppercase tracking-widest text-xs mb-1 ${
                      selectedAnswer === currentQ.correct ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedAnswer === "" ? "Time Expired" : "Explanation Insights"}
                    </div>
                    <p className="text-slate-700 font-medium text-sm leading-relaxed">
                      {selectedAnswer === "" 
                        ? `Time ran out! The correct answer is: "${currentQ.correct}". ${currentQ.explanation}` 
                        : currentQ.explanation}
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 rounded-xl gap-2 border-none transition-all" 
                  onClick={nextQuestion}
                >
                  {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
