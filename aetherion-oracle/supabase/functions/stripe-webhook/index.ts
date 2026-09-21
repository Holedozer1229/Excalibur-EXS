// stripe-webhook — receives Stripe events and applies tier upgrades, records
// invoices/receipts, handles renewals, mid-cycle changes, scheduled
// downgrades, and payment failures. Includes idempotency via
// processed_stripe_events so replays are safe.
//
// Handles:
//   • checkout.session.completed         → initial activation (subscription mode)
//   • customer.subscription.created      → ensure tier set
//   • customer.subscription.updated      → renewal / plan change → extend, set scheduled_change
//   • customer.subscription.deleted      → end at period_end
//   • invoice.payment_succeeded          → record receipt + extend + referral commission
//   • invoice.payment_failed             → mark past_due / requires_action + record failure
//
// IMPORTANT: This function MUST run with verify_jwt=false (Stripe ≠ Supabase JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

type Tier = "acolyte" | "oracle_pro";

function isTier(v: unknown): v is Tier {
  return v === "acolyte" || v === "oracle_pro";
}

function tierFromAmount(amount: number | null | undefined, interval: string | undefined): Tier | null {
  if (!amount) return null;
  if (interval === "year") {
    if (amount === 9990) return "acolyte";
    if (amount === 49990) return "oracle_pro";
  } else {
    if (amount === 999) return "acolyte";
    if (amount === 4999) return "oracle_pro";
  }
  return null;
}

async function resolveUserAndTier(
  metadata: Record<string, string> | undefined,
  customerId: string | null,
  fallbackPriceTier?: Tier | null,
): Promise<{ userId: string; tier: Tier; email: string } | null> {
  let userId = metadata?.supabase_user_id;
  let tier: string | undefined = metadata?.tier;
  let email = "";

  if (!userId && customerId) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (!("deleted" in cust) || !cust.deleted) {
        const c = cust as Stripe.Customer;
        email = c.email ?? "";
        userId = (c.metadata?.supabase_user_id as string) ?? userId;
        if (!userId && email) {
          const { data } = await admin
            .from("subscribers").select("user_id, email")
            .eq("email", email).maybeSingle();
          userId = (data as { user_id?: string } | null)?.user_id;
        }
      }
    } catch (e) { console.warn("customer lookup failed:", e); }
  }

  if (!tier && fallbackPriceTier) tier = fallbackPriceTier;

  if (!userId || !isTier(tier)) return null;
  if (!email && customerId) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (!("deleted" in cust) || !cust.deleted) email = (cust as Stripe.Customer).email ?? "";
    } catch { /* ignore */ }
  }
  return { userId, tier, email };
}

async function applyUpgrade(userId: string, email: string, tier: Tier, periodEnd: Date) {
  const { error } = await admin.rpc("apply_tier_payment", {
    _user_id: userId, _email: email, _tier: tier,
    _period_end: periodEnd.toISOString(),
  });
  if (error) throw new Error(`apply_tier_payment: ${error.message}`);
}

async function setSubscriberMeta(userId: string, patch: Record<string, unknown>) {
  await admin.from("subscribers").update(patch).eq("user_id", userId);
}

async function recordInvoice(userId: string, tier: Tier | null, inv: Stripe.Invoice) {
  await admin.from("stripe_invoices").upsert({
    user_id: userId,
    stripe_invoice_id: inv.id,
    stripe_customer_id: typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null,
    stripe_subscription_id: typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id ?? null,
    amount_paid: inv.amount_paid ?? 0,
    amount_due: inv.amount_due ?? 0,
    currency: (inv.currency ?? "usd").toLowerCase(),
    status: inv.status ?? "unknown",
    tier,
    hosted_invoice_url: inv.hosted_invoice_url ?? null,
    invoice_pdf: inv.invoice_pdf ?? null,
    receipt_url: (inv as unknown as { charge?: { receipt_url?: string } }).charge?.receipt_url ?? null,
    period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
    period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
  }, { onConflict: "stripe_invoice_id" });
}

