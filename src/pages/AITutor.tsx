import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animations library
import { Button } from '@/components/ui/button';
import {
  Brain, Send, BookOpen, Zap,
  GraduationCap, Lightbulb, Sparkles,
  AlertCircle, Trash2, Copy, Check,
  History, RefreshCw, ChevronDown, WifiOff
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  source?: string;
  isError?: boolean;
  timestamp: number;
}

interface SyllabusTopic {
  label: string;
  query: string;
  subject: string;
}

interface AITutorResponse {
  response: string;
  source?: string;
  session_id?: string;
}

interface HistoryMessage {
  role: string;
  content: string;
  created_at: string;
  metadata?: { source?: string };
}

// ─────────────────────────────────────────────
// Configuration Constants
// ─────────────────────────────────────────────
const MAX_HISTORY_CONTEXT = 6; // Balance conversation context
const SESSION_KEY = 'tutor_chuks_session_id';
const REQUEST_TIMEOUT_MS = 20_000; // 20 seconds timeout limit

let _msgCounter = 0;
function newMsgId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

let _cachedSessionId: string | null = null;

// Retrieves the current study session identifier or creates one if empty
function getOrCreateSessionId(): string {
  if (_cachedSessionId) return _cachedSessionId;

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  _cachedSessionId = sessionId;
  return sessionId;
}

// Rotates the session id to clear cloud server memory cache context
function rotateSessionId(): string {
  const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem(SESSION_KEY, newId);
  _cachedSessionId = newId;
  return newId;
}

