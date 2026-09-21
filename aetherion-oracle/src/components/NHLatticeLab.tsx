import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  nhSSHBands,
  nhSSHPhase,
  hatanoNelsonPBC,
  hatanoNelsonOBC,
  hnWinding,
  skinProfile,
  skinLocalization,
  ptDimer,
  encircleEP,
  type Cx,
} from "@/lib/nhLattice";

const GOLD = "#d4af37";
const VIOLET = "#a78bfa";
const ROSE = "#fb7185";
const CYAN = "#67e8f9";

function useHiDPICanvas(w: number, h: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
  }, [w, h]);
  return { ref, ctxRef };
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, title: string) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8,8,12,0.6)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(212,175,55,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = "rgba(230,220,200,0.85)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, 8, 6);
}

function axes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  xr: [number, number],
  yr: [number, number],
  pad = 28,
) {
  const [x0, x1] = xr;
  const [y0, y1] = yr;
  const X = (x: number) => pad + ((x - x0) / (x1 - x0)) * (w - 2 * pad);
  const Y = (y: number) => h - pad - ((y - y0) / (y1 - y0)) * (h - 2 * pad);
  ctx.strokeStyle = "rgba(160,160,180,0.25)";
  ctx.lineWidth = 1;
  if (y0 < 0 && y1 > 0) {
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(0));
    ctx.lineTo(X(x1), Y(0));
    ctx.stroke();
  }
  if (x0 < 0 && x1 > 0) {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(y0));
    ctx.lineTo(X(0), Y(y1));
    ctx.stroke();
  }
  return { X, Y };
}

function polyline(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], color: string, width = 2, dashed = false) {
  if (!pts.length) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, r = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Panel 1 — NH-SSH complex band structure E(k). */
function BandPanel({ t1, t2, gamma }: { t1: number; t2: number; gamma: number }) {
  const W = 300;
  const H = 220;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      frame(ctx, W, H, "a · NH-SSH bands  E(k)");
      const bands = nhSSHBands({ t1, t2, gamma }, 180);
      const ymax = Math.max(1e-3, ...bands.flatMap((b) => [Math.abs(b.plus.re), Math.abs(b.plus.im)])) * 1.15;
      const { X, Y } = axes(ctx, W, H, [0, 2 * Math.PI], [-ymax, ymax]);
      const map = (arr: Cx[]) => bands.map((b, i) => ({ x: X(b.k), y: Y(arr[i].re) }));
      const mapIm = (arr: Cx[]) => bands.map((b, i) => ({ x: X(b.k), y: Y(arr[i].im) }));
      polyline(ctx, map(bands.map((b) => b.plus)), GOLD, 2);
      polyline(ctx, map(bands.map((b) => b.minus)), ROSE, 2);
      polyline(ctx, mapIm(bands.map((b) => b.plus)), CYAN, 1.5, true);
      polyline(ctx, mapIm(bands.map((b) => b.minus)), VIOLET, 1.5, true);
      ctx.fillStyle = "rgba(200,200,210,0.7)";
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [t1, t2, gamma, ctxRef]);
  return <canvas ref={ref} className="w-full max-w-[300px] rounded-sm" style={{ width: W, height: H }} />;
}

/** Panel 2 — Hatano-Nelson PBC ellipse vs OBC line + winding. */
function HatanoPanel({ t, gamma }: { t: number; gamma: number }) {
  const W = 300;
  const H = 220;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  const winding = hnWinding({ t, gamma });
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    frame(ctx, W, H, "b · Hatano-Nelson  PBC vs OBC");
    const pbc = hatanoNelsonPBC({ t, gamma }, 160);
    const obc = hatanoNelsonOBC({ t, gamma }, 40);
    const R = Math.max(2 * Math.abs(t), Math.abs(gamma), 0.5) * 1.2;
    const { X, Y } = axes(ctx, W, H, [-R, R], [-R, R]);
    polyline(ctx, pbc.map((p) => ({ x: X(p.re), y: Y(p.im) })), GOLD, 2);
    obc.forEach((p) => dot(ctx, X(p.re), Y(p.im), CYAN, 2));
    dot(ctx, X(0), Y(0), ROSE, 3);
    ctx.fillStyle = "rgba(200,200,210,0.8)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`winding w=${winding}`, W - 8, H - 26);
    ctx.fillText("ellipse=PBC · dots=OBC", W - 8, H - 14);
  }, [t, gamma, winding, ctxRef]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="w-full rounded-md" />;
}

