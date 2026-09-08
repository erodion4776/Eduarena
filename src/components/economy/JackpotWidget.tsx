import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Zap, CheckCircle2, Lock, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library
import { toast } from 'sonner';

// Fallback values so the page never breaks or appears blank if the backend database is offline
const FALLBACK_JACKPOT = {
  current_pool: 10000,
  next_draw: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString() // Default to 5 hours from now
};

export default function JackpotWidget() {
  // --- STATE MANAGEMENT ---
  const [jackpot, setJackpot] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [timeLeft, setTimeLeft] = useState("00h 00m 00s");

  // --- FETCH DATA ON PAGE LOAD ---
  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const res = await fetch('/api/economy/jackpot');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setJackpot(data);
          } else {
            // Fallback if API returned raw HTML instead of JSON
            setJackpot(FALLBACK_JACKPOT);
          }
        } else {
          // Fallback if API status code is not 200
          setJackpot(FALLBACK_JACKPOT);
        }
      } catch (e) {
        // Fallback if server is not running
        setJackpot(FALLBACK_JACKPOT);
      }
    };

    fetchJackpot();

    // Mock progress setup (e.g., student has completed 2 out of 3 required daily tasks)
    setProgress(2); 
  }, []);

  // --- COUNTDOWN TIMER EFFECT ---
  useEffect(() => {
    if (!jackpot) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const drawTime = new Date(jackpot.next_draw).getTime();
      const timeRemaining = drawTime - now;

      if (timeRemaining <= 0) {
        setTimeLeft("00h 00m 00s");
        clearInterval(timer);
        return;
      }

      // Convert milliseconds into standard hours, minutes, and seconds
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

      // Pad with zero for clean presentation (e.g., "05h 09m 02s")
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setTimeLeft(`${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [jackpot]);

  // --- SUBMIT USER ENTRY ---
  const enterJackpot = async () => {
    try {
      const res = await fetch('/api/economy/jackpot/enter', { method: 'POST' });
      
      if (res.ok) {
        setIsEnrolled(true);
        toast.success("Ticket Issued!", {
          description: "You have been successfully entered into today's jackpot draw!"
        });
      } else {
        // Safe user-friendly warning instead of raw code crashes or alerts
        toast.warning("Check back shortly!", {
          description: "The prize draw system is currently updating. Please try again soon."
        });
      }
    } catch (e) {
      toast.error("Network issue detected", {
        description: "Please check your internet connection and try again."
      });
    }
  };

  // Safe fallback loading state so layout shifts are minimized
  const currentPool = jackpot?.current_pool ?? FALLBACK_JACKPOT.current_pool;

  return (
    <Card className="border-none shadow-2xl shadow-blue-200/50 rounded-[32px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative group">
      
      {/* Decorative clean background pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      
      <CardContent className="p-8 relative z-10 space-y-6">
        
        {/* Top Indicators */}
        <div className="flex items-center justify-between">
          <Badge className="bg-yellow-400 text-slate-950 font-black px-4 py-1.5 rounded-full animate-pulse text-xs border-none">
            DAILY JACKPOT
          </Badge>
          <div className="flex items-center gap-2 text-blue-100 font-mono font-bold text-sm">
            <Timer className="w-4 h-4" /> {timeLeft}
          </div>
        </div>

        {/* Prize Pool Showcase */}
        <div className="text-center space-y-2">
          <div className="text-blue-200 text-xs font-bold uppercase tracking-widest">
            Current Prize Pool
          </div>
          <div className="text-5xl md:text-6xl font-black tracking-tighter flex items-center justify-center gap-3">
            <Coins className="w-10 h-10 md:w-12 md:h-12 text-yellow-400" /> 
            {currentPool.toLocaleString()}
          </div>
        </div>

        {/* Learning Lesson Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-blue-100">
            <span>Daily Lesson Task Progress</span>
            <span>{progress}/3 Lessons Completed</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((progress / 3) * 100, 100)}%` }}
              className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2">
          {isEnrolled ? (
            <Button className="w-full py-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl rounded-2xl gap-3 shadow-xl shadow-emerald-900/20 border-none transition-all">
              <CheckCircle2 className="w-6 h-6 animate-bounce" /> ENROLLED IN DRAW
            </Button>
          ) : (
            <Button 
              className={`w-full py-8 font-black text-xl rounded-2xl gap-3 shadow-xl transition-all border-none ${
                progress >= 3 
                ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 shadow-yellow-900/20 hover:scale-[1.01]' 
                : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
              onClick={enterJackpot}
              disabled={progress < 3}
            >
              {progress >= 3 ? (
                <>ENTER JACKPOT NOW <Zap className="w-6 h-6 fill-current" /></>
              ) : (
                <><Lock className="w-6 h-6" /> COMPLETE {3 - progress} MORE LESSONS</>
              )}
            </Button>
          )}
        </div>

        {/* Footer Rules Information */}
        <p className="text-center text-[10px] font-semibold text-blue-200 uppercase tracking-widest opacity-60">
          Winners drawn daily • Complete daily goals to unlock free entry tickets
        </p>
      </CardContent>
    </Card>
  );
}
