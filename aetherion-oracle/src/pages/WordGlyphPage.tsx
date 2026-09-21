import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { AETHERION } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import { buildWordGlyph, glyphPathD } from "@/lib/wordGlyph";

export default function WordGlyphPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("w") ?? "aetherion";
  const [input, setInput] = useState(initial);
  const glyph = useMemo(() => buildWordGlyph(params.get("w") ?? "aetherion"), [params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const w = input.trim();
    if (w) setParams({ w: w.toLowerCase() });
  };

  const shareUrl = siteUrl(`/glyph?w=${encodeURIComponent(glyph.word)}`);
  const fill = `hsla(${glyph.hue}, 80%, 60%, 0.16)`;
  const stroke = `hsl(${glyph.hue}, 85%, 62%)`;
  const accent = `hsl(${glyph.hue2}, 75%, 55%)`;

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`Glyph of ${glyph.word} · ${AETHERION}`}
        description={`Every word owns exactly one glyph. ${glyph.word}: ${glyph.state} · ${glyph.hexagram}.`}
        path="/glyph"
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Glyph of ${glyph.word}`,
            url: shareUrl,
            description: "Deterministic word portrait from the octonion reflection engine.",
          },
        ]}
      />
      <main className="relative z-10 mx-auto max-w-2xl px-5 py-12 md:py-20" data-testid="glyph-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Glyph</span>
        </nav>

        <h1 className="font-serif text-3xl md:text-4xl">Every word already owns a glyph.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The octonion reflection gives each word eight coordinates — one canonical signature,
          identical on every machine, forever. Discovered, not designed. No AI draws these;
          the algebra does. Nothing here is minted, sold, or broadcast.
        </p>

        <form onSubmit={submit} className="mt-6 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={32}
            placeholder="type any word — your name works"
            className="w-full rounded-md border border-border bg-background/70 px-3 py-2 font-mono text-sm outline-none focus:border-amber-300/60"
            data-testid="glyph-input"
          />
          <button
            type="submit"
            className="rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-300/20"
          >
            Reveal
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-background/60 shadow-[0_0_80px_-30px_rgba(251,191,36,0.5)]">
          <svg viewBox="-100 -100 200 200" className="mx-auto block h-72 w-72 md:h-96 md:w-96" data-testid="glyph-svg">
            <circle r="97" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="0.75" />
            {glyph.phonemes.map((_, i) => {
              const a = (i / glyph.phonemes.length) * 2 * Math.PI - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1={Math.cos(a) * 93}
                  y1={Math.sin(a) * 93}
                  x2={Math.cos(a) * 97}
                  y2={Math.sin(a) * 97}
                  stroke={accent}
                  strokeWidth="1"
                />
              );
            })}
            <path d={glyphPathD(glyph.points)} fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
            {glyph.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={stroke} />
            ))}
            {glyph.hexagramLines.map((solid, i) => {
              const y = 78 - i * 6;
              return solid ? (
                <line key={i} x1="-14" y1={y} x2="14" y2={y} stroke={accent} strokeWidth="2.4" />
              ) : (
                <g key={i}>
                  <line x1="-14" y1={y} x2="-3" y2={y} stroke={accent} strokeWidth="2.4" />
                  <line x1="3" y1={y} x2="14" y2={y} stroke={accent} strokeWidth="2.4" />
                </g>
              );
            })}
            <circle r="2.8" fill={accent} />
          </svg>
          <div className="border-t border-border px-5 py-4 font-mono text-[11px] text-muted-foreground">
            <div className="text-sm text-foreground" data-testid="glyph-word">
              {glyph.word} {glyph.hexagramSymbol}
            </div>
            <div className="mt-1">
              {glyph.state} · {glyph.hexagram} · harmony {glyph.harmony}
            </div>
            <div className="mt-1">phonetic {glyph.phonemes.join("·")}</div>
            <div className="mt-1 break-all">glyph seal {glyph.sealShort} · share {shareUrl}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link to="/#aetherion-terminal" className="underline underline-offset-4">Ask Caduceus</Link>
          <Link to="/surprise" className="underline underline-offset-4">The surprise seal</Link>
          <Link to="/exs" className="underline underline-offset-4">Tetra-PoW</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
