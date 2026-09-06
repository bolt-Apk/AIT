/*
# Create support chat system

1. New Tables
  - `support_tickets`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to auth.users, owner)
    - `subject` (text)
    - `status` (text: open, closed)
    - `last_message_at` (timestamptz)
    - `unread_user` (int, unread count for user)
    - `unread_admin` (int, unread count for admin)
    - `created_at` (timestamptz)
  - `support_messages`
    - `id` (uuid, PK)
    - `ticket_id` (uuid, FK to support_tickets)
    - `sender` (text: user or admin)
    - `content` (text, nullable for media-only)
    - `media_url` (text, nullable)
    - `media_type` (text: text, image, video, audio)
    - `created_at` (timestamptz)

2. Security
  - RLS on both tables
  - Users can CRUD own tickets/messages
  - Service role handles admin side via edge function

3. Realtime
  - Enabled on both tables for live notifications
*/

-- support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'Обращение в поддержку',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at timestamptz DEFAULT now(),
  unread_user int NOT NULL DEFAULT 0,
  unread_admin int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tickets" ON support_tickets;
CREATE POLICY "select_own_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tickets" ON support_tickets;
CREATE POLICY "insert_own_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tickets" ON support_tickets;
CREATE POLICY "update_own_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tickets" ON support_tickets;
CREATE POLICY "delete_own_tickets" ON support_tickets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- support_messages
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  content text,
  media_url text,
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video', 'audio')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON support_messages;
CREATE POLICY "select_own_messages" ON support_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_messages" ON support_messages;
CREATE POLICY "insert_own_messages" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender = 'user' AND
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_messages" ON support_messages;
CREATE POLICY "update_own_messages" ON support_messages FOR UPDATE
  TO authenticated USING (
    sender = 'user' AND
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
  ) WITH CHECK (
    sender = 'user' AND
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_messages" ON support_messages;
CREATE POLICY "delete_own_messages" ON support_messages FOR DELETE
  TO authenticated USING (
    sender = 'user' AND
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_support" ON storage.objects;
CREATE POLICY "auth_upload_support" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "public_read_support" ON storage.objects;
CREATE POLICY "public_read_support" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'support-attachments');
