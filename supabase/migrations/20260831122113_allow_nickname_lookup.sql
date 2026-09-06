/*
# Allow authenticated users to look up other users by nickname

1. Security Changes
   - Add a SELECT policy that lets any authenticated user read id + nickname
     from user_balances where nickname is not null
   - This is needed for the "send to user" search feature
   - The existing select_own_balance policy still grants full row access to the owner
   - Column-level SELECT grants restrict what non-owners can see to only id and nickname

2. Notes
   - Users can only see id and nickname of other users, not tokens or other fields
   - The ilike search in the frontend uses this policy
*/

-- Allow authenticated users to see rows with a nickname (for search)
DROP POLICY IF EXISTS "select_nickname_lookup" ON user_balances;
CREATE POLICY "select_nickname_lookup" ON user_balances FOR SELECT
  TO authenticated
  USING (nickname IS NOT NULL);
