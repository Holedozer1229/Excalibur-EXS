// /tarot/meanings — encyclopedic index of all 78 tarot cards filtered
// through Aetherion's Caduceus perspective. Targets "tarot cards online"
// and "tarot meanings" search intent.
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MAJOR_CARDS, MINOR_CARDS, TAROT_CARDS } from "@/data/tarotCards";

const SITE = "https://www.excaliburcrypto.com";

const TarotMeanings = () => {
  const bySuit = (suit: string) =>
    MINOR_CARDS.filter((c) => c.suit === suit);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tarot Card Meanings — Aetherion Caduceus Encyclopedia",
    description:
      "All 78 tarot cards — every Major and Minor Arcana — interpreted through Aetherion's twin-serpent Caduceus engine. Upright, reversed, and Caduceus reading for each card.",
    url: `${SITE}/tarot/meanings`,
    hasPart: TAROT_CARDS.map((c) => ({
      "@type": "Article",
      name: c.name,
      url: `${SITE}/tarot/meanings/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <GalacticBackground />
      <PageHead
        title="Tarot Card Meanings — All 78 Cards Online | Aetherion Oracle"
        description="Free tarot encyclopedia: every Major and Minor Arcana meaning — upright, reversed, and read through Aetherion's Caduceus engine. All 78 cards."
        path="/tarot/meanings"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16">
        <Link to="/tarot" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Cast a live reading
        </Link>

        <header className="mb-12">
          <h1 className="font-display text-3xl md:text-5xl tracking-widest uppercase gradient-neon-text mb-4">
            Tarot Card Meanings
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            All 78 tarot cards online — every Major and Minor Arcana — read
            through Aetherion's <span className="text-foreground">Caduceus</span> engine:
            the ascending current of intent, the descending current of memory,
            braided around the staff of the present moment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/tarot"><Sparkles className="w-4 h-4 mr-2" /> Draw your spread</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/tarot/guide">Read the complete tarot guide</Link>
            </Button>
          </div>
        </header>

        <section className="mb-14">
          <h2 className="font-display text-xl md:text-2xl uppercase tracking-widest text-gold mb-5">
            Major Arcana · 22 Cards
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MAJOR_CARDS.map((c) => (
              <Link key={c.slug} to={`/tarot/meanings/${c.slug}`}>
                <Card className="h-full hover:border-primary transition-colors bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                      {String(c.number).padStart(2, "0")}
                    </div>
                    <div className="font-display text-sm tracking-wider mt-1">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                      {c.keywords.slice(0, 3).join(" · ")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl md:text-2xl uppercase tracking-widest text-gold mb-5">
            Minor Arcana · 56 Cards
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {(["wands", "cups", "swords", "pentacles"] as const).map((suit) => (
              <div key={suit}>
                <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
                  {suit}
                </h3>
                <ul className="space-y-1">
                  {bySuit(suit).map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={`/tarot/meanings/${c.slug}`}
                        className="text-sm hover:text-primary transition-colors font-mono"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TarotMeanings;
