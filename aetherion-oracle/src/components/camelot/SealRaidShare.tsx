import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Share2, Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/funnel";
import { shareText, shareUrl, SHARE_RAILS } from "@/lib/lootEngine";
import { getQuestState, lootMultiplier } from "@/lib/camelotQuest";

type Props = {
  nonce?: string | null;
};

export default function SealRaidShare({ nonce }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mult = lootMultiplier(getQuestState().streakDays, getQuestState().completed.length);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("ensure_referral_code", { _user_id: user.id });
      if (typeof data === "string") setCode(data);
    })();
  }, []);

  const rail = SHARE_RAILS[0];
  const url = shareUrl("/tarot", code);
  const text = `${shareText(rail, code)} Seal nonce ${nonce?.slice(0, 8) ?? "…"} · ${mult}× quest flair`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      void trackEvent("referral_link_copied", { code, via: "seal_raid", nonce });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Seal Raid · Excalibur Crypto", text, url });
        void trackEvent("referral_link_copied", { code, via: "seal_raid_native", nonce });
      } catch {
        /* cancelled */
      }
    } else {
      void copy();
    }
  };

  return (
    <Card className="border-rose-500/35 bg-gradient-to-br from-rose-500/10 via-card/70 to-amber-500/5" data-testid="seal-raid-share">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-rose-200">
          <Swords className="h-4 w-4" />
          <h3 className="font-display text-sm uppercase tracking-widest">Seal Raid · recruit knights</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Drop your sealed reading link into the wild. Friends who sign up via your ref earn you both{" "}
          <span className="text-foreground">+100 oracle responses</span> — stack invites on the{" "}
          <Link to="/bounty" className="text-primary hover:underline">
            Bounty Board
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={() => void copy()}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy raid link"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void share()}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/war-chest">War Chest</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
