// /lp — single-purpose conversion landing page for paid + community traffic.
// Distinct from /, optimized for "free AI tarot reading" / "on-chain divination"
// search intent. CTA → /tarot with the question pre-filled and from=lp.

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Hash, Lock, ArrowRight, Zap, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import GalacticBackground from "@/components/GalacticBackground";
import { supabase } from "@/integrations/supabase/client";
import { useUtm } from "@/hooks/useUtm";
import { trackEvent } from "@/lib/funnel";
import { ExitIntentModal } from "@/components/funnel/ExitIntentModal";

const SITE = "https://www.excaliburcrypto.com";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is the tarot reading really free?",
    a: "Yes. Your first cast is free, no signup, no email. Sign in for unlimited daily readings and to claim a permanent on-chain receipt for each one.",
  },
  {
    q: "What does 'wallet-bound' mean?",
    a: "Each reading is sealed against your wallet address (optional) plus a fresh cryptographic nonce. That seal makes the reading provably yours, and provably unreplayable — no one can recast the same spread under your name.",
  },
  {
    q: "How is this different from any other AI tarot?",
    a: "Most AI tarot regenerates a new reading every time you refresh. Aetherion writes a sha-256 commitment of your spread the moment it's drawn, so the reading you got at midnight is the same reading anyone can verify at noon. The Caduceus topological engine also runs in parallel, giving each cast a unique quantum-chaos signature.",
  },
  {
    q: "Can I verify a reading later?",
    a: "Yes. Every reading gets a /verify link with its nonce and commitment hash. Anyone can verify once — a second attempt returns ALREADY_VERIFIED. That's the replay-protection seal.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [castStarted, setCastStarted] = useState(false);
  const [castsToday, setCastsToday] = useState<number | null>(null);

  useUtm("lp_visit");

  // Live social proof: how many sealed readings today.
  useEffect(() => {
    (async () => {
      try {
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("divination_receipts")
          .select("*", { count: "exact", head: true })
          .gte("issued_at", since.toISOString());
        if (typeof count === "number") setCastsToday(count);
      } catch { /* noop */ }
    })();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setCastStarted(true);
    void trackEvent("lp_cast_started", { q_len: q.length });
    const params = new URLSearchParams({ q, from: "lp" });
    navigate(`/tarot?${params.toString()}`);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Free AI Tarot Reading — Wallet-Bound & Verifiable</title>
        <meta name="description" content="Pull a free AI tarot reading you can verify. Each cast is sealed with a sha-256 commitment, bound to your wallet, and replay-protected." />
        <link rel="canonical" href={`${SITE}/lp`} />
        <meta property="og:title" content="Free AI Tarot Reading — Verifiable, Wallet-Bound" />
        <meta property="og:description" content="A tarot reading sealed with a cryptographic commitment. Anyone can verify it; no one can replay it." />
        <meta property="og:url" content={`${SITE}/lp`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        })}</script>
      </Helmet>

      <GalacticBackground />
      <ExitIntentModal castStarted={castStarted} />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 py-14 sm:py-20">
        {/* ============ HERO ============ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex w-full flex-col items-center text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-300">
            <ShieldCheck className="h-3 w-3" /> Sealed · Wallet-Bound · Replay-Protected
          </div>

          <h1 className="font-saga text-4xl leading-[1.05] sm:text-6xl">
            A tarot reading <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              you can actually verify.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Every cast is bound to your wallet, sealed with a sha-256 commitment, and replay-protected.
            Pull a real one for free — no signup, no email, no replay.
          </p>

          {/* Inline cast form — primary conversion */}
          <form onSubmit={submit} className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 240))}
              placeholder="Whisper one question to the deck…"
              aria-label="Your question for the tarot"
              className="h-12 flex-1 border-violet-500/30 bg-background/60 text-base placeholder:text-muted-foreground/60 focus-visible:border-violet-400"
            />
            <Button type="submit" size="lg" className="h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 text-base font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500">
              <Sparkles className="mr-2 h-4 w-4" /> Cast for free <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          {castsToday !== null && castsToday > 0 && (
            <p className="mt-4 text-xs uppercase tracking-wider text-emerald-300/80">
              <span className="font-mono text-emerald-200">{castsToday.toLocaleString()}</span> sealed readings cast today
            </p>
          )}
        </motion.div>

        {/* ============ PROOF STRIP ============ */}
        <section className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              icon: Hash,
              title: "Cryptographic seal",
              body: "Every spread is committed with a sha-256 hash the moment it's drawn. The receipt is the proof.",
            },
            {
              icon: Lock,
              title: "Wallet-bound",
              body: "Your reading is bound to your BTC or EVM address. No one can recast it under your name.",
            },
            {
              icon: ShieldCheck,
              title: "Replay-protected",
              body: "Verify once, and the seal sets. A second attempt returns ALREADY_VERIFIED. Forever.",
            },
          ].map((f) => (
            <Card key={f.title} className="border-border/50 bg-card/30 backdrop-blur">
              <CardContent className="space-y-2 p-5">
                <f.icon className="h-5 w-5 text-violet-300" />
                <h3 className="font-saga text-lg">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* ============ BTC / CRYPTO ANGLE ============ */}
        <section className="mt-20 w-full">
          <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <CardContent className="grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300">
                  <Bitcoin className="h-3 w-3" /> For the BTC sovereign
                </div>
                <h2 className="font-saga text-2xl sm:text-3xl">Your wallet IS your divination.</h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                  Drop in your taproot or BRC-20 address. The reading derives entropy from your wallet, the question, and a fresh nonce — then we hash the spread and broadcast a verifiable commitment. Try the protocol, not just the prophecy.
                </p>
              </div>
              <Button asChild variant="outline" size="lg" className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10">
                <Link to="/token/aetx"><Zap className="mr-2 h-4 w-4" /> View AETX token</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* ============ FAQ ============ */}
        <section className="mt-20 w-full max-w-3xl">
          <h2 className="mb-6 text-center font-saga text-2xl sm:text-3xl">Questions before you cast</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-lg border border-border/50 bg-card/30 px-5 py-4 backdrop-blur transition-colors hover:border-violet-500/40">
                <summary className="cursor-pointer list-none font-saga text-base text-foreground/90 marker:hidden">
                  {q}
                  <span className="float-right text-violet-300 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="mt-20 flex w-full flex-col items-center text-center">
          <h2 className="font-saga text-3xl sm:text-4xl">Ready to pull the seal?</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">Free. No signup. The deck is waiting.</p>
          <Button asChild size="lg" className="mt-6 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-base font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500">
            <Link to="/tarot?from=lp" onClick={() => { setCastStarted(true); void trackEvent("lp_cast_started", { via: "final_cta" }); }}>
              <Sparkles className="mr-2 h-4 w-4" /> Cast my reading <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>

        <footer className="mt-20 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">Aetherion</Link>
            <Link to="/verify" className="hover:text-foreground">Verify a receipt</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
          <p className="opacity-60">Aetherion Oracle · Sealed since 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
