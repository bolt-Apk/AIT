/*
# Revoke write permissions on the administrator list

## Problem
`public.admin_users` is the authorization source for the operator panel and the model
health checker: membership in it grants full administrative power. The `authenticated`
role held INSERT and UPDATE privileges on its `id` and `created_at` columns. Writes are
denied today only because no insert or update policy exists, so the last line of
defence was a missing policy rather than a missing privilege — and any future broad
policy on this table would immediately turn into self-service administrator enrolment.

## Change
1. Security
   - Revokes INSERT, UPDATE and DELETE on `public.admin_users` from `anon` and
     `authenticated`, leaving only the SELECT needed by the existing own-row policy.

## Notes
1. Administrator membership is managed server-side with the service role, which is
   unaffected by these grants.
2. The admin panel's own check reads its single row through the existing
   `admin_select_own` policy, which continues to work.
*/

REVOKE INSERT, UPDATE, DELETE ON public.admin_users FROM authenticated;
REVOKE ALL ON public.admin_users FROM anon;
