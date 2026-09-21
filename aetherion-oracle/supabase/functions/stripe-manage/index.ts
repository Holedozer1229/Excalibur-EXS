// stripe-manage — self-service subscription management.
//
// POST /stripe-manage { action: "change_tier", tier, interval }
//   • If user already has an active subscription, switches the price using
//     standard SaaS rules:
//       - Upgrade  → immediate, prorated (proration_behavior: "always_invoice")
//       - Downgrade → schedule the change at current_period_end via
//                     subscription_schedules (keeps paid tier until then).
//   • If no active sub, returns { needs_checkout: true } so the UI can fall
//     back to the regular Checkout flow.
//
// POST /stripe-manage { action: "cancel" }              → cancel at period_end
// POST /stripe-manage { action: "resume" }              → undo a pending cancel
// POST /stripe-manage { action: "billing_portal" }      → returns Stripe portal URL
// POST /stripe-manage { action: "latest_invoice_url" }  → hosted invoice for retry

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tier = "acolyte" | "oracle_pro";
type Interval = "month" | "year";
type Action = "change_tier" | "cancel" | "resume" | "billing_portal" | "latest_invoice_url";

const PRICES: Record<Tier, Record<Interval, number>> = {
  acolyte:    { month: 999,  year: 9990 },
  oracle_pro: { month: 4999, year: 49990 },
};
const NAMES: Record<Tier, string> = { acolyte: "Acolyte", oracle_pro: "Oracle Pro" };
const TIER_RANK: Record<Tier, number> = { acolyte: 1, oracle_pro: 2 };

function priceData(tier: Tier, interval: Interval) {
  return {
    currency: "usd",
    recurring: { interval },
    unit_amount: PRICES[tier][interval],
    product_data: { name: `Aetherion · ${NAMES[tier]} (${interval}ly)` },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY not configured." }, 500);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return json({ error: "Auth failed" }, 401);
    const user = ud.user;

    const body = await req.json().catch(() => ({})) as {
      action?: Action; tier?: Tier; interval?: Interval;
    };
    const action = body.action;
    if (!action) return json({ error: "Missing action" }, 400);

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: sub } = await admin
      .from("subscribers")
      .select("stripe_customer_id, stripe_subscription_id, subscription_tier, latest_invoice_hosted_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;
    const subscriptionId = (sub as { stripe_subscription_id?: string } | null)?.stripe_subscription_id ?? null;
    const currentTier = (sub as { subscription_tier?: string } | null)?.subscription_tier as Tier | undefined;

    if (action === "latest_invoice_url") {
      const url = (sub as { latest_invoice_hosted_url?: string } | null)?.latest_invoice_hosted_url;
      return json({ url: url ?? null }, 200);
    }

    if (action === "billing_portal") {
      if (!customerId) return json({ error: "No Stripe customer on file." }, 400);
      const origin = req.headers.get("origin") ?? "https://www.excaliburcrypto.com";
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId, return_url: origin,
      });
      return json({ url: portal.url }, 200);
    }

    if (!subscriptionId) {
      return json({ needs_checkout: true, error: "No active subscription." }, 200);
    }

    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

    if (action === "cancel") {
      const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      return json({
        ok: true,
        cancel_at_period_end: true,
        period_end: new Date(updated.current_period_end * 1000).toISOString(),
      }, 200);
    }

    if (action === "resume") {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
      return json({ ok: true, cancel_at_period_end: false }, 200);
    }

    if (action === "change_tier") {
      const tier = body.tier;
      const interval: Interval = body.interval ?? "month";
      if (!tier || !PRICES[tier]) return json({ error: "Invalid tier" }, 400);
      if (!["month", "year"].includes(interval)) return json({ error: "Invalid interval" }, 400);

      const itemId = stripeSub.items.data[0]?.id;
      if (!itemId) return json({ error: "Subscription has no items" }, 500);

      const isUpgrade = currentTier && TIER_RANK[tier] > TIER_RANK[currentTier as Tier];

      if (isUpgrade) {
        const updated = await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: itemId, price_data: priceData(tier, interval) }],
          proration_behavior: "always_invoice",
          metadata: { ...(stripeSub.metadata ?? {}), supabase_user_id: user.id, tier, interval },
        });
        await admin.from("tier_change_audit").insert({
          user_id: user.id, email: user.email, from_tier: currentTier ?? null, to_tier: tier,
          change_type: "immediate", source: "self_service",
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          metadata: { interval, initiated_by: "stripe-manage", period_end: new Date(updated.current_period_end * 1000).toISOString() },
        });
        return json({
          ok: true, mode: "immediate", tier, interval,
          period_end: new Date(updated.current_period_end * 1000).toISOString(),
        }, 200);
      }

      let scheduleId: string | null = null;
      if (stripeSub.schedule) {
        scheduleId = typeof stripeSub.schedule === "string" ? stripeSub.schedule : stripeSub.schedule.id;
      } else {
        const created = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
        scheduleId = created.id;
      }
      const sched = await stripe.subscriptionSchedules.retrieve(scheduleId!);
      const currentPhase = sched.phases.find((p) => p.start_date * 1000 <= Date.now());
      if (!currentPhase) return json({ error: "Could not locate current phase" }, 500);

      await stripe.subscriptionSchedules.update(scheduleId!, {
        end_behavior: "release",
        phases: [
          {
            items: currentPhase.items.map((it) => ({
              price: typeof it.price === "string" ? it.price : it.price.id,
              quantity: it.quantity ?? 1,
            })),
            start_date: currentPhase.start_date,
            end_date: currentPhase.end_date,
            proration_behavior: "none",
          },
          {
            items: [{ price_data: priceData(tier, interval), quantity: 1 }],
            iterations: 1,
            proration_behavior: "none",
            metadata: { supabase_user_id: user.id, tier, interval },
          },
        ],
      });

      const effectiveAt = new Date(stripeSub.current_period_end * 1000).toISOString();
      await admin.from("subscribers").update({
        pending_tier: tier,
        pending_tier_effective_at: effectiveAt,
      }).eq("user_id", user.id);

      await admin.from("tier_change_audit").insert({
        user_id: user.id, email: user.email, from_tier: currentTier ?? null, to_tier: tier,
        change_type: "scheduled", source: "self_service",
        effective_at: effectiveAt,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        metadata: { interval, initiated_by: "stripe-manage", schedule_id: scheduleId },
      });

      return json({ ok: true, mode: "scheduled", tier, interval, effective_at: effectiveAt }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("stripe-manage error:", e);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
