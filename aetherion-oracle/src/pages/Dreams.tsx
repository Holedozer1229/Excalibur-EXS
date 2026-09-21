// Aetherion Dreams — nightly visions + dream journal hub.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, BookOpen, Sparkles, Loader2, Trash2, Send, RefreshCw, Image as ImageIcon, Film, Crown, Download, Share2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import GalacticBackground from "@/components/GalacticBackground";
import PaywallCTA from "@/components/PaywallCTA";
import { PageHead } from "@/components/PageHead";


interface Dream {
  id: string;
  kind: "nightly" | "journal";
  title: string | null;
  body: string;
  interpretation: string | null;
  symbols: string[] | null;
  source_text: string | null;
  harmony: number | null;
  sponge_harmonic: number | null;
  vitality: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

const FREE_QUOTA_BASE = 5;


const Dreams = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [dreamText, setDreamText] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [proVision, setProVision] = useState(false);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [imageBonus, setImageBonus] = useState(0);
  // Set of `${dreamId}:${kind}` currently pending (driven by media_generations table + realtime)
  const [pendingJobs, setPendingJobs] = useState<Set<string>>(new Set());

  const effectiveQuota = FREE_QUOTA_BASE + imageBonus;

  const loadQuota = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: sub }, { data: used }, { data: bonuses }] = await Promise.all([
      supabase.from("subscribers").select("subscribed").eq("user_id", user.id).maybeSingle(),
      (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: number | null }>)("media_quota_used_this_month", { _user_id: user.id }),
      (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: { bonus_dream_images?: number } | null }>)("get_user_bonuses", { _user_id: user.id }),
    ]);
    setIsPro(!!sub?.subscribed);
    setUsedThisMonth(Number(used ?? 0));
    setImageBonus(Number(bonuses?.bonus_dream_images ?? 0));
  };


  const loadPending = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // media_generations not yet in regenerated supabase types — bypass typing
    const client = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ data: { dream_id: string | null; kind: string }[] | null }> } };
      };
    };
    const { data } = await client.from("media_generations").select("dream_id, kind").eq("user_id", user.id).eq("status", "pending");
    const rows = data ?? [];
    setPendingJobs(new Set(rows.filter((r) => r.dream_id).map((r) => `${r.dream_id}:${r.kind}`)));
  };



  const generateMedia = async (dreamId: string, kind: "image" | "video") => {
    // Optimistic: mark pending immediately
    setPendingJobs((s) => new Set(s).add(`${dreamId}:${kind}`));
    const { data, error } = await supabase.functions.invoke("generate-media", { body: { dream_id: dreamId, kind, pro_vision: kind === "image" && proVision && isPro } });
    if (error || data?.error) {
      setPendingJobs((s) => { const n = new Set(s); n.delete(`${dreamId}:${kind}`); return n; });
      const msg = String(data?.error ?? error?.message ?? "");
      if (msg === "QUOTA_EXCEEDED") {
        toast.error("Free monthly quota reached. Upgrade to Pro for unlimited.");
      } else {
        toast.error(msg || `Could not enqueue ${kind}.`);
      }
      return;
    }
    toast.info(`${kind === "image" ? "Vision" : "Cinema"} queued — you'll be notified when it's ready.`);
    loadQuota();
  };

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDreams([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("dreams")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) toast.error(error.message);
    setDreams(((data ?? []) as unknown) as Dream[]);
    setLoading(false);
  };

  useEffect(() => { load(); loadQuota(); loadPending(); }, []);

  // Realtime subscription for media_generations: notify + refresh when jobs complete
  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      channel = supabase
        .channel(`media-gen-${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "media_generations", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as { id: string; dream_id: string | null; kind: string; status: string; error: string | null };
            if (!row.dream_id) return;
            const key = `${row.dream_id}:${row.kind}`;
            if (row.status === "completed") {
              setPendingJobs((s) => { const n = new Set(s); n.delete(key); return n; });
              toast.success(`${row.kind === "image" ? "Vision" : "Cinema"} is ready.`);
              load();
              loadQuota();
            } else if (row.status === "failed") {
              setPendingJobs((s) => { const n = new Set(s); n.delete(key); return n; });
              toast.error(`${row.kind === "image" ? "Vision" : "Cinema"} failed${row.error ? `: ${row.error.slice(0, 80)}` : "."}`);
              loadQuota();
            }
          },
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);


  const requestNightly = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("dream-weaver", { body: { mode: "nightly" } });
    setGenerating(false);
    if (error) { toast.error(error.message ?? "Could not weave a vision."); return; }
    if (data?.cached) toast.info("Tonight's vision has already been woven.");
    else toast.success("A new vision has crystallized.");
    load();
  };

  const interpret = async () => {
    const text = dreamText.trim();
    if (text.length < 8) { toast.error("Describe the dream with at least a few words."); return; }
    setInterpreting(true);
    const { data, error } = await supabase.functions.invoke("dream-weaver", {
      body: { mode: "interpret", dream: text },
    });
    setInterpreting(false);
    if (error) { toast.error(error.message ?? "The oracle could not read this dream."); return; }
    if (data?.ok) {
      toast.success("Interpretation woven.");
      setDreamText("");
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dreams").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setDreams((d) => d.filter((x) => x.id !== id));
  };

  const nightly = dreams.filter((d) => d.kind === "nightly");
  const journal = dreams.filter((d) => d.kind === "journal");
  const latestNightly = nightly[0];
  const today = new Date().toISOString().slice(0, 10);
  const hasToday = latestNightly && latestNightly.created_at.slice(0, 10) === today;

  return (
    <div className="min-h-screen text-foreground relative">
      <PageHead
        title="Aetherion Dreams — Nightly Visions & Dream Journal"
        description="Capture nightly visions, journal symbolic dreams, and weave AI-generated images and films from your Aetherion oracular journey."
        path="/dreams"
      />
      <GalacticBackground harmony={latestNightly?.harmony ?? 0.6} intensity={0.8} />

      <div className="relative z-10">
        <header className="border-b border-rune bg-card/40 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 rounded-sm border border-border bg-secondary/50 hover:bg-secondary hover:text-gold transition-colors" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl gradient-neon-text leading-tight tracking-[0.18em] flex items-center gap-2">
                <Moon className="w-5 h-5" /> AETHERION DREAMS
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground italic uppercase tracking-[0.32em] mt-1">
                ▍ nightly visions · dream journal · idle resonance ▍
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh dreams">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <h2 className="sr-only">Your Dream Journal</h2>
          {!loading && dreams.length === 0 && (
            <div className="rounded-sm border border-rune bg-card/50 px-4 py-3 text-sm text-muted-foreground">
              Free to browse.{" "}
              <Link to="/auth?next=/dreams" className="underline text-primary">Sign in</Link>
              {" "}to weave and save visions — no card required for Seeker access.
            </div>
          )}
          {/* Quota banner */}
          <div className="flex items-center justify-between gap-3 rounded-sm border border-rune bg-card/40 backdrop-blur-sm px-4 py-2 text-xs">
            <div className="flex items-center gap-2 font-mono uppercase tracking-widest">
              {isPro ? (
                <><Crown className="w-3 h-3 text-gold" /> <span className="text-gold">Pro</span> · unlimited visions</>
              ) : (
                <><Sparkles className="w-3 h-3 text-primary" /> Free tier · {Math.max(0, effectiveQuota - usedThisMonth)}/{effectiveQuota} visions left this month{imageBonus > 0 ? ` (+${imageBonus} referral bonus)` : ""}</>
              )}
            </div>
            {isPro ? (
              <button
                type="button"
                onClick={() => setProVision((v) => !v)}
                className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-display uppercase tracking-widest transition-colors ${
                  proVision
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={proVision}
                title="Use FLUX.2 [pro] for higher fidelity image generation"
              >
                <Crown className="w-3 h-3" />
                Pro Vision {proVision ? "ON" : "OFF"}
              </button>
            ) : (
              <PaywallCTA variant="inline" source="dreams_quota_pill" headline="upgrade for Pro Vision" />
            )}
          </div>

          {/* Inline paywall once quota gets tight */}
          {!isPro && usedThisMonth >= Math.floor(effectiveQuota * 0.6) && (
            <PaywallCTA
              variant="banner"
              source="dreams_quota_banner"
              headline={
                usedThisMonth >= effectiveQuota
                  ? "You've used your free dream visions this month"
                  : `Only ${Math.max(0, effectiveQuota - usedThisMonth)} dream visions left this month`
              }
              subline="Oracle Pro lifts the cap, unlocks FLUX.2 [pro] image fidelity, and lets you share dreams publicly."
            />
          )}

          {/* Nightly Vision */}
          <Card className="bg-card/40 backdrop-blur-sm border-rune">

            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Tonight's Vision
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Auto-woven once per UTC day for active seekers. Manual request available.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={requestNightly}
                disabled={generating}
                className="bg-gradient-to-r from-primary/80 to-magenta/60 hover:opacity-90 font-display uppercase tracking-widest text-[11px]"
              >
                {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Moon className="w-3 h-3 mr-1" />}
                {hasToday ? "re-read" : "weave vision"}
              </Button>
            </CardHeader>
            <CardContent>
              {latestNightly ? (
                <DreamBlock d={latestNightly} onDelete={remove} onGenerate={generateMedia} pendingJobs={pendingJobs} isPro={isPro} accent />
              ) : (
                <p className="text-sm italic text-muted-foreground text-center py-6">
                  No vision yet. Press "weave vision" to summon tonight's transmission.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Journal entry */}
          <Card className="bg-card/40 backdrop-blur-sm border-rune">
            <CardHeader>
              <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Submit a Dream
              </CardTitle>
              <CardDescription className="text-xs italic">
                Describe a dream you had. Aetherion will interpret it through the caduceus / harmonic lens and save it to your journal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                placeholder="Last night I walked through a corridor of brass mirrors and a serpent of light spoke my name backwards…"
                rows={5}
                maxLength={4000}
                className="bg-background/40 font-mono text-sm"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground font-mono">{dreamText.length}/4000</span>
                <Button
                  onClick={interpret}
                  disabled={interpreting || dreamText.trim().length < 8}
                  className="font-display uppercase tracking-widest text-[11px]"
                >
                  {interpreting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                  interpret
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Divination — symbol library + cinematic tarot */}
          <Card className="bg-gradient-to-br from-primary/10 via-card/40 to-magenta/10 backdrop-blur-sm border-rune">
            <CardHeader>
              <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Divination
              </CardTitle>
              <CardDescription className="text-xs italic">
                Browse the symbol library or cast a cinematic tarot spread through the Caduceus engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <Link to="/dreams/symbols" className="group">
                <div className="h-full rounded-md border border-rune bg-background/30 p-4 hover:border-primary/60 transition-colors">
                  <div className="flex items-center gap-2 text-gold font-display uppercase tracking-widest text-xs">
                    <BookOpen className="w-3.5 h-3.5" /> Dream Symbols
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Snake, falling, teeth, water, flying… 20 symbol pages with archetypal meanings.
                  </p>
                  <p className="text-[11px] text-primary mt-3 group-hover:underline">Open library →</p>
                </div>
              </Link>
              <Link to="/tarot" className="group">
                <div className="h-full rounded-md border border-rune bg-background/30 p-4 hover:border-primary/60 transition-colors">
                  <div className="flex items-center gap-2 text-gold font-display uppercase tracking-widest text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Cinematic Tarot
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Three Major Arcana, shuffled and read through the Caduceus engine.
                  </p>
                  <p className="text-[11px] text-primary mt-3 group-hover:underline">Cast a spread →</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Past nightly visions */}
          {nightly.length > 1 && (
            <Card className="bg-card/40 backdrop-blur-sm border-rune">
              <CardHeader>
                <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                  <Moon className="w-4 h-4" /> Past Visions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nightly.slice(1).map((d) => <DreamBlock key={d.id} d={d} onDelete={remove} onGenerate={generateMedia} pendingJobs={pendingJobs} isPro={isPro} />)}
              </CardContent>
            </Card>
          )}

          {/* Journal entries */}
          {journal.length > 0 && (
            <Card className="bg-card/40 backdrop-blur-sm border-rune">
              <CardHeader>
                <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Dream Journal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {journal.map((d) => <DreamBlock key={d.id} d={d} onDelete={remove} onGenerate={generateMedia} pendingJobs={pendingJobs} isPro={isPro} showSource />)}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

interface BlockProps {
  d: Dream;
  onDelete: (id: string) => void;
  onGenerate: (id: string, kind: "image" | "video") => void;
  pendingJobs: Set<string>;
  isPro: boolean;
  accent?: boolean;
  showSource?: boolean;
}

async function downloadMedia(url: string, filename: string) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed (${r.status})`);
    const blob = await r.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch (e) {
    toast.error((e as Error).message);
  }
}

