/*
# Restrict platform settings reads to administrators

## Problem
The `app_settings` table carried a SELECT policy with the predicate `true` granted to
the `anon` and `authenticated` roles. Because row level security is row-level, that
policy exposed every column of the settings row, including the upstream AI provider
API key (`aitunnel_api_key`), to any anonymous caller of the Data API.

## Change
1. Security
   - Drops the permissive `anon_select_app_settings` policy.
   - Adds `admin_select_app_settings`, a SELECT policy for `authenticated` that
     requires membership in `public.admin_users`.
   - Revokes all table privileges on `app_settings` from `anon`, which has no
     legitimate reason to touch the table.

## Notes
1. The admin panel reads only `free_mode` from this table and does so as a signed-in
   administrator, so it continues to work.
2. All server-side readers (generation and proxy functions) use the service role,
   which bypasses row level security and is unaffected.
*/

DROP POLICY IF EXISTS "anon_select_app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "admin_select_app_settings" ON public.app_settings;
CREATE POLICY "admin_select_app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

REVOKE ALL ON public.app_settings FROM anon;
