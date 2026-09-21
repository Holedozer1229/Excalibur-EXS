// founder-offer — First-50-subscribers $5.99/mo Oracle Pro special.
//
// Implements a Stripe coupon (88% off, duration: once, max_redemptions: 50)
// applied to the existing `oracle_pro_monthly` price. Stripe enforces the
// 50-cap atomically; renewals automatically bill at the full $49.99/mo.
//
// GET  ?action=status   -> { remaining, max, sold_out, valid }
// POST { returnUrl }    -> { clientSecret }   (embedded checkout)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const COUPON_ID = "founder_first_50_oracle_pro";
const MAX_REDEMPTIONS = 50;
const AMOUNT_OFF_CENTS = 4400; // $49.99 -> $5.99
const PRICE_LOOKUP = "oracle_pro_monthly";

async function getOrCreateCoupon(stripe: ReturnType<typeof createStripeClient>) {
  try {
    return await stripe.coupons.retrieve(COUPON_ID);
  } catch (_) {
    return await stripe.coupons.create({
      id: COUPON_ID,
      name: "Founders 50 — first month $5.99",
      amount_off: AMOUNT_OFF_CENTS,
      currency: "usd",
      duration: "once",
      max_redemptions: MAX_REDEMPTIONS,
      metadata: { campaign: "founders_first_50" },
    });
  }
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const envParam = url.searchParams.get("environment") as StripeEnv | null;

    // STATUS endpoint (GET)
    if (req.method === "GET") {
      const env: StripeEnv = envParam === "live" ? "live" : "sandbox";
      const stripe = createStripeClient(env);
      const coupon = await getOrCreateCoupon(stripe);
      const redeemed = coupon.times_redeemed ?? 0;
      const remaining = Math.max(0, MAX_REDEMPTIONS - redeemed);
      return new Response(
        JSON.stringify({
          remaining,
          max: MAX_REDEMPTIONS,
          sold_out: remaining === 0 || coupon.valid === false,
          valid: coupon.valid !== false,
          price_cents: 599,
          full_price_cents: 4999,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CHECKOUT endpoint (POST)
    const body = await req.json().catch(() => ({}));
    const { returnUrl, environment } = body as { returnUrl?: string; environment?: StripeEnv };
    if (!returnUrl) throw new Error("returnUrl required");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    // Require auth — this is a subscription tied to a user.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);

    // Pre-flight: ensure coupon has redemptions left. Stripe also enforces
    // this at session creation, but checking first gives a clean error.
    const coupon = await getOrCreateCoupon(stripe);
    const remaining = MAX_REDEMPTIONS - (coupon.times_redeemed ?? 0);
    if (remaining <= 0 || coupon.valid === false) {
      return new Response(JSON.stringify({ error: "Founders offer is sold out.", sold_out: true }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prices = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP] });
    if (!prices.data.length) throw new Error("oracle_pro_monthly price not found");
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: user.email ?? undefined,
      userId: user.id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      discounts: [{ coupon: COUPON_ID }],
      metadata: {
        userId: user.id,
        tier: "oracle_pro",
        interval: "month",
        campaign: "founders_first_50",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          supabase_user_id: user.id,
          tier: "oracle_pro",
          interval: "month",
          campaign: "founders_first_50",
        },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("founder-offer error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
