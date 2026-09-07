/*
# Allow audio MIME types in the video-inputs storage bucket

## Problem
Video generation models that support audio input (e.g. voice-guided video)
upload the audio reference file to the `video-inputs` bucket. However, the
bucket's `allowed_mime_types` only included image types (png, jpeg, webp),
causing uploads of audio/mpeg and similar audio files to be rejected with
"mime type audio/mpeg is not supported".

## Change
Adds common audio MIME types to the `video-inputs` bucket's allow-list,
matching the same set already permitted by the `tts-audio` bucket.

## Notes
1. Existing objects are unaffected; the change applies to new uploads only.
2. The image types already present are preserved.
*/

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png','image/jpeg','image/jpg','image/webp',
  'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4','audio/aac'
]
WHERE id = 'video-inputs';
