import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/src/lib/supabase';
import { Trophy, Award, Zap, BookOpen, Brain, Flame, Star, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('achievements').select('*');
      if (data) setAchievements(data);
    };
    fetchAchievements();
  }, []);

  return (
    <div className="p-8 space-y-8 bg-zinc-950 text-white min-h-screen">
      <header className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Achievements</h1>
          <div className="flex gap-4 items-center bg-zinc-900 px-6 py-3 rounded-full border border-white/10">
              <span className="font-bold">Total XP: 1,200</span>
              <span className="font-bold text-cyan-400">Level: Gold</span>
          </div>
      </header>

      {/* Hero Summary */}
      <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 border-none p-8 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-white/10 rounded-2xl">
            <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <p className="font-black text-2xl">12</p>
            <p className="text-zinc-200">Unlocked</p>
        </div>
        <div className="text-center p-4 bg-white/10 rounded-2xl">
            <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
            <p className="font-black text-2xl">7</p>
            <p className="text-zinc-200">Day Streak</p>
        </div>
        <div className="text-center p-4 bg-white/10 rounded-2xl">
            <Star className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
            <p className="font-black text-2xl">85%</p>
            <p className="text-zinc-200">Completion</p>
        </div>
      </Card>

      {/* Achievement Grid */}
      <h2 className="text-2xl font-bold mt-8">Academic Milestones</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((ach, i) => (
          <Card key={i} className="bg-zinc-900 border-white/10 p-6 rounded-3xl flex gap-4">
              <div className="p-4 bg-zinc-800 rounded-2xl h-16 w-16 flex items-center justify-center">
                  <Award className="w-8 h-8 text-cyan-500" />
              </div>
              <div className="flex-1">
                  <h4 className="font-bold text-lg">{ach.title}</h4>
                  <p className="text-sm text-zinc-400 mb-2">{ach.description}</p>
                  <Progress value={50} className="h-2 bg-zinc-800" />
                  <p className="text-xs text-zinc-500 mt-1">+{ach.xp_reward} XP</p>
              </div>
          </Card>
        ))}
        {/* Locked Examples */}
         <Card className="bg-zinc-900/50 border-white/5 p-6 rounded-3xl flex gap-4 opacity-50">
              <div className="p-4 bg-zinc-800 rounded-2xl h-16 w-16 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-zinc-500" />
              </div>
              <div className="flex-1">
                  <h4 className="font-bold text-lg">Coming Soon...</h4>
                  <p className="text-sm text-zinc-400">Keep studying to unlock!</p>
              </div>
          </Card>
      </div>
    </div>
  );
}
