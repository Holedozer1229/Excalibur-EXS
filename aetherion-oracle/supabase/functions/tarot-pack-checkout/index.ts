// tarot-pack-checkout — Stripe one-time payment for tarot reading packs.
//
// POST /tarot-pack-checkout  { pack: "single" | "pack10" }
//   - single: $1.99 → +1 tarot credit
//   - pack10: $14.99 → +10 tarot credits
//
// Webhook (`stripe-webhook` → checkout.session.completed mode=payment)
// reads `metadata.tarot_pack_quantity` and calls `grant_tarot_credits`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Pack = "single" | "pack10";

const PACKS: Record<Pack, { amount: number; qty: number; name: string }> = {
  single: { amount: 199,  qty: 1,  name: "Aetherion Tarot · 1 reading" },
  pack10: { amount: 1499, qty: 10, name: "Aetherion Tarot · 10-reading pack" },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      pack?: string; success_url?: string; cancel_url?: string;
    };
    const pack = body.pack as Pack;
    if (!PACKS[pack]) return json({ error: `Invalid pack "${pack}"` }, 400);
    const cfg = PACKS[pack];

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

    // Reuse Stripe customer if we have one
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: sub } = await admin
      .from("subscribers")
      .select("stripe_customer_id")
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
    const successUrl = body.success_url ?? `${origin}/tarot?purchase=success&pack=${pack}`;
    const cancelUrl  = body.cancel_url  ?? `${origin}/tarot?purchase=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cfg.amount,
          product_data: { name: cfg.name },
        },
      }],
      metadata: {
        supabase_user_id: user.id,
        tarot_pack: pack,
        tarot_pack_quantity: String(cfg.qty),
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          tarot_pack: pack,
          tarot_pack_quantity: String(cfg.qty),
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("tarot-pack-checkout error:", e);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});