// Fetch with timeout handler to prevent hanging network requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Please try your question again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Retrieves authorization token to communicate securely with curriculum routers
function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('supabase_token') ||
    sessionStorage.getItem('auth_token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Communicates with AI server and processes curriculum search questions
async function callAITutor(
  message: string,
  history: { role: 'user' | 'ai'; content: string }[],
  subject?: string,
  userId?: string
): Promise<AITutorResponse> {

  const sessionId = getOrCreateSessionId();

  // Balance history context to fit server payloads comfortably
  const trimmedHistory = history
    .slice(-MAX_HISTORY_CONTEXT)
    .map(m => ({
      sender: m.role === 'user' ? 'student' : 'tutor',
      text: m.content,
    }));

  const payload = {
    message,
    history: trimmedHistory,
    subject: subject ?? null,
    context: 'exam_prep',
    session_id: sessionId,
    user_id: userId ?? null,
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(
      '/.netlify/functions/ai-tutor',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
  } catch (err: any) {
    if (!navigator.onLine) {
      throw new Error('You are currently offline. Please check your internet connection and try again.');
    }
    throw new Error(err.message || 'Connecting issue. Please retry.');
  }

  const rawText = await res.text();

  let data: Record<string, any>;
  try {
    data = JSON.parse(rawText || '{}');
  } catch {
    throw new Error('Our revision system is adjusting textbooks. Try again in a brief moment!');
  }

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || `Request error (${res.status})`;
    throw new Error(errorMessage);
  }

  if (typeof data?.response !== 'string' || !data.response.trim()) {
    throw new Error('Tutor Chuks is organizing notes. Rephrase your question slightly!');
  }

  if (data.session_id && data.session_id !== sessionId) {
    localStorage.setItem(SESSION_KEY, data.session_id);
    _cachedSessionId = data.session_id;
  }

  return {
    response: data.response,
    source: data.source ?? undefined,
    session_id: data.session_id,
  };
}

// Fetch historical study conversations securely
async function loadChatHistory(sessionId: string): Promise<Message[]> {
  try {
    const response = await fetchWithTimeout(
      `/.netlify/functions/chat-history?session_id=${encodeURIComponent(sessionId)}&limit=20`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data?.history) || data.history.length === 0) return [];

    return data.history
      .filter((msg: HistoryMessage) => msg?.role && msg?.content)
      .map((msg: HistoryMessage) => ({
        id: newMsgId(),
        role: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        source: msg.metadata?.source,
        timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
      })) as Message[];

  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// High-Yield Syllabus Topics
// ─────────────────────────────────────────────
const SYLLABUS_TOPICS: SyllabusTopic[] = [
  {
    label: 'Cell & Organization of Life',
    subject: 'Biology',
    query: 'Explain the organization of life from cell to tissue, organ, and organ system with examples.',
  },
  {
    label: 'Law of Diminishing Returns',
    subject: 'Economics',
    query: 'What is the law of diminishing marginal utility and how does it relate to consumer equilibrium?',
  },
  {
    label: 'West African Agriculture Problems',
    subject: 'Agriculture',
    query: 'Discuss the major problems of agricultural development in West Africa and possible solutions.',
  },
  {
    label: 'African Poetry — Vanity',
    subject: 'Literature',
    query: "Analyze the themes in Birago Diop's poem 'Vanity' — what does it say about African tradition?",
  },
  {
    label: 'Quadratic Equations',
    subject: 'Mathematics',
    query: 'Explain how to solve quadratic equations by factorization and completing the square with examples.',
  },
  {
    label: 'Electricity & Magnetism',
    subject: 'Physics',
    query: "Explain the relationship between electricity and magnetism including Faraday's law of induction.",
  },
  {
    label: 'Organic Chemistry — Hydrocarbons',
    subject: 'Chemistry',
    query: 'What are hydrocarbons? Explain alkanes, alkenes, and alkynes with their properties and uses.',
  },
  {
    label: 'Nigerian Constitution & Government',
    subject: 'Government',
    query: 'Explain the key features of the Nigerian Constitution and the three arms of government.',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'Generate Practice Questions',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    query: 'Generate 5 JAMB-style practice questions on the topic we just discussed.',
  },
  {
    label: 'Step-by-Step Solver',
    icon: GraduationCap,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    query: 'Give me a step-by-step breakdown of the last concept you explained.',
  },
  {
    label: 'Give Me a Hint',
    icon: Lightbulb,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    query: 'Give me a helpful hint or memory trick for remembering this topic.',
  },
];

const SUBJECT_COLORS: Record<string, string> = {
  Biology: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
  Economics: 'text-amber-400 bg-amber-950/50 border-amber-500/30',
  Mathematics: 'text-blue-400 bg-blue-950/50 border-blue-500/30',
  Physics: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/20',
  Chemistry: 'text-purple-400 bg-purple-950/50 border-purple-500/30',
  Government: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
  Literature: 'text-orange-400 bg-orange-950/50 border-orange-500/30',
  Agriculture: 'text-lime-400 bg-lime-950/50 border-lime-500/30',
};

const WELCOME_MESSAGE: Message = {
  id: 'initial_ai_msg',
  role: 'ai',
  content: "Hello! I am Tutor Chuks, your AI-powered exam prep assistant 🎓\n\nI can help you master WAEC, JAMB, and NECO topics using verified past questions and study room materials.\n\nAsk me anything or pick a high-yield topic from the panel to get started!",
  timestamp: Date.now(),
};

// --- COPY BUTTON TOOL ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
      title="Copy message"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// --- OFFLINE BANNER CONTROLLER ---
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 mb-3">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      You are currently working offline. Check your network to communicate with Tutor Chuks.
    </div>
  );
}

