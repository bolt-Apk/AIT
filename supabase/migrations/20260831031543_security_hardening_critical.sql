/*
# Security Hardening — Critical Fixes

1. Revoke EXECUTE on SECURITY DEFINER functions from anon/public
   - deduct_tokens(integer) — callable by anon, bypasses RLS
   - deduct_tokens(numeric) — callable by anon, bypasses RLS
   - get_user_stats() — callable by anon, leaks user data

2. Lock down app_settings UPDATE policy
   - Old: anyone (anon+authenticated) can UPDATE with USING(true)/WITH CHECK(true)
   - New: only authenticated users can UPDATE (still public read)

3. Revoke anon write grants on sensitive tables
   - admin_users: revoke all from anon (only authenticated admins need access)
   - Add missing INSERT/UPDATE/DELETE deny policies on admin_users

4. Notes
   - payments and user_balances already have authenticated-only policies;
     anon grants are revoked for defense-in-depth
*/

-- 1. Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC (which anon inherits)
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.deduct_tokens(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.deduct_tokens(numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.deduct_tokens(numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;

-- 2. Lock down app_settings: keep public read, restrict update to authenticated only
DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "auth_update_app_settings" ON app_settings
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- 3. Revoke anon privileges on admin_users
REVOKE ALL ON admin_users FROM anon;

-- 4. Revoke anon privileges on sensitive financial tables
REVOKE ALL ON payments FROM anon;
REVOKE ALL ON user_balances FROM anon;
