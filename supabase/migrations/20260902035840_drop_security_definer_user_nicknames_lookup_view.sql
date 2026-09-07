/*
# Drop unused SECURITY DEFINER view user_nicknames_lookup

1. Dropped Views
   - `user_nicknames_lookup` — was defined with SECURITY DEFINER, flagged as a
     security risk. The view is not referenced anywhere in the application code
     (frontend or edge functions).

2. Security
   - Removes the SECURITY DEFINER view that could bypass RLS on `user_balances`.
*/

DROP VIEW IF EXISTS public.user_nicknames_lookup;
