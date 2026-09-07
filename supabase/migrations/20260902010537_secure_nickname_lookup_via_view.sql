/*
# Secure nickname lookups via a narrow view

1. Problem
   - The `authenticated_read_nicknames` policy on `user_balances` used `USING(true)`,
     which allowed any authenticated user to read ALL columns (tokens, referral data)
     of ANY other user -- a data leak.

2. Solution
   - Drop the overly broad `authenticated_read_nicknames` policy.
   - Create a view `user_nicknames_lookup` that exposes ONLY `id` and `nickname`.
     The view runs as its owner (postgres) which bypasses RLS on `user_balances`,
     so cross-user lookups work while keeping the table's own-row policies intact.
   - Rewrite `get_nicknames_by_ids` and `search_users_by_nickname` as SECURITY INVOKER
     functions that query the view instead of the table.
   - Grant SELECT on the view only to `authenticated` and `service_role`.

3. Security
   - No SECURITY DEFINER functions remain.
   - Token balances, referral data, and ban info are never exposed to other users.
   - The view is read-only by nature (no INSERT/UPDATE/DELETE).
*/

-- 1. Remove the overly broad policy
DROP POLICY IF EXISTS "authenticated_read_nicknames" ON public.user_balances;

-- 2. Create the narrow view (owner = postgres, default SECURITY DEFINER for views)
CREATE OR REPLACE VIEW public.user_nicknames_lookup AS
  SELECT id, nickname FROM public.user_balances;

-- Grant SELECT on the view to authenticated + service_role only
REVOKE ALL ON public.user_nicknames_lookup FROM PUBLIC, anon;
GRANT SELECT ON public.user_nicknames_lookup TO authenticated, service_role;

-- 3. Rewrite functions to query the view
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
  SELECT v.id, COALESCE(v.nickname, 'unknown')
  FROM public.user_nicknames_lookup v
  WHERE v.id = ANY(p_ids);
END;
$function$;

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
  SELECT v.id, v.nickname
  FROM public.user_nicknames_lookup v
  WHERE v.nickname IS NOT NULL
    AND v.nickname ILIKE '%' || v_pattern || '%' ESCAPE '\'
    AND v.id <> auth.uid()
  LIMIT 8;
END;
$function$;

-- 4. Tighten EXECUTE grants (unchanged from prior migration, repeated for safety)
REVOKE EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nicknames_by_ids(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.search_users_by_nickname(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_nickname(text) TO authenticated, service_role;
