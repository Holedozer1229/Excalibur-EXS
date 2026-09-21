
-- 1. Tighten petitions: require auth on both insert and select
DROP POLICY IF EXISTS "Anyone can insert petitions" ON public.petitions;
DROP POLICY IF EXISTS "Owner or anon-created can read own petition" ON public.petitions;

CREATE POLICY "Authenticated users insert own petitions"
  ON public.petitions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners read own petitions"
  ON public.petitions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Backfill: orphaned anonymous petitions are no longer readable by anyone
--    (no destructive change; rows remain but only service_role can access)

-- 3. Realtime channel authorization on realtime.messages
--    Default-deny: only authenticated users may participate; service_role unaffected.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime"    ON realtime.messages;

CREATE POLICY "Authenticated can receive realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can send realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
