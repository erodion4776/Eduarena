// Mock backend to allow the app to work on static hosts like Netlify without an Express server
import questionsData from '../data/questions.json';

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
    const isFullStackContainer = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.endsWith('.run.app') ||
      window.location.hostname.includes('googleusercontent.com');

    if (isFullStackContainer) {
      return originalFetch(input, init);
    }

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
      // Intercept ALOC past questions API for static hosting deployments (e.g., Netlify)
      const parsedUrl = new URL(url, window.location.origin);
      const pathname = parsedUrl.pathname;
      
      if (pathname.includes('/api/aloc/q')) {
        const pathParts = pathname.split('/');
        // Extract count of questions requested if specified in the path
        let countVal = 1;
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !isNaN(Number(lastPart))) {
          countVal = Number(lastPart);
        }

        const subjectQuery = (parsedUrl.searchParams.get('subject') || 'english').toLowerCase();
        const typeQuery = (parsedUrl.searchParams.get('type') || 'utme').toLowerCase();
        const yearQuery = parsedUrl.searchParams.get('year') || '';

        // 1. Try hitting the actual live ALOC API from the browser first! (In case CORS and Plan Quota are valid)
        const ACCESS_TOKEN = 'ALOC-b77ef1b2396263a9ee7a';
        let liveUrl = `https://questions.aloc.com.ng/api/v2/q/${countVal}?subject=${subjectQuery}&type=${typeQuery}`;
        if (yearQuery && yearQuery !== 'all' && yearQuery !== '') {
          liveUrl += `&year=${yearQuery}`;
        }
        liveUrl += `&cb=${Date.now()}`;

        try {
          const liveResponse = await originalFetch(liveUrl, {
            method: 'GET',
            headers: {
              'AccessToken': ACCESS_TOKEN,
              'Accept': 'application/json'
            }
          });

          if (liveResponse.ok) {
            const rawData = await liveResponse.json();
            if (rawData && rawData.data) {
              console.log('Successfully retrieved live ALOC data from Netlify direct bridge.');
              return jsonResponse(rawData);
            }
          }
        } catch (err) {
          console.warn('Direct ALOC API browser fetch was bypassed or blocked. Initiating offline static failover.', err);
        }

        // 2. Fallback to bundled local questions.json
        let matches = (questionsData as any[]).filter((q: any) => {
          const qSub = String(q.subject || '').toLowerCase();
          const qType = String(q.examtype || q.exam_type || '').toLowerCase();
          const qYear = String(q.examyear || q.year || '');

          const matchesSubject = qSub === subjectQuery;
          
          let matchesType = true;
          if (typeQuery && typeQuery !== 'all' && qType) {
            matchesType = qType === typeQuery;
          }
          
          let matchesYear = true;
          if (yearQuery && yearQuery !== 'all' && qYear) {
            matchesYear = qYear === yearQuery;
          }

          return matchesSubject && matchesType && matchesYear;
        });

        // If we didn't find any exact combinations, filter just by general subject
        let fallbackMatches = matches;
        if (fallbackMatches.length === 0) {
          fallbackMatches = (questionsData as any[]).filter((q: any) => {
            const qSub = String(q.subject || '').toLowerCase();
            return qSub === subjectQuery;
          });
        }

        // If still completely empty (subject not represented in questions.json), fall back to hardcoded custom-curated questions
        if (fallbackMatches.length === 0) {
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

          const fback = STATIC_FALLBACKS[subjectQuery] || STATIC_FALLBACKS['english'];
          fallbackMatches = [fback];
        }

        // Shuffle and slice to deliver random variation and correctly sized responses
        const shuffled = [...fallbackMatches].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, countVal);

        console.log(`Serving ${selected.length} offline static fallback questions for subject [${subjectQuery}]`);
        return jsonResponse({
          status: 200,
          message: "success (Seamless Offline Satellite Bridge)",
          data: countVal === 1 ? selected[0] : selected
        });
      }

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
        const cleanPath = url.split('?')[0];
        const pathParts = cleanPath.split('/');
        const qId = pathParts.length > 4 ? pathParts[4] : null;

        if (init?.method === 'DELETE' && qId) {
          db.questions = db.questions.filter((q: any) => q.id !== qId);
          saveDb();
          return jsonResponse({ success: true });
        }
        if (init?.method === 'PUT' && qId) {
          const body = JSON.parse(init.body as string);
          const index = db.questions.findIndex((q: any) => q.id === qId);
          if (index !== -1) {
            db.questions[index] = { ...db.questions[index], ...body, year: Number(body.year) };
            saveDb();
            return jsonResponse({ success: true, question: db.questions[index] });
          }
          return jsonResponse({ error: "Question not found" }, 404);
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          const q = { ...body, id: `pq-${Date.now().toString()}` };
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
