// stripe-mode — public endpoint that reports whether the configured Stripe
// keys are in test or live mode. Used by the UI to render a TEST MODE badge.
// Exposes nothing sensitive — only the boolean mode and a few sanity flags.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const wh  = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  const mode: "test" | "live" | "unconfigured" =
    key.startsWith("sk_live_") ? "live" :
    key.startsWith("sk_test_") ? "test" :
    "unconfigured";

  return new Response(JSON.stringify({
    mode,
    has_key: !!key,
    has_webhook_secret: !!wh,
    webhook_secret_looks_valid: wh.startsWith("whsec_"),
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
