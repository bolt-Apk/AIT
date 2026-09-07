/*
# Convert nickname functions to SECURITY INVOKER

1. Changes
   - Converts `get_nicknames_by_ids` from SECURITY DEFINER to SECURITY INVOKER.
   - Converts `search_users_by_nickname` from SECURITY DEFINER to SECURITY INVOKER.
   - Adds a SELECT policy on `user_balances` allowing authenticated users to read
     any row (needed for cross-user nickname lookups).
   - Revokes column-level SELECT on sensitive columns (tokens, referral_code,
     referred_by, total_referral_earnings, banned_at, ban_reason) from
     anon + authenticated so direct queries cannot read them.

2. Security
   - Removes SECURITY DEFINER privilege escalation from both functions.
   - Functions now run with the caller's permissions (INVOKER), relying on RLS.
   - Column-level privilege revocation prevents users from querying sensitive data
     even though the row-level policy allows reading any row.
*/

-- Revoke column-level SELECT on sensitive columns
REVOKE SELECT (tokens) ON public.user_balances FROM anon, authenticated;
REVOKE SELECT (referral_code) ON public.user_balances FROM anon, authenticated;
REVOKE SELECT (referred_by) ON public.user_balances FROM anon, authenticated;
REVOKE SELECT (total_referral_earnings) ON public.user_balances FROM anon, authenticated;
REVOKE SELECT (banned_at) ON public.user_balances FROM anon, authenticated;
REVOKE SELECT (ban_reason) ON public.user_balances FROM anon, authenticated;

-- Add policy allowing authenticated users to read any row (for nickname lookups)
DROP POLICY IF EXISTS "authenticated_read_nicknames" ON public.user_balances;
CREATE POLICY "authenticated_read_nicknames" ON public.user_balances
  FOR SELECT TO authenticated USING (true);

-- Recreate get_nicknames_by_ids as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
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

-- Recreate search_users_by_nickname as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_clean text;
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_query IS NULL OR length(p_query) < 2 OR length(p_query) > 30 THEN
    RETURN;
  END IF;

  v_clean := regexp_replace(p_query, '[^[:alnum:]_]', '', 'g');
  v_clean := replace(v_clean, '_', '');
  IF length(v_clean) < 2 THEN
    RETURN;
  END IF;

  v_pattern := replace(p_query, '\', '\\');
  v_pattern := replace(v_pattern, '%', '\%');
  v_pattern := replace(v_pattern, '_', '\_');

  RETURN QUERY
  SELECT b.id, b.nickname
  FROM public.user_balances b
  WHERE b.nickname IS NOT NULL
    AND b.nickname ILIKE '%' || v_pattern || '%' ESCAPE '\'
    AND b.id <> auth.uid()
  LIMIT 8;
END;
$function$;

-- Only authenticated and service_role can call these
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated, service_role;
