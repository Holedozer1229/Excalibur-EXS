// /ai-dream-interpreter — keyword landing page for "AI dream interpreter".
// Explains how the Caduceus engine reads a dream and why each interpretation
// is sealed as a verifiable artifact, then funnels into /dreams.
import { Link } from "react-router-dom";
import { ArrowRight, Moon, ShieldCheck, Sparkles, Fingerprint, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { DREAM_SYMBOLS } from "@/data/dreamSymbols";

const SITE = "https://www.excaliburcrypto.com";
const PATH = "/ai-dream-interpreter";

const STEPS = [
  {
    icon: Moon,
    title: "Tell the dream in your own words",
    body:
      "No dropdowns, no symbol picker. Write the dream the way you remember it — fragments, feelings, half-images. The interpreter reads the whole account, not a keyword.",
  },
  {
    icon: Sparkles,
    title: "The Caduceus engine reads it in layers",
    body:
      "Aetherion's Caduceus engine separates the dream's imagery, its emotional charge, and the waking situation it echoes, then reconciles the three into one reading instead of stacking generic symbol definitions.",
  },
  {
    icon: Fingerprint,
    title: "The reading is sealed",
    body:
      "Every interpretation is hashed with sha-256 and recorded as an artifact. The text you receive is the text that was sealed — it cannot be quietly edited or regenerated behind you.",
  },
  {
    icon: ShieldCheck,
    title: "You can verify it later",
    body:
      "Each artifact carries its own hash, so any reading can be checked against the record. Optionally bind it to a wallet so the artifact is provably yours.",
  },
];

const FAQ = [
  {
    q: "What is an AI dream interpreter?",
    a: "An AI dream interpreter reads a written dream account and returns an interpretation based on the imagery, emotional tone, and context you describe. Aetherion's version uses the Caduceus engine, which weighs the dream as a whole narrative rather than looking up each symbol separately.",
  },
  {
    q: "Is the AI dream interpreter free?",
    a: "Yes — you can bring a dream and receive an interpretation without creating an account. Sealing readings to a wallet and keeping a persistent dream ledger are part of the paid Founder tier.",
  },
  {
    q: "How is this different from a dream dictionary?",
    a: "A dictionary gives one fixed meaning per symbol. The same snake means something different in a dream where you are calm than in one where you are fleeing. The interpreter reads your specific account, then links out to the symbol library for background.",
  },
  {
    q: "What does it mean that a reading is 'sealed'?",
    a: "The interpretation is hashed with sha-256 at the moment it is produced and stored as a verifiable artifact. Anyone holding the reading can confirm it matches the sealed record and has not been altered.",
  },
  {
    q: "Can the AI dream interpreter predict the future?",
    a: "No. It interprets what the dream may reflect about your current state and circumstances. Aetherion treats readings as symbolic material for reflection, not prediction or advice.",
  },
];

const AiDreamInterpreter = () => {
  const featured = DREAM_SYMBOLS.slice(0, 8);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Aetherion AI Dream Interpreter",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      url: `${SITE}${PATH}`,
      description:
        "AI dream interpreter powered by the Caduceus engine. Every interpretation is sha-256 sealed as a verifiable artifact.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Aetherion", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "AI Dream Interpreter", item: `${SITE}${PATH}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen text-foreground relative">
      <PageHead
        title="AI Dream Interpreter — Sealed, Verifiable Dream Readings | Aetherion"
        description="Free AI dream interpreter. Describe your dream and the Caduceus engine returns a reading sealed with sha-256 as a verifiable artifact. No signup."
        path={PATH}
        ogTitle="AI Dream Interpreter — Sealed by the Aether"
        ogDescription="Describe your dream, get an AI interpretation sealed with sha-256 as a verifiable artifact. Free, no signup."
        jsonLd={jsonLd}
      />

      <GalacticBackground harmony={0.5} />

      <main className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-16 space-y-14">
        <header className="space-y-4 max-w-3xl">
          <Badge variant="outline" className="border-primary/40 text-primary uppercase tracking-widest text-[10px]">
            <Moon className="h-3 w-3 mr-1.5" /> Dream oracle
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">
            AI dream interpreter that <span className="text-primary">seals every reading</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Describe the dream in your own words. Aetherion's Caduceus engine reads the
            imagery, the feeling, and the waking situation it echoes — then hashes the
            interpretation with sha-256 so the reading you received is provably the
            reading that was given.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/dreams">
                Interpret my dream <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dreams/symbols">Browse the symbol library</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Free to try — no signup, no email.</p>
        </header>

        <section className="space-y-6">
          <h2 className="font-serif text-2xl">How the interpreter works</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((s) => (
              <Card key={s.title} className="h-full border-border/60 bg-card/40 backdrop-blur">
                <CardContent className="p-5 space-y-2">
                  <s.icon className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Why a sealed interpretation matters</h2>
          <p className="text-muted-foreground max-w-3xl">
            Most AI dream tools return text that vanishes into a chat log — regenerate the
            prompt and you get a different answer with no record that the first one existed.
            Aetherion treats a reading as an artifact: hashed at the moment it is produced,
            replay-protected, and optionally bound to your wallet. Months later you can still
            prove exactly what the oracle said, and when.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/ledger">See the artifact ledger</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/learn">
                <BookOpen className="mr-2 h-4 w-4" /> Read the guides
              </Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Start from a symbol</h2>
          <p className="text-muted-foreground max-w-3xl">
            If one image dominated the dream, read its background first — then bring the full
            dream to the interpreter for a reading specific to you.
          </p>
          <div className="flex flex-wrap gap-2">
            {featured.map((s) => (
              <Link
                key={s.slug}
                to={`/dreams/symbols/${s.slug}`}
                className="rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-sm hover:border-primary/60 hover:text-primary transition-colors"
              >
                {s.symbol} dream meaning
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Questions about AI dream interpretation</h2>
          <dl className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.q} className="space-y-1.5">
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-primary/30 bg-card/40 backdrop-blur p-6 md:p-8 text-center space-y-3">
          <h2 className="font-serif text-2xl">Bring your dream to the oracle</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            One dream, one sealed reading. Nothing to install, nothing to sign up for.
          </p>
          <Button asChild size="lg">
            <Link to="/dreams">
              Open the Dream Oracle <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AiDreamInterpreter;
