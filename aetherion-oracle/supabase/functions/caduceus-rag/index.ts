// Caduceus RAG: embed a query and return top-k grounding snippets from
// hexagram_docs + caduceus_corpus. Callable by any authenticated user.
//
// POST body: { query: string, k_docs?: number, k_corpus?: number }
// Response: { docs: [...], corpus: [...], context: string }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { embedBatch } from "../_shared/caduceusCorpus.ts";

const Body = z.object({
  query: z.string().min(2).max(2000),
  k_docs: z.number().int().min(1).max(10).default(4),
  k_corpus: z.number().int().min(1).max(20).default(6),
  min_similarity: z.number().min(0).max(1).default(0.28),
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "unauthorized" });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: u, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { error: "unauthorized" });

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
  const { query, k_docs, k_corpus, min_similarity } = parsed.data;

  let embedding: number[];
  try {
    const vecs = await embedBatch([query]);
    embedding = vecs[0];
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "LOVABLE_API_KEY_MISSING") return json(500, { error: msg });
    if (msg.startsWith("EMBED_429")) return json(429, { error: "embed_rate_limited" });
    if (msg.startsWith("EMBED_402")) return json(402, { error: "embed_credits_exhausted" });
    return json(502, { error: "embed_failed", detail: msg });
  }

  const [{ data: docs, error: dErr }, { data: corpus, error: cErr }] = await Promise.all([
    supa.rpc("match_hexagram_docs", {
      _query_embedding: embedding as unknown as string,
      _match_count: k_docs,
      _min_similarity: min_similarity,
    }),
    supa.rpc("match_caduceus_corpus", {
      _query_embedding: embedding as unknown as string,
      _match_count: k_corpus,
      _min_similarity: min_similarity,
    }),
  ]);
  if (dErr) return json(500, { error: `docs_rpc: ${dErr.message}` });
  if (cErr) return json(500, { error: `corpus_rpc: ${cErr.message}` });

  // Build a compact grounding string suitable for prepending to a system prompt.
  const lines: string[] = [];
  if (docs?.length) {
    lines.push("## Hexagram context");
    for (const d of docs as Array<Record<string, unknown>>) {
      lines.push(`- **${d.title}** (sim=${Number(d.similarity).toFixed(3)}): ${d.content}`);
    }
  }
  if (corpus?.length) {
    lines.push("\n## Related engine-state resolutions");
    for (const c of corpus as Array<Record<string, unknown>>) {
      lines.push(
        `- word="${c.word}" · hex ${c.hexagram_number} · phase ${c.aetherion_phase} · ` +
        `harmony ${c.harmony} · sim ${Number(c.similarity).toFixed(3)} — ${c.resolution}`,
      );
    }
  }

  return json(200, {
    docs: docs ?? [],
    corpus: corpus ?? [],
    context: lines.join("\n"),
  });
});
