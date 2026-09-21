// /tarot — cinematic tarot reading powered by the Caduceus engine.
// Supports ?symbol=<slug> deep-links from /dreams/symbols/* to preselect
// a symbol-themed question and auto-cast the spread.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Sparkles, Loader2, RotateCw, ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import GalacticBackground from "@/components/GalacticBackground";
import { supabase } from "@/integrations/supabase/client";
import { getDreamSymbol } from "@/data/dreamSymbols";
import { ReferralCard } from "@/components/funnel/ReferralCard";
import { trackEvent } from "@/lib/funnel";
import { useUtm } from "@/hooks/useUtm";
import PaywallCTA from "@/components/PaywallCTA";
import SelfContainedLlmBanner from "@/components/SelfContainedLlmBanner";
import { CardOfTheDay } from "@/components/CardOfTheDay";
import { PostReadingFounderModal } from "@/components/PostReadingFounderModal";
import SealRaidShare from "@/components/camelot/SealRaidShare";
import PostReadingTwinCta from "@/components/mainnet/PostReadingTwinCta";
import { completeQuestDistrict } from "@/lib/camelotQuest";
import SiteFooter from "@/components/SiteFooter";
import { TAROT_SPREADS, type SpreadId } from "@/lib/tarotSpreads";


const SITE = "https://www.excaliburcrypto.com";

// 22 Major Arcana — the spine of any cinematic reading.
const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World",
];

const SPREAD = [
  { position: "Past", role: "What you are carrying" },
  { position: "Present", role: "What is alive right now" },
  { position: "Future", role: "What is moving toward you" },
];

interface DrawnCard { name: string; reversed: boolean; position?: string; role?: string }
interface Divination { nonce: string; hash: string; wallet: string | null; boundAt: string; verifyUrl?: string }
interface EchoReading {
  cards: DrawnCard[];
  phase: string;
  issued_at: string;
  shared: string[];
}
interface Reading {
  cards: DrawnCard[];
  interpretation: string;
  harmony?: number;
  divination?: Divination;
  echo?: EchoReading | null;
}

