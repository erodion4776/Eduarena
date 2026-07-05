-- ═══════════════════════════════════════════════════════════════════════════
-- EDU ARENA: USER IDENTITY & AUTHENTICATION DATABASE SCHEMA
-- Target Database: PostgreSQL / Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable secure cryptographic extension for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────
-- 1. USERS IDENTITY TABLE
-- Stores credentials, role level permissions, and active gamification progress
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Securely hashed via bcrypt (Work factor 10)
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'teacher')),
    school_id VARCHAR(100),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    rank VARCHAR(100) DEFAULT 'Bronze Scholar',
    badges JSONB DEFAULT '[]'::jsonb, -- Array of strings e.g. ["a1", "badge_2"]
    wins INTEGER DEFAULT 0 CHECK (wins >= 0),
    losses INTEGER DEFAULT 0 CHECK (losses >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Fast lookup for user validation on login
CREATE INDEX IF NOT EXISTS idx_users_auth_email ON public.users_auth(email);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ACTIVE USER SESSIONS (JWT / Refresh Tokens)
-- Manages session state, handles token revocation, and holds user metadata
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_auth(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- Cryptographic hash of the token
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexing for fast token search and automatic cleanup audits
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.user_sessions(token_hash);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures user data isolation and role-based permissions
-- ─────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.users_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write only their own profiles
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.users_auth;
CREATE POLICY "Users can manage own profiles" ON public.users_auth
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Administrators have read permissions on all student records
DROP POLICY IF EXISTS "Admins can view all records" ON public.users_auth;
CREATE POLICY "Admins can view all records" ON public.users_auth
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_auth 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can manage their own active sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
