/*
# Grant column privileges on app_settings to authenticated role

The app_settings table had RLS policies for SELECT and UPDATE, but was missing
the underlying table-level GRANT. Without it, the Supabase client (running as
`authenticated`) could not read or write the table despite passing RLS checks.

1. Security
  - GRANT SELECT, UPDATE on app_settings to authenticated
  - Existing RLS policies already guard access
*/

GRANT SELECT, UPDATE ON app_settings TO authenticated;