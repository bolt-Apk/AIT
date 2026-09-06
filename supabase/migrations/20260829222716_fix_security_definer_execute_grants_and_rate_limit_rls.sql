/*
# Fix SECURITY DEFINER function grants and generation_rate_limit RLS

1. Security changes
   - Revoke EXECUTE on `deduct_tokens(integer)` from anon (keep authenticated — uses auth.uid())
   - Revoke EXECUTE on `deduct_tokens(numeric)` from anon (keep authenticated — uses auth.uid())
   - Revoke EXECUTE on `generate_referral_code()` from anon AND authenticated (trigger-only, must not be callable via REST)
   - Revoke EXECUTE on `handle_new_user_balance()` from anon AND authenticated (trigger-only, must not be callable via REST)
   - Revoke EXECUTE on `get_user_stats()` from anon AND authenticated (called only from edge function via service_role, which bypasses grants)
   - Add SELECT/INSERT/UPDATE/DELETE RLS policies on `generation_rate_limit` for service-role-only access (deny anon and authenticated)

2. Important notes
   - Service role bypasses both RLS and EXECUTE grants, so edge functions using service_role key are unaffected.
   - Trigger functions fire via the trigger mechanism, not via EXECUTE grants, so revoking EXECUTE does not break triggers.
   - generation_rate_limit is an internal table — no client access needed. A deny-all policy keeps it locked down while RLS is enabled.
*/

-- 1. deduct_tokens(integer) — revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(integer) FROM anon;

-- 2. deduct_tokens(numeric) — revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(numeric) FROM anon;

-- 3. generate_referral_code() — trigger only, revoke from both roles
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM authenticated;

-- 4. handle_new_user_balance() — trigger only, revoke from both roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_balance() FROM authenticated;

-- 5. get_user_stats() — edge function uses service_role which bypasses grants
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM authenticated;

-- 6. generation_rate_limit — add restrictive policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "deny_select_rate_limit" ON public.generation_rate_limit;
CREATE POLICY "deny_select_rate_limit" ON public.generation_rate_limit
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_insert_rate_limit" ON public.generation_rate_limit;
CREATE POLICY "deny_insert_rate_limit" ON public.generation_rate_limit
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "deny_update_rate_limit" ON public.generation_rate_limit;
CREATE POLICY "deny_update_rate_limit" ON public.generation_rate_limit
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_delete_rate_limit" ON public.generation_rate_limit;
CREATE POLICY "deny_delete_rate_limit" ON public.generation_rate_limit
  FOR DELETE TO anon, authenticated USING (false);
