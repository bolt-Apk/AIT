/*
# Создание таблицы блоков пайплайна

1. Новые таблицы
   - `pipeline_blocks`
     - `id` (uuid, первичный ключ) — уникальный идентификатор блока
     - `project_id` (uuid, FK → projects.id) — проект, которому принадлежит блок
     - `type` (text, not null) — тип блока (source, generate, remove-object, replace-bg, stylize, enhance, expand, effect, result)
     - `label` (text, not null) — отображаемое название блока
     - `icon` (text) — название иконки
     - `position` (integer, not null) — порядковый номер блока в пайплайне
     - `settings` (jsonb) — настройки блока
     - `created_at` (timestamptz) — дата создания

2. Индексы
   - По project_id для быстрой выборки блоков проекта
   - По (project_id, position) для сортировки

3. Безопасность
   - RLS включён
   - Полный CRUD доступ для anon и authenticated
*/

CREATE TABLE IF NOT EXISTS pipeline_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  icon text,
  position integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_blocks_project_id ON pipeline_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_blocks_position ON pipeline_blocks(project_id, position);

ALTER TABLE pipeline_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pipeline_blocks" ON pipeline_blocks;
CREATE POLICY "anon_select_pipeline_blocks" ON pipeline_blocks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pipeline_blocks" ON pipeline_blocks;
CREATE POLICY "anon_insert_pipeline_blocks" ON pipeline_blocks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pipeline_blocks" ON pipeline_blocks;
CREATE POLICY "anon_update_pipeline_blocks" ON pipeline_blocks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pipeline_blocks" ON pipeline_blocks;
CREATE POLICY "anon_delete_pipeline_blocks" ON pipeline_blocks FOR DELETE
  TO anon, authenticated USING (true);
