import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MIN_DWELL_MS = 8_000;
const DEFAULT_MIN_SCROLL_PCT = 85;
const REQUIRED_CLAUSES = ["read_full", "understand_risk", "no_auto_approve", "org_policy"];

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function trim(v: unknown, max = 500): string | null {
  return typeof v === "string" ? v.trim().slice(0, max) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const organization = trim(body.organization, 120);
    const reviewer_id = trim(body.reviewer_id, 120);
    const artifact_text = trim(body.artifact_text, 50_000);
    const dwell_ms = Number(body.dwell_ms);
    const scroll_depth_pct = Number(body.scroll_depth_pct);
    const min_dwell_ms = Number(body.min_dwell_ms ?? DEFAULT_MIN_DWELL_MS);
    const min_scroll_pct = Number(body.min_scroll_pct ?? DEFAULT_MIN_SCROLL_PCT);
    const acknowledged = Array.isArray(body.acknowledged_clause_ids)
      ? body.acknowledged_clause_ids.filter((x) => typeof x === "string").map((x) => String(x))
      : [];

    if (!organization || !reviewer_id || !artifact_text) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(dwell_ms) || dwell_ms < min_dwell_ms) {
      return new Response(JSON.stringify({ error: "dwell_too_short", min_dwell_ms }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(scroll_depth_pct) || scroll_depth_pct < min_scroll_pct) {
      return new Response(JSON.stringify({ error: "scroll_insufficient", min_scroll_pct }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const id of REQUIRED_CLAUSES) {
      if (!acknowledged.includes(id)) {
        return new Response(JSON.stringify({ error: "clause_missing", clause: id }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const artifact_hash = await sha256Hex(artifact_text);
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const issuedAtMs = Date.now();
    const clauses = [...acknowledged].sort().join(",");
    const payload = [
      organization.toLowerCase(),
      reviewer_id.toLowerCase(),
      artifact_hash,
      String(Math.floor(dwell_ms)),
      String(Math.floor(min_dwell_ms)),
      String(Math.floor(scroll_depth_pct)),
      String(Math.floor(min_scroll_pct)),
      clauses,
      nonce,
      String(issuedAtMs),
    ].join("::");
    const commitment_hash = await sha256Hex(payload);

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
      } catch {
        /* anonymous B2B reviewer */
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const excerpt = artifact_text.slice(0, 240);
    const { error } = await admin.from("deliberation_receipts").insert({
      user_id,
      organization,
      reviewer_id,
      artifact_hash,
      artifact_excerpt: excerpt,
      dwell_ms: Math.floor(dwell_ms),
      min_dwell_ms: Math.floor(min_dwell_ms),
      scroll_depth_pct: Math.floor(scroll_depth_pct),
      acknowledged_clauses: acknowledged,
      nonce,
      commitment_hash,
    });

    if (error) {
      console.error("deliberation insert failed", error);
      return new Response(JSON.stringify({ error: "persist_failed", detail: error.message }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const site = Deno.env.get("SITE_URL") ?? "https://www.excaliburcrypto.com";
    const verifyUrl = `${site.replace(/\/$/, "")}/verify/deliberation?nonce=${nonce}&hash=${commitment_hash}`;

    return new Response(
      JSON.stringify({
        ok: true,
        nonce,
        commitment_hash,
        artifact_hash,
        verifyUrl,
        organization,
        reviewer_id,
        dwell_ms: Math.floor(dwell_ms),
        scroll_depth_pct: Math.floor(scroll_depth_pct),
        issued_at: new Date(issuedAtMs).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("deliberation-seal error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