/** Panel 3 — Skin-effect site envelope |ψ_n|². */
function SkinPanel({ t, gamma }: { t: number; gamma: number }) {
  const W = 300;
  const H = 220;
  const N = 50;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  const loc = skinLocalization({ t, gamma });
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    frame(ctx, W, H, "c · Skin effect  |ψ(n)|²");
    const prof = skinProfile({ t, gamma }, N);
    const ymax = Math.max(...prof, 1e-3) * 1.1;
    const pad = 28;
    const bw = (W - 2 * pad) / N;
    prof.forEach((p, n) => {
      const x = pad + n * bw;
      const bh = (p / ymax) * (H - 2 * pad);
      const g = ctx.createLinearGradient(0, H - pad - bh, 0, H - pad);
      g.addColorStop(0, GOLD);
      g.addColorStop(1, "rgba(212,175,55,0.15)");
      ctx.fillStyle = g;
      ctx.fillRect(x, H - pad - bh, Math.max(1, bw - 1), bh);
    });
    ctx.fillStyle = "rgba(200,200,210,0.8)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(loc === "extended" ? "extended (γ=0)" : `localized → ${loc}`, W - 8, H - 14);
    ctx.textAlign = "left";
    ctx.fillText("site n", pad, H - 14);
  }, [t, gamma, loc, ctxRef]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="w-full rounded-md" />;
}

/** Panel 4 — PT dimer eigenvalues vs γ/κ, with a live marker. */
function PTPanel({ gamma, kappa }: { gamma: number; kappa: number }) {
  const W = 300;
  const H = 220;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  const pt = ptDimer(gamma, kappa);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    frame(ctx, W, H, "d · PT dimer  E±(γ/κ)");
    const gmax = 2;
    const { X, Y } = axes(ctx, W, H, [0, gmax], [-1.4, 1.4]);
    const reP: { x: number; y: number }[] = [];
    const reM: { x: number; y: number }[] = [];
    const imP: { x: number; y: number }[] = [];
    const imM: { x: number; y: number }[] = [];
    for (let i = 0; i <= 200; i++) {
      const g = (i / 200) * gmax;
      const e = ptDimer(g * Math.max(kappa, 1e-6), Math.max(kappa, 1e-6));
      reP.push({ x: X(g), y: Y(e.plus.re) });
      reM.push({ x: X(g), y: Y(e.minus.re) });
      imP.push({ x: X(g), y: Y(e.plus.im) });
      imM.push({ x: X(g), y: Y(e.minus.im) });
    }
    polyline(ctx, reP, GOLD, 1.5);
    polyline(ctx, reM, ROSE, 1.5);
    polyline(ctx, imP, CYAN, 1.5, true);
    polyline(ctx, imM, VIOLET, 1.5, true);
    // EP marker at γ/κ = 1.
    const gRatio = kappa > 0 ? gamma / kappa : 0;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(Math.min(gRatio, gmax)), Y(-1.4));
    ctx.lineTo(X(Math.min(gRatio, gmax)), Y(1.4));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(230,220,200,0.9)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(pt.regime, W - 8, H - 14);
  }, [gamma, kappa, pt.regime, ctxRef]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="w-full rounded-md" />;
}

/** Panel 5 — Encircling an EP: eigenvalues braid over θ:0→2π. */
function BraidPanel() {
  const W = 300;
  const H = 220;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  const [theta, setTheta] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTheta(2 * Math.PI);
      return;
    }
    let t = 0;
    const tick = () => {
      t = (t + 0.02) % (2 * Math.PI);
      setTheta(t);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    frame(ctx, W, H, "e · Encircle an EP  (braid)");
    const path = encircleEP(1, 120);
    const { X, Y } = axes(ctx, W, H, [-1.3, 1.3], [-1.3, 1.3]);
    polyline(ctx, path.map((p) => ({ x: X(p.plus.re), y: Y(p.plus.im) })), "rgba(212,175,55,0.5)", 1.5);
    polyline(ctx, path.map((p) => ({ x: X(p.minus.re), y: Y(p.minus.im) })), "rgba(251,113,133,0.5)", 1.5);
    const amp = 1;
    const pRe = amp * Math.cos(theta / 2);
    const pIm = amp * Math.sin(theta / 2);
    dot(ctx, X(pRe), Y(pIm), GOLD, 5);
    dot(ctx, X(-pRe), Y(-pIm), ROSE, 5);
    ctx.fillStyle = "rgba(230,220,200,0.9)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`θ=${((theta / Math.PI) * 180).toFixed(0)}° · swap@360°`, W - 8, H - 14);
  }, [theta, ctxRef]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="w-full rounded-md" />;
}