// --- SINGLE CONVERSATION BUBBLE ---
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
        
        {/* Profile Tag */}
        <p className={`text-[10px] font-bold uppercase tracking-wider px-1 ${
          msg.role === 'user' ? 'text-right text-zinc-500' : 'text-left text-cyan-500'
        }`}>
          {msg.role === 'user' ? 'You' : 'Tutor Chuks'}
        </p>

        {/* Message Content Area */}
        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
          msg.role === 'user'
            ? 'bg-cyan-600 text-white rounded-tr-none'
            : msg.isError
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-tl-none'
              : 'bg-zinc-900/80 border border-white/5 text-zinc-200 rounded-tl-none font-medium'
        }`}>
          {msg.isError && (
            <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              Tutor Offline
            </div>
          )}
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Footer: timestamp & utility tools */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {msg.source && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <BookOpen className="w-3 h-3 text-emerald-400" />
                {msg.source}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-600 font-mono">
              {formatTime(msg.timestamp)}
            </span>
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
// MAIN TUTOR CHATROOM WIDGET
// ─────────────────────────────────────────────
export default function AITutor() {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([WELCOME_MESSAGE]);

  // Keep ref up to date for closure safe calling
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Handle scroll-to-bottom arrow button visibility
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // Sync historical conversations on mount
  useEffect(() => {
    if (!user || historyLoaded || isLoadingHistory) return;

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setHistoryLoaded(true);
      return;
    }

    setIsLoadingHistory(true);

    loadChatHistory(sessionId).then((history) => {
      if (history.length > 0) {
        setMessages([
          {
            ...WELCOME_MESSAGE,
            content: "Welcome back! Let's continue reviewing your syllabus topics and practice questions.",
            timestamp: Date.now() - 1000,
          },
          ...history,
        ]);
        toast.success(`Loaded your last ${history.length} study messages!`);
      }
    }).catch(() => {
      // Offline fallback
    }).finally(() => {
      setHistoryLoaded(true);
      setIsLoadingHistory(false);
    });
  }, [user, historyLoaded, isLoadingHistory]);

  // Send message thread handler
  const sendMessage = useCallback(async (text: string, subject?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!user) {
      toast.error('Please log in to chat with Tutor Chuks.');
      return;
    }

    setLastError(null);

    const userMsg: Message = {
      id: newMsgId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const historySnapshot = messagesRef.current.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setTimeout(() => inputRef.current?.focus(), 20);

    try {
      const result = await callAITutor(
        trimmed,
        historySnapshot,
        subject ?? activeSubject ?? undefined,
        user.id
      );

      setMessages((prev) => [...prev, {
        id: newMsgId(),
        role: 'ai',
        content: result.response,
        source: result.source,
        timestamp: Date.now(),
      }]);

    } catch (err: any) {
      const errorText = err?.message || 'The AI service is resting. Please try again.';
      setLastError(errorText);

      setMessages((prev) => [...prev, {
        id: newMsgId(),
        role: 'ai',
        content: `Tutor Chuks had a quick network break.\n\n**Note:** ${errorText}\n\nPlease click retry below or try again in a few seconds.`,
        isError: true,
        timestamp: Date.now(),
      }]);

      toast.error("Connecting delay, please retry!");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, activeSubject]);

  // Clear study conversation thread
  const clearConversation = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetchWithTimeout(
          `/.netlify/functions/chat-history?session_id=${encodeURIComponent(sessionId)}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } catch {
        // Fallback locally if network fails
      }
      rotateSessionId();
    }

    const freshWelcome: Message = {
      id: newMsgId(),
      role: 'ai',
      content: 'Lounge cleared! Ready for a fresh study session. What concept should we break down today? 📚',
      timestamp: Date.now(),
    };

    setMessages([freshWelcome]);
    setShowClearConfirm(false);
    setActiveSubject(null);
    setHistoryLoaded(false);
    setLastError(null);
    setTimeout(() => inputRef.current?.focus(), 20);
    toast.success('Syllabus session cleared!');
  }, []);

  const handleTopicClick = useCallback((topic: SyllabusTopic) => {
    setActiveSubject(topic.subject);
    sendMessage(topic.query, topic.subject);
  }, [sendMessage]);

  // Retry the last failed question
  const retryLastMessage = useCallback(() => {
    const msgs = messagesRef.current;
    const lastUserMsg = [...msgs].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setMessages((prev) =>
      prev.filter((m) => !(m.isError === true && m.timestamp > lastUserMsg.timestamp))
    );

    setLastError(null);
    setTimeout(() => sendMessage(lastUserMsg.content), 50);
  }, [sendMessage]);

  const subjectColor = activeSubject
    ? SUBJECT_COLORS[activeSubject] || 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20'
    : '';

  const lastMessageIsError = messages[messages.length - 1]?.isError === true;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden relative">

      {/* Primary Study Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header HUD */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-zinc-950/85 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-zinc-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Tutor Chuks</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Live Study Companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingHistory && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <History className="w-3.5 h-3.5 animate-spin" />
                Syncing...
              </div>
            )}

            {activeSubject && (
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${subjectColor}`}>
                {activeSubject}
              </span>
            )}

            {messages.length > 1 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer border-none bg-transparent"
                title="Clear Study Room"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Chat message layout list */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
        >
          {historyLoaded && messages.length > 2 && (
            <div className="flex justify-center">
              <div className="text-[10px] text-zinc-500 bg-zinc-900 border border-white/5 px-4 py-2 rounded-full font-mono flex items-center gap-1.5 shadow-sm">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                Restored study context of this topic
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing Loading indicator */}
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
                  Reviewing syllabus and textbook data...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Floating scroll to bottom indicator */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-28 right-4 lg:right-80 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full p-2.5 shadow-lg z-10 cursor-pointer border-none"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Failed Network Retry Options */}
        {lastMessageIsError && (
          <div className="px-4 pb-2 flex flex-col items-center gap-1">
            <button
              onClick={retryLastMessage}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Re-ask Last Question
            </button>
          </div>
        )}

        {/* Input Control Area */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 shrink-0">
          
          <OfflineBanner />

          {!user && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Please sign in to begin study sessions with Tutor Chuks.
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={isLoading || !user}
              maxLength={500}
              className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3 outline-none text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 disabled:opacity-40 transition-colors text-white"
              placeholder={user ? "Ask a question about any exam topic..." : "Sign in to activate chat input..."}
            />
            
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim() || !user}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0 disabled:opacity-40 border-none transition-all"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-700 font-mono">
            <span>Enter to send · Shift+Enter for new line</span>
            <span>{input.length}/500</span>
          </div>
        </div>

      </main>

      {/* Sidebar Navigation: Quick Syllabus Topics */}
      <aside className="w-72 border-l border-white/10 bg-zinc-900/30 p-5 hidden lg:flex flex-col gap-5 overflow-y-auto shrink-0">
        
        {user && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-black text-white shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Quick Tools */}
        <div className="space-y-3">
          <h3 className="font-bold text-[10px] uppercase text-zinc-500 tracking-wider">
            Revision Toolkit
          </h3>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                disabled={isLoading || !user}
                onClick={() => sendMessage(action.query)}
                className={`justify-start rounded-xl border-white/5 ${action.bg} text-zinc-300 hover:text-white disabled:opacity-40 text-xs py-5`}
              >
                <action.icon className={`w-4 h-4 mr-2 shrink-0 ${action.color}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* High-Yield Topics List */}
        <div className="border-t border-white/5 pt-4 flex-1 space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
            High-Yield Topics
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
                  className={`w-full text-left p-3 rounded-xl text-xs transition-colors border flex items-start gap-2.5 group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/20 border-cyan-500/30 text-white'
                      : 'bg-zinc-900/20 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5 hover:border-cyan-500/30'
                  }`}
                >
                  <BookOpen className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform ${
                    isActive ? 'text-cyan-400' : 'text-zinc-600 group-hover:scale-105'
                  }`} />
                  <div>
                    <span className="block font-bold">{topic.label}</span>
                    <span className={`text-[10px] mt-0.5 block font-bold ${color.split(' ')[0]}`}>
                      {topic.subject}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Clear conversation Modal confirmation dialogue */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-[24px] p-6 max-w-xs w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Reset Study Session?</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    This will clear the current syllabus context from Tutor Chuks.
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
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl border-none"
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
