/*
# Создание таблицы настроек приложения

1. Новые таблицы
   - `app_settings`
     - `id` (integer, primary key, always 1) — singleton row
     - `aitunnel_api_key` (text) — API ключ AITUNNEL
     - `default_model` (text) — модель по умолчанию
     - `default_resolution` (text) — разрешение по умолчанию
     - `default_aspect_ratio` (text) — соотношение сторон по умолчанию
     - `updated_at` (timestamptz) — дата последнего обновления

2. Безопасность
   - RLS включён
   - Полный доступ для anon и authenticated (приложение без авторизации)

3. Важно
   - Таблица всегда содержит ровно одну строку (id=1)
   - Используется для хранения глобальных настроек приложения
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  aitunnel_api_key text DEFAULT '',
  default_model text NOT NULL DEFAULT 'gpt-image-1',
  default_resolution text NOT NULL DEFAULT '1K',
  default_aspect_ratio text NOT NULL DEFAULT '1:1',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);
