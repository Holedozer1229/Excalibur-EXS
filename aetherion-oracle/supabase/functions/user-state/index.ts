// User state endpoints for Aetherion.
//   GET  ?action=tier   → { tier, monthly_usage, monthly_limit, daily_usage, daily_limit, daily_remaining, period, subscribed, wallet_address }
//   GET  ?action=usage  → { monthly_usage, monthly_limit, daily_usage, daily_limit, daily_remaining, period, subscribed }
//   POST ?action=wallet body: { wallet_address }  → { wallet_address }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logRpcFailure } from "../_shared/rpc-failure-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isEvmAddress = (s: unknown): s is string =>
  typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "Authentication required." });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json(401, { error: "Invalid session." });
    const userId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") ?? "tier").toLowerCase();

    if (req.method === "GET" && (action === "tier" || action === "usage")) {
      // Safe default — lowest tier, zero usage. Returned when the RPC errors
      // or returns a missing/corrupted row so the client never sees a 500.
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      const fallback: Record<string, unknown> = {
        tier: "seeker",
        subscribed: false,
        is_admin: false,
        monthly_usage: 0,
        monthly_limit: 100000,
        daily_usage: 0,
        daily_limit: 100000,
        daily_remaining: 100000,
        period,
        wallet_address: null,
        payment_status: "active",
        latest_invoice_url: null,
        pending_tier: null,
        pending_tier_effective_at: null,
        cancel_at_period_end: false,
      };

      let state: Record<string, unknown> = fallback;
      try {
        const { data, error } = await admin.rpc("get_user_tier_state", { _user_id: userId });
        if (error) {
          await logRpcFailure(admin, {
            userId, functionName: "user-state", rpcName: "get_user_tier_state",
            failureKind: "rpc_error",
            errorCode: (error as { code?: string }).code ?? null,
            errorMessage: error.message ?? String(error),
            metadata: { action },
          });
        } else if (data == null) {
          await logRpcFailure(admin, {
            userId, functionName: "user-state", rpcName: "get_user_tier_state",
            failureKind: "missing_row", metadata: { action },
          });
        } else if (typeof data === "object") {
          state = { ...fallback, ...(data as Record<string, unknown>) };
          if (typeof state.tier !== "string" || !["seeker", "acolyte", "oracle_pro"].includes(state.tier as string)) {
            await logRpcFailure(admin, {
              userId, functionName: "user-state", rpcName: "get_user_tier_state",
              failureKind: "corrupted_payload",
              errorMessage: `unexpected tier value: ${JSON.stringify(state.tier)}`,
              metadata: { action },
            });
            state.tier = "seeker";
          }
        } else {
          await logRpcFailure(admin, {
            userId, functionName: "user-state", rpcName: "get_user_tier_state",
            failureKind: "corrupted_payload",
            errorMessage: `unexpected payload type: ${typeof data}`,
            metadata: { action },
          });
        }
      } catch (e) {
        await logRpcFailure(admin, {
          userId, functionName: "user-state", rpcName: "get_user_tier_state",
          failureKind: "threw",
          errorMessage: e instanceof Error ? e.message : String(e),
          metadata: { action },
        });
      }

      if (action === "usage") {
        return json(200, {
          monthly_usage: state.monthly_usage,
          monthly_limit: state.monthly_limit,
          daily_usage: state.daily_usage,
          daily_limit: state.daily_limit,
          daily_remaining: state.daily_remaining,
          period: state.period,
          subscribed: state.subscribed,
        });
      }
      return json(200, state);
    }

    if (req.method === "GET" && action === "billing-summary") {
      // Authoritative reconciliation: credits balance (SECURITY DEFINER RPC),
      // referral totals (from referral_attributions), Stripe-backed
      // subscription status (live cross-check against latest event).
      const [creditsRes, attrRes, subRes, ledgerRes, codeRes] = await Promise.all([
        admin.rpc("credits_balance", { _user_id: userId }),
        admin.from("referral_attributions")
          .select("total_credited_cents, last_invoice_at, referred_user_id")
          .eq("referrer_user_id", userId),
        admin.from("subscribers")
          .select("stripe_subscription_id, subscription_tier, payment_status, subscription_end, cancel_at_period_end, referral_code, stripe_customer_id")
          .eq("user_id", userId).maybeSingle(),
        admin.from("credits_ledger")
          .select("delta, reason, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        admin.from("referral_codes")
          .select("code, share_pct").eq("user_id", userId).maybeSingle(),
      ]);

      const credits_balance = Number(creditsRes.data ?? 0);
      const attributions = (attrRes.data ?? []) as { total_credited_cents: number; last_invoice_at: string | null }[];
      const referral_total_cents = attributions.reduce((s, r) => s + (r.total_credited_cents ?? 0), 0);
      const referral_count = attributions.length;
      const ledger = (ledgerRes.data ?? []) as { delta: number; reason: string; created_at: string }[];
      const referral_credits_earned = ledger
        .filter((r) => r.reason === "referral_commission")
        .reduce((s, r) => s + (r.delta ?? 0), 0);
      const sub = subRes.data as {
        stripe_subscription_id?: string | null; subscription_tier?: string | null;
        payment_status?: string | null; subscription_end?: string | null;
        cancel_at_period_end?: boolean | null; referral_code?: string | null;
        stripe_customer_id?: string | null;
      } | null;

      // Stripe cross-check (best-effort — never block the reconciliation
      // response on a Stripe outage; reflect the divergence instead).
      let stripe_check: Record<string, unknown> = { available: false };
      const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
      if (STRIPE_KEY && sub?.stripe_subscription_id) {
        try {
          const r = await fetch(
            `https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`,
            { headers: { Authorization: `Bearer ${STRIPE_KEY}` } },
          );
          if (r.ok) {
            const s = await r.json();
            const stripe_status = s.status as string;
            const stripe_period_end = s.current_period_end
              ? new Date(s.current_period_end * 1000).toISOString() : null;
            const stripe_cancel_at_period_end = !!s.cancel_at_period_end;
            const stripe_amount = s.items?.data?.[0]?.price?.unit_amount ?? null;
            const stripe_interval = s.items?.data?.[0]?.price?.recurring?.interval ?? null;
            const stripe_meta = s.metadata ?? {};
            const drift: string[] = [];
            if (stripe_cancel_at_period_end !== !!sub.cancel_at_period_end) drift.push("cancel_at_period_end");
            if (stripe_period_end && sub.subscription_end &&
                Math.abs(new Date(stripe_period_end).getTime() - new Date(sub.subscription_end).getTime()) > 86_400_000) {
              drift.push("subscription_end");
            }
            const stripeMapsToUser = stripe_meta?.supabase_user_id === userId;
            stripe_check = {
              available: true, stripe_status, stripe_period_end, stripe_cancel_at_period_end,
              stripe_amount, stripe_interval, stripe_referral_code: stripe_meta?.referral_code ?? null,
              stripe_tier_metadata: stripe_meta?.tier ?? null,
              maps_to_user: stripeMapsToUser, drift,
            };
          } else {
            stripe_check = { available: false, error: `stripe ${r.status}` };
          }
        } catch (e) {
          stripe_check = { available: false, error: "stripe unavailable" };
        }
      }

      return json(200, {
        credits_balance,
        referral_total_cents,
        referral_count,
        referral_credits_earned,
        referral_code: codeRes.data ? (codeRes.data as { code: string }).code : null,
        referral_share_pct: codeRes.data ? Number((codeRes.data as { share_pct: number }).share_pct) : 20,
        subscriber: sub,
        stripe_check,
        reconciled_at: new Date().toISOString(),
      });
    }


    if (req.method === "POST" && action === "wallet") {
      const body = await req.json().catch(() => ({}));
      const wallet = (body as { wallet_address?: unknown }).wallet_address;
      // Allow null/empty to unset.
      if (wallet !== null && wallet !== "" && !isEvmAddress(wallet)) {
        return json(400, { error: "wallet_address must be a 0x-prefixed 40-hex EVM address." });
      }
      const value = wallet === "" || wallet === null ? null : (wallet as string).toLowerCase();
      const { error } = await admin
        .from("profiles")
        .update({ wallet_address: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) {
        console.error("wallet update:", error);
        return json(400, { error: "Failed to update wallet address." });
      }
      return json(200, { wallet_address: value });
    }

    return json(404, { error: `Unknown action '${action}' for ${req.method}.` });
  } catch (e) {
    console.error("user-state error:", e);
    return json(500, { error: "An internal error occurred. Please try again." });
  }
});
