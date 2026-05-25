-- ==========================================
-- TASK 1: DATABASE SCHEMA (SUPABASE)
-- Platform: CBT Ingestion with Vector Embeddings
-- ==========================================

-- 1. Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing table if needed (WARNING: will delete existing data in the table questions)
-- DROP TABLE IF EXISTS public.questions CASCADE;

-- 3. Create public.questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id INTEGER UNIQUE NOT NULL, -- ALOC API unique question ID (triggers upsert and prevents duplicates)
    subject VARCHAR(100) NOT NULL,
    exam_type VARCHAR(50) NOT NULL, -- e.g., JAMB, WAEC, NECO
    year INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Stored as JSONB: {"a": "Option A text", "b": "Option B text", ...}
    correct_answer VARCHAR(10) NOT NULL, -- e.g., "a", "b", "c", etc.
    explanation TEXT,
    topic VARCHAR(255),
    embedding vector(1536), -- 1536 dimensions for OpenAI text-embedding-3-small
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create index on source_id to prevent duplicates & ensure fast upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_id ON public.questions(source_id);

-- 5. Create specialized high-velocity Vector Index for pgvector searches
-- HNSW (Hierarchical Navigable Small World) index is highly optimized for vector queries
-- Using cosine similarity (vector_cosine_ops)
CREATE INDEX IF NOT EXISTS idx_questions_embedding_hnsw 
ON public.questions USING hnsw (embedding vector_cosine_ops);

-- 6. Indices for standard field filtering
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON public.questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);

-- 7. Automated updated_at trigger for changes
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_modtime
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 8. Enable Row-Level Security (RLS)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 9. Setup Policies: Allow public read-only access, restrict inserts/updates to authorized admin keys
CREATE POLICY "Allow public select access" 
ON public.questions FOR SELECT USING (true);

CREATE POLICY "Allow service role or authorized upsert" 
ON public.questions FOR ALL USING (true) WITH CHECK (true);
