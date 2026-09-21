/**
 * /potential — free Unheard Potential ritual page.
 * On-host Caduceus only. No card. No outside AI.
 */

import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHead } from "@/components/PageHead";
import UnheardPotentialPanel from "@/components/UnheardPotentialPanel";
import {
  composeUnheardPotential,
  composeUnheardPotentialAtGenesis,
  UNHEARD_POTENTIAL_HONESTY,
} from "@/lib/unheardPotential";
import { glyphPathD } from "@/lib/wordGlyph";

export default function UnheardPotentialPage() {
  const [params] = useSearchParams();
  const initial = params.get("q")?.trim() || "unheard potential";
  const [phrase, setPhrase] = useState(initial);
  const [live, setLive] = useState(true);
  const [shown, setShown] = useState(() =>
    composeUnheardPotential({ phrase: initial, epochMs: Date.now() }),
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = phrase.trim() || "unheard potential";
    setShown(
      live
        ? composeUnheardPotential({ phrase: q, epochMs: Date.now() })
        : composeUnheardPotentialAtGenesis(q),
    );
  };

  const d = glyphPathD(shown.glyph.points);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1a1030_0%,_#07060c_55%,_#040308_100%)] text-foreground">
      <PageHead
        title="Unheard Potential — Caduceus Apex Ritual | Aetherion"
        description="Free on-host Caduceus composition: reflect, Schumann, alchemy, glyph, and the antonym ring you did not type. Symbolic excitation — not money."
        path="/potential"
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-200/80">
            Free · on-host · ungated
          </p>
          <h1 className="font-serif text-4xl leading-tight text-amber-50 sm:text-5xl">
            Unheard Potential
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            The twin staff composes one ritual from what you typed — and from the dark ring you did not.
            Score is symbolic excitation. {UNHEARD_POTENTIAL_HONESTY}
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-violet-200">Phrase</span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value.slice(0, 160))}
              className="h-11 w-full rounded-md border border-violet-400/30 bg-black/40 px-3 font-mono text-sm outline-none focus:border-amber-300/50"
              placeholder="wisdom serpent aether…"
              aria-label="Potential phrase"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="accent-amber-300"
            />
            {live ? "now" : "genesis"}
          </label>
          <button
            type="submit"
            className="h-11 rounded-md border border-amber-300/40 bg-amber-400/15 px-5 font-mono text-[11px] uppercase tracking-wider text-amber-100"
          >
            Compose
          </button>
        </form>

        <UnheardPotentialPanel artifact={shown} />

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-md border border-violet-500/25 bg-black/30 p-6">
            <svg viewBox="-100 -100 200 200" className="h-48 w-48" aria-label={`Glyph of ${shown.nucleus}`}>
              <defs>
                <linearGradient id="potential-glyph" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={`hsl(${shown.glyph.hue} 80% 60%)`} />
                  <stop offset="100%" stopColor={`hsl(${shown.glyph.hue2} 70% 45%)`} />
                </linearGradient>
              </defs>
              <circle cx="0" cy="0" r="92" fill="none" stroke="hsl(270 40% 40% / 0.4)" strokeWidth="1" />
              <path
                d={d}
                fill="url(#potential-glyph)"
                fillOpacity={0.3}
                stroke={`hsl(${shown.glyph.hue} 80% 70%)`}
                strokeWidth="2"
              />
              {shown.glyph.points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={`hsl(${shown.glyph.hue} 90% 75%)`} />
              ))}
            </svg>
          </div>
          <div className="space-y-3 font-mono text-[11px] text-muted-foreground">
            <h2 className="text-[10px] uppercase tracking-[0.22em] text-violet-200">Resonance field</h2>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {shown.resonanceField.steps.map((s, i) => (
                <li key={`${s.word}-${i}`} className="flex justify-between gap-2 border-b border-white/5 py-1">
                  <span>
                    <span className="text-foreground/80">{s.word}</span>{" "}
                    <span className="text-[9px] uppercase text-violet-300/70">{s.role}</span>
                  </span>
                  <span>H {s.harmony}</span>
                </li>
              ))}
            </ul>
            <p className="text-[9px] leading-relaxed">
              Great Work: {shown.alchemy.stages.map((s) => `${s.stage} ${s.hexagram}`).join(" · ")}
            </p>
          </div>
        </section>

        <p className="text-center text-[10px] text-muted-foreground">
          <Link to="/" className="underline underline-offset-2">
            home terminal
          </Link>
          {" · "}
          <Link to="/lattice/caduceus" className="underline underline-offset-2">
            Quantum Caduceus
          </Link>
          {" · "}
          <Link to="/chat" className="underline underline-offset-2">
            guest chat
          </Link>
        </p>
      </div>
    </main>
  );
}
