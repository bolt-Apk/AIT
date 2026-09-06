/*
# Create storage bucket for generated videos

1. Storage
  - Creates 'generated-videos' bucket (public read access for playback/download)
  - Service role uploads video files after generation completes
  - Anyone can read (needed for video playback in browser)
  - Only authenticated users can delete their own files

2. Security
  - Public read for all users (video playback)
  - Service role handles all uploads from edge functions
  - Authenticated users can delete their own path-prefixed files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-videos', 'generated-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_videos" ON storage.objects;
CREATE POLICY "public_read_videos" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'generated-videos');

DROP POLICY IF EXISTS "service_role_upload_videos" ON storage.objects;
CREATE POLICY "service_role_upload_videos" ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'generated-videos');

DROP POLICY IF EXISTS "auth_users_delete_own_videos" ON storage.objects;
CREATE POLICY "auth_users_delete_own_videos" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'generated-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
