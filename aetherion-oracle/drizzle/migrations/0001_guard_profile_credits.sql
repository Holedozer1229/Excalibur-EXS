CREATE OR REPLACE FUNCTION public.profiles_guard_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  IF jwt_role IN ('authenticated', 'anon') THEN
    IF new.tarot_credits IS DISTINCT FROM old.tarot_credits
       OR new.bonus_oracle_responses IS DISTINCT FROM old.bonus_oracle_responses
       OR new.bonus_dream_images IS DISTINCT FROM old.bonus_dream_images THEN
      RAISE EXCEPTION 'credits and bonuses are managed server-side';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_credits_trg ON public.profiles;
CREATE TRIGGER profiles_guard_credits_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_credits();