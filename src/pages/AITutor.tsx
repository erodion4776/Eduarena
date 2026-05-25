import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, Send, BookOpen, Zap, GraduationCap, Lightbulb, Search } from 'lucide-react';

export default function AITutor() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Hello! I am your AI Tutor. I can help you with WAEC, JAMB, and NECO topics. Ask me a question, or select a topic from the syllabus.' }
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
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I am having trouble connecting right now.' }]);
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
          <div className="p-2 bg-purple-500/20 rounded-xl"><Brain className="w-6 h-6 text-purple-400" /></div>
          <h1 className="text-xl font-black">AI Learning Tutor</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-cyan-600' : 'bg-zinc-800'}`}>
                {m.content}
              </div>
            </motion.div>
          ))}
          {loading && <div className="text-zinc-500 text-sm italic">AI Tutor is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-zinc-900 border-t border-white/10">
          <div className="flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-zinc-800 rounded-xl p-3 outline-none"
              placeholder="Ask a question about a topic..."
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            />
            <Button onClick={() => sendMessage(input)} disabled={loading} className="rounded-xl"><Send className="w-5 h-5" /></Button>
          </div>
        </div>
      </main>

      {/* Right Tools Panel */}
      <aside className="w-80 border-l border-white/10 bg-zinc-900/50 p-6 hidden lg:flex flex-col gap-4">
        <h3 className="font-bold text-zinc-400">Learning Tools</h3>
        <Button variant="outline" className="justify-start rounded-xl" onClick={() => sendMessage('Generate 5 practice questions on Biology')}><Zap className="w-4 h-4 mr-2" /> Generate Practice Qs</Button>
        <Button variant="outline" className="justify-start rounded-xl" onClick={() => sendMessage('Give me a step-by-step breakdown of the last concept')}><GraduationCap className="w-4 h-4 mr-2" /> Step-by-Step Solver</Button>
        <Button variant="outline" className="justify-start rounded-xl" onClick={() => sendMessage('Provide a hint for this topic')}><Lightbulb className="w-4 h-4 mr-2" /> Quick Hint</Button>
      </aside>
    </div>
  );
}
