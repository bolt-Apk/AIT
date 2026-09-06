/*
# Add free_mode toggle to app_settings

1. Modified Tables
  - `app_settings` — added `free_mode` boolean column (default false)
    When true, all generation functions skip balance checks and token deduction.

2. Security
  - No policy changes needed (existing policies cover the column).
*/

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS free_mode boolean NOT NULL DEFAULT false;