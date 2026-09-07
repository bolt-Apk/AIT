/*
# Create payments table

1. New Tables
  - `payments`
    - `id` (uuid, primary key) — unique payment identifier
    - `user_id` (uuid, FK to auth.users) — who made the payment
    - `yookassa_id` (text) — YooKassa payment ID
    - `amount` (numeric) — payment amount in rubles
    - `tokens` (integer) — number of tokens purchased (1 ruble = 1 token)
    - `status` (text) — payment status: pending, succeeded, canceled
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

2. Security
  - Enable RLS on `payments`.
  - Authenticated users can read their own payments.
  - No client insert/update/delete — only server (webhook) writes.

3. Indexes
  - On user_id for listing user's payments.
  - On yookassa_id for webhook lookup.
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yookassa_id text UNIQUE,
  amount numeric(10, 2) NOT NULL,
  tokens integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_yookassa_id ON payments(yookassa_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "no_client_insert_payments" ON payments;
CREATE POLICY "no_client_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "no_client_update_payments" ON payments;
CREATE POLICY "no_client_update_payments" ON payments FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "no_client_delete_payments" ON payments;
CREATE POLICY "no_client_delete_payments" ON payments FOR DELETE
  TO authenticated USING (false);
