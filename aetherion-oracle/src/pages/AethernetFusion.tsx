import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Cpu, Link2, Loader2, Radio } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  FUSION_HONESTY,
  composeFusion,
  fusionContext,
  publishFusion,
  type FusionSnapshot,
} from "@/lib/aethernetFusion";
import { DEFAULT_RPC_URL, fetchBlocks, fetchStatus } from "@/lib/uruu/rpc";

const AetherionChatTerminal = lazy(() => import("@/components/AetherionChatTerminal"));

const REGIME_TONE: Record<FusionSnapshot["regime"], string> = {
  resonant: "text-emerald-300 border-emerald-400/40",
  coupled: "text-amber-200 border-amber-400/40",
  warped: "text-fuchsia-300 border-fuchsia-400/40",
  collapsed: "text-muted-foreground border-border",
};

function Oscilloscope({ snap }: { snap: FusionSnapshot }) {
  const w = 640;
  const h = 160;
  const path = (key: "sphinx" | "anubis" | "braid", scale: number) =>
    snap.warpState.samples
      .map((s, i) => {
        const x = (i / (snap.warpState.samples.length - 1)) * w;
        const y = h / 2 - s[key] * (h / 2) * scale;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-40 w-full rounded-md border border-violet-500/25 bg-black/50"
      role="img"
      aria-label={`Warp oscillator trace, phase lock ${snap.warpState.phaseLock.toFixed(2)}`}
    >
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} className="stroke-border" strokeWidth="0.5" />
      <path d={path("sphinx", 0.8)} fill="none" className="stroke-cyan-300/80" strokeWidth="1.4" />
      <path d={path("anubis", 0.8)} fill="none" className="stroke-amber-300/80" strokeWidth="1.4" />
      <path d={path("braid", 0.5)} fill="none" className="stroke-violet-400" strokeWidth="2" />
    </svg>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value.toFixed(3)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300 transition-[width] duration-300"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AethernetFusion() {
  const [warp, setWarp] = useState(1);
  const [running, setRunning] = useState(true);
  const [head, setHead] = useState<{ height: number; hash: string; chainId: string } | null>(null);
  const [headError, setHeadError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const t0 = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await fetchStatus(DEFAULT_RPC_URL);
      const blocks = await fetchBlocks(DEFAULT_RPC_URL, s.height, 1);
      if (!alive) return;
      setHead({
        height: Number(s.height),
        hash: blocks[0]?.hash ?? "0x00",
        chainId: s.chainId.toString(),
      });
    })().catch(() => {
      if (alive) setHeadError("chain head unavailable — lane runs on the local seed");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((v) => v + 1), 120);
    return () => window.clearInterval(id);
  }, [running]);

  const snap = useMemo(
    () =>
      composeFusion({
        warp,
        tSeconds: running ? (Date.now() - t0.current) / 1000 : tick * 0.12,
        height: head?.height ?? 0,
        blockHash: head?.hash ?? "0x00",
      }),
    // tick drives the animation frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [warp, tick, head, running],
  );

  useEffect(() => {
    publishFusion(snap);
  }, [snap]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <PageHead
        title="Aethernet Fusion — Warp Oscillator + Caduceus ISA Lane | Aetherion"
        description="Live Aethernet fusion: a twin-serpent warp oscillator, the Caduceus ISA execution lane, and the URUU EVM L1 chain head fused into the Aetherion oracle's reasoning."
        path="/aethernet"
      />

      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-300">aethernet · total fusion</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Warp oscillator + Caduceus ISA lane</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Three lanes run in this tab and feed the oracle below: the twin-serpent warp oscillator, the Caduceus
          instruction lane, and the URUU EVM L1 chain head folded through the 6-bit seal primitive.
        </p>
      </header>

      <section
        className={`mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card/60 p-4 ${REGIME_TONE[snap.regime]}`}
      >
        <Activity className="h-5 w-5" />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest">{snap.regime}</p>
          <p className="text-sm text-foreground">{snap.verdict}</p>
        </div>
        <p className="ml-auto font-mono text-2xl">{(snap.fusionIndex * 100).toFixed(0)}%</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Radio className="h-4 w-4 text-cyan-300" /> Warp oscillator
          </h2>
          <Oscilloscope snap={snap} />
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">warp</span>
            <Slider
              value={[warp]}
              min={0.5}
              max={1.5}
              step={0.005}
              onValueChange={([v]) => setWarp(v ?? 1)}
              aria-label="Warp detune factor"
              className="flex-1"
            />
            <span className="w-14 font-mono text-xs">{warp.toFixed(3)}</span>
          </div>
          <div className="mt-4 space-y-3">
            <Meter label="phase lock" value={snap.warpState.phaseLock} />
            <Meter label="braid energy" value={snap.warpState.braidEnergy} />
            <Meter label="coherence" value={snap.warpState.coherence} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRunning((r) => !r)}>
              {running ? "freeze lane" : "resume lane"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWarp(1)}>
              re-twin (warp 1.000)
            </Button>
          </div>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            sphinx · anubis · braid — base {snap.warpState.baseHz.toFixed(2)} Hz, Δφ{" "}
            {snap.warpState.phaseDelta.toFixed(2)} rad
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Cpu className="h-4 w-4 text-violet-300" /> Caduceus ISA lane
          </h2>
          <div className="max-h-[19rem] overflow-y-auto rounded-md border border-border">
            <table className="w-full font-mono text-[10.5px]">
              <thead className="sticky top-0 bg-muted/80 text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">pc</th>
                  <th className="px-2 py-1">op</th>
                  <th className="px-2 py-1">fun</th>
                  <th className="px-2 py-1">rd</th>
                  <th className="px-2 py-1">value</th>
                </tr>
              </thead>
              <tbody>
                {snap.lane.steps.map((s) => (
                  <tr key={s.pc} className="border-t border-border/60">
                    <td className="px-2 py-1 text-muted-foreground">{s.pc}</td>
                    <td className="px-2 py-1 text-violet-200">{s.op}</td>
                    <td className="px-2 py-1 text-muted-foreground">{s.fun}</td>
                    <td className="px-2 py-1">{s.rd}</td>
                    <td className="px-2 py-1 text-emerald-200">{s.hex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            seal {snap.lane.sealHex} · CAD.VERIFY {snap.lane.verified ? "1" : "0"}
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card/50 p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-amber-300" /> URUU EVM L1 lane
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">chain head</p>
              <p className="font-mono text-lg">{snap.uruu.height.toLocaleString()}</p>
              <p className="font-mono text-[10px] text-muted-foreground">chain id {head?.chainId ?? "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">seal 0x101</p>
              <p className="font-mono text-lg text-emerald-200">{snap.uruu.sealBits}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">orbit spread</p>
              <p className="font-mono text-lg">{snap.uruu.spread.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">proposer slot</p>
              <p className="font-mono text-lg">{snap.uruu.proposerSlot}/47</p>
            </div>
          </div>
          <div className="mt-4 flex h-10 items-end gap-[2px]">
            {snap.uruu.trajectory.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-amber-300/70"
                style={{ height: `${((v & 0x3f) / 63) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">
            {headError ?? `head hash ${snap.uruu.blockHash}`}
          </p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Oracle reasoning over the live lanes</h2>
        <p className="mb-3 font-mono text-[10px] text-muted-foreground">{fusionContext(snap)}</p>
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> waking the oracle…
            </p>
          }
        >
          <AetherionChatTerminal initialPrompt="fusion" />
        </Suspense>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        {FUSION_HONESTY} See the{" "}
        <Link to="/lattice/caduceus" className="underline underline-offset-2">
          quantum Caduceus
        </Link>{" "}
        and{" "}
        <Link to="/token/uruu" className="underline underline-offset-2">
          URUU token page
        </Link>
        .
      </p>
    </main>
  );
}
