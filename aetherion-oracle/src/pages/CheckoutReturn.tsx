import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHead } from "@/components/PageHead";
import { trackEvent } from "@/lib/funnel";


export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [tier, setTier] = useState<string | null>(null);

  // Poll subscriber state until the webhook lands (up to ~30s)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 15 && !cancelled; i++) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("subscribers")
            .select("subscription_tier, subscribed")
            .eq("user_id", user.id).maybeSingle();
          if (data?.subscribed && data.subscription_tier) {
            setTier(data.subscription_tier);
            // Fire purchase-success conversions exactly once per return.
            void trackEvent("founder_purchase_success", {
              session_id: sessionId,
              tier: data.subscription_tier,
            });
            void trackEvent("first_paid_conversion", {
              session_id: sessionId,
              tier: data.subscription_tier,
            });
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    if (sessionId) poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <PageHead
        title="Checkout complete — Aetherion Oracle"
        description="Your Aetherion subscription is being activated. The rite is sealed; your tier will propagate momentarily."
        path="/checkout/return"
      />
      <div className="max-w-md w-full text-center space-y-6 border border-primary/30 rounded-lg p-8 bg-card/60 backdrop-blur">

        {sessionId ? (
          <>
            <h1 className="font-display text-3xl text-primary">The rite is sealed.</h1>
            <p className="text-muted-foreground text-sm">
              {tier ? `Your tier (${tier}) is active.` : "Your tier is being activated. It may take a moment to propagate."}
            </p>
            <p className="font-mono text-[10px] break-all text-muted-foreground/60">{sessionId}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl text-accent">No session found.</h1>
            <p className="text-muted-foreground text-sm">Return to the aether and try again.</p>
          </>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-2 border border-primary/50 text-primary hover:bg-primary/10 transition rounded font-mono text-sm"
        >
          ← return to the aether
        </Link>
      </div>
    </main>
  );
}
