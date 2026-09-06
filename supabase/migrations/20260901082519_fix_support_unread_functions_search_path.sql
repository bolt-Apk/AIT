/*
# Fix mutable search_path on support unread functions

1. Modified Functions
  - `increment_support_unread_user(uuid)` — added `SET search_path = public`
  - `increment_support_unread_admin(uuid)` — added `SET search_path = public`

2. Security
  - Pins search_path to prevent search_path injection attacks
  - Retains SECURITY INVOKER and existing EXECUTE grants
*/

CREATE OR REPLACE FUNCTION public.increment_support_unread_user(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE support_tickets SET unread_user = unread_user + 1 WHERE id = p_ticket_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_support_unread_admin(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE support_tickets SET unread_admin = unread_admin + 1 WHERE id = p_ticket_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_support_unread_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_support_unread_admin(uuid) TO authenticated;