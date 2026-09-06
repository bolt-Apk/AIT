/*
# Add nickname to user_balances + create shared_media table

1. Modified Tables
   - `user_balances`: add `nickname` column (text, unique, nullable)
     - Used for user-to-user media sharing lookup
     - Case-insensitive uniqueness via unique index on lower(nickname)

2. New Tables
   - `shared_media`
     - `id` (uuid, primary key)
     - `sender_id` (uuid, FK to auth.users, who sent the media)
     - `receiver_id` (uuid, FK to auth.users, who receives it)
     - `media_type` (text, 'image' | 'video' | 'audio')
     - `media_url` (text, URL of the media file)
     - `label` (text, description/prompt of the media)
     - `seen` (boolean, default false, whether receiver has seen it)
     - `created_at` (timestamptz)

3. Security
   - RLS enabled on shared_media
   - Sender can insert and see their own sent items
   - Receiver can see and update (mark seen) and delete received items
   - No one can modify someone else's shares

4. Notes
   - Nickname is optional; users set it in Settings
   - Lower-case unique index prevents duplicate nicknames with different casing
*/

-- 1. Add nickname column to user_balances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_balances' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN nickname text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_balances_nickname_lower
  ON user_balances (lower(nickname)) WHERE nickname IS NOT NULL;

-- 2. Create shared_media table
CREATE TABLE IF NOT EXISTS shared_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  media_url text NOT NULL,
  label text NOT NULL DEFAULT '',
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_media_receiver ON shared_media(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_media_sender ON shared_media(sender_id, created_at DESC);

ALTER TABLE shared_media ENABLE ROW LEVEL SECURITY;

-- Sender can see their own sent items
DROP POLICY IF EXISTS "select_own_sent_media" ON shared_media;
CREATE POLICY "select_own_sent_media" ON shared_media FOR SELECT
  TO authenticated USING (auth.uid() = sender_id);

-- Receiver can see items sent to them
DROP POLICY IF EXISTS "select_received_media" ON shared_media;
CREATE POLICY "select_received_media" ON shared_media FOR SELECT
  TO authenticated USING (auth.uid() = receiver_id);

-- Sender can insert (send media to others)
DROP POLICY IF EXISTS "insert_shared_media" ON shared_media;
CREATE POLICY "insert_shared_media" ON shared_media FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Receiver can update (mark as seen)
DROP POLICY IF EXISTS "update_received_media" ON shared_media;
CREATE POLICY "update_received_media" ON shared_media FOR UPDATE
  TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- Receiver can delete received media
DROP POLICY IF EXISTS "delete_received_media" ON shared_media;
CREATE POLICY "delete_received_media" ON shared_media FOR DELETE
  TO authenticated USING (auth.uid() = receiver_id);

-- Sender can delete their own sent media
DROP POLICY IF EXISTS "delete_sent_media" ON shared_media;
CREATE POLICY "delete_sent_media" ON shared_media FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);
