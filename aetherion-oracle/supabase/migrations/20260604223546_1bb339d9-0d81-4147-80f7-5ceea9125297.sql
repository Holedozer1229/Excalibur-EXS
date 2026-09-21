CREATE TABLE public.petitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  btc_target TEXT NOT NULL,
  eth_recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  btc_txid TEXT,
  eth_txid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.petitions TO authenticated;
GRANT SELECT, INSERT ON public.petitions TO anon;
GRANT ALL ON public.petitions TO service_role;

ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert petitions"
  ON public.petitions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Owner or anon-created can read own petition"
  ON public.petitions FOR SELECT
  TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE TRIGGER petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.petitions;
ALTER TABLE public.petitions REPLICA IDENTITY FULL;