/*
# Restore nickname functions to SECURITY DEFINER

The previous migration switched these to SECURITY INVOKER, but they
intentionally need cross-user reads on `user_balances` (whose SELECT
policy is owner-scoped). SECURITY DEFINER is correct here.

Mitigations already in place:
- `SET search_path = ''` prevents search-path hijacking.
- EXECUTE granted only to `authenticated` (revoked from anon/public).
- Input validation limits array size (50) and query length (2-30).
- `search_users_by_nickname` excludes the caller via `auth.uid()`.

## Changes
- Recreate both functions as SECURITY DEFINER.
*/

CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) > 50 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ub.id, COALESCE(ub.nickname, 'unknown')::text AS nickname
  FROM public.user_balances ub
  WHERE ub.id = ANY(p_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_users_by_nickname(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;
