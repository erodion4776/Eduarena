import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Brain, Send, BookOpen, Zap,
  GraduationCap, Lightbulb, Sparkles,
  AlertCircle, Trash2, Copy, Check
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Message {
  id:      string;
  role:    'user' | 'ai';
  content: string;
  source?: string;
  isError?: boolean;
}

// Simple unique ID helper
let _msgCounter = 0;
function newMsgId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

interface SyllabusTopic {
  label: string;
  query: string;
  subject: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Max messages sent as context to avoid token overflow
const MAX_HISTORY_CONTEXT = 6;

const SYLLABUS_TOPICS: SyllabusTopic[] = [
  {
    label:   'Cell & Organization of Life',
    subject: 'Biology',
    query:   'Explain the organization of life from cell to tissue, organ, and organ system with examples.',
  },
  {
    label:   'Law of Diminishing Returns',
    subject: 'Economics',
    query:   'What is the law of diminishing marginal utility and how does it relate to consumer equilibrium?',
  },
  {
    label:   'West African Agriculture Problems',
    subject: 'Agriculture',
    query:   'Discuss the major problems of agricultural development in West Africa and possible solutions.',
  },
  {
    label:   'African Poetry — Vanity',
    subject: 'Literature',
    query:   'Analyze the themes in Birago Diop\'s poem "Vanity" — what does it say about African tradition?',
  },
  {
    label:   'Quadratic Equations',
    subject: 'Mathematics',
    query:   'Explain how to solve quadratic equations by factorization and completing the square with examples.',
  },
  {
    label:   'Electricity & Magnetism',
    subject: 'Physics',
    query:   'Explain the relationship between electricity and magnetism including Faraday\'s law of induction.',
  },
  {
    label:   'Organic Chemistry — Hydrocarbons',
    subject: 'Chemistry',
    query:   'What are hydrocarbons? Explain alkanes, alkenes, and alkynes with their properties and uses.',
  },
  {
    label:   'Nigerian Constitution & Government',
    subject: 'Government',
    query:   'Explain the key features of the Nigerian Constitution and the three arms of government.',
  },
];

const QUICK_ACTIONS = [
  {
    label:   'Generate Practice Questions',
    icon:    Zap,
    color:   'text-amber-400',
    query:   'Generate 5 JAMB-style practice questions on the topic we just discussed.',
  },
  {
    label:   'Step-by-Step Solver',
    icon:    GraduationCap,
    color:   'text-cyan-400',
    query:   'Give me a step-by-step breakdown of the last concept you explained.',
  },
  {
    label:   'Give Me a Hint',
    icon:    Lightbulb,
    color:   'text-emerald-400',
    query:   'Give me a helpful hint or memory trick for remembering this topic.',
  },
];

// ─────────────────────────────────────────────
// RAG-powered AI call via Express API
// ─────────────────────────────────────────────
async function callAITutor(
  message:  string,
  history:  { role: 'user' | 'ai'; content: string }[],
  subject?: string
): Promise<{ response: string; source?: string }> {

  // Limit history to last N messages to prevent token overflow
  const trimmedHistory = history
    .slice(-MAX_HISTORY_CONTEXT)
    .map(m => ({
      sender: m.role === 'user' ? 'student' : 'tutor',
      text:   m.content,
    }));

  const response = await fetch('/api/ai/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history:  trimmedHistory,
      subject:  subject ?? null,
      context:  'exam_prep',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.response) throw new Error('Empty response from AI tutor');

  return {
    response: data.response,
    source:   data.source ?? undefined,
  };
}

// ─────────────────────────────────────────────
// Copy Button (small utility component)
// ─────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
      title="Copy message"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AITutor() {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id:      'initial_ai_msg',
      role:    'ai',
      content: 'Hello! I am Tutor Chuks, your AI-powered exam prep assistant. I can help you master WAEC, JAMB, and NECO topics using your uploaded textbooks and syllabus materials. Ask me anything or pick a topic from the panel!',
    },
  ]);
  const [input,           setInput]           = useState('');
  const [isLoading,       setIsLoading]       = useState(false);
  const [activeSubject,   setActiveSubject]   = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  // Keep a ref to current messages to avoid stale state in useCallback
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Send message ───────────────────────────
  const sendMessage = useCallback(async (text: string, subject?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Auth check
    if (!user) {
      toast.error('Please log in to use AI Tutor.');
      return;
    }

    // Add user message with a stable unique ID
    const userMsg: Message = {
      id:      newMsgId(),
      role:    'user',
      content: trimmed,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    // Tiny delay to let focus happen after state updates
    setTimeout(() => inputRef.current?.focus(), 20);

    try {
      const historySnapshot = messagesRef.current.map(m => ({
        role:    m.role,
        content: m.content,
      }));

      const result = await callAITutor(
        trimmed,
        historySnapshot,
        subject ?? activeSubject ?? undefined
      );

      const aiMsg: Message = {
        id:      newMsgId(),
        role:    'ai',
        content: result.response,
        source:  result.source,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Tutor error:', err);

      const errMsg: Message = {
        id:      newMsgId(),
        role:    'ai',
        content: 'Omo! I am having trouble connecting right now. Please check your connection and try again.',
        isError: true,
      };

      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, activeSubject]);

  // ── Clear conversation ─────────────────────
  const clearConversation = useCallback(() => {
    setMessages([{
      id:      newMsgId(),
      role:    'ai',
      content: 'Conversation cleared. What would you like to learn today?',
    }]);
    setShowClearConfirm(false);
    setActiveSubject(null);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  // ── Handle topic click ─────────────────────
  const handleTopicClick = useCallback((topic: SyllabusTopic) => {
    setActiveSubject(topic.subject);
    sendMessage(topic.query, topic.subject);
  }, [sendMessage]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── Chat Area ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Tutor Chuks</h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                RAG Enhanced · Supabase Vector Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active subject badge */}
            {activeSubject && (
              <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-1 rounded-lg">
                {activeSubject}
              </span>
            )}

            {/* Clear conversation */}
            {messages.length > 1 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex flex-col max-w-[85%] space-y-1.5">
                {/* Message bubble */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                    : msg.isError
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-tl-none'
                      : 'bg-zinc-900/80 border border-white/5 text-zinc-200 rounded-tl-none'
                }`}>
                  {/* Error icon */}
                  {msg.isError && (
                    <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Connection Error
                    </div>
                  )}
                  {/* Preserve newlines from AI response */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Source badge */}
                {msg.source && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 w-fit">
                    <BookOpen className="w-3.5 h-3.5" />
                    Source: {msg.source}
                  </div>
                )}

                {/* Copy button for AI messages */}
                {msg.role === 'ai' && !msg.isError && (
                  <div className="flex justify-start px-1">
                    <CopyButton text={msg.content} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold bg-zinc-900/60 px-4 py-2.5 rounded-xl border border-white/5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Searching knowledge base...
                  {/* Animated dots */}
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map(d => (
                      <span
                        key={d}
                        className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 shrink-0">
          {/* Not logged in warning */}
          {!user && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Please log in to use AI Tutor.
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={isLoading || !user}
              className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3 outline-none text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 disabled:opacity-40 transition-colors"
              placeholder={user ? 'Ask a question about any topic...' : 'Log in to start chatting...'}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim() || !user}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0 disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Char hint */}
          <p className="text-[10px] text-zinc-700 mt-2 text-right font-mono">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>

      {/* ── Right Panel ───────────────────── */}
      <aside className="w-72 border-l border-white/10 bg-zinc-900/20 p-5 hidden lg:flex flex-col gap-5 overflow-y-auto shrink-0">

        {/* Quick Actions */}
        <div>
          <h3 className="font-black text-xs uppercase text-zinc-400 tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                disabled={isLoading || !user}
                onClick={() => sendMessage(action.query)}
                className="justify-start rounded-xl border-white/5 bg-zinc-900/50 text-zinc-300 hover:text-white disabled:opacity-40 text-xs"
              >
                <action.icon className={`w-4 h-4 mr-2 shrink-0 ${action.color}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Syllabus Topics */}
        <div className="border-t border-white/5 pt-4 flex-1">
          <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider mb-3">
            High-Yield Syllabus Topics
          </h4>
          <div className="space-y-2">
            {SYLLABUS_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => handleTopicClick(topic)}
                disabled={isLoading || !user}
                className="w-full text-left p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors border border-white/5 hover:border-cyan-500/30 flex items-start gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="block font-medium">{topic.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">{topic.subject}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message count */}
        <div className="border-t border-white/5 pt-3">
          <p className="text-[10px] text-zinc-600 font-mono text-center">
            {messages.length - 1} message{messages.length !== 2 ? 's' : ''} in session
          </p>
        </div>
      </aside>

      {/* ── Clear Confirm Dialog ───────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl"
            >
              <div>
                <h3 className="font-black text-sm uppercase text-white">Clear Conversation?</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  All messages will be deleted. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  className="flex-1 border-white/10 text-white text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={clearConversation}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl"
                >
                  Clear
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
