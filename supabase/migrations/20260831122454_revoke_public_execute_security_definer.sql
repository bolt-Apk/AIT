/*
# Revoke PUBLIC execute on all SECURITY DEFINER functions

1. Problem
   - PostgreSQL grants EXECUTE to PUBLIC by default on new functions
   - This means anon and authenticated can call functions even without explicit GRANT
   - Several SECURITY DEFINER functions are exposed via the REST API when they should not be

2. Changes
   - Revoke ALL execute from PUBLIC, anon, and authenticated on every SECURITY DEFINER function
   - Re-grant only to the specific roles that legitimately need each function:
     - `generate_referral_code()`: no public/authenticated grant (trigger-only, called internally)
     - `handle_new_user_balance()`: no public/authenticated grant (trigger-only, called internally)
     - `deduct_tokens(integer)` and `deduct_tokens(numeric)`: service_role only (called by edge functions)
     - `get_user_stats()`: authenticated only (called by frontend via RPC)
     - `search_users_by_nickname(text)`: authenticated only (called by frontend via RPC)
     - `get_nicknames_by_ids(uuid[])`: authenticated only (called by frontend via RPC)
     - `add_tokens(uuid, numeric)`: service_role only (called by edge functions)
     - `claim_generation_slot(text, integer, integer)`: service_role only (called by edge functions)

3. Notes
   - Idempotent: safe to re-run
   - Does not change function logic, only access control
*/

-- generate_referral_code: trigger-only, no direct access needed
REVOKE EXECUTE ON FUNCTION generate_referral_code() FROM PUBLIC, anon, authenticated;

-- handle_new_user_balance: trigger-only, no direct access needed
REVOKE EXECUTE ON FUNCTION handle_new_user_balance() FROM PUBLIC, anon, authenticated;

-- deduct_tokens: only edge functions (service_role) should call this
REVOKE EXECUTE ON FUNCTION deduct_tokens(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION deduct_tokens(numeric) FROM PUBLIC, anon, authenticated;

-- add_tokens: only edge functions (service_role) should call this
REVOKE EXECUTE ON FUNCTION add_tokens(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- claim_generation_slot: only edge functions (service_role) should call this
REVOKE EXECUTE ON FUNCTION claim_generation_slot(text, integer, integer) FROM PUBLIC, anon, authenticated;

-- get_user_stats: authenticated users only
REVOKE EXECUTE ON FUNCTION get_user_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;

-- search_users_by_nickname: authenticated users only
REVOKE EXECUTE ON FUNCTION search_users_by_nickname(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_users_by_nickname(text) TO authenticated;

-- get_nicknames_by_ids: authenticated users only
REVOKE EXECUTE ON FUNCTION get_nicknames_by_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_nicknames_by_ids(uuid[]) TO authenticated;
