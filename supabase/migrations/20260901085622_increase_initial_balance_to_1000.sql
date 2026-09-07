/*
# Increase initial balance for new users to 1000 rubles

1. Modified Functions
  - `handle_new_user_balance()` — changed initial token grant from 10 to 1000

2. Notes
  - Only affects NEW users registering after this migration
  - Existing users keep their current balance
*/

CREATE OR REPLACE FUNCTION public.handle_new_user_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (id, tokens)
  VALUES (NEW.id, 1000)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;