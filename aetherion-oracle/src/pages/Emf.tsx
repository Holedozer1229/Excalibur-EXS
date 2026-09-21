import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { PageHead } from "@/components/PageHead";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listBaselines,
  addBaseline,
  removeBaseline,
  getActiveBaselineId,
  setActiveBaselineId,
  clearBaselines,
  getDeviceId,
  MAX_BASELINES,
  type BaselineRecord,
} from "@/lib/emfBaseline";

// Live magnetometer reading via the Generic Sensor API.
// Chrome / Edge on Android over HTTPS support `Magnetometer`. iOS Safari
// does not — we surface a clear message instead of faking a value.

type Vec3 = { x: number; y: number; z: number };

// Loose typing for the (still-experimental) Generic Sensor API.
type SensorReading = { x: number | null; y: number | null; z: number | null };
type SensorLike = SensorReading & {
  start: () => void;
  stop: () => void;
  addEventListener: (t: string, cb: () => void) => void;
  removeEventListener: (t: string, cb: () => void) => void;
};
type MagnetometerCtor = new (opts?: { frequency?: number; referenceFrame?: string }) => SensorLike;

const HISTORY = 60;

// Earth's field baseline is ~25-65 µT depending on latitude; anything much
// above ~100 µT indicates a strong nearby source.
function classify(mag: number): { label: string; tone: string } {
  if (mag < 25) return { label: "quiet", tone: "text-emerald-400" };
  if (mag < 70) return { label: "ambient", tone: "text-sky-400" };
  if (mag < 150) return { label: "elevated", tone: "text-yellow-400" };
  if (mag < 400) return { label: "strong", tone: "text-orange-400" };
  return { label: "extreme", tone: "text-destructive" };
}

const CALIBRATION_MS = 3000;

