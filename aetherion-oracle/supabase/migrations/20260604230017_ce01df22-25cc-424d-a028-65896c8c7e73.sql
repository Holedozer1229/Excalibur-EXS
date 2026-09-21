
-- Petitions: add owner DELETE and admin SELECT
CREATE POLICY "Owners delete own petitions" ON public.petitions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all petitions" ON public.petitions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tighten realtime.messages: scope subscriptions to user-specific topics
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime" ON realtime.messages;

CREATE POLICY "Users receive only own-scoped topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = 'petitions:' || auth.uid()::text
      OR realtime.topic() LIKE 'vm-term:%'
    )
  );

CREATE POLICY "Users send only to own-scoped topics" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = 'petitions:' || auth.uid()::text
      OR realtime.topic() LIKE 'vm-term:%'
    )
  );
