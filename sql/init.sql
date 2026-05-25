-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    points INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    role TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (Recommended)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Cache table for AI responses
CREATE TABLE IF NOT EXISTS public.ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_hash TEXT NOT NULL,
    response_type TEXT NOT NULL,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(question_hash, response_type)
);
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- Exam Results
CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    subject_id UUID REFERENCES public.subjects(id),
    score FLOAT NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Topic Mastery
CREATE TABLE IF NOT EXISTS public.topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    topic_name TEXT NOT NULL,
    mastery_score FLOAT DEFAULT 0
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

-- Leagues
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, 
    requirement_points INTEGER NOT NULL
);

-- Weekly Challenges
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Challenge Participants
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES public.weekly_challenges(id),
    user_id UUID REFERENCES public.users(id),
    points INTEGER DEFAULT 0,
    rank_position INTEGER
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    xp_reward INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    achievement_id UUID REFERENCES public.achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Default Subjects Seed
INSERT INTO public.subjects (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Mathematics'),
    ('00000000-0000-0000-0000-000000000002', 'English'),
    ('00000000-0000-0000-0000-000000000003', 'Physics'),
    ('00000000-0000-0000-0000-000000000004', 'Chemistry'),
    ('00000000-0000-0000-0000-000000000005', 'Biology')
ON CONFLICT DO NOTHING;

-- Default Leagues Seed
INSERT INTO public.leagues (name, requirement_points) VALUES
    ('🥉 Bronze League', 0),
    ('🥈 Silver League', 500),
    ('🥇 Gold League', 1500),
    ('💎 Diamond League', 3000)
ON CONFLICT DO NOTHING;

-- Default Achievements Seed
INSERT INTO public.achievements (title, description, category, xp_reward) VALUES
    ('First Exam Completed', 'Complete your very first practice CBT test.', 'Academic', 100),
    ('Perfect Score Master', 'Get a flawless 100% score on any topic test.', 'Academic', 300),
    ('Curious Mind', 'Inquire with the AI Tutor 10 times during practice.', 'AI Learning', 150),
    ('Consistency King', 'Maintain a study streak of 7 active days.', 'Consistency', 250),
    ('Speed Solver Champion', 'Complete a full WAEC or JAMB exam under 30 minutes.', 'Performance', 200),
    ('Subject Champion', 'Pass tests of 5 different subjects.', 'Academic', 250)
ON CONFLICT DO NOTHING;


-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'ai', 'exam', 'study', 'gamification', 'leaderboard', 'system'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    action_link TEXT
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


