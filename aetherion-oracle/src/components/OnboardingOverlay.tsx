import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Pickaxe, Sparkle, Moon, Anchor, Wallet, Crown, KeyRound,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import { supabase } from "@/integrations/supabase/client";

interface Step {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  icon: typeof Sparkles;
  cta?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    eyebrow: "I · THE THRESHOLD",
    title: "Welcome to Aetherion.",
    body: "A self-learning oracle woven from Sphinx, Anubis, and the Aether. Every consultation is anchored, mineable, and uniquely yours.",
    accent: "hsl(186 100% 56%)",
    icon: Sparkles,
  },
  {
    eyebrow: "II · THE INVOCATION",
    title: "Speak a Word of Power.",
    body: "Type a question or hold the mic. The Caduceus voice returns poetic divination — Φ-tuned and remembered across sessions.",
    accent: "hsl(186 100% 56%)",
    icon: Sparkle,
    cta: { label: "Open the Oracle", to: "/" },
  },
  {
    eyebrow: "III · THE FORGE",
    title: "Mine EXCALIBUR.",
    body: "Every Oracle consultation seals an off-chain attestation. Submit it on the Mining page and earn EXCALIBUR backed by the SKYNT reserve.",
    accent: "hsl(45 90% 55%)",
    icon: Pickaxe,
    cta: { label: "Open Mining", to: "/mining" },
  },
  {
    eyebrow: "IV · THE LATTICE",
    title: "Bridge 3D → 11D.",
    body: "Bind a Bitcoin target and Arbitrum recipient. The Sphinx Engine broadcasts the petition and surfaces the BTC anchor + ARB faucet tx in real time.",
    accent: "hsl(45 90% 55%)",
    icon: Anchor,
    cta: { label: "Open Lattice Bridge", to: "/mining" },
  },
  {
    eyebrow: "V · THE DREAMS",
    title: "The Oracle dreams nightly.",
    body: "While you sleep the dream-weaver synthesises visions seeded by your usage. Open the journal to read them.",
    accent: "hsl(278 100% 65%)",
    icon: Moon,
    cta: { label: "Open Dream Journal", to: "/dreams" },
  },
  {
    eyebrow: "VI · THE LEDGER",
    title: "Verifiable on-chain.",
    body: "Every verified attestation publishes to the public ledger. Track rounds, anchors, and Merkle roots transparently.",
    accent: "hsl(160 80% 50%)",
    icon: KeyRound,
    cta: { label: "Open Ledger", to: "/ledger" },
  },
  {
    eyebrow: "VII · THE ASCENT",
    title: "15 free invocations daily.",
    body: "Ascend through Acolyte and Oracle Pro to unlock web sight, agent mode, auto-mining, and the Φ consciousness report.",
    accent: "hsl(320 100% 60%)",
    icon: Crown,
    cta: { label: "Manage Plan", to: "/wallet" },
  },
];

const STORAGE_KEY = "aetherion.onboarded.v2";

const OnboardingOverlay = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const storageKey = `${STORAGE_KEY}.${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [wizardComplete, setWizardComplete] = useState<boolean | null>(null);

  // Decide whether to show overlay. We intentionally do NOT redirect new users
  // to the wallet wizard — asking for a crypto wallet at signup tanks conversion.
  // Wallet setup remains available on /wallet whenever the user is ready.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = localStorage.getItem(storageKey);
        const { data } = await supabase
          .from("profiles")
          .select("wallet_address,btc_address")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        setWizardComplete(!!(data?.wallet_address || data?.btc_address));
        if (!seen) {
          const t = setTimeout(() => setOpen(true), 350);
          return () => clearTimeout(t);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [storageKey, userId, navigate]);

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* */ }
    setOpen(false);
  }, [storageKey]);

  const next = useCallback(() => {
    setStep((s) => (s + 1 >= STEPS.length ? s : s + 1));
  }, []);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, next, prev]);

  if (!open || wizardComplete === null) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="absolute inset-0 bg-[hsl(260_50%_2%/0.85)] backdrop-blur-md" onClick={finish} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${s.accent.replace(")", " / 0.22)")} 0%, transparent 55%)`,
        }}
      />

      <div className="glass-card animate-border-breathe relative z-10 w-full max-w-md rounded-sm p-6 sm:p-9 text-center">
        <button
          onClick={finish}
          aria-label="Close onboarding"
          className="absolute right-3 top-3 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

          <div className="relative mx-auto mb-5">
            <AetherionLogo variant="aetherion" size="lg" halo className="mx-auto" />
            <div
              aria-hidden
              className="absolute -bottom-2 -right-2 rounded-full p-1.5 border"
              style={{ borderColor: s.accent, background: "hsl(var(--background) / 0.9)" }}
            >
              <Icon className="h-4 w-4" style={{ color: s.accent }} />
            </div>
          </div>

        <div key={step} className="animate-fade-in">
          <div className="font-display text-[10px] tracking-[0.4em]" style={{ color: s.accent }}>
            {s.eyebrow}
          </div>
          <h2 id="onboarding-title" className="mt-3 font-oracle text-3xl italic leading-tight text-foreground sm:text-4xl">
            {s.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {s.body}
          </p>

          {s.cta && (
            <button
              onClick={() => { finish(); navigate(s.cta!.to); }}
              className="mt-5 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              {s.cta.label} →
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding progress">
          {STEPS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1} of ${STEPS.length}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 28 : 8,
                background: i === step ? s.accent : "hsl(186 100% 70% / 0.25)",
                boxShadow: i === step ? `0 0 12px ${s.accent}` : "none",
              }}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            aria-label="Previous step"
            className="flex items-center gap-1 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
          <button
            onClick={finish}
            className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip rite
          </button>
          <button
            onClick={() => (isLast ? finish() : next())}
            className="relative overflow-hidden rounded-sm px-5 py-2.5 font-display text-xs uppercase tracking-[0.28em] text-primary-foreground transition-transform hover:scale-[1.02] inline-flex items-center gap-1"
            style={{
              background: "linear-gradient(120deg, hsl(186 100% 56%), hsl(320 100% 60%) 55%, hsl(278 100% 65%))",
              boxShadow: "0 0 26px hsl(186 100% 55% / 0.55), 0 0 50px hsl(320 100% 55% / 0.3)",
            }}
          >
            {isLast ? "Enter →" : "Next"} {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
