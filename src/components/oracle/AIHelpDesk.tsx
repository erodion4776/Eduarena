import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Sparkles, Send, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library
import { GoogleGenAI } from "@google/genai";
import { Input } from '@/components/ui/input';

// LaTeX math rendering packages
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Safe check to load Gemini API safely across standard build environments
let aiInstance: GoogleGenAI | null = null;

function getAIInstance() {
  if (!aiInstance) {
    // Read from standard Next.js, Vite, or environment variables securely
    const apiKey = 
      typeof window !== 'undefined' 
        ? (window as any)._env_?.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY 
        : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'undefined') {
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

interface AIHelpDeskProps {
  contextQuestion?: {
    id?: string | number;
    question_text?: string;
    question?: string;
    text?: string;
    options?: Record<string, string> | string[];
    correct_option?: string;
    correct_answer?: string;
  };
}

export default function AIHelpDesk({ contextQuestion }: AIHelpDeskProps) {
  // --- STATE MANAGEMENT ---
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat view down when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // --- SEND QUESTION TO AI ---
  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setPrompt('');
    setIsTyping(true);

    const ai = getAIInstance();
    
    // OFFLINE STUDY CHAT FALLBACK 
    // This allows the app to respond intelligently for demo testing even if the dynamic key is offline!
    if (!ai) {
      setTimeout(() => {
        const questionSubject = contextQuestion?.question_text || contextQuestion?.question || "the selected topic";
        setMessages((prev) => [
          ...prev,
          { 
            role: 'ai', 
            text: `Hello there, Scholar! Professor Oracle is on a quick library break right now, but let's review: **"${questionSubject}"**.\n\nTry reading the options slowly, eliminating choices that don't fit, and look for key scientific or structural clues!`
          }
        ]);
        setIsTyping(false);
      }, 1000);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // Student-friendly highly responsive model
        contents: [
          { 
            text: `System context: You are "Professor Oracle", a kind and supportive online school tutor. 
            Explain concepts simply, encouragingly, and clearly. 
            ${contextQuestion ? `The student is currently working on this test question: ${JSON.stringify(contextQuestion)}` : ''}` 
          },
          ...messages.map((m) => ({ text: `${m.role === 'user' ? 'Student' : 'Professor'}: ${m.text}` })),
          { text: `Student: ${userMessage}` }
        ]
      });

      setMessages((prev) => [
        ...prev, 
        { role: 'ai', text: response.text || "I am reflecting on this. Could you explain your thinking slightly differently?" }
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev, 
        { role: 'ai', text: "Professor Oracle is organizing textbooks right now. Please try your question again in a second!" }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Dynamic FLOATING BUTTON to toggle the Chat drawer */}
      <button 
        onClick={() => setIsOpen(true)}
        aria-label="Ask Professor Oracle"
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group border-none outline-none"
      >
        <div className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20 group-hover:hidden" />
        <MessageSquare className="w-8 h-8" />
      </button>

      {/* Chat Drawer Window overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-28 right-8 w-96 max-h-[600px] h-[550px] bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden"
          >
            {/* Header: Profile Card */}
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight text-base leading-none">Professor Oracle</h3>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Study Buddy AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <Sparkles className="w-10 h-10 text-indigo-300 mx-auto animate-pulse" />
                  <p className="text-slate-500 font-medium text-sm px-6 leading-relaxed">
                    "Hey there, Scholar! Stuck on a concept? Let's break down this question together step-by-step!"
                  </p>
                </div>
              )}

              {/* Chat Message items */}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium'
                  }`}>
                    {m.role === 'ai' ? (
                      // Parse math notations and equations beautifully
                      <div className="prose prose-sm max-w-none prose-slate">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator bubble */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="relative flex items-center">
                <Input 
                  placeholder="Ask a question..." 
                  className="w-full pr-14 pl-4 py-6 rounded-2xl border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors border-none cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled scrollbar helpers */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.15);
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
