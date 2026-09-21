import { useEffect, useRef } from "react";
import type { Octonion } from "@/lib/quantumCaduceus";

type Props = {
  octonion: Octonion;
  harmony: number;
  vibration: number;
  animate?: boolean;
};

const LABELS = ["e₀", "e₁", "e₂", "e₃", "e₄", "e₅", "e₆", "e₇"];

/**
 * The meeting octonion as a rotating 8-spoke sigil. Each basis unit is a spoke
 * whose length and glow track its (signed) amplitude; a woven octagon links
 * them. Canvas so it can breathe at 60fps without re-rendering React.
 */
export default function OctonionSigil({ octonion, harmony, vibration, animate = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  const data = useRef({ octonion, harmony, vibration });
  data.current = { octonion, harmony, vibration };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 340;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const R = 128;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let t = 0;
    const draw = () => {
      const { octonion: o, harmony: h, vibration: vib } = data.current;
      const spin = prefersReduced || !animate ? 0.6 : t * 0.0004 + 0.6;
      ctx.clearRect(0, 0, size, size);

      // Aura — harmony warms the gold.
      const aura = ctx.createRadialGradient(cx, cy, 20, cx, cy, R + 40);
      const warm = Math.round(160 + h * 80);
      aura.addColorStop(0, `rgba(${warm}, ${Math.round(120 + h * 90)}, 40, 0.28)`);
      aura.addColorStop(1, "rgba(10, 8, 14, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 40, 0, Math.PI * 2);
      ctx.fill();

      const pts: { x: number; y: number; amp: number; i: number }[] = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 - Math.PI / 2 + spin;
        const amp = o[i] ?? 0;
        const len = 34 + Math.abs(amp) * R * 0.9;
        pts.push({ x: cx + Math.cos(ang) * len, y: cy + Math.sin(ang) * len, amp, i });
      }

      // Woven octagon (connect every point to the one two steps away → star).
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      for (let step = 1; step <= 3; step++) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const p = pts[i];
          const q = pts[(i + step) % 8];
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }

      // Spokes + nodes.
      for (const p of pts) {
        const pos = p.amp >= 0;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = 1.5 + Math.abs(p.amp) * 4;
        ctx.strokeStyle = pos ? "rgba(252, 211, 77, 0.75)" : "rgba(167, 139, 250, 0.7)";
        ctx.stroke();

        const pulse = prefersReduced ? 0 : Math.sin(t * 0.002 + p.i) * 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + Math.abs(p.amp) * 7 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = pos ? "rgb(253, 230, 138)" : "rgb(196, 181, 253)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = pos ? "rgba(252,211,77,0.8)" : "rgba(167,139,250,0.8)";
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(230, 220, 200, 0.85)";
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lx = cx + Math.cos(Math.atan2(p.y - cy, p.x - cx)) * (R + 24);
        const ly = cy + Math.sin(Math.atan2(p.y - cy, p.x - cx)) * (R + 24);
        ctx.fillText(LABELS[p.i], lx, ly);
      }

      // Core.
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
      core.addColorStop(0, "rgba(255, 245, 210, 0.95)");
      core.addColorStop(1, "rgba(212, 175, 55, 0.1)");
      ctx.fillStyle = core;
      ctx.fill();
      ctx.fillStyle = "rgba(20, 16, 10, 0.9)";
      ctx.font = "8px ui-monospace, monospace";
      ctx.fillText(vib.toFixed(1), cx, cy);

      t += 16;
      if (!prefersReduced && animate) raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [animate]);

  return (
    <canvas
      ref={ref}
      style={{ width: 340, height: 340 }}
      className="mx-auto max-w-full"
      role="img"
      aria-label={`Octonion sigil. Harmony ${harmony.toFixed(2)}, vibration ${vibration.toFixed(1)}.`}
    />
  );
}
