
-- Authenticated-only SECURITY DEFINER functions: revoke from PUBLIC/anon, grant to authenticated
DO $$
DECLARE
  sig TEXT;
  sigs TEXT[] := ARRAY[
    'public.admin_create_promo_codes(integer, text, integer, integer, timestamptz, text, text)',
    'public.admin_set_promo_active(uuid, boolean)',
    'public.award_tart_for_receipt(uuid, uuid, integer)',
    'public.build_mining_anchor(integer)',
    'public.consume_tarot_quota(uuid)',
    'public.dream_already_today(uuid)',
    'public.dream_eligible_users()',
    'public.funnel_summary(integer)',
    'public.get_user_bonuses(uuid)',
    'public.grant_tarot_credits(uuid, integer)',
    'public.has_role(uuid, app_role)',
    'public.media_quota_used_this_month(uuid)',
    'public.redeem_promo_code(text)',
    'public.request_tart_claim(integer, text)',
    'public.rpc_failure_stats(integer)',
    'public.tart_balance(uuid)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
  END LOOP;
END $$;

-- Internal email queue helpers: service_role only
DO $$
DECLARE
  sig TEXT;
  sigs TEXT[] := ARRAY[
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.move_to_dlq(text, text, bigint, jsonb)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
  END LOOP;
END $$;
