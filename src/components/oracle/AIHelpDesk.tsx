import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Sparkles, Send, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function AIHelpDesk({ contextQuestion }: { contextQuestion?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setPrompt('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: `System context: You are "Professor Oracle", part of EduArena's AI Help Desk. Explain things like the user is 5 years old. ${contextQuestion ? `The student is currently looking at this question: ${JSON.stringify(contextQuestion)}` : ''}` },
          ...messages.map(m => ({ text: `${m.role === 'user' ? 'Student' : 'Professor'}: ${m.text}` })),
          { text: `Student: ${userMessage}` }
        ]
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "I'm a bit confused, can you rephrase that?" }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection to the Oracle fell through. Please try again!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
      >
        <div className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20 group-hover:hidden" />
        <MessageSquare className="w-8 h-8" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-28 right-8 w-96 max-h-[600px] bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden"
          >
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black italic uppercase text-sm tracking-tighter">Professor Oracle</h3>
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest leading-none">ELI5 Help Desk</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] bg-slate-50/50">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <Sparkles className="w-12 h-12 text-indigo-200 mx-auto" />
                  <p className="text-slate-400 font-medium text-sm px-8">
                    "Hey there, Scholar! Stuck on a logic problem? Ask me anything about your current question."
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl font-medium text-sm shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {m.role === 'ai' ? (
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {m.text}
                      </ReactMarkdown>
                    ) : m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative group">
                <Input 
                  placeholder="Ask the Oracle..." 
                  className="pr-12 py-6 rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
