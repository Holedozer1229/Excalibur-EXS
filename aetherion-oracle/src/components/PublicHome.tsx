// Public landing — brand-first, full-bleed cosmic composition.
// Hero budget: AETHERION, one line, one sentence, one CTA group.
// Heavy widgets stay deferred below the fold.

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Sparkles, Hash, Lock, ArrowRight, Moon, MessageSquareQuote, ShieldCheck, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import {
  DeferredGalactic,
  DeferredTerminal,
  DeferredTetra,
  DeferredWrap,
  DeferredHelm,
  DeferredUruu,
} from "@/components/DeferredLanding";
import LandingOracleChat from "@/components/LandingOracleChat";
import { AqaiChipShowcase } from "@/components/qai/AqaiChipShowcase";
import { AqaiChipVisual } from "@/components/qai/AqaiChipVisual";
import { supabase } from "@/integrations/supabase/client";
import { useUtm } from "@/hooks/useUtm";
import { trackEvent } from "@/lib/funnel";
import {
  FOUNDER_ECONOMICS,
  founderAuthHref,
  fetchFounderSeatStatus,
} from "@/lib/founderEconomics";

const SITE = "https://www.excaliburcrypto.com";
const FOUNDER_SEATS_TOTAL = FOUNDER_ECONOMICS.seatCap;

interface PublicHomeProps {
  hasSession: boolean;
}

