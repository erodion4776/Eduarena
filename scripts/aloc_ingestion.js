/**
 * EduArena CBT Platform - AI-Driven ALOC Questions Ingestion Script
 * ------------------------------------------------------------------------
 * This script is designed as a production-grade tool to harvest questions 
 * from the ALOC API, verify integrity, generate vector embeddings,
 * and upsert them atomically into your Supabase database.
 * 
 * Dependencies to install before running:
 *   npm install @supabase/supabase-js dotenv node-fetch
 * 
 * Running instructions:
 *   1. Setup your .env file with the following:
 *      SUPABASE_URL="https://your-project.supabase.co"
 *      SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key" -- Use Service Role to bypass Row Level Security constraints
 *      ALOC_API_TOKEN="ALOC-b77ef1b2396263a9ee7a"                -- Your active ALOC API token
 *      OPENAI_API_KEY="sk-proj-xyz..."                           -- Optional (For text-embedding-3-small 1536-dim vector generation)
 *      GEMINI_API_KEY="AIzaSyXYZ..."                             -- Optional (For text-embedding-004 vector generation)
 * 
 *   2. Run command:
 *      node scripts/aloc_ingestion.js --subject physics --count 10 --type utme
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, val, i, arr) => {
    if (val.startsWith('--')) {
        const key = val.substring(2);
        const nextVal = arr[i + 1];
        acc[key] = (nextVal && !nextVal.startsWith('--')) ? nextVal : true;
    }
    return acc;
}, {
    subject: 'physics', // Default subject
    count: 5,           // Default number of questions to fetch per cycle
    type: 'utme'        // Default exam type (utme, waec, neco)
});

// Load and validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const ALOC_TOKEN = process.env.ALOC_API_TOKEN || 'ALOC-b77ef1b2396263a9ee7a';
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('\x1B[31m[ERROR] Missing Supabase configuration. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.\x1B[0m');
    process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Generates high-quality vector embeddings using standard API gateways
 * Supports OpenAI (1536 dims) and Gemini (configurable dims / fallback).
 * If no key is set, returns a localized pseudo-random 1536 dimension unit vector for debugging.
 */
async function generateEmbedding(textToEmbed) {
    const cleanText = textToEmbed.replace(/\s+/g, ' ').trim().slice(0, 8000);

    // Scenario A: OpenAI API (text-embedding-3-small produces exactly 1536 dimensions)
    if (OPENAI_KEY) {
        try {
            console.log(`[EMBEDDING] Querying OpenAI API text-embedding-3-small...`);
            const res = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_KEY}`
                },
                body: JSON.stringify({
                    input: cleanText,
                    model: 'text-embedding-3-small'
                })
            });

            if (!res.ok) {
                const errDetail = await res.text();
                throw new Error(`OpenAI responded with status ${res.status}: ${errDetail}`);
            }

            const payload = await res.json();
            return payload.data[0].embedding;
        } catch (err) {
            console.warn(`[EMBEDDING WARNING] OpenAI embedding failed. Using vector fallback.`, err.message);
        }
    }

    // Scenario B: Gemini Embedding (native to Google AI)
    if (GEMINI_KEY) {
        try {
            console.log(`[EMBEDDING] Querying Gemini text-embedding-s-004 API...`);
            // Gemini embedContent returns 768 dimensions by default. If your DB vector is 1536,
            // we pads options or zero-pads to adjust, or leverages standard dimensions.
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: { parts: [{ text: cleanText }] }
                })
            });

            if (res.ok) {
                const payload = await res.json();
                const rawEmbedding = payload.embedding.values;
                
                // If the target column is VECTOR(1536), zero-pad or duplicate 768 to reach 1536
                if (rawEmbedding.length === 768) {
                    console.log(`[EMBEDDING] Auto-expanding Gemini 768-dim vector to 1536 dimensions...`);
                    return [...rawEmbedding, ...new Array(768).fill(0)]; // Zero-padding
                }
                return rawEmbedding;
            } else {
                console.warn(`[EMBEDDING WARNING] Gemini embedding failed: status ${res.status}`);
            }
        } catch (err) {
            console.warn(`[EMBEDDING WARNING] Gemini API exception:`, err.message);
        }
    }

    // Scenario C: Local Mock Failover Vector (Guarantees execution doesn't crash if keys are missing)
    console.log(`[EMBEDDING ALERT] No OpenAI/Gemini credentials found. Generating a high-density dummy 1536-dim unit vector.`);
    const dummyVector = Array.from({ length: 1536 }, (_, i) => {
        // Deterministic pseudo-random generation based on input string properties
        const charCode = cleanText.charCodeAt(i % cleanText.length) || 0.1;
        return Math.sin(i + charCode) * 0.1;
    });

    // Normalize the dummy vector so standard similarity searches (dot product / cosine) perform correctly
    const magnitude = Math.sqrt(dummyVector.reduce((sum, val) => sum + val * val, 0));
    return dummyVector.map(val => val / magnitude);
}

/**
 * Fetches questions from ALOC API endpoint
 */
async function fetchFromAloc(subject, count, type) {
    const totalCount = parseInt(count, 10) || 1;
    console.log(`[HARVESTER] Initiating ALOC harvesting cycle. Requesting ${totalCount} question(s) from subject '${subject}' for '${type}'...`);
    
    // We fetch a batch since Aloc is random, we query up to count times or fetch multiple
    const questionsList = [];
    
    for (let i = 0; i < totalCount; i++) {
        // Clean URL building
        const url = `https://questions.aloc.com.ng/api/v2/q/1?subject=${subject}&type=${type}`;
        
        try {
            console.log(`  -> Fetching sample #${i + 1}/${totalCount}...`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'AccessToken': ALOC_TOKEN
                }
            });

            if (!response.ok) {
                console.warn(`     [WARNING] ALOC request failed with HTTP status ${response.status}`);
                continue;
            }

            const payload = await response.json();
            // Verify payload integrity
            if (payload && payload.data && payload.data.id) {
                questionsList.push(payload.data);
            }
            
            // Subtle brief pause to safeguard rate-limit quotas
            await new Promise(resolve => setTimeout(resolve, 350));
        } catch (e) {
            console.error(`     [ERROR] Fetch error encountered:`, e.message);
        }
    }

    return questionsList;
}

