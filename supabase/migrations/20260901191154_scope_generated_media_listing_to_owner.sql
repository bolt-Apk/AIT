/*
# Scope generated media listing to the owner

## Problem
Three storage read policies (`public_read_generated_images`, `public_read_videos`,
`public_read_tts`) matched on the bucket alone and were granted to the `anon` role.
Any anonymous caller could therefore list the contents of the `generated-images`,
`generated-videos` and `tts-audio` buckets and enumerate, then download, every user's
generated pictures, videos and voice-overs. Object paths are prefixed with the owning
user's id and a random file name, so listing was the only thing standing between an
outsider and all of it.

## Change
1. Security
   - Drops the three bucket-wide read policies.
   - Adds owner-folder-scoped read policies for the same three buckets, restricted to
     `authenticated` and requiring the first path segment to equal the caller's id.

## Notes
1. The buckets remain public, so image, video and audio URLs already handed out keep
   loading in the browser and shared media keeps working for recipients.
2. No part of the application lists bucket contents, so this change removes only the
   enumeration capability.
*/

DROP POLICY IF EXISTS "public_read_generated_images" ON storage.objects;
DROP POLICY IF EXISTS "public_read_videos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_tts" ON storage.objects;

DROP POLICY IF EXISTS "owner_read_generated_images" ON storage.objects;
CREATE POLICY "owner_read_generated_images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "owner_read_generated_videos" ON storage.objects;
CREATE POLICY "owner_read_generated_videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "owner_read_tts_audio" ON storage.objects;
CREATE POLICY "owner_read_tts_audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tts-audio'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
