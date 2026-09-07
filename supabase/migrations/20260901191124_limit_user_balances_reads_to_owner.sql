/*
# Limit balance rows to their owner while keeping nickname lookup working

## Problem
`public.user_balances` carried a SELECT policy named `select_public_nickname` with the
predicate `true` granted to every signed-in user. Row level security is row-level, so
that policy exposed every column of every user's row, not just the nickname it was
named for: token balance, referral code, who referred them, lifetime referral
earnings, and ban timestamp and reason.

## Change
1. Security
   - Drops `select_public_nickname`.
   - Adds `select_own_balance_row`, a SELECT policy for `authenticated` restricted to
     `auth.uid() = id`.
   - Recreates `public.get_nicknames_by_ids` and `public.search_users_by_nickname` as
     SECURITY DEFINER functions with a pinned empty `search_path`, so public nickname
     lookup keeps working without a broad table policy. Both functions return only
     `id` and `nickname` and keep their existing input caps (50 ids, 8 results,
     query length 2-30).
   - EXECUTE on both functions is granted to `authenticated` only.

## Notes
1. Every client read of this table already filters on the signed-in user's own id, so
   the balance, referral and profile screens are unaffected.
2. The admin panel reads user rows through a server-side function that uses the
   service role and bypasses row level security, so it is unaffected.
*/

DROP POLICY IF EXISTS "select_public_nickname" ON public.user_balances;

DROP POLICY IF EXISTS "select_own_balance_row" ON public.user_balances;
CREATE POLICY "select_own_balance_row"
  ON public.user_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) > 50 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.id, COALESCE(b.nickname, 'unknown')
  FROM public.user_balances b
  WHERE b.id = ANY(p_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_query IS NULL OR length(p_query) < 2 OR length(p_query) > 30 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.id, b.nickname
  FROM public.user_balances b
  WHERE b.nickname IS NOT NULL
    AND b.nickname ILIKE '%' || p_query || '%'
    AND b.id <> auth.uid()
  LIMIT 8;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;
