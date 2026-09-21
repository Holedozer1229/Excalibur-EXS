import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { returnUrl, environment } = await req.json() as { returnUrl?: string; environment: StripeEnv };
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    // Use anon key — token verification does not require service-role.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) throw new Error("Unauthorized");

    const stripe = createStripeClient(environment);
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${user.id}'`,
      limit: 1,
    });
    let customerId = found.data[0]?.id;
    if (!customerId && user.email) {
      const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = byEmail.data[0]?.id;
    }
    if (!customerId) throw new Error("No Stripe customer found for this user");

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      ...(returnUrl && { return_url: returnUrl }),
    });
    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("create-portal-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
