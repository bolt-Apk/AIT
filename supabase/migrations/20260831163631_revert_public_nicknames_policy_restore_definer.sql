/*
# Revert dangerous public nicknames policy and restore SECURITY DEFINER

## Problem
The previous migration added a `select_public_nicknames` policy with `USING(true)`
which exposes ALL columns (tokens, referral_code, etc.) of ALL users to any
authenticated user. This is a data leak.

## Solution
1. Drop the dangerous `select_public_nicknames` policy.
2. Restore column-level grants by re-granting table-level SELECT to authenticated
   (the `select_own_balance` policy still restricts row access to own data only).
3. Keep both functions as SECURITY INVOKER but create a dedicated secure view
   `public.user_nicknames_view` that exposes only `id` and `nickname`.
4. Rewrite both functions to query the view instead of the table directly.
5. The view is owned by postgres and selects from user_balances, so it has
   access to all rows. With SECURITY INVOKER functions + the view, the functions
   don't need SECURITY DEFINER.

## Security changes
- Removed `select_public_nicknames` policy (data leak fix).
- Created `user_nicknames_view` view exposing only safe columns.
- Granted SELECT on view to `authenticated` only.
- Both functions remain SECURITY INVOKER, querying the view.
*/

-- Step 1: Drop the dangerous policy
DROP POLICY IF EXISTS "select_public_nicknames" ON public.user_balances;

-- Step 2: Restore table-level SELECT for authenticated (own-row policy still applies)
GRANT SELECT ON public.user_balances TO authenticated;

-- Step 3: Create a view that exposes only id and nickname
CREATE OR REPLACE VIEW public.user_nicknames_view
  WITH (security_invoker = false)
AS
  SELECT id, COALESCE(nickname, 'unknown')::text AS nickname
  FROM public.user_balances;

-- Grant SELECT on the view to authenticated only
REVOKE ALL ON public.user_nicknames_view FROM PUBLIC;
REVOKE ALL ON public.user_nicknames_view FROM anon;
GRANT SELECT ON public.user_nicknames_view TO authenticated;
GRANT SELECT ON public.user_nicknames_view TO service_role;

-- Step 4: Rewrite functions as SECURITY INVOKER using the view
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
  SELECT v.id, v.nickname
  FROM public.user_nicknames_view v
  WHERE v.id = ANY(p_ids);
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
  SELECT v.id, v.nickname
  FROM public.user_nicknames_view v
  WHERE v.nickname IS NOT NULL
    AND v.nickname ILIKE '%' || p_query || '%'
    AND v.id != auth.uid()
  LIMIT 8;
END;
$function$;

-- Step 5: Maintain tight EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO service_role;

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO service_role;