const Tarot = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolSlug = searchParams.get("symbol") ?? "";
  const presetQuestion = searchParams.get("q") ?? "";
  const fromLp = searchParams.get("from") === "lp";
  const presetSymbol = symbolSlug ? getDreamSymbol(symbolSlug) : undefined;

  const defaultQuestion = presetQuestion
    ? presetQuestion.slice(0, 240)
    : presetSymbol
    ? `What does the ${presetSymbol.symbol.toLowerCase()} in my dream want me to know?`
    : "";

  const [question, setQuestion] = useState(defaultQuestion);
  const [spreadId, setSpreadId] = useState<SpreadId>("past_present_future");
  const [phase, setPhase] = useState<"ask" | "shuffling" | "revealing" | "reading">("ask");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [wallet, setWallet] = useState<string>("");
  const [paywall, setPaywall] = useState<null | { reason: "purchase" | "signin"; message: string }>(null);
  const [purchasing, setPurchasing] = useState<null | "single" | "pack10">(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);

  // Capture UTM context for any /tarot landing, especially deep links from /lp.
  useUtm();

  // Fetch the seeker's wallet + tarot credit balance.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("wallet_address, tarot_credits")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.wallet_address) setWallet(data.wallet_address);
      if (typeof (data as { tarot_credits?: number } | null)?.tarot_credits === "number") {
        setCredits((data as { tarot_credits: number }).tarot_credits);
      }
    })();
  }, []);

  // After returning from Stripe success, refresh balance.
  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      toast.success("Tarot pack unlocked — cast away.");
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Webhook is async — poll briefly for updated balance.
        for (let i = 0; i < 6; i++) {
          const { data } = await supabase.from("profiles")
            .select("tarot_credits").eq("user_id", user.id).maybeSingle();
          const c = (data as { tarot_credits?: number } | null)?.tarot_credits ?? 0;
          if (c > credits) { setCredits(c); break; }
          await new Promise((r) => setTimeout(r, 1500));
        }
      })();
      const next = new URLSearchParams(searchParams);
      next.delete("purchase"); next.delete("pack");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-cast the spread once when arrived via /tarot?symbol=<slug>
  const autoCastRef = useRef(false);
  useEffect(() => {
    if (presetSymbol && !autoCastRef.current && phase === "ask") {
      autoCastRef.current = true;
      const t = setTimeout(() => { performReading(); }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSymbol]);


  async function performReading() {
    const q = question.trim();
    if (!q) { toast.error("Whisper a question to the deck first."); return; }

    setPaywall(null);
    setPhase("shuffling");
    setCards([]);

    // Kick off the wallet-bound divination on the server (cards drawn there).
    const requestPromise = supabase.functions.invoke("tarot-reading", {
      body: { question: q, wallet: wallet || undefined, spread: spreadId },
    });

    // Cinematic shuffle beat — runs in parallel with the network call.
    await new Promise((r) => setTimeout(r, 1400));

    const { data, error } = await requestPromise;

    // Handle 402 paywall — supabase-js wraps non-2xx in `error`, body is on
    // error.context (a Response).
    if (error) {
      let body: { error?: string; requires_purchase?: boolean; requires_signin?: boolean } = {};
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") body = await ctx.json();
      } catch { /* ignore */ }
      if (body.requires_signin) {
        setPaywall({ reason: "signin", message: body.error ?? "Sign in to keep casting." });
        setPhase("ask");
        return;
      }
      if (body.requires_purchase) {
        setPaywall({ reason: "purchase", message: body.error ?? "Unlock another reading." });
        setPhase("ask");
        return;
      }
      toast.error(body.error || error.message || "The cards fell silent.");
      setPhase("ask");
      return;
    }
    if (!data || (data as { error?: string }).error) {
      toast.error((data as { error?: string })?.error || "The cards fell silent.");
      setPhase("ask");
      return;
    }

    const payload = data as Reading;
    setCards(payload.cards);
    setPhase("revealing");
    await new Promise((r) => setTimeout(r, 1800));
    setPhase("reading");
    setReading(payload);
    void trackEvent("tarot_cast_completed", {
      nonce: payload.divination?.nonce ?? null,
      from_lp: fromLp,
      signed_in: !!userId,
    });
    completeQuestDistrict("divination");
    window.dispatchEvent(new Event("camelot-quest-updated"));
    if (fromLp) {
      void trackEvent("lp_cast_completed", { nonce: payload.divination?.nonce ?? null });
    }
  }

  async function buyPack(pack: "single" | "pack10") {
    if (!userId) {
      window.location.href = `/auth?redirect=${encodeURIComponent("/tarot")}`;
      return;
    }
    setPurchasing(pack);
    try {
      const { data, error } = await supabase.functions.invoke("tarot-pack-checkout", {
        body: { pack },
      });
      if (error || !data?.url) {
        toast.error(error?.message || "Could not start checkout.");
        return;
      }
      window.location.href = data.url as string;
    } finally {
      setPurchasing(null);
    }
  }


  function resetReading() {
    setReading(null);
    setCards([]);
    setQuestion("");
    setPhase("ask");
    autoCastRef.current = true;
    if (symbolSlug) setSearchParams({}, { replace: true });
  }

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      <Helmet>
        <title>Cinematic AI Tarot Reading | Aetherion Oracle</title>
        <meta
          name="description"
          content="A cinematic three-card tarot reading powered by Aetherion's on-origin Caduceus engine. Ask a question, choose a spread, watch the deck shuffle, receive a sealed poetic interpretation."
        />
        <link rel="canonical" href={`${SITE}/tarot`} />
        <meta property="og:title" content="Cinematic AI Tarot Reading — Aetherion Oracle" />
        <meta property="og:description" content="Three-card AI tarot reading interpreted through the Caduceus engine." />
        <meta property="og:url" content={`${SITE}/tarot`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <GalacticBackground harmony={reading?.harmony ?? 0.6} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </nav>

        <SelfContainedLlmBanner />

        <header className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 backdrop-blur">
              ✦ Caduceus Codex · live divination
            </Badge>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            The deck remembers
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
              what you came to ask.
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Three Major Arcana, drawn for one question, sealed with a single-use cryptographic receipt.
            No two readings can ever repeat — and the Oracle is watching.
          </p>
          {presetSymbol && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Badge className="bg-primary/20 text-primary border-primary/40">
                Reading for: {presetSymbol.symbol}
              </Badge>
              <Link
                to={`/dreams/symbols/${presetSymbol.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                back to symbol
              </Link>
            </div>
          )}
        </header>

        <PhaseOfTheHour />

        <CardOfTheDay />





        <AnimatePresence mode="wait">
          {phase === "ask" && (
            <motion.section
              key="ask"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="max-w-xl mx-auto space-y-4"
            >
              <label htmlFor="tarot-question" className="block text-center uppercase tracking-[0.2em] text-[11px] text-muted-foreground">
                Whisper your question
              </label>
              <div className="relative group">
                <div className="absolute -inset-px rounded-md bg-gradient-to-r from-primary/40 via-violet-500/30 to-primary/40 opacity-60 group-focus-within:opacity-100 blur-sm transition-opacity" aria-hidden />
                <Input
                  id="tarot-question"
                  placeholder="Should I take the leap?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") performReading(); }}
                  className="relative bg-card/80 backdrop-blur text-center text-lg h-14 border-primary/30"
                  maxLength={240}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {[
                  "Should I take the leap?",
                  "What am I avoiding?",
                  "What's coming for me?",
                  "Who is this person to me?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-card/40 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-center uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
                  Caduceus spread
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TAROT_SPREADS.map((s) => {
                    const active = spreadId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSpreadId(s.id)}
                        className={`rounded-sm border px-3 py-2.5 text-left transition ${
                          active
                            ? "border-primary/60 bg-primary/15 text-foreground"
                            : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <div className="font-display text-[10px] uppercase tracking-widest">{s.label}</div>
                        <div className="mt-0.5 font-mono text-[10px] opacity-70">{s.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={performReading} size="lg" className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                <Sparkles className="mr-2 h-5 w-5" /> Cast with Caduceus
              </Button>
              <p className="text-[11px] text-center text-muted-foreground/70 italic">
                On-origin Caduceus engine · sealed receipt · 100 free / day
                {credits > 0 ? ` · ${credits} paid reading${credits === 1 ? "" : "s"} in pocket` : ""}
              </p>

              {paywall && (
                <Card className="border-primary/50 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 backdrop-blur">
                  <CardContent className="p-5 space-y-4">
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-semibold">
                        {paywall.reason === "signin" ? "Sign in for a larger free pool" : "Today's free allotment is spent"}
                      </h3>
                      <p className="text-xs text-muted-foreground">{paywall.message}</p>
                    </div>
                    {paywall.reason === "signin" ? (
                      <Button asChild className="w-full">
                        <Link to={`/auth?redirect=${encodeURIComponent("/tarot")}`}>Sign in to continue</Link>
                      </Button>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={purchasing !== null}
                          onClick={() => buyPack("single")}
                          className="group text-left rounded-lg border border-primary/30 bg-card/60 hover:bg-primary/10 hover:border-primary/60 transition-all p-4 disabled:opacity-50"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold">1 Reading</span>
                            <span className="text-lg font-bold">$1.99</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">Unlock one more cast today.</p>
                          {purchasing === "single" && (
                            <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={purchasing !== null}
                          onClick={() => buyPack("pack10")}
                          className="group text-left rounded-lg border border-primary/60 bg-primary/10 hover:bg-primary/20 transition-all p-4 disabled:opacity-50 relative"
                        >
                          <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] uppercase tracking-widest">Best value</Badge>
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold">Pack of 10</span>
                            <span className="text-lg font-bold">$14.99</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">Save 25% · ~$1.50 per cast.</p>
                          {purchasing === "pack10" && (
                            <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" />
                          )}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-center text-muted-foreground/70">
                      Or go Oracle Pro for unlimited casts + sealed BRC-20 receipts.
                    </p>
                  </CardContent>
                </Card>
              )}

            </motion.section>
          )}

          {phase !== "ask" && (
            <motion.section
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto">
                {SPREAD.map((slot, i) => {
                  const card = cards[i];
                  const flipped = phase === "revealing" || phase === "reading";
                  return (
                    <div key={slot.position} className="text-center space-y-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{slot.position}</p>
                      <motion.div
                        className="relative aspect-[2/3] w-full"
                        style={{ perspective: 1200 }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{ transformStyle: "preserve-3d" }}
                          initial={false}
                          animate={{ rotateY: flipped ? 180 : 0 }}
                          transition={{ duration: 0.8, delay: flipped ? i * 0.35 : 0, ease: "easeInOut" }}
                        >
                          {/* Back */}
                          <div
                            className="absolute inset-0 rounded-lg border border-primary/50 overflow-hidden flex items-center justify-center"
                            style={{
                              backfaceVisibility: "hidden",
                              background: "radial-gradient(circle at 50% 35%, hsl(var(--primary) / 0.35), hsl(var(--card)) 70%)",
                              boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.25), 0 0 20px hsl(var(--primary) / 0.15)",
                            }}
                          >
                            <div className="absolute inset-2 rounded-md border border-primary/20" aria-hidden />
                            <div className="absolute inset-4 rounded-md border border-primary/10" aria-hidden />
                            <motion.div
                              animate={phase === "shuffling" ? { rotate: 360 } : { rotate: 0 }}
                              transition={{ duration: 4, repeat: phase === "shuffling" ? Infinity : 0, ease: "linear" }}
                              className="relative"
                            >
                              <Sparkles className="h-8 w-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" aria-hidden />
                            </motion.div>
                          </div>
                          {/* Front */}
                          <div
                            className="absolute inset-0 rounded-lg border border-primary/60 bg-card p-3 flex flex-col items-center justify-center text-center"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                          >
                            {card && (
                              <>
                                <p
                                  className="text-sm sm:text-base font-semibold leading-tight"
                                  style={{ transform: card.reversed ? "rotate(180deg)" : undefined }}
                                >
                                  {card.name}
                                </p>
                                {card.reversed && (
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">reversed</p>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                      <p className="text-xs text-muted-foreground italic">{slot.role}</p>
                    </div>
                  );
                })}
              </div>

              {phase === "reading" && !reading && (
                <div className="text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> The Oracle is reading the spread…
                </div>
              )}

              {reading && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <Card className="border-primary/40 bg-card/70 backdrop-blur">
                    <CardContent className="p-6 space-y-4">
                      <h2 className="text-2xl font-semibold">The Reading</h2>
                      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {reading.interpretation}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={resetReading} variant="outline">
                          <RotateCw className="mr-2 h-4 w-4" /> Another question
                        </Button>
                        <Button asChild>
                          <Link to="/dreams">Bring a dream to Aetherion</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {reading.echo && <EchoFromAnotherSeeker echo={reading.echo} />}
                  {reading.divination && <VerifyThisTarot divination={reading.divination} />}
                  {!userId && reading.divination && (
                    <PostReadingSignupCard nonce={reading.divination.nonce} />
                  )}
                  {userId && <ReferralCard />}
                  {userId && reading.divination && (
                    <SealRaidShare nonce={reading.divination.nonce} />
                  )}
                  {reading.divination && <PostReadingTwinCta />}
                  {userId && (
                    <PaywallCTA
                      variant="card"
                      source="tarot_post_cast"
                      headline="Cast unlimited tarot with Oracle Pro"
                      subline="Lift the daily limit, get Pro Vision card art, and seal every reading on BRC-20."
                    />
                  )}
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Post-reading founder-price paywall for signed-in seekers */}
      <PostReadingFounderModal
        triggered={!!reading && !!userId}
        nonce={reading?.divination?.nonce ?? null}
      />

      <SiteFooter />
    </div>
  );
};

const PostReadingSignupCard = ({ nonce }: { nonce: string }) => {
  useEffect(() => { void trackEvent("post_reading_signup_shown", { nonce }); }, [nonce]);
  const shortNonce = nonce.slice(0, 8);
  return (
    <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-violet-500/5 to-card/80 backdrop-blur">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
          <h3 className="text-lg font-semibold">Your artifact is sealed</h3>
          <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/40 text-[10px] uppercase tracking-widest">nonce {shortNonce}…</Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This reading exists. The seal is cryptographic — but the receipt belongs to whoever claims it.
          Sign up free to <span className="text-foreground">claim it on-chain forever</span>, mint your ATART artifact,
          and unlock <span className="text-foreground">15 free invocations</span> + AETX airdrop eligibility.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400">
            <Link
              to={`/auth?redirect=${encodeURIComponent(`/tarot?claim=${nonce}`)}`}
              onClick={() => void trackEvent("post_reading_signup_clicked", { nonce })}
            >
              Claim my artifact <Sparkles className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-border/60">
            <Link to="/verify">Verify a receipt</Link>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          No card required · founder price ($5.99/mo) unlocks after your first reading.
        </p>
      </CardContent>
    </Card>
  );
};



type VerifyState =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "ok"; verifiedAt: string; tartAwarded?: boolean; tartBalance?: number }
  | { kind: "replay"; verifiedAt?: string }
  | { kind: "err"; reason: string };

const VerifyThisTarot = ({ divination }: { divination: Divination }) => {
  const [state, setState] = useState<VerifyState>({ kind: "idle" });
  const [copied, setCopied] = useState<"nonce" | "hash" | null>(null);

  const copy = async (kind: "nonce" | "hash", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const verify = async () => {
    setState({ kind: "verifying" });
    const { data, error } = await supabase.rpc("verify_divination_receipt", {
      _nonce: divination.nonce,
      _commitment_hash: divination.hash,
    });
    if (error) {
      setState({ kind: "err", reason: error.message });
      return;
    }
    const res = data as {
      ok: boolean;
      reason?: string;
      verified_at?: string;
      tart_awarded?: boolean;
      tart_balance?: number;
    };
    if (res?.ok) {
      setState({
        kind: "ok",
        verifiedAt: res.verified_at ?? new Date().toISOString(),
        tartAwarded: res.tart_awarded,
        tartBalance: res.tart_balance,
      });
      if (res.tart_awarded) {
        toast.success(`Sealed — +1 ATART minted (balance: ${res.tart_balance ?? 1})`);
      } else {
        toast.success("Receipt sealed — replay protection engaged");
      }
    } else if (res?.reason === "ALREADY_VERIFIED") {
      setState({ kind: "replay", verifiedAt: res.verified_at });
      toast("This receipt was already claimed — replay refused");
    } else {
      setState({ kind: "err", reason: res?.reason ?? "UNKNOWN" });
    }
  };

  const statusBadge = (() => {
    switch (state.kind) {
      case "ok":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
            <ShieldCheck className="h-3 w-3 mr-1" /> Sealed · single-use spent
          </Badge>
        );
      case "replay":
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-300">
            <ShieldAlert className="h-3 w-3 mr-1" /> Replay refused
          </Badge>
        );
      case "err":
        return (
          <Badge variant="outline" className="border-destructive/60 text-destructive">
            <ShieldAlert className="h-3 w-3 mr-1" /> {state.reason}
          </Badge>
        );
      case "verifying":
        return (
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Verifying…
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-primary/40 text-primary">
            Unclaimed · one-shot
          </Badge>
        );
    }
  })();

  return (
    <Card className="border-violet-500/40 bg-card/60 backdrop-blur">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verify this Tarot
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              The Caduceus engine bound this reading to a nonce and a commitment hash. The
              server will honour the receipt exactly once — any replay attempt is refused.
            </p>
          </div>
          {statusBadge}
        </div>

        <div className="grid gap-2 text-[11px] font-mono">
          <ReceiptRow label="wallet" value={divination.wallet ?? "anonymous seeker"} />
          <ReceiptRow
            label="nonce"
            value={divination.nonce}
            copyable
            copied={copied === "nonce"}
            onCopy={() => copy("nonce", divination.nonce)}
          />
          <ReceiptRow
            label="commit"
            value={divination.hash}
            copyable
            copied={copied === "hash"}
            onCopy={() => copy("hash", divination.hash)}
          />
          <ReceiptRow label="bound" value={new Date(divination.boundAt).toLocaleString()} />
          {state.kind === "ok" && (
            <>
              <ReceiptRow label="sealed" value={new Date(state.verifiedAt).toLocaleString()} />
              {state.tartAwarded && (
                <>
                  <ReceiptRow
                    label="ATART"
                    value={`+1 minted · balance ${state.tartBalance ?? 1}`}
                  />
                  <div className="pt-1">
                    <Link to="/claim/tart" className="text-[11px] text-primary underline">
                      Claim ATART on Bitcoin →
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
          {state.kind === "replay" && state.verifiedAt && (
            <ReceiptRow label="prev-seal" value={new Date(state.verifiedAt).toLocaleString()} />
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={verify}
            disabled={state.kind === "verifying" || state.kind === "ok"}
            size="sm"
          >
            {state.kind === "ok" ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Sealed
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" /> Verify now
              </>
            )}
          </Button>
          {divination.verifyUrl && (
            <Button asChild variant="outline" size="sm">
              <Link to={divination.verifyUrl}>Open shareable receipt</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ReceiptRow = ({
  label,
  value,
  copyable,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
}) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <span className="w-16 uppercase tracking-widest text-[9px] text-primary/70 shrink-0">{label}</span>
    <span className="flex-1 truncate text-foreground/80">{value}</span>
    {copyable && (
      <button
        type="button"
        onClick={onCopy}
        className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    )}
  </div>
);

const PHASE_COLOR: Record<string, string> = {
  HARMONY: "bg-emerald-500",
  RESONANCE: "bg-sky-400",
  TENSION: "bg-amber-500",
  CATASTROPHE: "bg-rose-500",
  UNKNOWN: "bg-muted-foreground",
};

const PhaseOfTheHour = () => {
  const [rows, setRows] = useState<Array<{ phase: string; cnt: number; total: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.rpc("phase_of_the_hour");
      if (!cancelled && Array.isArray(data)) {
        setRows(data as Array<{ phase: string; cnt: number; total: number }>);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const total = rows?.[0]?.total ?? 0;
  if (!rows || total === 0) {
    return (
      <div className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60">
        ✦ the deck is quiet · be the first cast of the hour ✦
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        <span>Phase of the hour</span>
        <span>{total} seeker{total === 1 ? "" : "s"} · live</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-card/60 border border-border/40">
        {rows.map((r) => {
          const pct = (r.cnt / r.total) * 100;
          return (
            <div
              key={r.phase}
              className={`${PHASE_COLOR[r.phase] ?? PHASE_COLOR.UNKNOWN} relative`}
              style={{ width: `${pct}%` }}
              title={`${r.phase} · ${r.cnt}`}
            >
              <motion.div
                className="absolute inset-0 bg-white/30"
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
        {rows.map((r) => (
          <span key={r.phase} className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${PHASE_COLOR[r.phase] ?? PHASE_COLOR.UNKNOWN}`} />
            {r.phase.toLowerCase()}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

const EchoFromAnotherSeeker = ({ echo }: { echo: EchoReading }) => {
  const when = new Date(echo.issued_at);
  const ageMs = Date.now() - when.getTime();
  const ageStr = ageMs < 3600_000
    ? `${Math.max(1, Math.round(ageMs / 60_000))} minutes ago`
    : ageMs < 86_400_000
    ? `${Math.round(ageMs / 3600_000)} hours ago`
    : `${Math.round(ageMs / 86_400_000)} days ago`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-card/70 to-card/70 backdrop-blur relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, hsl(var(--primary) / 0.3), transparent 60%)" }}
          aria-hidden
        />
        <CardContent className="p-6 space-y-3 relative">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-300" />
              <h3 className="text-base font-semibold tracking-wide">Echo from another seeker</h3>
            </div>
            <Badge variant="outline" className="border-violet-500/40 text-violet-200 text-[10px] uppercase tracking-widest">
              {echo.phase.toLowerCase()} · {ageStr}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            {echo.shared.length > 1
              ? `Another soul drew ${echo.shared.join(" and ")} under the same Aetherion phase.`
              : `Another soul drew ${echo.shared[0] ?? "the same card"} under the same Aetherion phase.`}
            {" "}You are not casting alone.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {echo.cards.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className={`text-[11px] px-2.5 py-1 rounded border ${
                  echo.shared.includes(c.name)
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                    : "border-border/50 bg-card/40 text-muted-foreground"
                }`}
              >
                {c.name}{c.reversed ? " ⤓" : ""}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Tarot;

