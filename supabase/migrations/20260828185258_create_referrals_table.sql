/*
# Create referrals table

1. New Tables
  - `referrals`
    - `id` (uuid, primary key)
    - `referrer_id` (uuid, FK to auth.users) — user who invited (the referrer)
    - `referred_id` (uuid, FK to auth.users, unique) — user who signed up via referral link
    - `earned` (numeric, default 0) — total amount earned from this referral
    - `created_at` (timestamptz)

2. Modified Tables
  - `user_balances` — add `referral_code` (text, unique) — short code for referral links
  - `user_balances` — add `referred_by` (uuid, nullable) — who referred this user
  - `user_balances` — add `total_referral_earnings` (numeric, default 0)

3. Security
  - RLS on `referrals`: users can read their own referrals (where they are the referrer).
  - No client insert/update/delete on referrals — only server manages this.

4. Function
  - `generate_referral_code()` trigger — auto-generates a short referral code on user_balances insert.
*/

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  earned numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referrals" ON referrals;
CREATE POLICY "select_own_referrals" ON referrals FOR SELECT
  TO authenticated USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "no_client_insert_referrals" ON referrals;
CREATE POLICY "no_client_insert_referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_client_update_referrals" ON referrals;
CREATE POLICY "no_client_update_referrals" ON referrals FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_client_delete_referrals" ON referrals;
CREATE POLICY "no_client_delete_referrals" ON referrals FOR DELETE
  TO authenticated USING (false);

-- Add referral columns to user_balances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_balances' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_balances' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_balances' AND column_name = 'total_referral_earnings'
  ) THEN
    ALTER TABLE user_balances ADD COLUMN total_referral_earnings numeric(10, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF NEW.referral_code IS NULL THEN
    new_code := substr(md5(NEW.id::text || now()::text), 1, 8);
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code ON user_balances;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON user_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing rows that have NULL referral_code
UPDATE user_balances
SET referral_code = substr(md5(id::text || now()::text), 1, 8)
WHERE referral_code IS NULL;
