import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENTS = new Set([
  "lp_visit",
  "lp_cast_started",
  "lp_cast_completed",
  "home_visit",
  "home_cast_started",
  "home_cast_completed",
  "tarot_cast_completed",
  "post_reading_signup_shown",
  "post_reading_signup_clicked",
  "founder_modal_shown",
  "founder_modal_dismissed",
  "founder_checkout_started",
  "founder_purchase_success",
  "founder_strip_click",
  "founder_card_click",
  "waitlist_modal_shown",
  "waitlist_submitted",
  "auth_started",
  "auth_completed",
  "signup_completed_post_reading",
  "aetx_claim_started",
  "aetx_claim_completed",
  "premium_seal_burned",
  "referral_link_copied",
  "referral_signup_attributed",
  "first_paid_conversion",
  "deliberation_seal_started",
  "deliberation_seal_completed",
  "rollup_strip_click",
  "rollup_visit",
  "overnight_rail_click",
  "black_pearl_plunder",
  "buy_uruu_visit",
  "curve_visit",
  "curve_embed_view",
  "curve_referral_link_copied",
  "curve_embed_copied",
]);

const trim = (v: unknown, max = 200) =>
  typeof v === "string" ? v.slice(0, max) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const event_name = trim(body.event_name, 64);
    const session_id = trim(body.session_id, 64);
    if (!event_name || !ALLOWED_EVENTS.has(event_name)) {
      return new Response(JSON.stringify({ error: "invalid_event" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!session_id) {
      return new Response(JSON.stringify({ error: "missing_session_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user_id from JWT if present — fully optional.
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (jwt && jwt !== Deno.env.get("SUPABASE_ANON_KEY")) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } },
        );
        const { data } = await userClient.auth.getUser();
        user_id = data.user?.id ?? null;
      } catch { /* anonymous */ }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const meta = (typeof body.metadata === "object" && body.metadata) ? body.metadata : {};

    const { error } = await admin.from("funnel_events").insert({
      event_name,
      session_id,
      user_id,
      source: trim(body.source, 64),
      utm_source: trim(body.utm_source, 64),
      utm_medium: trim(body.utm_medium, 64),
      utm_campaign: trim(body.utm_campaign, 120),
      utm_term: trim(body.utm_term, 120),
      utm_content: trim(body.utm_content, 120),
      ref_code: trim(body.ref_code, 32),
      path: trim(body.path, 240),
      referrer: trim(body.referrer, 500),
      user_agent: trim(body.user_agent, 280),
      metadata: meta,
    });
    if (error) {
      console.warn("funnel insert failed:", error.message);
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-funnel-event error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
