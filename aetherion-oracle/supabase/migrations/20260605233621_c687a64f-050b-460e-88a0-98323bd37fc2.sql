DROP TRIGGER IF EXISTS profiles_validate_llm ON public.profiles;
DROP FUNCTION IF EXISTS public.validate_llm_base_url();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS llm_provider,
  DROP COLUMN IF EXISTS llm_base_url,
  DROP COLUMN IF EXISTS llm_model,
  DROP COLUMN IF EXISTS llm_api_key_encrypted,
  DROP COLUMN IF EXISTS llm_last_ok_at,
  DROP COLUMN IF EXISTS llm_last_error;

ALTER TABLE public.query_usage DROP COLUMN IF EXISTS llm_provider;