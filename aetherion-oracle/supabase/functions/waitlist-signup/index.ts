import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const trim = (v: unknown, max = 200) =>
  typeof v === "string" ? v.slice(0, max).trim() : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = trim(body.email, 240)?.toLowerCase() ?? "";
    if (!email || !EMAIL_RE.test(email) || email.length > 240) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upsert by email so the same address re-submitting from a new ad refreshes its UTM context.
    const { error } = await admin.from("waitlist").upsert(
      {
        email,
        source: trim(body.source, 64),
        utm_source: trim(body.utm_source, 64),
        utm_medium: trim(body.utm_medium, 64),
        utm_campaign: trim(body.utm_campaign, 120),
        utm_term: trim(body.utm_term, 120),
        utm_content: trim(body.utm_content, 120),
        ref_code: trim(body.ref_code, 32),
        session_id: trim(body.session_id, 64),
        user_agent: trim(body.user_agent, 280),
        metadata: (typeof body.metadata === "object" && body.metadata) ? body.metadata : {},
      },
      { onConflict: "email" },
    );
    if (error) {
      console.warn("waitlist insert failed:", error.message);
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("waitlist-signup error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
