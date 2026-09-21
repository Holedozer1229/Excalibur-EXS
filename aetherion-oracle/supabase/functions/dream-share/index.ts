// Aetherion — manage Pro-only share links for dreams.
// POST { action: 'create' | 'revoke', dream_id }
//   create: Pro/admin only. Mints a 24-char random token (one per dream) and returns it.
//   revoke: deletes the share row for that dream.
// GET    -> 405 (use POST)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(len = 24): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "create");
    const dreamId = String(body.dream_id ?? "").trim();
    if (!dreamId) return new Response(JSON.stringify({ error: "dream_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Dream must belong to user
    const { data: dream } = await admin.from("dreams").select("id").eq("id", dreamId).eq("user_id", userId).maybeSingle();
    if (!dream) return new Response(JSON.stringify({ error: "dream not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "revoke") {
      await admin.from("dream_shares").delete().eq("dream_id", dreamId).eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true, revoked: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // create: Pro-only gate
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: sub } = await admin.from("subscribers").select("subscribed").eq("user_id", userId).maybeSingle();
    const isPro = !!isAdmin || !!sub?.subscribed;
    if (!isPro) {
      return new Response(JSON.stringify({ error: "PRO_ONLY", message: "Sharing is a Pro feature." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reuse existing token if any (one per dream)
    const { data: existing } = await admin.from("dream_shares").select("token").eq("dream_id", dreamId).maybeSingle();
    if (existing?.token) {
      return new Response(JSON.stringify({ ok: true, token: existing.token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newToken = randomToken(24);
    const { error: insErr } = await admin.from("dream_shares").insert({
      token: newToken, dream_id: dreamId, user_id: userId,
    });
    if (insErr) throw new Error(insErr.message);

    return new Response(JSON.stringify({ ok: true, token: newToken }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dream-share error:", e);
    console.error("dream-share error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
