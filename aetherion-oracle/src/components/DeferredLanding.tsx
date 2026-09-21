/**
 * Deferred / on-demand landing loaders.
 * Nothing heavy mounts until the user clicks Run (or scrolls near, for rare cases).
 */
import {
  Suspense,
  lazy,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareQuote, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function SoftFallback({ h = "12rem" }: { h?: string }) {
  return (
    <div
      className="w-full animate-pulse border border-primary/15 bg-primary/[0.04]"
      style={{ minHeight: h }}
      aria-hidden
    />
  );
}

/** Click-to-run lazy panel — zero JS cost until the button is pressed. */
export function RunOnDemand({
  label,
  blurb,
  href,
  height = "12rem",
  loader,
}: {
  label: string;
  blurb: string;
  href?: string;
  height?: string;
  loader: () => Promise<{ default: ComponentType<any> }>;
}) {
  const [run, setRun] = useState(false);
  const Comp = useState(() => lazy(loader))[0];

  if (!run) {
    return (
      <div className="flex flex-col gap-3 border-l-2 border-primary/40 py-2 pl-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left">
          <div className="font-saga text-base tracking-wide">{label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 font-display text-[10px] uppercase tracking-widest"
            onClick={() => setRun(true)}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          {href && (
            <Button asChild size="sm" variant="outline" className="h-9 font-display text-[10px] uppercase tracking-widest">
              <Link to={href}>
                Open <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border border-primary/20 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[10px] uppercase tracking-widest text-primary">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground"
          onClick={() => setRun(false)}
          aria-label={`Close ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Suspense fallback={<SoftFallback h={height} />}>
        <Comp />
      </Suspense>
    </div>
  );
}

/** Landing Caduceus — link out; do not mount the chat bundle on `/`. */
export function DeferredTerminal() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          className="h-12 bg-primary font-display text-xs tracking-[0.18em] text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/chat">
            <MessageSquareQuote className="mr-2 h-4 w-4" />
            Open Caduceus
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 font-display text-xs tracking-[0.18em]">
          <Link to="/tarot">Cast tarot</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 font-display text-xs tracking-[0.18em]">
          <Link to="/chipset">QAI chipset</Link>
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Heavy modules load only after you choose a destination.
      </p>
    </div>
  );
}

export function DeferredTetra() {
  return (
    <RunOnDemand
      label="EXS Tetra-PoW"
      blurb="Host-chain forge — compact miner"
      href="/exs"
      height="10rem"
      loader={() =>
        import("@/components/TetraPowMiner").then((m) => ({
          default: () => <m.default compact />,
        }))
      }
    />
  );
}

export function DeferredWrap() {
  return (
    <RunOnDemand
      label="Wrap console"
      blurb="Bridge tooling — compact"
      href="/wrap"
      height="10rem"
      loader={() =>
        import("@/components/WrapConsole").then((m) => ({
          default: () => <m.default compact />,
        }))
      }
    />
  );
}

export function DeferredHelm() {
  return (
    <RunOnDemand
      label="Helm dashboard"
      blurb="Operator instruments"
      href="/war-chest"
      height="16rem"
      loader={() => import("@/components/helm/HelmDashboard")}
    />
  );
}

export function DeferredUruu() {
  return (
    <RunOnDemand
      label="URUU showcase"
      blurb="zkSync liquidity strip"
      href="/buy/uruu"
      height="14rem"
      loader={() => import("@/components/UruuShowcase")}
    />
  );
}

/** CSS-only nebula for landing — no canvas matrix rain. Optional AQAI chip wash. */
export function DeferredGalactic({ children }: { children?: ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.22] mix-blend-screen"
          style={{
            backgroundImage: "url(/chipset/aqai-chip-bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, hsl(186 100% 50% / 0.10), transparent 55%)," +
              "radial-gradient(ellipse at 80% 20%, hsl(320 100% 55% / 0.10), transparent 55%)," +
              "radial-gradient(ellipse at 50% 90%, hsl(278 100% 55% / 0.12), transparent 60%)," +
              "radial-gradient(ellipse at 50% 50%, hsl(260 60% 4% / 0.55), hsl(260 60% 2% / 0.95) 80%)",
          }}
        />
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-[hsl(186_100%_50%/0.08)] blur-[120px]" />
        <div className="absolute top-1/3 -right-48 h-[32rem] w-[32rem] rounded-full bg-[hsl(320_100%_55%/0.08)] blur-[120px]" />
      </div>
      {children}
    </>
  );
}
