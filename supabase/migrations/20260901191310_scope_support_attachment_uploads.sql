/*
# Scope support attachment uploads to the uploader's own folder

## Problem
The storage insert policy `auth_upload_support` checked only
`bucket_id = 'support-attachments'`, with no constraint on the path. Any signed-in user
could therefore upload into another user's folder, or into the operator's `admin/`
folder, planting or replacing files in someone else's support conversation. Every other
insert policy in this project already carries the owner-folder clause.

## Change
1. Security
   - Drops `auth_upload_support`.
   - Adds `support_upload_own_or_admin`, which allows a caller to write only under their
     own id prefix, and allows members of `public.admin_users` to write under the
     `admin/` prefix used by the operator support console.

## Notes
1. User attachments are uploaded to a path beginning with the signed-in user's id, and
   operator attachments to a path beginning with `admin/`, so both existing upload
   flows continue to work unchanged.
*/

DROP POLICY IF EXISTS "auth_upload_support" ON storage.objects;

DROP POLICY IF EXISTS "support_upload_own_or_admin" ON storage.objects;
CREATE POLICY "support_upload_own_or_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR (
        (storage.foldername(name))[1] = 'admin'
        AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
      )
    )
  );