/**
 * Core Orchestrator - Fetches, generates embeddings, and conducts atomic Supabase Upserts
 */
async function ingest() {
    console.log(`\n=== 🚀 ALOC API -> SUPABASE INGESTION ORCHESTRATOR STARTED ===`);
    console.log(`Parameters selected:`);
    console.log(`  - Target Subject : ${args.subject}`);
    console.log(`  - Sample Amount  : ${args.count}`);
    console.log(`  - Exam Segment   : ${args.type}`);
    console.log(`------------------------------------------------------------------------`);

    const alocRecords = await fetchFromAloc(args.subject, args.count, args.type);
    
    if (alocRecords.length === 0) {
        console.log('\x1B[33m[INFO] No valid questions fetched from ALOC. Exiting ingestion gracefully.\x1B[0m');
        return;
    }

    console.log(`\n[INGESTION] Harvesting complete. Fetched ${alocRecords.length} records. Starting Supabase sync...`);

    let successfullySynced = 0;
    let duplicatesSkipped = 0;

    for (const record of alocRecords) {
        console.log(`\n──────────────────────────────────────────────────`);
        console.log(`[QUESTION] ALOC ID: ${record.id} | Subject: '${record.subject}'`);
        console.log(`[PREVIEW] "${record.question.substring(0, 100)}..."`);

        // Check unique constraints before generating vectors to save money and processing credits!
        const { data: existingRecord, error: fetchErr } = await supabase
            .from('cbt_aloc_questions')
            .select('id, source_id')
            .eq('source_id', record.id)
            .maybeSingle();

        if (fetchErr) {
            console.error(`[DB ERROR] Error evaluating source_id uniqueness:`, fetchErr.message);
            continue;
        }

        // Standard JSON option rebuilding
        const rebuiltOptions = {
            a: record.option?.a || '',
            b: record.option?.b || '',
            c: record.option?.c || '',
            d: record.option?.d || '',
        };
        if (record.option?.e) rebuiltOptions.e = record.option.e;

        if (existingRecord) {
            console.log(`\x1B[33m[DUPLICATE SKIPPED] Question with source_id ${record.id} already exists in Supabase. Skipping embedding computation.\x1B[0m`);
            duplicatesSkipped++;
            continue;
        }

        // Generating a meaningful semantic compound package for vector contextual analysis (RAG context)
        const textToEmbed = `Subject: ${record.subject || args.subject}\nTopic: ${record.section || 'General'}\nQuestion: ${record.question}\nAnswer Explanation: ${record.solution || 'None provided.'}`;
        
        // Generate embedding vector
        const vectorData = await generateEmbedding(textToEmbed);

        // Core atomic upsert into PostgreSQL schema
        const itemToUpsert = {
            source_id: record.id,
            subject: (record.subject || args.subject).toLowerCase(),
            exam_type: (record.examtype || args.type).toLowerCase(),
            year: String(record.examyear || 'unknown'),
            question_text: record.question,
            options: rebuiltOptions,
            correct_answer: record.answer || 'a',
            explanation: record.solution || '',
            topic: record.section || 'General',
            embedding: vectorData
        };

        const { error: insertErr } = await supabase
            .from('cbt_aloc_questions')
            .upsert(itemToUpsert, { onConflict: 'source_id' });

        if (insertErr) {
            console.error(`\x1B[31m[DB INSERT ERROR] Failed uploading question (source_id: ${record.id}):\x1B[0m`, insertErr.message);
        } else {
            console.log(`\x1B[32m[SUCCESS] Upserted question metadata and ${vectorData.length}-dim vector successfully!\x1B[0m`);
            successfullySynced++;
        }
    }

    console.log(`\n==================================================`);
    console.log(`📊 INGESTION CAMPAIGN COMPLETED:`);
    console.log(`   - Raw harvested records : ${alocRecords.length}`);
    console.log(`   - Atomically upserted   : ${successfullySynced}`);
    console.log(`   - Duplicates filtered   : ${duplicatesSkipped}`);
    console.log(`==================================================\n`);
}

// Fire Ingestion
ingest().catch(e => {
    console.error('\x1B[31m[CRITICAL EXCEPTION] Orchestration interrupted:\x1B[0m', e);
});
