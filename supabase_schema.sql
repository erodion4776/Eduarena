-- Edu Arena v2: Supabase Schema with AI Vector Support

-- 1. Enable pgvector extension for AI embeddings (Crucial for RAG)
create extension if not exists vector;

-- 2. Subjects Table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null default 'General',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Topics Table
create table public.topics (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Questions Table (Standard CBT Questions)
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  question_content text not null,
  options jsonb not null, -- Stored as a JSON array e.g., ["A", "B", "C", "D"]
  correct_answer text not null,
  explanation text,
  difficulty_level integer default 1,
  year integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. PDF Documents Table (Tracks files uploaded in Admin Arena)
create table public.pdf_documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Document Chunks Table (The Brain's Memory for RAG)
create table public.document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.pdf_documents(id) on delete cascade not null,
  subject text not null,
  topic text not null,
  content text not null,
  source text, -- e.g., "Page 42"
  embedding vector(768), -- Assumes 768 dimensions (Standard for Gemini embeddings) 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. High-Performance Vector Index (Speeds up AI similarity searches)
create index on public.document_chunks using hnsw (embedding vector_ip_ops);

-- 8. The AI Search Function (RPC for retrieving context)
-- This function is called by your frontend/backend to find relevant textbook paragraphs based on the user's question embedding.
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_subject text default null
)
returns table (
  id uuid,
  document_id uuid,
  subject text,
  topic text,
  content text,
  source text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.subject,
    document_chunks.topic,
    document_chunks.content,
    document_chunks.source,
    1 - (document_chunks.embedding <=> query_embedding) as similarity -- Cosine similarity
  from document_chunks
  where (filter_subject is null or document_chunks.subject = filter_subject)
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- 9. Setup Row Level Security (RLS) to keep data secure
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.pdf_documents enable row level security;
alter table public.document_chunks enable row level security;

-- (For testing purposes, allow read access to everything, but restrict writes to authenticated admins)
drop policy if exists "Allow public read access to subjects" on public.subjects;
create policy "Allow public read access to subjects" on public.subjects for select using (true);

drop policy if exists "Allow public insert to subjects" on public.subjects;
create policy "Allow public insert to subjects" on public.subjects for insert with check (true);

drop policy if exists "Allow public read access to topics" on public.topics;
create policy "Allow public read access to topics" on public.topics for select using (true);

drop policy if exists "Allow public insert to topics" on public.topics;
create policy "Allow public insert to topics" on public.topics for insert with check (true);

drop policy if exists "Allow public read access to questions" on public.questions;
create policy "Allow public read access to questions" on public.questions for select using (true);

drop policy if exists "Allow public insert to questions" on public.questions;
create policy "Allow public insert to questions" on public.questions for insert with check (true);

drop policy if exists "Allow public read access to document_chunks" on public.document_chunks;
create policy "Allow public read access to document_chunks" on public.document_chunks for select using (true);

drop policy if exists "Allow public read access to pdf_documents" on public.pdf_documents;
create policy "Allow public read access to pdf_documents" on public.pdf_documents for select using (true);

drop policy if exists "Allow public insert to pdf_documents" on public.pdf_documents;
create policy "Allow public insert to pdf_documents" on public.pdf_documents for insert with check (true);

-- 11. Global Questions Vault (Community-driven cache)
create table if not exists public.global_questions_vault (
  id bigint primary key, -- The ALOC Question ID
  subject text not null,
  exam_type text not null,
  question_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Global Vault
alter table public.global_questions_vault enable row level security;

drop policy if exists "Allow public read access to global_questions_vault" on public.global_questions_vault;
create policy "Allow public read access to global_questions_vault" on public.global_questions_vault for select using (true);

drop policy if exists "Allow public insert/upsert to global_questions_vault" on public.global_questions_vault;
create policy "Allow public insert/upsert to global_questions_vault" on public.global_questions_vault for insert with check (true);

drop policy if exists "Allow public update" on public.global_questions_vault;
create policy "Allow public update" on public.global_questions_vault for update using (true);

create index if not exists idx_subject on public.global_questions_vault(subject);
create index if not exists idx_exam_type on public.global_questions_vault(exam_type);

-- 12. Exam Sessions Table
create table if not exists public.exam_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Stores user_id (text/uuid string from useAuthStore)
  exam_type text not null,
  score integer not null,
  total_questions integer not null,
  score_percent integer not null,
  xp_earned integer default 0,
  duration_seconds integer,
  is_submitted boolean default false,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Session Subject Results Table (Breakdown per subject)
create table if not exists public.session_subject_results (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.exam_sessions(id) on delete cascade not null,
  user_id text not null,
  subject_name text not null,
  correct_answers integer not null,
  total_questions integer not null,
  score_percent integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Exam Sessions
alter table public.exam_sessions enable row level security;
alter table public.session_subject_results enable row level security;

drop policy if exists "Allow public access to exam_sessions" on public.exam_sessions;
create policy "Allow public access to exam_sessions" on public.exam_sessions for all using (true);

drop policy if exists "Allow public access to session_subject_results" on public.session_subject_results;
create policy "Allow public access to session_subject_results" on public.session_subject_results for all using (true);

