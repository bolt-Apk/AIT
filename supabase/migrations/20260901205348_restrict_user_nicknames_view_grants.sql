-- F7: user_nicknames_view was granted SELECT/INSERT/UPDATE/DELETE to both anon and
-- authenticated. Unauthenticated visitors have no reason to read the nickname
-- directory, and a simple view is auto-updatable, so the write grants passed writes
-- through to user_balances. Leave signed-in users read-only access.
REVOKE ALL ON public.user_nicknames_view FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_nicknames_view FROM authenticated;
GRANT SELECT ON public.user_nicknames_view TO authenticated;
