-- EduArena Exam Archive Schema (PostgreSQL/Supabase)

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT CHECK (category IN ('Science', 'Arts', 'Commercial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics Table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    syllabus_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, name)
);

-- Questions Bank Table
CREATE TYPE exam_body_enum AS ENUM ('JAMB', 'WAEC', 'NECO');

CREATE TABLE questions_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_body exam_body_enum NOT NULL,
    year INTEGER CHECK (year >= 1983 AND year <= 2025),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    question_content TEXT NOT NULL, -- Supports Markdown/LaTeX
    options JSONB NOT NULL, -- Format: {"A": "Choice 1", "B": "Choice 2", ...}
    correct_option CHAR(1) NOT NULL,
    explanation TEXT,
    image_url TEXT,
    difficulty_score INTEGER DEFAULT 5 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_questions_exam_year_subject ON questions_bank(exam_body, year, subject_id);
CREATE INDEX idx_questions_topic ON questions_bank(topic_id);
CREATE INDEX idx_questions_subject ON questions_bank(subject_id);

-- AI Professor "Training" View
-- This view aggregates questions by topic to facilitate tutorial generation
CREATE VIEW ai_professor_training_view AS
SELECT 
    t.id AS topic_id,
    t.name AS topic_name,
    s.name AS subject_name,
    t.syllabus_description,
    COUNT(q.id) AS question_count,
    json_agg(json_build_object(
        'id', q.id,
        'year', q.year,
        'exam', q.exam_body,
        'content', q.question_content,
        'difficulty', q.difficulty_score
    )) AS sample_questions
FROM topics t
JOIN subjects s ON t.subject_id = s.id
LEFT JOIN questions_bank q ON t.id = q.topic_id
GROUP BY t.id, s.name, t.syllabus_description;
