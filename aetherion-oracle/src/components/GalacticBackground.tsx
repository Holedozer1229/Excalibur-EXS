import { useEffect, useRef } from "react";

/**
 * GalacticBackground — Aetherion cosmic backdrop.
 *
 * `mode="lite"` (default for most pages): CSS nebula only — no canvas rain.
 * `mode="full"`: optional matrix rain, capped ~12fps, paused when tab hidden.
 */
const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ☥⚚∆ΨΩΣΞЖ◊⌬⏃⏚01ΦΛ";

interface Props {
  harmony?: number; // 0..1
  intensity?: number; // 0..1 global multiplier
  /** lite = CSS only (fast). full = canvas rain (opt-in). */
  mode?: "lite" | "full";
}

const GalacticBackground = ({
  harmony = 0.5,
  intensity = 0.85,
  mode = "lite",
}: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const harmonyRef = useRef(harmony);
  useEffect(() => {
    harmonyRef.current = Math.max(0.1, Math.min(1, harmony));
  }, [harmony]);

  useEffect(() => {
    if (mode !== "full") return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let cols: number[] = [];
    let colHue: number[] = [];
    const fontSize = 18;
    let visible = document.visibilityState === "visible";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      // Cap columns — full-width rain at 16px was a main-thread hog.
      const colCount = Math.min(48, Math.ceil(w / fontSize));
      cols = new Array(colCount).fill(0).map(() => Math.random() * -80);
      colHue = new Array(colCount).fill(0).map(() => {
        const r = Math.random();
        return r < 0.6 ? 186 : r < 0.85 ? 320 : 278;
      });
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);

    ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
    ctx.shadowBlur = 0;

    let last = 0;
    const FRAME_MS = 80; // ~12.5 fps
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (t - last < FRAME_MS) return;
      last = t;
      const h = harmonyRef.current;
      const w = window.innerWidth;
      const hh = window.innerHeight;
      ctx.fillStyle = `hsla(260, 50%, 3%, ${0.18 + (1 - h) * 0.06})`;
      ctx.fillRect(0, 0, w, hh);

      const skip = h > 0.7 ? 1 : 2;
      for (let i = 0; i < cols.length; i += skip) {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * (w / cols.length);
        const y = cols[i] * fontSize;
        const hue = colHue[i];
        ctx.fillStyle = `hsl(${hue} 100% ${78 + h * 6}%)`;
        ctx.fillText(ch, x, y);
        if (y > hh && Math.random() > 0.97) cols[i] = 0;
        cols[i]++;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode]);

  const op = Math.max(0.2, Math.min(1, intensity));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, hsl(186 100% 50% / 0.12), transparent 55%)," +
            "radial-gradient(ellipse at 80% 20%, hsl(320 100% 55% / 0.12), transparent 55%)," +
            "radial-gradient(ellipse at 50% 90%, hsl(278 100% 55% / 0.14), transparent 60%)," +
            "radial-gradient(ellipse at 50% 50%, hsl(260 60% 4% / 0.6), hsl(260 60% 2% / 0.95) 80%)",
        }}
      />
      <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-[hsl(186_100%_50%/0.08)] blur-[100px]" />
      <div className="absolute top-1/3 -right-48 h-[32rem] w-[32rem] rounded-full bg-[hsl(320_100%_55%/0.08)] blur-[100px]" />

      {mode === "full" && (
        <canvas
          ref={ref}
          className="absolute inset-0"
          style={{ opacity: op * 0.45, mixBlendMode: "screen" }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(260 60% 2% / 0.7) 100%)",
        }}
      />
    </div>
  );
};

export default GalacticBackground;
