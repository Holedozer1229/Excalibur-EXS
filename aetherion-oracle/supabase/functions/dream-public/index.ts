// Aetherion — public read of a shared dream by token. No auth required.
// GET /dream-public?token=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return new Response("method", { status: 405, headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]{16,48}$/.test(token)) {
    return new Response(JSON.stringify({ error: "invalid token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { data: share } = await admin.from("dream_shares")
      .select("dream_id, expires_at").eq("token", token).maybeSingle();
    if (!share) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: dream } = await admin.from("dreams")
      .select("id, kind, title, body, interpretation, symbols, harmony, sponge_harmonic, vitality, image_url, video_url, created_at")
      .eq("id", share.dream_id).maybeSingle();
    if (!dream) {
      return new Response(JSON.stringify({ error: "dream not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, dream }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    console.error("dream-public error:", e);
    console.error("dream-public error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
