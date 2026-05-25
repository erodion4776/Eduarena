import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, Send, BookOpen, Zap, GraduationCap, Lightbulb, Search, Sparkles } from 'lucide-react';

export default function AITutor() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, source?: string }[]>([
    { role: 'ai', content: 'Hello! I am Tutor Chuks, your AI Tutor. I can help you master WAEC, JAMB, and NECO topics with real past questions and interactive curriculum guides. Ask me a question, or select a topic from the syllabus.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: messages.map(m => ({
            sender: m.role === 'user' ? 'student' : 'tutor',
            text: m.content
          }))
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response, source: data.source }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', content: 'Omo! I am having trouble connecting to my database sync right now. Please check your signal and retry.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Central Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">AI Learning Tutor</h1>
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> RAG Enhanced Core
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex flex-col max-w-[80%] space-y-2">
                <div className={`p-4 rounded-2xl ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-50 rounded-tr-none' 
                    : 'bg-zinc-900/80 border border-white/5 text-zinc-200 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
                {m.source && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 shadow-inner w-fit">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-450" /> Source: {m.source}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold bg-zinc-900/60 w-fit px-4 py-2.5 rounded-xl border border-white/5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Searching Knowledge Base (RAG)...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-white/5">
          <div className="flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3 outline-none text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 transition-colors"
              placeholder="Ask a question about a topic..."
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            />
            <Button onClick={() => sendMessage(input)} disabled={loading} className="rounded-xl bg-cyan-500 hover:bg-cyan-450 text-slate-950 font-bold">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>

      {/* Right Tools Panel */}
      <aside className="w-80 border-l border-white/10 bg-zinc-900/20 p-6 hidden lg:flex flex-col gap-5 overflow-y-auto">
        <div>
          <h3 className="font-black text-xs uppercase text-zinc-400 tracking-wider mb-3">Learning Tools</h3>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start rounded-xl border-white/5 bg-zinc-900/50 text-zinc-300 hover:text-white" onClick={() => sendMessage('Generate 5 practice questions on Biology')}>
              <Zap className="w-4 h-4 mr-2 text-amber-400" /> Generate Practice Qs
            </Button>
            <Button variant="outline" className="justify-start rounded-xl border-white/5 bg-zinc-900/50 text-zinc-300 hover:text-white" onClick={() => sendMessage('Give me a step-by-step breakdown of the last concept')}>
              <GraduationCap className="w-4 h-4 mr-2 text-cyan-400" /> Step-by-Step Solver
            </Button>
            <Button variant="outline" className="justify-start rounded-xl border-white/5 bg-zinc-900/50 text-zinc-300 hover:text-white" onClick={() => sendMessage('Provide a hint for this topic')}>
              <Lightbulb className="w-4 h-4 mr-2 text-emerald-400" /> Quick Hint
            </Button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4">
          <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-3">High-Yield Syllabus Topics</h4>
          <div className="space-y-2">
            {[
              { label: 'Cell & Organization of Life', query: 'Explain the organization of life starting from cell to tissue and organ system.' },
              { label: 'Law of Diminishing Marginal Utility', query: 'What is the law of diminishing marginal utility and how does it relate to consumer equilibrium?' },
              { label: 'Problems of West African Agriculture', query: 'Discuss the major problems of agricultural development in West Africa and possible solutions.' },
              { label: 'African Poetry Analysis (Vanity)', query: 'Analyze the common themes in Birago Diops poem "Vanity" or Gbemisola Adeotis poem "Ambush".' },
            ].map((topic, i) => (
              <button
                key={i}
                onClick={() => sendMessage(topic.query)}
                className="w-full text-left p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors border border-white/5 hover:border-cyan-500/30 flex items-start gap-2 group"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <span>{topic.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
