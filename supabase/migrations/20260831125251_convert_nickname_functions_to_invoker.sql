/*
# Convert nickname functions to SECURITY INVOKER

Both `get_nicknames_by_ids` and `search_users_by_nickname` only read from
`public.user_balances` using the caller's privileges and `auth.uid()`.
They do not need elevated (owner) privileges, so SECURITY DEFINER is
unnecessary and widens the attack surface.

## Changes
- Recreate `get_nicknames_by_ids(uuid[])` with SECURITY INVOKER.
- Recreate `search_users_by_nickname(text)` with SECURITY INVOKER.
- Re-grant EXECUTE to `authenticated` only (revoke from anon/public).

## Security
- Functions now run with the caller's permissions, not the owner's.
- Authenticated users can still call them; anon and public cannot.
*/

-- 1. get_nicknames_by_ids
CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
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

-- 2. search_users_by_nickname
CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
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
