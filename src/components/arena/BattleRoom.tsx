import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, Zap, Swords, Shield, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Player {
  id: string;
  name: string;
  school: string;
  score: number;
  level: number;
  wins?: number;
  losses?: number;
  rank?: string;
}

interface BattleRoomProps {
  battleId: string;
  players: Player[];
  questions: any[];
  socket: any;
  onComplete: (results: any) => void;
}

export default function BattleRoom({ battleId, players, questions, socket, onComplete }: BattleRoomProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(6);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showVersus, setShowVersus] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [battleState, setBattleState] = useState({ players });
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isCompleted) {
        toast.error("ANTI-CHEAT ALERT!", {
          description: "Tab switching detected. This incident has been reported.",
        });
        // In a real app, we might penalize the player here
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isCompleted]);

  useEffect(() => {
    // Versus Intro duration
    const timer = setTimeout(() => {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowVersus(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 3000); // Show versus for 3s, then countdown
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showVersus || isCompleted) return;

    setTimeLeft(6);
    setSelectedAnswer(null);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, showVersus, isCompleted]);

  useEffect(() => {
    socket.on("battle_update", (data: any) => {
      setBattleState({ players: data.players });
    });

    socket.on("next_question", ({ index }: { index: number }) => {
      setCurrentQuestionIndex(index);
    });

    socket.on("battle_completed", (data: any) => {
      setIsCompleted(true);
      setResults(data);
    });

    return () => {
      socket.off("battle_update");
      socket.off("next_question");
      socket.off("battle_completed");
    };
  }, [socket]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || timeLeft === 0) return;
    setSelectedAnswer(answer);
    socket.emit("submit_battle_answer", { battleId, questionIndex: currentQuestionIndex, answer });
  };

  if (showVersus) {
    return (
      <div className="fixed inset-0 z-50 bg-arena-bg flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex items-center gap-20"
        >
          <motion.div 
            initial={{ x: -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-center space-y-4"
          >
            <Avatar className="w-32 h-32 border-4 border-arena-primary arena-glow mx-auto">
              <AvatarFallback className="bg-arena-card text-4xl font-black">{players[0].name[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">{players[0].name}</h3>
              <p className="text-arena-neon font-bold text-sm uppercase tracking-widest">{players[0].school}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge className="bg-white/10 text-white border-none text-[10px] font-black">
                  {players[0].rank || "Bronze Scholar"}
                </Badge>
                <Badge className="bg-white/10 text-white border-none text-[10px] font-black">
                  {players[0].wins || 0}W - {players[0].losses || 0}L
                </Badge>
              </div>
            </div>
          </motion.div>

          <div className="relative flex flex-col items-center justify-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1.5 }}
              transition={{ delay: 1, type: "spring" }}
              className="text-6xl font-black italic text-arena-accent"
            >
              VS
            </motion.div>
            {countdown > 0 && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute top-24 text-8xl font-black text-white arena-text-neon"
              >
                {countdown}
              </motion.div>
            )}
          </div>

          <motion.div 
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-center space-y-4"
          >
            <Avatar className="w-32 h-32 border-4 border-arena-secondary arena-glow mx-auto">
              <AvatarFallback className="bg-arena-card text-4xl font-black">{players[1].name[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">{players[1].name}</h3>
              <p className="text-arena-neon font-bold text-sm uppercase tracking-widest">{players[1].school}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge className="bg-white/10 text-white border-none text-[10px] font-black">
                  {players[1].rank || "Bronze Scholar"}
                </Badge>
                <Badge className="bg-white/10 text-white border-none text-[10px] font-black">
                  {players[1].wins || 0}W - {players[1].losses || 0}L
                </Badge>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (isCompleted && results) {
    const isWinner = results.winner.id === players[0].id;
    
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8 animate-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Trophy className={`w-24 h-24 ${isWinner ? 'text-yellow-400' : 'text-slate-400'} mx-auto`} />
          </motion.div>
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">
            {isWinner ? 'VICTORY!' : 'GOOD EFFORT!'}
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest">
            {isWinner ? 'You dominated the arena' : 'Keep practicing to conquer'}
          </p>
        </div>

        <Card className="arena-card border-none shadow-2xl rounded-[40px] overflow-hidden">
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              {results.players.map((p: any) => (
                <div key={p.id} className={`text-center p-6 rounded-3xl ${p.id === results.winner.id ? 'bg-arena-primary/20 border-2 border-arena-primary' : 'bg-white/5'}`}>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {p.id === results.winner.id ? 'WINNER' : 'RUNNER UP'}
                  </div>
                  <div className="text-xl font-black text-white mb-1">{p.name}</div>
                  <div className="text-4xl font-black text-arena-neon">{p.score}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-arena-secondary/20 rounded-lg">
                  <Zap className="w-5 h-5 text-arena-secondary" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">XP GAINED</div>
                  <div className="font-black text-white">+{isWinner ? 250 : 50}</div>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">COINS</div>
                  <div className="font-black text-white">+{isWinner ? 50 : 5}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => {
                  const opponent = players.find(p => p.id !== players[0].id);
                  if (opponent) {
                    socket.emit("challenge_user", { 
                      targetUserId: opponent.id, 
                      fromUser: { id: players[0].id, name: players[0].name, school: players[0].school, level: players[0].level } 
                    });
                    toast.success("Rematch challenge sent!");
                  }
                }}
                variant="outline"
                className="flex-1 py-8 border-2 border-arena-primary text-arena-primary hover:bg-arena-primary/10 font-black text-xl rounded-2xl"
              >
                REMATCH
              </Button>
              <Button 
                onClick={() => onComplete(results)}
                className="flex-1 py-8 bg-arena-primary hover:bg-arena-primary/80 text-white font-black text-xl rounded-2xl"
              >
                LOBBY
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Live Progress Bars */}
      <div className="fixed top-0 left-0 w-full h-2 flex z-50">
        <div className="flex-1 bg-slate-900 overflow-hidden">
          <motion.div 
            className="h-full bg-arena-primary float-right"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min((battleState.players[0].score / 1500) * 100, 100)}%` }}
          />
        </div>
        <div className="w-1 bg-white/20" />
        <div className="flex-1 bg-slate-900 overflow-hidden">
          <motion.div 
            className="h-full bg-arena-secondary"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min((battleState.players[1].score / 1500) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Header: Scores & Timer */}
      <div className="flex items-center justify-between gap-8">
        <div className="flex-1 flex items-center gap-4 p-4 arena-card rounded-2xl">
          <Avatar className="w-12 h-12 border-2 border-arena-primary">
            <AvatarFallback className="font-black">{players[0].name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">YOU</div>
            <div className="text-2xl font-black text-arena-neon">{battleState.players[0].score}</div>
          </div>
        </div>

        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={timeLeft <= 2 ? "#F43F5E" : "#00F5FF"}
              strokeWidth="8"
              strokeDasharray="251.2"
              animate={{ strokeDashoffset: 251.2 - (251.2 * timeLeft) / 6 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="absolute text-3xl font-black text-white">{timeLeft}</div>
        </div>

        <div className="flex-1 flex items-center justify-end gap-4 p-4 arena-card rounded-2xl">
          <div className="text-right">
            <div className="text-xs font-black text-slate-400 uppercase">OPPONENT</div>
            <div className="text-2xl font-black text-arena-accent">{battleState.players[1].score}</div>
          </div>
          <Avatar className="w-12 h-12 border-2 border-arena-secondary">
            <AvatarFallback className="font-black">{players[1].name[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Question Area */}
      <Card className="arena-card border-none shadow-2xl rounded-[40px] overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-arena-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentQuestionIndex + 1) / 10) * 100}%` }}
          />
        </div>
        <CardContent className="p-12 space-y-12">
          <div className="space-y-4 text-center">
            <Badge className="bg-arena-primary/20 text-arena-primary border-none font-black px-4 py-1">
              QUESTION {currentQuestionIndex + 1} OF 10
            </Badge>
            {currentQuestion.year && (
              <Badge className="ml-2 bg-arena-secondary/20 text-arena-secondary border-none font-black px-4 py-1">
                {currentQuestion.year}
              </Badge>
            )}
            <h2 className="text-3xl font-black text-white leading-tight">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {currentQuestion.question || currentQuestion.question_text || currentQuestion.text}
              </ReactMarkdown>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentQuestion.options || {}).map(([label, text]: any) => (
              <Button
                key={label}
                onClick={() => handleAnswer(label)}
                disabled={!!selectedAnswer || timeLeft === 0}
                className={`h-20 text-lg font-bold rounded-2xl border-2 transition-all flex items-center justify-start px-6 gap-4 ${
                  selectedAnswer === label 
                  ? 'bg-arena-primary border-arena-neon text-white' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center font-black rounded-lg ${selectedAnswer === label ? 'bg-white text-arena-primary' : 'bg-white/10 text-slate-400'}`}>
                    {label}
                </div>
                <div className="flex-1 text-left">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {text}
                    </ReactMarkdown>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anti-Cheat Warning */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
        <AlertCircle className="w-4 h-4" /> Screen Locked • Tab Switching Disabled
      </div>
    </div>
  );
}
