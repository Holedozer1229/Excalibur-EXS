// /oracle/:slug — long-tail SEO landing pages for AI oracle reading,
// blockchain tarot, crypto divination, and BRC-20 oracle keywords.
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import { getLandingPage } from "@/data/landingPages";
import SocialProofBar from "@/components/SocialProofBar";
import PaywallCTA from "@/components/PaywallCTA";

const SITE = "https://www.excaliburcrypto.com";

const OracleLanding = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const page = getLandingPage(slug);
  if (!page) return <Navigate to="/" replace />;

  const url = `${SITE}/oracle/${page.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.metaDescription,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Aetherion Oracle" },
    keywords: page.keyword,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Aetherion", item: SITE },
      { "@type": "ListItem", position: 2, name: "Oracle", item: `${SITE}/oracle` },
      { "@type": "ListItem", position: 3, name: page.keyword, item: url },
    ],
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <GalacticBackground />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/oracle" className="hover:text-foreground">Oracle</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{page.keyword}</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 uppercase tracking-widest text-[10px]">
            {page.hero.eyebrow}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-4">
            {page.hero.heading}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">{page.hero.sub}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={page.hero.ctaHref}>
                <Sparkles className="h-4 w-4" />
                {page.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/learn">Read the guides</Link>
            </Button>
          </div>
          <div className="mt-6">
            <SocialProofBar compact />
          </div>
        </header>

        <article className="space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-serif text-2xl mb-3">{s.heading}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </article>

        <section className="mt-12">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Frequently asked
          </h2>
          <div className="space-y-4">
            {page.faqs.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-5">
                  <h3 className="font-medium mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <PaywallCTA variant="card" source={`oracle_landing_${page.slug}`} />
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
            Related
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {page.related.map((r) => (
              <li key={r.href}>
                <Link
                  to={r.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-muted transition"
                >
                  <span>{r.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to={page.hero.ctaHref}>
              {page.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default OracleLanding;
