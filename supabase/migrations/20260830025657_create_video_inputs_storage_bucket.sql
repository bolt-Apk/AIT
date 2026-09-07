/*
# Create video-inputs storage bucket

1. New Storage Bucket
   - `video-inputs` — stores user-uploaded images (first frame, last frame, style reference) 
     that are sent to the video generation API as URLs.
   
2. Security
   - Authenticated users can upload to their own folder (user_id prefix).
   - Authenticated users can read their own uploads.
   - Public access enabled so the video generation API can fetch the images by URL.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-inputs', 'video-inputs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_video_inputs" ON storage.objects;
CREATE POLICY "auth_upload_video_inputs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'video-inputs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_select_video_inputs" ON storage.objects;
CREATE POLICY "auth_select_video_inputs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'video-inputs');

DROP POLICY IF EXISTS "auth_delete_video_inputs" ON storage.objects;
CREATE POLICY "auth_delete_video_inputs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'video-inputs' AND (storage.foldername(name))[1] = auth.uid()::text);
