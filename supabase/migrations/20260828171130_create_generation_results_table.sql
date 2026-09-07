/*
# Создание таблицы результатов генерации

1. Новые таблицы
   - `generation_results`
     - `id` (uuid, первичный ключ) — уникальный идентификатор результата
     - `project_id` (uuid, FK → projects.id) — проект, к которому относится генерация
     - `image_url` (text, not null) — URL сгенерированного изображения
     - `prompt` (text) — текстовый запрос, использованный для генерации
     - `variants` (jsonb) — массив URL вариантов генерации
     - `settings` (jsonb) — параметры генерации (модель, шаги, масштаб и т.д.)
     - `created_at` (timestamptz) — дата генерации

2. Индексы
   - По project_id для быстрой выборки результатов проекта
   - По created_at для сортировки по времени

3. Безопасность
   - RLS включён
   - Полный CRUD доступ для anon и authenticated
*/

CREATE TABLE IF NOT EXISTS generation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  prompt text,
  variants jsonb DEFAULT '[]',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_results_project_id ON generation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_results_created_at ON generation_results(created_at DESC);

ALTER TABLE generation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_generation_results" ON generation_results;
CREATE POLICY "anon_select_generation_results" ON generation_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_generation_results" ON generation_results;
CREATE POLICY "anon_insert_generation_results" ON generation_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_generation_results" ON generation_results;
CREATE POLICY "anon_update_generation_results" ON generation_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_generation_results" ON generation_results;
CREATE POLICY "anon_delete_generation_results" ON generation_results FOR DELETE
  TO anon, authenticated USING (true);
