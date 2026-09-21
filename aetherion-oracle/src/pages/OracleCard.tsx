import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Sparkles, Shuffle, Feather, Loader2, Palette, Wand2 } from "lucide-react";
import { detectWallets, connect, inscribeText, type Wallet } from "@/lib/btcWallet";

// --- Oracle data ---------------------------------------------------------
const ARCANA = [
  { name: "The Void Walker", element: "Aether", keyword: "Threshold" },
  { name: "The Comet Mother", element: "Fire", keyword: "Awakening" },
  { name: "The Mirror of Hours", element: "Water", keyword: "Reflection" },
  { name: "The Silent Loom", element: "Earth", keyword: "Patience" },
  { name: "The Hollow Crown", element: "Aether", keyword: "Surrender" },
  { name: "The Glass Serpent", element: "Air", keyword: "Cunning" },
  { name: "The Burning Garden", element: "Fire", keyword: "Devotion" },
  { name: "The Tidewatcher", element: "Water", keyword: "Listening" },
  { name: "The Bone Cartographer", element: "Earth", keyword: "Memory" },
  { name: "The Lantern Bearer", element: "Aether", keyword: "Guidance" },
  { name: "The Untold Hour", element: "Air", keyword: "Becoming" },
  { name: "The Salt Oracle", element: "Water", keyword: "Truth" },
  { name: "The Iron Moth", element: "Fire", keyword: "Persistence" },
  { name: "The Quiet Architect", element: "Earth", keyword: "Foundation" },
  { name: "The Astral Twin", element: "Aether", keyword: "Mirror-self" },
  { name: "The Verdant Wound", element: "Earth", keyword: "Healing" },
  { name: "The Final Page", element: "Air", keyword: "Closure" },
  { name: "The First Spark", element: "Fire", keyword: "Origin" },
  { name: "The Drowned Star", element: "Water", keyword: "Release" },
  { name: "The Hidden Door", element: "Aether", keyword: "Invitation" },
  { name: "The Wolf at Dawn", element: "Earth", keyword: "Instinct" },
  { name: "The Empty Chalice", element: "Water", keyword: "Renewal" },
];

const WHISPERS = [
  "The thread you almost cut is the one that holds.",
  "What you call hesitation is the universe drawing breath.",
  "Speak the name you've been avoiding. It already knows you.",
  "The door you fear is painted on a wall you can step through.",
  "Your patience is being counted in a currency you'll soon spend.",
  "Two paths converge inside you. Choose the one that frightens the architect.",
  "A small kindness today rewrites a chapter you haven't read yet.",
  "The silence is not empty. It is full of arriving things.",
  "What you released last moon is composting into next month's bloom.",
  "Trust the version of you that hasn't happened yet.",
  "The omen is in the ordinary. Look again at the cup.",
  "You are not late. You are precisely on the spiral.",
  "An old story is asking permission to end.",
  "The stranger in your dream was a forgotten part of you waving hello.",
  "Stop translating. Some signals only land in the body.",
  "Your no is a holy syllable. Use it.",
  "Tend the small fire. The great fire is watching.",
  "A name you'll soon meet is already being whispered toward you.",
  "The river does not negotiate with the stone. It outlasts it.",
  "What blooms in you tonight was planted by a self you no longer remember.",
  "The compass needle trembles because it knows.",
  "You are the question and the season of its answer.",
];

// --- deterministic RNG ---------------------------------------------------
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function genSeed(): string {
  const a = "aeiouy";
  const c = "bcdfghjklmnprstvwxz";
  let s = "";
  for (let i = 0; i < 6; i++) s += (i % 2 ? a : c)[Math.floor(Math.random() * (i % 2 ? a.length : c.length))];
  return s + "-" + Math.floor(Math.random() * 9000 + 1000);
}

interface OracleCard {
  seed: string;
  number: string;
  arcanum: typeof ARCANA[number];
  whisper: string;
  reversed: boolean;
  hue: number;
}

