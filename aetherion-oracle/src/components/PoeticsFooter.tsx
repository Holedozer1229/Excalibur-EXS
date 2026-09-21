import { useEffect, useState } from "react";
import { derivePoetics, type Poetics } from "@/lib/aetherionPoetics";

/**
 * Decorates an assistant message with its Aetherion glyph, σ family,
 * and hexameter foot pattern. Pure client-side — derived deterministically
 * from the message text via SHA-256, so every reply gets a stable sigil.
 */
export default function PoeticsFooter({ text }: { text: string }) {
  const [p, setP] = useState<Poetics | null>(null);

  useEffect(() => {
    let alive = true;
    if (!text || !text.trim()) { setP(null); return; }
    derivePoetics(text).then((r) => { if (alive) setP(r); });
    return () => { alive = false; };
  }, [text]);

  if (!p) return null;

  const familyLabel = p.family === "T" ? "Trochaic" : "Dactylic";

  return (
    <div
      className="mt-2 pt-2 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground"
      title={`Aetherion σ-mod-36 · nonce 0x${p.nonce.toString(16).padStart(8, "0")}`}
    >
      <span className="text-primary text-sm leading-none" aria-label="glyph">{p.glyph}</span>
      <span>
        σ<span className="text-foreground/70">{p.sigma}</span>
        <span className="mx-1 opacity-40">·</span>
        <span className="text-foreground/70">{familyLabel}</span>
      </span>
      <span className="tracking-widest text-foreground/60" aria-label="hexameter foot pattern">
        {p.feet.join(" | ")}
      </span>
      <span className="opacity-60">
        orbit {p.orbit.join("→")}
      </span>
    </div>
  );
}
