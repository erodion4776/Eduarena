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

// Initial DB state
const initialDb = {
  users: [],
  schools: [
    { id: "1", name: "Lagos Academy", location: "Lagos", total_points: 1250 },
    { id: "2", name: "Abuja High", location: "Abuja", total_points: 980 }
  ],
  content: [
    { id: "1", subject: "Mathematics", type: "video", title: "Algebra Basics", description: "Introduction to variables", url: "https://example.com/algebra", created_by: "admin" },
    { id: "2", subject: "Science", type: "text", title: "Photosynthesis", description: "How plants make food", content: "Photosynthesis is...", created_by: "admin" }
  ],
  questions: [
    { 
      id: "q1", 
      subject: "Mathematics", 
      exam_type: "JAMB", 
      question_text: "Solve for x: 3x - 7 = 14", 
      options: ["x = 7", "x = 6", "x = 5", "x = 8"], 
      correct_answer: "x = 7", 
      explanation: "Add 7 to both sides: 3x = 21. Divide by 3: x = 7.", 
      difficulty: "Easy" 
    },
    { 
      id: "q2", 
      subject: "Physics", 
      exam_type: "WAEC", 
      question_text: "What is the unit of force?", 
      options: ["Joule", "Watt", "Newton", "Pascal"], 
      correct_answer: "Newton", 
      explanation: "Force is measured in Newtons (N) according to SI units.", 
      difficulty: "Easy" 
    },
    {
      id: "q3",
      subject: "Mathematics",
      exam_type: "JAMB",
      question_text: "What is the square root of 144?",
      options: ["10", "11", "12", "13"],
      correct_answer: "12",
      explanation: "12 * 12 = 144.",
      difficulty: "Easy"
    },
    {
      id: "q4",
      subject: "Biology",
      exam_type: "WAEC",
      question_text: "Which organ is responsible for pumping blood?",
      options: ["Lungs", "Brain", "Heart", "Liver"],
      correct_answer: "Heart",
      explanation: "The heart pumps blood throughout the body.",
      difficulty: "Easy"
    }
  ],
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

  // --- Knowledge Hub Routes ---
  app.get("/api/questions", (req, res) => {
    const { search, subject, exam_type } = req.query;
    const db = getDb();
    let filtered = db.questions;

    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((q: any) => q.question_text.toLowerCase().includes(s));
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

    socket.on("challenge_user", ({ targetUserId, fromUser }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("battle_invite", { 
          fromUser, 
          battleId: Math.random().toString(36).substr(2, 9),
          subject: "Mathematics" // Default for now
        });
      }
    });

    socket.on("accept_challenge", ({ battleId, player1, player2 }) => {
      const db = getDb();
      const questions = db.questions.sort(() => 0.5 - Math.random()).slice(0, 10);
      
      const battleRoom = {
        id: battleId,
        type: 'p2p',
        status: 'active',
        players: [
          { ...player1, score: 0, socketId: userSocketMap.get(player1.id) },
          { ...player2, score: 0, socketId: socket.id }
        ],
        questions: questions.map((q: any) => ({ ...q, correct_answer: undefined })),
        fullQuestions: questions,
        currentQuestionIndex: 0,
        startTime: Date.now(),
        questionStartTime: Date.now(),
        answers: [] // { questionIndex, playerId, timestamp, isCorrect }
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
