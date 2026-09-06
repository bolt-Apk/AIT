/*
# Function to resolve user IDs to nicknames

1. New Function
   - `get_nicknames_by_ids(p_ids uuid[])` returns id + nickname for given user IDs
   - Used by the received media view to show sender nicknames
   - Only returns id and nickname, never sensitive columns
   - SECURITY DEFINER so it bypasses RLS to read other users' nicknames

2. Security
   - Only accessible to authenticated users
   - Only returns public info (id, nickname)
*/

CREATE OR REPLACE FUNCTION get_nicknames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT ub.id, COALESCE(ub.nickname, 'unknown')::text AS nickname
    FROM user_balances ub
    WHERE ub.id = ANY(p_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_nicknames_by_ids FROM anon;
GRANT EXECUTE ON FUNCTION get_nicknames_by_ids TO authenticated;
