-- Tighten realtime.messages so vm-term topics are scoped to the owning user.
DROP POLICY IF EXISTS "Users receive only own-scoped topics" ON realtime.messages;
DROP POLICY IF EXISTS "Users send only to own-scoped topics" ON realtime.messages;

CREATE POLICY "Users receive only own-scoped topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = 'petitions:' || auth.uid()::text
      OR realtime.topic() LIKE 'vm-term:' || auth.uid()::text || ':%'
    )
  );

CREATE POLICY "Users send only to own-scoped topics" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = 'petitions:' || auth.uid()::text
      OR realtime.topic() LIKE 'vm-term:' || auth.uid()::text || ':%'
    )
  );