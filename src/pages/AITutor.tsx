import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Brain, Send, BookOpen, Zap,
  GraduationCap, Lightbulb, Sparkles,
  AlertCircle, Trash2, Copy, Check,
  History, RefreshCw, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Message {
  id:        string;
  role:      'user' | 'ai';
  content:   string;
  source?:   string;
  isError?:  boolean;
  timestamp: number;
}

let _msgCounter = 0;
function newMsgId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

interface SyllabusTopic {
  label:   string;
  query:   string;
  subject: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_HISTORY_CONTEXT = 6;
const SESSION_KEY = 'tutor_chuks_session_id';

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
    query:   "Analyze the themes in Birago Diop's poem 'Vanity' — what does it say about African tradition?",
  },
  {
    label:   'Quadratic Equations',
    subject: 'Mathematics',
    query:   'Explain how to solve quadratic equations by factorization and completing the square with examples.',
  },
  {
    label:   'Electricity & Magnetism',
    subject: 'Physics',
    query:   "Explain the relationship between electricity and magnetism including Faraday's law of induction.",
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
  {
    label:   'Osmosis & Diffusion',
    subject: 'Biology',
    query:   'Explain osmosis and diffusion with real-life examples and how they work in living cells.',
  },
  {
    label:   'Supply & Demand',
    subject: 'Economics',
    query:   'Explain the law of supply and demand and how they determine market equilibrium price.',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'Generate Practice Questions',
    icon:  Zap,
    color: 'text-amber-400',
    bg:    'bg-amber-500/10',
    query: 'Generate 5 JAMB-style practice questions on the topic we just discussed.',
  },
  {
    label: 'Step-by-Step Solver',
    icon:  GraduationCap,
    color: 'text-cyan-400',
    bg:    'bg-cyan-500/10',
    query: 'Give me a step-by-step breakdown of the last concept you explained.',
  },
  {
    label: 'Give Me a Hint',
    icon:  Lightbulb,
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10',
    query: 'Give me a helpful hint or memory trick for remembering this topic.',
  },
  {
    label: 'Exam Tips',
    icon:  Brain,
    color: 'text-purple-400',
    bg:    'bg-purple-500/10',
    query: 'Give me top exam tips and common mistakes to avoid for this topic in JAMB/WAEC.',
  },
];

// Subject colors for badges
const SUBJECT_COLORS: Record<string, string> = {
  Biology:     'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
  Economics:   'text-amber-400 bg-amber-950/50 border-amber-500/30',
  Mathematics: 'text-blue-400 bg-blue-950/50 border-blue-500/30',
  Physics:     'text-cyan-400 bg-cyan-950/50 border-cyan-500/20',
  Chemistry:   'text-purple-400 bg-purple-950/50 border-purple-500/30',
  Government:  'text-rose-400 bg-rose-950/50 border-rose-500/30',
  Literature:  'text-orange-400 bg-orange-950/50 border-orange-500/30',
  Agriculture: 'text-lime-400 bg-lime-950/50 border-lime-500/30',
};

// ─────────────────────────────────────────────
// Get or create a persistent session ID
// ─────────────────────────────────────────────
function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ─────────────────────────────────────────────
// RAG-powered AI call via Express API
// ─────────────────────────────────────────────
async function callAITutor(
  message:   string,
  history:   { role: 'user' | 'ai'; content: string }[],
  subject?:  string,
  userId?:   string
): Promise<{ response: string; source?: string; session_id?: string }> {

  // Get persistent session ID
  const sessionId = getOrCreateSessionId();

  const trimmedHistory = history
    .slice(-MAX_HISTORY_CONTEXT)
    .map(m => ({
      sender: m.role === 'user' ? 'student' : 'tutor',
      text:   m.content,
    }));

  const response = await fetch('/api/ai/tutor', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history:    trimmedHistory,
      subject:    subject ?? null,
      context:    'exam_prep',
      session_id: sessionId,
      user_id:    userId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.response) throw new Error('Empty response from AI tutor');

  // Save returned session ID if different
  if (data.session_id && data.session_id !== sessionId) {
    localStorage.setItem(SESSION_KEY, data.session_id);
  }

  return {
    response:   data.response,
    source:     data.source ?? undefined,
    session_id: data.session_id,
  };
}

