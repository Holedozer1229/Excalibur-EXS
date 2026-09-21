// End-to-end tests for the payments lifecycle.
//
// These tests drive the SAME paths Stripe drives in production:
//   1. A real Stripe test-mode Customer is created via the connector gateway
//      (so `metadata.userId` resolution works exactly like live webhooks).
//   2. We craft Stripe-shaped event payloads, sign them with the real
//      sandbox webhook secret (HMAC-SHA256, matching verifyWebhook), and
//      POST them to a locally-served instance of the webhook handler.
//   3. We assert the DB rows the handler upserts: subscribers,
//      tier_change_audit, credits_ledger.
//
// Run with: supabase--test_edge_functions { functions: ["payments-webhook"] }
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//               STRIPE_SANDBOX_API_KEY, LOVABLE_API_KEY,
//               PAYMENTS_SANDBOX_WEBHOOK_SECRET.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WH_SECRET = Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET")!;

const supa = createClient(SUPABASE_URL, SERVICE_KEY);
const stripe = createStripeClient("sandbox");

// ---------- helpers ----------

async function sign(body: string, secret: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ts}.${body}`),
  );
  const v1 = new TextDecoder().decode(hexEncode(new Uint8Array(sig)));
  return `t=${ts},v1=${v1}`;
}

async function post(event: unknown) {
  const body = JSON.stringify(event);
  const signature = await sign(body, WH_SECRET);
  return fetch(`${SUPABASE_URL}/functions/v1/payments-webhook?env=sandbox`, {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body,
  });
}

async function createTestUser(): Promise<{ id: string; email: string }> {
  const email = `test+${crypto.randomUUID()}@aetherion.test`;
  const { data, error } = await supa.auth.admin.createUser({
    email,
    password: "TestPassword123!",
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("no user");
  return { id: data.user.id, email };
}

async function cleanupUser(userId: string, customerId?: string) {
  await supa.from("credits_ledger").delete().eq("user_id", userId);
  await supa.from("referral_attributions").delete().eq("referred_user_id", userId);
  await supa.from("tier_change_audit").delete().eq("user_id", userId);
  await supa.from("subscribers").delete().eq("user_id", userId);
  await supa.auth.admin.deleteUser(userId);
  if (customerId) {
    try { await stripe.customers.del(customerId); } catch { /* ignore */ }
  }
}

// Build a minimal Stripe subscription-shaped object the webhook accepts.
function subEvent(opts: {
  type: "customer.subscription.created" | "customer.subscription.updated" | "customer.subscription.deleted";
  subId: string;
  customerId: string;
  status: string;
  priceLookup: string;
  periodEnd: number;
  cancelAtPeriodEnd?: boolean;
}) {
  return {
    type: opts.type,
    data: {
      object: {
        id: opts.subId,
        customer: opts.customerId,
        status: opts.status,
        cancel_at_period_end: !!opts.cancelAtPeriodEnd,
        items: {
          data: [{
            current_period_end: opts.periodEnd,
            price: { id: `price_test_${opts.priceLookup}`, lookup_key: opts.priceLookup },
          }],
        },
        metadata: {},
      },
    },
  };
}

function invoiceEvent(opts: {
  type: "invoice.payment_succeeded" | "invoice.payment_failed";
  customerId: string;
  amountPaid: number;
  invoiceId?: string;
}) {
  return {
    type: opts.type,
    data: {
      object: {
        id: opts.invoiceId ?? `in_test_${crypto.randomUUID()}`,
        customer: opts.customerId,
        amount_paid: opts.type === "invoice.payment_succeeded" ? opts.amountPaid : 0,
        hosted_invoice_url: "https://invoice.stripe.com/test/hosted",
        invoice_pdf: "https://invoice.stripe.com/test/pdf",
      },
    },
  };
}

// ---------- tests ----------

Deno.test("subscribe → upgrade → cancel-at-period-end → deleted", async () => {
  const user = await createTestUser();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  const subId = `sub_test_${crypto.randomUUID()}`;
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;

  try {
    // 1. SUBSCRIBE
    let res = await post(subEvent({
      type: "customer.subscription.created",
      subId, customerId: customer.id,
      status: "active", priceLookup: "acolyte_monthly", periodEnd,
    }));
    assertEquals(res.status, 200); await res.text();

    let row = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row.subscribed, true);
    assertEquals(row.subscription_tier, "acolyte");
    assertEquals(row.stripe_customer_id, customer.id);
    assertEquals(row.cancel_at_period_end, false);

    // 2. UPGRADE acolyte → oracle_pro
    res = await post(subEvent({
      type: "customer.subscription.updated",
      subId, customerId: customer.id,
      status: "active", priceLookup: "oracle_pro_monthly", periodEnd,
    }));
    assertEquals(res.status, 200); await res.text();

    row = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row.subscription_tier, "oracle_pro");
    assertEquals(row.subscribed, true);

    // 3. CANCEL (end-of-period — still subscribed until periodEnd)
    res = await post(subEvent({
      type: "customer.subscription.updated",
      subId, customerId: customer.id,
      status: "active", priceLookup: "oracle_pro_monthly",
      periodEnd, cancelAtPeriodEnd: true,
    }));
    assertEquals(res.status, 200); await res.text();

    row = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row.cancel_at_period_end, true);
    assertEquals(row.subscribed, true, "access kept until period end");

    // 4. DELETED (period ended)
    res = await post(subEvent({
      type: "customer.subscription.deleted",
      subId, customerId: customer.id,
      status: "canceled", priceLookup: "oracle_pro_monthly", periodEnd,
    }));
    assertEquals(res.status, 200); await res.text();

    row = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row.subscribed, false);
    assertEquals(row.subscription_tier, "seeker");
    assertEquals(row.payment_status, "canceled");
  } finally {
    await cleanupUser(user.id, customer.id);
  }
});

Deno.test("failed renewal → past_due banner data populated", async () => {
  const user = await createTestUser();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  const subId = `sub_test_${crypto.randomUUID()}`;
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;

  try {
    // Establish an active subscription first
    let res = await post(subEvent({
      type: "customer.subscription.created",
      subId, customerId: customer.id,
      status: "active", priceLookup: "acolyte_monthly", periodEnd,
    }));
    await res.text();

    // Renewal fails
    res = await post(invoiceEvent({
      type: "invoice.payment_failed",
      customerId: customer.id,
      amountPaid: 0,
    }));
    assertEquals(res.status, 200); await res.text();

    const row = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row.payment_status, "past_due");
    assertEquals(row.subscribed, true, "Stripe is retrying, access kept");
    assert(row.last_payment_failed_at, "timestamp recorded");
    assertEquals(row.latest_invoice_hosted_url, "https://invoice.stripe.com/test/hosted");

    // Retry succeeds → status back to active
    res = await post(invoiceEvent({
      type: "invoice.payment_succeeded",
      customerId: customer.id,
      amountPaid: 999,
    }));
    await res.text();
    const row2 = (await supa.from("subscribers").select("*").eq("user_id", user.id).single()).data;
    assertEquals(row2.payment_status, "active");
  } finally {
    await cleanupUser(user.id, customer.id);
  }
});

Deno.test("referral commission credited on paid invoice", async () => {
  const referrer = await createTestUser();
  const referred = await createTestUser();
  const customer = await stripe.customers.create({
    email: referred.email,
    metadata: { userId: referred.id },
  });

  try {
    // Ensure referrer has a referral_codes row + attribute the referred user.
    // ensure_referral_code is SECURITY DEFINER but uses auth.uid(); we insert
    // attribution directly via service role for the test.
    const code = `TESTREF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await supa.from("referral_codes").insert({
      user_id: referrer.id, code, share_pct: 20,
    });
    await supa.from("referral_attributions").insert({
      referrer_user_id: referrer.id,
      referred_user_id: referred.id,
      code,
      share_pct: 20,
    });

    // Invoice paid for $9.99 = 999 cents → 20% = 199 (floor) credits
    const res = await post(invoiceEvent({
      type: "invoice.payment_succeeded",
      customerId: customer.id,
      amountPaid: 999,
      invoiceId: `in_test_ref_${crypto.randomUUID()}`,
    }));
    assertEquals(res.status, 200); await res.text();

    const { data: ledger } = await supa.from("credits_ledger")
      .select("*").eq("user_id", referrer.id).eq("reason", "referral_commission");
    assertEquals(ledger?.length, 1);
    assertEquals(ledger![0].delta, 199);

    const { data: att } = await supa.from("referral_attributions")
      .select("total_credited_cents").eq("referred_user_id", referred.id).single();
    assertEquals(att?.total_credited_cents, 199);
  } finally {
    await supa.from("referral_codes").delete().eq("user_id", referrer.id);
    await cleanupUser(referred.id, customer.id);
    await cleanupUser(referrer.id);
  }
});

Deno.test("create-checkout returns clientSecret for a real price", async () => {
  const user = await createTestUser();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        priceId: "acolyte_monthly",
        userId: user.id,
        customerEmail: user.email,
        returnUrl: "https://example.test/checkout/return?session_id={CHECKOUT_SESSION_ID}",
        environment: "sandbox",
      }),
    });
    const body = await res.json();
    assertEquals(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(typeof body.clientSecret === "string" && body.clientSecret.length > 0);
  } finally {
    // Clean up the Stripe customer create-checkout auto-created
    try {
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${user.id}'`, limit: 1,
      });
      if (found.data[0]) await stripe.customers.del(found.data[0].id);
    } catch { /* ignore */ }
    await cleanupUser(user.id);
  }
});
