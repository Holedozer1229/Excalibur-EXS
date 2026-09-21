CREATE OR REPLACE FUNCTION public.match_user_memories(
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
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT m.id, m.content, m.summary,
         1 - (m.embedding <=> _query_embedding) AS similarity,
         m.created_at
  FROM public.memories m
  WHERE m.user_id = _uid
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> _query_embedding) >= _min_similarity
  ORDER BY m.embedding <=> _query_embedding
  LIMIT _match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_user_memories(uuid, vector, int, float);