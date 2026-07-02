import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env files if present
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─────────────────────────────────────────────
// Resolve env vars — handles BOTH naming styles
// ─────────────────────────────────────────────
const ALOC_TOKEN = process.env.ALOC_API_TOKEN ?? 'ALOC-b77ef1b2396263a9ee7a';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL         ??  // current name ✅
  process.env.NEXT_PUBLIC_SUPABASE_URL  ??  // Next.js style
  process.env.SUPABASE_URL              ??  // plain style
  '';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY     ??  // service role (preferred)
  process.env.VITE_SUPABASE_ANON_KEY        ??  // anon fallback
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY             ??
  '';

// ─────────────────────────────────────────────
// Validate before starting
// ─────────────────────────────────────────────
function validateEnv() {
  console.log('━'.repeat(55));
  console.log('🔍 Environment Check:');
  console.log('━'.repeat(55));
  console.log(`  ALOC_API_TOKEN:         ${ALOC_TOKEN   ? `✅ ${ALOC_TOKEN.slice(0,15)}...`   : '❌ MISSING'}`);
  console.log(`  SUPABASE_URL:           ${SUPABASE_URL ? `✅ ${SUPABASE_URL}`                  : '❌ MISSING'}`);
  console.log(`  SUPABASE_KEY:           ${SUPABASE_KEY ? `✅ ${SUPABASE_KEY.slice(0,20)}...`  : '❌ MISSING'}`);
  console.log('━'.repeat(55));

  const missing: string[] = [];
  if (!ALOC_TOKEN)   missing.push('ALOC_API_TOKEN');
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.error('\n❌ Missing required variables:');
    missing.forEach(k => console.error(`   • ${k}`));
    console.error('\nAdd them to your .env file or environment and retry.\n');
    process.exit(1);
  }

  console.log('\n✅ Environment check passed!\n');
}

validateEnv();

// ─────────────────────────────────────────────
// Init Supabase
// ─────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken:  false,
    persistSession:    false,
  },
});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────
// Correct exam type mapping
// (jamb→utme, waec→wassce)
// ─────────────────────────────────────────────
const EXAM_API_TYPE: Record<string, string> = {
  'JAMB': 'utme',
  'WAEC': 'wassce',
  'NECO': 'neco',
};

// ─────────────────────────────────────────────
// Subject display names
// ─────────────────────────────────────────────
const SUBJECT_DISPLAY: Record<string, string> = {
  'mathematics':           'Mathematics',
  'english':               'Use of English',
  'physics':               'Physics',
  'chemistry':             'Chemistry',
  'biology':               'Biology',
  'economics':             'Economics',
  'government':            'Government',
  'literature-in-english': 'Literature in English',
  'geography':             'Geography',
  'commerce':              'Commerce',
  'accounting':            'Accounting',
  'crk':                   'CRK',
  'irk':                   'IRK',
  'civic-education':       'Civic Education',
  'agricultural-science':  'Agricultural Science',
  'further-mathematics':   'Further Mathematics',
};

// ─────────────────────────────────────────────
// All subjects to scrape
// ─────────────────────────────────────────────
const SUBJECTS = [
  // JAMB
  { slug: 'mathematics',           examType: 'JAMB' },
  { slug: 'english',               examType: 'JAMB' },
  { slug: 'physics',               examType: 'JAMB' },
  { slug: 'chemistry',             examType: 'JAMB' },
  { slug: 'biology',               examType: 'JAMB' },
  { slug: 'economics',             examType: 'JAMB' },
  { slug: 'government',            examType: 'JAMB' },
  { slug: 'literature-in-english', examType: 'JAMB' },
  { slug: 'geography',             examType: 'JAMB' },
  { slug: 'commerce',              examType: 'JAMB' },
  { slug: 'accounting',            examType: 'JAMB' },
  { slug: 'crk',                   examType: 'JAMB' },
  { slug: 'agricultural-science',  examType: 'JAMB' },
  { slug: 'further-mathematics',   examType: 'JAMB' },
  { slug: 'civic-education',       examType: 'JAMB' },

  // WAEC
  { slug: 'mathematics',           examType: 'WAEC' },
  { slug: 'english',               examType: 'WAEC' },
  { slug: 'physics',               examType: 'WAEC' },
  { slug: 'chemistry',             examType: 'WAEC' },
  { slug: 'biology',               examType: 'WAEC' },
  { slug: 'economics',             examType: 'WAEC' },
  { slug: 'government',            examType: 'WAEC' },
  { slug: 'literature-in-english', examType: 'WAEC' },
  { slug: 'geography',             examType: 'WAEC' },
  { slug: 'commerce',              examType: 'WAEC' },
  { slug: 'accounting',            examType: 'WAEC' },
  { slug: 'agricultural-science',  examType: 'WAEC' },
  { slug: 'civic-education',       examType: 'WAEC' },
];

const YEARS = Array.from({ length: 2024 - 2000 + 1 }, (_, i) => 2000 + i);

