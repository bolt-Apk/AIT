/*
# Secure nickname lookup via SECURITY DEFINER function

1. Security Changes
   - Remove the overly broad select_nickname_lookup policy that would expose 
     tokens and other sensitive data of other users
   - Create a SECURITY DEFINER function `search_users_by_nickname` that only 
     returns id and nickname, preventing exposure of sensitive columns
   - Function is callable by authenticated users only
   - Function excludes the calling user from results

2. Notes
   - The frontend calls this function via supabase.rpc() for the send-to-user search
   - Only id and nickname are returned, never tokens or other sensitive fields
   - Case-insensitive search using ILIKE
*/

-- Remove the broad select policy for other users
DROP POLICY IF EXISTS "select_nickname_lookup" ON user_balances;

-- Create a secure lookup function
CREATE OR REPLACE FUNCTION search_users_by_nickname(p_query text)
RETURNS TABLE(id uuid, nickname text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF length(p_query) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT ub.id, ub.nickname
    FROM user_balances ub
    WHERE ub.nickname IS NOT NULL
      AND ub.nickname ILIKE '%' || p_query || '%'
      AND ub.id != auth.uid()
    LIMIT 8;
END;
$$;

REVOKE EXECUTE ON FUNCTION search_users_by_nickname FROM anon;
GRANT EXECUTE ON FUNCTION search_users_by_nickname TO authenticated;
