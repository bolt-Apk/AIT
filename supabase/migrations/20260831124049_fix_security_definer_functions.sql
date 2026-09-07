/*
# Fix SECURITY DEFINER function exposure

1. `get_user_stats` — revoke EXECUTE from authenticated and anon.
   Only the edge function calls it with service_role, so no public access needed.

2. `search_users_by_nickname` — keep SECURITY DEFINER (needs to bypass RLS
   on user_balances to search nicknames), but harden search_path to ''.

3. `get_nicknames_by_ids` — same as above: keep DEFINER, harden search_path to ''.

Both nickname functions add array-length and string-length guards to limit abuse.
*/

-- 1. get_user_stats: revoke all public/authenticated execute
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM public;

-- 2. search_users_by_nickname: harden search_path
CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM public;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;

-- 3. get_nicknames_by_ids: harden search_path + limit array size
CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;
