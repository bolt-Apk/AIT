-- F8: p_query was interpolated straight into an ILIKE pattern, so a signed-in caller
-- could pass '%' or '_' and page through the entire nickname directory instead of
-- searching for a specific person. Escape LIKE metacharacters and require the query
-- to contain at least two real (non-wildcard) characters.
CREATE OR REPLACE FUNCTION public.search_users_by_nickname(p_query text)
 RETURNS TABLE(id uuid, nickname text)
 LANGUAGE plpgsql
 SECURITY DEFINER
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

  -- Reject queries that are only wildcards / punctuation: they are directory dumps,
  -- not searches.
  v_clean := regexp_replace(p_query, '[^[:alnum:]_]', '', 'g');
  v_clean := replace(v_clean, '_', '');
  IF length(v_clean) < 2 THEN
    RETURN;
  END IF;

  -- Treat %, _ and \ as literal characters.
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