// ─────────────────────────────────────────────
// Fetch from ALOC using correct endpoint
// ─────────────────────────────────────────────
async function fetchAlocQuestions(
  slug:     string,
  examType: string,
  year:     number,
  count:    number = 50
): Promise<any[]> {
  const apiType = EXAM_API_TYPE[examType];
  const url     = `https://questions.aloc.com.ng/api/v2/q/${count}?subject=${slug}&type=${apiType}&year=${year}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'AccessToken': ALOC_TOKEN,
          'Accept':      'application/json',
          'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      // Quota exhausted
      if (res.status === 406 || res.status === 403) {
        const text = await res.text();
        if (text.includes('quota') || text.includes('upgrade')) {
          console.error('\n\n❌ QUOTA EXHAUSTED on token!');
          console.error('   Please get another token at questions.aloc.com.ng');
          process.exit(1);
        }
        return [];
      }

      // Rate limited
      if (res.status === 429) {
        console.log(`\n    ⏳ Rate limited, waiting ${attempt * 3}s...`);
        await sleep(attempt * 3000);
        continue;
      }

      if (!res.ok) return [];

      const json = await res.json();

      // Validate response shape
      if (!json?.data || !Array.isArray(json.data)) return [];

      return json.data;

    } catch (err: any) {
      if (attempt === 3) {
        console.error(`\n    ⚠️ Failed after 3 attempts: ${err.message}`);
        return [];
      }
      await sleep(1000 * attempt);
    }
  }

  return [];
}

// ─────────────────────────────────────────────
// Transform to DB shape (schema-compliant!)
// ─────────────────────────────────────────────
function transformQuestion(
  q:        any,
  slug:     string,
  examType: string,
  year:     number
) {
  const subject = SUBJECT_DISPLAY[slug] ?? slug;

  return {
    id:        Number(q.id),
    subject:   subject.toLowerCase(),
    exam_type: examType.toLowerCase(),
    question_data: {
      question:    q.question    ?? '',
      option:      q.option      ?? {},
      answer:      String(q.answer ?? 'a').toLowerCase().charAt(0),
      explanation: q.solution    ?? null,
      image:       q.image       ?? null,
      passage:     q.passage     ?? null,
      section:     q.section     ?? null,
      year:        year,
      examType:    examType,
      subject:     subject,
      slug:        slug,
    },
  };
}

// ─────────────────────────────────────────────
// Upsert to Supabase
// ─────────────────────────────────────────────
async function upsertBatch(rows: any[]): Promise<number> {
  if (rows.length === 0) return 0;

  const CHUNK = 50;
  let   total = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);

    const { error } = await supabase
      .from('global_questions_vault')
      .upsert(batch, {
        onConflict:       'id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`\n    ❌ Upsert error: ${error.message}`);

      // Fallback: insert one by one
      for (const row of batch) {
        const { error: e } = await supabase
          .from('global_questions_vault')
          .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (!e) total++;
      }
    } else {
      total += batch.length;
    }
  }

  return total;
}

// ─────────────────────────────────────────────
// Main scrape loop
// ─────────────────────────────────────────────
async function scrapeAll() {
  console.log('🚀 ALOC Scraper — Fixed & Ready');
  console.log('═'.repeat(55));

  const startTime   = Date.now();
  let totalInserted = 0;
  let totalSkipped  = 0;
  const subjectTotals = new Map<string, number>();

  for (const { slug, examType } of SUBJECTS) {
    const subject = SUBJECT_DISPLAY[slug] ?? slug;
    const key     = `${subject} (${examType})`;

    console.log(`\n📚 ${key}`);
    console.log('─'.repeat(45));

    for (const year of YEARS) {
      process.stdout.write(`  ${year}: `);

      const questions = await fetchAlocQuestions(slug, examType, year);

      if (questions.length === 0) {
        process.stdout.write('⚪ no data\n');
        totalSkipped++;
        await sleep(200);
        continue;
      }

      const rows     = questions.map(q => transformQuestion(q, slug, examType, year));
      const inserted = await upsertBatch(rows);

      totalInserted += inserted;
      subjectTotals.set(key, (subjectTotals.get(key) ?? 0) + inserted);

      process.stdout.write(`✅ ${inserted} questions\n`);

      await sleep(400);
    }

    await sleep(1000);
  }

  // ─────────────────────────────────────────
  // Final summary
  // ─────────────────────────────────────────
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins    = Math.floor(elapsed / 60);
  const secs    = elapsed % 60;

  console.log('\n' + '═'.repeat(55));
  console.log('📊 SCRAPING COMPLETE');
  console.log('═'.repeat(55));
  console.log(`⏱  Time:          ${mins}m ${secs}s`);
  console.log(`✅ Total inserted: ${totalInserted}`);
  console.log(`⚪ Skipped:        ${totalSkipped} year/subject combos`);
  console.log('');
  console.log('📚 By Subject:');

  const sorted = [...subjectTotals.entries()].sort((a, b) => b[1] - a[1]);
  for (const [label, count] of sorted) {
    const bar = '█'.repeat(Math.min(20, Math.floor(count / 10)));
    console.log(`  ${label.padEnd(35)} ${count.toString().padStart(5)}  ${bar}`);
  }

  console.log('═'.repeat(55));

  // Final DB count
  const { count } = await supabase
    .from('global_questions_vault')
    .select('*', { count: 'exact', head: true });

  console.log(`\n🗄  Total in database: ${count} questions`);
}

scrapeAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💀 Fatal:', err);
    process.exit(1);
  });
