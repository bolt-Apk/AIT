/*
# Create atomic deduct_tokens function

1. New Functions
  - `deduct_tokens(p_user_id uuid, p_amount numeric)` - Atomically deducts tokens from user balance.
    Returns the new balance. Raises an exception if balance is insufficient.
    Uses row-level locking (FOR UPDATE) to prevent race conditions from concurrent requests.

2. Security
  - SECURITY DEFINER so edge functions can call it via service role.
  - EXECUTE granted only to service_role (not anon/authenticated).

3. Important Notes
  - Uses SELECT ... FOR UPDATE to lock the row during the transaction.
  - Raises exception on insufficient balance so the caller knows the deduction failed.
  - Replaces the read-then-write pattern that was vulnerable to TOCTOU races.
*/

CREATE OR REPLACE FUNCTION deduct_tokens(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current numeric;
  v_new numeric;
BEGIN
  SELECT tokens INTO v_current
  FROM user_balances
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_new := greatest(0, v_current - p_amount);

  UPDATE user_balances
  SET tokens = v_new, updated_at = now()
  WHERE id = p_user_id;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION deduct_tokens(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION deduct_tokens(uuid, numeric) FROM anon;
REVOKE ALL ON FUNCTION deduct_tokens(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION deduct_tokens(uuid, numeric) TO service_role;