async function recordAudit(entry: {
  user_id: string; email?: string | null; from_tier?: string | null; to_tier: string;
  change_type: string; effective_at?: string; stripe_event_id?: string | null;
  stripe_subscription_id?: string | null; stripe_customer_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await admin.from("tier_change_audit").insert({
      user_id: entry.user_id,
      email: entry.email ?? null,
      from_tier: entry.from_tier ?? null,
      to_tier: entry.to_tier,
      change_type: entry.change_type,
      effective_at: entry.effective_at ?? new Date().toISOString(),
      source: "stripe",
      stripe_event_id: entry.stripe_event_id ?? null,
      stripe_subscription_id: entry.stripe_subscription_id ?? null,
      stripe_customer_id: entry.stripe_customer_id ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) { console.warn("audit insert failed:", e); }
}

async function getCurrentTier(userId: string): Promise<string | null> {
  const { data } = await admin.from("subscribers").select("subscription_tier").eq("user_id", userId).maybeSingle();
  return (data as { subscription_tier?: string } | null)?.subscription_tier ?? null;
}

async function sendAlert(userId: string, email: string, template: string, data: Record<string, unknown>) {
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: template,
        recipientEmail: email,
        idempotencyKey: `${template}-${userId}-${data.event_id ?? Date.now()}`,
        templateData: data,
      },
    });
  } catch (e) { console.warn(`email alert ${template} failed:`, e); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });
  if (!WEBHOOK_SECRET) return new Response("Webhook secret not configured", { status: 500 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error("signature verify failed:", e);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // ── Idempotency / replay protection ───────────────────────────────────
  // Insert (event_id, type) — if it already exists, this is a Stripe retry
  // or replay. Acknowledge with 200 immediately so Stripe stops retrying.
  {
    const { error: dupErr } = await admin
      .from("processed_stripe_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (dupErr) {
      // 23505 = unique_violation → already processed, no-op
      const code = (dupErr as { code?: string }).code;
      if (code === "23505") {
        console.log("replay ignored:", event.type, event.id);
        return new Response("ok (replay)", { status: 200 });
      }
      console.error("idempotency insert failed:", dupErr);
      // Don't refuse — but also don't double-apply. Return 500 so Stripe retries.
      return new Response("idempotency check failed", { status: 500 });
    }
  }

  console.log("stripe event:", event.type, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        // === One-time tarot pack purchase ===
        if (s.mode === "payment") {
          const meta = (s.metadata ?? {}) as Record<string, string>;
          const userId = meta.supabase_user_id;
          const qty = parseInt(meta.tarot_pack_quantity ?? "0", 10);
          if (userId && qty > 0 && s.payment_status === "paid") {
            const { error: gErr } = await admin.rpc("grant_tarot_credits", {
              _user_id: userId, _amount: qty,
            });
            if (gErr) console.error("grant_tarot_credits failed:", gErr);
            else console.log("granted tarot credits:", userId, qty);
          }
          break;
        }

        if (s.mode !== "subscription" || !s.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(s.subscription as string);
        const meta = { ...(s.metadata ?? {}), ...(subscription.metadata ?? {}) } as Record<string, string>;
        const item = subscription.items.data[0];
        const fallbackTier = tierFromAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
        const resolved = await resolveUserAndTier(meta, subscription.customer as string, fallbackTier);
        if (!resolved) break;
        const periodEnd = new Date(subscription.current_period_end * 1000);
        const previousTier = await getCurrentTier(resolved.userId);
        await applyUpgrade(resolved.userId, resolved.email, resolved.tier, periodEnd);
        await setSubscriberMeta(resolved.userId, {
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          payment_status: "active",
          pending_tier: null,
          pending_tier_effective_at: null,
          cancel_at_period_end: !!subscription.cancel_at_period_end,
          referral_code: meta.referral_code ?? null,
        });
        await recordAudit({
          user_id: resolved.userId, email: resolved.email,
          from_tier: previousTier, to_tier: resolved.tier,
          change_type: "immediate", stripe_event_id: event.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          metadata: { source: "checkout", interval: meta.interval ?? null, referral_code: meta.referral_code ?? null },
        });
        // Record referral attribution if a code was used
        if (meta.referral_code) {
          try {
            await admin.rpc("record_referral_signup", {
              _referred_user_id: resolved.userId, _code: meta.referral_code,
            });
          } catch (e) { console.warn("referral signup failed:", e); }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        const fallbackTier = tierFromAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
        const resolved = await resolveUserAndTier(sub.metadata as Record<string, string>, sub.customer as string, fallbackTier);
        if (!resolved) break;
        const periodEnd = new Date(sub.current_period_end * 1000);
        const previousTier = await getCurrentTier(resolved.userId);
        await applyUpgrade(resolved.userId, resolved.email, resolved.tier, periodEnd);
        await setSubscriberMeta(resolved.userId, {
          stripe_subscription_id: sub.id,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          payment_status: sub.status === "past_due" ? "past_due" : sub.status === "incomplete" ? "requires_action" : "active",
        });
        await recordAudit({
          user_id: resolved.userId, email: resolved.email,
          from_tier: previousTier, to_tier: resolved.tier,
          change_type: previousTier === resolved.tier ? "renewal" : "immediate",
          stripe_event_id: event.id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          metadata: { cancel_at_period_end: sub.cancel_at_period_end, status: sub.status },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        let resolved: Awaited<ReturnType<typeof resolveUserAndTier>> = null;
        let tierForInvoice: Tier | null = null;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          const item = sub.items.data[0];
          tierForInvoice = tierFromAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
          resolved = await resolveUserAndTier(sub.metadata as Record<string, string>, sub.customer as string, tierForInvoice);
          if (resolved) {
            await applyUpgrade(resolved.userId, resolved.email, resolved.tier, new Date(sub.current_period_end * 1000));
            await setSubscriberMeta(resolved.userId, {
              payment_status: "active",
              last_payment_failed_at: null,
              latest_invoice_url: inv.invoice_pdf ?? null,
              latest_invoice_hosted_url: inv.hosted_invoice_url ?? null,
            });
          }
        } else {
          resolved = await resolveUserAndTier({}, inv.customer as string | null, null);
        }
        if (resolved) {
          await recordInvoice(resolved.userId, tierForInvoice ?? resolved.tier, inv);
          const isRenewal = (inv.billing_reason ?? "") === "subscription_cycle";
          await recordAudit({
            user_id: resolved.userId, email: resolved.email,
            from_tier: resolved.tier, to_tier: resolved.tier,
            change_type: isRenewal ? "renewal" : "payment_recovered",
            stripe_event_id: event.id,
            stripe_subscription_id: typeof inv.subscription === "string" ? inv.subscription : null,
            stripe_customer_id: typeof inv.customer === "string" ? inv.customer : null,
            metadata: { amount_paid: inv.amount_paid, currency: inv.currency, billing_reason: inv.billing_reason },
          });
          // Referral commission
          try {
            await admin.rpc("credit_referral_invoice", {
              _referred_user_id: resolved.userId,
              _amount_paid_cents: inv.amount_paid ?? 0,
              _invoice_id: inv.id,
            });
          } catch (e) { console.warn("referral commission failed:", e); }

          if (resolved.email) {
            await sendAlert(resolved.userId, resolved.email, isRenewal ? "subscription-renewed" : "payment-recovered", {
              event_id: event.id, tier: resolved.tier,
              amount: ((inv.amount_paid ?? 0) / 100).toFixed(2),
              currency: (inv.currency ?? "usd").toUpperCase(),
              hosted_invoice_url: inv.hosted_invoice_url, invoice_pdf: inv.invoice_pdf,
              receipt_url: (inv as unknown as { charge?: { receipt_url?: string } }).charge?.receipt_url ?? null,
              period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        let resolved: Awaited<ReturnType<typeof resolveUserAndTier>> = null;
        let tierForInvoice: Tier | null = null;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          const item = sub.items.data[0];
          tierForInvoice = tierFromAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
          resolved = await resolveUserAndTier(sub.metadata as Record<string, string>, sub.customer as string, tierForInvoice);
        }
        if (!resolved) {
          resolved = await resolveUserAndTier({}, inv.customer as string | null, tierForInvoice);
        }
        if (resolved) {
          const needsAction = (inv as unknown as { next_payment_attempt: number | null }).next_payment_attempt
            ? "past_due" : "requires_action";
          const billingReason = inv.billing_reason ?? "";
          // Immediate downgrade for any renewal-cycle failure (no grace period).
          const isRenewalFailure =
            billingReason === "subscription_cycle" ||
            billingReason === "subscription_update" ||
            billingReason === "subscription";
          const previousTier = await getCurrentTier(resolved.userId);

          if (isRenewalFailure) {
            await admin.from("subscribers").update({
              subscribed: false,
              subscription_tier: "seeker",
              subscription_end: new Date().toISOString(),
              payment_status: needsAction,
              last_payment_failed_at: new Date().toISOString(),
              latest_invoice_url: inv.invoice_pdf ?? null,
              latest_invoice_hosted_url: inv.hosted_invoice_url ?? null,
              pending_tier: null,
              pending_tier_effective_at: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            }).eq("user_id", resolved.userId);
          } else {
            await setSubscriberMeta(resolved.userId, {
              payment_status: needsAction,
              last_payment_failed_at: new Date().toISOString(),
              latest_invoice_url: inv.invoice_pdf ?? null,
              latest_invoice_hosted_url: inv.hosted_invoice_url ?? null,
            });
          }

          await recordInvoice(resolved.userId, tierForInvoice ?? resolved.tier, inv);
          await recordAudit({
            user_id: resolved.userId, email: resolved.email,
            from_tier: previousTier ?? resolved.tier,
            to_tier: isRenewalFailure ? "seeker" : resolved.tier,
            change_type: isRenewalFailure ? "downgraded_payment_failed" : "payment_failed",
            stripe_event_id: event.id,
            stripe_subscription_id: typeof inv.subscription === "string" ? inv.subscription : null,
            stripe_customer_id: typeof inv.customer === "string" ? inv.customer : null,
            metadata: {
              status: needsAction, attempt_count: inv.attempt_count,
              next_attempt: inv.next_payment_attempt, billing_reason: billingReason,
              immediate_downgrade: isRenewalFailure,
            },
          });
          if (resolved.email) {
            await sendAlert(resolved.userId, resolved.email,
              isRenewalFailure ? "subscription-downgraded"
                : needsAction === "requires_action" ? "payment-requires-action" : "payment-failed", {
              event_id: event.id, tier: resolved.tier,
              amount_due: ((inv.amount_due ?? 0) / 100).toFixed(2),
              currency: (inv.currency ?? "usd").toUpperCase(),
              hosted_invoice_url: inv.hosted_invoice_url, invoice_pdf: inv.invoice_pdf,
              next_attempt: inv.next_payment_attempt ? new Date(inv.next_payment_attempt * 1000).toISOString() : null,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        const fallbackTier = tierFromAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
        const resolved = await resolveUserAndTier(sub.metadata as Record<string, string>, sub.customer as string, fallbackTier);
        if (!resolved) break;
        const previousTier = await getCurrentTier(resolved.userId);
        // Immediate downgrade — no end-of-period grace.
        await admin.from("subscribers").update({
          subscribed: false,
          subscription_tier: "seeker",
          subscription_end: new Date().toISOString(),
          cancel_at_period_end: false,
          pending_tier: null,
          pending_tier_effective_at: null,
          payment_status: "canceled",
          updated_at: new Date().toISOString(),
        }).eq("user_id", resolved.userId);
        await recordAudit({
          user_id: resolved.userId, email: resolved.email,
          from_tier: previousTier ?? resolved.tier, to_tier: "seeker",
          change_type: "canceled", effective_at: new Date().toISOString(),
          stripe_event_id: event.id, stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          metadata: { immediate_downgrade: true, cancellation_reason: sub.cancellation_details?.reason ?? null },
        });
        if (resolved.email) {
          await sendAlert(resolved.userId, resolved.email, "subscription-downgraded", {
            event_id: event.id, from_tier: previousTier ?? resolved.tier, to_tier: "seeker",
            reason: "canceled",
          });
        }
        break;
      }

      default:
        // Recorded in processed_stripe_events but not acted on.
        break;
    }
  } catch (e) {
    console.error("handler error:", e);
    // Remove the idempotency row so Stripe's retry can succeed next time.
    await admin.from("processed_stripe_events").delete().eq("event_id", event.id);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
