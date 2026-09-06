/*
# Create image_history table

1. New Tables
  - `image_history`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users, default auth.uid())
    - `prompt` (text, not null)
    - `model` (text, not null)
    - `image_url` (text, not null) - base64 data URL or storage URL
    - `created_at` (timestamptz)

2. Security
  - RLS enabled, owner-scoped CRUD for authenticated users.
*/

CREATE TABLE IF NOT EXISTS image_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  model text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_history_user_id ON image_history(user_id, created_at DESC);

ALTER TABLE image_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_images" ON image_history;
CREATE POLICY "select_own_images" ON image_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_images" ON image_history;
CREATE POLICY "insert_own_images" ON image_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_images" ON image_history;
CREATE POLICY "update_own_images" ON image_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_images" ON image_history;
CREATE POLICY "delete_own_images" ON image_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
