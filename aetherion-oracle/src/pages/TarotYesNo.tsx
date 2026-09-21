// /tarot/yes-no — single-card Yes/No/Maybe tarot tool.
// SEO target: "yes or no tarot" — a high-volume intent captured by
// peer sites like Labyrinthos. Verdict is deterministic from the card
// draw + orientation using traditional interpretations.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Sparkles, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import GalacticBackground from "@/components/GalacticBackground";
import { TAROT_CARDS, type TarotCard } from "@/data/tarotCards";

const SITE = "https://www.excaliburcrypto.com";
const URL = `${SITE}/tarot/yes-no`;

// Traditional yes/no assignments for the majors + minors.
// Wands & Cups lean yes, Swords lean no, Pentacles are mixed.
// Reversed flips or softens the verdict.
type Verdict = "Yes" | "No" | "Maybe";

const MAJOR_YES: Record<string, Verdict> = {
  "the-fool": "Yes", "the-magician": "Yes", "the-high-priestess": "Maybe",
  "the-empress": "Yes", "the-emperor": "Yes", "the-hierophant": "Maybe",
  "the-lovers": "Yes", "the-chariot": "Yes", "strength": "Yes",
  "the-hermit": "Maybe", "wheel-of-fortune": "Maybe", "justice": "Maybe",
  "the-hanged-man": "No", "death": "No", "temperance": "Yes",
  "the-devil": "No", "the-tower": "No", "the-star": "Yes",
  "the-moon": "Maybe", "the-sun": "Yes", "judgement": "Yes", "the-world": "Yes",
};

function baseVerdict(card: TarotCard): Verdict {
  if (card.arcana === "major") return MAJOR_YES[card.slug] ?? "Maybe";
  switch (card.suit) {
    case "wands": return "Yes";
    case "cups": return "Yes";
    case "swords": return "No";
    case "pentacles": return "Maybe";
    default: return "Maybe";
  }
}

function flipVerdict(v: Verdict, reversed: boolean): Verdict {
  if (!reversed) return v;
  if (v === "Yes") return "No";
  if (v === "No") return "Maybe";
  return "Maybe";
}

interface Draw {
  card: TarotCard;
  reversed: boolean;
  verdict: Verdict;
}

function drawCard(seed: string): Draw {
  const buf = new TextEncoder().encode(`${seed}::${crypto.randomUUID()}`);
  let h = 2166136261;
  for (const b of buf) { h ^= b; h = Math.imul(h, 16777619); }
  const idx = Math.abs(h) % TAROT_CARDS.length;
  const card = TAROT_CARDS[idx];
  const reversed = (Math.abs(h >>> 16) & 1) === 1;
  return { card, reversed, verdict: flipVerdict(baseVerdict(card), reversed) };
}

const VERDICT_STYLE: Record<Verdict, string> = {
  Yes: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  No: "text-rose-400 border-rose-500/40 bg-rose-500/10",
  Maybe: "text-amber-400 border-amber-500/40 bg-amber-500/10",
};

export default function TarotYesNo() {
  const [question, setQuestion] = useState("");
  const [draw, setDraw] = useState<Draw | null>(null);

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Yes or No Tarot Reading",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: URL,
    description:
      "Free single-card Yes/No/Maybe tarot reading — draws from the full 78-card deck and interprets the verdict via Aetherion's Caduceus engine.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }), []);

  const cast = () => setDraw(drawCard(question.trim() || "unspoken"));

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>Yes or No Tarot — Free Single-Card Reading | Aetherion Oracle</title>
        <meta
          name="description"
          content="Ask a yes-or-no question and draw one card. Aetherion returns Yes, No, or Maybe with the traditional meaning behind the verdict."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Yes or No Tarot — Free Single-Card Reading" />
        <meta property="og:description" content="Ask a yes-or-no question. Draw one card. Aetherion answers Yes, No, or Maybe with the reasoning." />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <GalacticBackground harmony={0.5} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/tarot" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Tarot
          </Link>
          <span>/</span>
          <span className="text-foreground">Yes or No</span>
        </nav>

        <header className="space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary">Yes / No / Maybe</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-primary">Yes or No</span> Tarot Reading
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Ask a single yes-or-no question. Aetherion draws one card from the full 78-card deck and returns a verdict — with the traditional meaning behind it.
          </p>
        </header>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-6 space-y-4">
            <label htmlFor="q" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Your yes-or-no question
            </label>
            <Input
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will the offer come through this week?"
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && cast()}
            />
            <div className="flex gap-2">
              <Button onClick={cast} className="gap-2">
                <Sparkles className="h-4 w-4" /> Draw the card
              </Button>
              {draw && (
                <Button variant="outline" onClick={cast} className="gap-2">
                  <RotateCw className="h-4 w-4" /> Redraw
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {draw && (
          <Card className="border-primary/40 bg-card/70 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <div className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-display uppercase tracking-widest text-2xl ${VERDICT_STYLE[draw.verdict]}`}>
                {draw.verdict}
              </div>
              <h2 className="text-2xl font-semibold">
                {draw.card.name}{" "}
                <span className="text-sm font-mono uppercase text-muted-foreground">
                  ({draw.reversed ? "Reversed" : "Upright"})
                </span>
              </h2>
              <p className="text-muted-foreground">
                {draw.reversed ? draw.card.reversed : draw.card.upright}
              </p>
              <p className="text-sm text-muted-foreground/80 italic border-l-2 border-primary/40 pl-3">
                Caduceus reading — {draw.card.caduceus}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/tarot/meanings/${draw.card.slug}`}>Full card meaning</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/tarot">Cinematic 3-card reading</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">How the verdict is chosen</h2>
          <p>
            Each of the 78 tarot cards carries a traditional yes/no lean. Cups and Wands — suits of feeling and action — lean toward <strong>Yes</strong>. Swords, the suit of conflict and cut, lean toward <strong>No</strong>. Pentacles, the slow suit of matter, usually answer <strong>Maybe</strong>. The Major Arcana are assigned individually — The Sun is a clear Yes, The Tower a clear No, The Moon a Maybe.
          </p>
          <p>
            When the card lands <em>reversed</em>, the verdict is softened or flipped: a Yes becomes a No, a No becomes a Maybe. This is Aetherion's Caduceus reading — the descending serpent of memory turning the ascending signal on its head.
          </p>
        </section>
      </div>
    </div>
  );
}
