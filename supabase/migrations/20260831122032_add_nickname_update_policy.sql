/*
# Allow users to update their own nickname on user_balances

1. Security Changes
   - Add UPDATE policy on user_balances so authenticated users can update their own row
   - Restrict column-level UPDATE privileges to only the `nickname` column
     so users cannot modify tokens, referral_code, or other sensitive fields
   - This prevents any client-side attempt to change balance or earnings

2. Notes
   - REVOKE UPDATE strips all column-level update rights from authenticated
   - GRANT UPDATE (nickname) re-enables only the nickname column
   - The RLS policy further scopes the update to the user's own row only
*/

-- Add UPDATE policy scoped to own row
DROP POLICY IF EXISTS "update_own_nickname" ON user_balances;
CREATE POLICY "update_own_nickname" ON user_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restrict column-level UPDATE to nickname only
REVOKE UPDATE ON user_balances FROM authenticated;
GRANT UPDATE (nickname) ON user_balances TO authenticated;
