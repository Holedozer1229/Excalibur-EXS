
-- Add restrictive policy to processed_stripe_events (service_role only access; authenticated/anon fully denied)
CREATE POLICY "Deny all client access" ON public.processed_stripe_events
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- Harden record_referral_signup: ignore the _referred_user_id param and use auth.uid()
CREATE OR REPLACE FUNCTION public.record_referral_signup(_referred_user_id uuid, _code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer UUID; _share NUMERIC; _caller UUID := auth.uid();
BEGIN
  IF _caller IS NULL THEN RETURN false; END IF;
  IF _code IS NULL OR _code = '' THEN RETURN false; END IF;
  SELECT user_id, share_pct INTO _referrer, _share
    FROM public.referral_codes WHERE code = upper(_code);
  IF _referrer IS NULL OR _referrer = _caller THEN RETURN false; END IF;
  INSERT INTO public.referral_attributions(referrer_user_id, referred_user_id, code, share_pct)
    VALUES (_referrer, _caller, upper(_code), _share)
    ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN true;
END;
$function$;

-- Restrict EXECUTE on is_auto_mine_eligible to service_role only (internal helper)
REVOKE EXECUTE ON FUNCTION public.is_auto_mine_eligible(uuid) FROM PUBLIC, anon, authenticated;
