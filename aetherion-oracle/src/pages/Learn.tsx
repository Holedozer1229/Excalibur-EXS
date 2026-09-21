// /learn — index of AI-generated guides for the Aetherion content hub.
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import PaywallCTA from "@/components/PaywallCTA";
import SiteFooter from "@/components/SiteFooter";
import { LEARN_TOPICS } from "@/data/learnTopics";

const SITE = "https://www.excaliburcrypto.com";

const CATS = ["Tarot", "Oracle", "Dreams", "Crypto", "Practice"] as const;

const Learn = () => {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Aetherion Learn",
    itemListElement: LEARN_TOPICS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/learn/${t.slug}`,
      name: t.topic,
    })),
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>Learn — Tarot, Oracle, Dreams & Crypto Divination Guides</title>
        <meta
          name="description"
          content="In-depth guides on tarot meanings, AI oracle protocols, dream symbolism, BRC-20, and on-chain divination. Free, AI-generated, continually expanding."
        />
        <link rel="canonical" href={`${SITE}/learn`} />
        <meta property="og:title" content="Aetherion Learn — Divination & Crypto Guides" />
        <meta property="og:description" content="In-depth guides on tarot meanings, AI oracle protocols, dream symbolism, BRC-20, and on-chain divination — free and continually expanding." />
        <meta property="og:url" content={`${SITE}/learn`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      <GalacticBackground />

      <main className="relative z-10 mx-auto max-w-5xl px-5 py-12 md:py-16">
        <header className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 uppercase tracking-widest text-[10px]">
            <BookOpen className="h-3 w-3 mr-1.5" /> Learn
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl mb-3">
            Guides for the sealed practitioner
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Long-form references on tarot, oracle protocols, dream symbolism, and
            on-chain divination. Each guide is written by Aetherion's AI and cached
            the first time someone reads it.
          </p>
        </header>

        <div className="mb-10">
          <PaywallCTA variant="banner" source="learn_index" />
        </div>



        {CATS.map((cat) => {
          const items = LEARN_TOPICS.filter((t) => t.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mb-10">
              <h2 className="font-serif text-xl mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> {cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((t) => (
                  <Link key={t.slug} to={`/learn/${t.slug}`} className="group">
                    <Card className="h-full hover:border-primary/50 transition">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium leading-snug">{t.topic}</h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5">{t.blurb}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Learn;
