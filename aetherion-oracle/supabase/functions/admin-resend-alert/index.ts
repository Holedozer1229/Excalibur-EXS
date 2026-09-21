import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" }) : null;

const TEMPLATE_FOR_CHANGE: Record<string, string> = {
  payment_failed: "payment-failed",
  payment_recovered: "payment-recovered",
  renewal: "subscription-renewed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub;

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const auditId = body?.audit_id as string | undefined;
    const overrideTemplate = body?.template as string | undefined;
    if (!auditId) return json({ error: "audit_id required" }, 400);

    const { data: auditRow, error: auditErr } = await admin
      .from("tier_change_audit").select("*").eq("id", auditId).maybeSingle();
    if (auditErr || !auditRow) return json({ error: "audit row not found" }, 404);

    const meta = (auditRow.metadata ?? {}) as Record<string, unknown>;
    const template =
      overrideTemplate ||
      TEMPLATE_FOR_CHANGE[auditRow.change_type as string] ||
      (auditRow.change_type === "payment_failed" && meta.status === "requires_action"
        ? "payment-requires-action"
        : null);

    if (!template) return json({ error: `No email template for change_type ${auditRow.change_type}` }, 400);

    let recipient = auditRow.email as string | null;
    if (!recipient) {
      const { data: sub } = await admin.from("subscribers").select("email").eq("user_id", auditRow.user_id).maybeSingle();
      recipient = (sub as { email?: string } | null)?.email ?? null;
    }
    if (!recipient) return json({ error: "No recipient email on file" }, 400);

    // Try to enrich data from the Stripe event if available
    let templateData: Record<string, unknown> = {
      event_id: auditRow.stripe_event_id,
      tier: auditRow.to_tier,
      ...meta,
    };

    if (stripe && auditRow.stripe_event_id) {
      try {
        const evt = await stripe.events.retrieve(auditRow.stripe_event_id);
        const inv = evt.data.object as Stripe.Invoice;
        if (inv && inv.object === "invoice") {
          templateData = {
            ...templateData,
            amount: ((inv.amount_paid ?? 0) / 100).toFixed(2),
            amount_due: ((inv.amount_due ?? 0) / 100).toFixed(2),
            currency: (inv.currency ?? "usd").toUpperCase(),
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
            next_attempt: inv.next_payment_attempt ? new Date(inv.next_payment_attempt * 1000).toISOString() : null,
            period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          };
        }
      } catch (e) {
        console.warn("stripe event lookup failed:", e);
      }
    }

    const idempotencyKey = `resend-${template}-${auditRow.id}-${Date.now()}`;
    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: { templateName: template, recipientEmail: recipient, idempotencyKey, templateData },
    });
    if (sendErr) return json({ error: "Email send failed" }, 500);

    await admin.from("tier_change_audit").insert({
      user_id: auditRow.user_id,
      email: recipient,
      from_tier: auditRow.from_tier,
      to_tier: auditRow.to_tier,
      change_type: auditRow.change_type,
      effective_at: new Date().toISOString(),
      source: "admin_resend",
      stripe_event_id: auditRow.stripe_event_id,
      stripe_subscription_id: auditRow.stripe_subscription_id,
      stripe_customer_id: auditRow.stripe_customer_id,
      metadata: { resend_of: auditRow.id, template, by: callerId },
    });

    return json({ ok: true, template, recipient });
  } catch (e) {
    console.error("admin-resend-alert error:", e);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
