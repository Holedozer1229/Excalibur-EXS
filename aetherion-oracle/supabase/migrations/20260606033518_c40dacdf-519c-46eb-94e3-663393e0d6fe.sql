CREATE TABLE public.learn_articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  keyword TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.learn_articles TO anon, authenticated;
GRANT ALL ON public.learn_articles TO service_role;

ALTER TABLE public.learn_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read learn articles"
ON public.learn_articles FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER learn_articles_set_updated_at
BEFORE UPDATE ON public.learn_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();