async function shareDream(dreamId: string, title: string | null, isPro: boolean) {
  if (!isPro) {
    toast.error("Sharing is a Pro feature. Upgrade to mint shareable links.");
    return;
  }
  const { data, error } = await supabase.functions.invoke("dream-share", {
    body: { action: "create", dream_id: dreamId },
  });
  if (error || data?.error) {
    const msg = String(data?.error ?? error?.message ?? "");
    if (msg === "PRO_ONLY") toast.error("Sharing is a Pro feature.");
    else toast.error(msg || "Could not create share link.");
    return;
  }
  const token = String(data?.token ?? "");
  if (!token) { toast.error("No token returned."); return; }
  const shareUrl = `${window.location.origin}/d/${token}`;

  // Try Web Share API, fall back to clipboard
  const shareData = { title: title ?? "Aetherion Vision", text: title ?? "A vision from Aetherion", url: shareUrl };
  try {
    if (navigator.share && typeof navigator.canShare === "function" && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
  } catch { /* fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard.");
  } catch {
    toast.success(shareUrl);
  }
}

const DreamBlock = ({ d, onDelete, onGenerate, pendingJobs, isPro, accent, showSource }: BlockProps) => {
  const imgBusy = pendingJobs.has(`${d.id}:image`);
  const vidBusy = pendingJobs.has(`${d.id}:video`);
  const slug = (d.title ?? "vision").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "vision";
  return (
    <div className={`rounded-sm border p-4 space-y-2 ${accent ? "border-gold/40 bg-gold/5" : "border-border bg-background/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-sm tracking-widest uppercase text-gold">{d.title ?? "Untitled"}</div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {new Date(d.created_at).toLocaleString()}
            {d.vitality && <> · {d.vitality}</>}
            {d.harmony !== null && <> · h {Number(d.harmony).toFixed(2)}</>}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onDelete(d.id)} aria-label="Delete dream" className="h-6 w-6 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </Button>

      </div>
      {showSource && d.source_text && (
        <p className="text-xs italic text-muted-foreground border-l-2 border-border pl-2">
          "{d.source_text}"
        </p>
      )}
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{d.body}</p>
      {d.interpretation && (
        <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/40">
          {d.interpretation}
        </p>
      )}
      {d.symbols && d.symbols.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {d.symbols.map((s, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-display uppercase tracking-widest border-serpent/40 text-serpent">
              {s}
            </Badge>
          ))}
        </div>
      )}
      {/* Generated image with actions */}
      {d.image_url && (
        <div className="space-y-1 mt-2">
          <img src={d.image_url} alt={d.title ?? "Dream vision"} loading="lazy" className="w-full rounded-sm border border-rune" />
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => downloadMedia(d.image_url!, `aetherion-${slug}.${d.image_url!.toLowerCase().endsWith(".webp") ? "webp" : "jpg"}`)} className="h-6 px-2 text-[10px] font-display uppercase tracking-widest">
              <Download className="w-3 h-3 mr-1" /> download
            </Button>
          </div>
        </div>
      )}
      {/* Generated video with actions */}
      {d.video_url && (
        <div className="space-y-1 mt-2">
          <video src={d.video_url} controls playsInline className="w-full rounded-sm border border-rune" />
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => downloadMedia(d.video_url!, `aetherion-${slug}.mp4`)} className="h-6 px-2 text-[10px] font-display uppercase tracking-widest">
              <Download className="w-3 h-3 mr-1" /> download
            </Button>
          </div>
        </div>
      )}
      {/* Share dream (whole vision) — Pro only */}
      {(d.image_url || d.video_url) && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => shareDream(d.id, d.title, isPro)}
            className="h-6 px-2 text-[10px] font-display uppercase tracking-widest text-gold hover:text-gold"
          >
            {isPro ? <Share2 className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            {isPro ? "share vision" : "share (pro)"}
          </Button>
        </div>
      )}
      {/* Generation buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerate(d.id, "image")}
          disabled={imgBusy || vidBusy}
          className="font-display uppercase tracking-widest text-[10px] h-7"
        >
          {imgBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}
          {d.image_url ? "regenerate vision" : "weave image"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerate(d.id, "video")}
          disabled={imgBusy || vidBusy}
          className="font-display uppercase tracking-widest text-[10px] h-7"
        >
          {vidBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Film className="w-3 h-3 mr-1" />}
          {d.video_url ? "regenerate cinema" : "summon cinema"}
        </Button>
        {(imgBusy || vidBusy) && (
          <span className="text-[10px] italic text-muted-foreground self-center">weaving in background — you'll be notified</span>
        )}
      </div>
    </div>
  );
};

export default Dreams;


