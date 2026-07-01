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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "eduarena-secret-key-123";
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
  "Mathematics": "t2", // Calculus
  "Biology":     "t1", // Photosynthesis
  "Physics":     "t3", // Mechanics
  "Chemistry":   "t5", // Acids and Bases
  "English":     "t7", // Lexis and Structure
  "Government":  "t6", // Constitutional Development
};

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
        subject: subject, // Used for direct filtering in /api/questions
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
      id: "pq1",
      exam_type: "JAMB",
      year: 1998,
      subject_id: "s2",
      topic_id: "t1",
      question_content: "Which of the following is the primary site of photosynthesis in a leaf?",
      options: { A: "Stoma", B: "Mesophyll", C: "Epidermis", D: "Vascular bundle" },
      correct_option: "B",
      explanation: "Photosynthesis primarily takes place in the mesophyll layer of cells in the leaf, which contains numerous chloroplasts.",
      image_url: null,
      difficulty_level: 5,
      created_at: new Date().toISOString()
    },
    {
      id: "pq2",
      exam_type: "WAEC",
      year: 2015,
      subject_id: "s1",
      topic_id: "t2",
      question_content: "Find the derivative of $y = 3x^2 + 5x - 7$ with respect to $x$.",
      options: { A: "$6x + 5$", B: "$3x + 5$", C: "$6x - 7$", D: "$x^2 + 5$" },
      correct_option: "A",
      explanation: "Using the power rule: $\\frac{d}{dx}(ax^n) = anx^{n-1}$. So, $\\frac{dy}{dx} = 2(3)x^{2-1} + 1(5)x^{1-1} + 0 = 6x + 5$.",
      image_url: null,
      difficulty_level: 8,
      created_at: new Date().toISOString()
    },
    {
      id: "pq3",
      exam_body: "NECO",
      year: 1983,
      subject_id: "s3",
      topic_id: "t3",
      question_content: "A car traveling at 20 m/s accelerates at 2 m/s² for 5 seconds. Find the final velocity.",
      options: { A: "25 m/s", B: "30 m/s", C: "35 m/s", D: "40 m/s" },
      correct_option: "B",
      explanation: "Using $v = u + at$: $v = 20 + (2 \\times 5) = 20 + 10 = 30$ m/s.",
      image_url: null,
      difficulty_score: 6
    },
    {
      id: "pq4",
      exam_body: "JAMB",
      year: 2024,
      subject_id: "s2",
      topic_id: "t1",
      question_content: "The light-independent reactions of photosynthesis occur in the:",
      options: { A: "Thylakoid", B: "Stroma", C: "Grana", D: "Mitochondria" },
      correct_option: "B",
      explanation: "The light-independent reactions (Calvin cycle) take place in the stroma of the chloroplast.",
      image_url: null,
      difficulty_score: 5
    },
    {
      id: "pq5",
      exam_body: "WAEC",
      year: 2022,
      subject_id: "s6",
      topic_id: "t6",
      question_content: "The Richards Constitution of 1946 was noted for introducing:",
      options: { A: "A unitary system", B: "Regionalism", C: "Full independence", D: "A presidential system" },
      correct_option: "B",
      explanation: "The Richards Constitution of 1946 laid the foundation for regionalism in Nigeria by creating three regions: North, West, and East.",
      image_url: null,
      difficulty_score: 5
    },
    {
      id: "pq6",
      exam_body: "NECO",
      year: 2018,
      subject_id: "s4",
      topic_id: "t5",
      question_content: "Which of the following elements has the highest electronegativity?",
      options: { A: "Fluorine", B: "Chlorine", C: "Oxygen", D: "Nitrogen" },
      correct_option: "A",
      explanation: "Fluorine is the most electronegative element on the periodic table due to its small atomic size and high effective nuclear charge.",
      image_url: null,
      difficulty_score: 3
    },
    {
      id: "pq7",
      exam_body: "JAMB",
      year: 2025,
      subject_id: "s5",
      topic_id: "t7",
      question_content: "Choose the word most nearly opposite in meaning to the capitalized word: The witness gave a CONSISTENT account of the incident.",
      options: { A: "Coherent", B: "Contradictory", C: "Uniform", D: "Logical" },
      correct_option: "B",
      explanation: "The opposite of 'consistent' (agreeing, not conflicting) is 'contradictory' (mutually opposed).",
      image_url: null,
      difficulty_score: 2
    }
  ],
  content: [
    { id: "1", subject: "Mathematics", type: "video", title: "Algebra Basics", description: "Introduction to variables", url: "https://example.com/algebra", created_by: "admin" },
    { id: "2", subject: "Science", type: "text", title: "Photosynthesis", description: "How plants make food", content: "Photosynthesis is...", created_by: "admin" }
  ],
  questions: [], // Legacy field, kept for backward compatibility if needed by frontend
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
  feed: [
    { id: "f1", user_id: "demo-user", type: "achievement", content: "just won a 5-streak in Physics!", timestamp: new Date().toISOString() },
    { id: "f2", user_id: "system", type: "announcement", content: "Lagos Academy has overtaken Abuja High on the National Leaderboard!", timestamp: new Date().toISOString() }
  ],
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
    { exam: "JAMB", subject: "Biology", topic: "Photosynthesis", description: "Structure and functions of chloroplasts, light and dark reactions." },
    { exam: "WAEC", subject: "Mathematics", topic: "Calculus", description: "Differentiation from first principles, differentiation of polynomials." }
  ],
  predictions: [
    { exam: "JAMB", subject: "Biology", year: 2025, predicted_topics: ["Photosynthesis", "Genetics", "Ecology"], confidence: 0.85 },
    { exam: "WAEC", subject: "Mathematics", year: 2025, predicted_topics: ["Calculus", "Probability", "Geometry"], confidence: 0.92 }
  ],
  syllabus_mapping: [
    { exam: "JAMB", subject: "Biology", topic: "Cell Biology", syllabus_id: "BIO-1.1" },
    { exam: "JAMB", subject: "Biology", topic: "Photosynthesis", syllabus_id: "BIO-2.1" }
  ],
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
      id: "sol1",
      exercise_id: "ex1",
      question_number: "Q1",
      question_text: "Convert $1011_2$ to base 10.",
      steps: [
        "Write out the place values for base 2: $2^3, 2^2, 2^1, 2^0$",
        "Multiply each digit by its place value: $1 \\times 2^3 + 0 \\times 2^2 + 1 \\times 2^1 + 1 \\times 2^0$",
        "Calculate the values: $8 + 0 + 2 + 1$",
        "Sum the values: $11_{10}$"
      ],
      pro_tip: "Always start assigning powers from right to left, starting with 0.",
      topic: "Number Bases"
    },
    {
      id: "sol2",
      exercise_id: "ex1",
      question_number: "Q5",
      question_text: "Solve the quadratic equation: $x^2 - 5x + 6 = 0$",
      steps: [
        "Find two numbers that multiply to 6 and add to -5. These are -2 and -3.",
        "Rewrite the equation: $(x - 2)(x - 3) = 0$",
        "Set each factor to zero: $x - 2 = 0$ or $x - 3 = 0$",
        "Solve for x: $x = 2$ or $x = 3$"
      ],
      pro_tip: "Check your answer by plugging the values back into the original equation.",
      topic: "Quadratic Equations"
    }
  ]
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
      console.error("Failed to parse db.json, resetting to initialDb", e);
      _dbCache = JSON.parse(JSON.stringify(initialDb));
      fs.writeFileSync(DB_FILE, JSON.stringify(_dbCache, null, 2));
    }
    // Migration: Ensure all fields from initialDb exist
    let modified = false;
    Object.keys(initialDb).forEach(key => {
      if (_dbCache[key] === undefined) {
        _dbCache[key] = JSON.parse(JSON.stringify((initialDb as any)[key]));
        modified = true;
      }
    });
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(_dbCache, null, 2));
    }
  }
  return _dbCache;
}

