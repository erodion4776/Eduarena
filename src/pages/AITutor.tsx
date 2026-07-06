import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

interface SyllabusTopic {
  label:   string;
  query:   string;
  subject: string;
}

interface AITutorResponse {
  response:    string;
  source?:     string;
  session_id?: string;
}

interface HistoryMessage {
  role:       string;
  content:    string;
  created_at: string;
  metadata?:  { source?: string };
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_HISTORY_CONTEXT = 6;
const SESSION_KEY         = 'tutor_chuks_session_id';
const REQUEST_TIMEOUT_MS  = 30_000; // 30 seconds

let _msgCounter = 0;
function newMsgId(): string {
  return `msg_${Date.now()}_${++_msgCounter}`;
}

// ─────────────────────────────────────────────
// Cached session ID (avoids redundant reads)
// ─────────────────────────────────────────────
let _cachedSessionId: string | null = null;

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

function rotateSessionId(): string {
  const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem(SESSION_KEY, newId);
  _cachedSessionId = newId;
  return newId;
}

// ─────────────────────────────────────────────
// Fetch with timeout helper
// ─────────────────────────────────────────────
async function fetchWithTimeout(
  url:     string,
  options: RequestInit = {},
  timeout: number      = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    // Provide a more descriptive error for timeouts
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server is taking too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// Build auth headers from stored token
// ─────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  // Support both common token storage patterns
  const token =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('supabase_token') ||
    sessionStorage.getItem('auth_token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────
// RAG-powered AI call via Express API
// ─────────────────────────────────────────────
async function callAITutor(
  message:  string,
  history:  { role: 'user' | 'ai'; content: string }[],
  subject?: string,
  userId?:  string
): Promise<AITutorResponse> {

  const sessionId = getOrCreateSessionId();

  // BUG FIX: Trim to last N *pairs* so context is balanced
  const trimmedHistory = history
    .slice(-MAX_HISTORY_CONTEXT)
    .map(m => ({
      sender: m.role === 'user' ? 'student' : 'tutor',
      text:   m.content,
    }));

  const payload = {
    message,
    history:    trimmedHistory,
    subject:    subject ?? null,
    context:    'exam_prep',
    session_id: sessionId,
    user_id:    userId ?? null,
  };

  console.log('[callAITutor] Sending request payload:', payload);

  // ── 1. Make the request ──────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetchWithTimeout(
      '/.netlify/functions/ai-tutor',
      {
        method:  'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
  } catch (err: any) {
    console.error('[callAITutor] Network fetch failed:', err);
    if (!navigator.onLine) {
      throw new Error('You appear to be offline. Please check your internet connection.');
    }
    throw new Error(err.message || 'Network error. Please try again.');
  }

  console.log('[callAITutor] Received response status:', res.status);

  // ── 2. Read the body ONCE as text ────────────────────────────────────────
  const rawText = await res.text();
  console.log('[callAITutor] Raw response text length:', rawText.length);
  console.log('[callAITutor] Raw response preview:', rawText.substring(0, 500));

  // ── 3. Parse JSON safely ─────────────────────────────────────────────────
  let data: Record<string, any>;
  try {
    data = JSON.parse(rawText || '{}');
  } catch (parseErr) {
    console.error('[callAITutor] JSON Parse failed on raw text:', rawText);
    throw new Error(`Server returned invalid JSON (HTTP ${res.status}). First 200 chars: ${rawText.substring(0, 200)}`);
  }

  console.log('[callAITutor] Parsed JSON data keys:', Object.keys(data || {}));

  // ── 4. Handle HTTP errors using the parsed body ──────────────────────────
  if (!res.ok) {
    const errorMessage = data?.message || data?.error || res.statusText || `Server error (${res.status})`;
    console.warn('[callAITutor] Server responded with error status:', res.status, errorMessage);
    switch (res.status) {
      case 400: throw new Error(`Bad request: ${errorMessage}`);
      case 401: throw new Error('Session expired. Please log in again.');
      case 403: throw new Error('Access denied. Please check your account.');
      case 429: throw new Error('Too many requests. Please wait a moment before trying again.');
      case 500: throw new Error(`AI service error: ${errorMessage}`);
      case 503: throw new Error('AI service is temporarily unavailable. Please try again in a moment.');
      default:  throw new Error(errorMessage);
    }
  }

  // ── 5. Validate the `response` field ─────────────────────────────────────
  if (typeof data?.response !== 'string' || !data.response.trim()) {
    console.error('[callAITutor] Unexpected response shape — missing response field:', data);
    throw new Error(
      `Unexpected response from server. Got keys: [${Object.keys(data || {}).join(', ')}]`
    );
  }

  // Update cached session ID if the server rotated it
  if (data.session_id && data.session_id !== sessionId) {
    console.log('[callAITutor] Server rotated session ID:', data.session_id);
    localStorage.setItem(SESSION_KEY, data.session_id);
    _cachedSessionId = data.session_id;
  }

  return {
    response:   data.response,
    source:     data.source  ?? undefined,
    session_id: data.session_id,
  };
}

// ─────────────────────────────────────────────
// Load chat history from Supabase via API
// ─────────────────────────────────────────────
async function loadChatHistory(sessionId: string): Promise<Message[]> {
  try {
    const response = await fetchWithTimeout(
      `/.netlify/functions/chat-history?session_id=${encodeURIComponent(sessionId)}&limit=20`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      console.warn(`History fetch returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data?.history) || data.history.length === 0) return [];

    return data.history
      .filter((msg: HistoryMessage) => msg?.role && msg?.content)
      .map((msg: HistoryMessage) => ({
        id:        newMsgId(),
        role:      msg.role === 'user' ? 'user' : 'ai',
        content:   msg.content,
        source:    msg.metadata?.source,
        timestamp: msg.created_at
          ? new Date(msg.created_at).getTime()
          : Date.now(),
      })) as Message[];

  } catch (err) {
    console.error('Failed to load chat history:', err);
    return [];
  }
}

// ─────────────────────────────────────────────
// Syllabus Topics
// ─────────────────────────────────────────────
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
// Initial welcome message
// ─────────────────────────────────────────────
const WELCOME_MESSAGE: Message = {
  id:        'initial_ai_msg',
  role:      'ai',
  content:   'Hello! I am Tutor Chuks, your AI-powered exam prep assistant 🎓\n\nI can help you master WAEC, JAMB, and NECO topics using real past questions and syllabus materials stored in our knowledge base.\n\nAsk me anything or pick a topic from the panel!',
  timestamp: Date.now(),
};

// ─────────────────────────────────────────────
// Copy Button
// ─────────────────────────────────────────────
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
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy  className="w-3.5 h-3.5" />
      }
    </button>
  );
}

// ─────────────────────────────────────────────
// Format timestamp
// ─────────────────────────────────────────────
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────
// Offline banner
// ─────────────────────────────────────────────
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10
                    border border-rose-500/20 rounded-xl px-3 py-2 mb-3">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      You are offline. Please check your internet connection.
    </div>
  );
}

// ─────────────────────────────────────────────
// Message Bubble
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
          msg.role === 'user'
            ? 'text-right text-zinc-500'
            : 'text-left text-cyan-600'
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

          {msg.isError && (
            <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              Connection Error
            </div>
          )}

          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Source + timestamp + copy */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {msg.source && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300
                              font-bold bg-emerald-950/50 px-2 py-1 rounded-lg
                              border border-emerald-500/30">
                <BookOpen className="w-3 h-3" />
                {msg.source}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-700 font-mono">
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
// Main Component
// ─────────────────────────────────────────────
export default function AITutor() {
  const { user } = useAuthStore();

  const [messages,         setMessages]         = useState<Message[]>([WELCOME_MESSAGE]);
  const [input,            setInput]            = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [activeSubject,    setActiveSubject]     = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded,    setHistoryLoaded]    = useState(false);
  const [showScrollBtn,    setShowScrollBtn]    = useState(false);
  // Track the specific error message to show targeted retry UI
  const [lastError,        setLastError]        = useState<string | null>(null);

  // ── Diagnostics / Debug States ───────────────────────────────────────────
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting]   = useState(false);

  async function testFunction() {
    setIsTesting(true);
    setTestResult('Testing...');
    const results: string[] = [];

    // ── Test 1: AI Tutor function ───────────────────────────────────────
    results.push('TEST 1: AI Tutor function');
    try {
      const r = await fetch('/.netlify/functions/ai-tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    'Say hello in one sentence.',
          history:    [],
          subject:    null,
          session_id: 'debug_test_123',
          user_id:    null,
        }),
      });

      const text = await r.text();
      results.push(`Status: ${r.status}`);
      results.push(`Body: ${text.substring(0, 200) || 'EMPTY'}`);

      const json = JSON.parse(text);
      if (json?.response) {
        results.push(`✅ Works! Provider: ${json.provider}`);
        results.push(`Response: "${json.response.substring(0, 80)}"`);
      } else {
        results.push(`❌ Error: ${json?.message || json?.error}`);
      }
    } catch (e: any) {
      results.push(`❌ Threw: ${e.message}`);
    }

    results.push('─────────────────────');

    // ── Test 2: Chat history function ───────────────────────────────────
    results.push('TEST 2: Chat history function');
    try {
      const r = await fetch(
        '/.netlify/functions/chat-history?session_id=debug_test_123',
        { method: 'GET' }
      );

      const text = await r.text();
      results.push(`Status: ${r.status}`);
      results.push(`Body: ${text.substring(0, 200) || 'EMPTY'}`);

      const json = JSON.parse(text);
      if (Array.isArray(json?.history)) {
        results.push(`✅ Works! Messages found: ${json.history.length}`);
      } else {
        results.push(`❌ Unexpected: ${JSON.stringify(json).substring(0, 100)}`);
      }
    } catch (e: any) {
      results.push(`❌ Threw: ${e.message}`);
    }

    results.push('─────────────────────');

    // ── Test 3: Full chat flow ───────────────────────────────────────────
    results.push('TEST 3: Full chat with subject');
    try {
      const r = await fetch('/.netlify/functions/ai-tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    'What is photosynthesis?',
          history:    [],
          subject:    'Biology',
          session_id: 'debug_test_bio',
          user_id:    user?.id || null,
        }),
      });

      const text = await r.text();
      results.push(`Status: ${r.status}`);
      const json = JSON.parse(text);

      if (json?.response) {
        results.push(`✅ Full flow works!`);
        results.push(`Provider: ${json.provider}`);
        results.push(`Response length: ${json.response.length} chars`);
        results.push(`Preview: "${json.response.substring(0, 100)}"`);
      } else {
        results.push(`❌ Error: ${json?.message}`);
      }
    } catch (e: any) {
      results.push(`❌ Threw: ${e.message}`);
    }

    results.push('─────────────────────');

    // ── Test 4: Gemini API key check ─────────────────────────────────────
    results.push('TEST 4: Gemini API key check');
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY || 'NOT_SET'}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say OK only.' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      const text = await r.text();
      const json = JSON.parse(text);
      if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
        results.push(`✅ Gemini key works from frontend`);
        results.push(`💡 Check GEMINI_API_KEY in Netlify env vars`);
      } else {
        results.push(`❌ Gemini: ${json?.error?.message || 'no response'}`);
        results.push(`💡 This is why Groq is being used as fallback`);
      }
    } catch (e: any) {
      results.push(`❌ Gemini threw: ${e.message}`);
    }

    results.push('─────────────────────');
    results.push('✅ All tests complete');

    setTestResult(results.join('\n'));
    setIsTesting(false);
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    setDebugLog(prev => [`[${time}] ${msg}`, ...prev]);
  }

  async function runDiagnostics() {
    setDebugLog([]);
    setDebugLoading(true);
    setShowDebug(true);

    // ── Test 1: Basic connectivity ──────────────────────────────────────
    addLog('🔍 Starting diagnostics...');
    addLog(`📱 Online: ${navigator.onLine}`);
    addLog(`🌐 URL: ${window.location.href}`);
    addLog(`⏰ Time: ${new Date().toISOString()}`);

    // ── Test 2: Check ENV vars visible to frontend ──────────────────────
    addLog('─── ENV VARS (frontend) ───');
    addLog(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? '✅ set' : '❌ MISSING'}`);
    addLog(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ set' : '❌ MISSING'}`);
    addLog(`VITE_GEMINI_API_KEY: ${import.meta.env.VITE_GEMINI_API_KEY ? '✅ set' : '❌ MISSING'}`);
    addLog(`VITE_GROQ_API_KEY: ${import.meta.env.VITE_GROQ_API_KEY ? '✅ set' : '❌ MISSING'}`);
    addLog(`VITE_HF_API_KEY: ${import.meta.env.VITE_HF_API_KEY ? '✅ set' : '❌ MISSING'}`);

    // ── Test 3: Ping /.netlify/functions/ai-tutor directly ─────────────
    addLog('─── TEST 1: Direct Function URL ───');
    try {
      const r1 = await fetch('/.netlify/functions/ai-tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: 'ping', history: [] }),
      });
      const t1 = await r1.text();
      addLog(`Status: ${r1.status}`);
      addLog(`Body: ${t1.substring(0, 300) || '⚠️ EMPTY BODY'}`);

      if (!t1.trim()) {
        addLog('❌ EMPTY BODY — function not deployed or crashing on startup');
      } else {
        try {
          const j1 = JSON.parse(t1);
          addLog(`Keys: [${Object.keys(j1).join(', ')}]`);
          if (j1.response) addLog(`✅ response field: ${j1.response.substring(0, 100)}`);
          else if (j1.error)   addLog(`❌ error field: ${j1.error} — ${j1.message}`);
          else             addLog(`⚠️ Unknown shape: ${JSON.stringify(j1).substring(0, 200)}`);
        } catch {
          addLog(`⚠️ Not JSON: ${t1.substring(0, 200)}`);
        }
      }
    } catch (e: any) {
      addLog(`❌ Fetch threw: ${e.message}`);
    }

    // ── Test 4: Ping via /api/ai/tutor redirect ─────────────────────────
    addLog('─── TEST 2: Via /api redirect ───');
    try {
      const r2 = await fetch('/api/ai/tutor', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: 'ping', history: [] }),
      });
      const t2 = await r2.text();
      addLog(`Status: ${r2.status}`);
      addLog(`Body: ${t2.substring(0, 300) || '⚠️ EMPTY BODY'}`);

      if (!t2.trim()) {
        addLog('❌ EMPTY — redirect in netlify.toml not working');
      } else {
        try {
          const j2 = JSON.parse(t2);
          addLog(`Keys: [${Object.keys(j2).join(', ')}]`);
          if (j2.response) addLog(`✅ response: ${j2.response.substring(0, 100)}`);
          else if (j2.error)   addLog(`❌ error: ${j2.error} — ${j2.message}`);
        } catch {
          addLog(`⚠️ Not JSON: ${t2.substring(0, 200)}`);
        }
      }
    } catch (e: any) {
      addLog(`❌ Fetch threw: ${e.message}`);
    }

    // ── Test 5: Check if netlify.toml redirects exist ───────────────────
    addLog('─── TEST 3: netlify.toml check ───');
    try {
      const r3 = await fetch('/api/ai/tutor', { method: 'GET' });
      addLog(`GET /api/ai/tutor → ${r3.status}`);
      if (r3.status === 404) {
        addLog('❌ 404 — netlify.toml redirect missing or not deployed');
      } else if (r3.status === 405) {
        addLog('✅ Route exists (405 = Method Not Allowed = function is reachable)');
      } else {
        addLog(`ℹ️ Status ${r3.status} — route may or may not exist`);
      }
    } catch (e: any) {
      addLog(`❌ GET test threw: ${e.message}`);
    }

    // ── Test 6: Gemini API directly from frontend ───────────────────────
    addLog('─── TEST 4: Gemini API direct ───');
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) {
      addLog('⚠️ VITE_GEMINI_API_KEY not set — skipping Gemini test');
      addLog('💡 Note: backend uses GEMINI_API_KEY (no VITE_ prefix)');
    } else {
      try {
        const gr = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Say "API works" only.' }] }],
              generationConfig: { maxOutputTokens: 20 },
            }),
          }
        );
        const gt = await gr.text();
        addLog(`Gemini status: ${gr.status}`);
        if (gr.ok) {
          const gj = JSON.parse(gt);
          const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text;
          addLog(txt ? `✅ Gemini works: "${txt}"` : `⚠️ Gemini ok but no text. Keys: [${Object.keys(gj).join(', ')}]`);
        } else {
          addLog(`❌ Gemini failed: ${gt.substring(0, 200)}`);
        }
      } catch (e: any) {
        addLog(`❌ Gemini threw: ${e.message}`);
      }
    }

    // ── Test 7: Groq API directly from frontend ─────────────────────────
    addLog('─── TEST 5: Groq API direct ───');
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) {
      addLog('⚠️ VITE_GROQ_API_KEY not set — skipping Groq test');
      addLog('💡 Note: backend uses GROQ_API_KEY (no VITE_ prefix)');
    } else {
      try {
        const qr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model:      'llama-3.3-70b-versatile',
            messages:   [{ role: 'user', content: 'Say "API works" only.' }],
            max_tokens: 20,
            stream:     false,
          }),
        });
        const qt = await qr.text();
        addLog(`Groq status: ${qr.status}`);
        if (qr.ok) {
          const qj = JSON.parse(qt);
          const txt = qj?.choices?.[0]?.message?.content;
          addLog(txt ? `✅ Groq works: "${txt}"` : `⚠️ Groq ok but no text`);
        } else {
          addLog(`❌ Groq failed: ${qt.substring(0, 200)}`);
        }
      } catch (e: any) {
        addLog(`❌ Groq threw: ${e.message}`);
      }
    }

    // ── Test 8: HuggingFace API directly from frontend ──────────────────
    addLog('─── TEST 6: HuggingFace API direct ───');
    const hfKey = import.meta.env.VITE_HF_API_KEY;
    if (!hfKey) {
      addLog('⚠️ VITE_HF_API_KEY not set — skipping HF test');
    } else {
      try {
        const hr = await fetch(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
          {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${hfKey}`,
            },
            body: JSON.stringify({
              inputs:     'Say "API works" only.',
              parameters: { max_new_tokens: 20, return_full_text: false },
            }),
          }
        );
        const ht = await hr.text();
        addLog(`HF status: ${hr.status}`);
        if (hr.ok) {
          const hj = JSON.parse(ht);
          const txt = hj?.[0]?.generated_text || hj?.generated_text;
          if (txt)                           addLog(`✅ HF works: "${txt}"`);
          else if (hj?.error?.includes('loading')) addLog('⏳ HF model loading — try again in 20s');
          else                               addLog(`⚠️ HF ok but no text: ${JSON.stringify(hj).substring(0, 150)}`);
        } else {
          addLog(`❌ HF failed: ${ht.substring(0, 200)}`);
        }
      } catch (e: any) {
        addLog(`❌ HF threw: ${e.message}`);
      }
    }

    // ── Test 9: Supabase connectivity ───────────────────────────────────
    addLog('─── TEST 7: Supabase ───');
    const sbUrl = import.meta.env.VITE_SUPABASE_URL;
    const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!sbUrl || !sbKey) {
      addLog('⚠️ Supabase env vars missing — skipping');
    } else {
      try {
        const sr = await fetch(`${sbUrl}/rest/v1/chat_messages?limit=1`, {
          headers: {
            'apikey':        sbKey,
            'Authorization': `Bearer ${sbKey}`,
          },
        });
        addLog(`Supabase status: ${sr.status}`);
        if (sr.ok)            addLog('✅ Supabase connected');
        else if (sr.status === 401) addLog('❌ Supabase 401 — check anon key');
        else if (sr.status === 404) addLog('⚠️ Supabase 404 — chat_messages table may not exist');
        else                  addLog(`⚠️ Supabase status: ${sr.status}`);
      } catch (e: any) {
        addLog(`❌ Supabase threw: ${e.message}`);
      }
    }

    addLog('─────────────────────────');
    addLog('✅ Diagnostics complete');
    addLog('📋 Copy all text above and share it to get help');
    setDebugLoading(false);
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const scrollAreaRef  = useRef<HTMLDivElement>(null);
  // BUG FIX: Store messages in ref so callbacks always see latest value
  // without needing messages in their dependency arrays
  const messagesRef    = useRef<Message[]>([WELCOME_MESSAGE]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Auto-scroll ────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ── Scroll-to-bottom button visibility ────
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // ── Load history on mount (once, when user is ready) ──
  useEffect(() => {
    // BUG FIX: Guard all early-exit conditions clearly
    if (!user || historyLoaded || isLoadingHistory) return;

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setHistoryLoaded(true); // Nothing to load — mark done
      return;
    }

    setIsLoadingHistory(true);

    loadChatHistory(sessionId).then(history => {
      if (history.length > 0) {
        // BUG FIX: Use functional updater — don't close over stale state
        setMessages([
          {
            ...WELCOME_MESSAGE,
            content:   'Hello! I am Tutor Chuks 🎓\n\nI can help you master WAEC, JAMB, and NECO topics. Ask me anything!',
            timestamp: Date.now() - 1000,
          },
          ...history,
        ]);
        toast.success(`Loaded ${history.length} messages from your last session!`);
      }
    }).catch(err => {
      console.error('History load error:', err);
      // Non-fatal — just start fresh
    }).finally(() => {
      setHistoryLoaded(true);
      setIsLoadingHistory(false);
    });
  }, [user, historyLoaded, isLoadingHistory]);

  // ── Send message ───────────────────────────
  const sendMessage = useCallback(async (text: string, subject?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!user) {
      toast.error('Please log in to use AI Tutor.');
      return;
    }

    setLastError(null);

    const userMsg: Message = {
      id:        newMsgId(),
      role:      'user',
      content:   trimmed,
      timestamp: Date.now(),
    };

    // BUG FIX: Snapshot BEFORE adding the new user message
    // so the user message isn't included in its own history context
    const historySnapshot = messagesRef.current.map(m => ({
      role:    m.role,
      content: m.content,
    }));

    setMessages(prev => [...prev, userMsg]);
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

      setMessages(prev => [...prev, {
        id:        newMsgId(),
        role:      'ai',
        content:   result.response,
        source:    result.source,
        timestamp: Date.now(),
      }]);

    } catch (err: any) {
      const errorText = err?.message || 'Unknown error occurred.';
      console.error('AI Tutor error:', errorText);

      setLastError(errorText);
      setMessages(prev => [...prev, {
        id:        newMsgId(),
        role:      'ai',
        content:   `Sorry, I couldn't get a response right now.\n\n**Reason:** ${errorText}\n\nPlease check your connection and try again.`,
        isError:   true,
        timestamp: Date.now(),
      }]);

      toast.error(errorText, { duration: 5000 });

    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, activeSubject]);

  // ── Clear conversation ─────────────────────
  const clearConversation = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetchWithTimeout(
          `/.netlify/functions/chat-history?session_id=${encodeURIComponent(sessionId)}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
      } catch (err) {
        console.error('Failed to clear history:', err);
        // Continue clearing locally even if server call fails
      }
      rotateSessionId();
    }

    const freshWelcome: Message = {
      id:        newMsgId(),
      role:      'ai',
      content:   'Conversation cleared! Ready for a fresh start. What would you like to learn today? 📚',
      timestamp: Date.now(),
    };

    setMessages([freshWelcome]);
    setShowClearConfirm(false);
    setActiveSubject(null);
    setHistoryLoaded(false);
    setLastError(null);
    setTimeout(() => inputRef.current?.focus(), 20);
    toast.success('Conversation cleared!');
  }, []);

  // ── Handle topic click ─────────────────────
  const handleTopicClick = useCallback((topic: SyllabusTopic) => {
    setActiveSubject(topic.subject);
    sendMessage(topic.query, topic.subject);
  }, [sendMessage]);

  // ── Retry last user message ────────────────
  const retryLastMessage = useCallback(() => {
    const msgs        = messagesRef.current;
    // BUG FIX: Find the last user message first
    const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove ALL error messages that appeared after the last user message
    setMessages(prev =>
      prev.filter(m => !(m.isError === true && m.timestamp > lastUserMsg.timestamp))
    );

    setLastError(null);
    // Small delay to let the state update before re-sending
    setTimeout(() => sendMessage(lastUserMsg.content), 50);
  }, [sendMessage]);

  const subjectColor = activeSubject
    ? SUBJECT_COLORS[activeSubject] || 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20'
    : '';

  const lastMessageIsError = messages[messages.length - 1]?.isError === true;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    // BUG FIX: Added `relative` so the scroll button is positioned correctly
    <div className="relative flex h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── Chat Area ─────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="p-4 border-b border-white/10 flex items-center justify-between
                           gap-3 shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400
                              rounded-full border-2 border-zinc-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black">Tutor Chuks</h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase
                            tracking-widest flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                RAG Enhanced · Supabase Connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingHistory && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <History className="w-3 h-3 animate-spin" />
                Loading history...
              </div>
            )}

            {activeSubject && (
              <span className={`text-[10px] font-black uppercase px-2 py-1
                               rounded-lg border ${subjectColor}`}>
                {activeSubject}
              </span>
            )}

            {messages.length > 1 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-600
                           hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={runDiagnostics}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-600
                         hover:text-amber-400 transition-colors cursor-pointer"
              title="Run diagnostics"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
        >
          {historyLoaded && messages.length > 2 && (
            <div className="flex justify-center">
              <div className="text-[10px] text-zinc-600 bg-zinc-900/50 border border-white/5
                              px-3 py-1.5 rounded-full font-mono flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Previous session restored from Supabase
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono
                                font-bold bg-zinc-900/60 px-4 py-2.5 rounded-xl
                                border border-white/5">
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

        {/* BUG FIX: Scroll button now uses correct relative positioning */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-28 right-4 lg:right-80
                         bg-cyan-500 hover:bg-cyan-400 text-slate-950
                         rounded-full p-2 shadow-lg z-10 cursor-pointer"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Retry button */}
        {lastMessageIsError && (
          <div className="px-4 pb-2 flex flex-col items-center gap-1">
            {/* Show specific error if available */}
            {lastError && (
              <p className="text-[10px] text-rose-400/70 font-mono text-center max-w-xs truncate">
                {lastError}
              </p>
            )}
            <button
              onClick={retryLastMessage}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white
                         bg-zinc-900/50 hover:bg-zinc-800 border border-white/5
                         px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Retry last message
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 shrink-0">

          {/* Offline banner */}
          <OfflineBanner />

          {/* Not-logged-in warning */}
          {!user && (
            <div className="flex items-center gap-2 text-xs text-amber-400
                            bg-amber-500/10 border border-amber-500/20
                            rounded-xl px-3 py-2 mb-3">
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
              className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3
                         outline-none text-sm placeholder:text-zinc-600
                         focus:border-cyan-500/50 disabled:opacity-40 transition-colors"
              placeholder={
                user
                  ? 'Ask a question about any exam topic...'
                  : 'Log in to start chatting...'
              }
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim() || !user}
              className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950
                         font-bold shrink-0 disabled:opacity-40 transition-all"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

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
      <aside className="w-72 border-l border-white/10 bg-zinc-900/20 p-5
                        hidden lg:flex flex-col gap-5 overflow-y-auto shrink-0">

        {user && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3
                          flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500
                            to-blue-600 flex items-center justify-center text-xs
                            font-black text-white shrink-0">
              {user.name?.charAt(0).toUpperCase() ?? 'U'}
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
                className={`justify-start rounded-xl border-white/5 ${action.bg}
                            text-zinc-300 hover:text-white disabled:opacity-40 text-xs`}
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
              const color    = SUBJECT_COLORS[topic.subject] || 'text-cyan-400';
              const isActive = activeSubject === topic.subject;
              return (
                <button
                  key={i}
                  onClick={() => handleTopicClick(topic)}
                  disabled={isLoading || !user}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors
                              border flex items-start gap-2 group
                              disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-cyan-950/30 border-cyan-500/30 text-white'
                      : 'bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5 hover:border-cyan-500/30'
                  }`}
                >
                  <BookOpen className={`w-3.5 h-3.5 mt-0.5 shrink-0
                                       group-hover:scale-110 transition-transform ${
                    isActive ? 'text-cyan-400' : 'text-zinc-500'
                  }`} />
                  <div>
                    <span className="block font-medium">{topic.label}</span>
                    <span className={`text-[10px] mt-0.5 block font-bold ${color.split(' ')[0]}`}>
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
            className="fixed inset-0 bg-black/70 z-50 flex items-center
                       justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.95,    opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6
                         max-w-xs w-full space-y-4 shadow-2xl"
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

      {/* ── Debug Panel ── add before final closing </div> */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col p-3 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h2 className="text-white font-black text-sm">🔧 Debug Diagnostics</h2>
                <p className="text-zinc-500 text-[10px]">
                  {debugLoading ? 'Running tests...' : 'Tests complete — read results below'}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Copy all logs */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(debugLog.slice().reverse().join('\n'));
                    toast.success('Logs copied!');
                  }}
                  className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600
                             text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                {/* Rerun */}
                <button
                  onClick={runDiagnostics}
                  disabled={debugLoading}
                  className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500
                             text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${debugLoading ? 'animate-spin' : ''}`} />
                  Rerun
                </button>
                {/* Close */}
                <button
                  onClick={() => setShowDebug(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white
                             text-xs px-3 py-1.5 rounded-lg"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Log output */}
            <div className="flex-1 overflow-y-auto bg-zinc-950 rounded-xl
                            border border-white/10 p-3 font-mono text-[11px]
                            space-y-0.5">
              {debugLoading && (
                <div className="flex items-center gap-2 text-cyan-400 animate-pulse mb-2">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  Running diagnostics...
                </div>
              )}

              {/* Show logs in chronological order */}
              {[...debugLog].reverse().map((log, i) => {
                const isError   = log.includes('❌');
                const isSuccess = log.includes('✅');
                const isWarn    = log.includes('⚠️') || log.includes('💡') || log.includes('⏳');
                const isSep     = log.includes('───');

                return (
                  <div
                    key={i}
                    className={`leading-relaxed break-all ${
                      isSep     ? 'text-zinc-600 mt-2'  :
                      isError   ? 'text-rose-400'        :
                      isSuccess ? 'text-emerald-400'     :
                      isWarn    ? 'text-amber-400'       :
                                  'text-zinc-300'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}

              {debugLog.length === 0 && !debugLoading && (
                <p className="text-zinc-600">No logs yet. Press Rerun to start.</p>
              )}
            </div>

            {/* What to do with results */}
            <div className="mt-2 shrink-0 bg-zinc-900 rounded-xl border border-white/5 p-3">
              <p className="text-zinc-400 text-[10px] font-bold mb-1">
                📌 How to read these results:
              </p>
              <div className="text-zinc-500 text-[10px] space-y-0.5">
                <p>✅ green = working correctly</p>
                <p>❌ red = broken — this is your problem</p>
                <p>⚠️ yellow = warning or missing config</p>
                <p>Press Copy and share the logs to get help fixing it</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Temporary Debug Panel — remove after fixing ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t-2
                      border-amber-500 p-3 max-h-[30vh] overflow-y-auto">

        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-amber-400 text-xs font-black uppercase tracking-wider">
            🔧 Debug Panel
          </p>
          <div className="flex gap-2">
            {/* Run test button */}
            <button
              onClick={testFunction}
              disabled={isTesting}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs
                         font-black px-3 py-1.5 rounded-lg disabled:opacity-50
                         flex items-center gap-1 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Run Test
                </>
              )}
            </button>

            {/* Copy results button */}
            {testResult && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(testResult);
                  toast.success('Results copied!');
                }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs
                           font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            )}
          </div>
        </div>

        {/* Results output */}
        {testResult ? (
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed">
            {testResult.split('\n').map((line, i) => (
              <span
                key={i}
                className={`block ${
                  line.includes('✅')        ? 'text-emerald-400' :
                  line.includes('❌')        ? 'text-rose-400'    :
                  line.includes('⚠️')        ? 'text-amber-400'   :
                  line.includes('TEST')      ? 'text-cyan-400 font-bold mt-2' :
                  line.includes('──────')    ? 'text-zinc-600'    :
                  line.includes('Provider')  ? 'text-purple-400'  :
                  line.includes('🔑')        ? 'text-rose-300'    :
                                               'text-zinc-300'
                }`}
              >
                {line}
              </span>
            ))}
          </pre>
        ) : (
          <p className="text-zinc-600 text-xs font-mono">
            Press Run Test to diagnose the connection issue
          </p>
        )}
      </div>
    </div>
  );
}
