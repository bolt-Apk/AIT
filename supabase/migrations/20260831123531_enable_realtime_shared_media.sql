/*
# Enable Realtime on shared_media

1. Changes
   - Adds shared_media table to the supabase_realtime publication
     so INSERT events are broadcast instantly to subscribed clients.

2. Notes
   - Idempotent: checks whether shared_media is already in the publication before adding.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'shared_media'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shared_media;
  END IF;
END $$;
