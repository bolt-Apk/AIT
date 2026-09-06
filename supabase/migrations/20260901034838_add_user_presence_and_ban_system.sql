/*
# Add User Presence Tracking and Ban System

1. New Tables
  - `user_presence`
    - `user_id` (uuid, primary key, references auth.users)
    - `last_seen` (timestamptz) - last heartbeat timestamp
    - `device_type` (text) - 'desktop' or 'mobile'
    - `is_online` (boolean, computed from last_seen)

2. Modified Tables
  - `user_balances`
    - `banned_at` (timestamptz, nullable) - when the user was banned
    - `ban_reason` (text, nullable) - reason for the ban

3. Security
  - RLS on `user_presence`: users can upsert their own row, admins read all via service role
  - Ban columns on user_balances are protected by existing RLS (only service role can write)

4. Notes
  - Presence is tracked via periodic heartbeat from the client
  - A user is considered "online" if last_seen is within 2 minutes
  - Ban check should happen at auth level in the app
*/

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  device_type text NOT NULL DEFAULT 'desktop',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_presence" ON user_presence;
CREATE POLICY "select_own_presence" ON user_presence FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_presence" ON user_presence;
CREATE POLICY "insert_own_presence" ON user_presence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_presence" ON user_presence;
CREATE POLICY "update_own_presence" ON user_presence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_presence" ON user_presence;
CREATE POLICY "delete_own_presence" ON user_presence FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add ban columns to user_balances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_balances' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN banned_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_balances' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN ban_reason text;
  END IF;
END $$;

-- Index for quick online user lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);
