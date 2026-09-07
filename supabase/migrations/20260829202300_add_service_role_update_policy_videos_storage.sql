/*
# Add UPDATE policy for generated-videos storage bucket

1. Security
  - Adds an UPDATE policy for service_role on the generated-videos storage bucket
  - Needed because video uploads use upsert: true, which requires both INSERT and UPDATE permissions
  - Without this, re-uploads of the same video path fail silently

2. Important notes
  - service_role bypasses RLS, but explicit policies ensure consistent behavior
  - This fixes "Не удалось сохранить видео" errors when videos are re-generated
*/

DROP POLICY IF EXISTS "service_role_update_videos" ON storage.objects;
CREATE POLICY "service_role_update_videos" ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'generated-videos')
  WITH CHECK (bucket_id = 'generated-videos');
