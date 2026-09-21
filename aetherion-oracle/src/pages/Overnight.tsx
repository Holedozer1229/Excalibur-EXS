// /overnight — operator playbook: stack founder MRR + zkEVM + bounty tonight
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import OvernightVelocityRail from "@/components/overnight/OvernightVelocityRail";
import MainnetTwinPillars from "@/components/mainnet/MainnetTwinPillars";
import { FounderOfferCard } from "@/components/FounderOfferCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site";

export default function Overnight() {
  const [tier, setTier] = useState("seeker");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sub } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sub?.subscribed) setTier(sub.subscription_tier ?? "oracle_pro");
    })();
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Overnight Velocity — Stack Founder MRR + zkEVM + Bounty"
        description="Operator playbook: lock founder seats, route zkEVM wallets to live URUU, blast bounty links — before UTC midnight."
        path="/overnight"
        ogType="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Overnight Velocity · Excalibur Crypto",
            url: siteUrl("/overnight"),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="overnight-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Overnight</span>
        </nav>

        <OvernightVelocityRail className="mb-10" />

        <MainnetTwinPillars className="mb-8" hideFounderIfSubscribed subscribed={tier === "oracle_pro"} />

        {tier !== "oracle_pro" && (
          <div className="mb-8">
            <FounderOfferCard currentTier={tier} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
