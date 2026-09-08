import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard, student-friendly animation library
import { Trophy, Timer, Zap, Swords, Shield, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

// Math equations rendering packages
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// TypeScript definitions for clean data structure rules
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
  // --- STATE MANAGEMENT ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(6);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showVersus, setShowVersus] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [battleState, setBattleState] = useState({ players });
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- SAFE PLAYER ASSIGNMENT ---
  // Prevents the page from crashing if player data hasn't fully loaded yet
  const player1 = battleState.players?.[0] || players[0] || { name: "Player 1", score: 0, school: "Academy" };
  const player2 = battleState.players?.[1] || players[1] || { name: "Player 2", score: 0, school: "Academy" };

  // --- ANTI-CHEAT MONITOR ---
  // Detects when students leave the tab during a test
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isCompleted) {
        toast.error("HONOR CODE WARNING!", {
          description: "Tab switching is monitored. Please stay on the arena page!",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isCompleted]);

  // --- GAME START COUNTDOWN TIMER ---
  // Controls the cinematic "VS" intro before the game begins
  useEffect(() => {
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
    }, 2000); // Intro screen shows for 2 seconds, then counts down 3..2..1..
    return () => clearTimeout(timer);
  }, []);

  // --- QUESTION TIMER ---
  // Runs the ticking countdown for each question
  useEffect(() => {
    if (showVersus || isCompleted) return;

    setTimeLeft(6); // 6 seconds limit per question
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

  // --- REAL-TIME SERVER COMMUNICATION (SOCKETS) ---
  // Listens to game updates from the server
  useEffect(() => {
    if (!socket) return;

    socket.on("battle_update", (data: any) => {
      if (data?.players) {
        setBattleState({ players: data.players });
      }
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

  // --- SUBMITTING ANSWERS ---
  const handleAnswer = (answerKey: string) => {
    if (selectedAnswer || timeLeft === 0) return; // Prevent clicking multiple times or after timeout
    setSelectedAnswer(answerKey);
    socket.emit("submit_battle_answer", { 
      battleId, 
      questionIndex: currentQuestionIndex, 
      answer: answerKey 
    });
  };

  // --- SCREEN 1: THE VERSUS SPLASH SCREEN ---
  if (showVersus) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex flex-col md:flex-row items-center gap-12 md:gap-20 p-6"
        >
          {/* Player 1 Details */}
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-center space-y-4"
          >
            <Avatar className="w-28 h-28 border-4 border-cyan-500 mx-auto shadow-lg shadow-cyan-500/20">
              <AvatarFallback className="bg-slate-900 text-3xl font-black text-cyan-400">
                {player1.name?.[0]?.toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-black text-white">{player1.name}</h3>
              <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest">{player1.school}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge className="bg-white/10 text-white border-none text-[10px]">
                  {player1.rank || "Challenger"}
                </Badge>
                <Badge className="bg-white/10 text-white border-none text-[10px]">
                  {player1.wins || 0}W - {player1.losses || 0}L
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* VS Center Indicator */}
          <div className="relative flex flex-col items-center justify-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="text-6xl font-black italic text-rose-500 tracking-wider"
            >
              VS
            </motion.div>
            {countdown > 0 && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute top-20 text-7xl font-black text-white"
              >
                {countdown}
              </motion.div>
            )}
          </div>

          {/* Player 2 Details */}
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-center space-y-4"
          >
            <Avatar className="w-28 h-28 border-4 border-rose-500 mx-auto shadow-lg shadow-rose-500/20">
              <AvatarFallback className="bg-slate-900 text-3xl font-black text-rose-400">
                {player2.name?.[0]?.toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-black text-white">{player2.name}</h3>
              <p className="text-rose-400 font-bold text-xs uppercase tracking-widest">{player2.school}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge className="bg-white/10 text-white border-none text-[10px]">
                  {player2.rank || "Challenger"}
                </Badge>
                <Badge className="bg-white/10 text-white border-none text-[10px]">
                  {player2.wins || 0}W - {player2.losses || 0}L
                </Badge>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // --- SCREEN 2: THE RESULTS SUMMARY ---
  if (isCompleted && results) {
    const isWinner = results.winner?.id === players[0]?.id;
    
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
          >
            <Trophy className={`w-20 h-20 ${isWinner ? 'text-yellow-400' : 'text-slate-400'} mx-auto`} />
          </motion.div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            {isWinner ? 'VICTORY!' : 'GOOD EFFORT!'}
          </h2>
          <p className="text-slate-400 text-sm font-semibold tracking-wider">
            {isWinner ? 'Amazing performance in the arena!' : 'Review the questions and play again to improve!'}
          </p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {results.players?.map((p: any) => (
                <div 
                  key={p.id} 
                  className={`text-center p-6 rounded-2xl ${
                    p.id === results.winner?.id 
                      ? 'bg-cyan-500/10 border-2 border-cyan-500' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {p.id === results.winner?.id ? 'WINNER 🏆' : 'RUNNER UP'}
                  </div>
                  <div className="text-lg font-black text-white mb-1 truncate">{p.name}</div>
                  <div className="text-3xl font-black text-cyan-400">{p.score} pts</div>
                </div>
              ))}
            </div>

            {/* Game Rewards section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">EXP GAINED</div>
                  <div className="font-black text-white">+{isWinner ? 250 : 50} XP</div>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                <Star className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">COINS REWARD</div>
                  <div className="font-black text-white">+{isWinner ? 50 : 10}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <Button 
                onClick={() => {
                  const opponent = players.find(p => p.id !== players[0]?.id);
                  if (opponent) {
                    socket.emit("challenge_user", { 
                      targetUserId: opponent.id, 
                      fromUser: { id: players[0].id, name: players[0].name, school: players[0].school, level: players[0].level } 
                    });
                    toast.success("Rematch request sent!");
                  }
                }}
                variant="outline"
                className="flex-1 py-6 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 font-bold rounded-xl"
              >
                REQUEST REMATCH
              </Button>
              <Button 
                onClick={() => onComplete(results)}
                className="flex-1 py-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl"
              >
                BACK TO LOBBY
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- SCREEN 3: ACTIVE PLAYING ARENA ---
  // Safely find the current question or fall back gracefully
  const currentQuestion = questions?.[currentQuestionIndex] || { 
    question: "Loading next quiz card...", 
    options: {} 
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Dynamic Header: Progress trackers for both players */}
      <div className="fixed top-0 left-0 w-full h-1.5 flex z-50">
        <div className="flex-1 bg-slate-900 overflow-hidden">
          <motion.div 
            className="h-full bg-cyan-500 float-right"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(((player1.score || 0) / 1500) * 100, 100)}%` }}
          />
        </div>
        <div className="w-1 bg-white/20" />
        <div className="flex-1 bg-slate-900 overflow-hidden">
          <motion.div 
            className="h-full bg-rose-500"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(((player2.score || 0) / 1500) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Realtime Match HUD */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/30 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-cyan-500/50">
            <AvatarFallback className="bg-cyan-500/10 text-cyan-400 font-bold">
              {player1.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">YOU</div>
            <div className="text-xl font-black text-cyan-400">{player1.score || 0}</div>
          </div>
        </div>

        {/* Circular Countdown Progress */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="24"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="6"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="24"
              fill="none"
              stroke={timeLeft <= 2 ? "#f43f5e" : "#06b6d4"}
              strokeWidth="6"
              strokeDasharray="150.8"
              animate={{ strokeDashoffset: 150.8 - (150.8 * timeLeft) / 6 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="absolute text-xl font-bold text-white">{timeLeft}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">OPPONENT</div>
            <div className="text-xl font-black text-rose-400">{player2.score || 0}</div>
          </div>
          <Avatar className="w-10 h-10 border border-rose-500/50">
            <AvatarFallback className="bg-rose-500/10 text-rose-400 font-bold">
              {player2.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Card with Question and Answers */}
      <Card className="bg-slate-900/60 border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
        {/* Progress Bar for Current Question Count */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-cyan-500"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentQuestionIndex + 1) / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>

        <CardContent className="p-8 md:p-12 space-y-8">
          <div className="space-y-4 text-center">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-none font-bold px-3 py-1 text-xs">
              QUESTION {currentQuestionIndex + 1} OF {questions.length || 10}
            </Badge>
            {currentQuestion.year && (
              <Badge className="ml-2 bg-slate-800 text-slate-300 border-none font-bold px-3 py-1 text-xs">
                {currentQuestion.year}
              </Badge>
            )}

            {/* Support Markdown + Math (KaTeX) */}
            <div className="text-xl md:text-2xl font-semibold text-white leading-relaxed pt-2">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {currentQuestion.question || currentQuestion.question_text || currentQuestion.text || ""}
              </ReactMarkdown>
            </div>
          </div>

          {/* Render Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentQuestion.options || {}).map(([key, text]: any) => (
              <Button
                key={key}
                onClick={() => handleAnswer(key)}
                disabled={!!selectedAnswer || timeLeft === 0}
                className={`h-20 text-base font-medium rounded-2xl border transition-all flex items-center justify-start px-5 gap-4 ${
                  selectedAnswer === key 
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-200'
                }`}
              >
                {/* Visual Label (e.g., A, B, C, D) */}
                <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-lg ${
                  selectedAnswer === key 
                    ? 'bg-cyan-400 text-slate-950' 
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {key}
                </div>
                
                <div className="flex-1 text-left truncate">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {text}
                  </ReactMarkdown>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Footer */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-semibold tracking-wider">
        <AlertCircle className="w-3.5 h-3.5" /> 
        <span>SCREEN AUTO-LOCKED • STAY ON TAB TO KEEP SCORE</span>
      </div>
    </div>
  );
}
