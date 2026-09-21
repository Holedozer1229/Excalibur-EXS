// /war-chest — monetization command center: founder seats, quests, bounty tier, lattice rails
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  Shield,
  Swords,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import CamelotQuestPanel from "@/components/camelot/CamelotQuestPanel";
import MainnetTwinPillars from "@/components/mainnet/MainnetTwinPillars";
import UruuContractCard from "@/components/UruuContractCard";
import { FounderOfferCard } from "@/components/FounderOfferCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CAMELOT_FAIR_FULL } from "@/lib/camelotFair";
import { getQuestState, lootMultiplier } from "@/lib/camelotQuest";
import {
  BOUNTY_TIERS,
  currentBountyTier,
  getBountyProgress,
  SHARE_RAILS,
  shareUrl,
} from "@/lib/lootEngine";
import OvernightVelocityRail from "@/components/overnight/OvernightVelocityRail";
import { siteUrl } from "@/lib/site";
import { FOUNDER_ECONOMICS, founderAuthHref } from "@/lib/founderEconomics";

const LOOT_RAILS = [
  { label: `Founder seat · ${FOUNDER_ECONOMICS.labelFirst} first mo`, href: founderAuthHref("war_chest"), icon: Crown, tag: "Revenue" },
  { label: "Buy URUU · zkSync Era", href: "/buy/uruu", icon: Coins, tag: "URUU" },
  { label: "Fair lattice · 1% cap", href: "/token/lattice", icon: Coins, tag: "URUU" },
  { label: "SphinxOS Mainnet bridge", href: "/bridge?mode=mainnet", icon: Coins, tag: "URUU" },
  { label: "Knight's Bounty referrals", href: "/bounty", icon: Swords, tag: "Viral" },
  { label: "Camelot Fair quests", href: "/camelot-fair", icon: Flame, tag: "Retention" },
  { label: "ATART · tarot receipts", href: "/claim/tart", icon: Gift, tag: "Bitcoin" },
  { label: "AETX · mining seals", href: "/claim/aetx", icon: Shield, tag: "Bitcoin" },
  { label: "EXS Tetra-PoW forges", href: "/exs", icon: Coins, tag: "Host chain" },
  { label: "Full tokenomics", href: "/tokenomics", icon: Coins, tag: "Docs" },
];

export default function WarChest() {
  const [tier, setTier] = useState("seeker");
  const [refCode, setRefCode] = useState<string | null>(null);
  const [quest, setQuest] = useState(getQuestState);
  const [bounty, setBounty] = useState(getBountyProgress);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: sub }, { data: code }] = await Promise.all([
        supabase
          .from("subscribers")
          .select("subscribed, subscription_tier")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("ensure_referral_code", { _user_id: user.id }),
      ]);
      if (sub?.subscribed) setTier(sub.subscription_tier ?? "oracle_pro");
      if (typeof code === "string") setRefCode(code);
    })();
    const refresh = () => {
      setQuest(getQuestState());
      setBounty(getBountyProgress());
    };
    window.addEventListener("camelot-quest-updated", refresh);
    return () => window.removeEventListener("camelot-quest-updated", refresh);
  }, []);

  const mult = lootMultiplier(quest.streakDays, quest.completed.length);
  const bountyTier = currentBountyTier(
    bounty,
    quest.completed.length,
    quest.streakDays,
    tier === "oracle_pro",
  );

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="War Chest — Revenue + URUU Command Center"
        description="Equal mainnet pillars: founder Stripe revenue and live URUU on zkSync Era — plus quests, bounty, and Bitcoin claims."
        path="/war-chest"
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "War Chest · Excalibur Crypto",
            url: siteUrl("/war-chest"),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="war-chest-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">War Chest</span>
        </nav>

        <header className="mb-8">
          <Badge variant="outline" className="mb-3 text-[10px] uppercase tracking-widest">
            Command center
          </Badge>
          <h1 className="mb-3 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            War Chest
          </h1>
          <p className="text-lg text-muted-foreground">
            Two mainnet pillars carry equal weight: <strong className="text-foreground">Revenue</strong>{" "}
            (founder seats, referrals) and <strong className="text-foreground">URUU</strong> (live zkSync
            token, fair lattice, bridge). Bitcoin claims and Camelot quests support both.
          </p>
        </header>

        <OvernightVelocityRail className="mb-8" />

        <MainnetTwinPillars
          className="mb-8"
          hideFounderIfSubscribed
          subscribed={tier === "oracle_pro"}
        />

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <section aria-labelledby="revenue-pillar">
            <h2 id="revenue-pillar" className="mb-3 font-display text-sm uppercase tracking-widest text-amber-200">
              Revenue pillar
            </h2>
            {tier !== "oracle_pro" ? (
              <FounderOfferCard currentTier={tier} />
            ) : (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Oracle Pro active — share your bounty link to keep revenue compounding.
                  <Button asChild variant="link" className="mt-2 h-auto p-0">
                    <Link to="/bounty">Open Bounty Board</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
          <section aria-labelledby="uruu-pillar">
            <h2 id="uruu-pillar" className="mb-3 font-display text-sm uppercase tracking-widest text-primary">
              URUU pillar
            </h2>
            <UruuContractCard />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/buy/uruu">Buy URUU</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/embed/lattice">Embed curve</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/bridge?mode=mainnet">Mainnet bridge</Link>
              </Button>
            </div>
          </section>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { k: "Bounty rank", v: bountyTier.title },
            { k: "Quest streak", v: `${quest.streakDays}d` },
            { k: "Loot flair", v: `${mult}×` },
          ].map((s) => (
            <Card key={s.k} className="bg-card/60">
              <CardContent className="p-4 text-center">
                <div className="font-display text-2xl text-amber-200">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-8">
          <CamelotQuestPanel />
        </div>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl uppercase tracking-widest text-primary">
            Bounty ladder
          </h2>
          <ul className="space-y-2">
            {BOUNTY_TIERS.map((t) => (
              <li
                key={t.id}
                className={`rounded-md border px-4 py-3 text-sm ${
                  t.id === bountyTier.id ? "border-amber-500/50 bg-amber-500/10" : "border-border"
                }`}
              >
                <div className="flex justify-between gap-2 font-display text-xs uppercase tracking-widest">
                  <span>{t.title}</span>
                  {t.id === bountyTier.id && <Badge variant="secondary">You</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.requirement}</p>
                <p className="mt-1 text-xs text-foreground/80">{t.perk}</p>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-4 gap-2">
            <Link to="/bounty">
              Open Bounty Board
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl uppercase tracking-widest text-accent">
            Loot rails
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {LOOT_RAILS.map((r) => (
              <li key={r.href}>
                <Link
                  to={r.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <r.icon className="h-4 w-4 text-primary" />
                    {r.label}
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    {r.tag}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {refCode && (
          <Card className="mb-8 border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-4 text-sm">
              <p className="mb-2 font-mono text-xs text-muted-foreground">Your raid ref</p>
              <code className="block break-all rounded bg-background/60 p-2 text-xs">
                {shareUrl(SHARE_RAILS[2].path, refCode)}
              </code>
            </CardContent>
          </Card>
        )}

        <PoweredByUI3 className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
