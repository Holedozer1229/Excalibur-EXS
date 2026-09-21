// /tarot/meanings/:slug — individual tarot card page. Titles/descriptions
// tuned to real search demand: pattern "<Card Name> Tarot Card Meaning" is
// the dominant query (Semrush: The Fool 9.9K/mo, The Moon 8.1K/mo, etc.).
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, ArrowRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTarotCard, TAROT_CARDS, MAJOR_CARDS } from "@/data/tarotCards";
import { getTarotLongform } from "@/data/tarotLongform";
import NotFound from "./NotFound";

const SITE = "https://www.excaliburcrypto.com";

// Hand-tuned meta descriptions for the highest-potential cards (Semrush volume
// + low KDI). Each is 140–158 chars and leads with the exact-match phrase.
const META_OVERRIDES: Record<string, string> = {
  "the-fool": "The Fool tarot card meaning explained: upright signals a leap into new beginnings; reversed warns of recklessness. Free reading, no signup.",
  "the-magician": "The Magician tarot card meaning: upright is focused will and manifestation; reversed shows manipulation or scattered intent. Free reading online.",
  "the-high-priestess": "The High Priestess tarot card meaning: upright is intuition, mystery, and inner knowing; reversed is disconnection from your inner voice.",
  "the-empress": "The Empress tarot card meaning: upright is abundance, nurture, and creative fertility; reversed is creative block or over-giving. Free reading.",
  "the-emperor": "The Emperor tarot card meaning: upright is structure, authority, and clear boundaries; reversed is control, rigidity, or misused power.",
  "the-hierophant": "The Hierophant tarot card meaning: upright is tradition, teaching, and shared belief; reversed is breaking with dogma or a broken vow.",
  "the-lovers": "The Lovers tarot card meaning: upright is union, alignment, and values-based choice; reversed is misalignment or a choice avoided.",
  "the-chariot": "The Chariot tarot card meaning: upright is willpower, momentum, and victory through focus; reversed is loss of direction or scattered drive.",
  "strength": "Strength tarot card meaning: upright is quiet courage and self-mastery; reversed is self-doubt or force where softness is needed. Free reading.",
  "the-hermit": "The Hermit tarot card meaning: upright is solitude, introspection, and inner guidance; reversed is isolation or refusing counsel.",
  "wheel-of-fortune": "Wheel of Fortune tarot card meaning: upright is cycles turning in your favor; reversed is resistance to change or a downturn.",
  "justice": "Justice tarot card meaning: upright is truth, accountability, and fair outcomes; reversed is bias, avoidance, or unresolved consequence.",
  "the-hanged-man": "The Hanged Man tarot card meaning: upright is surrender and shifted perspective; reversed is stagnation or wasted sacrifice.",
  "death": "Death tarot card meaning: upright is transformation and necessary endings — not literal death; reversed is resisting change you need.",
  "temperance": "Temperance tarot card meaning: upright is alchemy, moderation, and synthesis; reversed is imbalance, extremes, or friction between opposites.",
  "the-devil": "The Devil tarot card meaning: upright is attachment, shadow, and unspoken contracts; reversed is cutting a chain or reclaiming power.",
  "the-tower": "The Tower tarot card meaning: upright is sudden disruption and revealed truth; reversed is a delayed collapse or averted crisis.",
  "the-star": "The Star tarot card meaning: upright is hope, renewal, and calm after upheaval; reversed is disillusion or lost faith.",
  "the-moon": "The Moon tarot card meaning: upright is illusion, dream, and hidden tides; reversed is truth surfacing or fear releasing. Free reading online.",
  "the-sun": "The Sun tarot card meaning: upright is clarity, joy, and vitality; reversed is temporary dimming or overconfidence. Free reading online.",
  "judgement": "Judgement tarot card meaning: upright is awakening, calling, and rebirth; reversed is self-judgement or ignoring a clear summons.",
  "the-world": "The World tarot card meaning: upright is completion, wholeness, and return; reversed is loose ends or a cycle not yet closed.",
};

