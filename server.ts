import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import aiRoutes from "./server/routes/ai.ts";

// ─────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

console.log('Supabase client:', supabase ? '✅ Connected' : '❌ Not configured');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "eduarena-secret-key-123-fallback-safe-default-key";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL SECURITY WARNING: JWT_SECRET environment variable is missing in production environment!");
}
const DB_FILE = path.join(__dirname, "db.json");

const SUBJECT_ID_MAP: Record<string, string> = {
  "Mathematics": "s1",
  "Biology":     "s2",
  "Physics":     "s3",
  "Chemistry":   "s4",
  "English":     "s5",
  "Government":  "s6",
};

const TOPIC_ID_MAP: Record<string, string> = {
  "Mathematics": "t2",
  "Biology":     "t1",
  "Physics":     "t3",
  "Chemistry":   "t5",
  "English":     "t7",
  "Government":  "t6",
};

// ─────────────────────────────────────────────
// Supabase Helper Functions
// ─────────────────────────────────────────────

// Save chat message to Supabase
async function saveChatMessage(
  sessionId: string,
  userId: string | null,
  role: 'user' | 'assistant',
  content: string,
  subject?: string,
  metadata?: any
) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        metadata: { ...(metadata || {}), userId, subject },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save chat message:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('❌ Chat save exception:', err.message);
    return null;
  }
}

// Get chat history from Supabase
async function getChatHistory(sessionId: string, limit = 10) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to get chat history:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error('❌ Chat history exception:', err.message);
    return [];
  }
}

// Save AI cache to Supabase
async function saveAiCacheToSupabase(
  questionHash: string,
  responseType: string,
  responseText: string,
  subject?: string
) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .upsert({
        question_hash: questionHash,
        response_type: responseType,
        response_text: responseText,
        subject: subject || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'question_hash,response_type' })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save AI cache:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('❌ AI cache save exception:', err.message);
    return null;
  }
}

// Get AI cache from Supabase
async function getAiCacheFromSupabase(
  questionHash: string,
  responseType: string
) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response_text')
      .eq('question_hash', questionHash)
      .eq('response_type', responseType)
      .single();

    if (error) return null;
    return data?.response_text || null;
  } catch {
    return null;
  }
}