/** Panel 6 — NH-SSH phase diagram, marker follows the sliders. */
function PhasePanel({ t1, t2, gamma }: { t1: number; t2: number; gamma: number }) {
  const W = 300;
  const H = 220;
  const { ref, ctxRef } = useHiDPICanvas(W, H);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    frame(ctx, W, H, "f · NH-SSH phase diagram");
    const xr: [number, number] = [0, 3];
    const yr: [number, number] = [0, 2];
    const pad = 28;
    const X = (x: number) => pad + ((x - xr[0]) / (xr[1] - xr[0])) * (W - 2 * pad);
    const Y = (y: number) => H - pad - ((y - yr[0]) / (yr[1] - yr[0])) * (H - 2 * pad);
    // Shade PT-broken cells (scan t2/t1 × γ/t1) for t1=1.
    const step = 3;
    for (let px = pad; px < W - pad; px += step) {
      for (let py = pad; py < H - pad; py += step) {
        const t2r = xr[0] + ((px - pad) / (W - 2 * pad)) * (xr[1] - xr[0]);
        const gr = yr[0] + ((H - pad - py) / (H - 2 * pad)) * (yr[1] - yr[0]);
        const ph = nhSSHPhase({ t1: 1, t2: t2r, gamma: gr });
        const topo = ph.phase.startsWith("topological");
        const broken = ph.phase.endsWith("PT-broken");
        ctx.fillStyle = broken
          ? topo ? "rgba(251,113,133,0.28)" : "rgba(167,139,250,0.22)"
          : topo ? "rgba(212,175,55,0.20)" : "rgba(80,90,120,0.15)";
        ctx.fillRect(px, py, step, step);
      }
    }
    // t2=t1 topological boundary.
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(1), Y(yr[0]));
    ctx.lineTo(X(1), Y(yr[1]));
    ctx.stroke();
    ctx.setLineDash([]);
    // Current point.
    const t2r = t1 !== 0 ? t2 / Math.abs(t1) : t2;
    const gr = t1 !== 0 ? Math.abs(gamma) / Math.abs(t1) : Math.abs(gamma);
    dot(ctx, X(Math.min(t2r, xr[1])), Y(Math.min(gr, yr[1])), "#ffffff", 4);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(Math.min(t2r, xr[1])), Y(Math.min(gr, yr[1])), 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,200,210,0.8)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("t₂/t₁ →", pad, H - 14);
    ctx.save();
    ctx.translate(10, H - pad);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("γ/t₁ →", 0, 0);
    ctx.restore();
  }, [t1, t2, gamma, ctxRef]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="w-full rounded-md" />;
}

function Ctrl({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-amber-200">{value.toFixed(2)}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export type NHLabFocus = "all" | "ssh" | "hatano" | "ep";

export default function NHLatticeLab({ focus = "all" }: { focus?: NHLabFocus }) {
  const [t1, setT1] = useState(1);
  const [t2, setT2] = useState(0.6);
  const [gamma, setGamma] = useState(0.8);
  const [t, setT] = useState(1);
  const [hnGamma, setHnGamma] = useState(0.7);
  const [kappa, setKappa] = useState(1);
  const [ptGamma, setPtGamma] = useState(0.6);

  const phase = useMemo(() => nhSSHPhase({ t1, t2, gamma }), [t1, t2, gamma]);
  const showSsh = focus === "all" || focus === "ssh";
  const showHatano = focus === "all" || focus === "hatano";
  const showEp = focus === "all" || focus === "ep";

  return (
    <div className="space-y-6">
      {showSsh && (
      <div className="rounded-lg border border-border/60 bg-card/60 p-4 backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-amber-200">Non-reciprocal SSH</h3>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
            {phase.phase}{phase.onEPLine ? " · on EP line" : ""}
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
          <Ctrl label="t₁ (intra)" value={t1} min={0} max={2} step={0.02} onChange={setT1} />
          <Ctrl label="t₂ (inter)" value={t2} min={0} max={3} step={0.02} onChange={setT2} />
          <Ctrl label="γ (non-recip.)" value={gamma} min={0} max={2} step={0.02} onChange={setGamma} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <BandPanel t1={t1} t2={t2} gamma={gamma} />
          <PhasePanel t1={t1} t2={t2} gamma={gamma} />
        </div>
      </div>
      )}

      {showHatano && (
      <div className="rounded-lg border border-border/60 bg-card/60 p-4 backdrop-blur">
        <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-amber-200">Hatano-Nelson skin effect</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Ctrl label="t (hop)" value={t} min={0.1} max={2} step={0.02} onChange={setT} />
          <Ctrl label="γ (asymmetry)" value={hnGamma} min={0} max={2} step={0.02} onChange={setHnGamma} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <HatanoPanel t={t} gamma={hnGamma} />
          <SkinPanel t={t} gamma={hnGamma} />
        </div>
      </div>
      )}

      {showEp && (
      <div className="rounded-lg border border-border/60 bg-card/60 p-4 backdrop-blur">
        <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-amber-200">Exceptional points</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Ctrl label="γ (gain/loss)" value={ptGamma} min={0} max={2} step={0.02} onChange={setPtGamma} />
          <Ctrl label="κ (coupling)" value={kappa} min={0.1} max={2} step={0.02} onChange={setKappa} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PTPanel gamma={ptGamma} kappa={kappa} />
          <BraidPanel />
        </div>
      </div>
      )}
    </div>
  );
}
