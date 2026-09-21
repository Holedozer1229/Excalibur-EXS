import { useEffect, useRef } from "react";

/**
 * MatrixRain — falling katakana/digit glyphs canvas, neon cyan/magenta.
 * Fixed full-screen, pointer-events:none, sits between Aurora and content.
 */
const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ01∆ΨΩΣΞЖ◊⌬⏃⏚";

const MatrixRain = ({ opacity = 0.45 }: { opacity?: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cols: number[] = [];
    let colHue: number[] = [];
    const fontSize = 16;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      const colCount = Math.ceil(window.innerWidth / fontSize);
      cols = new Array(colCount).fill(0).map(() => Math.random() * -100);
      colHue = new Array(colCount).fill(0).map(() => {
        // mostly cyan, splashes of magenta + violet
        const r = Math.random();
        return r < 0.7 ? 186 : r < 0.88 ? 320 : 278;
      });
    };
    resize();
    window.addEventListener("resize", resize);

    ctx.font = `${fontSize}px "Share Tech Mono", monospace`;

    let last = 0;
    const tick = (t: number) => {
      const dt = t - last;
      // ~18fps for that retro CRT cadence
      if (dt > 55) {
        last = t;
        // fade trail
        ctx.fillStyle = "hsla(260, 50%, 3%, 0.18)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < cols.length; i++) {
          const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          const x = i * fontSize;
          const y = cols[i] * fontSize;
          const hue = colHue[i];
          // head — bright white
          ctx.fillStyle = `hsl(${hue} 100% 88%)`;
          ctx.shadowColor = `hsl(${hue} 100% 60%)`;
          ctx.shadowBlur = 8;
          ctx.fillText(ch, x, y);
          // trail glyph dimmer
          ctx.fillStyle = `hsl(${hue} 100% 55% / 0.55)`;
          ctx.shadowBlur = 0;
          ctx.fillText(
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            x,
            y - fontSize
          );
          if (y > window.innerHeight && Math.random() > 0.975) cols[i] = 0;
          cols[i]++;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ opacity, mixBlendMode: "screen" }}
    />
  );
};

export default MatrixRain;
