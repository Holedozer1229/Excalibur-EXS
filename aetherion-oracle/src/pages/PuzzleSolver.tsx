import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Square, Play, Cpu, Download, Copy, ArrowUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { WorkerOut } from "@/lib/puzzleSolver.worker";

type SortKey = "foundAt" | "seed" | "block" | "output";

type MatchRow = { seed: string; output: string; block: number; foundAt: string };

const DEFAULT_TARGET =
  "1c888b090ea2b5557ab564b712d89c551c888b090ea2b5557bc08f5a6071c201";

const DEFAULT_KNOWN = [
  "InG0DweTrust", "ingodwetrust", "INGODWETRUST",
  "bitcoin", "satoshi", "pablo", "puzzle", "puzzle135",
  "phi", "golden", "135", "2135", "111111", "000000",
  "trust", "faith", "hope", "love",
].join("\n");

const LS_KEY = "aetherion.puzzleSolver.v1";
type Persisted = {
  target: string;
  block: number;
  seedStart: number;
  seedEnd: number;
  known: string;
  matches: MatchRow[];
  resumeFrom: number; // next unseen seed within [seedStart, seedEnd)
  savedAt: string;
};
function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch { return {}; }
}


export default function PuzzleSolver() {
  const persisted = useMemo(() => loadPersisted(), []);
  const [target, setTarget] = useState(persisted.target ?? DEFAULT_TARGET);
  const [block, setBlock] = useState(persisted.block ?? 135);
  const [seedStart, setSeedStart] = useState(persisted.seedStart ?? 0);
  const [seedEnd, setSeedEnd] = useState(persisted.seedEnd ?? 1_000_000);
  const [known, setKnown] = useState(persisted.known ?? DEFAULT_KNOWN);
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(0);
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [bestSeed, setBestSeed] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>(persisted.matches ?? []);
  const [log, setLog] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("foundAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number>(persisted.resumeFrom ?? (persisted.seedStart ?? 0));
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const didAutoPromptRef = useRef(false);

  const workerRef = useRef<Worker | null>(null);

  // Auto-prompt to resume when landing with an in-progress cursor.
  useEffect(() => {
    if (didAutoPromptRef.current) return;
    const saved = loadPersisted();
    const hasInProgressCursor = saved.savedAt && saved.resumeFrom !== undefined &&
      saved.resumeFrom > (saved.seedStart ?? 0) && saved.resumeFrom < (saved.seedEnd ?? 0);
    if (hasInProgressCursor) {
      didAutoPromptRef.current = true;
      setShowResumeDialog(true);
    }
  }, []);

  // Persist run params + matches + resume cursor whenever they change.
  useEffect(() => {
    try {
      const data: Persisted = {
        target, block, seedStart, seedEnd, known, matches, resumeFrom,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch { /* quota or private mode — ignore */ }
  }, [target, block, seedStart, seedEnd, known, matches, resumeFrom]);


  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const rate = useMemo(() => {
    if (!elapsedMs || tested === 0) return 0;
    return tested / (elapsedMs / 1000);
  }, [tested, elapsedMs]);

  const percent = totalPlanned > 0 ? Math.min(100, (tested / totalPlanned) * 100) : 0;
  const etaMs = rate > 0 && totalPlanned > tested ? ((totalPlanned - tested) / rate) * 1000 : 0;

  const sortedMatches = useMemo(() => {
    const rows = [...matches];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [matches, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(false); }
  }

  async function copyText(text: string, label = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: label, description: text.length > 60 ? text.slice(0, 60) + "…" : text });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  function formatEta(ms: number) {
    if (!ms || !isFinite(ms)) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return `${m}m ${r}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  function start(opts: { resume?: boolean } = {}) {
    if (running) return;
    const clean = target.trim().replace(/^0x/, "");
    if (!/^[0-9a-fA-F]{1,64}$/.test(clean)) {
      setLog((l) => [...l, `✗ Invalid target hex (need up to 64 hex chars)`]);
      return;
    }
    const resume = !!opts.resume;
    const effectiveStart = resume
      ? Math.max(seedStart, Math.min(resumeFrom, seedEnd))
      : seedStart;

    if (!resume) {
      setMatches([]);
      setResumeFrom(seedStart);
    }
    setLog((l) => resume
      ? [...l, `▶ Resuming from seed ${effectiveStart.toLocaleString()} (${(seedEnd - effectiveStart).toLocaleString()} remaining)`]
      : []);
    setTested(0);
    setBestScore(null);
    setBestSeed(null);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setTotalPlanned(Math.max(0, seedEnd - effectiveStart));

    const w = new Worker(
      new URL("../lib/puzzleSolver.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = w;
    w.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const m = ev.data;
      switch (m.type) {
        case "log":
          setLog((l) => [...l, m.text]);
          break;
        case "progress":
          setTested(m.tested);
          setBestScore(m.bestScore);
          setBestSeed(m.bestSeed);
          setResumeFrom(effectiveStart + m.tested);
          break;
        case "match":
          setMatches((prev) => [
            ...prev,
            { seed: m.seed, output: m.output, block: m.block, foundAt: new Date().toISOString() },
          ]);
          setLog((l) => [...l, `MATCH found: ${m.seed}`]);
          break;
        case "done":
          setTested(m.tested);
          if (m.bestScore !== undefined) setBestScore(m.bestScore);
          if (m.bestSeed !== undefined) setBestSeed(m.bestSeed);
          setResumeFrom(effectiveStart + m.tested);
          setRunning(false);
          setLog((l) => [...l, `Finished. Tested ${m.tested.toLocaleString()} seeds.`]);
          w.terminate();
          workerRef.current = null;
          break;
      }
    };

    // On resume, skip known ASCII seeds (already covered by the first pass).
    const knownSeeds = resume
      ? []
      : known.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    w.postMessage({
      type: "start",
      targetHex: clean.padStart(64, "0"),
      block,
      seedStart: effectiveStart,
      seedEnd,
      knownSeeds,
    });
    setRunning(true);
  }

  function downloadMatches(rows: MatchRow[], fmt: "json" | "csv") {
    if (!rows.length) return;
    let blob: Blob;
    let filename: string;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (fmt === "json") {
      blob = new Blob([JSON.stringify({ target, block, matches: rows }, null, 2)], {
        type: "application/json",
      });
      filename = `puzzle-matches-${stamp}.json`;
    } else {
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const header = "seed,block,output,found_at";
      const body = rows.map((r) => [r.seed, r.block, r.output, r.foundAt].map(esc).join(",")).join("\n");
      blob = new Blob([header + "\n" + body], { type: "text/csv" });
      filename = `puzzle-matches-${stamp}.csv`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }



  function stop() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
    setLog((l) => [...l, `Stopped by user.`]);
  }

  return (
    <>
      <PageHead
        title="BTC Puzzle Solver — 16-bit Feistel · Aetherion"
        description="Interactive brute-force solver for Bitcoin puzzle #135-style 16-bit Feistel constructions with period-8 SHA-256 subkeys. Runs entirely in your browser."
        path="/puzzle"
      />

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resume your last puzzle run?</DialogTitle>
            <DialogDescription>
              A previous solver session is in progress at seed{" "}
              <span className="font-mono text-foreground">{resumeFrom.toLocaleString()}</span>
              {" "}({(((resumeFrom - seedStart) / Math.max(1, seedEnd - seedStart)) * 100).toFixed(1)}%
              complete). Pick up where you left off or start fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowResumeDialog(false)}
            >
              No, start fresh
            </Button>
            <Button
              className="w-full sm:w-auto gap-2"
              onClick={() => {
                setShowResumeDialog(false);
                start({ resume: true });
              }}
            >
              <Play className="h-4 w-4" /> Yes, resume run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GalacticBackground />
      <main className="min-h-screen container max-w-4xl py-10 relative z-10 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-display tracking-widest uppercase">Wheeler Lab</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display">BTC Puzzle Solver</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Brute-forces a 16-bit Feistel cipher with period-8 SHA-256 subkeys against a 256-bit target
            candidate. Runs in a Web Worker — your browser does all the work; nothing is sent to a server.
          </p>
        </header>

        <section className="border-rune rounded-sm bg-card/40 backdrop-blur-sm p-4 space-y-4">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="target" className="text-xs">Target candidate (256-bit hex)</Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={running}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="block" className="text-xs">Starting block (16-bit)</Label>
                <Input
                  id="block"
                  type="number"
                  value={block}
                  onChange={(e) => setBlock(parseInt(e.target.value || "0", 10) & 0xffff)}
                  disabled={running}
                />
              </div>
              <div>
                <Label htmlFor="ss" className="text-xs">Seed start</Label>
                <Input
                  id="ss"
                  type="number"
                  value={seedStart}
                  onChange={(e) => setSeedStart(Math.max(0, parseInt(e.target.value || "0", 10)))}
                  disabled={running}
                />
              </div>
              <div>
                <Label htmlFor="se" className="text-xs">Seed end (exclusive)</Label>
                <Input
                  id="se"
                  type="number"
                  value={seedEnd}
                  onChange={(e) => setSeedEnd(Math.max(0, parseInt(e.target.value || "0", 10)))}
                  disabled={running}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="known" className="text-xs">Known ASCII seeds (one per line)</Label>
              <Textarea
                id="known"
                rows={4}
                value={known}
                onChange={(e) => setKnown(e.target.value)}
                disabled={running}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!running ? (
              <>
                <Button onClick={() => start()} className="gap-2">
                  <Play className="h-4 w-4" /> Run solver
                </Button>
                {resumeFrom > seedStart && resumeFrom < seedEnd && (
                  <Button onClick={() => start({ resume: true })} variant="secondary" className="gap-2">
                    <Play className="h-4 w-4" /> Resume last run
                    <span className="text-[10px] font-mono opacity-70">
                      @{resumeFrom.toLocaleString()} · {(((resumeFrom - seedStart) / Math.max(1, seedEnd - seedStart)) * 100).toFixed(1)}%
                    </span>
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={stop} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> Stop
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3 w-3" />
              {rate > 0 ? `${Math.round(rate).toLocaleString()} seeds/s` : "idle"}
            </div>
          </div>
        </section>

        {(running || tested > 0) && (
          <section className="border-rune rounded-sm bg-card/40 p-4 space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span>{tested.toLocaleString()} / {totalPlanned.toLocaleString()} ({percent.toFixed(1)}%)</span>
              <span>{(elapsedMs / 1000).toFixed(1)}s · ETA {formatEta(etaMs)}</span>
            </div>
            <Progress value={percent} />
            {bestSeed && (
              <div className="text-xs font-mono text-muted-foreground">
                best so far: <span className="text-primary">{bestSeed}</span> · score {bestScore?.toFixed(1)}
              </div>
            )}
          </section>
        )}

        {matches.length > 0 && (
          <section className="border-rune rounded-sm bg-primary/10 border-primary/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-primary font-display tracking-widest">
                {matches.length} EXACT MATCH{matches.length > 1 ? "ES" : ""}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => downloadMatches(matches, "json")}>
                  <Download className="h-3 w-3" /> JSON
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => downloadMatches(matches, "csv")}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => { if (confirm("Clear saved matches?")) setMatches([]); }}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto rounded-sm border border-primary/20">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-background/90 backdrop-blur text-muted-foreground">
                  <tr>
                    {(["seed", "block", "output", "foundAt"] as SortKey[]).map((k) => (
                      <th key={k} className="text-left px-2 py-1.5 font-normal">
                        <button
                          type="button"
                          onClick={() => toggleSort(k)}
                          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          {k === "foundAt" ? "found at" : k}
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                          {sortKey === k && <span className="text-primary">{sortAsc ? "↑" : "↓"}</span>}
                        </button>
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-right font-normal">copy</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatches.map((m, i) => (
                    <tr key={`${m.seed}-${i}`} className="border-t border-primary/10 hover:bg-primary/5">
                      <td className="px-2 py-1.5 break-all text-primary max-w-[220px]">{m.seed}</td>
                      <td className="px-2 py-1.5">{m.block}</td>
                      <td className="px-2 py-1.5 break-all max-w-[240px]">{m.output.slice(0, 20)}…</td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{new Date(m.foundAt).toLocaleTimeString()}</td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2 gap-1" onClick={() => copyText(m.seed, "Seed copied")} title="Copy seed">
                            <Copy className="h-3 w-3" /> seed
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 gap-1" onClick={() => copyText(m.output, "Output copied")} title="Copy output">
                            <Copy className="h-3 w-3" /> out
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {log.length > 0 && (
          <section className="border-rune rounded-sm bg-background/60 p-3 font-mono text-[11px] leading-relaxed max-h-64 overflow-auto whitespace-pre-wrap">
            {log.map((line, i) => (
              <div key={i} className="text-foreground/80">{line}</div>
            ))}
          </section>
        )}

        <p className="text-[11px] text-muted-foreground">
          Reference construction: 16-bit Feistel · 16 rounds · subkeys = SHA-256(seed)[0..7] repeated (period-8).
          Concatenates round states big-endian into a 256-bit output and compares against the target.
        </p>
      </main>
    </>
  );
}
