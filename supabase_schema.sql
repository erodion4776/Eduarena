-- Edu Arena v2: Supabase Schema with AI Vector Support

-- 1. Enable pgvector extension for AI embeddings (Crucial for RAG)
create extension if not exists vector;

-- 2. Subjects Table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
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
create policy "Allow public read access to subjects" on public.subjects for select using (true);
create policy "Allow public read access to topics" on public.topics for select using (true);
create policy "Allow public read access to questions" on public.questions for select using (true);
create policy "Allow public read access to document_chunks" on public.document_chunks for select using (true);
