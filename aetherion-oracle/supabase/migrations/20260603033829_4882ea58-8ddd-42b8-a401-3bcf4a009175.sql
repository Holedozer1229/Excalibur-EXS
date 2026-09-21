
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS btc_address text;

CREATE OR REPLACE FUNCTION public.validate_wallet_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.wallet_address IS NOT NULL
     AND NEW.wallet_address !~ '^0x[a-fA-F0-9]{40}$' THEN
    RAISE EXCEPTION 'Invalid EVM wallet address: %', NEW.wallet_address;
  END IF;
  IF NEW.btc_address IS NOT NULL
     AND NEW.btc_address !~ '^(bc1|tb1|[13]|m|n|2)[a-zA-HJ-NP-Z0-9]{8,87}$' THEN
    RAISE EXCEPTION 'Invalid BTC address: %', NEW.btc_address;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_wallet ON public.profiles;
CREATE TRIGGER profiles_validate_wallet
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_address();
