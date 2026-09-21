INSERT INTO public.user_roles (user_id, role) VALUES ('d529cd1c-25cc-49eb-a273-c22d0594ff19', 'admin') ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, payment_status)
VALUES ('d529cd1c-25cc-49eb-a273-c22d0594ff19', 'sphinxqasi@gmail.com', true, 'oracle_pro', now() + interval '100 years', 'active')
ON CONFLICT (user_id) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'oracle_pro',
  subscription_end = now() + interval '100 years',
  payment_status = 'active',
  updated_at = now();

UPDATE public.profiles
SET bonus_oracle_responses = GREATEST(COALESCE(bonus_oracle_responses,0), 1000000),
    bonus_dream_images = GREATEST(COALESCE(bonus_dream_images,0), 1000000)
WHERE user_id = 'd529cd1c-25cc-49eb-a273-c22d0594ff19';