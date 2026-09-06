/*
# Recreate user_nicknames_lookup view

1. Problem
   - A prior migration dropped the `user_nicknames_lookup` view, believing it unused.
   - In reality, the functions `get_nicknames_by_ids` and `search_users_by_nickname`
     both query this view. Without it, they silently return empty results, so sender
     nicknames on shared media always display as "unknown".

2. Solution
   - Recreate `user_nicknames_lookup` as a simple view exposing only `id` and `nickname`
     from `user_balances`. The view is owned by postgres, which bypasses RLS on the
     underlying table — this is safe because it only exposes two non-sensitive columns.
   - Grant SELECT only to `authenticated` and `service_role`.

3. Security
   - No SECURITY DEFINER functions involved. The functions that query this view are
     SECURITY INVOKER and additionally check `auth.uid() IS NOT NULL`.
   - Only `id` and `nickname` are exposed; token balances, referral data, and ban info
     remain hidden.
*/

CREATE OR REPLACE VIEW public.user_nicknames_lookup AS
  SELECT id, nickname FROM public.user_balances;

REVOKE ALL ON public.user_nicknames_lookup FROM PUBLIC, anon;
GRANT SELECT ON public.user_nicknames_lookup TO authenticated, service_role;
