/*
# Create storage bucket for TTS audio files

1. Storage
  - Creates 'tts-audio' bucket (public read access for playback)
  - Users can upload to their own folder (user_id prefix)
  - Users can read all files (public bucket)
  - Users can only delete their own files

2. Security
  - Authenticated users can insert into their own path
  - Anyone can read (needed for audio playback)
  - Only owner can delete
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_users_upload_tts" ON storage.objects;
CREATE POLICY "auth_users_upload_tts" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tts-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "public_read_tts" ON storage.objects;
CREATE POLICY "public_read_tts" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tts-audio');

DROP POLICY IF EXISTS "auth_users_delete_own_tts" ON storage.objects;
CREATE POLICY "auth_users_delete_own_tts" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tts-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
