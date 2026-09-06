/*
# Enable Realtime on user_balances

1. Changes
   - Add user_balances table to Supabase Realtime publication
   - This allows the frontend to receive live balance updates via websocket

2. Important Notes
   - Uses IF NOT EXISTS pattern via DO block for idempotency
   - Only the UPDATE event is needed (balance changes)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'user_balances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_balances;
  END IF;
END $$;
