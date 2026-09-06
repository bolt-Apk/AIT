/*
# Scope video reference image listing to the uploader

## Problem
The storage read policy `auth_select_video_inputs` matched on the bucket alone
(`bucket_id = 'video-inputs'`) and was granted to the `anon` role, so any anonymous
caller could list the `video-inputs` bucket and retrieve the first-frame, last-frame
and reference photographs that users upload for video generation. The matching upload
and delete policies on the same bucket were already correctly folder-scoped.

## Change
1. Security
   - Drops `auth_select_video_inputs`.
   - Adds `owner_read_video_inputs`, restricted to `authenticated` and requiring the
     first path segment to equal the caller's id, matching the existing upload policy.

## Notes
1. The bucket remains public, so reference image URLs already passed to the video
   generation pipeline keep resolving.
*/

DROP POLICY IF EXISTS "auth_select_video_inputs" ON storage.objects;

DROP POLICY IF EXISTS "owner_read_video_inputs" ON storage.objects;
CREATE POLICY "owner_read_video_inputs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'video-inputs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
