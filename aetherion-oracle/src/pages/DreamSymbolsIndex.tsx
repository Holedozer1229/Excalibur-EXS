// /dreams/symbols — index of the dream-symbol library.
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Moon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import { DREAM_SYMBOLS } from "@/data/dreamSymbols";

const SITE = "https://www.excaliburcrypto.com";
const URL = `${SITE}/dreams/symbols`;

const DreamSymbolsIndex = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Dream Symbol Library",
    description: "AI dream interpreter symbol library — meanings for snakes, falling, teeth, water, flying, death, and more.",
    url: URL,
    hasPart: DREAM_SYMBOLS.map((s) => ({
      "@type": "Article",
      headline: s.title,
      url: `${SITE}/dreams/symbols/${s.slug}`,
    })),
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>Dream Symbol Library — AI Dream Interpreter | Aetherion Oracle</title>
        <meta
          name="description"
          content="A growing library of dream symbol meanings — snake, falling, teeth, water, flying, death and more. Interpret any dream with Aetherion's Caduceus engine."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Dream Symbol Library — AI Dream Interpreter" />
        <meta property="og:description" content="Meanings for the most common dream symbols, with a personal AI interpretation from Aetherion." />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <GalacticBackground harmony={0.5} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dreams" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Dreams
          </Link>
          <span>/</span>
          <span className="text-foreground">Symbols</span>
        </nav>

        <header className="space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary">Dream symbol library</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What does your <span className="text-primary">dream symbol</span> mean?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Twenty of the most common dream symbols — what each one means across traditions, and how to bring your own dream to Aetherion's Caduceus engine for a personal reading.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <Link to="/dreams">Open the Dream Oracle <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/ai-dream-interpreter">How the AI dream interpreter works</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/tarot">Cinematic Tarot Reading</Link>
            </Button>
          </div>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DREAM_SYMBOLS.map((s) => (
            <Link key={s.slug} to={`/dreams/symbols/${s.slug}`} className="group">
              <Card className="h-full border-border/60 bg-card/40 backdrop-blur hover:border-primary/60 transition-colors">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.archetype.split("•")[0].trim()}</span>
                  </div>
                  <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {s.symbol}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3">{s.shortMeaning}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default DreamSymbolsIndex;
