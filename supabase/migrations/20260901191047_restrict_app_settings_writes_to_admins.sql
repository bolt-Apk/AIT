/*
# Restrict platform settings writes to administrators

## Problem
The `app_settings` table carried an UPDATE policy with `USING (true)` and
`WITH CHECK (true)` granted to every signed-in user, together with column UPDATE
privileges on `aitunnel_api_key`, `free_mode`, `api_key_set` and `id`. Any registered
account could therefore turn on platform-wide free mode (making all AI generation free
of charge at the operator's expense) or overwrite the upstream provider API key.

## Change
1. Security
   - Drops the permissive `auth_update_app_settings` policy.
   - Adds `admin_update_app_settings`, an UPDATE policy for `authenticated` requiring
     membership in `public.admin_users` on both the read and the write side.
   - Revokes INSERT and DELETE on `app_settings` from `authenticated`; the single
     settings row is managed, not created or removed, by the client.

## Notes
1. The free-mode toggle in the admin panel continues to work for administrators.
2. Server-side writers use the service role and are unaffected.
*/

DROP POLICY IF EXISTS "auth_update_app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;
CREATE POLICY "admin_update_app_settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

REVOKE INSERT, DELETE ON public.app_settings FROM authenticated;
