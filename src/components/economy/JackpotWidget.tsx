import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Zap, CheckCircle2, Lock, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function JackpotWidget() {
  const [jackpot, setJackpot] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

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
            const text = await res.text();
            console.error('Jackpot API returned non-JSON:', text);
          }
        } else {
          console.error('Jackpot API error:', res.status, res.statusText);
        }
      } catch (e) {
        console.error('Failed to fetch jackpot', e);
      }
    };
    fetchJackpot();

    // Mock progress for demo
    setProgress(2); // User has done 2/3 lessons
  }, []);

  useEffect(() => {
    if (!jackpot) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(jackpot.next_draw).getTime() - now;
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [jackpot]);

  const enterJackpot = async () => {
    try {
      const res = await fetch('/api/economy/jackpot/enter', { method: 'POST' });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        setIsEnrolled(true);
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.error || 'Failed to enter jackpot');
        } catch {
          alert(text || 'Server error occurred');
        }
      }
    } catch (e) {
      console.error('Enter jackpot failed', e);
      alert('Network error occurred');
    }
  };

  if (!jackpot) return null;

  return (
    <Card className="border-none shadow-2xl shadow-blue-200/50 rounded-[32px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      <CardContent className="p-8 relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <Badge className="bg-yellow-500 text-black font-black px-4 py-1 rounded-full animate-pulse">
            DAILY JACKPOT
          </Badge>
          <div className="flex items-center gap-2 text-blue-100 font-mono font-bold text-sm">
            <Timer className="w-4 h-4" /> {timeLeft}
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="text-blue-200 text-xs font-black uppercase tracking-widest">Current Prize Pool</div>
          <div className="text-6xl font-black tracking-tighter flex items-center justify-center gap-3">
            <Coins className="w-12 h-12 text-yellow-400" /> {jackpot.current_pool.toLocaleString()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-blue-100">
            <span>Entry Progress</span>
            <span>{progress}/3 Lessons</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(progress / 3) * 100}%` }}
              className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
            />
          </div>
        </div>

        <div className="pt-2">
          {isEnrolled ? (
            <Button className="w-full py-8 bg-green-500 hover:bg-green-600 text-white font-black text-xl rounded-2xl gap-3 shadow-xl shadow-green-900/20">
              <CheckCircle2 className="w-6 h-6" /> ENROLLED
            </Button>
          ) : (
            <Button 
              className={`w-full py-8 font-black text-xl rounded-2xl gap-3 shadow-xl transition-all ${
                progress >= 3 
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-yellow-900/20' 
                : 'bg-white/10 text-white/50 cursor-not-allowed border border-white/10'
              }`}
              onClick={enterJackpot}
              disabled={progress < 3}
            >
              {progress >= 3 ? (
                <>ENTER JACKPOT <Zap className="w-6 h-6 fill-current" /></>
              ) : (
                <><Lock className="w-6 h-6" /> COMPLETE 3 LESSONS</>
              )}
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-60">
          Winners announced daily at midnight • 12,402 Scholars entered
        </p>
      </CardContent>
    </Card>
  );
}
