/*
# Create user_balances table

1. New Tables
  - `user_balances`
    - `id` (uuid, primary key, references auth.users)
    - `tokens` (integer, default 0) — token balance for the user
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

2. Security
  - Enable RLS on `user_balances`.
  - Authenticated users can read their own balance.
  - Insert is done via trigger on signup (no client insert).
  - Update restricted to own row (for admin/function use — client cannot call directly).

3. Trigger
  - On new user signup, auto-create a balance row with 10 free tokens.

4. Function
  - `deduct_tokens(amount int)` — SECURITY DEFINER function to atomically deduct tokens, returns remaining balance. Fails if insufficient.
*/

-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- Policies: users can only read their own balance
DROP POLICY IF EXISTS "select_own_balance" ON user_balances;
CREATE POLICY "select_own_balance" ON user_balances FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_balance" ON user_balances;
CREATE POLICY "update_own_balance" ON user_balances FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- No direct insert/delete from client
DROP POLICY IF EXISTS "no_insert_balance" ON user_balances;
CREATE POLICY "no_insert_balance" ON user_balances FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_delete_balance" ON user_balances;
CREATE POLICY "no_delete_balance" ON user_balances FOR DELETE
  TO authenticated USING (false);

-- Trigger: auto-create balance on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (id, tokens)
  VALUES (NEW.id, 10)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_balance ON auth.users;
CREATE TRIGGER on_auth_user_created_balance
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_balance();

-- Function to atomically deduct tokens
CREATE OR REPLACE FUNCTION public.deduct_tokens(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
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
