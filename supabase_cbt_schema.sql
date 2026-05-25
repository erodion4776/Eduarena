-- =========================================================================
--              EduArena CBT Platform - Supabase PostgreSQL Schema
--               Vector RAG Search & Duplicate Prevention Index Setup
-- =========================================================================

-- 1. Enable pgvector extension for AI semantic searches
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. CBT Aloc Questions Table
CREATE TABLE IF NOT EXISTS public.cbt_aloc_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id INT UNIQUE NOT NULL,                       -- Native ID from Aloc API to enforce strict uniqueness and prevent duplicates
    subject VARCHAR(100) NOT NULL,                       -- e.g. 'physics', 'mathematics', 'english'
    exam_type VARCHAR(50) NOT NULL,                      -- e.g. 'utme', 'waec', 'neco'
    year VARCHAR(10) NOT NULL,                           -- e.g. '2018', '2020'
    question_text TEXT NOT NULL,                         -- Main question body
    options JSONB NOT NULL,                              -- Options schema, e.g., {"a": "Choice A", "b": "Choice B", "c": "Choice C", "d": "Choice D"}
    correct_answer VARCHAR(10) NOT NULL,                 -- e.g. "a", "b", "c", or "d"
    explanation TEXT,                                    -- Detailed guide / solution walkthrough
    topic VARCHAR(255),                                  -- Specific subject subtopic, e.g. "Electrostatics"
    embedding VECTOR(1536),                              -- Vector embeddings column for pgvector (supports OpenAI, Hugging Face, or custom models)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 3. Dynamic B-Tree indexing on filtering keys for blazing-fast conditional queries
CREATE INDEX IF NOT EXISTS idx_cbt_aloc_questions_subject ON public.cbt_aloc_questions(subject);
CREATE INDEX IF NOT EXISTS idx_cbt_aloc_questions_exam_type ON public.cbt_aloc_questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_cbt_aloc_questions_year ON public.cbt_aloc_questions(year);

-- 4. High-Performance HNSW Vector Indexing using Cosine Distance (Bypasses slow sequential table scans during RAG)
CREATE INDEX IF NOT EXISTS idx_cbt_aloc_questions_embedding_hnsw 
ON public.cbt_aloc_questions 
USING hnsw (embedding vector_cosine_ops);

-- 5. Row Level Security Configuration (Security Hardening)
ALTER TABLE public.cbt_aloc_questions ENABLE ROW LEVEL SECURITY;

-- Select operations can be public (for student lookups)
DROP POLICY IF EXISTS "Allow public read access to CBT Questions" ON public.cbt_aloc_questions;
CREATE POLICY "Allow public read access to CBT Questions" ON public.cbt_aloc_questions FOR SELECT USING (true);

-- Writes, updates, deletions require authentication
DROP POLICY IF EXISTS "Admins can insert or modify CBT Questions" ON public.cbt_aloc_questions;
CREATE POLICY "Admins can insert or modify CBT Questions" ON public.cbt_aloc_questions 
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- 6. Remote Procedure Call (RPC) Function for Semantic RAG Question Search
-- This gets triggered securely from your Node.js/Python server to fetch the most contextually relevant questions.
CREATE OR REPLACE FUNCTION match_cbt_questions (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_subject TEXT DEFAULT NULL,
  filter_exam_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id INT,
  subject TEXT,
  exam_type TEXT,
  year TEXT,
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  topic TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cbt_aloc_questions.id,
    cbt_aloc_questions.source_id,
    cbt_aloc_questions.subject::TEXT,
    cbt_aloc_questions.exam_type::TEXT,
    cbt_aloc_questions.year::TEXT,
    cbt_aloc_questions.question_text,
    cbt_aloc_questions.options,
    cbt_aloc_questions.correct_answer::TEXT,
    cbt_aloc_questions.explanation,
    cbt_aloc_questions.topic::TEXT,
    1 - (cbt_aloc_questions.embedding <=> query_embedding) AS similarity -- Math: 1 minus cosine distance
  FROM cbt_aloc_questions
  WHERE (filter_subject IS NULL OR cbt_aloc_questions.subject = filter_subject)
    AND (filter_exam_type IS NULL OR cbt_aloc_questions.exam_type = filter_exam_type)
    AND 1 - (cbt_aloc_questions.embedding <=> query_embedding) > match_threshold
  ORDER BY cbt_aloc_questions.embedding <=> query_embedding
  LIMIT match_count;
$$;
