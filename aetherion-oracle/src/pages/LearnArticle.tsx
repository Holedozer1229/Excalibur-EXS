// /learn/:slug — renders or generates an AI-written guide on first view.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import SocialProofBar from "@/components/SocialProofBar";
import { supabase } from "@/integrations/supabase/client";
import { getLearnTopic, LEARN_TOPICS } from "@/data/learnTopics";
import PaywallCTA from "@/components/PaywallCTA";

const SITE = "https://www.excaliburcrypto.com";

interface Article {
  slug: string;
  title: string;
  summary: string;
  body_markdown: string;
  keyword: string | null;
}

// Safe markdown renderer: react-markdown escapes HTML by default and only
// permits http(s)/mailto URLs in links via its built-in URL sanitizer.
function renderMarkdown(md: string) {
  return (
    <div className="prose prose-invert max-w-none text-muted-foreground">
      <ReactMarkdown
        components={{
          h1: ({ node: _n, ...p }) => <h2 className="font-serif text-2xl mt-8 mb-3" {...p} />,
          h2: ({ node: _n, ...p }) => <h2 className="font-serif text-2xl mt-8 mb-3" {...p} />,
          h3: ({ node: _n, ...p }) => <h3 className="font-serif text-xl mt-6 mb-2" {...p} />,
          p: ({ node: _n, ...p }) => <p className="text-muted-foreground leading-relaxed my-3" {...p} />,
          ul: ({ node: _n, ...p }) => <ul className="list-disc pl-5 space-y-1 my-3" {...p} />,
          a: ({ node: _n, href, ...p }) => {
            const safe = typeof href === "string" && /^(https?:|mailto:|\/)/i.test(href) ? href : undefined;
            return <a className="underline text-primary" href={safe} rel="noopener noreferrer" target={safe?.startsWith("http") ? "_blank" : undefined} {...p} />;
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

const LearnArticle = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const topic = getLearnTopic(slug);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArticle(null);

    (async () => {
      // 1) check cache directly first (no edge call needed when cached)
      const { data: cached } = await supabase
        .from("learn_articles")
        .select("slug,title,summary,body_markdown,keyword")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (cached) {
        setArticle(cached as Article);
        setLoading(false);
        return;
      }

      // 2) invoke generator
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "generate-learn-article",
        { body: { slug, topic: topic.topic, keyword: topic.keyword } },
      );
      if (cancelled) return;
      if (invokeErr || !data?.article) {
        setError(invokeErr?.message || "Could not generate this guide. Try again shortly.");
        setLoading(false);
        return;
      }
      setArticle(data.article as Article);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, topic]);

  const url = `${SITE}/learn/${slug}`;
  const related = useMemo(
    () =>
      topic
        ? LEARN_TOPICS.filter((t) => t.slug !== slug && t.category === topic.category).slice(0, 4)
        : [],
    [slug, topic],
  );

  if (!topic) return <Navigate to="/learn" replace />;

  const title = article?.title ?? topic.topic;
  const description = article?.summary ?? topic.blurb;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: url,
    keywords: topic.keyword,
    author: { "@type": "Organization", name: "Aetherion Oracle" },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Aetherion", item: SITE },
      { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/learn` },
      { "@type": "ListItem", position: 3, name: topic.topic, item: url },
    ],
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(articleJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <GalacticBackground />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft className="h-3 w-3" /> All guides
        </Link>

        <Badge variant="outline" className="mb-3 uppercase tracking-widest text-[10px]">
          {topic.category}
        </Badge>
        <h1 className="font-serif text-3xl md:text-4xl leading-tight mb-3">{title}</h1>
        <p className="text-muted-foreground mb-5">{description}</p>
        <SocialProofBar compact />

        <article className="mt-8">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aetherion is composing this guide…</span>
            </div>
          )}
          {error && (
            <Card>
              <CardContent className="p-5 text-sm">
                <p className="text-destructive mb-2">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}
          {article && renderMarkdown(article.body_markdown)}
        </article>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Begin the practice
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="justify-between">
              <Link to="/oracle">Oracle <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link to="/tarot">Tarot <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link to="/dreams">Dreams <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <div className="mt-10">
          <PaywallCTA variant="card" source={`learn_${slug}`} />
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
              More on {topic.category.toLowerCase()}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/learn/${r.slug}`}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-muted transition"
                  >
                    <span className="text-sm">{r.topic}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default LearnArticle;
