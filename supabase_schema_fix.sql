-- ==========================================================
-- FIX SCRIPT: Securely add missing columns to existing table
-- This script will NOT delete your existing questions.
-- ==========================================================

-- 1. Ensure extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add columns if they do not exist
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source_id INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer VARCHAR(10);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

-- 3. Add Indices safely
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_id ON public.questions(source_id);
CREATE INDEX IF NOT EXISTS idx_questions_embedding_hnsw ON public.questions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON public.questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
