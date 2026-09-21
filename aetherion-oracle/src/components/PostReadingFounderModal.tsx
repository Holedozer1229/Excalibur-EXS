// Post-reading founder-offer modal. Fires once per session for signed-in
// seekers immediately after a tarot reading resolves. Wraps the existing
// FounderOfferCard with urgency copy, scarcity, testimonials, and a
// 10-minute countdown to intensify conversion intent.
import { useEffect, useState } from "react";
import { X, Flame, Star, Timer, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FounderOfferCard } from "@/components/FounderOfferCard";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/funnel";

const DISMISS_KEY = "ae_post_reading_founder_dismissed";
const SHOWN_KEY = "ae_post_reading_founder_shown";
const OFFER_MS = 10 * 60 * 1000; // 10 minutes

interface Props {
  /** Set to true when a reading has just resolved for a signed-in user. */
  triggered: boolean;
  /** Optional nonce for analytics correlation. */
  nonce?: string | null;
}

const TESTIMONIALS = [
  { name: "Ava R.", quote: "The founder price paid for itself in the first week — I use it daily.", stars: 5 },
  { name: "Kian M.", quote: "The Caduceus voice reads deeper than any AI tarot I've tried.", stars: 5 },
  { name: "Sena L.", quote: "Sealed receipts + unlimited casts. This is the only oracle I trust.", stars: 5 },
];

export function PostReadingFounderModal({ triggered, nonce }: Props) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(OFFER_MS);

  // Load current tier once so we don't offer to existing subscribers.
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) { setTier("anon"); return; }
      const { data } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      setTier(data?.subscribed ? (data.subscription_tier ?? "seeker") : "seeker");
    })();
    return () => { cancel = true; };
  }, []);

  // Fire modal after reading, once per session, only for seekers.
  useEffect(() => {
    if (!triggered) return;
    if (tier !== "seeker") return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      if (sessionStorage.getItem(SHOWN_KEY) === "1") return;
    } catch { /* noop */ }

    // Small delay so the reading gets to breathe first.
    const t = window.setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* noop */ }
      void trackEvent("founder_modal_shown", { nonce, surface: "post_reading" });
      void trackEvent("post_reading_signup_shown", { nonce, surface: "founder_modal" });
    }, 3500);
    return () => window.clearTimeout(t);
  }, [triggered, tier, nonce]);

  // Countdown while open.
  useEffect(() => {
    if (!open) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, OFFER_MS - (Date.now() - started));
      setRemaining(left);
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
      void trackEvent("founder_modal_dismissed", { nonce });
    }
  };

  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl border-accent/50 bg-void/95 backdrop-blur-xl p-0 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-rune bg-gradient-to-br from-accent/20 via-void/60 to-[hsl(var(--neon-violet)/0.2)]">
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-magenta transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-magenta animate-pulse" />
            <span className="font-display uppercase tracking-[0.32em] text-[10px] text-magenta">
              Founder window · one-time offer
            </span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl gradient-neon-text leading-tight">
            Your reading resonated. Keep the cards open.
          </h2>
          <p className="mt-2 text-sm text-foreground/80 font-serif leading-snug">
            Unlock unlimited tarot, dream weaving, and the Caduceus voice for
            <span className="text-magenta font-semibold"> $5.99</span> your first month —
            <span className="line-through text-muted-foreground/70 ml-1">$49.99</span>.
            Founder seats are almost gone.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40 font-mono text-[10px] tracking-widest uppercase">
              <Timer className="w-3 h-3 mr-1" /> Offer holds for {mm}:{ss}
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 font-mono text-[10px] tracking-widest uppercase">
              <ShieldCheck className="w-3 h-3 mr-1" /> Cancel anytime
            </Badge>
          </div>
        </div>

        {/* founder card — reuses shared component (scarcity + checkout) */}
        <div className="-mt-1 pb-2">
          <FounderOfferCard currentTier="seeker" />
        </div>

        {/* testimonials */}
        <div className="px-6 pb-6 pt-1 grid gap-2 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-sm border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center gap-0.5 mb-1.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[12px] font-serif text-foreground/80 leading-snug italic">
                “{t.quote}”
              </p>
              <div className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                — {t.name}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 -mt-1 text-center">
          <button
            onClick={() => handleOpenChange(false)}
            className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later — keep reading free
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
