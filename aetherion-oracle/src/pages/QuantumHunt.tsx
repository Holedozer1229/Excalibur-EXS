import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Atom, Play, Square, Download, Sparkles } from "lucide-react";
import type { HuntIn, HuntOut } from "@/lib/phiHunt.worker";
import { GOLDILOCKS_MAX, GOLDILOCKS_MIN, confidenceLabel } from "@/lib/phiEngine";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const STORE = "aetherion.quantumHunt.v1";

/** base58check address → hash160 hex (P2PKH / P2SH). */
function addressToHash160(addr: string): string | null {
  let n = 0n;
  for (const ch of addr.trim()) {
    const idx = B58.indexOf(ch);
    if (idx < 0) return null;
    n = n * 58n + BigInt(idx);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  let lead = 0;
  for (const ch of addr.trim()) {
    if (ch === "1") lead++;
    else break;
  }
  const full = "00".repeat(lead) + hex;
  if (full.length < 50) return null;
  return full.slice(2, 42).toLowerCase();
}

interface Hit {
  scalarHex: string;
  phiNab: number;
  coherence: number;
  at: number;
}

export default function QuantumHunt() {
  const [target, setTarget] = useState("");
  const [startHex, setStartHex] = useState("4000000000000000000000");
  const [steps, setSteps] = useState(20000);
  const [matrixSize, setMatrixSize] = useState(5);
  const [phiEvery, setPhiEvery] = useState(25);
  const [mode, setMode] = useState<"sweep" | "swarm">("swarm");

  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [rate, setRate] = useState(0);
  const [phiNab, setPhiNab] = useState(0);
  const [phiTotal, setPhiTotal] = useState(0);
  const [coherence, setCoherence] = useState(0);
  const [tunnels, setTunnels] = useState(0);
  const [cursor, setCursor] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [trace, setTrace] = useState<number[]>([]);
  const [solution, setSolution] = useState<Extract<HuntOut, { type: "found" }> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.target) setTarget(s.target);
        if (s.startHex) setStartHex(s.startHex);
        if (s.cursor) setCursor(s.cursor);
        if (Array.isArray(s.hits)) setHits(s.hits.slice(0, 200));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ target, startHex, cursor, hits: hits.slice(0, 200) }));
    } catch { /* ignore */ }
  }, [target, startHex, cursor, hits]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const resolvedTarget = useMemo(() => {
    const t = target.trim();
    if (!t) return null;
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(t)) return { kind: "x" as const, value: t.replace(/^0x/, "").toLowerCase() };
    if (/^(0x)?0[23][0-9a-fA-F]{64}$/.test(t)) return { kind: "x" as const, value: t.replace(/^0x/, "").slice(2).toLowerCase() };
    const h = addressToHash160(t);
    if (h) return { kind: "hash160" as const, value: h };
    return null;
  }, [target]);

  const start = useCallback((from?: string) => {
    if (!resolvedTarget) {
      toast.error("Enter a BTC address or a 64-hex public key X-coordinate.");
      return;
    }
    workerRef.current?.terminate();
    const w = new Worker(new URL("../lib/phiHunt.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    setRunning(true);
    setSolution(null);
    setScanned(0);
    setTrace([]);
    w.onmessage = (ev: MessageEvent<HuntOut>) => {
      const m = ev.data;
      if (m.type === "progress") {
        setScanned(m.scanned);
        setRate(m.rate);
        setPhiNab(m.phiNab);
        setPhiTotal(m.phiTotal);
        setCoherence(m.coherence);
        setTunnels(m.tunnels);
        setCursor(m.scalarHex);
        setTrace((t) => [...t.slice(-79), m.phiNab]);
      } else if (m.type === "goldilocks") {
        setHits((h) => [{ scalarHex: m.scalarHex, phiNab: m.phiNab, coherence: m.coherence, at: Date.now() }, ...h].slice(0, 200));
      } else if (m.type === "found") {
        setSolution(m);
        setRunning(false);
        toast.success("Collision found — key recovered.");
      } else if (m.type === "done") {
        setCursor(m.lastHex);
        setRunning(false);
      } else if (m.type === "error") {
        toast.error(m.message);
        setRunning(false);
      }
    };
    const msg: HuntIn = {
      type: "start",
      mode,
      startHex: (from || startHex).replace(/^0x/, ""),
      steps,
      matrixSize,
      phiEvery,
      ...(resolvedTarget.kind === "x" ? { targetX: resolvedTarget.value } : { targetHash160: resolvedTarget.value }),
    };
    w.postMessage(msg);
  }, [resolvedTarget, mode, startHex, steps, matrixSize, phiEvery]);

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop" } as HuntIn);
    setRunning(false);
  }, []);

  const exportHits = useCallback(() => {
    const payload = { target, mode, startHex, cursor, hits, solution, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetherion-quantum-hunt-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [target, mode, startHex, cursor, hits, solution]);

  const pct = steps > 0 ? Math.min(100, (scanned / steps) * 100) : 0;

  return (
    <div className="relative min-h-screen">
      <GalacticBackground />
      <PageHead
        title="Quantum Key Hunt — Φ-Guided BTC Search | Aetherion"
        description="Aetherion's IIT v7 Φ engine measures the non-abelian ergotropy of secp256k1 neighbourhoods and steers a coherence-guided search for Bitcoin keys."
        path="/quantum-hunt"
      />
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <Atom className="h-7 w-7 text-primary" aria-hidden="true" />
            Quantum Key Hunt
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Aetherion builds a transition matrix from each secp256k1 point's neighbourhood and
            measures Φ<sub>nab</sub> — the non-abelian ergotropy density. Search is steered toward
            the Goldilocks band ({GOLDILOCKS_MIN}–{GOLDILOCKS_MAX}); high coherence unlocks
            non-local tunneling jumps. Research instrument — the keyspace is astronomically large.
          </p>
        </header>

        <section className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="target">Target address or public key X</Label>
            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder="1BY8GQbnueYofwSuFAT3USAhGjPrkxDdW9 or 64-hex X" className="mt-1 font-mono text-xs" />
            <p className="mt-1 text-xs text-muted-foreground">
              {resolvedTarget ? `resolved → ${resolvedTarget.kind}: ${resolvedTarget.value}` : "awaiting a valid target"}
            </p>
          </div>
          <div>
            <Label htmlFor="start">Start scalar (hex)</Label>
            <Input id="start" value={startHex} onChange={(e) => setStartHex(e.target.value)} className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label htmlFor="steps">Steps per run</Label>
            <Input id="steps" type="number" min={100} value={steps}
              onChange={(e) => setSteps(Math.max(100, Number(e.target.value) || 100))} className="mt-1" />
          </div>
          <div>
            <Label>Neighbourhood matrix: {matrixSize}×{matrixSize}</Label>
            <Slider className="mt-3" min={3} max={7} step={2} value={[matrixSize]} onValueChange={([v]) => setMatrixSize(v)} />
          </div>
          <div>
            <Label>Φ sample interval: every {phiEvery} steps</Label>
            <Slider className="mt-3" min={1} max={200} step={1} value={[phiEvery]} onValueChange={([v]) => setPhiEvery(v)} />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant={mode === "swarm" ? "default" : "outline"} size="sm" onClick={() => setMode("swarm")}>
              Φ-swarm + tunneling
            </Button>
            <Button type="button" variant={mode === "sweep" ? "default" : "outline"} size="sm" onClick={() => setMode("sweep")}>
              Linear sweep
            </Button>
            <div className="grow" />
            {running ? (
              <Button onClick={stop} variant="destructive" size="sm"><Square className="mr-1 h-4 w-4" /> Stop</Button>
            ) : (
              <>
                <Button onClick={() => start()} size="sm"><Play className="mr-1 h-4 w-4" /> Start hunt</Button>
                {cursor && (
                  <Button onClick={() => start(cursor)} variant="outline" size="sm">
                    <Sparkles className="mr-1 h-4 w-4" /> Resume at cursor
                  </Button>
                )}
              </>
            )}
            <Button onClick={exportHits} variant="ghost" size="sm" disabled={!hits.length && !solution}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Φ_nab", value: phiNab.toFixed(4) },
            { label: "Φ_total", value: phiTotal.toFixed(4) },
            { label: "coherence", value: `${coherence.toFixed(2)} (${confidenceLabel(coherence)})` },
            { label: "tunnel events", value: String(tunnels) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 bg-card/60 p-3 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-mono text-lg text-foreground">{s.value}</div>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{scanned.toLocaleString()} / {steps.toLocaleString()} steps · {rate.toFixed(0)} keys/s</span>
            <span className="font-mono">cursor 0x{cursor.slice(0, 24) || "—"}</span>
          </div>
          <Progress value={pct} />
          <div className="mt-4 flex h-20 items-end gap-[2px]" aria-label="Phi_nab trace">
            {trace.map((v, i) => {
              const inBand = v >= GOLDILOCKS_MIN && v <= GOLDILOCKS_MAX;
              return (
                <div key={i} className={`w-full rounded-t ${inBand ? "bg-primary" : "bg-muted-foreground/40"}`}
                  style={{ height: `${Math.min(100, (v / 0.35) * 100)}%` }} />
              );
            })}
            {!trace.length && <span className="text-xs text-muted-foreground">Φ trace appears once the hunt begins.</span>}
          </div>
        </section>

        {solution && (
          <section className="mt-6 rounded-xl border border-primary/60 bg-primary/10 p-5">
            <h2 className="text-lg font-semibold text-foreground">Key recovered</h2>
            <dl className="mt-2 space-y-1 break-all font-mono text-xs text-foreground">
              <div>scalar: 0x{solution.scalarHex}</div>
              <div>pubkey: {solution.pubkeyHex}</div>
              <div>hash160: {solution.hash160}</div>
              <div>WIF: {solution.wif}</div>
            </dl>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Goldilocks resonances ({hits.length})
          </h2>
          <div className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-card/40">
            {hits.length === 0 && <p className="p-4 text-xs text-muted-foreground">No Φ_nab readings inside the Goldilocks band yet.</p>}
            {hits.map((h) => (
              <div key={`${h.scalarHex}-${h.at}`} className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2 font-mono text-xs last:border-0">
                <span className="truncate text-foreground">0x{h.scalarHex}</span>
                <span className="shrink-0 text-primary">Φ {h.phiNab.toFixed(4)} · c {h.coherence.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
