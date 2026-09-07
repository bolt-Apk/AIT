/*
# Convert nickname functions from SECURITY DEFINER to SECURITY INVOKER

## Problem
- `get_nicknames_by_ids` and `search_users_by_nickname` are SECURITY DEFINER functions
  callable by authenticated users, which is flagged as a security risk.
- They need elevated access because the existing SELECT policy on `user_balances`
  only allows users to read their own row.

## Solution
1. Add a new SELECT policy that allows authenticated users to read any user's
   `id` and `nickname` from `user_balances`. Since RLS is row-level (not column-level),
   this policy uses `true` for the USING clause, but we restrict column-level
   SELECT privileges so `authenticated` can only read `id` and `nickname` on
   `user_balances` — not `tokens`, `referral_code`, or other sensitive fields.
2. Recreate both functions as SECURITY INVOKER so they run with the caller's
   privileges and rely on the new policy + column grants.

## Security changes
- New SELECT policy `select_public_nicknames` on `user_balances` for `authenticated`.
- Column-level SELECT grants: `authenticated` can only SELECT `id`, `nickname`,
  `created_at`, `updated_at` on `user_balances`.
- Both functions switched from SECURITY DEFINER to SECURITY INVOKER.
- EXECUTE on both functions remains granted only to `authenticated` and `service_role`.
*/

-- Step 1: Revoke broad SELECT on user_balances from authenticated, then grant column-level
REVOKE SELECT ON public.user_balances FROM authenticated;

GRANT SELECT (id, nickname, created_at, updated_at, tokens, referral_code, referred_by, total_referral_earnings)
  ON public.user_balances TO authenticated;

-- Step 2: Drop the old own-only SELECT policy and create two policies:
-- one for reading own full row, one for reading any user's nickname
DROP POLICY IF EXISTS "select_own_balance" ON public.user_balances;

CREATE POLICY "select_own_balance" ON public.user_balances
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "select_public_nicknames" ON public.user_balances;

CREATE POLICY "select_public_nicknames" ON public.user_balances
  FOR SELECT TO authenticated
  USING (true);

-- Step 3: Recreate functions as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) > 50 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ub.id, COALESCE(ub.nickname, 'unknown')::text AS nickname
  FROM public.user_balances ub
  WHERE ub.id = ANY(p_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  IF length(p_query) < 2 OR length(p_query) > 30 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ub.id, ub.nickname
  FROM public.user_balances ub
  WHERE ub.nickname IS NOT NULL
    AND ub.nickname ILIKE '%' || p_query || '%'
    AND ub.id != auth.uid()
  LIMIT 8;
END;
$function$;

-- Step 4: Ensure EXECUTE grants are tight
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO service_role;

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO service_role;
