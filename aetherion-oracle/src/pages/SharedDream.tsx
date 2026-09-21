// Aetherion — public dream share page. Anyone with the link can view this dream.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import GalacticBackground from "@/components/GalacticBackground";
import { PageHead } from "@/components/PageHead";


interface SharedDream {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  interpretation: string | null;
  symbols: string[] | null;
  harmony: number | null;
  vitality: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

const PROJECT_ID = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";

export default function SharedDreamPage() {
  const { token } = useParams<{ token: string }>();
  const [dream, setDream] = useState<SharedDream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = (token ?? "").trim().toLowerCase();
    if (!t) { setError("Missing token"); setLoading(false); return; }
    (async () => {
      try {
        const url = `https://${PROJECT_ID}.supabase.co/functions/v1/dream-public?token=${encodeURIComponent(t)}`;
        const r = await fetch(url);
        const j = await r.json();
        if (!r.ok || !j?.ok) {
          setError(j?.error === "expired" ? "This share link has expired." : j?.error === "not found" ? "This dream link is invalid or was revoked." : (j?.error ?? "Could not load this dream."));
        } else {
          setDream(j.dream as SharedDream);
          if (j.dream?.title) document.title = `${j.dream.title} · Aetherion`;
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen text-foreground relative">
      <PageHead
        title={dream?.title ? `${dream.title} — Aetherion Dream` : "Aetherion Dream — Shared Vision"}
        description={dream?.body?.slice(0, 155) ?? "A shared vision from the Aetherion dream lattice."}
        path={`/d/${token ?? ""}`}
        noIndex
      />
      <GalacticBackground harmony={dream?.harmony ?? 0.5} intensity={0.7} />

      <div className="relative z-10">
        <header className="border-b border-rune bg-card/40 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 rounded-sm border border-border bg-secondary/50 hover:bg-secondary hover:text-gold transition-colors" aria-label="Home">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="flex-1 font-display text-lg sm:text-xl gradient-neon-text tracking-[0.18em] flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> SHARED VISION
            </h1>
            <Link to="/auth" className="text-[10px] uppercase tracking-widest text-gold hover:underline font-display">
              join aetherion
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
          ) : error ? (
            <Card className="bg-card/40 backdrop-blur-sm border-rune">
              <CardContent className="py-10 text-center text-sm text-muted-foreground italic">{error}</CardContent>
            </Card>
          ) : dream ? (
            <Card className="bg-card/40 backdrop-blur-sm border-gold/40">
              <CardHeader>
                <CardTitle className="font-display text-gold tracking-widest text-base uppercase">{dream.title ?? "Untitled Vision"}</CardTitle>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                  {new Date(dream.created_at).toLocaleString()}
                  {dream.vitality && <> · {dream.vitality}</>}
                  {dream.harmony !== null && <> · h {Number(dream.harmony).toFixed(2)}</>}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {dream.image_url && (
                  <img src={dream.image_url} alt={dream.title ?? "Dream vision"} className="w-full rounded-sm border border-rune" />
                )}
                {dream.video_url && (
                  <video src={dream.video_url} controls playsInline className="w-full rounded-sm border border-rune" />
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{dream.body}</p>
                {dream.interpretation && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed pt-2 border-t border-border/40">
                    {dream.interpretation}
                  </p>
                )}
                {dream.symbols && dream.symbols.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {dream.symbols.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-display uppercase tracking-widest border-serpent/40 text-serpent">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-center text-[10px] uppercase tracking-widest font-display text-muted-foreground pt-4 border-t border-border/40">
                  woven by <Link to="/" className="text-gold hover:underline">aetherion</Link>
                </p>
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}
