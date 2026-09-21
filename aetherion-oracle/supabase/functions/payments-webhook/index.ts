import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, createStripeClient, priceIdToTier } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function resolveUserId(stripe: ReturnType<typeof createStripeClient>, subscription: any): Promise<{ userId: string | null; email: string | null }> {
  let userId: string | null = subscription.metadata?.userId ?? null;
  let email: string | null = null;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customerId) {
    const cust = await stripe.customers.retrieve(customerId);
    if (cust && !cust.deleted) {
      userId = userId ?? (cust.metadata?.userId ?? null);
      email = (cust as any).email ?? null;
    }
  }
  return { userId, email };
}

async function upsertSubscriber(args: {
  userId: string;
  email: string | null;
  tier: string;
  periodEnd: Date | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  const subscribed = ["active", "trialing", "past_due"].includes(args.status)
    || (args.status === "canceled" && args.periodEnd !== null && args.periodEnd > new Date());

  await getSupabase().from("subscribers").upsert(
    {
      user_id: args.userId,
      email: args.email ?? "",
      subscribed,
      subscription_tier: args.tier,
      subscription_end: args.periodEnd?.toISOString() ?? null,
      cancel_at_period_end: args.cancelAtPeriodEnd,
      payment_status: args.status === "past_due" ? "past_due" : (subscribed ? "active" : "canceled"),
      stripe_customer_id: args.stripeCustomerId,
      stripe_subscription_id: args.stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function handleSubscriptionEvent(subscription: any, env: StripeEnv) {
  const stripe = createStripeClient(env);
  const { userId, email } = await resolveUserId(stripe, subscription);
  if (!userId) {
    console.error("No userId for subscription", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceLookup = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || null;
  const tier = priceIdToTier(priceLookup) ?? "acolyte";
  const periodEndUnix = item?.current_period_end ?? subscription.current_period_end;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  await upsertSubscriber({
    userId,
    email,
    tier,
    periodEnd,
    status: subscription.status,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    stripeCustomerId: customerId ?? null,
    stripeSubscriptionId: subscription.id,
  });

  // Audit
  await getSupabase().from("tier_change_audit").insert({
    user_id: userId,
    email,
    to_tier: tier,
    change_type: subscription.status,
    source: "stripe",
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    metadata: { cancel_at_period_end: !!subscription.cancel_at_period_end, env },
  });
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const stripe = createStripeClient(env);
  const { userId, email } = await resolveUserId(stripe, subscription);
  if (!userId) return;
  await getSupabase().from("subscribers").upsert(
    {
      user_id: userId,
      email: email ?? "",
      subscribed: false,
      subscription_tier: "seeker",
      cancel_at_period_end: false,
      payment_status: "canceled",
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  await getSupabase().from("tier_change_audit").insert({
    user_id: userId,
    email,
    to_tier: "seeker",
    change_type: "deleted",
    source: "stripe",
    stripe_subscription_id: subscription.id,
    metadata: { env },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionEvent(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "checkout.session.completed": {
        const session: any = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const stripe = createStripeClient(env);
          const sub = await stripe.subscriptions.retrieve(session.subscription, { expand: ["items.data.price"] });
          await handleSubscriptionEvent(sub, env);
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice: any = event.data.object;
        const stripe = createStripeClient(env);
        // Resolve user via customer metadata
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        let userId: string | null = null;
        if (customerId) {
          const cust = await stripe.customers.retrieve(customerId);
          if (cust && !cust.deleted) userId = (cust as any).metadata?.userId ?? null;
        }
        if (userId) {
          await getSupabase().from("subscribers").update({
            payment_status: "active",
            latest_invoice_url: invoice.invoice_pdf ?? null,
            latest_invoice_hosted_url: invoice.hosted_invoice_url ?? null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          // Credit referrer (per-invoice). RPC is a no-op if no attribution exists.
          if (invoice.amount_paid && invoice.amount_paid > 0) {
            await getSupabase().rpc("credit_referral_invoice", {
              _referred_user_id: userId,
              _amount_paid_cents: invoice.amount_paid,
              _invoice_id: invoice.id,
            });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice: any = event.data.object;
        const stripe = createStripeClient(env);
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        let userId: string | null = null;
        if (customerId) {
          const cust = await stripe.customers.retrieve(customerId);
          if (cust && !cust.deleted) userId = (cust as any).metadata?.userId ?? null;
        }
        if (userId) {
          await getSupabase().from("subscribers").update({
            payment_status: "past_due",
            last_payment_failed_at: new Date().toISOString(),
            latest_invoice_url: invoice.invoice_pdf ?? null,
            latest_invoice_hosted_url: invoice.hosted_invoice_url ?? null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
        }
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
