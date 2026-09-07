/*
# Create video_history table

1. New Tables
  - `video_history`
    - `id` (uuid, primary key)
    - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
    - `prompt` (text, not null)
    - `model` (text, not null)
    - `duration` (integer, not null, default 5)
    - `video_url` (text, not null)
    - `created_at` (timestamptz)

2. Security
  - Enable RLS on `video_history`.
  - Owner-scoped CRUD: each authenticated user can only access their own video history.

3. Indexes
  - Index on (user_id, created_at) for efficient history loading.
*/

CREATE TABLE IF NOT EXISTS video_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  model text NOT NULL,
  duration integer NOT NULL DEFAULT 5,
  video_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_history_user_created
  ON video_history (user_id, created_at);

ALTER TABLE video_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_video_history" ON video_history;
CREATE POLICY "select_own_video_history" ON video_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_video_history" ON video_history;
CREATE POLICY "insert_own_video_history" ON video_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_video_history" ON video_history;
CREATE POLICY "update_own_video_history" ON video_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_video_history" ON video_history;
CREATE POLICY "delete_own_video_history" ON video_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
