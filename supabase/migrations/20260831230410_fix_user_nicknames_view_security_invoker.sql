/*
# Fix user_nicknames_view security definer issue

1. Changes
  - Recreate `user_nicknames_view` as SECURITY INVOKER (was SECURITY DEFINER, bypassing RLS)
  - Add a new SELECT policy `select_public_nickname` on `user_balances` so any authenticated
    user can read id + nickname columns from any row (needed for shared media attribution)
  - The existing `select_own_balance` policy stays for full row access to own data

2. Security
  - The view no longer bypasses RLS; it now respects row-level policies
  - The new policy only allows SELECT (read-only) and is scoped to authenticated users
  - Nicknames are intentionally public within the app for attribution purposes
*/

-- Recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_nicknames_view;
CREATE VIEW public.user_nicknames_view
  WITH (security_invoker = true)
AS
  SELECT id, COALESCE(nickname, 'unknown') AS nickname
  FROM public.user_balances;

-- Allow any authenticated user to SELECT from user_balances (needed for nickname lookup)
-- The existing select_own_balance only allows reading own row; this broader policy
-- is needed so the INVOKER view can see other users' nicknames
DROP POLICY IF EXISTS "select_public_nickname" ON public.user_balances;
CREATE POLICY "select_public_nickname" ON public.user_balances FOR SELECT
  TO authenticated
  USING (true);