function deriveCard(seed: string): OracleCard {
  const rnd = mulberry32(hashString("atart::" + seed));
  const arcanum = ARCANA[Math.floor(rnd() * ARCANA.length)];
  const whisper = WHISPERS[Math.floor(rnd() * WHISPERS.length)];
  const reversed = rnd() < 0.22;
  const hue = Math.floor(rnd() * 360);
  const num = Math.floor(rnd() * 10000).toString().padStart(4, "0");
  return { seed, arcanum, whisper, reversed, hue, number: num };
}
function cardHash(seed: string, palette: PaletteId, sigil: SigilId, dedication: string): string {
  const input = `${seed}::${palette}::${sigil}::${dedication}`;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0xcbf29ce4 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c;
    h2 = Math.imul(h2, 0x01000193);
    h1 ^= (h2 >>> 16);
    h2 ^= (h1 >>> 16);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `0x${hex(h1)}${hex(h2)}`;
}

// --- Customization ------------------------------------------------------
export const PALETTES = {
  cosmos:   { label: "Cosmos",   hues: [265, 220, 290], bg: ["#0a0a18", "#14102a", "#08060f"] },
  ember:    { label: "Ember",    hues: [18, 350, 40],   bg: ["#1a0a08", "#2a100c", "#0f0606"] },
  verdant:  { label: "Verdant",  hues: [150, 170, 90],  bg: ["#06140e", "#0d1f1a", "#04100a"] },
  obsidian: { label: "Obsidian", hues: [220, 200, 240], bg: ["#08090d", "#10131c", "#04050a"] },
  bone:     { label: "Bone",     hues: [40, 20, 320],   bg: ["#15110d", "#1f1a14", "#0c0907"] },
  tide:     { label: "Tide",     hues: [195, 220, 175], bg: ["#06121a", "#0b1d2a", "#040a10"] },
} as const;
export type PaletteId = keyof typeof PALETTES;

export const SIGILS = ["polygon", "star", "rune", "lattice", "halo"] as const;
export type SigilId = typeof SIGILS[number];

function paletteFromSeed(seed: string): PaletteId {
  const keys = Object.keys(PALETTES) as PaletteId[];
  return keys[hashString(seed + ":pal") % keys.length];
}
function sigilFromSeed(seed: string): SigilId {
  return SIGILS[hashString(seed + ":sig") % SIGILS.length];
}

