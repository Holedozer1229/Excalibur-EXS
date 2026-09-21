-- Profiles table for authenticated users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Daily query usage counter (resets per UTC day)
CREATE TABLE public.query_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.query_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.query_usage FOR SELECT USING (auth.uid() = user_id);

-- Subscribers table for Paddle subscription state
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMP WITH TIME ZONE,
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscribers FOR SELECT USING (auth.uid() = user_id);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_query_usage_updated_at
  BEFORE UPDATE ON public.query_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: check + increment daily quota atomically (security definer)
CREATE OR REPLACE FUNCTION public.consume_query_quota(_user_id UUID, _daily_limit INTEGER DEFAULT 15)
RETURNS JSONB AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _current INTEGER;
  _is_subscribed BOOLEAN;
BEGIN
  SELECT COALESCE(subscribed, false) INTO _is_subscribed
    FROM public.subscribers WHERE user_id = _user_id;

  IF COALESCE(_is_subscribed, false) THEN
    INSERT INTO public.query_usage (user_id, usage_date, query_count)
      VALUES (_user_id, _today, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET query_count = public.query_usage.query_count + 1;
    RETURN jsonb_build_object('allowed', true, 'subscribed', true, 'remaining', -1);
  END IF;

  INSERT INTO public.query_usage (user_id, usage_date, query_count)
    VALUES (_user_id, _today, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT query_count INTO _current
    FROM public.query_usage WHERE user_id = _user_id AND usage_date = _today;

  IF _current >= _daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'subscribed', false, 'remaining', 0, 'limit', _daily_limit);
  END IF;

  UPDATE public.query_usage SET query_count = query_count + 1
    WHERE user_id = _user_id AND usage_date = _today;

  RETURN jsonb_build_object('allowed', true, 'subscribed', false, 'remaining', _daily_limit - (_current + 1), 'limit', _daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;