/*
# Create atomic add_tokens function

1. New Function
   - add_tokens(p_user_id uuid, p_amount numeric) — atomically increments user balance
   - SECURITY DEFINER to bypass RLS (called only from trusted edge functions)
   - EXECUTE revoked from PUBLIC/anon, granted only to service_role (used by webhook)

2. Security
   - Atomic UPDATE prevents race conditions on concurrent webhook retries
   - Only service_role can call this function
*/

CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_balances
  SET tokens = tokens + p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_balances (id, tokens, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (id) DO UPDATE
    SET tokens = user_balances.tokens + p_amount,
        updated_at = now();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_tokens(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_tokens(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_tokens(uuid, numeric) FROM authenticated;
