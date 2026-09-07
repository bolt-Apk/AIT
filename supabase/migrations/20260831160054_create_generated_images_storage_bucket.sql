/*
# Create generated-images storage bucket

1. New Storage Bucket
  - `generated-images` - stores AI-generated images (PNG files)
  - Public bucket so images can be loaded via URL in the app

2. Security
  - Authenticated users can upload to their own folder (user_id prefix)
  - Authenticated users can read their own images
  - Authenticated users can delete their own images
  - Service role can manage all files (for edge function uploads)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_users_upload_own_images" ON storage.objects;
CREATE POLICY "auth_users_upload_own_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_users_read_own_images" ON storage.objects;
CREATE POLICY "auth_users_read_own_images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'generated-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "public_read_generated_images" ON storage.objects;
CREATE POLICY "public_read_generated_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'generated-images');

DROP POLICY IF EXISTS "auth_users_delete_own_images" ON storage.objects;
CREATE POLICY "auth_users_delete_own_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'generated-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "service_role_all_generated_images" ON storage.objects;
CREATE POLICY "service_role_all_generated_images" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'generated-images');
