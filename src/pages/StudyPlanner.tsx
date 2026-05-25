import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Brain, Clock, CheckCircle, AlertCircle, Sparkles, Target } from 'lucide-react';

export default function StudyPlanner() {
  const [tasks] = useState([
    { subject: 'Mathematics', topic: 'Algebra - Quadratic Equations', duration: '30 mins', status: 'pending', priority: 'high' },
    { subject: 'Physics', topic: 'Motion - Newton\'s Laws', duration: '45 mins', status: 'completed', priority: 'high' },
    { subject: 'English', topic: 'Comprehension', duration: '20 mins', status: 'pending', priority: 'medium' },
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Calendar Panel */}
      <aside className="w-80 border-r border-white/10 p-6 space-y-6 hidden md:block">
        <h2 className="font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-cyan-400" /> Weekly Schedule</h2>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
          <div key={day} className="p-4 bg-zinc-900 rounded-xl border border-white/5 flex gap-4">
            <span className="font-bold w-12">{day}</span>
            <div className="text-sm text-zinc-400">2 Study Sessions</div>
          </div>
        ))}
      </aside>

      {/* Main Plan Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-black">AI Study Planner</h1>
          <Button className="rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold">
            <Sparkles className="w-4 h-4 mr-2" /> Generate Study Plan
          </Button>
        </header>

        <section className="space-y-4">
          <h3 className="font-bold text-zinc-400">Today's Tasks</h3>
          <div className="grid gap-4">
            {tasks.map((task, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-5 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold">{task.subject}</h4>
                  <p className="text-sm text-zinc-400">{task.topic}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs flex items-center gap-1 font-mono"><Clock className="w-3 h-3" /> {task.duration}</span>
                  {task.status === 'completed' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* AI Assistant Panel */}
      <aside className="w-96 border-l border-white/10 p-6 bg-zinc-900/30 space-y-6 hidden lg:block">
        <div className="p-5 rounded-2xl bg-purple-900/20 border border-purple-500/20">
          <Brain className="w-8 h-8 text-purple-400 mb-4" />
          <h3 className="font-bold mb-2">AI Suggestion</h3>
          <p className="text-sm text-zinc-300">"You are behind in Chemistry by 2 hours. Focus on Electrolysis during your free slot today to get back on track."</p>
          <Button variant="secondary" className="w-full mt-4 rounded-xl">Add Task</Button>
        </div>
        
        <Card className="p-5 bg-zinc-900 border-white/5 rounded-2xl">
          <h4 className="font-bold flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-emerald-400" /> Exam Readiness</h4>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[65%]" />
          </div>
          <p className="text-xs text-zinc-500 mt-2">65% Prepared for JAMB 2024</p>
        </Card>
      </aside>
    </div>
  );
}
