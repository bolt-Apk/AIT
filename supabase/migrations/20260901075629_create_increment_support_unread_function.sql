/*
# Create helper function for incrementing support unread counters

1. New Functions
  - `increment_support_unread_user(p_ticket_id uuid)` - atomically increments unread_user on a ticket
  - `increment_support_unread_admin(p_ticket_id uuid)` - atomically increments unread_admin on a ticket

2. Security
  - SECURITY INVOKER (runs as caller)
  - EXECUTE granted to authenticated role
*/

CREATE OR REPLACE FUNCTION increment_support_unread_user(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE support_tickets SET unread_user = unread_user + 1 WHERE id = p_ticket_id;
$$;

CREATE OR REPLACE FUNCTION increment_support_unread_admin(p_ticket_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE support_tickets SET unread_admin = unread_admin + 1 WHERE id = p_ticket_id;
$$;

GRANT EXECUTE ON FUNCTION increment_support_unread_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_support_unread_admin(uuid) TO authenticated;
