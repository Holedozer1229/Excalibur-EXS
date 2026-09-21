// trial-reminders — scheduled daily job that queries Stripe for subscriptions
// currently in `trialing` state and sends reminder emails at day 7, 12, and 13
// of the 14-day trial window. Idempotency is enforced via `idempotencyKey`
// (`trial-reminder-day{N}-{subscriptionId}`) which the send function
// persists to email_send_log — repeat runs are safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY = 86_400_000;
// Reminders fire when `daysUntilEnd` falls into these buckets. Job runs
// daily, so each subscription hits each threshold at most once.
const THRESHOLDS: Array<{ template: string; day: number; matches: (d: number) => boolean }> = [
  { template: "trial-reminder-day7",  day: 7,  matches: (d) => d === 7 },
  { template: "trial-reminder-day12", day: 12, matches: (d) => d === 2 },
  { template: "trial-reminder-day13", day: 13, matches: (d) => d === 1 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Auth: cron secret, service_role JWT, or an admin user. Never anonymous.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  let allowed = !!(cronSecret && provided && cronSecret === provided);
  if (!allowed) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: cd } = await userClient.auth.getClaims(token);
      const role = cd?.claims?.role as string | undefined;
      const uid = cd?.claims?.sub as string | undefined;
      if (role === "service_role") {
        allowed = true;
      } else if (uid) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (isAdmin) allowed = true;
      }
    }
  }
  if (!allowed) return json({ error: "forbidden" }, 403);

  if (!STRIPE_KEY) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

  const results: Array<{ email: string; template: string; status: string; error?: string }> = [];

  // Iterate all trialing subscriptions.
  for await (const sub of stripe.subscriptions.list({ status: "trialing", limit: 100, expand: ["data.customer"] })) {
    const trialEnd = sub.trial_end ? sub.trial_end * 1000 : null;
    if (!trialEnd) continue;
    const daysUntilEnd = Math.round((trialEnd - Date.now()) / DAY);
    const bucket = THRESHOLDS.find((t) => t.matches(daysUntilEnd));
    if (!bucket) continue;

    const customer = sub.customer as Stripe.Customer | Stripe.DeletedCustomer;
    if (!customer || "deleted" in customer) continue;
    const email = customer.email;
    if (!email) continue;

    const idempotencyKey = `${bucket.template}-${sub.id}`;
    const trialEndDate = new Date(trialEnd).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

    // Look up user's display name from profiles if possible.
    let name: string | undefined;
    const userId = (sub.metadata as Record<string, string> | undefined)?.supabase_user_id
      || (customer.metadata as Record<string, string> | undefined)?.supabase_user_id;
    if (userId) {
      const { data: profile } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
      name = (profile as { display_name?: string } | null)?.display_name || undefined;
    }

    const { data, error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: bucket.template,
        recipientEmail: email,
        idempotencyKey,
        templateData: { name, trialEndDate, daysLeft: daysUntilEnd },
      },
    });
    results.push({ email, template: bucket.template, status: error ? "failed" : "queued", ...(error && { error: String(error) }) });
  }

  console.log("trial-reminders run", { count: results.length });
  return json({ processed: results.length, results }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