// Contextual internal links from each card to the strongest-matching oracle
// reading, dream symbol, or landing page. Deepens crawl paths and helps users
// jump from an archetype to a live reading tool. Defaults cover cards not
// listed explicitly.
type CtxLink = { label: string; href: string };
const DEFAULT_CTX: CtxLink[] = [
  { label: "AI Oracle Reading — sealed, verifiable", href: "/oracle/ai-oracle-reading" },
  { label: "Blockchain Tarot — cast a spread on-chain", href: "/oracle/blockchain-tarot" },
  { label: "Comprehensive tarot guide (78 cards)", href: "/tarot/guide" },
];
const CTX_LINKS: Record<string, CtxLink[]> = {
  "the-fool": [
    { label: "AI Oracle Reading — begin a new cycle", href: "/oracle/ai-oracle-reading" },
    { label: "Yes / No tarot for a first step", href: "/tarot/yes-no" },
    { label: "The Magician meaning — tools for the leap", href: "/tarot/meanings/the-magician" },
  ],
  "the-magician": [
    { label: "Crypto Divination — wallet-bound manifestation", href: "/oracle/crypto-divination" },
    { label: "AI Oracle Reading — name what you want", href: "/oracle/ai-oracle-reading" },
    { label: "The Fool meaning — the moment before the craft", href: "/tarot/meanings/the-fool" },
  ],
  "the-high-priestess": [
    { label: "Dream symbol dictionary", href: "/dreams/symbols" },
    { label: "The Moon meaning — hidden tides", href: "/tarot/meanings/the-moon" },
    { label: "AI Oracle Reading — silent inner signal", href: "/oracle/ai-oracle-reading" },
  ],
  "the-moon": [
    { label: "Dream symbols index — decode what surfaced", href: "/dreams/symbols" },
    { label: "Water dreams — moon-tide symbolism", href: "/dreams/symbols/water" },
    { label: "The High Priestess meaning — intuition anchor", href: "/tarot/meanings/the-high-priestess" },
  ],
  "the-sun": [
    { label: "AI Oracle Reading — clarify the joy signal", href: "/oracle/ai-oracle-reading" },
    { label: "The Star meaning — hope after upheaval", href: "/tarot/meanings/the-star" },
    { label: "Yes / No tarot — quick confirmation", href: "/tarot/yes-no" },
  ],
  "the-hermit": [
    { label: "BRC-20 Oracle — self-custody & solo signal", href: "/oracle/brc20-oracle" },
    { label: "Dream symbols — walk the inner path", href: "/dreams/symbols" },
    { label: "The High Priestess meaning — inner knowing", href: "/tarot/meanings/the-high-priestess" },
  ],
  "strength": [
    { label: "AI Oracle Reading — soft-power counsel", href: "/oracle/ai-oracle-reading" },
    { label: "The Chariot meaning — momentum through focus", href: "/tarot/meanings/the-chariot" },
    { label: "The Sun meaning — vitality on the far side", href: "/tarot/meanings/the-sun" },
  ],
  "the-tower": [
    { label: "BRC-20 Oracle — Bitcoin-anchored truth", href: "/oracle/brc20-oracle" },
    { label: "AETX Tokenomics — the seal after collapse", href: "/tokenomics" },
    { label: "Death meaning — necessary endings", href: "/tarot/meanings/death" },
  ],
  "death": [
    { label: "AETX Tokenomics — endings that mint receipts", href: "/tokenomics" },
    { label: "The Tower meaning — the shock before change", href: "/tarot/meanings/the-tower" },
    { label: "The World meaning — closing the cycle", href: "/tarot/meanings/the-world" },
  ],
  "the-world": [
    { label: "BRC-20 Oracle — cycles closed across chains", href: "/oracle/brc20-oracle" },
    { label: "AETX Tokenomics — completion & receipts", href: "/tokenomics" },
    { label: "The Fool meaning — the next beginning", href: "/tarot/meanings/the-fool" },
  ],
  "wheel-of-fortune": [
    { label: "Crypto Divination — cycles on-chain", href: "/oracle/crypto-divination" },
    { label: "AI Oracle Reading — read the turning", href: "/oracle/ai-oracle-reading" },
    { label: "The World meaning — the cycle completes", href: "/tarot/meanings/the-world" },
  ],
  "judgement": [
    { label: "Verify a past reading", href: "/verify" },
    { label: "AI Oracle Reading — hear the calling", href: "/oracle/ai-oracle-reading" },
    { label: "The World meaning — the rebirth arrives", href: "/tarot/meanings/the-world" },
  ],
};
const getCtxLinks = (slug: string): CtxLink[] => CTX_LINKS[slug] ?? DEFAULT_CTX;