function saveDb(db: any) {
  _dbCache = db;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Routes ---
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password, school_id, role } = req.body;
    
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const db = getDb();
    if (db.users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      school_id,
      role: role || "student",
      level: 1,
      points: 0,
      badges: [],
      wins: 0,
      losses: 0,
      rank: "Bronze Scholar"
    };

    db.users.push(newUser);
    saveDb(db);

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    });
    res.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, points: 0, level: 1 } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, points: user.points, level: user.level } });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, points: user.points, level: user.level } });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  // --- Auth Middlewares ---
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
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      next();
    });
  }

  // --- AI Context Search ---
  app.get("/api/ai/query", (req, res) => {
    const { q } = req.query;
    const db = getDb();
    const queryStr = String(q).toLowerCase();
    
    // Find relevant questions or answers
    const matches = db.pastQuestions.filter((pq: any) => 
        pq.question_text.toLowerCase().includes(queryStr) ||
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

  // --- Knowledge Hub Routes ---
  // --- ALOC Past Questions API Proxy ---
  app.get(["/api/aloc/q", "/api/aloc/q/:count"], async (req, res) => {
    const count = req.params.count || "1";
    const { subject, type, year } = req.query;
    const headerToken = req.headers.accesstoken || req.headers["accesstoken"];
    const ACCESS_TOKEN = typeof headerToken === 'string' && headerToken.trim() !== '' 
      ? headerToken.trim() 
      : 'ALOC-84eb83db941bfc4c524c';
    
    // Normalize exam system types expected by ALOC API
    let examType = String(type || 'utme').toLowerCase().trim();
    if (examType === 'jamb') examType = 'utme';
    if (examType === 'waec') examType = 'wassce';

    let url = `https://questions.aloc.com.ng/api/v2/q/${count}?subject=${subject || 'english'}&type=${examType}`;
    if (year && year !== 'all' && year !== '') {
      url += `&year=${year}`;
    }
    url += `&cb=${Date.now()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "AccessToken": ACCESS_TOKEN,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Check if response actually has valid data
        if (data && data.data) {
          return res.json(data);
        }
      }
      
      console.warn(`ALOC Satellite returned status ${response.status} or invalid data. Initiating AI Neural Fallback bridge...`);
    } catch (error: any) {
      console.error("ALOC Server Proxy primary hit exceptions. Transitioning to AI Neural Fallback...", error);
    }

    // --- NEURAL FALLBACK BRIDGE ---
    const chosenSubject = String(subject || 'english').toLowerCase();
    const chosenType = String(type || 'utme').toLowerCase();
    const chosenYear = String(year || '2018');

    // Attempt 1: Gemini Generation
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && typeof geminiApiKey === 'string' && geminiApiKey.trim().length > 0) {
      try {
        console.log(`Engaging Gemini model to generate a custom practice question for ${chosenSubject}...`);
        const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
        const yearPromptStr = chosenYear && chosenYear !== 'all' ? chosenYear : 'random year between 2005 and 2023';
        const prompt = `You are a high-fidelity Nigerian examination past question vault. Generate exactly ONE highly realistic, syllabus-aligned past exam question for the subject: "${chosenSubject}" under the exam system: "${chosenType}" of the year: "${yearPromptStr}".

The question must follow JAMB (UTME) or WAEC/NECO design depending on the system requested. 
The output MUST be strictly valid raw JSON without markdown wrapping (do not use \`\`\`json or \`\`\` blocks).

Return JSON of this exact shape:
{
  "id": ${Math.floor(Math.random() * 8000) + 3500},
  "question": "<The question content written as clear HTML/text. Avoid overly complex prose.>",
  "option": {
    "a": "<Option A>",
    "b": "<Option B>",
    "c": "<Option C>",
    "d": "<Option D>"
  },
  "answer": "a/b/c/d",
  "solution": "<Syllabus-aligned explanation of why the correct option is indeed correct. Keep it direct and helpful.>"
}`;

        const genResponse = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt
        });

        const text = genResponse.text || "";
        const cleanText = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
        const parsedQuestion = JSON.parse(cleanText);
        
        parsedQuestion.examType = parsedQuestion.examType || chosenType.toUpperCase();
        parsedQuestion.examyear = parsedQuestion.examyear || chosenYear;
        
        console.log(`Successfully generated dynamic backup question for ${chosenSubject} (ID: ${parsedQuestion.id})`);
        return res.json({
          status: 200,
          message: "success (Satellite backup quantum links active)",
          data: parsedQuestion
        });
      } catch (gem_err) {
        console.error("Gemini dynamic backup generation failed! Falling back to static cache.", gem_err);
      }
    }

    // Attempt 2: Local Static Fallback Database
    const STATIC_FALLBACKS: Record<string, any> = {
      english: {
        id: 1101,
        question: "Choose the option that is nearest in meaning to the capitalized word: The student's explanation was very COGENT.",
        option: { a: "confusing", b: "convincing", c: "lengthy", d: "irrelevant" },
        answer: "b",
        solution: "The word COGENT means clear, logical, and convincing. Therefore, option B is correct.",
        examType: "UTME",
        examyear: "2018"
      },
      mathematics: {
        id: 1102,
        question: "If log 2 = 0.3010 and log 3 = 0.4771, calculate the value of log 1.2 without using tables.",
        option: { a: "0.0791", b: "1.0791", c: "0.1791", d: "0.2791" },
        answer: "a",
        solution: "log 1.2 = log(12/10) = log 12 - log 10 = log(2^2 * 3) - 1 = 2 log 2 + log 3 - 1 = 2(0.3010) + 0.4771 - 1 = 0.6020 + 0.4771 - 1 = 1.0791 - 1 = 0.0791.",
        examType: "UTME",
        examyear: "2015"
      },
      physics: {
        id: 1103,
        question: "A body of mass 5kg is suspended by a string. Calculate the tension in the string when the body is pulled upward with an acceleration of 2 m/s<sup>2</sup>. (g = 10 m/s<sup>2</sup>).",
        option: { a: "40 N", b: "50 N", c: "60 N", d: "70 N" },
        answer: "c",
        solution: "Tension T is calculated as: T - mg = ma => T = m(g + a). Plugging in: T = 5 * (10 + 2) = 5 * 12 = 60 N.",
        examType: "UTME",
        examyear: "2019"
      },
      chemistry: {
        id: 1104,
        question: "What volume of oxygen at s.t.p is required to completely burn 45g of ethane? (C = 12, H = 1, Molar Volume of gas = 22.4 dm<sup>3</sup> at s.t.p).",
        option: { a: "117.6 dm<sup>3</sup>", b: "84.0 dm<sup>3</sup>", c: "50.4 dm<sup>3</sup>", d: "33.6 dm<sup>3</sup>" },
        answer: "a",
        solution: "Equation: 2C2H6 + 7O2 -> 4CO2 + 6H2O. Moles of ethane (MW=30) = 45 / 30 = 1.5 moles. Since 2 moles of C2H6 require 7 moles of O2, 1.5 moles of C2H6 will require (7/2) * 1.5 = 5.25 moles of O2. Volume = 5.25 * 22.4 dm^3 = 117.6 dm^3.",
        examType: "UTME",
        examyear: "2016"
      },
      biology: {
        id: 1105,
        question: "Which of the following processes removes carbon dioxide from the atmosphere?",
        option: { a: "Respiration", b: "Photosynthesis", c: "Decarboxylation", d: "Transpiration" },
        answer: "b",
        solution: "Photosynthesis takes CO2 out of the air to build carbon-containing sugars. Option B is correct.",
        examType: "UTME",
        examyear: "2020"
      },
      economics: {
        id: 1106,
        question: "If the price of a commodity increases from N40 to N50 and quantity demanded decreases from 100 to 80 units, find the price elasticity of demand.",
        option: { a: "0.8", b: "1.0", c: "1.2", d: "1.5" },
        answer: "a",
        solution: "% change in Q = -20%. % change in P = 25%. Price Elasticity of Demand (PED) = 20% / 25% = 0.8. Since PED is less than 1, demand is inelastic.",
        examType: "UTME",
        examyear: "2017"
      },
      government: {
        id: 1107,
        question: "Who among the following is widely regarded as the father of Nigerian Nationalism?",
        option: { a: "Herbert Macaulay", b: "Nnamdi Azikiwe", c: "Obafemi Awolowo", d: "Ahmadu Bello" },
        answer: "a",
        solution: "Herbert Macaulay initiated political parties (NNDP in 1923) and fought for Nigerian self-governance and representation.",
        examType: "UTME",
        examyear: "2014"
      },
      civiledu: {
        id: 1108,
        question: "Which of the following describes a key sustainable strategy to prevent human trafficking in communities?",
        option: { a: "Empowerment, public awareness and access to education", b: "Encouraging undocumented migrations", c: "Restricting the movement of young people", d: "Escalating labor prices and unemployment" },
        answer: "a",
        solution: "Education and societal awareness empower citizens to recognize trafficking traps and raise reporting channels.",
        examType: "UTME",
        examyear: "2021"
      },
      commerce: {
        id: 1109,
        question: "A document containing a brief description of goods shipped by a seller to a buyer, with detailed prices, is called a/an:",
        option: { a: "Invoice", b: "Consignment note", c: "Credit note", d: "Bill of lading" },
        answer: "a",
        solution: "An invoice is a commercial document issued by a seller detailing the quantities and agreed pricing of goods.",
        examType: "UTME",
        examyear: "2013"
      },
      accounting: {
        id: 1110,
        question: "Identify the fundamental double-entry balance accounting equation.",
        option: { a: "Assets = Liabilities - Owner's Equity", b: "Assets = Liabilities + Owner's Equity", c: "Owner's Equity = Assets + Liabilities", d: "Liabilities = Assets + Owner's Equity" },
        answer: "b",
        solution: "Under basic ledger rules, total Assets must equal the sum of Liabilities and Equity. Option B is correct.",
        examType: "UTME",
        examyear: "2015"
      },
      currentaffairs: {
        id: 1111,
        question: "Which of the following administrative centers in Nigeria is known as the 'Coal City'?",
        option: { a: "Jos", b: "Enugu", c: "Port Harcourt", d: "Kaduna" },
        answer: "b",
        solution: "Enugu became captioned as Coal City after kitson discovered coal deposits there in 1909.",
        examType: "UTME",
        examyear: "2022"
      }
    };

    const backupQuestion = STATIC_FALLBACKS[chosenSubject] || STATIC_FALLBACKS['english'];
    console.log(`Serving local static backup past-question for ${chosenSubject}.`);
    
    return res.json({
      status: 200,
      message: "success (Engaged Local Offline Vault Fallover Link)",
      data: {
        ...backupQuestion,
        examType: chosenType.toUpperCase(),
        examyear: chosenYear
      }
    });
  });

  app.get("/api/questions", (req, res) => {
    const { search, subject, exam_type } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions;

    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((q: any) => 
        (q.question_content || q.question_text || "").toLowerCase().includes(s)
      );
    }
    if (subject) {
      const sLower = String(subject).toLowerCase().trim();
      const subjectMap: Record<string, string> = {
        's1': 'mathematics',
        's2': 'biology',
        's3': 'physics',
        's4': 'chemistry',
        's5': 'english',
        's6': 'government'
      };
      filtered = filtered.filter((q: any) => {
        const qSubName = q.subject ? String(q.subject).toLowerCase().trim() : '';
        const mappedName = q.subject_id ? (subjectMap[q.subject_id] || '') : '';
        return qSubName === sLower || mappedName === sLower;
      });
    }
    if (exam_type) {
      const eLower = String(exam_type).toLowerCase().trim();
      filtered = filtered.filter((q: any) => {
        const qExam = q.exam_type || q.exam_body || "";
        return qExam.toLowerCase().trim() === eLower;
      });
    }

    res.json(filtered);
  });

  app.get("/api/courses", (req, res) => {
    const db = getDb();
    res.json(db.courses);
  });

  app.get("/api/courses/:id/lessons", (req, res) => {
    const db = getDb();
    const lessons = db.lessons.filter((l: any) => l.course_id === req.params.id);
    res.json(lessons);
  });

  app.get("/api/lessons/:id", (req, res) => {
    const db = getDb();
    const lesson = db.lessons.find((l: any) => l.id === req.params.id);
    res.json(lesson);
  });

  app.post("/api/practice/submit", (req, res) => {
    const { lesson_id, score, coins_earned } = req.body;
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      
      const result = {
        user_id: decoded.userId,
        lesson_id,
        score,
        coins_earned,
        timestamp: new Date().toISOString()
      };

      db.practiceResults.push(result);
      
      // Update user points/coins and check for achievements
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (user) {
        user.points += coins_earned;
        
        // Basic Achievement: Quiz Master (if score 100)
        if (score === 100 && !user.badges.includes("a1")) {
            user.badges.push("a1");
            db.feed.push({
                id: Math.random().toString(36).substr(2, 9),
                user_id: user.id,
                type: "achievement",
                content: `just earned the 'Quiz Master' badge!`,
                timestamp: new Date().toISOString()
            });
        }
      }

      saveDb(db);
      res.json({ success: true, result });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/social/share-image", (req, res) => {
    const { userId, score, rank } = req.body;
    // Generate dynamically relevant metadata for the OG image
    const imageUrl = `/images/og-score-${userId}.png?score=${score}&rank=${rank}`;
    res.json({ 
        url: imageUrl, 
        message: `Check out my score of ${score} on EduArena!`,
        challengeLink: `/arena/challenge/${userId}` 
    });
  });

  app.get("/api/user/progress", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const progress = db.userProgress.filter((p: any) => p.user_id === decoded.userId);
      res.json(progress);
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // --- Data Routes ---
  app.get("/api/content", (req, res) => {
    const db = getDb();
    res.json(db.content);
  });

  app.get("/api/schools", (req, res) => {
    const db = getDb();
    res.json(db.schools);
  });

  app.get("/api/leaderboard", (req, res) => {
    const db = getDb();
    const sortedUsers = [...db.users].sort((a, b) => b.points - a.points).slice(0, 10);
    res.json(sortedUsers);
  });

  // --- Social & Economy Routes ---
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
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: decoded.userId,
        type: type || "achievement",
        content,
        timestamp: new Date().toISOString()
      };
      db.feed.push(newItem);
      saveDb(db);
      res.json(newItem);
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.get("/api/economy/jackpot", (req, res) => {
    const db = getDb();
    res.json(db.jackpot);
  });

  app.post("/api/economy/jackpot/enter", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      
      // Check if user has completed 3 lessons today
      const today = new Date().toISOString().split('T')[0];
      const lessonsToday = db.practiceResults.filter((r: any) => 
        r.user_id === decoded.userId && r.timestamp.startsWith(today)
      ).length;

      if (lessonsToday < 3) {
        return res.status(400).json({ error: "Complete 3 lessons to unlock the jackpot!" });
      }

      if (!db.jackpot.participants.includes(decoded.userId)) {
        db.jackpot.participants.push(decoded.userId);
        saveDb(db);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.get("/api/user/inventory", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDb();
      const items = db.inventory.filter((i: any) => i.user_id === decoded.userId);
      res.json(items);
    } catch (e) {
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

      if (!user || user.points < price) {
        return res.status(400).json({ error: "Insufficient Edu-Coins" });
      }

      user.points -= price;
      db.inventory.push({
        id: Math.random().toString(36).substr(2, 9),
        user_id: decoded.userId,
        item_id,
        timestamp: new Date().toISOString()
      });

      saveDb(db);
      res.json({ success: true, points: user.points });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // --- Textbook Solutions Engine Routes ---
  app.get("/api/textbooks/search", (req, res) => {
    const { q } = req.query;
    const db = getDb();
    if (!q) return res.json([]);

    const query = String(q).toLowerCase();
    
    // Search across textbooks, topics, and exercises
    const results: any[] = [];
    
    // 1. Search solutions directly (e.g. "Ex 2a Q5" or "Quadratic Equations")
    db.solutions.forEach((sol: any) => {
      const exercise = db.exercises.find((e: any) => e.id === sol.exercise_id);
      const chapter = db.chapters.find((c: any) => c.id === exercise?.chapter_id);
      const textbook = db.textbooks.find((t: any) => t.id === chapter?.textbook_id);
      
      const searchString = `${textbook?.title} ${chapter?.title} ${exercise?.title} ${sol.question_number} ${sol.topic}`.toLowerCase();
      
      if (searchString.includes(query)) {
        results.push({
          type: 'solution',
          id: sol.id,
          title: `${textbook?.title} - ${exercise?.title} ${sol.question_number}`,
          topic: sol.topic,
          textbook: textbook?.title
        });
      }
    });

    // 2. Search textbooks
    db.textbooks.forEach((tb: any) => {
      if (tb.title.toLowerCase().includes(query) || tb.subject.toLowerCase().includes(query)) {
        results.push({
          type: 'textbook',
          id: tb.id,
          title: tb.title,
          subject: tb.subject,
          author: tb.author
        });
      }
    });

    res.json(results.slice(0, 10)); // Limit results
  });

  app.get("/api/textbooks", (req, res) => {
    const db = getDb();
    res.json(db.textbooks);
  });

  app.get("/api/textbooks/:id/chapters", (req, res) => {
    const db = getDb();
    const chapters = db.chapters.filter((c: any) => c.textbook_id === req.params.id);
    const chaptersWithExercises = chapters.map((c: any) => ({
      ...c,
      exercises: db.exercises.filter((e: any) => e.chapter_id === c.id)
    }));
    res.json(chaptersWithExercises);
  });

  app.get("/api/exercises/:id/solutions", (req, res) => {
    const db = getDb();
    const solutions = db.solutions.filter((s: any) => s.exercise_id === req.params.id);
    res.json(solutions);
  });

  app.get("/api/solutions/:id", (req, res) => {
    const db = getDb();
    const solution = db.solutions.find((s: any) => s.id === req.params.id);
    if (!solution) return res.status(404).json({ error: "Solution not found" });
    
    const exercise = db.exercises.find((e: any) => e.id === solution.exercise_id);
    const chapter = db.chapters.find((c: any) => c.id === exercise?.chapter_id);
    const textbook = db.textbooks.find((t: any) => t.id === chapter?.textbook_id);
    
    res.json({
      ...solution,
      exercise_title: exercise?.title,
      chapter_title: chapter?.title,
      textbook_title: textbook?.title
    });
  });

  app.post("/api/solutions/request", (req, res) => {
    // Mock endpoint for requesting a solution
    res.json({ success: true, message: "Solution requested successfully. Our experts will notify you soon!" });
  });

  // Admin Factory Endpoints
  app.get("/api/admin/subjects", requireAdmin, (req, res) => {
    const db = getDb();
    res.json(db.subjects);
  });

  app.post("/api/admin/subjects", requireAdmin, (req, res) => {
    const { name, category } = req.body;
    const db = getDb();
    if (db.subjects.find((s: any) => s.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "Subject already exists" });
    }
    const newSubject = { id: `s${Date.now()}`, name, category, created_at: new Date().toISOString() };
    db.subjects.push(newSubject);
    saveDb(db);
    res.json(newSubject);
  });

  app.post("/api/admin/topics", requireAdmin, (req, res) => {
    const { subject_id, name, syllabus_description } = req.body;
    const db = getDb();
    if (db.topics.find((t: any) => t.subject_id === subject_id && t.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "Topic already exists for this subject" });
    }
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
    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((q: any) => q.question_text.toLowerCase().includes(s));
    }

    const p = Number(page);
    const l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      total: filtered.length,
      questions: paginated
    });
  });

  app.post("/api/admin/questions", requireAdmin, (req, res) => {
    const questionData = req.body;
    const db = getDb();

    // Duplicate Check: Same text for same exam + year
    const isDuplicate = db.pastQuestions.some((q: any) => 
      q.exam_type === questionData.exam_type && 
      q.year === Number(questionData.year) && 
      q.question_text.trim().toLowerCase() === questionData.question_text.trim().toLowerCase()
    );

    if (isDuplicate) {
      return res.status(400).json({ error: "A question with this exact text already exists for this exam and year." });
    }

    const newQuestion = {
      id: `pq-${crypto.randomUUID()}`,
      ...questionData,
      year: Number(questionData.year),
      difficulty_level: Number(questionData.difficulty_level || 5),
      created_at: new Date().toISOString()
    };

    db.pastQuestions.push(newQuestion);
    saveDb(db);
    res.json({ success: true, question: newQuestion });
  });

  app.put("/api/admin/questions/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const db = getDb();
    const index = db.pastQuestions.findIndex((q: any) => q.id === id);
    if (index === -1) return res.status(404).json({ error: "Question not found" });

    db.pastQuestions[index] = { ...db.pastQuestions[index], ...updatedData, year: Number(updatedData.year) };
    saveDb(db);
    res.json({ success: true, question: db.pastQuestions[index] });
  });

  app.delete("/api/admin/questions/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = getDb();
    db.pastQuestions = db.pastQuestions.filter((q: any) => q.id !== id);
    saveDb(db);
    res.json({ success: true });
  });

  function getServerLocalContextMatches(userQuery: string): { context: string; source?: string } {
    try {
      const db = getDb();
      const queryStr = userQuery.toLowerCase();
      
      const queryWords = queryStr
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'and', 'for', 'you', 'what', 'how', 'are', 'can', 'with', 'this', 'who', 'its', 'from', 'then', 'them'].includes(word));

      if (queryWords.length === 0) return { context: "" };

      const scoredMatches: { content: string; source: string; score: number }[] = [];

      // Search db.pastQuestions
      if (db.pastQuestions && Array.isArray(db.pastQuestions)) {
        for (const q of db.pastQuestions) {
          let score = 0;
          const questionText = `${q.subject || ''} ${q.question_content || q.question_text || ''} ${q.explanation || ''}`.toLowerCase();
          for (const word of queryWords) {
            if (questionText.includes(word)) {
              score += 2;
            }
          }
          if (score > 0) {
            const optionsStr = q.options ? Object.entries(q.options)
              .filter(([_, v]) => v && String(v).trim())
              .map(([k, v]) => `   ${k.toUpperCase()}. ${v}`)
              .join('\n') : '';
            let content = `Past Questions Reference:\nQ: ${q.question_text || q.question_content}\n${optionsStr}\nCorrect Option: ${String(q.correct_option || 'A').toUpperCase()}`;
            if (q.explanation) {
              content += `\nExplanation: ${q.explanation}`;
            }
            scoredMatches.push({
              content,
              source: `${q.exam_type || 'UTME'} ${q.year || '2024'} - Question No. ${q.id}`,
              score
            });
          }
        }
      }

      // Search db.syllabus
      if (db.syllabus && Array.isArray(db.syllabus)) {
        for (const syllabusItem of db.syllabus) {
          let score = 0;
          const sText = `${syllabusItem.subject} ${syllabusItem.topic} ${syllabusItem.description}`.toLowerCase();
          for (const word of queryWords) {
            if (sText.includes(word)) {
              score += 1.5;
            }
          }
          if (score > 0) {
            scoredMatches.push({
              content: `Syllabus Topic: ${syllabusItem.topic}\nDescription: ${syllabusItem.description}`,
              source: `${syllabusItem.exam || 'WAEC'} Official Syllabus - ${syllabusItem.subject}`,
              score
            });
          }
        }
      }

      scoredMatches.sort((a, b) => b.score - a.score);
      const bestMatch = scoredMatches[0];

      if (bestMatch) {
         return {
           context: `[Source: ${bestMatch.source}] ${bestMatch.content}`,
           source: bestMatch.source
         };
      }
    } catch (e) {
      console.error("Local match scorer failed:", e);
    }
    return { context: "The available syllabus subjects are: Mathematics, Biology, Physics, Chemistry, English, and Government. Please ask for questions or syllabus topics related to these." };
  }

  app.post("/api/ai/tutor", async (req, res) => {
    const { message, history, systemInstruction: clientSystemInstruction } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey === 'undefined') {
      return res.json({
        response: "Omo! I am currently running without a live Gemini key. But don't worry, keep practicing under mock conditions! Please configure GEMINI_API_KEY in Settings to activate real-time intelligence panels.",
        provider: "offline-fallback"
      });
    }

    try {
      // Perform local context matches on the server (RAG)
      const { context: retrievedKnowledge, source: sourceName } = getServerLocalContextMatches(message);
      console.log("DEBUG: Retreived context:", retrievedKnowledge, "Source:", sourceName);

      // Create a default system instruction if none provided
      const defaultSystemInstruction = `You are Tutor Chuks, a brilliant and direct Nigerian AI CBT Tutor. 
Focus strictly on exam success. Use relatable Nigerian analogies but stay professional.
Retrieved Knowledge Context: ${retrievedKnowledge || "No specific database entry found. Use your general training."}
Rules:
- Be concise (Under 100 words).
- If specific past questions are in the 'Retrieved Knowledge', refer to them.
- If the student asks something outside of academics, politely guide them back to their studies.`;

      const systemInstruction = clientSystemInstruction || defaultSystemInstruction;

      // Construct history contents for Gemini API (Last 5 messages to avoid overflow)
      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        const recentHistory = history.slice(-5);
        for (const msg of recentHistory) {
          const role = (msg.sender === 'student' || msg.role === 'user') ? 'user' : 'model';
          const text = msg.text || msg.content || "";
          if (text) {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }
      
      // Append the latest user query
      contents.push({ role: 'user', parts: [{ text: message }] });

      const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
        config: {
          systemInstruction
        }
      });
      
      console.log("DEBUG: Keys in response:", Object.keys(response));
      console.log("DEBUG: Response text:", response.text);

      res.json({
        response: response.text || "No response received from model. Send another query!",
        source: sourceName,
        provider: "gemini"
      });
    } catch (err: any) {
      console.error("Gemini tutoring service error:", err);
      // Fail gracefully and return a polite offline message to avoid crashing frontend layout
      res.json({
        response: "Omo, I experienced a slight glitch with my engine! Ask that question again, or keep practicing with syllabus tests.",
        provider: "error-fallback"
      });
    }
  });

  app.post("/api/ai/notifications/generate", async (req, res) => {
    const { performanceSummary } = req.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return res.status(500).json({ error: "AI service unavailable" });

    const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    
    try {
      const prompt = `You are a helpful and competitive CBT AI Academic Coach for WAEC, JAMB, and NECO students. 
      Analyze the user's performance & data profile:
      ${JSON.stringify(performanceSummary || {})}
      
      Generate exactly 4 highly engaging, action-driven, context-specific alerts.
      Ensure there is:
      1. One AI Learning analysis alert (type: "ai") focusing on their weakest subject or topic.
      2. One Exam Mock alert (type: "exam") indicating a simulation or past-paper challenge.
      3. One Study Planner tracker (type: "study") urging them to follow their custom timetable.
      4. One Gamification/Leaderboard competitive notification (type: "gamification" or "leaderboard") referencing streaks, leagues, or overtaking a rival.

      Return the list of notifications matching the required schema. Ensure the action_links map properly to UI routes (e.g. "/tutor", "/practice", "/planner", "/leaderboard", "/arena", "/performance").`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
                type: { type: Type.STRING }, // 'ai', 'exam', 'study', 'gamification', 'leaderboard', 'system'
                priority: { type: Type.STRING }, // 'high', 'medium', 'low'
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
      console.error("AI Notifications generation failed", err);
      res.status(500).json({ error: "Failed to generate AI notifications" });
    }
  });

  // --- Exam Oracle & AI Mastery Routes ---
  app.get("/api/oracle/questions/by-year", (req, res) => {
    const { exam, year, subject_id, page = "1", limit = "20" } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions;

    if (exam) filtered = filtered.filter((q: any) => (q.exam_type || q.exam_body) === exam);
    if (year) filtered = filtered.filter((q: any) => q.year === Number(year));
    if (subject_id) filtered = filtered.filter((q: any) => q.subject_id === subject_id);

    const p = Number(page);
    const l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      total: filtered.length,
      page: p,
      limit: l,
      questions: paginated
    });
  });

  app.post("/api/practice/session/save-result", async (req, res) => {
    const { sessionId, subject, finalScore, totalQuestions, xpEarned, mistakes } = req.body;
    const db = getDb();
    
    // In a real app, this would perform an 'upsert' or 'insert' in Supabase
    const resultEntry = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId,
      subject,
      finalScore,
      totalQuestions,
      xpEarned,
      mistakes,
      timestamp: new Date().toISOString()
    };
    
    db.practiceResults.push(resultEntry);
    saveDb(db);
    
    res.json({ success: true, resultId: resultEntry.id });
  });

  app.get("/api/practice/session/results", (req, res) => {
    const db = getDb();
    res.json({ results: db.practiceResults || [] });
  });

  // --- Practice Page Routes ---
  app.post("/api/practice/session/start", async (req, res) => {
    // In a real app, this would save session to Supabase
    res.json({ sessionId: `sess-${Date.now()}` });
  });

  app.post("/api/practice/ai-tutor", async (req, res) => {
    try {
      const { question_text, correct_answer, type, options } = req.body;
      
      // 1. Create a hash of the question (simple approach) using top-level crypto
      const questionHash = crypto.createHash('sha256').update(question_text || "").digest('hex');

      // 2. Check local DB/Cache (Mocking Supabase check)                
      const db = getDb();
      const cachedResponse = db.ai_cache?.find((c: any) => c.question_hash === questionHash && c.response_type === type);                

      if (cachedResponse) {
        return res.json({ response: cachedResponse.response_text, cached: true });
      }

      // 3. Call AI
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) return res.status(500).json({ error: "AI service unavailable" });

      const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      let prompt = "";
      if (type === 'hint') {
        prompt = `Provide a subtle 1-sentence clue for this question: "${question_text}" without giving the answer.`;
      } else {
        prompt = `Provide a 3-step explanation for this question: "${question_text}". Explicitly explain why the other options (Options: ${JSON.stringify(options || [])}) are wrong. Correct answer: ${correct_answer}.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      
      const aiText = response.text || "";

      // 4. Save to DB/Cache (TODO: Sync to Supabase)
      const newCache = { question_hash: questionHash, response_type: type, response_text: aiText };
      db.ai_cache = db.ai_cache || [];
      db.ai_cache.push(newCache);
      saveDb(db);

      res.json({ response: aiText, cached: false });
    } catch (err: any) {
      console.error("Practice AI Tutor failed:", err);
      res.status(500).json({ error: "Failed to generate tutor assistance" });
    }
  });

  app.post("/api/practice/ai/explain", async (req, res) => {
    try {
      const { question, options, userAnswer, type } = req.body;
      const db = getDb();
      
      const questionHash = crypto.createHash('sha256').update(question || "").digest('hex');
      const cacheKey = `${questionHash}_explain_${userAnswer || 'status'}`;
      
      const cached = db.ai_cache?.find((c: any) => c.question_hash === cacheKey);
      if (cached) {
        return res.json({ explanation: cached.response_text, cached: true });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey || typeof geminiApiKey !== 'string' || geminiApiKey.trim().length === 0) {
        const staticExplanation = `As your AI Copilot, here is the syllabus logic: This is a past exam-standard problem testing the core fundamentals of the topic. The option selected corresponds to a ${userAnswer || 'typical'} response. In school-level/UTME examinations, always verify step-by-step logic, eliminate dimensionally incorrect or unrelated options first, and review the core definitions in the recommended textbooks.`;
        return res.json({ explanation: staticExplanation, cached: false });
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const prompt = `You are an expert academic tutor for examinations in West Africa (JAMB UTME, WAEC, NECO).
The user just answered a past-exam question. The user's status for this answer is: "${userAnswer}".
Question: "${question}"
Options: ${JSON.stringify(options)}
 
Provide a concise, extremely high-fidelity syllabus-aligned explanation (2-3 sentences max) analyzing why the correct option is chemically/biologically/mathematically correct and why the alternatives are incorrect. Focus on standard curriculum topics. Use clear, encouraging, and highly academic display language.`;

      let textContent = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
        });
        textContent = response.text || "";
      } catch (gem_err: any) {
        console.error("Gemini explanation generation failed, falling back to static prompt explanation:", gem_err);
        textContent = `Analyzing syllabus logic: The option corresponds to a ${userAnswer || 'typical'} path. According to standard JAMB/WAEC guidelines, focus on reducing calculation errors, eliminating distractor options, and reviewing core concepts.`;
      }

      const newCache = { question_hash: cacheKey, response_type: 'analysis', response_text: textContent };
      db.ai_cache = db.ai_cache || [];
      db.ai_cache.push(newCache);
      saveDb(db);

      res.json({ explanation: textContent, cached: false });
    } catch (err) {
      console.error("Critical explain route exception:", err);
      res.status(500).json({ error: "Explanation pipeline failed" });
    }
  });

  app.get("/api/oracle/questions/by-topic", (req, res) => {
    const { topic_id, page = "1", limit = "20" } = req.query;
    const db = getDb();
    let filtered = db.pastQuestions.filter((q: any) => q.topic_id === topic_id);

    const p = Number(page);
    const l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      total: filtered.length,
      page: p,
      limit: l,
      questions: paginated
    });
  });

  app.get("/api/arena/battle-set", (req, res) => {
    const { subject_id, count = "10" } = req.query;
    const db = getDb();
    let pool = db.pastQuestions;
    if (subject_id) pool = pool.filter((q: any) => q.subject_id === subject_id);

    // Shuffle and pick
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const set = shuffled.slice(0, Number(count));

    res.json(set);
  });

  app.get("/api/oracle/training-snapshot", (req, res) => {
    const { topic_id } = req.query;
    const db = getDb();
    const topic = db.topics.find((t: any) => t.id === topic_id);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const subject = db.subjects.find((s: any) => s.id === topic.subject_id);
    const questions = db.pastQuestions.filter((q: any) => q.topic_id === topic_id);

    res.json({
      topic_id,
      topic_name: topic.name,
      subject_name: subject?.name,
      syllabus: topic.syllabus_description,
      question_count: questions.length,
      questions: questions.map((q: any) => ({
        id: q.id,
        year: q.year,
        exam: q.exam_type || q.exam_body,
        content: q.question_text || q.question_content,
        difficulty: q.difficulty_level || q.difficulty_score
      }))
    });
  });

  // Admin Embeddings Generation Route
  app.post("/api/admin/embeddings", requireAdmin, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text to embed is required" });
      }
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }
      const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const embeddingResult = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
      });
      const embedding = embeddingResult?.embeddings?.[0]?.values ?? (embeddingResult as any)?.embedding?.values;
      if (!embedding) {
        return res.status(500).json({ error: "Empty or invalid embedding returned from Gemini" });
      }
      res.json({ embedding });
    } catch (err: any) {
      console.error("Embedding generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate embedding" });
    }
  });

  // Admin Import Pipeline
  app.post("/api/admin/import", requireAdmin, (req, res) => {
    const { type, data } = req.body; // type: 'json' | 'csv-sim'
    const db = getDb();
    
    if (type === 'questions') {
      const newQuestions = data.map((item: any) => ({
        id: `pq-${crypto.randomUUID()}`,
        ...item,
        created_at: new Date().toISOString()
      }));

      // Basic validation: check for duplicates by exam+year+content hash (simulated)
      const existingHashes = new Set(db.pastQuestions.map((q: any) => `${q.exam_type || q.exam_body}-${q.year}-${(q.question_text || q.question_content).substring(0, 50)}`));
      const filtered = newQuestions.filter((q: any) => !existingHashes.has(`${q.exam_type || q.exam_body}-${q.year}-${(q.question_text || q.question_content).substring(0, 50)}`));

      db.pastQuestions.push(...filtered);
      saveDb(db);
      return res.json({ success: true, added: filtered.length, skipped: newQuestions.length - filtered.length });
    }

    res.status(400).json({ error: "Invalid import type" });
  });

  // AI-OCR Hook Simulator
  app.post("/api/admin/ocr-ingest", requireAdmin, (req, res) => {
    const { structured_payload } = req.body;
    // structured_payload would be from Vision AI conversion
    const db = getDb();
    
    // Simulate difficulty calculation if missing
    if (!structured_payload.difficulty_level && !structured_payload.difficulty_score) {
      structured_payload.difficulty_level = Math.floor(Math.random() * 10) + 1;
    }

    const newId = `pq-ocr-${crypto.randomUUID()}`;
    db.pastQuestions.push({
      id: newId,
      ...structured_payload,
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, id: newId });
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

    const p = Number(page);
    const l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      total: filtered.length,
      page: p,
      limit: l,
      questions: paginated
    });
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
       if (subject) {
         filteredTopics = filteredTopics.filter((t: any) => t.subject_id === subject.id);
       }
    }
    
    res.json(filteredTopics);
  });

  app.get("/api/oracle/predictions", (req, res) => {
    const { exam, subject } = req.query;
    const db = getDb();
    let filtered = db.predictions;
    if (exam) filtered = filtered.filter((p: any) => p.exam === exam);
    if (subject) filtered = filtered.filter((p: any) => p.subject === subject);
    res.json(filtered);
  });

  app.get("/api/mastery/syllabus", (req, res) => {
    const { exam, subject } = req.query;
    const db = getDb();
    let filtered = db.syllabus;
    if (exam) filtered = filtered.filter((s: any) => s.exam === exam);
    if (subject) filtered = filtered.filter((s: any) => s.subject === subject);
    res.json(filtered);
  });

  // --- Arena API Routes ---
  app.get("/api/arena/lobby", (req, res) => {
    const db = getDb();
    const onlineUserIds = Array.from(userSocketMap.keys());
    const onlineUsers = db.users
      .filter((u: any) => onlineUserIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        school: u.school_id,
        level: u.level,
        wins: u.wins || 0,
        losses: u.losses || 0,
        rank: u.rank || "Bronze Scholar",
        isOnline: true
      }));
    res.json(onlineUsers);
  });

  app.get("/api/arena/leaderboard", (req, res) => {
    const db = getDb();
    const schoolStats = db.schools.map((s: any) => {
      const history = db.leaderboardHistory.filter((h: any) => h.school_id === s.id);
      return {
        ...s,
        wins: history.filter((h: any) => h.result === 'win').length,
        losses: history.filter((h: any) => h.result === 'loss').length,
        total_points: s.total_points
      };
    });
    res.json(schoolStats.sort((a: any, b: any) => b.total_points - a.points));
  });

  app.post("/api/exam/analyze", async (req, res) => {
    try {
        const { userAnswers, questions } = req.body;
        
        const analysis = questions.map((q: any) => {
            const selected = userAnswers[q.id];
            const isCorrect = selected?.toLowerCase() === (q.answer || '').toLowerCase();
            return {
                questionId: q.id,
                isCorrect,
                explanation: isCorrect ? "Correct!" : `The selected option '${selected}' was incorrect. The correct answer is '${q.answer}'. ${q.solution || ''}`,
                conceptNote: `Topic: ${q.section || 'General'}. Key concept: ${q.question.substring(0, 30)}...`,
                comparison: isCorrect ? "N/A" : `You selected '${selected}', which conflicts with the fundamental concept of...`
            };
        });

        res.json({ analysis });
    } catch (err) {
        console.error("Analysis error:", err);
        res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/analytics/explain", async (req, res) => {
    try {
        const { topic, frequency, year } = req.body;
        // In real app, call Gemini API here
        res.json({ explanation: `The topic '${topic}' appeared ${frequency} times in ${year}. This suggests a high importance in recent curriculum updates.` });
    } catch (err) {
        console.error("Explanation error:", err);
        res.status(500).json({ error: "Explanation failed" });
    }
  });

  app.post("/api/ai/predict-topics", async (req, res) => {
    // In a real scenario, integrate Gemini
    res.json({ message: "Prediction generated" });
  });

  app.post("/api/ai/study-plan", async (req, res) => {
    // In a real scenario, integrate Gemini
    res.json({ message: "Study plan generated" });
  });

  app.get("/api/teacher/class-performance", (req, res) => {
    // Aggregating mock data for demo
    const performance = {
        classAverage: 72,
        topStudents: [{ name: "Alice", score: 95 }, { name: "Bob", score: 88 }],
        commonStruggleTopics: ["Photosynthesis", "Geometric Progressions"],
    };
    res.json(performance);
  });

  app.post("/api/teacher/generate-assignment", async (req, res) => {
    const { topic, difficulty } = req.body;
    // In real app, call Gemini API with RAG to generate quiz
    res.json({ assignment: `Quiz generated for ${topic} at ${difficulty} level.` });
  });

  app.post("/api/teacher/summarize-student", async (req, res) => {
    const { studentName, progressData } = req.body;
    // Prompt: 'You are an encouraging teacher assistant. Summarize this student's progress: ${JSON.stringify(progressData)}. Provide actionable advice for further improvement.'
    res.json({ summary: `Encouraging report for ${studentName}: They are showing great progress in core concepts but need more practice on advanced applications.` });
  });

  // --- Socket.io Logic (Arena) ---
  const activeBattles = new Map();
  const matchmakingQueue = new Map(); // level -> socketId
  const userSocketMap = new Map(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join battle room (legacy or general)
    socket.on('join_battle', (data) => {
      const { roomId, userId } = data;
      socket.join(roomId);
      console.log(`User ${userId} joined battle room ${roomId}`);
      io.to(roomId).emit('user_joined', { userId });
    });

    socket.on("register_user", (userId) => {
      userSocketMap.set(userId, socket.id);
      (socket as any).userId = userId;
      io.emit("lobby_update"); // Notify everyone to refresh lobby
    });

    socket.on("challenge_user", ({ targetUserId, fromUser, battleSource }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("battle_invite", { 
          fromUser, 
          battleId: crypto.randomUUID(),
          battleSource: battleSource || "General" 
        });
      }
    });

    socket.on("challenge_ai", ({ fromUser }) => {
      const db = getDb();
      // Select 10 "Hard" questions from pastQuestions for the Boss Battle
      const hardQuestions = db.pastQuestions
        .filter((q: any) => q.difficulty === 'Hard')
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

      const battleId = `battle_ai_${Date.now()}`;
      const aiPlayer = { id: "ai_boss", name: "AI Final Boss", school: "The Nexus", level: 99, score: 0, socketId: "ai_socket" };
      
      const battleRoom = {
        id: battleId,
        type: 'ai_boss',
        status: 'active',
        players: [
          { ...fromUser, score: 0, socketId: socket.id },
          aiPlayer
        ],
        questions: hardQuestions.map((q: any) => ({ 
          id: q.id, 
          question: q.question_text, 
          options: q.options,
          topic: q.topic,
          year: q.year
        })),
        fullQuestions: hardQuestions,
        currentQuestionIndex: 0,
        startTime: Date.now(),
        questionStartTime: Date.now(),
        answers: [] 
      };

      activeBattles.set(battleId, battleRoom);
      socket.join(battleId);
      
      io.to(battleId).emit("battle_started", {
        id: battleId,
        players: [fromUser, { id: "ai_boss", name: "AI Final Boss", school: "The Nexus", level: 99 }],
        questions: battleRoom.questions
      });

      // AI Logic: Answers every 5.5 seconds
      let qIndex = 0;
      const aiInterval = setInterval(() => {
        const room = activeBattles.get(battleId);
        if (!room || room.status !== 'active' || qIndex >= 10) {
          clearInterval(aiInterval);
          return;
        }

        const isCorrect = Math.random() < 0.92; // 92% accuracy
        const points = isCorrect ? 100 : 0;
        const player = room.players.find((p: any) => p.id === "ai_boss");
        if (player) player.score += points;
        
        room.answers.push({ questionIndex: qIndex, userId: "ai_boss", timestamp: Date.now(), isCorrect, points });

        io.to(battleId).emit("battle_update", {
          players: room.players,
          lastAnswer: { userId: "ai_boss", isCorrect, points, questionIndex: qIndex }
        });

        qIndex++;
      }, 5500);
    });

    socket.on("accept_challenge", ({ battleId, player1, player2, battleSource }) => {
      const db = getDb();
      let questions = [];

      if (battleSource) {
        const [exam, year] = battleSource.split(" ");
        questions = db.pastQuestions
          .filter((q: any) => q.exam === exam && q.year === Number(year))
          .sort(() => 0.5 - Math.random())
          .slice(0, 10);
      }

      // Fallback if source has no questions
      if (questions.length < 5) {
        questions = [...questions, ...db.questions.sort(() => 0.5 - Math.random()).slice(0, 10 - questions.length)];
      }
      
      const battleRoom = {
        id: battleId,
        type: 'p2p',
        status: 'active',
        players: [
          { ...player1, score: 0, socketId: userSocketMap.get(player1.id) },
          { ...player2, score: 0, socketId: socket.id }
        ],
        questions: questions.map((q: any) => ({ 
          id: q.id, 
          question: q.question_text || q.text, 
          options: q.options,
          topic: q.topic,
          year: q.year
        })),
        fullQuestions: questions,
        currentQuestionIndex: 0,
        startTime: Date.now(),
        questionStartTime: Date.now(),
        answers: [] 
      };

      activeBattles.set(battleId, battleRoom);
      
      const p1Socket = io.sockets.sockets.get(battleRoom.players[0].socketId);
      const p2Socket = io.sockets.sockets.get(battleRoom.players[1].socketId);

      if (p1Socket) p1Socket.join(battleId);
      if (p2Socket) p2Socket.join(battleId);

      io.to(battleId).emit("battle_started", {
        id: battleId,
        players: battleRoom.players,
        questions: battleRoom.questions,
        currentQuestionIndex: 0
      });
    });

    socket.on("submit_battle_answer", (data) => {
      // Legacy compatibility check for roomId vs battleId
      if (data.roomId) {
        const { roomId, userId, answer, isCorrect } = data;
        io.to(roomId).emit('battle_update', { userId, isCorrect, score: isCorrect ? 10 : 0 });
        return;
      }

      const { battleId, questionIndex, answer } = data;
      const battle = activeBattles.get(battleId);
      if (!battle || battle.status !== 'active') return;

      const question = battle.fullQuestions[questionIndex];
      const correctOption = question.correct_option ?? question.correct_answer ?? "";
      const isCorrect = String(correctOption).toUpperCase() === String(answer).toUpperCase();
      const timestamp = Date.now();
      const userId = (socket as any).userId;

      // Calculate points
      let points = isCorrect ? 10 : 0;
      
      if (isCorrect) {
        const timeTaken = (timestamp - battle.questionStartTime) / 1000;
        const timeLeft = Math.max(0, 6 - timeTaken);
        // Speed Bonus: 1 sec = 5 pts, 5 sec = 1 pt
        const speedBonus = Math.round(timeLeft); 
        points += speedBonus;
      }

      const player = battle.players.find((p: any) => p.id === userId);
      if (player) player.score += points;

      battle.answers.push({ questionIndex, userId, timestamp, isCorrect, points });

      // Broadcast update
      io.to(battleId).emit("battle_update", {
        players: battle.players,
        lastAnswer: { userId, isCorrect, points, questionIndex }
      });

      // Check if both answered or move to next question logic
      const totalAnswers = battle.answers.filter((a: any) => a.questionIndex === questionIndex).length;
      if (totalAnswers === 2) {
        setTimeout(() => {
          battle.currentQuestionIndex++;
          battle.questionStartTime = Date.now();
          if (battle.currentQuestionIndex < 10) {
            io.to(battleId).emit("next_question", { index: battle.currentQuestionIndex });
          } else {
            battle.status = 'completed';
            // Finalize results
            const winner = battle.players.reduce((prev: any, current: any) => (prev.score > current.score) ? prev : current);
            
            // Update DB
            const db = getDb();
            battle.players.forEach((p: any) => {
              const u = db.users.find((user: any) => user.id === p.id);
              if (u) {
                u.points += p.score;
                if (p.id === winner.id) {
                  u.points += 500; // Win bonus
                  u.wins = (u.wins || 0) + 1;
                } else {
                  u.losses = (u.losses || 0) + 1;
                }
                // Simple rank logic
                if (u.wins > 50) u.rank = "Diamond Scholar";
                else if (u.wins > 20) u.rank = "Gold Scholar";
                else if (u.wins > 10) u.rank = "Silver Scholar";
              }
            });
            saveDb(db);

            io.to(battleId).emit("battle_completed", { winner, players: battle.players });
            activeBattles.delete(battleId);
          }
        }, 2000);
      }
    });

    // --- School Derby Logic ---
    socket.on("admin_start_derby", ({ schoolA, schoolB }) => {
      const battleId = `derby_${crypto.randomUUID()}`;
      const db = getDb();
      const questions = db.questions.sort(() => 0.5 - Math.random()).slice(0, 15);

      const derby = {
        id: battleId,
        type: 'school_derby',
        status: 'active',
        schools: [
          { id: schoolA.id, name: schoolA.name, score: 0 },
          { id: schoolB.id, name: schoolB.name, score: 0 }
        ],
        questions: questions,
        currentQuestionIndex: 0,
        answeredBy: null // Fastest finger
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
        // Fastest finger wins
        const school = derby.schools.find((s: any) => s.id === schoolId);
        if (school) school.score += 1;
        
        io.emit("derby_point", { battleId, schoolId, questionIndex, winner: school.name });

        setTimeout(() => {
          derby.currentQuestionIndex++;
          if (derby.currentQuestionIndex < 15) {
            io.emit("derby_next_question", { index: derby.currentQuestionIndex });
          } else {
            derby.status = 'completed';
            const winner = derby.schools.reduce((prev: any, current: any) => (prev.score > current.score) ? prev : current);
            
            // Update School Leaderboard
            const db = getDb();
            derby.schools.forEach((s: any) => {
              const schoolDb = db.schools.find((sd: any) => sd.id === s.id);
              if (schoolDb) {
                schoolDb.total_points += s.score * 100;
                db.leaderboardHistory.push({
                  school_id: s.id,
                  battle_id: battleId,
                  result: s.id === winner.id ? 'win' : 'loss',
                  points: s.score * 100,
                  timestamp: new Date().toISOString()
                });
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
      if (userId) {
        userSocketMap.delete(userId);
        io.emit("lobby_update");
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
