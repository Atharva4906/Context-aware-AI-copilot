-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. The "Encyclopedia" Engine (Vector Storage)
-- Stores the scientifically documented "Common Misconceptions" to prevent LLM hallucination.
CREATE TABLE IF NOT EXISTS common_misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    flawed_logic_description TEXT NOT NULL,
    embedding vector(768), -- Assuming 768 dimensions based on typical models, adjust if your embedder uses different dims
    remedial_strategy TEXT NOT NULL
);

-- 2. "Student Memory" Engine (Relational Storage)
-- Tracks exactly what a specific user knows and struggles with over time.
CREATE TABLE IF NOT EXISTS users (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT CHECK (role IN ('student', 'educator')) DEFAULT 'student',
    learning_profile JSONB DEFAULT '{}'::jsonb,
    weak_concepts TEXT[] DEFAULT '{}'
);

-- 3. The RL Tracker
-- Maps a specific student to the specific misconceptions they've encountered.
CREATE TYPE status_enum AS ENUM ('unresolved', 'reviewing', 'resolved');

CREATE TABLE IF NOT EXISTS student_misconception_state (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(student_id) ON DELETE CASCADE,
    misconception_id UUID REFERENCES common_misconceptions(id) ON DELETE CASCADE,
    status status_enum DEFAULT 'unresolved',
    encounter_count INTEGER DEFAULT 1,
    last_triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, misconception_id)
);

-- 4. Context Window for CrewAI Agents
-- The interaction logs to track historical conversation context.
CREATE TABLE IF NOT EXISTS interaction_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(student_id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RL Diagnostic Policy (Contextual Bandits)
-- Tracks the epsilon-greedy policy states and action confidence values
CREATE TABLE IF NOT EXISTS rl_diagnostic_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_hash TEXT NOT NULL,
    predicted_topic TEXT NOT NULL,
    confidence_score NUMERIC DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (pattern_hash, predicted_topic)
);

-- 6. Curriculum Knowledge Graph
-- Predicts future downstream failures for an error pattern
CREATE TABLE IF NOT EXISTS curriculum_knowledge_graph (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prerequisite_topic TEXT NOT NULL,
    dependent_topic TEXT NOT NULL,
    UNIQUE (prerequisite_topic, dependent_topic)
);

-- 7. Platform Questions
-- Stores the questions across various categories
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('Math', 'Physics', 'English', 'Coding')),
    content TEXT NOT NULL,
    options JSONB, -- JSON array if MCQ, null if conversational
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7b. Question Answer Keys (separate table; references questions)
-- Stores correct answer metadata without altering the questions table.
CREATE TABLE IF NOT EXISTS question_answer_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    correct_answer TEXT,
    correct_answer_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_correct_answer_index_non_negative CHECK (
        correct_answer_index IS NULL OR correct_answer_index >= 0
    )
);

-- 8. Alter Interaction Logs to support history dashboard
-- Add columns to link interactions to specific questions and track resolution
ALTER TABLE interaction_logs 
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS predicted_misconception TEXT;

-- 9. Misconception Review Queue (Admin Approval)
-- New misconceptions are stored in common_misconceptions but gated here until approved.
CREATE TABLE IF NOT EXISTS misconception_review_queue (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    misconception_id UUID REFERENCES common_misconceptions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    similarity_score NUMERIC,
    source_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    source_student_id UUID REFERENCES users(student_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 10. Curriculum Graph Review Queue (Admin Approval)
CREATE TABLE IF NOT EXISTS curriculum_graph_review_queue (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prerequisite_topic TEXT NOT NULL,
    dependent_topic TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    source_misconception_id UUID REFERENCES common_misconceptions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);
