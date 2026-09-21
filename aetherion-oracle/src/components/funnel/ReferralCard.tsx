// Referral card — shows after a signed-in seeker has cast a reading.
// Pulls the user's referral code from ensure_referral_code (idempotent),
// shows a shareable /lp?ref=CODE link, and fires referral_link_copied.

import { useEffect, useState } from "react";
import { Copy, Check, Share2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/funnel";

const SITE = typeof window !== "undefined" ? window.location.origin : "https://www.excaliburcrypto.com";

export function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bonusOracle, setBonusOracle] = useState(0);
  const [bonusImages, setBonusImages] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: codeData }, { data: bonusData }] = await Promise.all([
        supabase.rpc("ensure_referral_code", { _user_id: user.id }),
        supabase.rpc("get_user_bonuses", { _user_id: user.id }),
      ]);
      if (typeof codeData === "string") setCode(codeData);
      const b = bonusData as { bonus_oracle_responses?: number; bonus_dream_images?: number } | null;
      setBonusOracle(Number(b?.bonus_oracle_responses ?? 0));
      setBonusImages(Number(b?.bonus_dream_images ?? 0));
    })();
  }, []);

  if (!code) return null;

  const url = `${SITE}/lp?ref=${code}`;
  const shareText = "I just pulled a sealed, wallet-bound reading on Aetherion. Sign up with my link and we both get +100 oracle responses and +3 dream images.";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      void trackEvent("referral_link_copied", { code });
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A tarot reading you can actually verify",
          text: shareText,
          url,
        });
        void trackEvent("referral_link_copied", { code, via: "share" });
      } catch { /* user cancelled */ }
    } else {
      void copy();
    }
  };

  return (
    <Card className="mt-4 border-violet-500/30 bg-violet-500/5">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-violet-300">
          <Sparkles className="h-4 w-4" />
          <h3 className="font-saga text-sm uppercase tracking-wider">Share the seal · earn together</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          The moment a friend signs up with your link,{" "}
          <span className="text-violet-200">you both instantly get +100 oracle responses and +3 dream images</span> — permanent, stacks every invite.
        </p>
        {(bonusOracle > 0 || bonusImages > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-violet-200">
              +{bonusOracle} oracle responses earned
            </span>
            <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-violet-200">
              +{bonusImages} dream images earned
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-md border border-violet-500/30 bg-background/60 px-3 py-2 font-mono text-xs">
          <span className="flex-1 truncate text-violet-200">{url}</span>
          <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <Button onClick={share} variant="outline" size="sm" className="w-full border-violet-500/40 text-violet-200 hover:bg-violet-500/10">
          <Share2 className="mr-2 h-4 w-4" /> Share the seal
        </Button>
      </CardContent>
    </Card>
  );
}
