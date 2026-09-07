/*
# Harden nickname SECURITY DEFINER functions

These two functions intentionally use SECURITY DEFINER because they need
cross-user reads on user_balances (the SELECT RLS policy only allows
users to see their own row). They are safe because:
- get_nicknames_by_ids: input capped at 50 IDs, returns only id + nickname
- search_users_by_nickname: input length 2-30, excludes caller, returns max 8 rows

Security changes:
- Revoke EXECUTE from public and anon roles so only signed-in users can call them.
- Set search_path = '' to prevent search-path hijacking.
*/

-- Revoke from public (which includes anon)
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated;

-- Pin search_path to prevent hijacking
ALTER FUNCTION public.get_nicknames_by_ids(uuid[]) SET search_path = '';
ALTER FUNCTION public.search_users_by_nickname(text) SET search_path = '';
