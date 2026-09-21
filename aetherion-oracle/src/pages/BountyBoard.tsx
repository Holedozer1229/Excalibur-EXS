// /bounty — Knight's Bounty Board: multi-rail referral share pack
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Copy, Share2, Swords } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/funnel";
import {
  SHARE_RAILS,
  currentBountyTier,
  getBountyProgress,
  recordBountyCopy,
  recordBountyShare,
  shareText,
  shareUrl,
} from "@/lib/lootEngine";
import { getQuestState } from "@/lib/camelotQuest";
import { siteUrl } from "@/lib/site";

export default function BountyBoard() {
  const [code, setCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(getBountyProgress);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: codeData }, { data: sub }] = await Promise.all([
        supabase.rpc("ensure_referral_code", { _user_id: user.id }),
        supabase
          .from("subscribers")
          .select("subscribed")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (typeof codeData === "string") setCode(codeData);
      setIsFounder(!!sub?.subscribed);
    })();
  }, []);

  const quest = getQuestState();
  const tier = currentBountyTier(progress, quest.completed.length, quest.streakDays, isFounder);

  const copyRail = async (railId: string) => {
    const rail = SHARE_RAILS.find((r) => r.id === railId);
    if (!rail) return;
    const text = shareText(rail, code);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(railId);
      setProgress(recordBountyCopy());
      void trackEvent("referral_link_copied", { code, rail: railId, via: "bounty_board" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* noop */
    }
  };

  const shareRail = async (railId: string) => {
    const rail = SHARE_RAILS.find((r) => r.id === railId);
    if (!rail) return;
    const url = shareUrl(rail.path, code);
    const text = shareText(rail, code);
    if (navigator.share) {
      try {
        await navigator.share({ title: rail.label, text, url });
        setProgress(recordBountyShare());
        void trackEvent("referral_link_copied", { code, rail: railId, via: "bounty_share" });
      } catch {
        /* cancelled */
      }
    } else {
      void copyRail(railId);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Knight's Bounty Board — Referral Rails · Excalibur Crypto"
        description="Share tarot seals, Camelot Fair, War Chest, airdrop, and lattice links. Earn +100 oracle responses per signup."
        path="/bounty"
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Knight's Bounty Board",
            url: siteUrl("/bounty"),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="bounty-board-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/war-chest" className="hover:text-foreground">
            War Chest
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Bounty Board</span>
        </nav>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-rose-200">
            <Swords className="h-5 w-5" />
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              {tier.title}
            </Badge>
          </div>
          <h1 className="mb-3 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Knight&apos;s Bounty Board
          </h1>
          <p className="text-lg text-muted-foreground">
            Five viral rails, one ref code. Every friend who signs up with your link triggers the
            existing +100 oracle / +3 dream image bonus — stack invites, climb the ladder, funnel
            into founder seats.
          </p>
        </header>

        {!code && (
          <Card className="mb-8 border-amber-500/40 bg-amber-500/10">
            <CardContent className="p-4 text-sm">
              <Link to="/auth?from=bounty" className="text-primary font-medium hover:underline">
                Sign in
              </Link>{" "}
              to mint your bounty ref code.
            </CardContent>
          </Card>
        )}

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Copies: {progress.copies ?? 0}</Badge>
          <Badge variant="secondary">Shares: {progress.shares ?? 0}</Badge>
          {code && (
            <Badge variant="outline" className="font-mono">
              REF {code}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {SHARE_RAILS.map((rail) => (
            <Card key={rail.id} className="bg-card/60">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-sm uppercase tracking-widest">{rail.label}</h2>
                  <code className="max-w-full truncate text-[10px] text-muted-foreground">
                    {shareUrl(rail.path, code)}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">{rail.hook}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={!code}
                    onClick={() => void copyRail(rail.id)}
                  >
                    {copiedId === rail.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={!code}
                    onClick={() => void shareRail(rail.id)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={rail.path}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/war-chest">Back to War Chest</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/camelot-fair">Camelot Fair</Link>
          </Button>
        </div>

        <PoweredByUI3 className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
