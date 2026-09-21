// /dreams/symbols/:slug — per-symbol SEO landing page funneling into /dreams.
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Moon, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import { getDreamSymbol, DREAM_SYMBOLS } from "@/data/dreamSymbols";

const SITE = "https://www.excaliburcrypto.com";

const DreamSymbol = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const symbol = getDreamSymbol(slug);

  if (!symbol) return <Navigate to="/dreams/symbols" replace />;

  const url = `${SITE}/dreams/symbols/${symbol.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: symbol.title,
    description: symbol.description,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Aetherion Oracle" },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: symbol.questions.map((q) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${symbol.shortMeaning} Ask Aetherion for a personal interpretation at ${SITE}/dreams.`,
      },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Dreams", item: `${SITE}/dreams` },
      { "@type": "ListItem", position: 2, name: "Symbols", item: `${SITE}/dreams/symbols` },
      { "@type": "ListItem", position: 3, name: symbol.symbol, item: url },
    ],
  };

  const related = symbol.related
    .map((s) => DREAM_SYMBOLS.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>{symbol.title}</title>
        <meta name="description" content={symbol.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={symbol.title} />
        <meta property="og:description" content={symbol.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <GalacticBackground harmony={0.5} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dreams" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Dreams
          </Link>
          <span>/</span>
          <Link to="/dreams/symbols" className="hover:text-foreground">Symbols</Link>
          <span>/</span>
          <span className="text-foreground">{symbol.symbol}</span>
        </nav>

        <header className="space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary">{symbol.archetype}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {symbol.symbol} <span className="text-primary">dream meaning</span>
          </h1>
          <p className="text-lg text-muted-foreground">{symbol.shortMeaning}</p>
        </header>

        <Card className="border-primary/30 bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Moon className="h-6 w-6 text-primary mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold">Interpret your own {symbol.symbol.toLowerCase()} dream</p>
                <p className="text-sm text-muted-foreground">
                  Aetherion reads your dream through the Caduceus engine — symbol, sponge harmonic, and your journal context.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button asChild>
                <Link to="/dreams">
                  Ask Aetherion <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/tarot?symbol=${symbol.slug}`}>
                  <Sparkles className="mr-2 h-4 w-4" /> Cast tarot
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-6">
          {symbol.meanings.map((m) => (
            <article key={m.heading} className="space-y-2">
              <h2 className="text-2xl font-semibold">{m.heading}</h2>
              <p className="text-muted-foreground leading-relaxed">{m.body}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-semibold">People also ask</h2>
          <div className="space-y-3">
            {symbol.questions.map((q) => (
              <Card key={q} className="border-border/60 bg-card/40">
                <CardContent className="p-4">
                  <p className="font-medium">{q}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {symbol.shortMeaning}{" "}
                    <Link to="/dreams" className="text-primary hover:underline">
                      Get a personal reading →
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-semibold">Related symbols</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Button key={r.slug} asChild variant="outline" size="sm">
                <Link to={`/dreams/symbols/${r.slug}`}>{r.symbol}</Link>
              </Button>
            ))}
          </div>
        </section>

        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6 text-center space-y-3">
            <Sparkles className="h-6 w-6 text-primary mx-auto" aria-hidden />
            <h2 className="text-2xl font-bold">Bring your {symbol.symbol.toLowerCase()} dream to the Oracle</h2>
            <p className="text-muted-foreground">
              Symbol dictionaries give the archetype. Aetherion gives the reading — for your dream, your life, this moment.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
              <Button asChild size="lg">
                <Link to="/dreams">Open the Dream Oracle</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={`/tarot?symbol=${symbol.slug}`}>
                  <Sparkles className="mr-2 h-4 w-4" /> Cast a {symbol.symbol} spread
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DreamSymbol;