// Save practice result to Supabase
async function savePracticeResultToSupabase(result: {
  user_id: string;
  session_id?: string;
  subject?: string;
  lesson_id?: string;
  score: number;
  total_questions?: number;
  coins_earned?: number;
  xp_earned?: number;
  mistakes?: any[];
  metadata?: any;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('practice_results')
      .insert({
        ...result,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save practice result:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('❌ Practice result exception:', err.message);
    return null;
  }
}

// Get past questions from Supabase
async function getPastQuestionsFromSupabase(filters: {
  subject?: string;
  exam_type?: string;
  year?: number;
  limit?: number;
}) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('global_questions_vault')
      .select('*')
      .limit(filters.limit || 20);

    if (filters.subject) {
      query = query.ilike('subject', `%${filters.subject}%`);
    }
    if (filters.exam_type) {
      query = query.ilike('exam_type', `%${filters.exam_type}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Failed to get past questions:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error('❌ Past questions exception:', err.message);
    return [];
  }
}

// Save user profile to Supabase
async function syncUserToSupabase(user: any) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level || 1,
        points: user.points || 0,
        school_id: user.school_id || null,
        rank: user.rank || 'Bronze Scholar',
        badges: user.badges || [],
        wins: user.wins || 0,
        losses: user.losses || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to sync user to Supabase:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('❌ User sync exception:', err.message);
    return null;
  }
}

// Save battle result to Supabase
async function saveBattleResultToSupabase(battle: {
  battle_id: string;
  type: string;
  players: any[];
  winner_id: string;
  questions_count: number;
  duration_ms: number;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('battle_results')
      .insert({
        ...battle,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save battle result:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error('❌ Battle result exception:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Create Supabase Tables (Auto Migration)
// ─────────────────────────────────────────────
async function ensureSupabaseTables() {
  if (!supabase) {
    console.log('⚠️ Supabase not configured, skipping table setup');
    return;
  }

  console.log('🔧 Checking Supabase tables...');

  const tablesToCheck = [
    'chat_sessions',
    'chat_messages',
    'ai_response_cache',
    'practice_results',
    'user_profiles',
    'battle_results',
    'global_questions_vault',
    'knowledge_base'
  ];

  const missingTables: string[] = [];

  for (const table of tablesToCheck) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    console.warn(`⚠️ The following Supabase tables are missing: ${missingTables.join(', ')}. Please run this SQL in your Supabase SQL Editor to initialize them:`);
    console.log(`
-- ═══════════════════════════════════════════
-- COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════

-- Chat Sessions (AI Tutor Conversations)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  subject TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_sessions(user_id);

-- AI Response Cache
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash TEXT NOT NULL,
  response_type TEXT NOT NULL,
  response_text TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_hash, response_type)
);

-- Practice Results
CREATE TABLE IF NOT EXISTS practice_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  subject TEXT,
  lesson_id TEXT,
  score NUMERIC DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  coins_earned NUMERIC DEFAULT 0,
  xp_earned NUMERIC DEFAULT 0,
  mistakes JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_user_id ON practice_results(user_id);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'student',
  level INTEGER DEFAULT 1,
  points NUMERIC DEFAULT 0,
  school_id TEXT,
  rank TEXT DEFAULT 'Bronze Scholar',
  badges JSONB DEFAULT '[]',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Results
CREATE TABLE IF NOT EXISTS battle_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id TEXT NOT NULL,
  type TEXT NOT NULL,
  players JSONB NOT NULL,
  winner_id TEXT NOT NULL,
  questions_count INTEGER DEFAULT 10,
  duration_ms BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global Questions Vault (already exists, just confirming)
CREATE TABLE IF NOT EXISTS global_questions_vault (
  id BIGINT PRIMARY KEY,
  subject TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  question_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_subject ON global_questions_vault(subject);
CREATE INDEX IF NOT EXISTS idx_vault_exam_type ON global_questions_vault(exam_type);

-- Knowledge Base (Lesson Notes)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  content TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_subject ON knowledge_base(subject);
CREATE INDEX IF NOT EXISTS idx_kb_topic ON knowledge_base(topic);

-- Enable Row Level Security (Optional but recommended)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_results ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your backend uses service role key)
CREATE POLICY "Service role full access" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON practice_results FOR ALL USING (true);
CREATE POLICY "Service role full access" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ai_response_cache FOR ALL USING (true);
CREATE POLICY "Service role full access" ON battle_results FOR ALL USING (true);
    `);
  } else {
    console.log('✅ Supabase tables verified');
  }
}

// Load hardcoded questions
const hardcodedQuestionsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "src/data/questions.json"), "utf8"));
const hardcodedQuestions = hardcodedQuestionsRaw.map((q: any) => {
    const questionText = q.question.replace(/<[^>]*>?/gm, '');
    const subject = q.subject || "English";
    return {
        id: `hc-${q.id}`,
        exam_type: q.examtype?.toUpperCase() || "JAMB",
        year: parseInt(q.examyear) || 2024,
        subject_id: SUBJECT_ID_MAP[subject] ?? "s5",
        topic_id: TOPIC_ID_MAP[subject] ?? "t7",
        subject: subject,
        question_content: questionText,
        question_text: questionText,
        options: {
            A: q.option.a,
            B: q.option.b,
            C: q.option.c,
            D: q.option.d
        },
        correct_option: q.answer?.toUpperCase(),
        explanation: q.solution || "This is a official past exam question.",
        difficulty_level: 5,
        created_at: new Date().toISOString()
    };
});

// Initial DB state
const initialDb = {
  users: [],
  schools: [
    { id: "1", name: "Lagos Academy", location: "Lagos", total_points: 1250 },
    { id: "2", name: "Abuja High", location: "Abuja", total_points: 980 }
  ],
  subjects: [
    { id: "s1", name: "Mathematics", category: "Science", created_at: new Date().toISOString() },
    { id: "s2", name: "Biology", category: "Science", created_at: new Date().toISOString() },
    { id: "s3", name: "Physics", category: "Science", created_at: new Date().toISOString() },
    { id: "s4", name: "Chemistry", category: "Science", created_at: new Date().toISOString() },
    { id: "s5", name: "English", category: "Arts", created_at: new Date().toISOString() },
    { id: "s6", name: "Government", category: "Arts", created_at: new Date().toISOString() }
  ],
  topics: [
    { id: "t1", subject_id: "s2", name: "Photosynthesis", syllabus_description: "Structure and functions of chloroplasts, light and dark reactions." },
    { id: "t2", subject_id: "s1", name: "Calculus", syllabus_description: "Differentiation from first principles, differentiation of polynomials." },
    { id: "t3", subject_id: "s3", name: "Mechanics", syllabus_description: "Laws of motion, work, energy and power." },
    { id: "t4", subject_id: "s2", name: "Cell Biology", syllabus_description: "Cell structure, organelles and their functions." },
    { id: "t5", subject_id: "s4", name: "Acids and Bases", syllabus_description: "Properties of acids, bases and salts; pH scale." },
    { id: "t6", subject_id: "s6", name: "Constitutional Development", syllabus_description: "History of constitutional development in Nigeria." },
    { id: "t7", subject_id: "s5", name: "Lexis and Structure", syllabus_description: "Vocabulary usage, sentence structure and grammar." }
  ],
  pastQuestions: [
    ...hardcodedQuestions,
    {
      id: "pq1", exam_type: "JAMB", year: 1998, subject_id: "s2", topic_id: "t1",
      question_content: "Which of the following is the primary site of photosynthesis in a leaf?",
      options: { A: "Stoma", B: "Mesophyll", C: "Epidermis", D: "Vascular bundle" },
      correct_option: "B",
      explanation: "Photosynthesis primarily takes place in the mesophyll layer of cells in the leaf.",
      image_url: null, difficulty_level: 5, created_at: new Date().toISOString()
    },
    {
      id: "pq2", exam_type: "WAEC", year: 2015, subject_id: "s1", topic_id: "t2",
      question_content: "Find the derivative of $y = 3x^2 + 5x - 7$ with respect to $x$.",
      options: { A: "$6x + 5$", B: "$3x + 5$", C: "$6x - 7$", D: "$x^2 + 5$" },
      correct_option: "A",
      explanation: "Using the power rule: dy/dx = 6x + 5.",
      image_url: null, difficulty_level: 8, created_at: new Date().toISOString()
    }
  ],
  content: [],
  questions: [],
  courses: [
    { id: "c1", subject: "Mathematics", title: "Mastering Algebra", description: "From basics to advanced equations." },
    { id: "c2", subject: "Physics", title: "Mechanics 101", description: "Understanding motion and forces." }
  ],
  lessons: [
    { id: "l1", course_id: "c1", title: "Introduction to Variables", video_url: "https://www.youtube.com/embed/vDqOoI-4Z6M", duration: "10:00", order: 1 },
    { id: "l2", course_id: "c1", title: "Linear Equations", video_url: "https://www.youtube.com/embed/l3XzepN03KQ", duration: "15:00", order: 2 }
  ],
  userProgress: [],
  practiceResults: [],
  battles: [],
  achievements: [
    { id: "a1", name: "Quiz Master", description: "Score 100% on 3 consecutive lessons", icon: "🏆" },
    { id: "a2", name: "Battle Starter", description: "Participate in 5 battles", icon: "⚔️" },
    { id: "a3", name: "Scholar Supreme", description: "Reach Rank: Gold Scholar", icon: "👑" }
  ],
  leaderboard: [],
  feed: [],
  follows: [],
  inventory: [],
  jackpot: {
    current_pool: 50000,
    next_draw: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    participants: []
  },
  battleRooms: [],
  leaderboardHistory: [],
  syllabus: [
    { exam: "JAMB", subject: "Biology", topic: "Photosynthesis", description: "Structure and functions of chloroplasts." },
    { exam: "WAEC", subject: "Mathematics", topic: "Calculus", description: "Differentiation from first principles." }
  ],
  predictions: [
    { exam: "JAMB", subject: "Biology", year: 2025, predicted_topics: ["Photosynthesis", "Genetics", "Ecology"], confidence: 0.85 },
    { exam: "WAEC", subject: "Mathematics", year: 2025, predicted_topics: ["Calculus", "Probability", "Geometry"], confidence: 0.92 }
  ],
  syllabus_mapping: [],
  textbooks: [
    { id: "tb1", title: "New General Mathematics for SS1", subject: "Mathematics", category: "Science", author: "M.F. Macrae" },
    { id: "tb2", title: "Essential Chemistry", subject: "Chemistry", category: "Science", author: "O.A. Osei" }
  ],
  chapters: [
    { id: "ch1", textbook_id: "tb1", title: "Chapter 1: Number Bases", order: 1 },
    { id: "ch2", textbook_id: "tb1", title: "Chapter 2: Modular Arithmetic", order: 2 }
  ],
  exercises: [
    { id: "ex1", chapter_id: "ch1", title: "Exercise 1a" },
    { id: "ex2", chapter_id: "ch1", title: "Exercise 1b" }
  ],
  solutions: [
    {
      id: "sol1", exercise_id: "ex1", question_number: "Q1",
      question_text: "Convert $1011_2$ to base 10.",
      steps: ["Write place values for base 2", "Multiply each digit by place value", "Sum = 11₁₀"],
      pro_tip: "Always assign powers from right to left, starting with 0.",
      topic: "Number Bases"
    }
  ],
  ai_cache: []
};

// Load or initialize DB
let _dbCache: any = null;

function getDb() {
  if (!_dbCache) {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    }
    try {
      _dbCache = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to parse db.json, resetting:", e);
      _dbCache = JSON.parse(JSON.stringify(initialDb));
      fs.writeFileSync(DB_FILE, JSON.stringify(_dbCache, null, 2));
    }
    let modified = false;
    Object.keys(initialDb).forEach(key => {
      if (_dbCache[key] === undefined) {
        _dbCache[key] = JSON.parse(JSON.stringify((initialDb as any)[key]));
        modified = true;
      }
    });
    if (modified) fs.writeFileSync(DB_FILE, JSON.stringify(_dbCache, null, 2));
  }
  return _dbCache;
}

function saveDb(db: any) {
  _dbCache = db;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ─────────────────────────────────────────────
// Rate Limiting for AI Routes
// ─────────────────────────────────────────────
const aiRateLimits = new Map<string, { count: number; resetAt: number }>();

function aiRateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const limit = 30; // 30 requests per minute
  const windowMs = 60 * 1000;

  let record = aiRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + windowMs };
    aiRateLimits.set(ip, record);
    return next();
  }

  if (record.count >= limit) {
    return res.status(429).json({ error: "Too many AI requests. Please try again after a minute." });
  }

  record.count++;
  next();
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Mount RAG-powered AI router with rate limiting
  app.use("/api/ai", aiRateLimiter, aiRoutes);

  // Run Supabase table check on startup
  await ensureSupabaseTables();

  // ─────────────────────────────────────────────
  // Auth Routes
  // ─────────────────────────────────────────────
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password, school_id, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email format" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const db = getDb();
    if (db.users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(), email: email.trim(), password: hashedPassword,
      school_id, role: role || "student", level: 1, points: 0,
      badges: [], wins: 0, losses: 0, rank: "Bronze Scholar"
    };

    db.users.push(newUser);
    saveDb(db);

    // ✅ Sync to Supabase
    await syncUserToSupabase(newUser);

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, points: 0, level: 1 } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Sync to Supabase on login
    await syncUserToSupabase(user);

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        points: user.points, 
        level: user.level,
        avatar: user.avatar || '',
        school: user.school || user.school_id || '',
        examTarget: user.examTarget || 'JAMB'
      } 
    });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          points: user.points, 
          level: user.level,
          avatar: user.avatar || '',
          school: user.school || user.school_id || '',
          examTarget: user.examTarget || 'JAMB'
        } 
      });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  function requireAuth(req: any, res: any, next: any) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      req.user = jwt.verify(token, JWT_SECRET) as any;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }

  function requireAdmin(req: any, res: any, next: any) {
    requireAuth(req, res, () => {
      if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
      next();
    });
  }

  // ─────────────────────────────────────────────
  // User Profile & Settings Management
  // ─────────────────────────────────────────────
  app.get("/api/user/profile", requireAuth, (req, res) => {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === (req as any).user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        level: user.level || 1,
        school: user.school || user.school_id || '',
        avatar: user.avatar || '',
        examTarget: user.examTarget || 'JAMB',
        aiSettings: user.aiSettings || null,
        notificationSettings: user.notificationSettings || null,
        examPreferences: user.examPreferences || null,
        gamificationSettings: user.gamificationSettings || null,
        privacySettings: user.privacySettings || null,
        appearance: user.appearance || null
      }
    });
  });

  app.post("/api/user/profile", requireAuth, async (req, res) => {
    const { 
      name, school, level, examTarget, avatar,
      aiSettings, notificationSettings, examPreferences, gamificationSettings, privacySettings, appearance 
    } = req.body;

    const db = getDb();
    const userIndex = db.users.findIndex((u: any) => u.id === (req as any).user.userId);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });

    const user = db.users[userIndex];

    // Update fields
    if (name !== undefined) user.name = name;
    if (school !== undefined) user.school = school;
    if (level !== undefined) user.level = level;
    if (examTarget !== undefined) user.examTarget = examTarget;
    if (avatar !== undefined) user.avatar = avatar;
    if (aiSettings !== undefined) user.aiSettings = aiSettings;
    if (notificationSettings !== undefined) user.notificationSettings = notificationSettings;
    if (examPreferences !== undefined) user.examPreferences = examPreferences;
    if (gamificationSettings !== undefined) user.gamificationSettings = gamificationSettings;
    if (privacySettings !== undefined) user.privacySettings = privacySettings;
    if (appearance !== undefined) user.appearance = appearance;

    db.users[userIndex] = user;
    saveDb(db);

    // Sync baseline to Supabase user_profiles if configured
    if (supabase) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            level: user.level || 1,
            points: user.points || 0,
            school_id: user.school || user.school_id || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      } catch (err) {
        console.error('⚠️ Supabase sync failed during profile update:', err);
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        level: user.level || 1,
        school: user.school || '',
        avatar: user.avatar || '',
        examTarget: user.examTarget || 'JAMB',
        aiSettings: user.aiSettings || null,
        notificationSettings: user.notificationSettings || null,
        examPreferences: user.examPreferences || null,
        gamificationSettings: user.gamificationSettings || null,
        privacySettings: user.privacySettings || null,
        appearance: user.appearance || null
      }
    });
  });



  // ─────────────────────────────────────────────
  // AI Context Search
  // ─────────────────────────────────────────────
  app.get("/api/ai/query", (req, res) => {
    const { q } = req.query;
    const db = getDb();
    const queryStr = String(q).toLowerCase();

    const matches = db.pastQuestions.filter((pq: any) =>
      (pq.question_text || '').toLowerCase().includes(queryStr) ||
      (pq.explanation && pq.explanation.toLowerCase().includes(queryStr)) ||
      (pq.year && String(pq.year).includes(queryStr))
    ).slice(0, 5);

    if (matches.length > 0) {
      const context = matches.map((m: any) =>
        `[EXAM: ${m.exam_type || 'UTME'} ${m.year}] Q: ${m.question_text}. Options: ${JSON.stringify(m.options)}. Answer: ${m.correct_option}. Explanation: ${m.explanation}`
      ).join("\n\n");
      return res.json({ context });
    }
    res.json({ context: "" });
  });

  // ─────────────────────────────────────────────
  // ALOC API Proxy
  // ─────────────────────────────────────────────
  app.get(["/api/aloc/q", "/api/aloc/q/:count"], async (req, res) => {
    const count = req.params.count || "1";
    const { subject, type, year } = req.query;
    const headerToken = req.headers.accesstoken || req.headers["accesstoken"];
    const ACCESS_TOKEN = typeof headerToken === 'string' && headerToken.trim() !== ''
      ? headerToken.trim()
      : (process.env.ALOC_API_TOKEN || 'ALOC-b77ef1b2396263a9ee7a');

    let examType = String(type || 'utme').toLowerCase().trim();
    if (examType === 'jamb') examType = 'utme';
    if (examType === 'waec') examType = 'wassce';

    let url = `https://questions.aloc.com.ng/api/v2/q/${count}?subject=${subject || 'english'}&type=${examType}`;
    if (year && year !== 'all' && year !== '') url += `&year=${year}`;
    url += `&cb=${Date.now()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "AccessToken": ACCESS_TOKEN,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.data) return res.json(data);
      }
      console.warn(`ALOC returned ${response.status}. Using fallback...`);
    } catch (error: any) {
      console.error("ALOC proxy error:", error.message);
    }

    // Neural Fallback
    const chosenSubject = String(subject || 'english').toLowerCase();
    const chosenType = String(type || 'utme').toLowerCase();
    const chosenYear = String(year || '2018');

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const prompt = `Generate ONE Nigerian exam question for ${chosenSubject} (${chosenType}, ${chosenYear}). Return ONLY raw JSON:
{
  "id": ${Math.floor(Math.random() * 8000) + 3500},
  "question": "<question text>",
  "option": { "a": "<A>", "b": "<B>", "c": "<C>", "d": "<D>" },
  "answer": "a/b/c/d",
  "solution": "<explanation>"
}`;

        const genResponse = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        const text = (genResponse.text || "").replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
        const parsedQuestion = JSON.parse(text);
        return res.json({ status: 200, message: "success (AI fallback)", data: { ...parsedQuestion, examType: chosenType.toUpperCase(), examyear: chosenYear } });
      } catch (err) {
        console.error("Gemini fallback failed:", err);
      }
    }

    const STATIC_FALLBACKS: Record<string, any> = {
      english: { id: 1101, question: "Choose the option nearest in meaning: The student's explanation was very COGENT.", option: { a: "confusing", b: "convincing", c: "lengthy", d: "irrelevant" }, answer: "b", solution: "COGENT means convincing.", examType: "UTME", examyear: "2018" },
      mathematics: { id: 1102, question: "If log 2 = 0.3010 and log 3 = 0.4771, calculate log 1.2.", option: { a: "0.0791", b: "1.0791", c: "0.1791", d: "0.2791" }, answer: "a", solution: "log 1.2 = log(12/10) = 2log2 + log3 - 1 = 0.0791", examType: "UTME", examyear: "2015" },
      physics: { id: 1103, question: "A 5kg body is pulled upward with 2 m/s². Find tension. (g=10)", option: { a: "40 N", b: "50 N", c: "60 N", d: "70 N" }, answer: "c", solution: "T = m(g+a) = 5×12 = 60N", examType: "UTME", examyear: "2019" },
      biology: { id: 1105, question: "Which process removes CO₂ from the atmosphere?", option: { a: "Respiration", b: "Photosynthesis", c: "Decarboxylation", d: "Transpiration" }, answer: "b", solution: "Photosynthesis takes CO₂ to build sugars.", examType: "UTME", examyear: "2020" }
    };

    const backupQuestion = STATIC_FALLBACKS[chosenSubject] || STATIC_FALLBACKS['english'];
    return res.json({ status: 200, message: "success (static fallback)", data: { ...backupQuestion, examType: chosenType.toUpperCase(), examyear: chosenYear } });
  });

  // ─────────────────────────────────────────────
  // Questions API
  // ─────────────────────────────────────────────
  app.get("/api/questions", async (req, res) => {
    const { search, subject, exam_type } = req.query;

    // ✅ Try Supabase first
    if (supabase) {
      try {
        let query = supabase.from('global_questions_vault').select('*').limit(100);
        if (subject) query = query.ilike('subject', `%${subject}%`);
        if (exam_type) query = query.ilike('exam_type', `%${exam_type}%`);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const formatted = data.map((row: any) => ({
            id: row.id,
            subject: row.subject,
            exam_type: row.exam_type,
            ...row.question_data
          }));
          return res.json(formatted);
        }
      } catch (err) {
        console.error('Supabase questions fetch failed, using local:', err);
      }
    }

    // Fallback to local DB
    const db = getDb();
    let filtered = db.pastQuestions;
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((q: any) => (q.question_content || q.question_text || "").toLowerCase().includes(s));
    }
    if (subject) {
      const sLower = String(subject).toLowerCase().trim();
      const subjectMap: Record<string, string> = { 's1': 'mathematics', 's2': 'biology', 's3': 'physics', 's4': 'chemistry', 's5': 'english', 's6': 'government' };
      filtered = filtered.filter((q: any) => {
        const qSubName = q.subject ? String(q.subject).toLowerCase().trim() : '';
        const mappedName = q.subject_id ? (subjectMap[q.subject_id] || '') : '';
        return qSubName === sLower || mappedName === sLower;
      });
    }
    if (exam_type) {
      const eLower = String(exam_type).toLowerCase().trim();
      filtered = filtered.filter((q: any) => (q.exam_type || q.exam_body || "").toLowerCase().trim() === eLower);
    }
    res.json(filtered);
  });

  // ─────────────────────────────────────────────
  // Practice Routes
  // ─────────────────────────────────────────────
  app.post("/api/practice/submit", async (req, res) => {
    const { lesson_id, score, coins_earned } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();

      const result = {
        user_id: decoded.userId,
        lesson_id, score, coins_earned,
        timestamp: new Date().toISOString()
      };

      db.practiceResults.push(result);

      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (user) {
        user.points += coins_earned;
        if (score === 100 && !user.badges.includes("a1")) {
          user.badges.push("a1");
        }
        // ✅ Sync updated user to Supabase
        await syncUserToSupabase(user);
      }

      // ✅ Save practice result to Supabase
      await savePracticeResultToSupabase({
        user_id: decoded.userId,
        lesson_id,
        score,
        coins_earned,
        xp_earned: coins_earned
      });

      saveDb(db);
      res.json({ success: true, result });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/practice/session/save-result", async (req, res) => {
    const { sessionId, subject, finalScore, totalQuestions, xpEarned, mistakes } = req.body;
    const db = getDb();

    const resultEntry = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId, subject, finalScore, totalQuestions, xpEarned, mistakes,
      timestamp: new Date().toISOString()
    };

    db.practiceResults.push(resultEntry);

    // ✅ Save to Supabase
    await savePracticeResultToSupabase({
      user_id: 'anonymous',
      session_id: sessionId,
      subject,
      score: finalScore,
      total_questions: totalQuestions,
      xp_earned: xpEarned,
      mistakes: mistakes || []
    });

    saveDb(db);
    res.json({ success: true, resultId: resultEntry.id });
  });

  app.get("/api/practice/session/results", async (req, res) => {
    // ✅ Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('practice_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) return res.json({ results: data });
      } catch (err) {
        console.error('Supabase practice results failed, using local:', err);
      }
    }

    const db = getDb();
    res.json({ results: db.practiceResults || [] });
  });

  app.post("/api/practice/session/start", async (req, res) => {
    res.json({ sessionId: `sess-${Date.now()}` });
  });

  // ─────────────────────────────────────────────
  // Supabase Knowledge Base Search
  // ─────────────────────────────────────────────
  async function searchSupabase(query: string, subject?: string | null): Promise<{ context: string; source?: string }> {
    if (!supabase) {
      console.log('⚠️ Supabase not configured, using local fallback');
      return getLocalContextMatches(query);
    }

    try {
      const results: string[] = [];
      let sourceName = '';

      // 1. Search Knowledge Base
      let kbQuery = supabase
        .from('knowledge_base')
        .select('subject, topic, subtopic, content, source')
        .limit(3);

      if (subject) kbQuery = kbQuery.ilike('subject', `%${subject}%`);

      const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
      if (queryWords.length > 0) {
        kbQuery = kbQuery.or(queryWords.map(w => `topic.ilike.%${w}%,subtopic.ilike.%${w}%,content.ilike.%${w}%`).join(','));
      }

      const { data: kbData, error: kbError } = await kbQuery;
      if (!kbError && kbData && kbData.length > 0) {
        const kbContext = kbData.slice(0, 2).map(item =>
          `[Lesson Note: ${item.subject} - ${item.topic} - ${item.subtopic}]\n${item.content.slice(0, 500)}`
        ).join('\n\n');
        results.push(kbContext);
        sourceName = `${kbData[0].subject} Lesson Notes`;
        console.log(`✅ Found ${kbData.length} lesson notes`);
      }

      // 2. Search Past Questions from Supabase vault
      let pqQuery = supabase
        .from('global_questions_vault')
        .select('subject, exam_type, question_data')
        .limit(5);

      if (subject) pqQuery = pqQuery.ilike('subject', `%${subject}%`);

      const { data: pqData, error: pqError } = await pqQuery;
      if (!pqError && pqData && pqData.length > 0) {
        const pqContext = pqData.slice(0, 3).map(item => {
          const qd = item.question_data as any;
          if (!qd) return '';
          const options = Object.entries(qd.option || {})
            .map(([k, v]) => `  ${k.toUpperCase()}. ${v}`).join('\n');
          return `[Past Question: ${item.subject} ${item.exam_type} ${qd.year || ''}]\nQ: ${qd.question}\n${options}\nAnswer: ${String(qd.answer).toUpperCase()}\n${qd.explanation ? `Explanation: ${qd.explanation}` : ''}`;
        }).filter(Boolean).join('\n\n');

        if (pqContext) results.push(pqContext);
        if (!sourceName && pqData[0]) sourceName = `${pqData[0].subject} Past Questions`;
        console.log(`✅ Found ${pqData.length} past questions from Supabase`);
      }

      if (results.length > 0) {
        return { context: results.join('\n\n---\n\n'), source: sourceName };
      }

      console.log('No Supabase results, using local fallback');
      return getLocalContextMatches(query);

    } catch (err: any) {
      console.error('Supabase search error:', err.message);
      return getLocalContextMatches(query);
    }
  }

  function getLocalContextMatches(userQuery: string): { context: string; source?: string } {
    try {
      const db = getDb();
      const queryStr = userQuery.toLowerCase();
      const queryWords = queryStr.replace(/[^\w\s]/g, ' ').split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'and', 'for', 'you', 'what', 'how', 'are', 'can', 'with', 'this', 'who', 'its', 'from'].includes(word));

      if (queryWords.length === 0) return { context: "" };

      const scoredMatches: { content: string; source: string; score: number }[] = [];

      if (db.pastQuestions && Array.isArray(db.pastQuestions)) {
        for (const q of db.pastQuestions) {
          let score = 0;
          const questionText = `${q.subject || ''} ${q.question_content || q.question_text || ''} ${q.explanation || ''}`.toLowerCase();
          for (const word of queryWords) {
            if (questionText.includes(word)) score += 2;
          }
          if (score > 0) {
            const optionsStr = q.options ? Object.entries(q.options)
              .filter(([_, v]) => v && String(v).trim())
              .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`).join('\n') : '';
            let content = `Past Questions Reference:\nQ: ${q.question_text || q.question_content}\n${optionsStr}\nCorrect Option: ${String(q.correct_option || 'A').toUpperCase()}`;
            if (q.explanation) content += `\nExplanation: ${q.explanation}`;
            scoredMatches.push({ content, source: `${q.exam_type || 'UTME'} ${q.year || '2024'}`, score });
          }
        }
      }

      scoredMatches.sort((a, b) => b.score - a.score);
      const bestMatch = scoredMatches[0];
      if (bestMatch) return { context: `[Source: ${bestMatch.source}] ${bestMatch.content}`, source: bestMatch.source };
    } catch (e) {
      console.error("Local match scorer failed:", e);
    }
    return { context: "Available subjects: Mathematics, Biology, Physics, Chemistry, English, and Government." };
  }

  // ─────────────────────────────────────────────
  // ✅ MAIN AI TUTOR ROUTE (Moved to server/routes/ai.ts)
  // ─────────────────────────────────────────────
  // Note: The main RAG-powered AI tutor routes are now located in /server/routes/ai.ts 
  // and mounted as Express middleware. This keeps the server file modular and maintainable.

  // ─────────────────────────────────────────────
  // Practice AI Routes (with Supabase Cache)
  // ─────────────────────────────────────────────
  app.post("/api/practice/ai-tutor", aiRateLimiter, async (req, res) => {
    try {
      const { question_text, correct_answer, type, options } = req.body;
      
      // Input validation
      if (!question_text || typeof question_text !== 'string' || !question_text.trim()) {
        return res.status(400).json({ error: "Missing or invalid question_text" });
      }
      if (!type || typeof type !== 'string' || !['hint', 'explanation'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be 'hint' or 'explanation'" });
      }

      const questionHash = crypto.createHash('sha256').update(question_text || "").digest('hex');

      // ✅ Check Supabase cache first
      const cachedFromSupabase = await getAiCacheFromSupabase(questionHash, type);
      if (cachedFromSupabase) {
        return res.json({ response: cachedFromSupabase, cached: true, source: 'supabase' });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) return res.status(500).json({ error: "AI service unavailable" });

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = type === 'hint'
        ? `Provide a subtle 1-sentence clue for: "${question_text}" without giving the answer.`
        : `Provide a 3-step explanation for: "${question_text}". Options: ${JSON.stringify(options || [])}. Correct answer: ${correct_answer || 'unknown'}.`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const aiText = response.text || "";

      if (!aiText) throw new Error("Gemini returned empty response text");

      // ✅ Save to Supabase cache only (avoid local db.json bloat)
      await saveAiCacheToSupabase(questionHash, type, aiText);

      res.json({ response: aiText, cached: false });
    } catch (err: any) {
      console.error("Practice AI Tutor failed:", err);
      res.status(500).json({ error: "Failed to generate tutor assistance: " + err.message });
    }
  });

  app.post("/api/practice/ai/explain", aiRateLimiter, async (req, res) => {
    try {
      const { question, options, userAnswer, type } = req.body;

      // Input validation
      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: "Missing or invalid question" });
      }
      if (!userAnswer || typeof userAnswer !== 'string') {
        return res.status(400).json({ error: "Missing or invalid userAnswer" });
      }

      const questionHash = crypto.createHash('sha256').update(question || "").digest('hex');
      const cacheKey = `${questionHash}_explain_${userAnswer || 'status'}`;

      // ✅ Check Supabase cache
      const cachedFromSupabase = await getAiCacheFromSupabase(cacheKey, 'analysis');
      if (cachedFromSupabase) {
        return res.json({ explanation: cachedFromSupabase, cached: true, source: 'supabase' });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.json({
          explanation: `This question tests core exam fundamentals. The answer '${userAnswer}' aligns with standard curriculum principles. Review your textbook for detailed coverage.`,
          cached: false
        });
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `You are an expert Nigerian exam tutor (JAMB, WAEC, NECO).
Question: "${question}"
Options: ${JSON.stringify(options || [])}
User's answer status: "${userAnswer}"

Explain in 2-3 sentences why the correct option is right and why the others are wrong. Be concise and curriculum-aligned.`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const textContent = response.text || "";

      if (!textContent) throw new Error("Gemini returned empty response text");

      // ✅ Save to Supabase cache only (avoid local db.json bloat)
      await saveAiCacheToSupabase(cacheKey, 'analysis', textContent);

      res.json({ explanation: textContent, cached: false });
    } catch (err: any) {
      console.error("Explain route error:", err);
      res.status(500).json({ error: "Explanation pipeline failed: " + err.message });
    }
  });

  // ─────────────────────────────────────────────
  // AI Notifications
  // ─────────────────────────────────────────────
  app.post("/api/ai/notifications/generate", async (req, res) => {
    const { performanceSummary } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return res.status(500).json({ error: "AI service unavailable" });

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    try {
      const prompt = `You are a competitive CBT AI Academic Coach for WAEC, JAMB, and NECO students.
Analyze: ${JSON.stringify(performanceSummary || {})}

Generate exactly 4 engaging, action-driven alerts:
1. AI Learning analysis (type: "ai") - weakest subject
2. Exam Mock alert (type: "exam") - simulation challenge
3. Study Planner (type: "study") - timetable reminder
4. Gamification (type: "gamification") - streaks/leaderboard

Return JSON array with: title, message, type, priority (high/medium/low), action_link`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                message: { type: Type.STRING },
                type: { type: Type.STRING },
                priority: { type: Type.STRING },
                action_link: { type: Type.STRING }
              },
              required: ["title", "message", "type", "priority", "action_link"]
            }
          }
        }
      });

      const notifications = JSON.parse(response.text || "[]");
      res.json({ success: true, notifications });
    } catch (err: any) {
      console.error("AI Notifications failed:", err);
      res.status(500).json({ error: "Failed to generate notifications" });
    }
  });

  // ─────────────────────────────────────────────
  // Standard Data Routes
  // ─────────────────────────────────────────────
  app.get("/api/courses", (req, res) => { res.json(getDb().courses); });
  app.get("/api/courses/:id/lessons", (req, res) => { res.json(getDb().lessons.filter((l: any) => l.course_id === req.params.id)); });
  app.get("/api/lessons/:id", (req, res) => { res.json(getDb().lessons.find((l: any) => l.id === req.params.id)); });
  app.get("/api/content", (req, res) => { res.json(getDb().content); });
  app.get("/api/schools", (req, res) => { res.json(getDb().schools); });

  app.get("/api/leaderboard", async (req, res) => {
    // ✅ Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, name, points, level, rank, school_id, wins')
          .order('points', { ascending: false })
          .limit(10);

        if (!error && data && data.length > 0) return res.json(data);
      } catch (err) {
        console.error('Supabase leaderboard failed, using local:', err);
      }
    }
    const db = getDb();
    res.json([...db.users].sort((a: any, b: any) => b.points - a.points).slice(0, 10));
  });

  app.get("/api/user/progress", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.json(getDb().userProgress.filter((p: any) => p.user_id === decoded.userId));
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.get("/api/social/feed", (req, res) => {
    const db = getDb();
    const feedWithUsers = db.feed.map((item: any) => {
      const user = db.users.find((u: any) => u.id === item.user_id);
      return { ...item, user: user ? { name: user.name, school: user.school_id } : { name: "System", school: "EduArena" } };
    });
    res.json(feedWithUsers.reverse());
  });

  app.post("/api/social/share", (req, res) => {
    const { content, type } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const newItem = { id: Math.random().toString(36).substr(2, 9), user_id: decoded.userId, type: type || "achievement", content, timestamp: new Date().toISOString() };
      db.feed.push(newItem);
      saveDb(db);
      res.json(newItem);
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/social/share-image", (req, res) => {
    const { userId, score, rank } = req.body;
    res.json({ url: `/images/og-score-${userId}.png?score=${score}&rank=${rank}`, message: `Check out my score of ${score} on EduArena!`, challengeLink: `/arena/challenge/${userId}` });
  });

  app.get("/api/economy/jackpot", (req, res) => { res.json(getDb().jackpot); });

  app.post("/api/economy/jackpot/enter", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const today = new Date().toISOString().split('T')[0];
      const lessonsToday = db.practiceResults.filter((r: any) => r.user_id === decoded.userId && r.timestamp?.startsWith(today)).length;
      if (lessonsToday < 3) return res.status(400).json({ error: "Complete 3 lessons to unlock the jackpot!" });
      if (!db.jackpot.participants.includes(decoded.userId)) {
        db.jackpot.participants.push(decoded.userId);
        saveDb(db);
      }
      res.json({ success: true });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.get("/api/user/inventory", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.json(getDb().inventory.filter((i: any) => i.user_id === decoded.userId));
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/economy/buy", (req, res) => {
    const { item_id, price } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.points < price) return res.status(400).json({ error: "Insufficient Edu-Coins" });
      user.points -= price;
      db.inventory.push({ id: Math.random().toString(36).substr(2, 9), user_id: decoded.userId, item_id, timestamp: new Date().toISOString() });
      saveDb(db);
      res.json({ success: true, points: user.points });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // ─────────────────────────────────────────────
  // Textbook Routes
  // ─────────────────────────────────────────────
  app.get("/api/textbooks/search", (req, res) => {
    const { q } = req.query;
    const db = getDb();
    if (!q) return res.json([]);
    const query = String(q).toLowerCase();
    const results: any[] = [];
    db.solutions.forEach((sol: any) => {
      const exercise = db.exercises.find((e: any) => e.id === sol.exercise_id);
      const chapter = db.chapters.find((c: any) => c.id === exercise?.chapter_id);
      const textbook = db.textbooks.find((t: any) => t.id === chapter?.textbook_id);
      const searchString = `${textbook?.title} ${chapter?.title} ${exercise?.title} ${sol.question_number} ${sol.topic}`.toLowerCase();
      if (searchString.includes(query)) results.push({ type: 'solution', id: sol.id, title: `${textbook?.title} - ${exercise?.title} ${sol.question_number}`, topic: sol.topic, textbook: textbook?.title });
    });
    db.textbooks.forEach((tb: any) => {
      if (tb.title.toLowerCase().includes(query) || tb.subject.toLowerCase().includes(query)) {
        results.push({ type: 'textbook', id: tb.id, title: tb.title, subject: tb.subject, author: tb.author });
      }
    });
    res.json(results.slice(0, 10));
  });

  app.get("/api/textbooks", (req, res) => { res.json(getDb().textbooks); });
  app.get("/api/textbooks/:id/chapters", (req, res) => {
    const db = getDb();
    const chapters = db.chapters.filter((c: any) => c.textbook_id === req.params.id);
    res.json(chapters.map((c: any) => ({ ...c, exercises: db.exercises.filter((e: any) => e.chapter_id === c.id) })));
  });
  app.get("/api/exercises/:id/solutions", (req, res) => { res.json(getDb().solutions.filter((s: any) => s.exercise_id === req.params.id)); });
  app.get("/api/solutions/:id", (req, res) => {
    const db = getDb();
    const solution = db.solutions.find((s: any) => s.id === req.params.id);
    if (!solution) return res.status(404).json({ error: "Solution not found" });
    const exercise = db.exercises.find((e: any) => e.id === solution.exercise_id);
    const chapter = db.chapters.find((c: any) => c.id === exercise?.chapter_id);
    const textbook = db.textbooks.find((t: any) => t.id === chapter?.textbook_id);
    res.json({ ...solution, exercise_title: exercise?.title, chapter_title: chapter?.title, textbook_title: textbook?.title });
  });
  app.post("/api/solutions/request", (req, res) => { res.json({ success: true, message: "Solution requested! Our experts will notify you soon." }); });

  // ─────────────────────────────────────────────
  // Admin Routes
  // ─────────────────────────────────────────────
  app.get("/api/admin/subjects", requireAdmin, (req, res) => { res.json(getDb().subjects); });

  app.post("/api/admin/subjects", requireAdmin, (req, res) => {
    const { name, category } = req.body;
    const db = getDb();
    if (db.subjects.find((s: any) => s.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: "Subject already exists" });
    const newSubject = { id: `s${Date.now()}`, name, category, created_at: new Date().toISOString() };
    db.subjects.push(newSubject);
    saveDb(db);
    res.json(newSubject);
  });

  app.post("/api/admin/topics", requireAdmin, (req, res) => {
    const { subject_id, name, syllabus_description } = req.body;
    const db = getDb();
    if (db.topics.find((t: any) => t.subject_id === subject_id && t.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: "Topic already exists" });
    const newTopic = { id: `t${Date.now()}`, subject_id, name, syllabus_description };
    db.topics.push(newTopic);
    saveDb(db);
    res.json(newTopic);
  });

  app.get("/api/admin/questions", requireAdmin, (req, res) => {
    const { exam_type, year, subject_id, topic_id, search, page = "1", limit = "50" } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions;
    if (exam_type) filtered = filtered.filter((q: any) => q.exam_type === exam_type);
    if (year) filtered = filtered.filter((q: any) => q.year === Number(year));
    if (subject_id) filtered = filtered.filter((q: any) => q.subject_id === subject_id);
    if (topic_id) filtered = filtered.filter((q: any) => q.topic_id === topic_id);
    if (search) { const s = String(search).toLowerCase(); filtered = filtered.filter((q: any) => (q.question_text || '').toLowerCase().includes(s)); }
    const p = Number(page), l = Number(limit);
    res.json({ total: filtered.length, questions: filtered.slice((p - 1) * l, p * l) });
  });

  app.post("/api/admin/questions", requireAdmin, async (req, res) => {
    const questionData = req.body;
    const db = getDb();
    const isDuplicate = db.pastQuestions.some((q: any) =>
      q.exam_type === questionData.exam_type &&
      q.year === Number(questionData.year) &&
      (q.question_text || '').trim().toLowerCase() === (questionData.question_text || '').trim().toLowerCase()
    );
    if (isDuplicate) return res.status(400).json({ error: "Duplicate question exists." });

    const newQuestion = { id: `pq-${crypto.randomUUID()}`, ...questionData, year: Number(questionData.year), difficulty_level: Number(questionData.difficulty_level || 5), created_at: new Date().toISOString() };
    db.pastQuestions.push(newQuestion);
    saveDb(db);
    res.json({ success: true, question: newQuestion });
  });

  app.put("/api/admin/questions/:id", requireAdmin, (req, res) => {
    const db = getDb();
    const index = db.pastQuestions.findIndex((q: any) => q.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Question not found" });
    db.pastQuestions[index] = { ...db.pastQuestions[index], ...req.body, year: Number(req.body.year) };
    saveDb(db);
    res.json({ success: true, question: db.pastQuestions[index] });
  });

  app.delete("/api/admin/questions/:id", requireAdmin, (req, res) => {
    const db = getDb();
    db.pastQuestions = db.pastQuestions.filter((q: any) => q.id !== req.params.id);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/admin/embeddings", requireAdmin, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const embeddingResult = await ai.models.embedContent({ model: "text-embedding-004", contents: text });
      const embedding = embeddingResult?.embeddings?.[0]?.values ?? (embeddingResult as any)?.embedding?.values;
      if (!embedding) return res.status(500).json({ error: "Empty embedding returned" });
      res.json({ embedding });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/import", requireAdmin, (req, res) => {
    const { type, data } = req.body;
    const db = getDb();
    if (type === 'questions') {
      const newQuestions = data.map((item: any) => ({ id: `pq-${crypto.randomUUID()}`, ...item, created_at: new Date().toISOString() }));
      const existingHashes = new Set(db.pastQuestions.map((q: any) => `${q.exam_type}-${q.year}-${(q.question_text || q.question_content || '').substring(0, 50)}`));
      const filtered = newQuestions.filter((q: any) => !existingHashes.has(`${q.exam_type}-${q.year}-${(q.question_text || q.question_content || '').substring(0, 50)}`));
      db.pastQuestions.push(...filtered);
      saveDb(db);
      return res.json({ success: true, added: filtered.length, skipped: newQuestions.length - filtered.length });
    }
    res.status(400).json({ error: "Invalid import type" });
  });

  app.post("/api/admin/ocr-ingest", requireAdmin, (req, res) => {
    const { structured_payload } = req.body;
    const db = getDb();
    if (!structured_payload.difficulty_level) structured_payload.difficulty_level = Math.floor(Math.random() * 10) + 1;
    const newId = `pq-ocr-${crypto.randomUUID()}`;
    db.pastQuestions.push({ id: newId, ...structured_payload, created_at: new Date().toISOString() });
    saveDb(db);
    res.json({ success: true, id: newId });
  });

  // ─────────────────────────────────────────────
  // Oracle Routes
  // ─────────────────────────────────────────────
  app.get("/api/oracle/questions/by-year", (req, res) => {
    const { exam, year, subject_id, page = "1", limit = "20" } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions;
    if (exam) filtered = filtered.filter((q: any) => (q.exam_type || q.exam_body) === exam);
    if (year) filtered = filtered.filter((q: any) => q.year === Number(year));
    if (subject_id) filtered = filtered.filter((q: any) => q.subject_id === subject_id);
    const p = Number(page), l = Number(limit);
    res.json({ total: filtered.length, page: p, limit: l, questions: filtered.slice((p - 1) * l, p * l) });
  });

  app.get("/api/oracle/questions/by-topic", (req, res) => {
    const { topic_id, page = "1", limit = "20" } = req.query;
    const db = getDb();
    const filtered = db.pastQuestions.filter((q: any) => q.topic_id === topic_id);
    const p = Number(page), l = Number(limit);
    res.json({ total: filtered.length, page: p, limit: l, questions: filtered.slice((p - 1) * l, p * l) });
  });

  app.get("/api/oracle/search", (req, res) => {
    const { exam, year, subject_id, topic_id, difficulty, page = "1", limit = "20" } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions;
    if (exam) filtered = filtered.filter((q: any) => (q.exam_type || q.exam_body) === exam);
    if (year) filtered = filtered.filter((q: any) => q.year === Number(year));
    if (subject_id) filtered = filtered.filter((q: any) => q.subject_id === subject_id);
    if (topic_id) filtered = filtered.filter((q: any) => q.topic_id === topic_id);
    if (difficulty) filtered = filtered.filter((q: any) => (q.difficulty_level || q.difficulty_score) === Number(difficulty));
    const p = Number(page), l = Number(limit);
    res.json({ total: filtered.length, page: p, limit: l, questions: filtered.slice((p - 1) * l, p * l) });
  });

  app.get("/api/oracle/years", (req, res) => {
    const years = [];
    for (let i = 2025; i >= 1983; i--) years.push(i);
    res.json(years);
  });

  app.get("/api/oracle/topics", (req, res) => {
    const { subject_id, subject_name } = req.query;
    const db = getDb();
    let filteredTopics = db.topics;
    if (subject_id) {
      filteredTopics = filteredTopics.filter((t: any) => t.subject_id === subject_id);
    } else if (subject_name) {
      const subject = db.subjects.find((s: any) => s.name.toLowerCase() === String(subject_name).toLowerCase());
      if (subject) filteredTopics = filteredTopics.filter((t: any) => t.subject_id === subject.id);
    }
    res.json(filteredTopics);
  });

  app.get("/api/oracle/predictions", (req, res) => {
    const { exam, subject } = req.query;
    let filtered = getDb().predictions;
    if (exam) filtered = filtered.filter((p: any) => p.exam === exam);
    if (subject) filtered = filtered.filter((p: any) => p.subject === subject);
    res.json(filtered);
  });

  app.get("/api/oracle/training-snapshot", (req, res) => {
    const { topic_id } = req.query;
    const db = getDb();
    const topic = db.topics.find((t: any) => t.id === topic_id);
    if (!topic) return res.status(404).json({ error: "Topic not found" });
    const subject = db.subjects.find((s: any) => s.id === topic.subject_id);
    const questions = db.pastQuestions.filter((q: any) => q.topic_id === topic_id);
    res.json({
      topic_id, topic_name: topic.name, subject_name: subject?.name, syllabus: topic.syllabus_description,
      question_count: questions.length,
      questions: questions.map((q: any) => ({ id: q.id, year: q.year, exam: q.exam_type || q.exam_body, content: q.question_text || q.question_content, difficulty: q.difficulty_level || q.difficulty_score }))
    });
  });

  app.get("/api/mastery/syllabus", (req, res) => {
    const { exam, subject } = req.query;
    let filtered = getDb().syllabus;
    if (exam) filtered = filtered.filter((s: any) => s.exam === exam);
    if (subject) filtered = filtered.filter((s: any) => s.subject === subject);
    res.json(filtered);
  });

  // ─────────────────────────────────────────────
  // Arena Routes
  // ─────────────────────────────────────────────
  const activeBattles = new Map();
  const userSocketMap = new Map();

  app.get("/api/arena/lobby", (req, res) => {
    const db = getDb();
    const onlineUserIds = Array.from(userSocketMap.keys());
    res.json(db.users.filter((u: any) => onlineUserIds.includes(u.id)).map((u: any) => ({
      id: u.id, name: u.name, school: u.school_id, level: u.level,
      wins: u.wins || 0, losses: u.losses || 0, rank: u.rank || "Bronze Scholar", isOnline: true
    })));
  });

  app.get("/api/arena/leaderboard", (req, res) => {
    const db = getDb();
    res.json(db.schools.map((s: any) => {
      const history = db.leaderboardHistory.filter((h: any) => h.school_id === s.id);
      return { ...s, wins: history.filter((h: any) => h.result === 'win').length, losses: history.filter((h: any) => h.result === 'loss').length };
    }).sort((a: any, b: any) => b.total_points - a.total_points));
  });

  app.get("/api/arena/battle-set", (req, res) => {
    const { subject_id, count = "10" } = req.query;
    const db = getDb();
    let pool = db.pastQuestions;
    if (subject_id) pool = pool.filter((q: any) => q.subject_id === subject_id);
    res.json([...pool].sort(() => 0.5 - Math.random()).slice(0, Number(count)));
  });

  app.post("/api/exam/analyze", async (req, res) => {
    try {
      const { userAnswers, questions } = req.body;
      const analysis = questions.map((q: any) => {
        const selected = userAnswers[q.id];
        const isCorrect = selected?.toLowerCase() === (q.answer || '').toLowerCase();
        return { questionId: q.id, isCorrect, explanation: isCorrect ? "Correct!" : `Selected '${selected}' was wrong. Correct: '${q.answer}'. ${q.solution || ''}`, conceptNote: `Topic: ${q.section || 'General'}` };
      });
      res.json({ analysis });
    } catch (err) {
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/analytics/explain", async (req, res) => {
    const { topic, frequency, year } = req.body;
    res.json({ explanation: `'${topic}' appeared ${frequency} times in ${year}. High importance in recent curriculum.` });
  });

  app.post("/api/ai/predict-topics", async (req, res) => { res.json({ message: "Prediction generated" }); });
  app.post("/api/ai/study-plan", async (req, res) => { res.json({ message: "Study plan generated" }); });

  app.post("/api/ai/performance-insight", async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.json({
        insight: "AI is currently offline because the GEMINI_API_KEY is not configured on the server. Please add it via the settings menu, or complete more practice sessions to activate insights."
      });
    }

    const { stats, history, mastery } = req.body;
    
    const prompt = `
      You are an elite AI Academic Performance Coach for Edu Arena, an exam preparation platform for African standardized exams (JAMB, WAEC, NECO).
      Analyze the student's learning progress and generate a highly personalized, encouraging, and actionable study recommendation.

      Student Performance Data:
      - Average Score: ${stats?.avgScore ?? 'No scores yet'}%
      - Exam Readiness Estimate: ${stats?.readiness ?? 'No estimation yet'}%
      - Total Practice Sessions: ${stats?.totalExams ?? 0}
      - Total Questions Answered: ${stats?.totalQuestions ?? 0}
      
      Recent Session History:
      ${JSON.stringify(history?.slice(0, 5) || [], null, 2)}

      Topic Mastery Levels:
      ${JSON.stringify(mastery || [], null, 2)}

      Provide your response in a supportive, professional academic coaching style. 
      Point out their clearest strengths (e.g., highest-scoring subjects/topics), call out 1-2 exact weak areas that need immediate practice, and give them a structured 3-step action plan to improve. Keep the summary under 160 words, format with paragraphs, and use elegant markdown (bold highlights). Do not use placeholders or generic phrases.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const insightText = response.text || "Keep up the hard work! Continue taking practice sessions to unlock more personalized AI coaching.";
      res.json({ insight: insightText });
    } catch (error: any) {
      console.error("Failed to generate AI performance insight:", error);
      res.status(500).json({ error: "Failed to generate AI performance insight" });
    }
  });

  app.post("/api/ai/leaderboard-insight", async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.json({
        insight: "You're doing fantastic! Take another practice CBT test or challenge today to outpace your peers and secure a spot in the top 10."
      });
    }

    const { rank, points, topUsers, activeChallenge } = req.body;

    const prompt = `
      You are an elite AI Academic Performance Coach for Edu Arena, an African exam-prep platform.
      Analyze the student's competitive standing on the Leaderboard and generate a brief, highly motivating, and strategic tip to help them climb.

      Leaderboard Context:
      - Current Student Rank: #${rank ?? '12'}
      - Current Student Points: ${points ?? '0'} XP
      - Top Competitors: ${JSON.stringify(topUsers || [], null, 2)}
      - Active Weekly Challenge: ${activeChallenge ?? 'WAEC/JAMB Mastery Drive'}

      Provide a short, punchy 2-sentence response. It must be encouraging, refer directly to their current rank (#${rank}), and suggest a specific strategy (like doing the active weekly challenge or focusing on their high-yield topic categories to outpace others). Under 60 words. No placeholders.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      res.json({ insight: response.text || "Keep practicing! You are close to overtaking your next rival." });
    } catch (error) {
      console.error("Failed to generate leaderboard insight:", error);
      res.json({ insight: "Keep pushing! Completing one more full WAEC exam will give you the XP boost needed to advance." });
    }
  });

  app.post("/api/ai/achievements-insight", async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.json({
        insight: "Incredible work on your achievements! Target the **Perfect Score Master** or **Consistency King** milestone to gain massive bonus XP and reinforce your knowledge."
      });
    }

    const { unlockedCount, totalCount, totalXp, unlockedList, lockedList } = req.body;

    const prompt = `
      You are an elite AI Academic Performance Coach for Edu Arena, an African exam-prep platform.
      Analyze the student's learning achievements and milestones:
      - Achievements Unlocked: ${unlockedCount} / ${totalCount}
      - Cumulative XP: ${totalXp} XP
      - Unlocked Milestones: ${JSON.stringify(unlockedList || [])}
      - Locked Milestones: ${JSON.stringify(lockedList || [])}

      Provide a short, motivating, and highly strategic tip (exactly 2 sentences, under 60 words) celebrating their unlocked achievements and advising them on which specific locked milestone they should tackle next (e.g., "Perfect Score Master" or "Speed Solver Champion") to maximize their learning momentum. Do not use generic placeholders.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      res.json({ insight: response.text || "Superb progress! Keep tackling practice quizzes to unlock more badges." });
    } catch (error) {
      console.error("Failed to generate achievements insight:", error);
      res.json({ insight: "Outstanding effort! Focus on completing a full mock exam under 30 minutes to unlock the **Speed Solver Champion** badge today." });
    }
  });

  app.get("/api/teacher/class-performance", (req, res) => { res.json({ classAverage: 72, topStudents: [{ name: "Alice", score: 95 }], commonStruggleTopics: ["Photosynthesis"] }); });
  app.post("/api/teacher/generate-assignment", async (req, res) => { const { topic, difficulty } = req.body; res.json({ assignment: `Quiz for ${topic} at ${difficulty} level.` }); });
  app.post("/api/teacher/summarize-student", async (req, res) => { const { studentName } = req.body; res.json({ summary: `${studentName} shows great progress but needs more practice on advanced topics.` }); });

  // ─────────────────────────────────────────────
  // Socket.io (Arena)
  // ─────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on('join_battle', ({ roomId, userId }) => {
      socket.join(roomId);
      io.to(roomId).emit('user_joined', { userId });
    });

    socket.on("register_user", (userId) => {
      userSocketMap.set(userId, socket.id);
      (socket as any).userId = userId;
      io.emit("lobby_update");
    });

    socket.on("challenge_user", ({ targetUserId, fromUser, battleSource }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) io.to(targetSocketId).emit("battle_invite", { fromUser, battleId: crypto.randomUUID(), battleSource: battleSource || "General" });
    });

    socket.on("challenge_ai", ({ fromUser }) => {
      const db = getDb();
      const hardQuestions = db.pastQuestions.filter((q: any) => q.difficulty === 'Hard').sort(() => 0.5 - Math.random()).slice(0, 10);
      const battleId = `battle_ai_${Date.now()}`;
      const battleRoom = {
        id: battleId, type: 'ai_boss', status: 'active',
        players: [{ ...fromUser, score: 0, socketId: socket.id }, { id: "ai_boss", name: "AI Final Boss", school: "The Nexus", level: 99, score: 0, socketId: "ai_socket" }],
        questions: hardQuestions.map((q: any) => ({ id: q.id, question: q.question_text, options: q.options, topic: q.topic, year: q.year })),
        fullQuestions: hardQuestions, currentQuestionIndex: 0,
        startTime: Date.now(), questionStartTime: Date.now(), answers: []
      };
      activeBattles.set(battleId, battleRoom);
      socket.join(battleId);
      io.to(battleId).emit("battle_started", { id: battleId, players: battleRoom.players, questions: battleRoom.questions });

      let qIndex = 0;
      const aiInterval = setInterval(() => {
        const room = activeBattles.get(battleId);
        if (!room || room.status !== 'active' || qIndex >= 10) { clearInterval(aiInterval); return; }
        const isCorrect = Math.random() < 0.92;
        const player = room.players.find((p: any) => p.id === "ai_boss");
        if (player) player.score += isCorrect ? 100 : 0;
        room.answers.push({ questionIndex: qIndex, userId: "ai_boss", isCorrect, points: isCorrect ? 100 : 0 });
        io.to(battleId).emit("battle_update", { players: room.players, lastAnswer: { userId: "ai_boss", isCorrect, points: isCorrect ? 100 : 0, questionIndex: qIndex } });
        qIndex++;
      }, 5500);
    });

    socket.on("accept_challenge", ({ battleId, player1, player2, battleSource }) => {
      const db = getDb();
      let questions = battleSource
        ? db.pastQuestions.filter((q: any) => { const [e, y] = battleSource.split(" "); return q.exam === e && q.year === Number(y); }).sort(() => 0.5 - Math.random()).slice(0, 10)
        : [];
      if (questions.length < 5) questions = [...questions, ...db.questions.sort(() => 0.5 - Math.random()).slice(0, 10 - questions.length)];

      const battleRoom = {
        id: battleId, type: 'p2p', status: 'active',
        players: [{ ...player1, score: 0, socketId: userSocketMap.get(player1.id) }, { ...player2, score: 0, socketId: socket.id }],
        questions: questions.map((q: any) => ({ id: q.id, question: q.question_text || q.text, options: q.options, topic: q.topic, year: q.year })),
        fullQuestions: questions, currentQuestionIndex: 0, startTime: Date.now(), questionStartTime: Date.now(), answers: []
      };
      activeBattles.set(battleId, battleRoom);

      const p1Socket = io.sockets.sockets.get(battleRoom.players[0].socketId);
      const p2Socket = io.sockets.sockets.get(battleRoom.players[1].socketId);
      if (p1Socket) p1Socket.join(battleId);
      if (p2Socket) p2Socket.join(battleId);
      io.to(battleId).emit("battle_started", { id: battleId, players: battleRoom.players, questions: battleRoom.questions, currentQuestionIndex: 0 });
    });

    socket.on("submit_battle_answer", async (data) => {
      if (data.roomId) {
        io.to(data.roomId).emit('battle_update', { userId: data.userId, isCorrect: data.isCorrect, score: data.isCorrect ? 10 : 0 });
        return;
      }

      const { battleId, questionIndex, answer } = data;
      const battle = activeBattles.get(battleId);
      if (!battle || battle.status !== 'active') return;

      const question = battle.fullQuestions[questionIndex];
      const correctOption = question.correct_option ?? question.correct_answer ?? "";
      const isCorrect = String(correctOption).toUpperCase() === String(answer).toUpperCase();
      const userId = (socket as any).userId;
      const timestamp = Date.now();

      let points = isCorrect ? 10 : 0;
      if (isCorrect) {
        const timeTaken = (timestamp - battle.questionStartTime) / 1000;
        points += Math.round(Math.max(0, 6 - timeTaken));
      }

      const player = battle.players.find((p: any) => p.id === userId);
      if (player) player.score += points;
      battle.answers.push({ questionIndex, userId, timestamp, isCorrect, points });

      io.to(battleId).emit("battle_update", { players: battle.players, lastAnswer: { userId, isCorrect, points, questionIndex } });

      const totalAnswers = battle.answers.filter((a: any) => a.questionIndex === questionIndex).length;
      if (totalAnswers === 2) {
        setTimeout(async () => {
          battle.currentQuestionIndex++;
          battle.questionStartTime = Date.now();
          if (battle.currentQuestionIndex < 10) {
            io.to(battleId).emit("next_question", { index: battle.currentQuestionIndex });
          } else {
            battle.status = 'completed';
            const winner = battle.players.reduce((prev: any, current: any) => prev.score > current.score ? prev : current);
            const db = getDb();
            battle.players.forEach((p: any) => {
              const u = db.users.find((user: any) => user.id === p.id);
              if (u) {
                u.points += p.score;
                if (p.id === winner.id) { u.points += 500; u.wins = (u.wins || 0) + 1; }
                else u.losses = (u.losses || 0) + 1;
                if (u.wins > 50) u.rank = "Diamond Scholar";
                else if (u.wins > 20) u.rank = "Gold Scholar";
                else if (u.wins > 10) u.rank = "Silver Scholar";
                // ✅ Sync to Supabase
                syncUserToSupabase(u);
              }
            });
            saveDb(db);

            // ✅ Save battle result to Supabase
            await saveBattleResultToSupabase({
              battle_id: battleId,
              type: battle.type,
              players: battle.players,
              winner_id: winner.id,
              questions_count: 10,
              duration_ms: Date.now() - battle.startTime
            });

            io.to(battleId).emit("battle_completed", { winner, players: battle.players });
            activeBattles.delete(battleId);
          }
        }, 2000);
      }
    });

    socket.on("admin_start_derby", ({ schoolA, schoolB }) => {
      const battleId = `derby_${crypto.randomUUID()}`;
      const db = getDb();
      const derby = {
        id: battleId, type: 'school_derby', status: 'active',
        schools: [{ id: schoolA.id, name: schoolA.name, score: 0 }, { id: schoolB.id, name: schoolB.name, score: 0 }],
        questions: db.questions.sort(() => 0.5 - Math.random()).slice(0, 15),
        currentQuestionIndex: 0, answeredBy: null
      };
      activeBattles.set(battleId, derby);
      io.emit("derby_announcement", { battleId, schoolA, schoolB });
    });

    socket.on("derby_answer", ({ battleId, questionIndex, answer, schoolId }) => {
      const derby = activeBattles.get(battleId);
      if (!derby || derby.status !== 'active' || derby.currentQuestionIndex !== questionIndex) return;
      const question = derby.questions[questionIndex];
      const correctOption = question.correct_option ?? question.correct_answer ?? "";
      if (String(correctOption).toUpperCase() === String(answer).toUpperCase()) {
        const school = derby.schools.find((s: any) => s.id === schoolId);
        if (school) school.score += 1;
        io.emit("derby_point", { battleId, schoolId, questionIndex, winner: school?.name });
        setTimeout(() => {
          derby.currentQuestionIndex++;
          if (derby.currentQuestionIndex < 15) {
            io.emit("derby_next_question", { index: derby.currentQuestionIndex });
          } else {
            derby.status = 'completed';
            const winner = derby.schools.reduce((prev: any, current: any) => prev.score > current.score ? prev : current);
            const db = getDb();
            derby.schools.forEach((s: any) => {
              const schoolDb = db.schools.find((sd: any) => sd.id === s.id);
              if (schoolDb) {
                schoolDb.total_points += s.score * 100;
                db.leaderboardHistory.push({ school_id: s.id, battle_id: battleId, result: s.id === winner.id ? 'win' : 'loss', points: s.score * 100, timestamp: new Date().toISOString() });
              }
            });
            saveDb(db);
            io.emit("derby_completed", { winner, schools: derby.schools });
            activeBattles.delete(battleId);
          }
        }, 2000);
      }
    });

    socket.on("disconnect", () => {
      const userId = (socket as any).userId;
      if (userId) { userSocketMap.delete(userId); io.emit("lobby_update"); }
      console.log("User disconnected:", socket.id);
    });
  });

  // ─────────────────────────────────────────────
  // Vite Integration
  // ─────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => { res.sendFile(path.join(distPath, "index.html")); });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

startServer();
