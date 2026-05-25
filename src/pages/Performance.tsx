import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import { supabase } from '@/src/lib/supabase';
import { Brain, TrendingUp, Award, Zap } from 'lucide-react';

export default function Performance() {
  const [data, setData] = useState({ stats: null, mastery: [] });

  useEffect(() => {
    const fetchData = async () => {
        if (!supabase) return;
        // Mocking the query
        const { data: stats } = await supabase.from('exam_results').select('*');
        const { data: mastery } = await supabase.from('topic_mastery').select('*');
        setData({ stats, mastery });
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8 bg-zinc-950 text-white min-h-screen">
      <h1 className="text-3xl font-black">Performance Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-white/10 p-6 rounded-3xl">
          <h3 className="text-zinc-400 font-bold">Avg Score</h3>
          <p className="text-4xl font-black text-cyan-400">78%</p>
        </Card>
        <Card className="bg-zinc-900 border-white/10 p-6 rounded-3xl">
          <h3 className="text-zinc-400 font-bold">Exam Readiness</h3>
          <p className="text-4xl font-black text-emerald-400">82%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-zinc-900 border-white/10 p-6 rounded-3xl h-96">
          <h3 className="font-bold mb-6">Subject Performance</h3>
          <ResponsiveContainer>
            <BarChart data={[{name: 'Math', score: 85}, {name: 'English', score: 65}, {name: 'Physics', score: 90}]}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* AI Insight Card */}
        <Card className="bg-purple-950/20 border-purple-500/30 p-8 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-3">
             <Brain className="w-8 h-8 text-purple-400" />
             <h3 className="font-black text-xl">AI Performance Insight</h3>
          </div>
          <p className="text-lg text-zinc-300 leading-relaxed">
            "Your Mathematics score improved by 15% this week, but Physics is declining. 
            Focus more on Motion and Energy topics to boost your exam readiness score." 
          </p>
          <Button className="rounded-xl bg-purple-600">Review Weak Areas</Button>
        </Card>
      </div>
    </div>
  );
}
