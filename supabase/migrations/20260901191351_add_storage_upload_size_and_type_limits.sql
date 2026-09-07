/*
# Add upload size and file type limits to every storage bucket

## Problem
All five storage buckets had `file_size_limit` and `allowed_mime_types` set to null,
meaning no size or type restriction of any kind. Because every bucket is public, any
signed-in user could upload arbitrary files of arbitrary type and size and have them
served on a public URL under the operator's domain, turning the storage into a free
file host and a route for distributing unrelated content, as well as exhausting the
storage quota.

## Change
1. Security
   - Sets a per-bucket size ceiling and an allow-list of content types on
     `generated-images`, `generated-videos`, `tts-audio`, `video-inputs` and
     `support-attachments`.

## Notes
1. The limits are deliberately generous and cover every type the application itself
   uploads today: PNG, JPEG, WebP and GIF pictures; MP4, WebM and QuickTime video;
   MPEG, WAV, OGG and MP4 audio; and for support attachments, pictures plus PDF and
   plain text.
2. Existing objects are unaffected; the limits apply to new uploads.
*/

UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif']
WHERE id = 'generated-images';

UPDATE storage.buckets
SET file_size_limit = 209715200,
    allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime']
WHERE id = 'generated-videos';

UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4','audio/aac']
WHERE id = 'tts-audio';

UPDATE storage.buckets
SET file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp']
WHERE id = 'video-inputs';

UPDATE storage.buckets
SET file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','application/pdf','text/plain']
WHERE id = 'support-attachments';