// --- Card UI -------------------------------------------------------------
function Sigil({ seed, sigil, hues, reversed }: { seed: string; sigil: SigilId; hues: [number, number, number]; reversed: boolean }) {
  const [h1, , h3] = hues;
  const r = mulberry32(hashString(seed + ":glyph"));
  const gradId = `g-${seed}`;
  const stroke = `hsl(${h1} 100% 80%)`;

  let inner: JSX.Element = <g />;
  if (sigil === "polygon") {
    const pts: string[] = [];
    const sides = 5 + Math.floor(r() * 4);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const rad = 35 + r() * 20;
      pts.push(`${130 + Math.cos(a) * rad},${130 + Math.sin(a) * rad}`);
    }
    inner = <polygon points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.5" strokeOpacity="0.9" />;
  } else if (sigil === "star") {
    const pts: string[] = [];
    const points = 7;
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? 55 : 22;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${130 + Math.cos(a) * rad},${130 + Math.sin(a) * rad}`);
    }
    inner = <polygon points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.9" />;
  } else if (sigil === "rune") {
    // angular rune-like marks
    const lines: JSX.Element[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x1 = 130 + Math.cos(a) * 18;
      const y1 = 130 + Math.sin(a) * 18;
      const x2 = 130 + Math.cos(a) * 55;
      const y2 = 130 + Math.sin(a) * 55;
      lines.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.6" strokeOpacity="0.95" />);
    }
    lines.push(<circle key="rc" cx={130} cy={130} r={30} fill="none" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.9" />);
    inner = <g>{lines}</g>;
  } else if (sigil === "lattice") {
    const lines: JSX.Element[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      const x1 = 130 + Math.cos(a) * 55;
      const y1 = 130 + Math.sin(a) * 55;
      const x2 = 130 - Math.cos(a) * 55;
      const y2 = 130 - Math.sin(a) * 55;
      lines.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.2" strokeOpacity="0.85" />);
    }
    inner = <g>{lines}</g>;
  } else { // halo
    inner = (
      <g>
        <circle cx={130} cy={130} r={48} fill="none" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.9" />
        <circle cx={130} cy={130} r={32} fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.7" />
        <circle cx={130} cy={130} r={16} fill="none" stroke={stroke} strokeWidth="0.8" strokeOpacity="0.55" />
      </g>
    );
  }

  return (
    <div className="absolute top-[140px] left-1/2" style={{ transform: `translateX(-50%) ${reversed ? "rotate(180deg)" : ""}` }}>
      <svg width="260" height="260" viewBox="0 0 260 260">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${h1} 100% 75%)`} stopOpacity="0.9" />
            <stop offset="100%" stopColor={`hsl(${h3} 80% 30%)`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="130" cy="130" r="120" fill={`url(#${gradId})`} />
        <circle cx="130" cy="130" r="90" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="130" cy="130" r="60" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line key={i}
              x1={130 + Math.cos(a) * 60} y1={130 + Math.sin(a) * 60}
              x2={130 + Math.cos(a) * 120} y2={130 + Math.sin(a) * 120}
              stroke="white" strokeOpacity="0.25" strokeWidth="0.8" />
          );
        })}
        {inner}
        <circle cx="130" cy="130" r="4" fill="white" />
      </svg>
    </div>
  );
}

