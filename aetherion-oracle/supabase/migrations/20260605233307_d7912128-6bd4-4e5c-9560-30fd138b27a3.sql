-- Track B: BYO-LLM profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS llm_provider TEXT NOT NULL DEFAULT 'lovable'
    CHECK (llm_provider IN ('lovable', 'custom')),
  ADD COLUMN IF NOT EXISTS llm_base_url TEXT,
  ADD COLUMN IF NOT EXISTS llm_model TEXT,
  ADD COLUMN IF NOT EXISTS llm_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS llm_last_ok_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS llm_last_error TEXT;

-- Record which provider served each call (nullable so old rows are fine)
ALTER TABLE public.query_usage
  ADD COLUMN IF NOT EXISTS llm_provider TEXT;

-- Validate llm_base_url shape on write: https://... OR loopback/tailscale/local http://
CREATE OR REPLACE FUNCTION public.validate_llm_base_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.llm_provider = 'custom' THEN
    IF NEW.llm_base_url IS NULL OR length(NEW.llm_base_url) < 8 THEN
      RAISE EXCEPTION 'llm_base_url required when llm_provider = custom';
    END IF;
    IF NEW.llm_base_url !~* '^https://'
       AND NEW.llm_base_url !~* '^http://(localhost|127\.0\.0\.1|[^/]+\.ts\.net|[^/]+\.local)(:[0-9]+)?(/|$)' THEN
      RAISE EXCEPTION 'llm_base_url must be https:// (or http:// for localhost/*.ts.net/*.local)';
    END IF;
    IF NEW.llm_model IS NULL OR length(NEW.llm_model) < 1 THEN
      RAISE EXCEPTION 'llm_model required when llm_provider = custom';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_llm ON public.profiles;
CREATE TRIGGER profiles_validate_llm
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_llm_base_url();