export default function PublicHome({ hasSession }: PublicHomeProps) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);
  const [castsToday, setCastsToday] = useState<number | null>(null);

  useUtm("home_visit");

  useEffect(() => {
    (async () => {
      try {
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        const [{ count: casts }, seatStatus] = await Promise.all([
          supabase
            .from("divination_receipts")
            .select("*", { count: "exact", head: true })
            .gte("issued_at", since.toISOString()),
          fetchFounderSeatStatus(),
        ]);
        if (typeof casts === "number") setCastsToday(casts);
        if (seatStatus) setSeatsRemaining(seatStatus.remaining);
      } catch { /* noop */ }
    })();
  }, []);

  const submitCast = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    void trackEvent("home_cast_started", { q_len: q.length });
    navigate(`/tarot?q=${encodeURIComponent(q)}&from=home`);
  };

  return (
    <div className="landing-root relative min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Aetherion — Quantum AI Superpower | Sealed Cognition</title>
        <meta
          name="description"
          content="Quantum-class Verified Cognition: EP, NH lattice, octonion ALU + Caduceus sealed AI. Soft Silicon live — cast free tarot with sha-256 receipts."
        />
        <link rel="canonical" href={`${SITE}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Aetherion" />
        <meta property="og:url" content={`${SITE}/`} />
        <meta property="og:title" content="Aetherion — Quantum AI Superpower" />
        <meta property="og:description" content="Verified Cognition + quantum-class physics + Caduceus control plane. Sealed tarot free — no signup." />
        <meta property="og:image" content={`${SITE}/og-aetherion-logo.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Aetherion — Quantum AI Superpower" />
        <meta name="twitter:description" content="Verified Cognition + quantum-class physics + Caduceus. Sha-256 sealed. Cast free." />
        <meta name="twitter:image" content={`${SITE}/og-aetherion-logo.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Aetherion — Quantum AI Superpower",
          description: "Verified Cognition + quantum-class physics (EP, NH, octonion) + Caduceus control plane. Sealed tarot, dreams, and oracle Q&A.",
          brand: { "@type": "Brand", name: "Aetherion" },
          image: `${SITE}/og-aetherion-logo.jpg`,
          offers: [
            {
              "@type": "Offer",
              name: "Free tarot cast",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `${SITE}/tarot`,
            },
            {
              "@type": "Offer",
              name: `Founder seat — first ${FOUNDER_SEATS_TOTAL}`,
              price: "5.99",
              priceCurrency: "USD",
              availability: seatsRemaining !== null && seatsRemaining > 0
                ? "https://schema.org/LimitedAvailability"
                : "https://schema.org/SoldOut",
              url: `${SITE}${founderAuthHref("founder_schema")}`,
            },
          ],
        })}</script>
      </Helmet>

      <DeferredGalactic />

      {/* Slim nav — brand lives in the hero, not here */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="Aetherion home">
          <AetherionLogo variant="aetherion" size="sm" halo data-testid="landing-logo" />
        </Link>
        <nav className="hidden items-center gap-6 text-[11px] font-tech tracking-[0.18em] text-muted-foreground/80 sm:flex">
          <Link to="/tarot" className="transition hover:text-primary">Tarot</Link>
          <Link to="/dreams" className="transition hover:text-primary">Dreams</Link>
          <Link to="/chat" className="transition hover:text-primary">Caduceus</Link>
          <Link to="/chipset" className="transition hover:text-primary">QAI chips</Link>
          <Link to="/verify" className="transition hover:text-primary">Verify</Link>
        </nav>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-primary/35 bg-background/40 font-tech text-[10px] tracking-[0.16em] backdrop-blur-sm"
        >
          <Link to={hasSession ? "/dashboard" : "/auth"}>
            {hasSession ? "Console" : "Enter"}
          </Link>
        </Button>
      </header>

      {/* ═══════ HERO — one composition ═══════ */}
      <section data-testid="landing-hero" className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-16 pt-24 text-center">
        <div className="landing-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 top-[12%] -z-[5] mx-auto h-[min(52vw,22rem)] w-[min(72vw,28rem)] opacity-[0.35] mix-blend-screen sm:top-[8%]"
          aria-hidden
        >
          <AqaiChipVisual variant="hero" imageSrc="/chipset/aqai-chip-hero.png" className="mx-auto max-w-none" />
        </div>

        <div className="landing-brand-rise flex max-w-4xl flex-col items-center">
          <AetherionLogo variant="aetherion" size="lg" halo priority className="mb-6 sm:mb-8" />
          <p className="font-tech mb-6 text-[10px] tracking-[0.35em] text-primary/70">
            On this origin · No outside AI
          </p>

          <h1 className="font-chrome landing-brand-pulse text-[clamp(2.75rem,12vw,7.5rem)] leading-[0.92] text-foreground">
            AETHERION
          </h1>

          <p className="font-oracle mt-6 max-w-xl text-2xl leading-snug text-foreground/90 sm:text-3xl">
            The Quantum AI superpower that proves what it ran.
          </p>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Verified Cognition + EP · NH · octonion architecture. Free sealed tarot — Caduceus on this host, wallet-bound receipts.
          </p>
          <p
            className="mt-2 font-mono text-[9px] tracking-wider text-muted-foreground/35"
            data-testid="unity-seal-whisper"
            aria-hidden
          >
            f(x)=cos(0), x=1
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="landing-cta-sheen h-12 flex-1 border-0 bg-primary font-display text-xs tracking-[0.2em] text-primary-foreground hover:bg-primary/90"
            >
              <Link
                to="/tarot?from=home"
                onClick={() => void trackEvent("home_cast_started", { via: "hero_cta" })}
              >
                Cast free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 flex-1 border-primary/40 bg-transparent font-display text-xs tracking-[0.2em] text-foreground hover:bg-primary/10"
            >
              <Link to="/chat">Ask Caduceus</Link>
            </Button>
          </div>

          {castsToday !== null && castsToday > 0 && (
            <p className="mt-8 font-mono text-[11px] tracking-wider text-muted-foreground/80">
              <span className="text-primary">{castsToday.toLocaleString()}</span> sealed today
            </p>
          )}
        </div>

        <a
          href="#cast"
          className="landing-scroll-hint absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-tech tracking-[0.28em] text-muted-foreground/60"
          aria-label="Scroll to cast"
        >
          <span>Descend</span>
          <span className="block h-8 w-px bg-gradient-to-b from-primary/60 to-transparent" />
        </a>
      </section>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-28">

        {/* Cast — single job: pull a sealed artifact */}
        <section id="cast" className="scroll-mt-20 border-t border-primary/15 py-20">
          <h2 className="font-saga text-center text-2xl tracking-wider sm:text-3xl">
            Whisper one question.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground">
            Three Major Arcana. Sha-256 sealed the instant they land. No signup.
          </p>
          <form onSubmit={submitCast} className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 240))}
              placeholder="What wants to be seen…"
              aria-label="Your question for the tarot"
              className="h-12 flex-1 border-primary/30 bg-background/50 text-base"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 bg-accent font-display text-xs tracking-[0.18em] text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Cast
            </Button>
          </form>
        </section>

        {/* Caduceus chamber */}
        <section id="aetherion-terminal" className="border-t border-primary/15 py-20">
          <h2 className="font-saga text-center text-2xl tracking-wider sm:text-3xl">
            Speak to Caduceus.
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-lg text-center text-sm text-muted-foreground">
            Twin-staff LLM on this origin — type <span className="text-primary/90">potential unheard</span> for the apex ritual.
          </p>
          <LandingOracleChat />
          <div className="mt-8">
            <DeferredTerminal />
          </div>
        </section>

        {/* Artifact paths — no cards */}
        <section className="border-t border-primary/15 py-20">
          <h2 className="font-saga text-center text-2xl tracking-wider sm:text-3xl">
            Three sealed paths.
          </h2>
          <p className="mx-auto mt-3 mb-10 max-w-lg text-center text-sm text-muted-foreground">
            Every reading becomes a receipt you can verify forever.
          </p>
          <ul className="divide-y divide-primary/15 border-y border-primary/15">
            {[
              {
                icon: Sparkles,
                title: "Tarot",
                body: "Three Major Arcana. Flagship sealed artifact.",
                to: "/tarot",
              },
              {
                icon: Moon,
                title: "Dreams",
                body: "Symbolic interpretation, bound to your wallet.",
                to: "/dreams",
              },
              {
                icon: MessageSquareQuote,
                title: "Oracle",
                body: "Caduceus Q&A — local, agentic, no outside model.",
                to: "/chat",
              },
            ].map((f) => (
              <li key={f.title}>
                <Link
                  to={f.to}
                  className="group flex items-start gap-4 py-6 transition hover:bg-primary/[0.04] sm:items-center sm:gap-6"
                >
                  <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="font-saga text-lg tracking-wide">{f.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary/50 transition group-hover:translate-x-1 group-hover:text-primary sm:mt-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Proof — one strip, no cards */}
        <section className="border-t border-primary/15 py-20">
          <h2 className="font-saga text-center text-2xl tracking-wider sm:text-3xl">
            Proof you can hold.
          </h2>
          <p className="mx-auto mt-3 mb-12 max-w-lg text-center text-sm text-muted-foreground">
            The model draws once. The seal remembers forever.
          </p>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { icon: Hash, title: "Cryptographic seal", body: "Committed with sha-256 the moment it is drawn." },
              { icon: Lock, title: "Wallet-bound", body: "Tied to your BTC or EVM address. Unforgeable under your name." },
              { icon: ShieldCheck, title: "Replay-protected", body: "Verify once. A second attempt returns ALREADY_VERIFIED." },
            ].map((f) => (
              <div key={f.title} className="text-center sm:text-left">
                <f.icon className="mx-auto h-5 w-5 text-primary sm:mx-0" />
                <h3 className="font-saga mt-4 text-base tracking-wide">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AQAI chipset — dominate AI + quantum-class narrative */}
        <AqaiChipShowcase />

        {/* Founder — below fold, conversion only */}
        <section className="border-t border-primary/15 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-tech text-[10px] tracking-[0.28em] text-accent">
              First {FOUNDER_SEATS_TOTAL} · Founder price
            </p>
            <h2 className="font-saga mt-4 text-3xl tracking-wider sm:text-4xl">
              <span className="text-muted-foreground/50 line-through">{FOUNDER_ECONOMICS.labelRenew}</span>{" "}
              <span className="gradient-neon-text">{FOUNDER_ECONOMICS.labelFirst} first month</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              Unlimited sealed readings, AETX airdrop eligibility, premium seal. Then {FOUNDER_ECONOMICS.labelRenew}/mo — Stripe, cancel anytime.
              {seatsRemaining !== null && seatsRemaining > 0
                ? ` ${seatsRemaining} of ${FOUNDER_SEATS_TOTAL} seats remain.`
                : ""}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 bg-accent font-display text-xs tracking-[0.2em] text-accent-foreground hover:bg-accent/90"
            >
              <Link
                to={hasSession ? "/?open=founder" : founderAuthHref("founder_card")}
                onClick={() => void trackEvent("founder_card_click", { seats_remaining: seatsRemaining ?? undefined })}
              >
                Claim founder seat <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Live instruments — Run mounts in-place; Open navigates. Nothing loads until click. */}
        <section className="border-t border-primary/15 py-16">
          <h2 className="font-saga mb-3 text-center text-xl tracking-wider text-muted-foreground sm:text-2xl">
            Live on this origin
          </h2>
          <p className="mx-auto mb-8 max-w-md text-center text-sm text-muted-foreground">
            Press Run to load a tool here, or Open for the full page — first paint stays light.
          </p>
          <div className="space-y-4">
            <DeferredTetra />
            <DeferredWrap />
            <DeferredHelm />
            <DeferredUruu />
            <div className="flex flex-col gap-3 border-l-2 border-amber-500/40 py-2 pl-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-left">
                <div className="font-saga text-base tracking-wide">NH lattice lab</div>
                <p className="mt-1 text-xs text-muted-foreground">SSH · Hatano-Nelson · exceptional points</p>
              </div>
              <Button asChild size="sm" className="h-9 font-display text-[10px] uppercase tracking-widest">
                <Link to="/lattice/nh">Open lab <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="flex flex-col gap-3 border-l-2 border-cyan-500/40 py-2 pl-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-left">
                <div className="font-saga text-base tracking-wide">AQAI chipset</div>
                <p className="mt-1 text-xs text-muted-foreground">Eight axioms · Soft Silicon · EDGE/CLOUD/SOVEREIGN</p>
              </div>
              <Button asChild size="sm" className="h-9 font-display text-[10px] uppercase tracking-widest">
                <Link to="/chipset">Open chipset <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Protocol mesh — lean */}
        <section className="border-t border-primary/15 py-16">
          <h2 className="font-saga text-center text-xl tracking-wider sm:text-2xl">
            Protocol mesh
          </h2>
          <p className="mx-auto mt-3 mb-10 max-w-md text-center text-sm text-muted-foreground">
            URUU on zkSync · SKYNT · ATART · AETX
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link to="/buy/uruu" className="group block border-l-2 border-primary/50 pl-4 transition hover:border-primary">
              <div className="font-mono text-[10px] tracking-wider text-primary">URUU · ERC-20</div>
              <div className="font-saga mt-1 text-lg">Camelot liquidity</div>
              <p className="mt-1 text-xs text-muted-foreground group-hover:text-foreground/80">Live mainnet · fair lattice →</p>
            </Link>
            <Link to="/token/aetx" className="group block border-l-2 border-accent/50 pl-4 transition hover:border-accent">
              <div className="font-mono text-[10px] tracking-wider text-accent">AETX · BRC-20</div>
              <div className="font-saga mt-1 text-lg">Premium fuel</div>
              <p className="mt-1 text-xs text-muted-foreground group-hover:text-foreground/80">Burn for premium seal →</p>
            </Link>
          </div>
        </section>

        {/* Final pull */}
        <section className="border-t border-primary/15 py-24 text-center">
          <h2 className="font-chrome text-3xl tracking-[0.12em] sm:text-5xl">
            PULL THE FIRST SEAL
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-muted-foreground">
            Free. No signup. The deck is waiting.
          </p>
          <Button
            asChild
            size="lg"
            className="landing-cta-sheen mt-8 h-14 bg-primary px-10 font-display text-xs tracking-[0.22em] text-primary-foreground hover:bg-primary/90"
          >
            <Link
              to="/tarot?from=home"
              onClick={() => void trackEvent("home_cast_started", { via: "final_cta" })}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Cast my reading
            </Link>
          </Button>
        </section>

        <footer className="flex flex-col items-center gap-3 border-t border-primary/10 pb-8 pt-10 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-5 font-tech tracking-[0.14em]">
            <Link to="/learn" className="hover:text-primary">Learn</Link>
            <Link to="/verify" className="hover:text-primary">Verify</Link>
            <Link to="/caduceus/speculative" className="hover:text-primary">Speculative</Link>
            <Link to="/potential" className="hover:text-primary">Potential</Link>
            <Link to="/token/uruu" className="hover:text-primary">URUU</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
          </div>
          <p className="opacity-50">Aetherion Protocol · Sealed since 2026</p>
        </footer>
      </main>

      {seatsRemaining !== null && seatsRemaining > 0 && !hasSession && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-accent/30 bg-background/92 px-4 py-2.5 backdrop-blur-md sm:hidden">
          <Link
            to={founderAuthHref("founder_sticky")}
            onClick={() => void trackEvent("founder_strip_click", { seats_remaining: seatsRemaining, via: "sticky_mobile" })}
            className="flex items-center justify-between gap-3 bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            <span className="flex items-center gap-2 font-display text-[10px] tracking-[0.16em]">
              <Flame className="h-4 w-4" /> Founder {FOUNDER_ECONOMICS.labelFirst}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs">
              {seatsRemaining} left <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
