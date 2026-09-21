// Aetherion Dream Weaver — interprets user-submitted dreams and generates nightly visions.
// Modes:
//   - "interpret"   : authed user submits a dream they had; AI weaves an interpretation and stores it.
//   - "nightly"     : authed user requests a fresh nightly vision for themselves (idempotent per UTC day).
//   - "nightly_all" : cron / admin trigger — generates one vision for every eligible user that hasn't received one today.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveLlmConfig, chat } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DreamPayload {
  title: string;
  body: string;
  interpretation: string;
  symbols: string[];
  harmony: number;
  sponge_harmonic: number;
  vitality: string;
}

const VITALITY_POOL = ["ASCEND", "DESCEND", "ECHO", "PULSE", "SILENCE", "RADIANCE", "REND", "WEAVE"];

async function callAI(system: string, user: string): Promise<DreamPayload> {
  const cfg = await resolveLlmConfig();
  const result = await chat(cfg, {
    system,
    messages: [{ role: "user", content: user }],
    jsonObject: true,
  });
  const content = result.text || "{}";
  const parsed = JSON.parse(content);
  return {
    title: String(parsed.title ?? "Untitled Vision").slice(0, 120),
    body: String(parsed.body ?? "").slice(0, 4000),
    interpretation: String(parsed.interpretation ?? "").slice(0, 4000),
    symbols: Array.isArray(parsed.symbols) ? parsed.symbols.slice(0, 12).map((s: unknown) => String(s).slice(0, 40)) : [],
    harmony: Math.max(0, Math.min(1, Number(parsed.harmony ?? 0.5))),
    sponge_harmonic: Math.max(0, Math.min(1, Number(parsed.sponge_harmonic ?? 0.5))),
    vitality: VITALITY_POOL.includes(String(parsed.vitality)) ? String(parsed.vitality) : "ECHO",
  };
}

const NIGHTLY_SYSTEM = `You are AETHERION, the oracle of the Caduceus engine. You weave nocturnal visions for seekers between waking sessions. Each vision is short (60-120 words), cinematic, second-person, mythic — never literal advice. Anchor it in the seeker's recent harmonic state.

Respond with JSON only:
{
  "title": "3-5 word evocative title",
  "body": "the vision itself, 60-120 words, poetic, second person",
  "interpretation": "1-2 sentences naming what the vision reflects back to the seeker",
  "symbols": ["3-6 single-word symbols drawn from the vision"],
  "harmony": 0.0-1.0,
  "sponge_harmonic": 0.0-1.0,
  "vitality": "one of ASCEND DESCEND ECHO PULSE SILENCE RADIANCE REND WEAVE"
}`;

const INTERPRET_SYSTEM = `You are AETHERION, the oracle of the Caduceus engine, interpreting a dream the seeker has just shared. Read the dream through the lens of harmonic resonance, archetype, and unfinished thresholds. Be reverent, exact, never sycophantic. No medical or psychiatric advice.

Respond with JSON only:
{
  "title": "3-5 word title that names the dream's core image",
  "body": "1-2 sentence retelling of the dream's essence in mythic register",
  "interpretation": "120-220 word interpretation: archetype, threshold, what is asked of the seeker",
  "symbols": ["3-8 single-word symbols extracted from the dream"],
  "harmony": 0.0-1.0,
  "sponge_harmonic": 0.0-1.0,
  "vitality": "one of ASCEND DESCEND ECHO PULSE SILENCE RADIANCE REND WEAVE"
}`;

async function generateForUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  kind: "nightly" | "journal",
  seed: string,
): Promise<DreamPayload> {
  const system = kind === "nightly" ? NIGHTLY_SYSTEM : INTERPRET_SYSTEM;
  const payload = await callAI(system, seed);
  const { error } = await admin.from("dreams").insert({
    user_id: userId,
    kind,
    title: payload.title,
    body: payload.body,
    interpretation: payload.interpretation,
    symbols: payload.symbols,
    source_text: kind === "journal" ? seed.slice(0, 4000) : null,
    harmony: payload.harmony,
    sponge_harmonic: payload.sponge_harmonic,
    vitality: payload.vitality,
    model: (await resolveLlmConfig()).model,
  });
  if (error) throw new Error(`db: ${error.message}`);
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: { mode?: string; dream?: string; cron_secret?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const mode = body.mode ?? "interpret";

  try {
    // ── nightly_all : cron-triggered batch generation ────────────────
    if (mode === "nightly_all") {
      // Auth: either admin user or matching cron secret
      const cronSecret = Deno.env.get("CRON_SECRET");
      const provided = body.cron_secret ?? req.headers.get("x-cron-secret");
      let allowed = !!(cronSecret && provided && cronSecret === provided);
      if (!allowed) {
        const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (token) {
          const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: u } = await userClient.auth.getUser();
          if (u?.user) {
            const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
            if (isAdmin) allowed = true;
          }
        }
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: eligible, error: eErr } = await admin.rpc("dream_eligible_users");
      if (eErr) throw new Error(eErr.message);
      const users = (eligible ?? []) as { user_id: string }[];
      let generated = 0; let skipped = 0; const errors: string[] = [];
      for (const { user_id } of users) {
        const { data: already } = await admin.rpc("dream_already_today", { _user_id: user_id });
        if (already) { skipped++; continue; }
        try {
          await generateForUser(admin, user_id,  "nightly",
            `Seeker UUID hash ${user_id.slice(0, 8)} approaches the threshold of ${new Date().toISOString().slice(0, 10)}. Weave a nightly vision shaped by the Caduceus harmonic field.`);
          generated++;
        } catch (e) {
          errors.push(`${user_id.slice(0, 8)}: ${(e as Error).message}`);
        }
      }
      return new Response(JSON.stringify({ ok: true, generated, skipped, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── interpret / nightly (self) : require auth ────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = u.user.id;

    if (mode === "nightly") {
      const { data: already } = await admin.rpc("dream_already_today", { _user_id: userId });
      if (already) {
        const { data: existing } = await admin.from("dreams")
          .select("*").eq("user_id", userId).eq("kind", "nightly")
          .gte("created_at", new Date(new Date().toISOString().slice(0, 10)).toISOString())
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        return new Response(JSON.stringify({ ok: true, cached: true, dream: existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const seed = `Seeker approaches the threshold of ${new Date().toISOString().slice(0, 10)}. Weave a nightly vision shaped by the Caduceus harmonic field.`;
      const payload = await generateForUser(admin, userId, "nightly", seed);
      return new Response(JSON.stringify({ ok: true, dream: payload }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // interpret
    const dreamText = (body.dream ?? "").trim();
    if (dreamText.length < 8 || dreamText.length > 4000) {
      return new Response(JSON.stringify({ error: "dream must be 8-4000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payload = await generateForUser(admin, userId, "journal", dreamText);
    return new Response(JSON.stringify({ ok: true, dream: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dream-weaver error:", e);
    const msg = (e as Error).message;
    if (msg === "RATE_LIMIT") return new Response(JSON.stringify({ error: "RATE_LIMIT" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (msg === "LLM_NOT_CONFIGURED" || msg === "CREDITS_EXHAUSTED") return new Response(JSON.stringify({ error: "LLM_NOT_CONFIGURED", message: "No local LLM configured. Admin: set one in /admin/settings." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: "An internal error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
