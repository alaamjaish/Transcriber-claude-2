-- AI Tutor Feature Tables
-- This migration adds support for AI tutor functionality with:
-- 1. tutor_settings: Per-user teaching methodology/curriculum
-- 2. ai_chat_sessions: Chat sessions per student
-- 3. ai_chat_messages: Messages within each chat session

-- =============================================
-- Table: tutor_settings
-- Stores each tutor's teaching methodology/curriculum
-- =============================================
CREATE TABLE IF NOT EXISTS public.tutor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  teaching_methodology TEXT NOT NULL DEFAULT '# My Teaching Methodology

## Curriculum Structure

### Level 1: Foundations (Lessons 1-20)
- Number systems and operations
- Variables and expressions
- Basic equations
- Introduction to functions
- Word problems

### Level 2: Intermediate (Lessons 21-40)
- Linear equations and inequalities
- Systems of equations
- Quadratic functions
- Polynomial operations
- Rational expressions

### Level 3: Advanced (Lessons 41-60)
- Exponential and logarithmic functions
- Trigonometry basics
- Sequences and series
- Introduction to calculus concepts

## Teaching Principles
- Build concepts incrementally from simple to complex
- Review previous topics regularly to reinforce learning
- Connect abstract concepts to real-world applications
- Adjust pace based on student performance and understanding
- Encourage active problem-solving and critical thinking

## Common Student Challenges & Solutions
- **Struggle with word problems:** Break down into smaller steps, identify key information
- **Forgetting previous concepts:** Regular spiral review, connect to current lesson
- **Fear of complex problems:** Build confidence with graduated difficulty
- **Calculation errors:** Emphasize checking work, mental math practice

## Assessment Strategy
- Homework after each lesson to reinforce concepts
- Regular quizzes every 5 lessons to check retention
- Comprehensive review every 10 lessons
- Adjust lesson plans based on assessment results
',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.tutor_settings IS 'Stores teaching methodology and curriculum for each tutor';
COMMENT ON COLUMN public.tutor_settings.teaching_methodology IS 'Markdown-formatted curriculum structure and teaching principles';

-- =============================================
-- Table: ai_chat_sessions
-- Stores AI chat sessions for each student
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.ai_chat_sessions IS 'AI chat sessions for student-specific conversations';
COMMENT ON COLUMN public.ai_chat_sessions.title IS 'User-defined title for the conversation';

-- =============================================
-- Table: ai_chat_messages
-- Stores messages within each chat session
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.ai_chat_messages IS 'Messages within AI chat sessions';
COMMENT ON COLUMN public.ai_chat_messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN public.ai_chat_messages.tokens_used IS 'Optional: number of tokens used for this message';

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_student
  ON public.ai_chat_sessions(student_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
  ON public.ai_chat_messages(session_id, created_at ASC);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.tutor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- tutor_settings policies: Users can only access their own settings
CREATE POLICY "Users can view own settings"
  ON public.tutor_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.tutor_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.tutor_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_chat_sessions policies: Users can access sessions for their own students
CREATE POLICY "Users can view sessions for own students"
  ON public.ai_chat_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = ai_chat_sessions.student_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sessions for own students"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = ai_chat_sessions.student_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions for own students"
  ON public.ai_chat_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = ai_chat_sessions.student_id
      AND students.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = ai_chat_sessions.student_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sessions for own students"
  ON public.ai_chat_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = ai_chat_sessions.student_id
      AND students.owner_user_id = auth.uid()
    )
  );

-- ai_chat_messages policies: Users can access messages for sessions they own
CREATE POLICY "Users can view messages for own sessions"
  ON public.ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      JOIN public.students ON students.id = ai_chat_sessions.student_id
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for own sessions"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      JOIN public.students ON students.id = ai_chat_sessions.student_id
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages for own sessions"
  ON public.ai_chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      JOIN public.students ON students.id = ai_chat_sessions.student_id
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
      AND students.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      JOIN public.students ON students.id = ai_chat_sessions.student_id
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
      AND students.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages for own sessions"
  ON public.ai_chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      JOIN public.students ON students.id = ai_chat_sessions.student_id
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
      AND students.owner_user_id = auth.uid()
    )
  );

-- =============================================
-- Grants
-- =============================================
GRANT ALL ON TABLE public.tutor_settings TO anon;
GRANT ALL ON TABLE public.tutor_settings TO authenticated;
GRANT ALL ON TABLE public.tutor_settings TO service_role;

GRANT ALL ON TABLE public.ai_chat_sessions TO anon;
GRANT ALL ON TABLE public.ai_chat_sessions TO authenticated;
GRANT ALL ON TABLE public.ai_chat_sessions TO service_role;

GRANT ALL ON TABLE public.ai_chat_messages TO anon;
GRANT ALL ON TABLE public.ai_chat_messages TO authenticated;
GRANT ALL ON TABLE public.ai_chat_messages TO service_role;