// ─────────────────────────────────────────────
// Load chat history from Supabase via API
// ─────────────────────────────────────────────
async function loadChatHistory(sessionId: string): Promise<Message[]> {
  try {
    const response = await fetch(`/api/ai/chat/history?session_id=${sessionId}&limit=20`);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data?.history || data.history.length === 0) return [];

    return data.history.map((msg: any) => ({
      id:        newMsgId(),
      role:      msg.role === 'user' ? 'user' : 'ai',
      content:   msg.content,
      source:    msg.metadata?.source,
      timestamp: new Date(msg.created_at).getTime(),
    }));
  } catch (err) {
    console.error('Failed to load chat history:', err);
    return [];
  }
}

// ─────────────────────────────────────────────
// Copy Button
// ─────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
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
// Format timestamp
// ─────────────────────────────────────────────
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────
// Message Bubble Component
// ─────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className="flex flex-col max-w-[85%] space-y-1.5">

        {/* Role label */}
        <p className={`text-[10px] font-bold uppercase tracking-wider px-1 ${
          msg.role === 'user' ? 'text-right text-zinc-500' : 'text-left text-cyan-600'
        }`}>
          {msg.role === 'user' ? 'You' : 'Tutor Chuks'}
        </p>

        {/* Bubble */}
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

          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Bottom row: source + timestamp + copy */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {/* Source badge */}
            {msg.source && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-500/30">
                <BookOpen className="w-3 h-3" />
                {msg.source}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Timestamp */}
            <span className="text-[10px] text-zinc-700 font-mono">
              {formatTime(msg.timestamp)}
            </span>

            {/* Copy button for AI messages */}
            {msg.role === 'ai' && !msg.isError && (
              <CopyButton text={msg.content} />
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AITutor() {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id:        'initial_ai_msg',
      role:      'ai',
      content:   'Hello! I am Tutor Chuks, your AI-powered exam prep assistant 🎓\n\nI can help you master WAEC, JAMB, and NECO topics using real past questions and syllabus materials stored in our knowledge base.\n\nAsk me anything or pick a topic from the panel!',
      timestamp: Date.now(),
    },
  ]);

  const [input,            setInput]            = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [activeSubject,    setActiveSubject]     = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded,    setHistoryLoaded]    = useState(false);
  const [showScrollBtn,    setShowScrollBtn]    = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const scrollAreaRef   = useRef<HTMLDivElement>(null);
  const messagesRef     = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Auto scroll ────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ── Show scroll-to-bottom button ──────────
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // ── Load history from Supabase on mount ───
  useEffect(() => {
    if (!user || historyLoaded) return;

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    setIsLoadingHistory(true);
    loadChatHistory(sessionId).then(history => {
      if (history.length > 0) {
        setMessages([
          {
            id:        'initial_ai_msg',
            role:      'ai',
            content:   'Hello! I am Tutor Chuks 🎓\n\nI can help you master WAEC, JAMB, and NECO topics. Ask me anything!',
            timestamp: Date.now() - 1000,
          },
          ...history,
        ]);
        toast.success(`Loaded ${history.length} messages from your last session!`);
      }
      setHistoryLoaded(true);
      setIsLoadingHistory(false);
    });
  }, [user, historyLoaded]);

  // ── Send message ───────────────────────────
  const sendMessage = useCallback(async (text: string, subject?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!user) {
      toast.error('Please log in to use AI Tutor.');
      return;
    }

    const userMsg: Message = {
      id:        newMsgId(),
      role:      'user',
      content:   trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setTimeout(() => inputRef.current?.focus(), 20);

    try {
      const historySnapshot = messagesRef.current.map(m => ({
        role:    m.role,
        content: m.content,
      }));

      const result = await callAITutor(
        trimmed,
        historySnapshot,
        subject ?? activeSubject ?? undefined,
        user?.id
      );

      const aiMsg: Message = {
        id:        newMsgId(),
        role:      'ai',
        content:   result.response,
        source:    result.source,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (err: any) {
      console.error('AI Tutor error:', err);

      setMessages(prev => [...prev, {
        id:        newMsgId(),
        role:      'ai',
        content:   'Omo! I am having trouble connecting right now. Please check your connection and try again.',
        isError:   true,
        timestamp: Date.now(),
      }]);

      toast.error('Failed to get AI response. Try again!');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, activeSubject]);

  // ── Clear conversation ─────────────────────
  const clearConversation = useCallback(async () => {
    // Clear from Supabase too
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetch(`/api/ai/chat/history?session_id=${sessionId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to clear history from Supabase:', err);
      }
      // Generate new session
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, newSessionId);
    }

    setMessages([{
      id:        newMsgId(),
      role:      'ai',
      content:   'Conversation cleared! Ready for a fresh start. What would you like to learn today? 📚',
      timestamp: Date.now(),
    }]);
    setShowClearConfirm(false);
    setActiveSubject(null);
    setHistoryLoaded(false);
    setTimeout(() => inputRef.current?.focus(), 20);
    toast.success('Conversation cleared!');
  }, []);

  // ── Handle topic click ─────────────────────
  const handleTopicClick = useCallback((topic: SyllabusTopic) => {
    setActiveSubject(topic.subject);
    sendMessage(topic.query, topic.subject);
  }, [sendMessage]);

  // ── Retry last message ─────────────────────
  const retryLastMessage = useCallback(() => {
    const msgs = messagesRef.current;
    const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove last AI error message
      setMessages(prev => prev.filter(
        m => !(m.isError && m.timestamp > lastUserMsg.timestamp)
      ));
      sendMessage(lastUserMsg.content);
    }
  }, [sendMessage]);

  // Get subject badge color
  const subjectColor = activeSubject
    ? SUBJECT_COLORS[activeSubject] || 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20'
    : '';

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── Chat Area ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              {/* Online indicator */}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black">Tutor Chuks</h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                RAG Enhanced · Supabase Connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Loading history indicator */}
            {isLoadingHistory && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <History className="w-3 h-3 animate-spin" />
                Loading history...
              </div>
            )}

            {/* Active subject badge */}
            {activeSubject && (
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${subjectColor}`}>
                {activeSubject}
              </span>
            )}

            {/* Clear conversation button */}
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
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
        >
          {/* Session restored banner */}
          {historyLoaded && messages.length > 2 && (
            <div className="flex justify-center">
              <div className="text-[10px] text-zinc-600 bg-zinc-900/50 border border-white/5 px-3 py-1.5 rounded-full font-mono flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Previous session restored from Supabase
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
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

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 right-80 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full p-2 shadow-lg z-10"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Retry button if last message is error */}
        {messages[messages.length - 1]?.isError && (
          <div className="px-4 pb-2 flex justify-center">
            <button
              onClick={retryLastMessage}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry last message
            </button>
          </div>
        )}

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
              maxLength={500}
              className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3 outline-none text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 disabled:opacity-40 transition-colors"
              placeholder={
                user
                  ? 'Ask a question about any exam topic...'
                  : 'Log in to start chatting...'
              }
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim() || !user}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0 disabled:opacity-40 transition-all"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-zinc-700 font-mono">
              Enter to send · Shift+Enter for new line
            </p>
            <p className="text-[10px] text-zinc-700 font-mono">
              {input.length}/500
            </p>
          </div>
        </div>
      </main>

      {/* ── Right Panel ───────────────────── */}
      <aside className="w-72 border-l border-white/10 bg-zinc-900/20 p-5 hidden lg:flex flex-col gap-5 overflow-y-auto shrink-0">

        {/* User info */}
        {user && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-black text-white shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

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
                className={`justify-start rounded-xl border-white/5 ${action.bg} text-zinc-300 hover:text-white disabled:opacity-40 text-xs`}
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
            {SYLLABUS_TOPICS.map((topic, i) => {
              const color = SUBJECT_COLORS[topic.subject] || 'text-cyan-400';
              const isActive = activeSubject === topic.subject;
              return (
                <button
                  key={i}
                  onClick={() => handleTopicClick(topic)}
                  disabled={isLoading || !user}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors border flex items-start gap-2 group disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-cyan-950/30 border-cyan-500/30 text-white'
                      : 'bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5 hover:border-cyan-500/30'
                  }`}
                >
                  <BookOpen className={`w-3.5 h-3.5 mt-0.5 shrink-0 group-hover:scale-110 transition-transform ${
                    isActive ? 'text-cyan-400' : 'text-zinc-500'
                  }`} />
                  <div>
                    <span className="block font-medium">{topic.label}</span>
                    <span className={`text-[10px] mt-0.5 block font-bold ${
                      color.split(' ')[0]
                    }`}>
                      {topic.subject}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Stats */}
        <div className="border-t border-white/5 pt-3 space-y-1">
          <p className="text-[10px] text-zinc-600 font-mono text-center">
            💬 {messages.length - 1} message{messages.length !== 2 ? 's' : ''} in session
          </p>
          <p className="text-[10px] text-zinc-700 font-mono text-center">
            Session saved to Supabase ✅
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Clear Conversation?</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    This will also clear your Supabase history.
                  </p>
                </div>
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
                  Clear All
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
