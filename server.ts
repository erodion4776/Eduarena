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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "eduarena-secret-key-123";
const DB_FILE = path.join(__dirname, "db.json");

// Load hardcoded questions
const hardcodedQuestionsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "src/data/questions.json"), "utf8"));
const hardcodedQuestions = hardcodedQuestionsRaw.map((q: any) => {
    const questionText = q.question.replace(/<[^>]*>?/gm, '');
    return {
        id: `hc-${q.id}`,
        exam_type: q.examtype?.toUpperCase() || "JAMB",
        year: parseInt(q.examyear) || 2024,
        subject_id: q.subject === "Biology" ? "s2" : "s5", 
        topic_id: q.subject === "Biology" ? "t1" : "t7",
        subject: q.subject, // Used for direct filtering in /api/questions
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
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
}

function getDb() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  // Migration: Ensure all fields from initialDb exist
  let modified = false;
  Object.keys(initialDb).forEach(key => {
    if (db[key] === undefined) {
      db[key] = (initialDb as any)[key];
      modified = true;
    }
  });
  if (modified) saveDb(db);
  return db;
}

function saveDb(db: any) {
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
    const db = getDb();
    
    if (db.users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
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

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
    res.json({ user: { id: newUser.id, name, email, role: newUser.role, points: 0, level: 1 } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
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
      filtered = filtered.filter((q: any) => q.subject === subject);
    }
    if (exam_type) {
      filtered = filtered.filter((q: any) => q.exam_type === exam_type);
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
      
      // Update user points/coins
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (user) {
        user.points += coins_earned;
      }

      saveDb(db);
      res.json({ success: true, result });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
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
  app.get("/api/admin/subjects", (req, res) => {
    const db = getDb();
    res.json(db.subjects);
  });

  app.post("/api/admin/subjects", (req, res) => {
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

  app.post("/api/admin/topics", (req, res) => {
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

  app.get("/api/admin/questions", (req, res) => {
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

  app.post("/api/admin/questions", (req, res) => {
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
      id: `pq-${Date.now()}`,
      ...questionData,
      year: Number(questionData.year),
      difficulty_level: Number(questionData.difficulty_level || 5),
      created_at: new Date().toISOString()
    };

    db.pastQuestions.push(newQuestion);
    saveDb(db);
    res.json({ success: true, question: newQuestion });
  });

  app.put("/api/admin/questions/:id", (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const db = getDb();
    const index = db.pastQuestions.findIndex((q: any) => q.id === id);
    if (index === -1) return res.status(404).json({ error: "Question not found" });

    db.pastQuestions[index] = { ...db.pastQuestions[index], ...updatedData, year: Number(updatedData.year) };
    saveDb(db);
    res.json({ success: true, question: db.pastQuestions[index] });
  });

  app.delete("/api/admin/questions/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();
    db.pastQuestions = db.pastQuestions.filter((q: any) => q.id !== id);
    saveDb(db);
    res.json({ success: true });
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

  // Admin Import Pipeline
  app.post("/api/admin/import", (req, res) => {
    const { type, data } = req.body; // type: 'json' | 'csv-sim'
    const db = getDb();
    
    if (type === 'questions') {
      const newQuestions = data.map((item: any) => ({
        id: `pq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
  app.post("/api/admin/ocr-ingest", (req, res) => {
    const { structured_payload } = req.body;
    // structured_payload would be from Vision AI conversion
    const db = getDb();
    
    // Simulate difficulty calculation if missing
    if (!structured_payload.difficulty_level && !structured_payload.difficulty_score) {
      structured_payload.difficulty_level = Math.floor(Math.random() * 10) + 1;
    }

    db.pastQuestions.push({
      id: `pq-ocr-${Date.now()}`,
      ...structured_payload,
      created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, id: structured_payload.id });
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

  // --- Socket.io Logic (Arena) ---
  const activeBattles = new Map();
  const matchmakingQueue = new Map(); // level -> socketId
  const userSocketMap = new Map(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

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
          battleId: Math.random().toString(36).substr(2, 9),
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

      // AI Logic: Answers every 5 seconds
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

    socket.on("submit_battle_answer", ({ battleId, questionIndex, answer }) => {
      const battle = activeBattles.get(battleId);
      if (!battle || battle.status !== 'active') return;

      const question = battle.fullQuestions[questionIndex];
      const isCorrect = question.correct_answer === answer;
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
      const battleId = `derby_${Date.now()}`;
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
      if (question.correct_answer === answer) {
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