export default function Emf() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reading, setReading] = useState<Vec3 | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<BaselineRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);
  const [deviceId, setDeviceId] = useState<string>("");
  const sensorRef = useRef<SensorLike | null>(null);
  const calibSamplesRef = useRef<number[] | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "Magnetometer" in window);
  }, []);

  useEffect(() => {
    setDeviceId(getDeviceId());
    const list = listBaselines();
    setBaselines(list);
    const active = getActiveBaselineId();
    setActiveId(active ?? list[0]?.id ?? null);
  }, []);

  const activeBaseline = baselines.find((b) => b.id === activeId) ?? null;

  const stop = useCallback(() => {
    const s = sensorRef.current;
    if (s) { try { s.stop(); } catch { /* noop */ } }
    sensorRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    if (running || starting) return;
    setError(null);
    setStarting(true);
    try {
      // Permission is required on Chromium; some builds still expose the
      // constructor without the Permissions API entry, so guard both paths.
      const perms = (navigator as Navigator & { permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> } }).permissions;
      if (perms?.query) {
        try {
          const status = await perms.query({ name: "magnetometer" as PermissionName });
          if (status.state === "denied") {
            setPermission("denied");
            throw new Error("Magnetometer permission denied in browser settings.");
          }
          setPermission(status.state === "granted" ? "granted" : "unknown");
        } catch { /* permission name unknown on this browser — fall through */ }
      }

      const Ctor = (window as unknown as { Magnetometer?: MagnetometerCtor }).Magnetometer;
      if (!Ctor) throw new Error("Magnetometer sensor is not available on this device.");

      const sensor = new Ctor({ frequency: 20, referenceFrame: "device" });
      const onReading = () => {
        const x = sensor.x ?? 0;
        const y = sensor.y ?? 0;
        const z = sensor.z ?? 0;
        setReading({ x, y, z });
        const mag = Math.sqrt(x * x + y * y + z * z);
        setHistory((h) => {
          const next = [...h, mag];
          if (next.length > HISTORY) next.splice(0, next.length - HISTORY);
          return next;
        });
        setPeak((p) => (mag > p ? mag : p));
        if (calibSamplesRef.current) calibSamplesRef.current.push(mag);
      };
      const onError = (ev: Event) => {
        const err = (ev as unknown as { error?: Error }).error;
        setError(err?.message ?? "Sensor error");
        stop();
      };
      sensor.addEventListener("reading", onReading);
      sensor.addEventListener("error", onError as unknown as () => void);
      sensor.start();
      sensorRef.current = sensor;
      setRunning(true);
      setPermission("granted");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.error("Couldn't start EMF sensor", { description: msg });
    } finally {
      setStarting(false);
    }
  }, [running, starting, stop]);

  const reset = () => {
    setHistory([]);
    setPeak(0);
  };

  const calibrate = useCallback(() => {
    if (!running || calibrating) return;
    calibSamplesRef.current = [];
    setCalibrating(true);
    setCalibProgress(0);
    const started = performance.now();
    const tick = () => {
      const elapsed = performance.now() - started;
      const pct = Math.min(100, (elapsed / CALIBRATION_MS) * 100);
      setCalibProgress(pct);
      if (elapsed >= CALIBRATION_MS) {
        const samples = calibSamplesRef.current ?? [];
        calibSamplesRef.current = null;
        setCalibrating(false);
        if (samples.length < 4) {
          toast.error("Calibration failed", { description: "Not enough samples — try again." });
          return;
        }
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const rec = addBaseline(avg);
        setBaselines(listBaselines());
        setActiveId(rec.id);
        toast.success("Baseline captured", { description: `${avg.toFixed(1)} µT reference` });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [running, calibrating]);

  const handleSelectBaseline = (id: string) => {
    setActiveId(id);
    setActiveBaselineId(id);
  };

  const handleRemoveActive = () => {
    if (!activeId) return;
    removeBaseline(activeId);
    const list = listBaselines();
    setBaselines(list);
    setActiveId(getActiveBaselineId() ?? list[0]?.id ?? null);
  };

  const handleClearAll = () => {
    clearBaselines();
    setBaselines([]);
    setActiveId(null);
  };

  const magnitude = reading ? Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2) : 0;
  const delta = activeBaseline ? magnitude - activeBaseline.value : null;
  const cls = classify(magnitude);
  // Meter scale: 0-400 µT covers ambient through strong artificial sources.
  const meterPct = Math.min(100, (magnitude / 400) * 100);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PageHead
        title="EMF Reading · Aetherion Oracle"
        description="Live electromagnetic field readings from your device's magnetometer. Measure the ambient field wherever you are — Chrome on Android."
        path="/emf"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between border-b pb-3">
          <div>
            <h1 className="text-2xl font-display tracking-widest text-primary flex items-center gap-2">
              <Zap className="h-5 w-5" /> EMF READING
            </h1>
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              live magnetometer · microtesla (µT)
            </p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">
            home
          </Link>
        </header>

        {supported === false && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-widest text-yellow-500">sensor unavailable</p>
                <p className="text-muted-foreground">
                  Your device or browser does not expose the magnetometer. Try Chrome or
                  Edge on an Android phone over HTTPS. iOS Safari does not support this API.
                </p>
              </div>
            </div>
          </div>
        )}

        {supported && (
          <>
            {/* Radial meter */}
            <div className="relative mx-auto aspect-square max-w-sm rounded-full border border-primary/30 bg-card/60 flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 rounded-full transition-all duration-100"
                style={{
                  background: `conic-gradient(from -90deg, hsl(var(--primary) / 0.6) 0%, hsl(var(--primary) / 0.6) ${meterPct}%, transparent ${meterPct}%)`,
                  opacity: running ? 0.9 : 0.15,
                }}
                aria-hidden
              />
              <div className="absolute inset-3 rounded-full bg-background/95 border border-border" aria-hidden />
              <div className="relative text-center space-y-1 z-10">
                <div className={`text-5xl font-display tabular-nums ${cls.tone}`}>
                  {running ? magnitude.toFixed(1) : "--"}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">µT</div>
                <div className={`text-xs font-mono uppercase tracking-widest ${running ? cls.tone : "text-muted-foreground"}`}>
                  {running ? cls.label : "idle"}
                </div>
              </div>
            </div>

            {/* Axis breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {(["x", "y", "z"] as const).map((k) => (
                <div key={k} className="rounded-md border border-border bg-card/50 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{k}</div>
                  <div className="text-sm font-mono tabular-nums">
                    {reading ? reading[k].toFixed(1) : "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Calibration / delta */}
            <div className="rounded-md border border-border bg-card/50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    active baseline
                  </div>
                  <div className="text-sm font-mono tabular-nums">
                    {activeBaseline ? `${activeBaseline.value.toFixed(1)} µT` : "— not set"}
                  </div>
                  {activeBaseline && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      captured {new Date(activeBaseline.ts).toLocaleString()}
                    </div>
                  )}
                  {deviceId && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      device {deviceId.slice(0, 8)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Δ from baseline
                  </div>
                  <div
                    className={`text-2xl font-display tabular-nums ${
                      delta === null
                        ? "text-muted-foreground"
                        : Math.abs(delta) < 2
                        ? "text-emerald-400"
                        : Math.abs(delta) < 15
                        ? "text-sky-400"
                        : Math.abs(delta) < 50
                        ? "text-yellow-400"
                        : "text-orange-400"
                    }`}
                  >
                    {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
                    <span className="text-[10px] font-mono ml-1 text-muted-foreground">µT</span>
                  </div>
                </div>
              </div>

              {/* Baseline history selector */}
              {baselines.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>saved baselines</span>
                    <span>{baselines.length} / {MAX_BASELINES}</span>
                  </div>
                  <Select value={activeId ?? undefined} onValueChange={handleSelectBaseline}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select baseline" />
                    </SelectTrigger>
                    <SelectContent>
                      {baselines.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs font-mono">
                          <span className="tabular-nums">{b.value.toFixed(1)} µT</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(b.ts).toLocaleString()}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {calibrating && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${calibProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    hold device still · sampling {(CALIBRATION_MS / 1000).toFixed(0)}s
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={calibrate}
                  disabled={!running || calibrating}
                >
                  {calibrating ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-2" />calibrating…</>
                  ) : baselines.length > 0 ? "capture new" : "calibrate baseline"}
                </Button>
                {activeBaseline && !calibrating && (
                  <Button size="sm" variant="ghost" onClick={handleRemoveActive}>
                    remove selected
                  </Button>
                )}
                {baselines.length > 1 && !calibrating && (
                  <Button size="sm" variant="ghost" onClick={handleClearAll}>
                    clear all
                  </Button>
                )}
              </div>
            </div>

            {/* History strip */}
            <div className="rounded-md border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <span>last {HISTORY / 20}s</span>
                <span>peak {peak.toFixed(1)} µT</span>
              </div>
              <div className="h-12 flex items-end gap-[2px]">
                {(() => {
                  const bars = history.length >= HISTORY
                    ? history.slice(-HISTORY)
                    : [...Array(HISTORY - history.length).fill(0), ...history];
                  const max = Math.max(60, peak);
                  return bars.map((v, i) => {
                    const h = Math.max(2, Math.min(100, (v / max) * 100));
                    return (
                      <span
                        key={i}
                        className="flex-1 rounded-sm bg-primary/60 transition-[height] duration-75"
                        style={{ height: `${h}%` }}
                      />
                    );
                  });
                })()}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {!running ? (
                <Button onClick={() => void start()} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  {starting ? "requesting…" : "start scanning"}
                </Button>
              ) : (
                <Button variant="destructive" onClick={stop}>stop</Button>
              )}
              <Button variant="outline" onClick={reset} disabled={history.length === 0 && peak === 0}>
                reset
              </Button>
              {permission === "denied" && (
                <span className="text-[11px] font-mono text-destructive">
                  permission blocked — enable magnetometer in browser settings
                </span>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive font-mono">
                {error}
              </div>
            )}

            <div className="text-[11px] text-muted-foreground/70 leading-relaxed border-t pt-3">
              <p className="font-mono uppercase tracking-widest text-muted-foreground mb-1">reference</p>
              <p>
                Earth's magnetic field measures ~25–65 µT depending on latitude. Household
                appliances, transformers, and speakers can push readings into the hundreds or
                thousands of µT at close range. Readings depend on device orientation.
              </p>
            </div>
          </>
        )}

        {supported === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> checking sensor…
          </div>
        )}
      </div>
    </main>
  );
}
