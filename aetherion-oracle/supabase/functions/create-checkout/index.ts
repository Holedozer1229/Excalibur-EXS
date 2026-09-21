import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

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
    const body = await req.json();
    const { priceId, customerEmail, returnUrl, environment, trial } = body as {
      priceId: string;
      customerEmail?: string;
      returnUrl: string;
      environment: StripeEnv;
      trial?: boolean;
    };

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    // Always resolve userId from verified JWT; never trust caller-supplied userId.
    let effectiveUserId: string | undefined;
    let effectiveEmail = customerEmail;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      // Use anon key — token verification does not require service-role.
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supa.auth.getUser(token);
      if (user) {
        effectiveUserId = user.id;
        effectiveEmail = effectiveEmail ?? user.email ?? undefined;
      }
    }

    const stripe = createStripeClient(environment);
    const prices = await stripe.prices.list({ lookup_keys: [priceId], expand: ["data.product"] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = (effectiveEmail || effectiveUserId)
      ? await resolveOrCreateCustomer(stripe, { email: effectiveEmail, userId: effectiveUserId })
      : undefined;

    // Only offer a trial for new subscribers on recurring prices. If this
    // customer already has ANY subscription (active, canceled, or trialed),
    // skip the trial to prevent abuse.
    let trialDays: number | undefined;
    let trialRefusedReason: "existing_subscription" | "not_recurring" | null = null;
    if (trial && !isRecurring) {
      trialRefusedReason = "not_recurring";
    } else if (trial && isRecurring && customerId) {
      const existing = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });
      if (existing.data.length === 0) trialDays = 14;
      else trialRefusedReason = "existing_subscription";
    }

    const subscriptionMeta = effectiveUserId ? { userId: effectiveUserId } : undefined;
    const subscriptionData = isRecurring
      ? {
          ...(subscriptionMeta && { metadata: subscriptionMeta }),
          ...(trialDays && {
            trial_period_days: trialDays,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
          }),
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      managed_payments: { enabled: true },
      ...(effectiveUserId && {
        metadata: { userId: effectiveUserId, managed_payments: "true", trial: trialDays ? "14" : "0" },
      }),
      ...(subscriptionData && Object.keys(subscriptionData).length > 0 && { subscription_data: subscriptionData }),
    });

    return new Response(JSON.stringify({
      clientSecret: session.client_secret,
      trialApplied: !!trialDays,
      trialRefusedReason,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
