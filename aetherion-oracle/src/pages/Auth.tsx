import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authCallbackUrl } from "@/lib/authRedirect";
import GalacticBackground from "@/components/GalacticBackground";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import { PageHead } from "@/components/PageHead";
import { trackEvent } from "@/lib/funnel";
import { useUtm } from "@/hooks/useUtm";
import {
  FOUNDER_ECONOMICS,
  founderPitch,
  postAuthDestination,
  rememberFounderCheckoutIntent,
} from "@/lib/founderEconomics";


// Live ticker of Words of Power — what people will screenshot.
const POWER_WORDS = [
  "excalibur", "void", "wisdom", "serpent", "caduceus", "lightning",
  "truth", "shadow", "quantum", "entanglement", "singularity", "logos",
  "ouroboros", "aether", "sphinx", "anubis", "phoenix", "tesseract",
];

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  // Rotating Word of Power
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % POWER_WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Capture UTM on landing + fire auth_started on first visit.
  useUtm("auth_started");

  // Persist founder checkout intent before OAuth / email redirects drop the query.
  useEffect(() => {
    rememberFounderCheckoutIntent();
  }, []);

  // Redirect if already signed in + record referral attribution + fire funnel events
  useEffect(() => {
    const goHome = () => navigate(postAuthDestination(), { replace: true });
    const recordRef = async () => {
      try {
        const url = new URL(window.location.href);
        const fromUrl = url.searchParams.get("ref");
        if (fromUrl) localStorage.setItem("aetherion_ref", fromUrl.toUpperCase());
        const code = (localStorage.getItem("aetherion_ref") ?? "").toUpperCase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && code) {
          const { data: ok } = await supabase.rpc("record_referral_signup", { _referred_user_id: user.id, _code: code });
          if (ok) void trackEvent("referral_signup_attributed", { code });
        }
      } catch { /* ignore */ }
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goHome();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (session) {
        if (evt === "SIGNED_IN") void trackEvent("auth_completed");
        recordRef();
        goHome();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Construct awake — free access is open.");
          navigate(postAuthDestination(), { replace: true });
          return;
        }
        // Confirmations may be required; inbox delivery depends on the auth email hook.
        toast.success("Check your inbox to confirm — or try signing in if the signal already landed.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message || "Sign-in failed.";
          if (/confirm|not confirmed|email not confirmed/i.test(msg)) {
            toast.error("Confirm the link in your inbox first. If nothing arrived, check spam or try Google.");
          } else {
            toast.error(msg);
          }
          return;
        }
        toast.success("The construct opens.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown disturbance.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    // Always return to the dedicated callback so PKCE ?code= is exchanged reliably.
    const redirectTo = authCallbackUrl();
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          queryParams: { access_type: "online", prompt: "select_account" },
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error("Google sign-in could not start. Try again, or use email.");
      setGoogleLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      toast.error(
        /provider is not enabled|unsupported provider|oauth secret/i.test(msg)
          ? "Google sign-in is being set up. Use email for now."
          : /redirect|url not allowed|not allowed/i.test(msg)
            ? "Google sent us back to an address that isn't allowed yet. Use email, or try again shortly."
            : msg,
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <PageHead
        title="Sign in to Aetherion — The Self-Learning Oracle"
        description="Open the gate to Aetherion: a self-learning symbolic oracle with EXCALIBUR mining and a 3D→11D Lattice Bridge. Sign in or create your seeker account."
        path="/auth"
      />

      <GalacticBackground mode="lite" intensity={0.75} />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center px-5 pt-10 pb-16 sm:pt-16 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:pt-24">
        {/* ───── Hero column ───── */}
        <section className="flex w-full max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          <AetherionLogo variant="aetherion" size="xl" halo priority className="mb-6 sm:mb-8" />

          {/* Terminal eyebrow */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-[hsl(186_100%_70%/0.3)] bg-[hsl(260_40%_5%/0.7)] px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--neon-cyan))] shadow-[0_0_10px_hsl(var(--neon-cyan))]" />
            <span className="font-tech text-[11px] text-[hsl(var(--neon-cyan))]">
              &gt; ORACLE_LINK :: ONLINE
            </span>
          </div>

          {/* Hero headline — Audiowide letters burst from the logo */}
          <h1
            className="font-saga neon-block scanlines whitespace-nowrap text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-[5.2rem]"
            aria-label="Aetherion — Sign in to the Self-Learning Oracle"
          >

            {"AETHERION".split("").map((ch, i) => {
              const center = 4;
              const offset = i - center;
              const burstX = `${offset * -18}px`;
              const burstY = `${-150 - Math.abs(offset) * 8}px`;
              const burstR = `${offset * -8}deg`;
              return (
                <span
                  key={i}
                  aria-hidden
                  className="animate-letter-burst"
                  style={{
                    animationDelay: `${0.15 + i * 0.08}s`,
                    ["--burst-x" as never]: burstX,
                    ["--burst-y" as never]: burstY,
                    ["--burst-r" as never]: burstR,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </h1>

          {/* CRT subhead with blinking cursor */}
          <p className="mt-4 font-crt text-xl text-[hsl(var(--neon-lime))] sm:text-2xl" style={{ textShadow: "0 0 12px hsl(var(--neon-lime) / 0.7)" }}>
            &gt; the self-learning oracle<span className="term-cursor" />
          </p>

          {/* Rotating Word of Power — terminal style */}
          <div className="mt-7 flex items-baseline gap-3">
            <span className="font-tech text-[11px] text-[hsl(var(--neon-cyan))]">
              [ WORD::TONIGHT ] ::=
            </span>
            <div className="relative h-7 w-44 overflow-hidden">
              <span
                key={wordIdx}
                className="absolute inset-0 animate-word-rise font-saga text-2xl text-[hsl(var(--neon-magenta))]"
                style={{ textShadow: "0 0 18px hsl(320 100% 65% / 0.8), 0 0 38px hsl(320 100% 60% / 0.5)" }}
              >
                {POWER_WORDS[wordIdx]}
              </span>
            </div>
          </div>

          {/* Subhead — terminal mono */}
          <p className="mt-6 max-w-md font-crt text-lg leading-snug text-foreground/80 sm:text-xl">
            &gt; the oracle that cannot rewrite itself — sealed tarot, dreams &amp;
            Caduceus on this host. Free to awaken.
          </p>

          {/* Early-bird Founders banner — moved above the fold to drive conversion */}
          <a
            href="#enter"
            className="mt-7 group relative block w-full max-w-md overflow-hidden rounded-sm border-2 border-[hsl(320_100%_60%/0.7)] bg-gradient-to-br from-[hsl(320_100%_60%/0.18)] via-[hsl(260_50%_8%/0.85)] to-[hsl(278_100%_65%/0.18)] p-4 shadow-[0_0_36px_hsl(320_100%_55%/0.45)] transition-transform hover:scale-[1.015]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display uppercase tracking-[0.32em] text-[10px] text-[hsl(var(--neon-magenta))] animate-pulse">
                ★ Founders 50 · Early-Bird
              </span>
              <span className="rounded-sm border border-[hsl(320_100%_60%/0.6)] bg-[hsl(320_100%_60%/0.15)] px-2 py-0.5 font-mono text-[10px] tracking-widest text-[hsl(var(--neon-magenta))]">
                LIMITED
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-saga text-3xl text-foreground sm:text-4xl">{FOUNDER_ECONOMICS.labelFirst}</span>
              <span className="font-mono text-xs text-muted-foreground">{FOUNDER_ECONOMICS.labelInterval}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground/70 line-through">{FOUNDER_ECONOMICS.labelRenew}/mo</span>
            </div>
            <p className="mt-1.5 text-left font-crt text-[12px] leading-snug text-foreground/80">
              Full <span className="text-[hsl(var(--neon-magenta))]">Oracle Pro</span> — unlimited tarot, dreams, petitions &amp; the Caduceus voice. {founderPitch()}
            </p>
            <div className="mt-3 font-display text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--neon-cyan))]">
              Sign in → Stripe checkout opens → first of {FOUNDER_ECONOMICS.seatCap} seats →
            </div>
          </a>

          {/* Stat strip */}
          <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3 text-center sm:gap-6">
            <div>
              <div className="font-saga text-3xl text-[hsl(var(--neon-cyan))] sm:text-4xl" style={{ textShadow: "0 0 14px hsl(var(--neon-cyan) / 0.7)" }}>∞</div>
              <div className="font-tech text-[10px] text-muted-foreground/70">FREE ACCESS</div>
            </div>
            <div className="border-x border-[hsl(186_100%_70%/0.15)]">
              <div className="font-saga text-3xl text-[hsl(var(--neon-magenta))] sm:text-4xl" style={{ textShadow: "0 0 14px hsl(var(--neon-magenta) / 0.7)" }}>∞</div>
              <div className="font-tech text-[10px] text-muted-foreground/70">SYMBOLS</div>
            </div>
            <div>
              <div className="font-saga text-3xl text-[hsl(var(--neon-violet))] sm:text-4xl" style={{ textShadow: "0 0 14px hsl(var(--neon-violet) / 0.7)" }}>64</div>
              <div className="font-tech text-[10px] text-muted-foreground/70">HEXAGRAMS</div>
            </div>
          </div>
        </section>

        {/* ───── Invocation card ───── */}
        <section id="enter" className="relative mt-12 w-full max-w-md lg:mt-0">
          <div className="glass-card animate-border-breathe scanlines relative rounded-sm p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="font-tech text-[11px] text-[hsl(var(--neon-cyan))]">
                &gt; {mode === "signup" ? "AWAKEN_CONSTRUCT.exe" : "RE_ENTRY_RITE.exe"}
              </div>
              <h2 className="mt-2 font-saga neon-block text-xl sm:text-2xl">
                {mode === "signup" ? "Awaken free — ungated" : "Re-enter the Aether"}
              </h2>
              <p className="mt-2 font-crt text-[12px] text-muted-foreground">
                {mode === "signup"
                  ? "No card · free Caduceus + tarot · optional Founder upgrades"
                  : "Welcome back, seeker"}
              </p>
            </div>

            <button
              type="button"
              onClick={signInGoogle}
              disabled={googleLoading || loading}
              className="group mb-4 flex w-full items-center justify-center gap-3 rounded-sm border border-[hsl(186_100%_70%/0.22)] bg-[hsl(260_40%_8%/0.7)] px-4 py-2.5 font-display text-xs uppercase tracking-widest text-foreground/90 transition-all hover:border-[hsl(var(--neon-magenta))] hover:bg-[hsl(260_40%_12%/0.85)] hover:text-[hsl(var(--neon-cyan))] hover:shadow-[0_0_30px_hsl(186_100%_55%/0.35)] disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#FFC107" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
                <path fill="#4CAF50" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.29-1.71V4.96H.92A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33Z"/>
                <path fill="#1976D2" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.92v2.34A9 9 0 0 0 9 18Z"/>
              </svg>
              {googleLoading ? "Channeling…" : "Continue with Google"}
            </button>

            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground/60">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(186_100%_60%/0.3)] to-transparent" />
              or by cipher
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsl(186_100%_60%/0.3)] to-transparent" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="font-display text-[10px] uppercase tracking-widest text-[hsl(var(--neon-cyan))]">
                  Signal (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-sm border border-[hsl(186_100%_70%/0.18)] bg-[hsl(260_40%_5%/0.6)] px-3 py-2.5 font-mono text-sm transition-colors placeholder:text-muted-foreground focus:border-[hsl(var(--neon-cyan))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--neon-cyan))]"
                  placeholder="you@construct.io"
                />
              </div>
              <div>
                <label className="font-display text-[10px] uppercase tracking-widest text-[hsl(var(--neon-magenta))]">
                  Cipher (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="mt-1.5 w-full rounded-sm border border-[hsl(186_100%_70%/0.18)] bg-[hsl(260_40%_5%/0.6)] px-3 py-2.5 font-mono text-sm transition-colors placeholder:text-muted-foreground focus:border-[hsl(var(--neon-magenta))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--neon-magenta))]"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="relative w-full overflow-hidden rounded-sm px-5 py-3 font-display text-sm uppercase tracking-[0.25em] text-primary-foreground transition-all disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(120deg, hsl(186 100% 56%), hsl(320 100% 60%) 55%, hsl(278 100% 65%))",
                  boxShadow:
                    "0 0 32px hsl(186 100% 55% / 0.55), 0 0 60px hsl(320 100% 55% / 0.35)",
                }}
              >
                <span className="relative z-10">
                  {loading ? "Channeling…" : mode === "signup" ? "Awaken construct — Free" : "Cross the threshold"}
                </span>
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-xs text-muted-foreground transition-colors hover:text-[hsl(var(--neon-cyan))]"
              >
                {mode === "signin" ? "No account yet? Awaken one →" : "Already initiated? Sign in →"}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  disabled={resetLoading || !email}
                  onClick={async () => {
                    if (!email) { toast.error("Enter your signal (email) first."); return; }
                    setResetLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast.success("A recovery signal has been dispatched. Check your inbox.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to send recovery signal.");
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  className="text-[11px] text-muted-foreground/70 transition-colors hover:text-[hsl(var(--neon-magenta))] disabled:opacity-50"
                >
                  {resetLoading ? "Dispatching…" : "Forgot your cipher? Send recovery signal →"}
                </button>
              )}
            </div>

            <p className="mt-6 text-center font-display text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              Free Seeker access · no card required
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 pb-8 font-tech text-[10px] uppercase tracking-widest text-muted-foreground/60">
        <span>© {new Date().getFullYear()} Aetherion</span>
        <span className="flex gap-4">
          <a href="/terms" className="hover:text-[hsl(var(--neon-cyan))]">Terms</a>
          <a href="/privacy" className="hover:text-[hsl(var(--neon-cyan))]">Privacy</a>
          <a href="/refund" className="hover:text-[hsl(var(--neon-cyan))]">Refund</a>
          <a href="mailto:support@aetherion.lovable.app" className="hover:text-[hsl(var(--neon-cyan))]">Contact</a>
        </span>
      </footer>
    </div>
  );
};

export default Auth;
