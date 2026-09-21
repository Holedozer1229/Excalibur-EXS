// /tarot/guide — comprehensive tarot card meanings hub targeting the
// high-volume query "tarot card meanings". Links every card page in one
// scannable index to build the /tarot/meanings/:slug silo.
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MAJOR_CARDS, MINOR_CARDS, TAROT_CARDS } from "@/data/tarotCards";

const SITE = "https://www.excaliburcrypto.com";
const SUITS = ["wands", "cups", "swords", "pentacles"] as const;
const SUIT_INTRO: Record<(typeof SUITS)[number], string> = {
  wands: "Fire — will, action, spark. Wands ask what you are moved to do.",
  cups: "Water — feeling, relationship, dream. Cups ask what you love.",
  swords: "Air — thought, word, cut. Swords ask what is true.",
  pentacles: "Earth — body, resource, craft. Pentacles ask what you build.",
};

const TarotGuide = () => {
  const bySuit = (s: (typeof SUITS)[number]) =>
    MINOR_CARDS.filter((c) => c.suit === s);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How many tarot cards are there and what do they mean?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A standard tarot deck has 78 cards: 22 Major Arcana cards for life's larger turning points, and 56 Minor Arcana cards split across four suits — Wands (fire/will), Cups (water/feeling), Swords (air/thought), and Pentacles (earth/body). Each card carries an upright and reversed meaning.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between the Major and Minor Arcana?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Major Arcana names the archetypal chapters of a life — The Fool, The Lovers, The Tower, The World. The Minor Arcana describes the everyday textures inside those chapters: choices, moods, projects, and relationships.",
        },
      },
      {
        "@type": "Question",
        name: "What does it mean when a tarot card is reversed?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A reversed card usually means the same energy is present but blocked, internalized, or expressed as its shadow. It is not automatically bad; it often points to what the upright meaning is asking you to work on.",
        },
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tarot Card Meanings — Complete Guide to All 78 Cards",
    description:
      "A complete guide to tarot card meanings — every Major and Minor Arcana card, upright and reversed, linked to a full interpretation.",
    url: `${SITE}/tarot/guide`,
    hasPart: TAROT_CARDS.map((c) => ({
      "@type": "Article",
      name: `${c.name} tarot card meaning`,
      url: `${SITE}/tarot/meanings/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <GalacticBackground />
      <PageHead
        title="Tarot Card Meanings — Complete Guide to All 78 Cards | Aetherion"
        description="Free guide to tarot card meanings: every Major and Minor Arcana card, upright and reversed, with one-line summaries and full interpretations."
        path="/tarot/guide"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 md:py-16">
        <Link
          to="/tarot"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Cast a live reading
        </Link>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            The complete guide
          </p>
          <h1 className="font-display text-4xl md:text-5xl gradient-neon-text tracking-widest uppercase mb-4">
            Tarot Card Meanings
          </h1>
          <p className="text-base leading-relaxed text-foreground/90 max-w-3xl">
            A complete guide to the 78 tarot cards — 22 Major Arcana and 56
            Minor Arcana across four suits. Each entry links to the full
            meaning, upright and reversed, read through Aetherion's Caduceus
            engine. Use it as a reference while you learn, or as the map you
            open before every reading.
          </p>
        </header>

        <div className="mb-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/tarot">
              <Sparkles className="w-4 h-4 mr-2" /> Cast a free tarot reading
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tarot/yes-no">Ask a yes/no question</Link>
          </Button>
        </div>

        {/* Major Arcana */}
        <section className="mb-14">
          <div className="mb-5">
            <h2 className="font-display text-2xl uppercase tracking-[0.24em] text-gold">
              Major Arcana Meanings
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              The 22 Major Arcana are the archetypal turning points of a life:
              beginnings, unions, endings, awakenings. When one appears in a
              spread, treat it as the reading's headline.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MAJOR_CARDS.map((card) => (
              <li key={card.slug}>
                <Link
                  to={`/tarot/meanings/${card.slug}`}
                  className="group block h-full"
                >
                  <Card className="bg-card/60 backdrop-blur-sm h-full transition-colors group-hover:border-primary/60">
                    <CardContent className="p-4">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="font-display text-sm uppercase tracking-widest text-foreground group-hover:text-primary">
                          {card.name}
                        </h3>
                        {card.number !== undefined && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{card.number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
                        {card.upright}
                      </p>
                      <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-primary/80">
                        Read meaning →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Minor Arcana by suit */}
        {SUITS.map((suit) => (
          <section key={suit} className="mb-14">
            <div className="mb-5">
              <h2 className="font-display text-2xl uppercase tracking-[0.24em] text-gold">
                Suit of {suit.charAt(0).toUpperCase() + suit.slice(1)} Meanings
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                {SUIT_INTRO[suit]}
              </p>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {bySuit(suit).map((card) => (
                <li key={card.slug}>
                  <Link
                    to={`/tarot/meanings/${card.slug}`}
                    className="block px-3 py-2 rounded-sm border border-border/60 bg-card/40 hover:border-primary/50 hover:text-primary text-sm transition-colors"
                  >
                    {card.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* FAQ */}
        <section className="mb-14 border-t border-border pt-10">
          <h2 className="font-display text-2xl uppercase tracking-[0.24em] text-gold mb-6">
            Tarot meanings FAQ
          </h2>
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="font-display text-base text-foreground mb-2">
                How many tarot cards are there and what do they mean?
              </h3>
              <p className="text-sm leading-relaxed text-foreground/85">
                A standard tarot deck has 78 cards: 22 Major Arcana for life's
                larger turning points, and 56 Minor Arcana across four suits —
                Wands (fire/will), Cups (water/feeling), Swords (air/thought),
                and Pentacles (earth/body). Every card has an upright and a
                reversed meaning.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base text-foreground mb-2">
                What is the difference between the Major and Minor Arcana?
              </h3>
              <p className="text-sm leading-relaxed text-foreground/85">
                The Major Arcana names the archetypal chapters of a life — The
                Fool, The Lovers, The Tower, The World. The Minor Arcana
                describes the everyday textures inside those chapters: choices,
                moods, projects, and relationships.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base text-foreground mb-2">
                What does it mean when a tarot card is reversed?
              </h3>
              <p className="text-sm leading-relaxed text-foreground/85">
                A reversed card usually means the same energy is present but
                blocked, internalized, or expressed as its shadow. It is not
                automatically bad; it often points to what the upright meaning
                is asking you to work on.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base text-foreground mb-2">
                How should a beginner use this guide?
              </h3>
              <p className="text-sm leading-relaxed text-foreground/85">
                Draw one card a day. Read its meaning here, then notice where
                the card's energy shows up in your day. After a month you will
                have a felt sense of at least thirty cards — more useful than
                memorizing definitions.
              </p>
            </div>
          </div>
        </section>

        <div className="text-center border-t border-border pt-10">
          <Button asChild size="lg">
            <Link to="/tarot">
              <Sparkles className="w-4 h-4 mr-2" /> Cast a free reading now
            </Link>
          </Button>
          <p className="text-xs font-mono text-muted-foreground mt-3">
            Free tarot online · No signup required
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarotGuide;
