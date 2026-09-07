/*
# Add unique constraint on video_history.video_url

1. Changes
   - Adds a UNIQUE constraint on the `video_url` column in `video_history`
     to prevent duplicate entries for the same video at the database level.

2. Notes
   - Existing duplicates were cleaned before applying this migration.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'video_history_video_url_key'
  ) THEN
    ALTER TABLE video_history ADD CONSTRAINT video_history_video_url_key UNIQUE (video_url);
  END IF;
END $$;
