/*
# Change tokens column from integer to numeric

1. Modified Tables
   - `user_balances`
     - `tokens` column changed from `integer` to `numeric(12,2)` to support fractional ruble amounts
       (TTS and other services charge fractions of a ruble per request)

2. Modified Functions
   - `deduct_tokens` — parameter and return type changed from `integer` to `numeric(12,2)`
     to match the new column type

3. Important Notes
   - This is a safe widening conversion: all existing integer values remain valid as numeric.
   - The function is replaced with CREATE OR REPLACE so no data is lost.
*/

ALTER TABLE user_balances
  ALTER COLUMN tokens TYPE numeric(12,2) USING tokens::numeric(12,2);

ALTER TABLE user_balances
  ALTER COLUMN tokens SET DEFAULT 10;

CREATE OR REPLACE FUNCTION public.deduct_tokens(amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining numeric;
BEGIN
  UPDATE user_balances
  SET tokens = tokens - amount, updated_at = now()
  WHERE id = auth.uid() AND tokens >= amount
  RETURNING tokens INTO remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Недостаточно токенов';
  END IF;

  RETURN remaining;
END;
$$;
