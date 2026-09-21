-- pgvector must be available
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- hexagram_docs: canonical hexagram + concept documentation for RAG
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.hexagram_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hexagram_number INTEGER,
  kind TEXT NOT NULL DEFAULT 'hexagram',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(3072),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hexagram_docs TO authenticated;
GRANT ALL ON public.hexagram_docs TO service_role;

ALTER TABLE public.hexagram_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hexagram_docs read (auth)"
  ON public.hexagram_docs FOR SELECT TO authenticated USING (true);

CREATE POLICY "hexagram_docs admin write"
  ON public.hexagram_docs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS hexagram_docs_kind_idx ON public.hexagram_docs(kind);
CREATE INDEX IF NOT EXISTS hexagram_docs_hexnum_idx ON public.hexagram_docs(hexagram_number);
CREATE INDEX IF NOT EXISTS hexagram_docs_embedding_idx
  ON public.hexagram_docs USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE TRIGGER hexagram_docs_updated_at
  BEFORE UPDATE ON public.hexagram_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- caduceus_corpus: synthetic {engine_state → resolution} pairs
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.caduceus_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  engine_state JSONB NOT NULL,
  resolution TEXT NOT NULL,
  hexagram_number INTEGER,
  aetherion_phase TEXT,
  harmony NUMERIC(6,4),
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(3072),
  seed BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.caduceus_corpus TO authenticated;
GRANT ALL ON public.caduceus_corpus TO service_role;

ALTER TABLE public.caduceus_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caduceus_corpus read (auth)"
  ON public.caduceus_corpus FOR SELECT TO authenticated USING (true);

CREATE POLICY "caduceus_corpus admin write"
  ON public.caduceus_corpus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS caduceus_corpus_word_idx ON public.caduceus_corpus(word);
CREATE INDEX IF NOT EXISTS caduceus_corpus_hex_idx ON public.caduceus_corpus(hexagram_number);
CREATE INDEX IF NOT EXISTS caduceus_corpus_phase_idx ON public.caduceus_corpus(aetherion_phase);
CREATE INDEX IF NOT EXISTS caduceus_corpus_embedding_idx
  ON public.caduceus_corpus USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- =====================================================================
-- Similarity-search RPCs (SECURITY DEFINER)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.match_hexagram_docs(
  _query_embedding vector(3072),
  _match_count INT DEFAULT 4,
  _min_similarity FLOAT DEFAULT 0.35
)
RETURNS TABLE (
  id UUID,
  hexagram_number INT,
  kind TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT d.id, d.hexagram_number, d.kind, d.title, d.content, d.tags,
         1 - (d.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072))
  FROM public.hexagram_docs d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072)) >= _min_similarity
  ORDER BY d.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072)
  LIMIT GREATEST(LEAST(_match_count, 20), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.match_caduceus_corpus(
  _query_embedding vector(3072),
  _match_count INT DEFAULT 6,
  _min_similarity FLOAT DEFAULT 0.30
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  resolution TEXT,
  hexagram_number INT,
  aetherion_phase TEXT,
  harmony NUMERIC,
  engine_state JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT c.id, c.word, c.resolution, c.hexagram_number, c.aetherion_phase,
         c.harmony, c.engine_state,
         1 - (c.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072))
  FROM public.caduceus_corpus c
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072)) >= _min_similarity
  ORDER BY c.embedding::halfvec(3072) <=> _query_embedding::halfvec(3072)
  LIMIT GREATEST(LEAST(_match_count, 30), 1);
END;
$$;