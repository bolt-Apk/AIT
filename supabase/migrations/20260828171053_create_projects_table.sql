/*
# Создание таблицы проектов

1. Новые таблицы
   - `projects`
     - `id` (uuid, первичный ключ) — уникальный идентификатор проекта
     - `name` (text, not null) — название проекта
     - `thumbnail` (text) — URL миниатюры проекта
     - `created_at` (timestamptz) — дата создания
     - `updated_at` (timestamptz) — дата последнего изменения

2. Безопасность
   - RLS включён на таблице `projects`
   - Полный CRUD доступ для anon и authenticated (приложение без авторизации)
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  thumbnail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);
