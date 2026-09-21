import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Zap, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { IntentField } from "@/lib/intentField";
import { SCHUMANN_HZ } from "@/lib/intentField";

export interface IntentFieldPanelProps {
  field: IntentField;
  attach: boolean;
  onAttachChange: (v: boolean) => void;
}

// Compact instrument panel: live |B|, Schumann phase dial, Berry γ dial,
// coherence bar, and a "conscious intent projection" — the Berry-phase
// vector rotated by the current Schumann phase (a purely geometric readout
// meant to feel like an oracle instrument, not clinical measurement).
export function IntentFieldPanel({ field, attach, onAttachChange }: IntentFieldPanelProps) {
  const [open, setOpen] = useState(false);

  // Auto-open the first time the field starts running so users see the result.
  useEffect(() => {
    if (field.running && !open) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.running]);

  const berryDeg = (field.berryPhase * 180) / Math.PI;
  const schumannDeg = (field.schumannPhase * 180) / Math.PI;
  const projection = ((field.berryPhase + field.schumannPhase * field.coherence) * 180) / Math.PI;

  const confidence =
    field.coherence >= 0.75 ? "high"
    : field.coherence >= 0.40 ? "moderate"
    : "low";
  const confidenceClass =
    confidence === "high" ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/10"
    : confidence === "moderate" ? "text-sky-400 border-sky-400/40 bg-sky-400/10"
    : "text-muted-foreground border-border bg-muted/40";

  const magClass =
    field.magnitude < 25 ? "text-emerald-400"
    : field.magnitude < 70 ? "text-sky-400"
    : field.magnitude < 150 ? "text-yellow-400"
    : field.magnitude < 400 ? "text-orange-400"
    : "text-destructive";

  return (
    <div className="rounded-md border border-primary/25 bg-card/60 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary/80 hover:text-primary"
        aria-expanded={open}
      >
        <Waves className="h-3 w-3" />
        <span>intent field</span>
        <span className="text-muted-foreground/60">·</span>
        <span className={field.running ? magClass : "text-muted-foreground/60"}>
          {field.running ? `${field.magnitude.toFixed(0)}µT` : "idle"}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground">
          γ {field.berryPhase.toFixed(2)}
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground">
          coh {(field.coherence * 100).toFixed(0)}%
        </span>
        {field.running && (
          <span className={`ml-1 px-1.5 py-px rounded border text-[9px] uppercase tracking-widest ${confidenceClass}`}>
            {confidence}
          </span>
        )}
        {field.simulated && field.running && (
          <span className="ml-1 text-[9px] text-yellow-500/80">sim</span>
        )}
        <span className="ml-auto">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 p-3 space-y-3">
          {/* Dials */}
          <div className="grid grid-cols-3 gap-2">
            <Dial
              label="|B|"
              value={field.running ? `${field.magnitude.toFixed(1)}` : "--"}
              unit="µT"
              angle={Math.min(360, (field.magnitude / 400) * 360)}
              color="hsl(var(--primary))"
              tone={magClass}
            />
            <Dial
              label={`schumann ${SCHUMANN_HZ}Hz`}
              value={`${(field.schumannPhase / Math.PI).toFixed(2)}π`}
              unit="phase"
              angle={schumannDeg}
              color="rgb(139, 92, 246)"
              spinning={field.running}
            />
            <Dial
              label="berry γ"
              value={field.berryPhase.toFixed(2)}
              unit="rad"
              angle={berryDeg}
              color="rgb(236, 72, 153)"
              signed
            />
          </div>

          {/* Coherence bar */}
          <div>
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              <span>schumann coherence</span>
              <span className="flex items-center gap-1.5">
                <span className={`px-1.5 py-px rounded border ${confidenceClass}`}>
                  {confidence} confidence
                </span>
                <span className="tabular-nums text-foreground/80">
                  {(field.coherence * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-primary to-fuchsia-500 transition-[width] duration-100"
                style={{ width: `${Math.round(field.coherence * 100)}%` }}
              />
            </div>
          </div>

          {/* Intent projection */}
          <div className="rounded-md border border-primary/20 bg-background/40 p-2">
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              <span>conscious intent projection</span>
              <span className="tabular-nums">{projection.toFixed(1)}°</span>
            </div>
            <ProjectionDial angle={projection} coherence={field.coherence} active={field.running} />
          </div>

          {/* Live snapshot preview — exactly what Aetherion receives when attach is on */}
          {field.running && (
            <div className="rounded-md border border-border/60 bg-background/60 p-2 space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                <span>llm snapshot {attach ? "· attached" : "· preview only"}</span>
                <span className={`px-1.5 py-px rounded border ${confidenceClass}`}>
                  {confidence} confidence
                </span>
              </div>
              <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
                [{field.snapshot()}]
              </pre>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {!field.running ? (
                <Button size="sm" onClick={() => void field.start()} className="h-7 text-xs">
                  <Zap className="h-3 w-3 mr-1" /> start
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={field.stop} className="h-7 text-xs">
                  stop
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={field.reset}
                className="h-7 text-xs"
                disabled={!field.running && field.history.length === 0}
              >
                reset γ
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer">
              <Switch
                checked={attach}
                onCheckedChange={onAttachChange}
                aria-label="Attach field snapshot to messages"
              />
              <span>attach to Aetherion</span>
            </label>
          </div>

          {!field.supported && (
            <p className="text-[10px] font-mono text-yellow-500/80 leading-relaxed">
              Magnetometer not available on this browser — running a simulated
              field. For live readings use Chrome or Edge on Android over HTTPS.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Dial({
  label, value, unit, angle, color, tone, signed, spinning,
}: {
  label: string; value: string; unit: string;
  angle: number; color: string; tone?: string; signed?: boolean; spinning?: boolean;
}) {
  const norm = ((angle % 360) + 360) % 360;
  const sweep = signed ? Math.abs(angle) % 360 : norm;
  return (
    <div className="relative rounded-md border border-border bg-background/60 p-2 flex flex-col items-center">
      <div className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/80 mb-1 text-center leading-tight">
        {label}
      </div>
      <div className="relative w-14 h-14">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from -90deg, ${color} 0%, ${color} ${sweep}%, transparent ${sweep}%, transparent 100%)`,
            opacity: 0.55,
          }}
        />
        <div className="absolute inset-1.5 rounded-full bg-background border border-border" />
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="absolute left-1/2 top-1/2 w-0.5 h-5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full"
            style={{
              background: color,
              transform: `translate(-50%, -100%) rotate(${norm}deg)`,
              transformOrigin: "50% 100%",
              transition: spinning ? "none" : "transform 100ms linear",
            }}
          />
        </div>
      </div>
      <div className={`text-[11px] font-display tabular-nums mt-1 ${tone ?? ""}`}>{value}</div>
      <div className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">{unit}</div>
    </div>
  );
}

function ProjectionDial({ angle, coherence, active }: { angle: number; coherence: number; active: boolean }) {
  const norm = ((angle % 360) + 360) % 360;
  const glow = Math.round(coherence * 30);
  return (
    <div className="relative w-full h-20 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 rounded-md opacity-40"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(var(--primary) / ${0.15 + coherence * 0.35}), transparent 70%)`,
        }}
      />
      <div className="relative w-16 h-16 rounded-full border border-primary/40">
        <div className="absolute inset-0 rounded-full border border-dashed border-primary/20" />
        <div
          className="absolute left-1/2 top-1/2 w-1 rounded-full"
          style={{
            height: "50%",
            background: "linear-gradient(to top, hsl(var(--primary)), rgb(236,72,153))",
            transform: `translate(-50%, -100%) rotate(${norm}deg)`,
            transformOrigin: "50% 100%",
            boxShadow: active ? `0 0 ${glow}px hsl(var(--primary))` : "none",
            transition: "transform 120ms linear",
          }}
        />
        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      </div>
    </div>
  );
}