function CardArtwork({ card, palette, sigil, dedication, hash }: {
  card: OracleCard; palette: PaletteId; sigil: SigilId; dedication: string; hash: string;
}) {
  const { arcanum, whisper, reversed, number, seed } = card;
  const pal = PALETTES[palette];
  const [h1, h2, h3] = pal.hues;

  return (
    <div
      className="relative w-[540px] h-[810px] overflow-hidden rounded-[28px] shadow-2xl"
      style={{
        background: `
          radial-gradient(circle at 25% 15%, hsl(${h1} 75% 55% / 0.55), transparent 55%),
          radial-gradient(circle at 80% 80%, hsl(${h2} 70% 50% / 0.45), transparent 60%),
          radial-gradient(circle at 50% 50%, hsl(${h3} 80% 30% / 0.6), transparent 70%),
          linear-gradient(180deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 50%, ${pal.bg[2]} 100%)
        `,
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 540 810">
        {Array.from({ length: 90 }).map((_, i) => {
          const r = mulberry32(hashString(seed + ":" + i));
          return <circle key={i} cx={r() * 540} cy={r() * 810} r={r() * 1.6 + 0.2} fill="white" opacity={r() * 0.8 + 0.2} />;
        })}
      </svg>

      <div className="absolute inset-4 rounded-[22px] border border-white/20" />
      <div className="absolute inset-6 rounded-[18px] border border-white/10" />

      <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-10 text-white/70 text-[11px] tracking-[0.3em] uppercase">
        <span>ATART · Oracle</span>
        <span>№ {number}</span>
      </div>

      <Sigil seed={seed} sigil={sigil} hues={[h1, h2, h3]} reversed={reversed} />

      <div className="absolute top-[420px] left-0 right-0 px-10 text-center">
        <div className="text-white/50 text-[10px] tracking-[0.35em] uppercase mb-2">
          {arcanum.element} · {reversed ? "Reversed" : "Upright"}
        </div>
        <h2 className="text-white text-[34px] leading-tight" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
          {arcanum.name}
        </h2>
        <div className="text-white/60 text-sm italic mt-1">— {arcanum.keyword} —</div>
      </div>

      <div className="absolute bottom-[150px] left-0 right-0 px-12 text-center">
        <p className="text-white/85 text-[17px] leading-snug" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
          “{whisper}”
        </p>
      </div>

      {dedication && (
        <div className="absolute bottom-[90px] left-0 right-0 px-12 text-center">
          <div className="mx-auto w-12 border-t border-white/30 mb-2" />
          <p className="text-white/80 text-[13px] tracking-[0.18em] uppercase" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            {dedication}
          </p>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 px-10 space-y-1">
        <div className="flex items-center justify-between text-white/55 text-[10px] tracking-[0.25em] uppercase">
          <span>www.excaliburcrypto.com</span>
          <span>seed · {seed}</span>
        </div>
        <div className="text-center text-muted-foreground text-[9px] tracking-[0.2em] font-mono uppercase">
          verify · {hash}
        </div>
      </div>
    </div>
  );
}

const MAX_DEDICATION = 60;

// --- Page ----------------------------------------------------------------
export default function OracleCard() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const seed = params.get("seed") ?? "";
  useEffect(() => {
    if (!seed) setParams({ seed: genSeed() }, { replace: true });
  }, [seed, setParams]);

  const card = useMemo(() => (seed ? deriveCard(seed) : null), [seed]);

  const palette: PaletteId = useMemo(() => {
    const p = params.get("p") as PaletteId | null;
    return p && p in PALETTES ? p : seed ? paletteFromSeed(seed) : "cosmos";
  }, [params, seed]);

  const sigil: SigilId = useMemo(() => {
    const g = params.get("g") as SigilId | null;
    return g && (SIGILS as readonly string[]).includes(g) ? g : seed ? sigilFromSeed(seed) : "polygon";
  }, [params, seed]);

  const dedication = (params.get("d") ?? "").slice(0, MAX_DEDICATION);

  const hash = useMemo(() => cardHash(seed, palette, sigil, dedication), [seed, palette, sigil, dedication]);

  function patchParams(next: Record<string, string | undefined>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged, { replace: true });
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/oracle-card?${params.toString()}`
    : "";

  async function exportPng() {
    if (!cardRef.current) return;
    setBusy("export");
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `atart-oracle-${seed}.png`;
      a.click();
      toast({ title: "Card exported", description: "Saved to your downloads." });
    } catch (e) {
      toast({ title: "Export failed", description: String((e as Error).message), variant: "destructive" });
    } finally { setBusy(null); }
  }

  async function copyShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "ATART Oracle", text: card ? `${card.arcanum.name} — ${card.whisper}` : "Draw your card", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied", description: shareUrl });
      }
    } catch { /* cancelled */ }
  }

  function reshuffle() {
    // new seed; preserve user customizations
    patchParams({ seed: genSeed() });
  }

  function randomizeStyle() {
    const palKeys = Object.keys(PALETTES) as PaletteId[];
    patchParams({
      p: palKeys[Math.floor(Math.random() * palKeys.length)],
      g: SIGILS[Math.floor(Math.random() * SIGILS.length)],
    });
  }

  async function inscribe() {
    if (!card) return;
    const wallets = detectWallets();
    if (!wallets.length) {
      toast({ title: "No BTC wallet detected", description: "Install Unisat or Xverse to inscribe.", variant: "destructive" });
      return;
    }
    setBusy("inscribe");
    try {
      const w: Wallet = wallets[0];
      await connect(w);
      const payload = JSON.stringify({
        p: "atart-oracle",
        op: "card",
        tick: "ATART",
        seed,
        n: card.number,
        arcanum: card.arcanum.name,
        element: card.arcanum.element,
        keyword: card.arcanum.keyword,
        reversed: card.reversed,
        whisper: card.whisper,
        style: { palette, sigil },
        dedication: dedication || undefined,
        hash,
        url: shareUrl,
        ts: new Date().toISOString(),
      });
      const res = await inscribeText(w, payload);
      toast({
        title: "Ordinal inscribed",
        description: res.inscriptionId ? `id ${res.inscriptionId.slice(0, 14)}…` : `tx ${res.revealTx.slice(0, 14)}…`,
      });
    } catch (e) {
      toast({ title: "Inscription failed", description: String((e as Error).message), variant: "destructive" });
    } finally { setBusy(null); }
  }

  if (!card) return null;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-3">
            <Sparkles className="w-3 h-3 mr-1" /> ATART Oracle
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Card Has Been Drawn</h1>
          <p className="text-sm text-muted-foreground">
            The arcanum is fixed by your seed. The palette, sigil, and dedication are yours to shape.
          </p>
        </div>

        <div className="grid md:grid-cols-[auto,1fr] gap-8 items-start justify-center">
          <div className="flex justify-center">
            <div ref={cardRef}>
              <CardArtwork card={card} palette={palette} sigil={sigil} dedication={dedication} hash={hash} />
            </div>
          </div>

          <div className="space-y-5 max-w-sm w-full mx-auto">
            <Card className="p-4 space-y-4">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-2">
                  <Palette className="w-3 h-3" /> Background palette
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
                    const pal = PALETTES[id];
                    const active = palette === id;
                    return (
                      <button
                        key={id}
                        onClick={() => patchParams({ p: id })}
                        className={`group rounded-md border p-1.5 text-left transition ${active ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/40"}`}
                      >
                        <div className="h-8 rounded-sm" style={{
                          background: `linear-gradient(135deg, hsl(${pal.hues[0]} 70% 50%), hsl(${pal.hues[1]} 65% 40%), ${pal.bg[1]})`,
                        }} />
                        <div className="text-[10px] mt-1 tracking-wide">{pal.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3 h-3" /> Sigil variant
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SIGILS.map((s) => (
                    <button
                      key={s}
                      onClick={() => patchParams({ g: s })}
                      className={`px-2.5 py-1 rounded-full text-[11px] capitalize border transition ${sigil === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="ded" className="text-xs mb-1.5 block">
                  Personal inscription <span className="text-muted-foreground">({dedication.length}/{MAX_DEDICATION})</span>
                </Label>
                <Input
                  id="ded"
                  maxLength={MAX_DEDICATION}
                  placeholder="for E. — on the longest night"
                  value={dedication}
                  onChange={(e) => patchParams({ d: e.target.value || undefined })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Appears beneath the whisper. Stored in the URL and the ordinal payload.
                </p>
              </div>

              <Button onClick={randomizeStyle} variant="ghost" size="sm" className="w-full">
                <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Randomize style
              </Button>
            </Card>

            <Card className="p-3 flex flex-wrap gap-2">
              <Button onClick={exportPng} disabled={!!busy} size="sm">
                {busy === "export" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                Export PNG
              </Button>
              <Button onClick={copyShare} variant="secondary" size="sm">
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
              <Button onClick={reshuffle} variant="outline" size="sm">
                <Shuffle className="w-3.5 h-3.5 mr-1.5" /> New draw
              </Button>
              <Button onClick={inscribe} disabled={!!busy} variant="outline" size="sm">
                {busy === "inscribe" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Feather className="w-3.5 h-3.5 mr-1.5" />}
                Inscribe
              </Button>
            </Card>
          </div>
        </div>

        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p className="break-all">Permalink: <code className="text-foreground/80">{shareUrl}</code></p>
          <p className="mt-1 font-mono text-[10px] tracking-wide">Card hash: <code className="text-foreground/80">{hash}</code></p>
          <p className="mt-2">Need ATART? <Link to="/claim/tart" className="underline">Claim your tokens →</Link></p>
        </div>
      </div>
    </div>
  );
}
