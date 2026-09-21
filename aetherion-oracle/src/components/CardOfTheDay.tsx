import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { TAROT_CARDS } from "@/data/tarotCards";
import { Badge } from "@/components/ui/badge";

/**
 * Card of the Day — a deterministic daily tarot draw.
 * Same card for everyone on a given UTC date, revealed with a flip.
 * Deep-links to the card's meaning page for crawl depth + delight.
 */
function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function CardOfTheDay() {
  const [flipped, setFlipped] = useState(false);
  const [reversed] = useState(() => hashString(todayKey() + "orientation") % 5 === 0);

  const card = useMemo(() => {
    const idx = hashString(todayKey()) % TAROT_CARDS.length;
    return TAROT_CARDS[idx];
  }, []);

  const meaning = reversed ? card.reversed : card.upright;
  const orientationLabel = reversed ? "reversed" : "upright";

  return (
    <section
      aria-label="Card of the day"
      className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-background/60 via-background/40 to-primary/5 backdrop-blur p-5 md:p-6 overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row gap-5 md:gap-6 items-stretch">
        {/* Flip card */}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? `Hide today's card, ${card.name}` : "Reveal today's card"}
          className="group relative w-full md:w-44 aspect-[2/3] [perspective:1200px] shrink-0"
        >
          <motion.div
            className="relative w-full h-full [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Back */}
            <div className="absolute inset-0 rounded-xl border border-primary/40 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.35),transparent_60%),linear-gradient(160deg,#0b0817,#1a0f2e)] [backface-visibility:hidden] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-2 rounded-lg border border-primary/20" />
              <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(45deg,transparent_0_10px,rgba(255,255,255,0.04)_10px_11px)]" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="relative w-16 h-16 rounded-full border border-primary/50 flex items-center justify-center"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <span className="absolute bottom-3 left-0 right-0 text-center text-[10px] tracking-[0.3em] text-primary/70 uppercase">
                tap to reveal
              </span>
            </div>

            {/* Front */}
            <div
              className="absolute inset-0 rounded-xl border border-primary/50 bg-gradient-to-br from-primary/20 via-background to-violet-900/30 [backface-visibility:hidden] [transform:rotateY(180deg)] p-3 flex flex-col justify-between overflow-hidden"
              style={{ transform: `rotateY(180deg) ${reversed ? "rotate(180deg)" : ""}` }}
            >
              <div className="absolute inset-2 rounded-lg border border-primary/25 pointer-events-none" />
              <div className="text-[10px] uppercase tracking-[0.25em] text-primary/80 text-center">
                {card.arcana === "major" ? "Major Arcana" : card.suit}
              </div>
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-sm font-semibold leading-tight">{card.name}</div>
                {typeof card.number !== "undefined" && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {String(card.number)}
                  </div>
                )}
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-primary/70 text-center">
                {orientationLabel}
              </div>
            </div>
          </motion.div>
        </button>

        {/* Meaning */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-[10px] uppercase tracking-widest">
              ✦ Card of the Day
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>

          <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={flipped ? "revealed" : "hidden"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="inline-block bg-gradient-to-r from-primary via-violet-300 to-primary bg-clip-text text-transparent"
              >
                {flipped ? card.name : "A card waits for you."}
              </motion.span>
            </AnimatePresence>
          </h2>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={flipped ? "m1" : "m0"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: flipped ? 0.15 : 0 }}
              className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              {flipped
                ? meaning
                : "The deck has already chosen for today. One card, drawn beneath the same sky for everyone who arrives. Turn it over."}
            </motion.p>
          </AnimatePresence>

          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-4 flex flex-wrap gap-2"
            >
              {card.keywords.slice(0, 4).map((k) => (
                <span
                  key={k}
                  className="text-[11px] px-2 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary/90"
                >
                  {k}
                </span>
              ))}
            </motion.div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={`/tarot/meanings/${card.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Read the full meaning <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/tarot/meanings"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Browse all 78 cards
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CardOfTheDay;
