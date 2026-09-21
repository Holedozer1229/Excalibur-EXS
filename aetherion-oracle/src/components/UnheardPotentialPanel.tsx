import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { glyphPathD, type WordGlyph } from "@/lib/wordGlyph";
import type { UnheardPotential } from "@/lib/unheardPotential";

function GlyphMini({ glyph }: { glyph: WordGlyph }) {
  const d = glyphPathD(glyph.points);
  return (
    <svg viewBox="-100 -100 200 200" className="h-28 w-28" aria-hidden>
      <defs>
        <linearGradient id={`up-g-${glyph.sealShort}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${glyph.hue} 80% 60%)`} />
          <stop offset="100%" stopColor={`hsl(${glyph.hue2} 70% 45%)`} />
        </linearGradient>
      </defs>
      <circle cx="0" cy="0" r="88" fill="none" stroke="hsl(270 40% 40% / 0.35)" strokeWidth="1" />
      <path d={d} fill={`url(#up-g-${glyph.sealShort})`} fillOpacity={0.25} stroke={`hsl(${glyph.hue} 80% 70%)`} strokeWidth="1.5" />
      {glyph.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={`hsl(${glyph.hue} 90% 75%)`} />
      ))}
    </svg>
  );
}

export default function UnheardPotentialPanel({
  artifact,
}: {
  artifact: UnheardPotential;
}) {
  const { potential, alchemy, glyph, speculative, resonanceField } = artifact;
  const unheard = resonanceField.steps.filter((s) => s.role === "antonym").slice(0, 5);
  const pct = Math.round(potential.score * 100);

  return (
    <div
      data-testid="unheard-potential-panel"
      className="mt-2 overflow-hidden rounded-md border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-violet-600/10 to-cyan-500/5 p-3 text-[11px] leading-relaxed text-foreground/90"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Unheard Potential
            {potential.apex && (
              <span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-amber-100">APEX</span>
            )}
          </div>
          <p className="font-serif text-base text-amber-50/95">
            “{artifact.phrase}” · <span className="text-violet-200">{artifact.nucleus}</span>
          </p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 via-amber-300 to-cyan-300 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            score {potential.score} · H {potential.harmony} · E {potential.harmonicEnergy}
            {potential.kpFactor != null ? ` · Kp×${potential.kpFactor}` : ""} · window{" "}
            {speculative.inWindow ? "OPEN" : "closed"} · {speculative.confidence}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {alchemy.primaMateria} → {alchemy.metal} (rank {alchemy.rank}/7) ·{" "}
            {artifact.reading.higher.aetherion.state} · {artifact.reading.higher.aetherion.hexagram.name}
          </p>
          {unheard.length > 0 && (
            <p className="text-[10px] text-violet-200/90">
              Unheard antonyms: {unheard.map((s) => s.word).join(" · ")}
            </p>
          )}
          <p className="break-all font-mono text-[9px] text-muted-foreground/80">
            seal {artifact.seal.slice(0, 32)}…
          </p>
        </div>
        <GlyphMini glyph={glyph} />
      </div>
      <p className="mt-2 text-[9px] leading-snug text-muted-foreground">
        Symbolic excitation — not money, not L1, not a BTC peg.{" "}
        <Link
          to={`/potential?q=${encodeURIComponent(artifact.phrase)}`}
          className="text-amber-200 underline underline-offset-2"
        >
          full ritual
        </Link>
        {" · "}
        <Link
          to={`/glyph?w=${encodeURIComponent(artifact.nucleus)}`}
          className="text-violet-200 underline underline-offset-2"
        >
          glyph
        </Link>
      </p>
    </div>
  );
}
