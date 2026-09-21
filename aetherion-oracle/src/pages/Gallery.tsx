import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Image as ImageIcon, Film, Sparkles, Download, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PaywallCTA from "@/components/PaywallCTA";

const SITE = "https://www.excaliburcrypto.com";

type Kind = "image" | "video";
type Status = "pending" | "completed" | "failed";

interface MediaRow {
  id: string;
  kind: Kind;
  status: Status;
  output_url: string | null;
  storage_path: string | null;
  error: string | null;
  dream_id: string | null;
  created_at: string;
}

type Filter = "all" | "image" | "video";

const Gallery = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) { setAuthed(false); setLoading(false); }
        return;
      }
      if (alive) setAuthed(true);
      await refresh(user.id);
      if (alive) setLoading(false);

      // Realtime: refresh on any change to this user's media rows
      const channel = supabase
        .channel(`gallery-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "media_generations", filter: `user_id=eq.${user.id}` },
          () => refresh(user.id),
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    })();
    return () => { alive = false; };
  }, []);

  const refresh = async (userId: string) => {
    const { data, error } = await supabase
      .from("media_generations")
      .select("id, kind, status, output_url, storage_path, error, dream_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Could not load your gallery.");
      return;
    }
    const raw = (data ?? []) as MediaRow[];
    // Re-mint signed URLs from storage_path so expired output_urls still render.
    // Bucket is private; RLS on storage.objects lets the owner read their prefix.
    const signed = await Promise.all(
      raw.map(async (r) => {
        if (r.status !== "completed" || !r.storage_path) return r;
        const { data: s } = await supabase.storage
          .from("gallery")
          .createSignedUrl(r.storage_path, 60 * 60);
        return s?.signedUrl ? { ...r, output_url: s.signedUrl } : r;
      }),
    );
    setRows(signed);
  };

  const filtered = useMemo(
    () => rows.filter((r) => (filter === "all" ? true : r.kind === filter)),
    [rows, filter],
  );

  const counts = useMemo(() => ({
    all: rows.length,
    image: rows.filter((r) => r.kind === "image").length,
    video: rows.filter((r) => r.kind === "video").length,
    pending: rows.filter((r) => r.status === "pending").length,
  }), [rows]);

  if (!loading && !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-foreground">
        <Card className="max-w-md w-full border-primary/40">
          <CardContent className="p-6 text-center space-y-3">
            <h1 className="font-display text-xl gradient-neon-text tracking-[0.3em]">YOUR GALLERY</h1>
            <p className="text-sm text-muted-foreground">Sign in to view the images and videos you've conjured.</p>
            <Button onClick={() => navigate("/auth?next=/gallery")}>Enter the construct</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground bg-background">
      <Helmet>
        <title>Your Gallery — Aetherion Oracle</title>
        <meta name="description" content="Every image and video the Aetherion Oracle has manifested for you." />
        <link rel="canonical" href={`${SITE}/gallery`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Oracle
        </Link>

        <header className="space-y-2">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Your conjurings
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight font-display">Gallery</h1>
          <p className="text-muted-foreground">
            Every image and video summoned through the Oracle. New conjurings appear here automatically.
          </p>
        </header>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {([
            { id: "all" as const, label: "All", icon: Sparkles, count: counts.all },
            { id: "image" as const, label: "Images", icon: ImageIcon, count: counts.image },
            { id: "video" as const, label: "Videos", icon: Film, count: counts.video },
          ]).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-sm border text-xs font-display uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                filter === id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
              <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          ))}
          {counts.pending > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-sm">
              <Loader2 className="h-3 w-3 animate-spin" /> {counts.pending} conjuring…
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your conjurings…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((row) => (
              <MediaTile key={row.id} row={row} onOpen={() => row.status === "completed" && setLightbox(row)} />
            ))}
          </div>
        )}

        <PaywallCTA variant="banner" tier="oracle_pro" source="gallery_footer" />
      </div>

      {lightbox && (
        <Lightbox row={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
};

const MediaTile = ({ row, onOpen }: { row: MediaRow; onOpen: () => void }) => {
  const date = new Date(row.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric",
  });

  if (row.status === "pending") {
    return (
      <div className="aspect-square border border-border rounded-sm bg-card/50 flex flex-col items-center justify-center gap-2 animate-pulse">
        {row.kind === "video" ? <Film className="h-6 w-6 text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Conjuring…</span>
      </div>
    );
  }

  if (row.status === "failed") {
    return (
      <div className="aspect-square border border-destructive/40 rounded-sm bg-destructive/5 flex flex-col items-center justify-center gap-1 p-3 text-center">
        <span className="text-[10px] font-mono uppercase tracking-widest text-destructive">Failed</span>
        <span className="text-[10px] font-mono text-destructive/70 line-clamp-3">{row.error ?? "Unknown error"}</span>
      </div>
    );
  }

  if (!row.output_url) return null;

  return (
    <button
      onClick={onOpen}
      aria-label={`Open ${row.kind} conjured on ${date}`}
      className="group relative aspect-square overflow-hidden rounded-sm border border-border hover:border-primary/60 transition-colors bg-void/40"
    >
      {row.kind === "image" ? (
        <img
          src={row.output_url}
          alt="Conjured by the Oracle"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <>
          <video
            src={row.output_url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
            <Film className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
        </>
      )}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/90">{row.kind}</span>
        <span className="text-[10px] font-mono text-white/70">{date}</span>
      </div>
    </button>
  );
};

const Lightbox = ({ row, onClose }: { row: MediaRow; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!row.output_url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {row.kind === "image" ? (
          <img
            src={row.output_url}
            alt="Conjured by the Oracle"
            className="max-h-[80vh] w-auto object-contain rounded-sm border border-border"
          />
        ) : (
          <video
            src={row.output_url}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] w-auto rounded-sm border border-border bg-black"
          />
        )}

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <a
            href={row.output_url}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-primary/50 bg-primary/15 text-primary text-xs font-display uppercase tracking-widest hover:bg-primary/25"
          >
            <Download className="h-3 w-3" /> Download
          </a>
          <a
            href={row.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-border text-xs font-display uppercase tracking-widest hover:border-primary/50"
          >
            <ExternalLink className="h-3 w-3" /> Open
          </a>
          {row.dream_id && (
            <Link
              to={`/dreams?dream=${row.dream_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-border text-xs font-display uppercase tracking-widest hover:border-primary/50"
            >
              View dream
            </Link>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-border text-xs font-display uppercase tracking-widest hover:border-magenta/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ filter }: { filter: Filter }) => (
  <Card className="border-dashed border-border bg-card/40">
    <CardContent className="p-10 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        {filter === "video" ? <Film className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />}
      </div>
      <h2 className="font-display uppercase tracking-widest text-sm text-foreground">
        No {filter === "all" ? "conjurings" : filter + "s"} yet
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto font-serif">
        Record a dream or run a tarot reading — the Oracle can manifest visions in image and motion.
      </p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <Button asChild variant="outline" size="sm">
          <Link to="/dreams">Record a dream</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/tarot">Cast a reading</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default Gallery;
