import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/src/lib/supabase';
import { Brain, Trophy, Flame, ChevronUp, ChevronDown, Award } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
        if (!supabase) return;
        const { data } = await supabase
        .from('users')
        .select('name, points, badges')
        .order('points', { ascending: false });
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  return (
    <div className="p-8 space-y-8 bg-zinc-950 text-white min-h-screen">
      <h1 className="text-3xl font-black">Leaderboard</h1>
      
      {/* Top Rank Hero */}
      <Card className="bg-gradient-to-r from-cyan-900 to-purple-900 border-none p-8 rounded-3xl flex items-center justify-between">
        <div>
            <h2 className="text-xl">Your Current Rank</h2>
            <p className="text-5xl font-black">#12</p>
            <p className="text-zinc-300">Nationwide</p>
        </div>
        <div className="flex gap-4">
            <div className="text-center p-4 bg-white/10 rounded-2xl">
                <Flame className="w-8 h-8 text-orange-400 mx-auto" />
                <p className="font-bold">12 Day Streak</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-2xl">
                <Award className="w-8 h-8 text-yellow-400 mx-auto" />
                <p className="font-bold">Gold League</p>
            </div>
        </div>
      </Card>

      {/* Leaderboard Table */}
      <Card className="bg-zinc-900 border-white/10 rounded-3xl p-6">
        <table className="w-full">
            <thead>
                <tr className="text-zinc-400 text-left border-b border-white/10">
                    <th className="p-4">Rank</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">XP</th>
                    <th className="p-4">Trend</th>
                </tr>
            </thead>
            <tbody>
                {users.map((user, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-zinc-800">
                        <td className="p-4 font-black text-xl">#{i + 1}</td>
                        <td className="p-4 font-bold">{user.name || 'Anonymous'}</td>
                        <td className="p-4 font-mono text-cyan-400">{user.points}</td>
                        <td className="p-4"><ChevronUp className="text-emerald-500" /></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </Card>
      
      {/* AI Insight */}
      <Card className="bg-purple-950/20 border-purple-500/30 p-8 rounded-3xl flex items-center gap-6">
        <Brain className="w-12 h-12 text-purple-400" />
        <p className="text-lg text-zinc-300">
           "You are close to top 10! Your practice frequency decreased this week. Increase it to climb faster."
        </p>
        <Button className="rounded-xl bg-purple-600">Improve Rank</Button>
      </Card>
    </div>
  );
}
