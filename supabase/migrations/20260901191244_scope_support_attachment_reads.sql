/*
# Scope support attachment reads to the uploader and administrators

## Problem
The storage read policy `public_read_support` matched on the bucket alone
(`bucket_id = 'support-attachments'`) and was granted to the `anon` role, so any
anonymous caller could list the support attachment bucket and download screenshots and
documents that users attached to private support conversations. The support ticket and
message tables themselves are correctly owner-scoped, making the attachment bucket the
weak link in an otherwise private feature.

## Change
1. Security
   - Drops `public_read_support`.
   - Adds `support_read_own_or_admin`, restricted to `authenticated`, allowing a caller
     to read files under their own id prefix, and allowing members of
     `public.admin_users` to read the whole bucket so operators keep working.

## Notes
1. The bucket remains public, so attachment URLs already present in existing support
   conversations keep loading for both sides.
*/

DROP POLICY IF EXISTS "public_read_support" ON storage.objects;

DROP POLICY IF EXISTS "support_read_own_or_admin" ON storage.objects;
CREATE POLICY "support_read_own_or_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
    )
  );
