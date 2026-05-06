// Mock backend to allow the app to work on static hosts like Netlify without an Express server

const LOCAL_STORAGE_KEY = 'eduarena_db';

const defaultDb = {
  users: [],
  subjects: [
    { id: '1', name: 'Mathematics', category: 'Science', created_at: new Date().toISOString() },
    { id: '2', name: 'Physics', category: 'Science', created_at: new Date().toISOString() }
  ],
  topics: [
    { id: '1', subject_id: '1', name: 'Algebra' },
    { id: '2', subject_id: '2', name: 'Kinematics' }
  ],
  questions: [],
  currentUser: null
};

// Initialize DB
let db = defaultDb;
try {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    db = JSON.parse(saved);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  }
} catch (e) {}

const saveDb = () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));

const originalFetch = window.fetch;

Object.defineProperty(window, 'fetch', {
  value: async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    // If not an API request, let it through
    if (!url.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    // Helper to create a fake json response
    const jsonResponse = (data: any, status = 200) => {
      return Promise.resolve(new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      }));
    };

    try {
      // Auth
      if (url === '/api/auth/me') {
        return jsonResponse({ user: db.currentUser });
      }
      if (url === '/api/auth/login' && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        const user = db.users.find((u: any) => u.email === body.email && u.password === body.password);
        if (user) {
          db.currentUser = user;
          saveDb();
          return jsonResponse({ user });
        }
        return jsonResponse({ error: 'Invalid credentials' }, 401);
      }
      if (url === '/api/auth/signup' && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        const role = body.email === 'eroeliza1234@gmail.com' ? 'admin' : 'student';
        const user = { ...body, id: Date.now().toString(), points: 0, level: 1, role };
        db.users.push(user);
        db.currentUser = user;
        saveDb();
        return jsonResponse({ user });
      }
      if (url === '/api/auth/logout' && init?.method === 'POST') {
        db.currentUser = null;
        saveDb();
        return jsonResponse({ success: true });
      }

      // Admin
      if (url.startsWith('/api/admin/subjects')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          const subj = { ...body, id: Date.now().toString() };
          db.subjects.push(subj);
          saveDb();
          return jsonResponse(subj);
        }
        return jsonResponse(db.subjects);
      }
      
      if (url.startsWith('/api/admin/topics')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          const topic = { ...body, id: Date.now().toString() };
          db.topics.push(topic);
          saveDb();
          return jsonResponse(topic);
        }
        return jsonResponse(db.topics);
      }

      if (url.startsWith('/api/admin/questions')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          const q = { ...body, id: Date.now().toString() };
          db.questions.push(q);
          saveDb();
          return jsonResponse(q);
        }
        return jsonResponse({ questions: db.questions, total: db.questions.length });
      }

      // Oracle Core
      if (url === '/api/oracle/years') {
        const years = Array.from({ length: 43 }, (_, i) => 2025 - i);
        return jsonResponse(years);
      }

      if (url.startsWith('/api/oracle/topics')) {
        const urlObj = new URL(url, 'http://localhost');
        const subject_id = urlObj.searchParams.get('subject_id');
        const filtered = subject_id ? db.topics.filter((t: any) => t.subject_id === subject_id) : db.topics;
        return jsonResponse(filtered);
      }

      if (url.startsWith('/api/oracle/search')) {
        const urlObj = new URL(url, 'http://localhost');
        const subject_id = urlObj.searchParams.get('subject_id');
        const topic_id = urlObj.searchParams.get('topic_id');
        let filtered = db.questions;
        if (subject_id) filtered = filtered.filter((q: any) => q.subject_id === subject_id);
        if (topic_id) filtered = filtered.filter((q: any) => q.topic_id === topic_id);
        return jsonResponse({ questions: filtered, total: filtered.length });
      }

      // Core mock for economy jackpot
      if (url === '/api/economy/jackpot') {
        return jsonResponse({
          id: '1',
          current_pool: 15250,
          next_draw: new Date(Date.now() + 86400000).toISOString()
        });
      }

      // Mock catch-all for other simple GETs to prevent crashes
      return jsonResponse([]);

    } catch (err: any) {
      return Promise.resolve(new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  },
  writable: true,
  configurable: true
});
