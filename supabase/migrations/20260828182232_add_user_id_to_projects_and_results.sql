/*
# Add user_id to projects and generation_results

1. Modified Tables
  - `projects` — add `user_id` (uuid, references auth.users, default auth.uid())
  - `generation_results` — add `user_id` (uuid, references auth.users, default auth.uid())

2. Security Changes
  - Replace open anon policies with owner-scoped authenticated policies.
  - Users can only see/modify their own projects and generation results.

3. Indexes
  - Add index on user_id for both tables.
*/

-- Add user_id column to projects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Add user_id column to generation_results
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE generation_results ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_results_user_id ON generation_results(user_id);

-- Update projects RLS policies to owner-scoped
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;

CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Update generation_results RLS policies to owner-scoped
DROP POLICY IF EXISTS "anon_select_generation_results" ON generation_results;
DROP POLICY IF EXISTS "anon_insert_generation_results" ON generation_results;
DROP POLICY IF EXISTS "anon_update_generation_results" ON generation_results;
DROP POLICY IF EXISTS "anon_delete_generation_results" ON generation_results;

CREATE POLICY "select_own_results" ON generation_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_results" ON generation_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_results" ON generation_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_results" ON generation_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
