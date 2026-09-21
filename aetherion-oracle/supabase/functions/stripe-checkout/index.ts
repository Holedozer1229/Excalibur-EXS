// stripe-checkout — create a Stripe Checkout Session for a tier upgrade.
//
// POST /stripe-checkout  { tier: "acolyte" | "oracle_pro", interval?: "month" | "year" }
//   - Returns { url } for the Stripe-hosted checkout page.
//   - Embeds user_id + tier + interval in session metadata so the webhook
//     knows what to grant.
//
// Pricing is configured in code (PRICES) — no need to pre-create products in
// Stripe; we use price_data inline. Switch to Price IDs later if desired.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tier = "acolyte" | "oracle_pro";
type Interval = "month" | "year";

// USD cents. Yearly = ~10x monthly (2 months free).
// Founder plan: $9/mo · $79/yr (2.6 months free on annual). Both intervals
// give the same "Founder" access; annual = commitment discount.
const PRICES: Record<Tier, Record<Interval, { amount: number; name: string }>> = {
  acolyte: {
    month: { amount: 900,  name: "Aetherion · Founder (monthly)" },
    year:  { amount: 7900, name: "Aetherion · Founder (yearly)"  },
  },
  oracle_pro: {
    month: { amount: 900,  name: "Aetherion · Founder (monthly)" },
    year:  { amount: 7900, name: "Aetherion · Founder (yearly)"  },
  },
};

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
    // sk_test_… → test mode, sk_live_… → live mode. Stripe routes by key.
    const stripeMode: "test" | "live" = STRIPE_KEY.startsWith("sk_live_") ? "live" : "test";
    const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    if (WEBHOOK_SECRET && !WEBHOOK_SECRET.startsWith("whsec_")) {
      console.warn("STRIPE_WEBHOOK_SECRET does not start with whsec_ — looks wrong.");
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return json({ error: "Auth failed" }, 401);
    const user = ud.user;

    const body = await req.json().catch(() => ({})) as {
      tier?: string; interval?: string; success_url?: string; cancel_url?: string;
      referral_code?: string; trial?: boolean;
    };
    const tier = body.tier as Tier;
    const interval = (body.interval ?? "month") as Interval;
    const referralCode = (body.referral_code ?? "").trim().toUpperCase().slice(0, 32) || null;
    const wantsTrial = body.trial !== false; // default: enable 14-day trial
    if (!PRICES[tier]) return json({ error: `Invalid tier "${tier}"` }, 400);
    if (!PRICES[tier][interval]) return json({ error: `Invalid interval "${interval}"` }, 400);
    const price = PRICES[tier][interval];

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

    // Re-use Stripe customer if we already created one for this user.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: sub } = await admin
      .from("subscribers")
      .select("stripe_customer_id, email")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
      customerId = existing.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          email: user.email!,
          metadata: { supabase_user_id: user.id },
        });
        customerId = created.id;
      }
    }

    const origin = req.headers.get("origin") ?? "https://www.excaliburcrypto.com";
    const successUrl = body.success_url ?? `${origin}/?upgrade=success&tier=${tier}`;
    const cancelUrl  = body.cancel_url  ?? `${origin}/?upgrade=cancelled`;

    // Trial eligibility: never subscribed before (no subscribers row & no
    // prior Stripe subscription for this customer). Prevents trial abuse.
    let trialEligible = wantsTrial && !sub;
    if (trialEligible && customerId) {
      const prior = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
      if (prior.data.length > 0) trialEligible = false;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          recurring: { interval },
          unit_amount: price.amount,
          product_data: { name: price.name },
        },
      }],
      // Embedded on session AND subscription so the webhook can read either.
      metadata: { supabase_user_id: user.id, tier, interval, ...(referralCode ? { referral_code: referralCode } : {}) },
      subscription_data: {
        metadata: { supabase_user_id: user.id, tier, interval, ...(referralCode ? { referral_code: referralCode } : {}) },
        ...(trialEligible ? { trial_period_days: 14 } : {}),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return json({ url: session.url, id: session.id, mode: stripeMode, trial_applied: trialEligible }, 200);
  } catch (e) {
    console.error("stripe-checkout error:", e);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
