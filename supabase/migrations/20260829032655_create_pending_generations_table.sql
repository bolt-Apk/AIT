/*
# Create pending_generations table for background task resumption

Tracks in-flight generation tasks (video only, since image and TTS are synchronous).
When a user starts a video generation and leaves/refreshes the page, the app can
resume polling on next visit by reading incomplete tasks from this table.

1. New Tables
  - `pending_generations`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users, defaults to auth.uid())
    - `type` (text, e.g. 'video')
    - `generation_id` (text, the external API generation ID used for polling)
    - `prompt` (text, the prompt used)
    - `model` (text, the model used)
    - `duration` (integer, video duration in seconds)
    - `aspect_ratio` (text, video aspect ratio)
    - `estimated_cost` (numeric, estimated cost in rubles)
    - `status` (text, one of: pending, completed, failed)
    - `result_url` (text, nullable, set on completion)
    - `error_message` (text, nullable, set on failure)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

2. Security
  - Enable RLS
  - Owner-scoped CRUD: each user can only access their own pending tasks
*/

CREATE TABLE IF NOT EXISTS pending_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'video',
  generation_id text NOT NULL,
  prompt text NOT NULL,
  model text NOT NULL,
  duration integer,
  aspect_ratio text,
  estimated_cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  result_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_generations_user_status
  ON pending_generations(user_id, status);

ALTER TABLE pending_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pending" ON pending_generations;
CREATE POLICY "select_own_pending" ON pending_generations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pending" ON pending_generations;
CREATE POLICY "insert_own_pending" ON pending_generations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pending" ON pending_generations;
CREATE POLICY "update_own_pending" ON pending_generations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pending" ON pending_generations;
CREATE POLICY "delete_own_pending" ON pending_generations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
