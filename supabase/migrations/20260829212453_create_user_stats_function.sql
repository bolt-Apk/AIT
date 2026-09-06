/*
# Create get_user_stats function

1. New Functions
  - `get_user_stats()` — returns total registered users and currently online users
    - `total_users` (integer): count of all users in auth.users
    - `online_users` (integer): count of users with a session updated in the last 15 minutes
2. Security
  - SECURITY DEFINER so it can read auth schema tables
  - Granted to anon and authenticated roles for public access on the Auth page
*/

CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_online integer;
BEGIN
  SELECT count(*)::integer INTO v_total FROM auth.users;

  SELECT count(DISTINCT user_id)::integer INTO v_online
  FROM auth.sessions
  WHERE updated_at > now() - interval '15 minutes';

  RETURN json_build_object(
    'total_users', v_total,
    'online_users', v_online
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_stats() TO anon, authenticated;
