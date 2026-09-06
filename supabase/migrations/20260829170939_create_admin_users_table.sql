/*
# Create admin_users table

Stores user IDs that have admin privileges for the /stup admin panel.

1. New Tables
   - `admin_users`
     - `id` (uuid, primary key, references auth.users)
     - `created_at` (timestamptz)
2. Security
   - Enable RLS on `admin_users`
   - Only authenticated users can SELECT their own row (to check if they are admin)
   - No INSERT/UPDATE/DELETE via client — admin rows are managed via SQL only

3. Seed: Insert the project owner as the first admin
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_own" ON admin_users;
CREATE POLICY "admin_select_own" ON admin_users FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Seed: make ismail19911@mail.ru the first admin
INSERT INTO admin_users (id)
SELECT id FROM auth.users WHERE email = 'ismail19911@mail.ru'
ON CONFLICT (id) DO NOTHING;
