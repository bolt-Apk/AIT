-- F2: the support-attachments bucket was public, which bypasses the owner/admin
-- SELECT policy on storage.objects for anyone holding an attachment URL.
-- The existing "support_read_own_or_admin" SELECT policy now governs reads, and the
-- client renders attachments through short-lived signed URLs.
UPDATE storage.buckets SET public = false WHERE id = 'support-attachments';