const TarotCardMeaning = () => {
  const { slug = "" } = useParams();
  const card = getTarotCard(slug);
  if (!card) return <NotFound />;

  const idx = TAROT_CARDS.findIndex((c) => c.slug === slug);
  const prev = TAROT_CARDS[(idx - 1 + TAROT_CARDS.length) % TAROT_CARDS.length];
  const next = TAROT_CARDS[(idx + 1) % TAROT_CARDS.length];

  // Related cards: 4 same-arcana siblings (excluding prev/next to add variety).
  const siblings = (card.arcana === "major"
    ? MAJOR_CARDS
    : TAROT_CARDS.filter((c) => c.arcana === "minor" && c.suit === card.suit)
  ).filter((c) => c.slug !== card.slug && c.slug !== prev.slug && c.slug !== next.slug);
  const related = siblings.slice(0, 4);

  // Title matches the exact query pattern users search on Google.
  const title = `${card.name} Tarot Card Meaning — Upright & Reversed | Aetherion`;
  const desc =
    META_OVERRIDES[card.slug] ??
    `${card.name} tarot card meaning: upright is ${card.keywords.slice(0, 2).join(" and ")}; reversed reveals the shadow side. Free reading online.`;

  const url = `${SITE}/tarot/meanings/${card.slug}`;
  const longform = getTarotLongform(card.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${card.name} Tarot Card Meaning`,
    description: desc,
    mainEntityOfPage: url,
    about: `${card.name} tarot card`,
    keywords: [`${card.name} tarot card meaning`, `${card.name} meaning`, `${card.name} reversed`, "tarot meaning", ...card.keywords].join(", "),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What does the ${card.name} tarot card mean?`,
        acceptedAnswer: { "@type": "Answer", text: card.upright },
      },
      {
        "@type": "Question",
        name: `What does the ${card.name} mean reversed?`,
        acceptedAnswer: { "@type": "Answer", text: card.reversed },
      },
    ],
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <GalacticBackground />
      <PageHead title={title} description={desc} path={`/tarot/meanings/${card.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-16">
        <Link to="/tarot/meanings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> All 78 tarot card meanings
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
              {card.arcana === "major" ? "Major Arcana" : `Minor · ${card.suit}`}
            </Badge>
            {card.number !== undefined && (
              <span className="font-mono text-xs text-muted-foreground">
                #{String(card.number)}
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl gradient-neon-text tracking-widest uppercase">
            {card.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            {card.name} tarot card meaning — upright, reversed, and read through
            Aetherion's Caduceus engine.
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-2 tracking-wider">
            {card.keywords.join(" · ")}
          </p>
        </header>

        <section className="space-y-6">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardContent className="p-5">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                {card.name} Upright Meaning
              </h2>
              <p className="text-sm leading-relaxed text-foreground/90">{card.upright}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardContent className="p-5">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                {card.name} Reversed Meaning
              </h2>
              <p className="text-sm leading-relaxed text-foreground/90">{card.reversed}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/40 bg-primary/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <h2 className="font-display text-sm uppercase tracking-widest text-primary mb-2">
                Caduceus Reading for {card.name}
              </h2>
              <p className="text-sm leading-relaxed">{card.caduceus}</p>
            </CardContent>
          </Card>
        </section>

        {longform && (
          <article className="prose prose-invert prose-sm md:prose-base max-w-none mt-10 space-y-8">
            <p className="text-base leading-relaxed text-foreground/90">{longform.intro}</p>

            <section>
              <h2 className="font-display text-lg md:text-xl uppercase tracking-widest text-gold mb-3">
                {longform.upright.heading}
              </h2>
              {longform.upright.paragraphs.map((p, i) => (
                <p key={i} className="text-sm md:text-base leading-relaxed text-foreground/90 mb-3">{p}</p>
              ))}
            </section>

            <section>
              <h2 className="font-display text-lg md:text-xl uppercase tracking-widest text-gold mb-3">
                {longform.reversed.heading}
              </h2>
              {longform.reversed.paragraphs.map((p, i) => (
                <p key={i} className="text-sm md:text-base leading-relaxed text-foreground/90 mb-3">{p}</p>
              ))}
            </section>

            <section>
              <h2 className="font-display text-lg md:text-xl uppercase tracking-widest text-primary mb-3">
                {longform.context.heading}
              </h2>
              {longform.context.paragraphs.map((p, i) => (
                <p key={i} className="text-sm md:text-base leading-relaxed text-foreground/90 mb-3">{p}</p>
              ))}
            </section>
          </article>
        )}

        <div className="my-10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <Button asChild size="lg">
            <Link to={`/tarot?card=${card.slug}`}>
              <Sparkles className="w-4 h-4 mr-2" /> Draw a free {card.name} tarot reading
            </Link>
          </Button>
          <div className="text-xs font-mono text-muted-foreground">
            Free tarot online · No signup required
          </div>
        </div>

        <section className="pt-6 border-t border-border">
          <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Related oracle readings for {card.name}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Turn this archetype into a live, sealed reading — each link is a
            free tool tuned to the {card.keywords[0]} current of {card.name}.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {getCtxLinks(card.slug).map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {related.length > 0 && (
          <section className="pt-6 border-t border-border">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">
              Related {card.arcana === "major" ? "Major Arcana" : `${card.suit}`} meanings
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/tarot/meanings/${r.slug}`}
                    className="block text-sm hover:text-primary transition-colors"
                  >
                    {r.name} <span className="text-muted-foreground">meaning</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="grid grid-cols-2 gap-3 pt-6 mt-6 border-t border-border">
          <Link to={`/tarot/meanings/${prev.slug}`} className="group">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Previous</div>
            <div className="font-display text-sm group-hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> {prev.name}
            </div>
          </Link>
          <Link to={`/tarot/meanings/${next.slug}`} className="group text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Next</div>
            <div className="font-display text-sm group-hover:text-primary transition-colors flex items-center justify-end gap-1">
              {next.name} <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default TarotCardMeaning;
