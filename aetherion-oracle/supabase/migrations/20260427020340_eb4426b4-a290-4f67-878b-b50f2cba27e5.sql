-- 1. pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. memories table
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_user ON public.memories(user_id);
CREATE INDEX idx_memories_embedding ON public.memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories"
  ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own memories"
  ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own memories"
  ON public.memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own memories"
  ON public.memories FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. verified_contracts table
CREATE TABLE public.verified_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  name TEXT,
  symbol TEXT,
  decimals INTEGER,
  total_supply NUMERIC,
  tx_hash TEXT,
  owner_address TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chain_id),
  CHECK (contract_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (owner_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_verified_contracts_user ON public.verified_contracts(user_id);

ALTER TABLE public.verified_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contracts"
  ON public.verified_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contracts"
  ON public.verified_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts"
  ON public.verified_contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts"
  ON public.verified_contracts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_verified_contracts_updated_at
  BEFORE UPDATE ON public.verified_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. similarity search function
CREATE OR REPLACE FUNCTION public.match_user_memories(
  _user_id UUID,
  _query_embedding vector(768),
  _match_count INT DEFAULT 5,
  _min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.summary,
         1 - (m.embedding <=> _query_embedding) AS similarity,
         m.created_at
  FROM public.memories m
  WHERE m.user_id = _user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> _query_embedding) >= _min_similarity
  ORDER BY m.embedding <=> _query_embedding
  LIMIT _match_count;
END;
$$;