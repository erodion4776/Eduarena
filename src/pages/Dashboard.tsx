import React from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { ArrowRight, Zap, Target, BookOpen, FileEdit } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="p-8 space-y-10">
      {/* Welcome Section */}
      <header className="flex items-center justify-between">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.2em]">
             <Zap className="w-3.5 h-3.5" /> Neural Link Active
           </div>
           <h1 className="text-5xl font-black text-white mt-4 tracking-tighter">
             Welcome back, {user?.name?.split(' ')[0] || 'Scholar'}!
           </h1>
           <p className="text-zinc-400 mt-2">You are 78% ready for your next big exam.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl">Continue Study</Button>
          <Button className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">Start CBT</Button>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Continue Practice", icon: BookOpen, color: "bg-emerald-500/10 text-emerald-400" },
          { title: "Mock Exams", icon: FileEdit, color: "bg-cyan-500/10 text-cyan-400" },
          { title: "Daily Challenge", icon: Target, color: "bg-rose-500/10 text-rose-400" },
        ].map((card, idx) => (
            <motion.div 
               key={idx}
               whileHover={{ y: -5 }}                
               className="p-6 rounded-3xl bg-zinc-900 border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer"
            >
                <div className={`p-4 rounded-2xl ${card.color}`}>
                    <card.icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">{card.title}</h3>
                </div>
            </motion.div>
        ))}
      </section>
    </div>
  );
}
