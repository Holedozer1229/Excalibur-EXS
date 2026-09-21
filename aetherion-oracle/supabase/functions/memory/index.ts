// Per-user pgvector memory store.
// Routes (all require auth):
//   POST  ?action=write   { content, source? }   → embed + insert
//   POST  ?action=search  { query, k?, min? }    → top-k similar memories
//   GET   ?action=list                           → recent memories
//   DELETE ?action=delete&id=<uuid>              → delete one memory
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMENSIONS = 768;

async function embed(text: string): Promise<number[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text, dimensions: EMBED_DIMENSIONS }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`embed failed [${r.status}]: ${t}`);
  }
  const j = await r.json();
  const v = j?.data?.[0]?.embedding;
  if (!Array.isArray(v)) throw new Error("embedding shape unexpected");
  return v;
}

async function tryEmbed(text: string): Promise<number[] | null> {
  try {
    return await embed(text);
  } catch (e) {
    console.warn("memory embedding skipped:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("memory configuration missing:", { hasUrl: !!SUPABASE_URL, hasAnonKey: !!SUPABASE_ANON_KEY });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = u.user.id;

    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    let prefetchedBody: Record<string, unknown> | null = null;
    if (!action && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
      try { prefetchedBody = await req.json(); } catch { prefetchedBody = null; }
      if (prefetchedBody && typeof prefetchedBody.action === "string") {
        action = prefetchedBody.action;
      }
    }
    action = action ?? "list";

    if (action === "write" && req.method === "POST") {
      const { content, source } = (prefetchedBody ?? await req.json()) as { content?: string; source?: string };
      const text = (content ?? "").trim();
      if (!text || text.length > 4000) {
        return new Response(JSON.stringify({ error: "content required (1-4000 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const emb = await tryEmbed(text);
      const { data, error } = await userClient.from("memories").insert({
        user_id: userId,
        content: text,
        source: source === "manual" ? "manual" : "auto",
        embedding: emb as unknown as string | null,
      }).select("id, content, source, created_at").single();
      if (error) throw error;
      return new Response(JSON.stringify({ memory: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search" && req.method === "POST") {
      const { query, k, min } = (prefetchedBody ?? await req.json()) as { query?: string; k?: number; min?: number };
      const q = (query ?? "").trim();
      if (!q) {
        return new Response(JSON.stringify({ matches: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const emb = await tryEmbed(q);
      if (!emb) {
        return new Response(JSON.stringify({ matches: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await userClient.rpc("match_user_memories", {
        _query_embedding: emb as unknown as string,
        _match_count: Math.min(Math.max(k ?? 5, 1), 20),
        _min_similarity: typeof min === "number" ? min : 0.5,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ matches: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list" && req.method === "GET") {
      const { data, error } = await userClient
        .from("memories")
        .select("id, content, source, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ memories: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await userClient.from("memories").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("memory error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
