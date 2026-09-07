/*
# Create chat_sessions and tts_history tables for persistent user history

1. New Tables
  - `chat_sessions`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → auth.users, default auth.uid())
    - `title` (text) — chat session title
    - `model` (text) — LLM model used
    - `messages` (jsonb) — array of chat messages
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `tts_history`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → auth.users, default auth.uid())
    - `text` (text) — input text for TTS
    - `model` (text) — TTS model used
    - `voice` (text) — voice used
    - `audio_url` (text) — URL to the stored audio file
    - `created_at` (timestamptz)

2. Indexes
  - user_id + created_at for fast queries

3. Security
  - RLS enabled on both tables
  - Owner-scoped policies (authenticated users see only their own data)
*/

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Новый чат',
  model text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_sessions" ON chat_sessions;
CREATE POLICY "select_own_chat_sessions" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_sessions" ON chat_sessions;
CREATE POLICY "insert_own_chat_sessions" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_sessions" ON chat_sessions;
CREATE POLICY "update_own_chat_sessions" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_sessions" ON chat_sessions;
CREATE POLICY "delete_own_chat_sessions" ON chat_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- TTS History
CREATE TABLE IF NOT EXISTS tts_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  model text NOT NULL,
  voice text NOT NULL,
  audio_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tts_history_user_id ON tts_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_history_created_at ON tts_history(created_at DESC);

ALTER TABLE tts_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tts_history" ON tts_history;
CREATE POLICY "select_own_tts_history" ON tts_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tts_history" ON tts_history;
CREATE POLICY "insert_own_tts_history" ON tts_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tts_history" ON tts_history;
CREATE POLICY "update_own_tts_history" ON tts_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tts_history" ON tts_history;
CREATE POLICY "delete_own_tts_history" ON tts_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
