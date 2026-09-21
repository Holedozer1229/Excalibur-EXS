// Aetherion — enqueue an image or video generation job via Replicate (async).
// Creates a Replicate prediction with a webhook back to `replicate-webhook`, inserts a
// `media_generations` row with status='pending', and returns immediately. The webhook
// finalizes the job and the client gets notified via realtime.
//
// Free tier: 3 generations / month (image + video combined). Pro subscribers: unlimited.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_MONTHLY_QUOTA = 5;
const GW = "https://connector-gateway.lovable.dev/replicate/v1";

const IMAGE_MODEL = "black-forest-labs/flux-schnell";
const IMAGE_MODEL_PRO = "black-forest-labs/flux-2-pro";
const VIDEO_MODEL = "minimax/video-01";

interface Body { dream_id?: string; kind?: "image" | "video"; pro_vision?: boolean }

async function deriveWebhookToken(): Promise<string> {
  // Stable per-project token derived from service role key; used to authenticate the webhook.
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const buf = new TextEncoder().encode(`replicate-webhook:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
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

    const body: Body = await req.json().catch(() => ({}));
    const kind = body.kind === "video" ? "video" : "image";
    const proVision = body.pro_vision === true;
    const dreamId = String(body.dream_id ?? "").trim();
    if (!dreamId) {
      return new Response(JSON.stringify({ error: "dream_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: dream, error: dErr } = await admin.from("dreams").select("*").eq("id", dreamId).eq("user_id", userId).maybeSingle();
    if (dErr || !dream) {
      return new Response(JSON.stringify({ error: "dream not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Quota — pending counts so we don't allow spamming requests
    const { data: sub } = await admin.from("subscribers").select("subscribed").eq("user_id", userId).maybeSingle();
    const isPro = !!sub?.subscribed;
    if (!isPro) {
      const { data: bonuses } = await admin.rpc("get_user_bonuses", { _user_id: userId });
      const imageBonus = Number((bonuses as { bonus_dream_images?: number } | null)?.bonus_dream_images ?? 0);
      const effectiveLimit = FREE_MONTHLY_QUOTA + imageBonus;
      const { data: used } = await admin.rpc("media_quota_used_this_month", { _user_id: userId });
      const usedCount = Number(used ?? 0);
      if (usedCount >= effectiveLimit) {
        return new Response(JSON.stringify({
          error: "QUOTA_EXCEEDED", used: usedCount, limit: effectiveLimit,
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Insert pending row first (so quota counts it even if Replicate call races)
    const { data: job, error: jErr } = await admin.from("media_generations").insert({
      user_id: userId, dream_id: dreamId, kind, status: "pending",
    }).select("id").single();
    if (jErr || !job) throw new Error(`db: ${jErr?.message ?? "no job"}`);

    // Build prompt
    const symbols = (dream.symbols ?? []).slice(0, 6).join(", ");
    const corePrompt = `${dream.title ?? "vision"}: ${dream.body.slice(0, 400)}. Symbols: ${symbols}. Mythic, cinematic, esoteric, painterly, golden hour, occult symbolism, high detail.`;
    const useProImage = kind === "image" && proVision && isPro;
    const model = kind === "image" ? (useProImage ? IMAGE_MODEL_PRO : IMAGE_MODEL) : VIDEO_MODEL;
    const input: Record<string, unknown> = kind === "image"
      ? (useProImage
          ? { prompt: corePrompt, aspect_ratio: "3:4", output_format: "webp" }
          : { prompt: corePrompt, aspect_ratio: "3:4", output_format: "jpg", output_quality: 90, num_outputs: 1 })
      : { prompt: corePrompt.slice(0, 1000) };

    // Replicate webhook back to us, with auth token in URL (Replicate doesn't forward headers)
    const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
    const wToken = await deriveWebhookToken();
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/replicate-webhook?token=${wToken}&job=${job.id}`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const repKey = Deno.env.get("LOVABLE_CONNECTOR_REPLICATE_API_KEY") ?? Deno.env.get("REPLICATE_API_KEY");
    if (!lovableKey || !repKey) throw new Error("Replicate connector not configured");

    const r = await fetch(`${GW}/models/${model}/predictions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": repKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input, webhook: webhookUrl, webhook_events_filter: ["completed"] }),
    });
    if (!r.ok) {
      const t = await r.text();
      await admin.from("media_generations").update({ status: "failed", error: `replicate ${r.status}: ${t.slice(0, 300)}` }).eq("id", job.id);
      let detail = t.slice(0, 300);
      try { const j = JSON.parse(t); detail = j.detail ?? j.title ?? detail; } catch { /* */ }
      if (r.status === 402) {
        return new Response(JSON.stringify({ error: "CREDITS_EXHAUSTED", detail: "The vision service is out of credit. Please try again shortly." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (r.status === 429) {
        return new Response(JSON.stringify({ error: "RATE_LIMITED", detail: "The vision service is throttled. Please wait a moment and try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Replicate ${r.status}: ${detail}`);
    }
    const pred = await r.json();
    await admin.from("media_generations").update({ prediction_id: pred.id }).eq("id", job.id);

    return new Response(JSON.stringify({
      ok: true, job_id: job.id, kind, status: "pending", pro: isPro,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-media error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
