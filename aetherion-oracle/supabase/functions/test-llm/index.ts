// Admin-only: validates the current LLM config (custom override or Lovable AI)
// by issuing a tiny chat completion. Returns latency + reply preview.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveLlmConfig, chat } from "../_shared/llm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Require admin
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthenticated" }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "unauthenticated" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: u.user.id, _role: "admin",
  });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const cfg = await resolveLlmConfig();
  const started = Date.now();
  try {
    const r = await chat(cfg, {
      messages: [{ role: "user", content: "Reply with exactly: PONG" }],
      maxTokens: 16,
      temperature: 0,
    });
    return json({
      ok: true,
      provider: cfg.provider,
      model: cfg.model,
      base_url: cfg.baseUrl,
      latency_ms: Date.now() - started,
      reply: r.text.slice(0, 200),
    });
  } catch (e) {
    return json({
      ok: false,
      provider: cfg.provider,
      model: cfg.model,
      base_url: cfg.baseUrl,
      latency_ms: Date.now() - started,
      error: (e as Error).message,
    }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
