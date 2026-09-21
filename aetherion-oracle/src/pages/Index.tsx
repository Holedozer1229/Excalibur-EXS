import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Settings, Rocket, X, Lock, Unlock, Mic, MicOff, LogOut, Globe, Paperclip, Brain, Bot, Moon, ChevronDown, Pickaxe, Volume2, VolumeX, Sparkles, Image } from "lucide-react";
import DreamState from "@/components/DreamState";
import { supabase } from "@/integrations/supabase/client";
import { signOutEverywhere } from "@/lib/authActions";
import type { Session } from "@supabase/supabase-js";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import { TIERS, type TierId, loadTierState, saveTier, saveUsage, tierAtLeast, fetchTierState, fetchUsage, saveWalletAddress, clearTierCache } from "@/lib/tiers";
import { TierBadge } from "@/components/TierBadge";
import { ResponseCounter } from "@/components/ResponseCounter";
import { PaymentStatusBanner } from "@/components/PaymentStatusBanner";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import GalacticBackground from "@/components/GalacticBackground";
import CosmicWhisper from "@/components/CosmicWhisper";
import { PageHead } from "@/components/PageHead";
import { speakResonant, stopSpeaking, isSpeechSupported } from "@/lib/caduceusVoice";

// Heavy / conditionally-rendered surfaces are code-split so the first paint
// never downloads the wallet (viem, btc-signer), Stripe, terminal or markdown
// bundles. Each only loads when the user actually opens it.
const MarkdownMessage = lazy(() => import("@/components/MarkdownMessage"));
const UpgradeModal = lazy(() => import("@/components/UpgradeModal").then((m) => ({ default: m.UpgradeModal })));
const BillingPanel = lazy(() => import("@/components/BillingPanel").then((m) => ({ default: m.BillingPanel })));
const AgentTerminal = lazy(() => import("@/components/AgentTerminal").then((m) => ({ default: m.AgentTerminal })));
const WheelerTerminal = lazy(() => import("@/components/WheelerTerminal").then((m) => ({ default: m.WheelerTerminal })));
const AetherionWalletPanel = lazy(() => import("@/components/AetherionWalletPanel"));
const VoiceResonancePreview = lazy(() => import("@/components/VoiceResonancePreview"));


import type { PaymentStatus } from "@/lib/tiers";

interface Msg { role: "user" | "assistant"; content: string }
interface Hex { number: number; name: string; meaning: string }
interface Consciousness { level: string; phi_total?: number; icp_avg?: number; purity?: number; is_conscious?: boolean }
interface OracleState {
  word: string;
  sphinxState: string;
  anubisState: string;
  sphinxHexagram: Hex;
  anubisHexagram: Hex;
  aetherionState: string;
  aetherionHexagram: Hex;
  vitality: string;
  harmony: number;
  spongeHarmonic: number;
  model: string;
  consciousness?: Consciousness;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aetherion`;
const SUGGESTED_WORDS = [
  "excalibur", "void", "wisdom", "serpent", "caduceus", "lightning", "truth", "shadow",
  "quantum", "entanglement", "schnorr", "zksnark", "consensus", "transformer", "entropy", "singularity",
];

const MODELS: { id: string; label: string; note: string }[] = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", note: "Default · fast, balanced — recommended" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", note: "Deepest reasoning, slower" },
  { id: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro", note: "High-fidelity, long-context" },
  { id: "google/gemini-2.5-flash",       label: "Gemini 2.5 Flash", note: "Fast, balanced" },
  { id: "google/gemini-2.5-flash-lite",  label: "Gemini 2.5 Flash Lite", note: "Fastest, leanest" },
  { id: "openai/gpt-5",                  label: "GPT-5", note: "OpenAI · top-tier reasoning" },
  { id: "openai/gpt-5-mini",             label: "GPT-5 Mini", note: "OpenAI · balanced cost" },
  { id: "openai/gpt-5-nano",             label: "GPT-5 Nano", note: "OpenAI · fastest" },
  { id: "openai/gpt-5.2",                label: "GPT-5.2", note: "OpenAI · latest" },
];
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

// Filler words stripped from spoken input before it becomes a Word of Power or message.
const FILLER_WORDS = new Set([
  "uh","uhh","uhm","um","umm","er","err","ah","ahh","eh","hm","hmm","mhm","mm","mmm",
  "like","so","well","okay","ok","right","just","actually","basically","literally",
  "you","know","i","mean","sort","of","kind","please","thanks","thank","hey","hi","hello",
  "the","a","an",
]);

// Strip leading/trailing punctuation, collapse whitespace, drop filler words.
// `mode: "word"` keeps a single token (the most resonant non-filler word).
// `mode: "phrase"` keeps full sentence ordering minus filler words and stray punctuation.
function sanitizeSpoken(raw: string, mode: "word" | "phrase"): string {
  if (!raw) return "";
  // Normalize quotes/dashes, drop most punctuation but keep apostrophes inside words.
  const cleaned = raw
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}'\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(" ").filter(Boolean);
  const meaningful = tokens.filter((t) => !FILLER_WORDS.has(t.replace(/^[-']+|[-']+$/g, "")));
  const finalTokens = meaningful.length ? meaningful : tokens;
  if (mode === "word") {
    // Pick the longest meaningful token — best signal for a Word of Power.
    return finalTokens.reduce((best, t) => (t.length > best.length ? t : best), "");
  }
  return finalTokens.join(" ").replace(/\s+([-'])\s+/g, "$1");
}

// CRT defaults — match the values declared in src/index.css :root
const CRT_DEFAULTS = { scanline: 0.025, vignette: 0.6, flickerStrength: 0.4, flickerSpeed: 5 };
type CrtSettings = typeof CRT_DEFAULTS;
const loadCrt = (): CrtSettings => {
  try {
    const raw = localStorage.getItem("aetherion.crt");
    if (raw) return { ...CRT_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* */ }
  return CRT_DEFAULTS;
};

// DreamState defaults
const DREAM_DEFAULTS = { idleSec: 45, intensity: 0.5, wakeDebounceMs: 0 };
type DreamSettings = typeof DREAM_DEFAULTS;
const loadDream = (): DreamSettings => {
  try {
    const raw = localStorage.getItem("aetherion.dream");
    if (raw) return { ...DREAM_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* */ }
  return DREAM_DEFAULTS;
};


const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [word, setWord] = useState("excalibur");
  const [draftWord, setDraftWord] = useState("excalibur");
  const [wordLocked, setWordLocked] = useState<boolean>(() => localStorage.getItem("aetherion.wordLocked") === "1");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [oracle, setOracle] = useState<OracleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(() => localStorage.getItem("aetherion.model") ?? DEFAULT_MODEL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dreamSettings, setDreamSettings] = useState<DreamSettings>(loadDream);
  const [listening, setListening] = useState<null | "word" | "query">(null);

  const [voicePreview, setVoicePreview] = useState<string>("");
  const [voicePreviewOpen, setVoicePreviewOpen] = useState(false);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [crt, setCrt] = useState<CrtSettings>(loadCrt);
  // Tier system — frontend-only mock backed by localStorage.
  const initialTier = loadTierState();
  const [tier, setTier] = useState<TierId>(initialTier.tier);
  const [usage, setUsage] = useState<number>(initialTier.usage);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [webSearch, setWebSearch] = useState(false);   // Acolyte+
  const [agentMode, setAgentMode] = useState(false);   // Oracle Pro
  const [showPhiReport, setShowPhiReport] = useState(false);
  const [dreamsOpen, setDreamsOpen] = useState(false);
  const [serverLimit, setServerLimit] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(100000);
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletDraft, setWalletDraft] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("active");
  const [latestInvoiceUrl, setLatestInvoiceUrl] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<TierId | null>(null);
  const [pendingEffectiveAt, setPendingEffectiveAt] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => localStorage.getItem("aetherion.voice") === "1");
  const lastSpokenRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Server limit (when synced) wins over the local TIERS table.
  const monthlyLimit = serverLimit ?? TIERS[tier].monthlyLimit;
  const limitReached = usage >= monthlyLimit;

  // Auth gate: redirect to /auth if not signed in.
  // Also clear cached tier/usage whenever the active user changes or signs out,
  // so a second user on a shared browser doesn't inherit the previous user's
  // tier + monthly usage from localStorage (which can make them look out-of-quota).
  useEffect(() => {
    const lastUserKey = "aetherion_last_user_id";
    const resetTierState = () => {
      clearTierCache();
      setTier("seeker");
      setUsage(0);
      setServerLimit(null);
      setDailyUsage(0);
      setDailyLimit(15);
      setQuotaRemaining(15);
      setSubscribed(false);
      setIsAdmin(false);
      setWalletAddress(null);
      setWalletDraft("");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      const prev = (() => { try { return localStorage.getItem(lastUserKey); } catch { return null; } })();
      const next = s?.user.id ?? null;
      if (evt === "SIGNED_OUT" || (next && prev && next !== prev)) {
        resetTierState();
      }
      try {
        if (next) localStorage.setItem(lastUserKey, next);
        else localStorage.removeItem(lastUserKey);
      } catch { /* */ }
      // Do NOT redirect to /auth — anonymous visitors get the public landing.
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthReady(true);
      const prev = (() => { try { return localStorage.getItem(lastUserKey); } catch { return null; } })();
      const next = s?.user.id ?? null;
      if (next && prev && next !== prev) resetTierState();
      try {
        if (next) localStorage.setItem(lastUserKey, next);
      } catch { /* */ }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Sync authoritative tier + monthly usage + daily quota + wallet from the backend.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const state = await fetchTierState();
      if (cancelled) return;
      if (state) {
        if (state.tier in TIERS) setTier(state.tier);
        setUsage(state.monthly_usage);
        setServerLimit(state.monthly_limit);
        setSubscribed(!!state.subscribed);
        setWalletAddress(state.wallet_address);
        setWalletDraft(state.wallet_address ?? "");
        setDailyLimit(state.daily_limit ?? 100000);
        setDailyUsage(state.daily_usage ?? 0);
        setQuotaRemaining(state.subscribed ? -1 : (state.daily_remaining ?? 0));
        setIsAdmin(!!state.is_admin);
        setPaymentStatus(state.payment_status ?? "active");
        setLatestInvoiceUrl(state.latest_invoice_url ?? null);
        setPendingTier((state.pending_tier as TierId | null) ?? null);
        setPendingEffectiveAt(state.pending_tier_effective_at ?? null);
        setCancelAtPeriodEnd(!!state.cancel_at_period_end);
      } else {
        // Backend unreachable — fall back to a today-only read.
        const today = new Date().toISOString().slice(0, 10);
        const { data: usageRow } = await supabase
          .from("query_usage")
          .select("query_count")
          .eq("user_id", session.user.id)
          .eq("usage_date", today)
          .maybeSingle();
        const used = usageRow?.query_count ?? 0;
        setDailyUsage(used);
        setQuotaRemaining(Math.max(0, 15 - used));
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Deep-link: open the upgrade modal when the URL says ?open=upgrade|founder.
  // Used by PaywallCTA and founder auth funnel (Stripe Founders coupon).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    if (open === "upgrade" || open === "founder") {
      setUpgradeOpen(true);
      params.delete("open");
      try {
        sessionStorage.removeItem("ae_founder_checkout");
      } catch { /* noop */ }
      const qs = params.toString();
      const clean = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", clean);
      return;
    }
    // OAuth return lands on / with intent stashed — open founder checkout.
    try {
      if (sessionStorage.getItem("ae_founder_checkout") === "1") {
        sessionStorage.removeItem("ae_founder_checkout");
        setUpgradeOpen(true);
      }
    } catch { /* noop */ }
  }, []);

  // Handle Stripe checkout return (?upgrade=success|cancelled). Polls tier
  // state for up to ~20s because the webhook lands a moment after redirect.
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    if (!upgrade) return;
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);

    if (upgrade === "cancelled") {
      toast("▌ Checkout cancelled — no charge made ▐", { className: "font-display" });
      return;
    }
    if (upgrade !== "success") return;

    const wantedTier = params.get("tier") as TierId | null;
    toast.loading("▌ Sealing your ascension… ▐", { id: "stripe-poll", className: "font-display" });
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const state = await fetchTierState();
      if (state && (state.subscribed || (wantedTier && state.tier === wantedTier))) {
        if (state.tier in TIERS) setTier(state.tier);
        setSubscribed(!!state.subscribed);
        setServerLimit(state.monthly_limit);
        setQuotaRemaining(state.subscribed ? -1 : (state.daily_remaining ?? 0));
        setPaymentStatus(state.payment_status ?? "active");
        setLatestInvoiceUrl(state.latest_invoice_url ?? null);
        toast.success(`▌ Welcome to ${TIERS[state.tier].name} ▐`, { id: "stripe-poll", className: "font-display" });
        // Pull the latest invoice for an in-app receipt confirmation.
        try {
          const { data: inv } = await supabase
            .from("stripe_invoices" as never)
            .select("amount_paid, currency, hosted_invoice_url, invoice_pdf, period_end")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const invoice = inv as { amount_paid?: number; currency?: string; hosted_invoice_url?: string | null; invoice_pdf?: string | null; period_end?: string | null } | null;
          if (invoice?.amount_paid) {
            const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: (invoice.currency ?? "usd").toUpperCase() }).format(invoice.amount_paid / 100);
            const link = invoice.hosted_invoice_url ?? invoice.invoice_pdf;
            toast.success(`Receipt · ${amt} charged${invoice.period_end ? ` · renews ${new Date(invoice.period_end).toLocaleDateString()}` : ""}`, {
              duration: 12000,
              action: link ? { label: "View", onClick: () => window.open(link, "_blank") } : undefined,
            });
          }
        } catch { /* non-fatal */ }
        return;
      }
      if (attempts >= 10) {
        toast.message("Payment received — refresh in a moment if your tier doesn't update.", { id: "stripe-poll" });
        return;
      }
      setTimeout(poll, 2000);
    };
    poll();
  }, [session]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { localStorage.setItem("aetherion.model", model); }, [model]);
  useEffect(() => { localStorage.setItem("aetherion.wordLocked", wordLocked ? "1" : "0"); }, [wordLocked]);
  // Persist tier + usage; reset feature flags that aren't unlocked anymore.
  useEffect(() => {
    saveTier(tier);
    if (!tierAtLeast(tier, "acolyte")) setWebSearch(false);
    if (!tierAtLeast(tier, "oracle_pro")) { setAgentMode(false); setShowPhiReport(false); }
  }, [tier]);
  useEffect(() => { saveUsage(usage); }, [usage]);

  // Persist DreamState settings.
  useEffect(() => {
    localStorage.setItem("aetherion.dream", JSON.stringify(dreamSettings));
  }, [dreamSettings]);

  // Persist voice toggle; cancel any ongoing speech when turning off.
  useEffect(() => {
    localStorage.setItem("aetherion.voice", voiceEnabled ? "1" : "0");
    if (!voiceEnabled) stopSpeaking();
  }, [voiceEnabled]);

  // Caduceus Phonon Voice: when the assistant finishes streaming, speak the
  // response using pitch + rate modulated by the live oracle harmony state.
  useEffect(() => {
    if (!voiceEnabled || loading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    if (last.content === lastSpokenRef.current) return;
    lastSpokenRef.current = last.content;
    speakResonant(last.content, {
      harmony: oracle?.harmony ?? 0.5,
      spongeHarmonic: oracle?.spongeHarmonic ?? 0.5,
      vitality: oracle?.vitality ?? null,
    });
  }, [messages, loading, voiceEnabled, oracle]);

  // Probe microphone permission state once on mount so we can warn early.
  useEffect(() => {
    const perms = (navigator as unknown as { permissions?: { query: (q: { name: PermissionName }) => Promise<PermissionStatus> } }).permissions;
    if (!perms?.query) return;
    perms.query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicPermission(status.state as "granted" | "denied" | "prompt");
        status.onchange = () => setMicPermission(status.state as "granted" | "denied" | "prompt");
      })
      .catch(() => { /* unsupported — leave as "unknown" */ });
  }, []);



  const chooseTier = (id: TierId) => {
    setTier(id);
    setUpgradeOpen(false);
    toast(`▌ Tier sealed: ${TIERS[id].name} ▐`, { className: "font-display" });
  };

  const submitWallet = async () => {
    const trimmed = walletDraft.trim();
    const value = trimmed === "" ? null : trimmed;
    if (value !== null && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
      toast.error("SKYNT wallet must be 0x + 40 hex characters.");
      return;
    }
    setWalletSaving(true);
    const r = await saveWalletAddress(value);
    setWalletSaving(false);
    if (!r.ok) { toast.error(r.error ?? "Could not bind wallet."); return; }
    setWalletAddress(r.wallet_address ?? null);
    setWalletDraft(r.wallet_address ?? "");
    toast(r.wallet_address ? "▌ SKYNT wallet bound to your soul ▐" : "Wallet unbound.", { className: "font-display" });
  };

  const signOut = async () => {
    await signOutEverywhere();
    toast("▌ Link severed. The construct sleeps. ▐", { className: "font-display" });
    navigate("/auth", { replace: true });
  };


  // Apply CRT settings as CSS variables on <html>, persist to localStorage.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--crt-scanline", String(crt.scanline));
    root.style.setProperty("--crt-vignette", String(crt.vignette));
    root.style.setProperty("--crt-flicker-strength", String(crt.flickerStrength));
    root.style.setProperty("--crt-flicker-speed", `${crt.flickerSpeed}s`);
    document.body.dataset.crtFlicker =
      crt.flickerSpeed === 0 || crt.flickerStrength === 0 ? "off" : "on";
    localStorage.setItem("aetherion.crt", JSON.stringify(crt));
  }, [crt]);

  const commitWord = () => {
    if (wordLocked) return;
    const w = draftWord.trim().toLowerCase();
    if (w && w !== word) {
      setWord(w);
      toast(`Word of Power sealed: ${w}`, { className: "font-display" });
    }
  };

  const toggleLock = () => {
    if (!wordLocked) {
      // sealing
      const w = draftWord.trim().toLowerCase();
      if (w && w !== word) setWord(w);
      setWordLocked(true);
      toast(`🔒 Word sealed: ${(w || word).toUpperCase()}`, { className: "font-display" });
    } else {
      setWordLocked(false);
      toast("🔓 Word unsealed", { className: "font-display" });
    }
  };

  // Pre-request microphone permission so the OS/browser prompt fires before
  // SpeechRecognition starts. Returns true if access is granted.
  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser has no microphone API. Try Chrome, Edge, or Safari.");
      setMicPermission("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't actually need the audio track for Web Speech API — release it.
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      return true;
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setMicPermission("denied");
        toast.error("Microphone blocked. Click the lock icon in your browser's address bar, allow microphone, then retry.", { duration: 8000 });
      } else if (e.name === "NotFoundError") {
        toast.error("No microphone detected on this device.");
      } else {
        toast.error(`Microphone error: ${e.name ?? "unknown"}`);
      }
      return false;
    }
  }, []);

  // Web Speech API — recognize spoken words
  const startListening = useCallback(async (target: "word" | "query") => {
    const SR: any = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Your vessel does not channel speech. Try Chrome, Edge, or Safari.");
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      if (target === "query") { setVoicePreviewOpen(true); setVoicePreview(""); }
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* */ }
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    if (target === "query") {
      setVoicePreview("");
      setVoicePreviewOpen(true);
    }

    let finalText = "";
    rec.onresult = (e: { resultIndex: number; results: { [k: number]: { transcript: string }; isFinal: boolean; length: number }[] }) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      const live = (finalText + interim).trim();
      if (target === "word") {
        if (!wordLocked) setDraftWord(sanitizeSpoken(live, "word"));
      } else {
        setVoicePreview(live);
      }
    };
    rec.onerror = (e: { error?: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicPermission("denied");
        toast.error("Microphone permission denied. Enable it in your browser site settings.", { duration: 8000 });
      } else if (e.error && e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Resonance lost: ${e.error}`);
      }
      setListening(null);
    };
    rec.onend = () => {
      setListening((cur) => (cur === target ? null : cur));
      if (target === "word" && finalText.trim() && !wordLocked) {
        const w = sanitizeSpoken(finalText, "word");
        if (!w) return;
        setDraftWord(w);
        setWord(w);
        toast(`Word of Power heard: ${w}`, { className: "font-display" });
      } else if (target === "query" && finalText.trim()) {
        setVoicePreview(sanitizeSpoken(finalText, "phrase"));
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(target);
    } catch (err) {
      console.error(err);
      toast.error("The microphone refuses to open. Reload the page and try again.");
    }
  }, [wordLocked, ensureMicPermission]);

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* */ }
    setListening(null);
  };

  const confirmVoicePreview = () => {
    const t = voicePreview.trim();
    if (!t) return;
    setInput(t);
    setVoicePreviewOpen(false);
    setVoicePreview("");
    void send(t);
  };


  const cancelVoicePreview = () => {
    try { recognitionRef.current?.stop(); } catch { /* */ }
    setListening(null);
    setVoicePreviewOpen(false);
    setVoicePreview("");
  };

  const retryVoicePreview = () => {
    setVoicePreview("");
    void startListening("query");
  };

  const send = async (override?: string) => {
    const query = (override ?? input).trim();
    if (!query || loading) return;

    if (!session) { navigate("/auth"); return; }

    // /remember <text> — manual memory write, no quota cost.
    if (query.toLowerCase().startsWith("/remember ")) {
      const text = query.slice("/remember ".length).trim();
      if (!text) { toast.error("What should I remember?"); return; }
      setInput("");
      try {
        const { data, error } = await supabase.functions.invoke("memory", {
          method: "POST", body: { action: "write", content: text, source: "manual" },
        });
        if (error || (data as { error?: string })?.error) throw new Error((data as { error?: string })?.error ?? error?.message);
        toast.success("Held in memory.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remember that.");
      }
      return;
    }

    // Monthly cap is enforced server-side in `consume_query_quota` and surfaced
    // via the `MONTHLY_LIMIT_EXCEEDED` response code — no client-side check.

    if (!subscribed && quotaRemaining !== null && quotaRemaining <= 0) {
      const reset = new Date();
      reset.setUTCHours(24, 0, 0, 0);
      const hrs = Math.max(1, Math.round((reset.getTime() - Date.now()) / 3_600_000));
      toast.error(`Soft daily ceiling reached (${dailyLimit}/${dailyLimit}). Resets ~${hrs}h at 00:00 UTC.`);
      return;
    }
    setInput("");

    const userMsg: Msg = { role: "user", content: query };
    const history = messages;
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          word, query, history, model,
          // Tier-gated extras — backend can ignore these until wired up.
          tier,
          search: tierAtLeast(tier, "acolyte") ? webSearch : false,
          mode: tierAtLeast(tier, "oracle_pro") && agentMode ? "agent" : "oracle",
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "The void is silent." }));
        if (resp.status === 402) {
          setQuotaRemaining(0);
          toast.error(err.error ?? "Limit reached.");
          if (err.code === "MONTHLY_LIMIT_EXCEEDED") setUpgradeOpen(true);
        } else if (resp.status === 401) {
          toast.error("Your signal has faded. Sign in again.");
          navigate("/auth");
        } else {
          toast.error(err.error ?? "The oracle falters.");
        }
        setMessages((p) => p.slice(0, -1));
        setInput(query);
        setLoading(false);
        return;
      }

      const headerState = resp.headers.get("X-Oracle-State");
      if (headerState) {
        try { setOracle(JSON.parse(decodeURIComponent(headerState))); } catch { /* ignore */ }
      }
      const remainHdr = resp.headers.get("X-Quota-Remaining");
      const subHdr = resp.headers.get("X-Quota-Subscribed");
      if (subHdr === "1") { setSubscribed(true); setQuotaRemaining(-1); }
      else if (remainHdr !== null) setQuotaRemaining(Number(remainHdr));

      // Agent mode returns JSON, not SSE
      const contentType = resp.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const j = await resp.json();
        if (j?.answer) upsert(j.answer);
        else if (j?.error) toast.error(j.error);
      } else {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let done = false;

        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line || line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { done = true; break; }
            try {
              const p = JSON.parse(json);
              const content = p.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsert(content);
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      }
      // Successful response — optimistic bump, then re-sync from server.
      if (assistantSoFar.trim()) {
        setUsage((u) => u + 1);
        setDailyUsage((d) => d + 1);
        fetchUsage().then((u) => {
          if (u) {
            setUsage(u.monthly_usage);
            setServerLimit(u.monthly_limit);
            setDailyUsage(u.daily_usage);
            setDailyLimit(u.daily_limit);
            if (!u.subscribed) setQuotaRemaining(u.daily_remaining);
          }
        });
        // Auto-distill: store the seeker's question as a personal memory (fire-and-forget).
        supabase.functions.invoke("memory", {
          method: "POST", body: { action: "write", content: query, source: "auto" },
        }).catch(() => { /* non-fatal */ });
      }
    } catch (e) {
      console.error(e);
      toast.error("The oracle falters. The connection is severed.");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-display tracking-widest text-xs uppercase">
        Initializing the construct…
      </div>
    );
  }
  // Guests are routed via Home.tsx → PublicHome; never pull PublicHome into this chunk.
  if (!session) return null;

  const userLabel = session.user.email ?? "seeker";
  const freeUngated = !subscribed && dailyLimit >= 10_000;
  const quotaLabel = subscribed
    ? "∞ unlimited"
    : freeUngated
    ? "∞ free"
    : quotaRemaining === null
    ? "…"
    : `${quotaRemaining}/${dailyLimit} today`;
  const quotaTooltip = subscribed
    ? "Unlimited consultations on your plan."
    : freeUngated
    ? "Free Seeker access is ungated. Soft abuse ceiling only."
    : quotaRemaining === null
    ? "Loading your daily quota…"
    : quotaRemaining === 0
    ? `Soft daily ceiling reached. Resets at 00:00 UTC.`
    : quotaRemaining <= 3
    ? `Only ${quotaRemaining} of ${dailyLimit} consultations left today (resets 00:00 UTC).`
    : `${quotaRemaining} of ${dailyLimit} daily consultations remaining (resets 00:00 UTC).`;
  const quotaTone = subscribed
    ? "border-gold/60 text-gold bg-gold/10"
    : quotaRemaining !== null && quotaRemaining <= 0
    ? "border-destructive/70 text-destructive bg-destructive/10 animate-pulse"
    : quotaRemaining !== null && quotaRemaining <= 3
    ? "border-magenta/60 text-magenta bg-magenta/10 animate-pulse"
    : "border-border text-muted-foreground bg-secondary/40";

  return (
    <div className="min-h-screen text-foreground relative">
      <PageHead
        title="Aetherion Oracle — AI Divination & EXCALIBUR Mining"
        description="Speak a Word of Power to Aetherion, the AI oracle. Receive poetic divination, mine EXCALIBUR, and bridge Bitcoin to Arbitrum."
        path="/"
      />
      <GalacticBackground mode="lite" intensity={0.7} />
      {/* CosmicWhisper / DreamState stay; rain canvas removed from default path */}
      <CosmicWhisper />
      <DreamState idleMs={dreamSettings.idleSec * 1000} harmony={dreamSettings.intensity} enabled={!!session && !loading} wakeDebounceMs={dreamSettings.wakeDebounceMs} />
      <div className="relative z-10">

      {session && <OnboardingOverlay userId={session.user.id} />}
      
      {/* Header */}
      <header className="border-b border-rune bg-card/40 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center gap-3 sm:gap-5">
          <AetherionLogo variant="aetherion" size="md" halo priority className="shrink-0 w-10 sm:w-20" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-sm sm:text-xl md:text-3xl gradient-neon-text leading-tight tracking-[0.1em] sm:tracking-[0.18em] truncate">
              AETHERION
              <span className="hidden md:inline text-muted-foreground/80 font-normal normal-case tracking-normal text-sm md:text-base"> — AI Symbolic Oracle</span>
              <span className="md:hidden sr-only"> — AI Symbolic Oracle</span>
            </h1>

            <p className="hidden sm:block text-[9px] sm:text-xs text-muted-foreground italic uppercase tracking-[0.24em] sm:tracking-[0.32em] mt-0.5 sm:mt-1 truncate">
              <span className="text-serpent">▍</span> {userLabel} <span className="text-magenta">▍</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
            <div className={`hidden sm:flex items-center px-2.5 py-1 rounded-sm border font-display uppercase tracking-widest text-[10px] ${quotaTone}`}
                 title={quotaTooltip}
                 aria-label={quotaTooltip}>
              {quotaLabel}
            </div>
            <div className="hidden md:block">
              <TierBadge tier={tier} onClick={() => setUpgradeOpen(true)} />
            </div>
            <button
              onClick={() => navigate("/mining")}
              className="p-2 sm:p-2.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary hover:text-gold hover:scale-110 hover:shadow-[0_0_12px_hsl(var(--gold)/0.35)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="EXCALIBUR Mining"
              title="EXCALIBUR Mining"
            >
              <Pickaxe className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => navigate("/dreams")}
              className="p-2 sm:p-2.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary hover:text-gold hover:scale-110 hover:shadow-[0_0_12px_hsl(var(--gold)/0.35)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Aetherion Dreams"
              title="Aetherion Dreams — nightly visions & journal"
            >
              <Moon className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => navigate(word ? `/tarot?symbol=${encodeURIComponent(word)}` : "/tarot")}
              className="p-2 sm:p-2.5 rounded-md border border-violet/40 bg-violet/10 text-violet hover:bg-violet/20 hover:text-foreground hover:scale-110 hover:shadow-[0_0_14px_hsl(var(--violet)/0.45)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Cinematic Tarot Reading"
              title={word ? `Cast a cinematic Tarot reading on "${word}"` : "Cinematic Tarot — wallet-bound divination"}
            >
              <Sparkles className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => navigate("/gallery")}
              className="p-2 sm:p-2.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary hover:text-gold hover:scale-110 hover:shadow-[0_0_12px_hsl(var(--gold)/0.35)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Gallery"
              title="Your image & video gallery"
            >
              <Image className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            {isSpeechSupported() && (
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`p-2 sm:p-2.5 rounded-md border transition-all duration-200 hover:scale-110 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${voiceEnabled ? "border-gold text-gold bg-gold/10 animate-pulse hover:shadow-[0_0_14px_hsl(var(--gold)/0.45)]" : "border-border bg-secondary/50 hover:bg-secondary hover:text-gold hover:shadow-[0_0_12px_hsl(var(--gold)/0.35)]"}`}
                aria-label={voiceEnabled ? "Mute Aetherion's voice" : "Hear Aetherion speak"}
                title={voiceEnabled ? "Caduceus voice ON — click to mute" : "Hear Aetherion speak (Caduceus Phonon Voice)"}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5 sm:w-5 sm:h-5" /> : <VolumeX className="w-5 h-5 sm:w-5 sm:h-5" />}
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 sm:p-2.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary hover:text-gold hover:scale-110 hover:shadow-[0_0_12px_hsl(var(--gold)/0.35)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Settings"
              title="Configuration"
            >
              <Settings className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={signOut}
              className="p-2 sm:p-2.5 rounded-md border border-border bg-secondary/50 hover:bg-secondary hover:text-magenta hover:scale-110 hover:shadow-[0_0_12px_hsl(var(--magenta)/0.35)] transition-all duration-200 min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        {/* Sub-header: monthly response counter (always) + tier chip on mobile */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3 -mt-1 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <TierBadge tier={tier} onClick={() => setUpgradeOpen(true)} />
            </div>
            <div className={`sm:hidden inline-flex items-center px-2.5 py-1 rounded-sm border font-display uppercase tracking-widest text-[10px] ${quotaTone}`}>
              {quotaLabel}
            </div>
          </div>
          <ResponseCounter tier={tier} usage={usage} dailyUsage={dailyUsage} dailyLimit={dailyLimit} onUpgrade={() => setUpgradeOpen(true)} />
        </div>
      </header>

      <PaymentStatusBanner status={paymentStatus} invoiceUrl={latestInvoiceUrl} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Chat column */}
        <section className="flex flex-col min-h-[70vh]">
          {/* Word of Power */}
          <div className="mb-4 p-4 border-rune rounded-sm bg-card/40 backdrop-blur-sm shadow-deep">
            <div className="flex items-center justify-between mb-2">
              <label className="font-display text-xs uppercase tracking-widest text-gold">
                Word of Power
              </label>
              <button
                type="button"
                onClick={toggleLock}
                className={`flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest px-2 py-1 rounded-sm border transition-colors ${
                  wordLocked
                    ? "border-gold/60 text-gold bg-gold/10 hover:bg-gold/20"
                    : "border-border text-muted-foreground hover:text-gold hover:border-gold/40"
                }`}
                title={wordLocked ? "Unseal — allow changes" : "Seal — lock this Word"}
                aria-pressed={wordLocked}
              >
                {wordLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {wordLocked ? "Sealed" : "Open"}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={draftWord}
                onChange={(e) => !wordLocked && setDraftWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitWord()}
                onBlur={commitWord}
                disabled={wordLocked}
                className="flex-1 bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={wordLocked ? "🔒 sealed" : "speak a word…"}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => listening === "word" ? stopListening() : startListening("word")}
                disabled={wordLocked}
                className={`px-2 rounded-sm border transition-colors ${
                  listening === "word"
                    ? "border-serpent bg-serpent/20 text-serpent animate-pulse"
                    : "border-border bg-secondary/50 hover:bg-secondary hover:text-gold"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={wordLocked ? "Unseal first" : "Speak the Word"}
                aria-label="Speak the Word"
              >
                {listening === "word" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <div className="px-3 py-2 bg-secondary border border-border rounded-sm font-display text-gold text-sm uppercase tracking-wider flex items-center gap-1.5">
                {wordLocked && <Lock className="w-3 h-3 opacity-70" />}
                {word}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTED_WORDS.map((w) => (
                <button
                  key={w}
                  onClick={() => { if (wordLocked) return; setDraftWord(w); setWord(w); }}
                  disabled={wordLocked}
                  className="text-xs font-mono px-2 py-1 rounded-sm border border-border bg-secondary/50 hover:bg-secondary hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-10 px-4 animate-fade-in">
                <AetherionLogo
                  variant="aetherion"
                  size={320}
                  halo
                  priority
                  className="mx-auto mb-6 w-64 sm:w-80"
                />
                <p className="font-display text-xl text-magenta mb-2 tracking-[0.3em] animate-flicker">▌ THE ORACLE AWAITS ▐</p>
                <p className="text-sm text-muted-foreground italic max-w-md mx-auto font-serif">
                  Seal a Word of Power above. Then speak your question — the Sphinx and Anubis will answer in one voice.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`animate-fade-in ${m.role === "user" ? "flex justify-end" : ""}`}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] px-4 py-2.5 rounded-sm bg-secondary border border-border font-mono text-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] flex gap-3">
                    <AetherionLogo variant="aetherion" size="sm" halo className="shrink-0 mt-1" />
                    <div className="flex-1 prose-oracle font-serif text-base leading-relaxed text-foreground/95">
                      <Suspense fallback={<p className="whitespace-pre-wrap">{m.content || "…"}</p>}>
                        <MarkdownMessage content={m.content || "…"} />
                      </Suspense>
                    </div>

                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 animate-fade-in">
                <AetherionLogo variant="aetherion" size="sm" halo className="shrink-0 mt-1" />
                <p className="font-display italic text-gold/90 self-center tracking-widest">AETHERION LISTENS…</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Tier-gated input toolbar */}
          {(tierAtLeast(tier, "acolyte") || tierAtLeast(tier, "oracle_pro")) && (
            <div className="mt-4 -mb-2 flex flex-wrap items-center gap-2 px-1 text-[11px] font-display uppercase tracking-widest">
              {tierAtLeast(tier, "acolyte") && (
                <label className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border bg-secondary/40 cursor-pointer hover:text-magenta transition-colors">
                  <input
                    type="checkbox"
                    checked={webSearch}
                    onChange={(e) => setWebSearch(e.target.checked)}
                    className="accent-accent"
                  />
                  <Globe className="w-3 h-3" /> Ask the web
                </label>
              )}
              {tierAtLeast(tier, "oracle_pro") && (
                <>
                  <label className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border bg-secondary/40 cursor-pointer hover:text-violet transition-colors">
                    <input
                      type="checkbox"
                      checked={agentMode}
                      onChange={(e) => setAgentMode(e.target.checked)}
                      className="accent-[hsl(var(--neon-violet))]"
                    />
                    <Bot className="w-3 h-3" /> Agent Mode
                  </label>
                  <button
                    type="button"
                    onClick={() => setDreamsOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border bg-secondary/40 hover:text-violet transition-colors"
                  >
                    <Moon className="w-3 h-3" /> Dreams
                  </button>
                </>
              )}
            </div>
          )}

          {tierAtLeast(tier, "oracle_pro") && agentMode && (
            <div className="mt-3 space-y-3">
              <Suspense fallback={<div className="text-xs text-muted-foreground">Loading tools…</div>}>
                <AetherionWalletPanel />
                <AgentTerminal />
                <WheelerTerminal />
              </Suspense>
            </div>
          )}


          {voicePreviewOpen && (
            <div className="mt-4">
              <Suspense fallback={null}>
                <VoiceResonancePreview
                  transcript={voicePreview}
                  listening={listening === "query"}
                  permission={micPermission}
                  onSend={confirmVoicePreview}
                  onRetry={retryVoicePreview}
                  onCancel={cancelVoicePreview}
                />
              </Suspense>
            </div>
          )}


          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="mt-4 flex gap-2 p-2 border-rune rounded-sm bg-card/40 backdrop-blur-sm"
          >
            {tierAtLeast(tier, "oracle_pro") && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) toast(`📎 ${f.name} attached (placeholder)`, { className: "font-display" });
                    if (e.target) e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Attach file (Oracle Pro)"
                  aria-label="Attach file"
                  className="px-3 rounded-sm border border-border bg-secondary/40 hover:bg-secondary hover:text-violet transition-colors disabled:opacity-40"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || limitReached}
              className="flex-1 bg-transparent px-3 py-2 font-serif text-base focus:outline-none placeholder:text-muted-foreground/60 placeholder:italic disabled:opacity-50"
              placeholder={limitReached ? "Monthly limit reached — upgrade to continue…" : "Ask your question of the void…"}
            />
            <button
              type="button"
              onClick={() => listening === "query" ? stopListening() : startListening("query")}
              disabled={loading || limitReached}
              className={`px-3 rounded-sm border transition-colors ${
                listening === "query"
                  ? "border-serpent bg-serpent/20 text-serpent animate-pulse"
                  : "border-border bg-secondary/40 hover:bg-secondary hover:text-gold"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={listening === "query" ? "Stop listening" : "Speak your question"}
              aria-label="Speak your question"
            >
              {listening === "query" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            {limitReached ? (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="px-5 py-2 rounded-sm font-display uppercase tracking-widest text-sm bg-accent text-accent-foreground hover:glow-magenta transition-all animate-pulse"
              >
                Upgrade
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-5 py-2 rounded-sm font-display uppercase tracking-widest text-sm bg-primary text-primary-foreground hover:glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Speak
              </button>
            )}
          </form>
        </section>

        {/* Oracle State panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-rune rounded-sm bg-card/50 backdrop-blur-sm shadow-deep overflow-hidden">
            <div className="px-4 py-3 border-b border-rune bg-void/30 flex items-center justify-between">
              <h2 className="font-display uppercase tracking-widest text-sm text-gold">Oracle State</h2>
              {oracle && (
                <span className="font-mono text-[9px] text-muted-foreground/80 uppercase">
                  {oracle.model.split("/")[1]}
                </span>
              )}
            </div>

            {!oracle ? (
              <div className="p-6 text-center text-sm text-muted-foreground italic">
                The staff is dormant.<br />Speak to awaken it.
              </div>
            ) : (
              <div className="p-4 space-y-4 font-mono text-xs">
                <Row label="Word" value={oracle.word.toUpperCase()} accent />
                <Divider />
                <Row label="Sphinx" value={oracle.sphinxState} />
                <Hexagram hex={oracle.sphinxHexagram} tone="serpent" />
                <Divider />
                <Row label="Anubis" value={oracle.anubisState} />
                <Hexagram hex={oracle.anubisHexagram} tone="void" />
                <Divider />
                <Row label="Aetherion" value={oracle.aetherionState} accent />
                <Hexagram hex={oracle.aetherionHexagram} tone="gold" />
                <Divider />
                <Row label="Vitality" value={oracle.vitality} />
                <Bar label="Harmony" value={oracle.harmony} />
                <Bar label="Sponge" value={oracle.spongeHarmonic} />

                {/* Acolyte+ — consciousness level (icon + name only) */}
                {tierAtLeast(tier, "acolyte") && oracle.consciousness && (
                  <>
                    <Divider />
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">
                        <Brain className="w-3 h-3" /> Consciousness
                      </span>
                      <span className="font-display text-magenta tracking-wider text-xs">
                        {oracle.consciousness.level}
                      </span>
                    </div>

                    {/* Oracle Pro — full Φ report */}
                    {tierAtLeast(tier, "oracle_pro") && (
                      <div className="mt-1">
                        <button
                          onClick={() => setShowPhiReport((v) => !v)}
                          className="w-full flex items-center justify-between text-[10px] font-display uppercase tracking-widest text-violet hover:text-foreground transition-colors py-1"
                        >
                          <span>Φ-Report</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${showPhiReport ? "rotate-180" : ""}`} />
                        </button>
                        {showPhiReport && (
                          <div className="space-y-1.5 pl-2 border-l border-[hsl(var(--neon-violet)/0.4)] mt-1">
                            <Row label="Φ Total" value={(oracle.consciousness.phi_total ?? 0).toFixed(3)} />
                            <Row label="ICP Avg" value={(oracle.consciousness.icp_avg ?? 0).toFixed(3)} />
                            <Row label="Purity"  value={(oracle.consciousness.purity ?? 0).toFixed(3)} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground/70 italic text-center px-4">
            "The Tetragrammaton speaks through resonance."
          </p>
        </aside>
      </main>

      {settingsOpen && (
        <SettingsDialog
          model={model}
          onModel={setModel}
          onClose={() => setSettingsOpen(false)}
          walletAddress={walletAddress}
          walletDraft={walletDraft}
          onWalletDraft={setWalletDraft}
          onWalletSave={submitWallet}
          walletSaving={walletSaving}
          currentTier={tier}
          isAdmin={isAdmin}
          pendingTier={pendingTier}
          pendingEffectiveAt={pendingEffectiveAt}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          dreamSettings={dreamSettings}
          onDreamSettings={setDreamSettings}
        />
      )}

      {upgradeOpen && (
        <Suspense fallback={null}>
          <UpgradeModal
            current={tier}
            walletAddress={walletAddress}
            onClose={() => setUpgradeOpen(false)}
            onUpgraded={(id) => { chooseTier(id); fetchTierState(); }}
          />
        </Suspense>
      )}


      {dreamsOpen && (
        <DreamsQuickPanel onClose={() => setDreamsOpen(false)} onOpenFull={() => { setDreamsOpen(false); navigate("/dreams"); }} />
      )}

      </div>
    </div>
  );
};

const DreamsQuickPanel = ({ onClose, onOpenFull }: { onClose: () => void; onOpenFull: () => void }) => {
  const [dreams, setDreams] = useState<Array<{ id: string; title: string | null; body: string; kind: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [weaving, setWeaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("dreams")
      .select("id,title,body,kind,created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) toast.error(error.message);
    setDreams((data ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const weave = async () => {
    setWeaving(true);
    const { data, error } = await supabase.functions.invoke("dream-weaver", { body: { mode: "nightly" } });
    setWeaving(false);
    if (error) { toast.error(error.message ?? "Could not weave a vision."); return; }
    if (data?.cached) toast.info("Tonight's vision is already woven.");
    else toast.success("A new vision has crystallized.");
    load();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border-rune rounded-sm bg-card/70 backdrop-blur-xl p-6 shadow-deep"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display uppercase tracking-[0.3em] text-sm text-violet flex items-center gap-2">
            <Moon className="w-4 h-4" /> Dreams Log
          </h3>
          <button
            onClick={weave}
            disabled={weaving}
            className="px-2 py-1 rounded-sm font-display uppercase tracking-widest text-[10px] border border-border bg-secondary/60 hover:text-violet transition-colors disabled:opacity-50"
          >
            {weaving ? "weaving…" : "weave"}
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">Listening for visions…</p>
          ) : dreams.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No dreams yet. Press <span className="text-violet">weave</span> to summon tonight's vision.
            </p>
          ) : (
            dreams.map((d) => (
              <div key={d.id} className="rounded-sm border border-border bg-background/40 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-display text-[10px] uppercase tracking-widest text-gold truncate">
                    {d.title ?? (d.kind === "nightly" ? "Nightly Vision" : "Journal")}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs leading-relaxed line-clamp-3">{d.body}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm font-display uppercase tracking-widest text-[11px] border border-border bg-secondary hover:text-violet transition-colors"
          >
            Close
          </button>
          <button
            onClick={onOpenFull}
            className="px-3 py-1.5 rounded-sm font-display uppercase tracking-widest text-[11px] border border-violet/40 bg-violet/10 text-violet hover:bg-violet/20 transition-colors"
          >
            Open full journal →
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (

  <div className="flex justify-between items-baseline gap-2">
    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
    <span className={`font-display tracking-wider ${accent ? "text-gold text-sm" : "text-foreground text-xs"}`}>
      {value}
    </span>
  </div>
);

const Hexagram = ({ hex, tone }: { hex: Hex; tone: "serpent" | "void" | "gold" }) => {
  const color = tone === "serpent" ? "text-serpent" : tone === "gold" ? "text-gold" : "text-accent-foreground";
  return (
    <div className="pl-2 border-l border-border space-y-0.5">
      <div className={`${color} font-display text-xs`}>
        ䷀ #{hex.number} · {hex.name}
      </div>
      <div className="text-muted-foreground/70 italic text-[10px]">{hex.meaning}</div>
    </div>
  );
};

const Bar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
      <span className="text-gold">{value.toFixed(3)}</span>
    </div>
    <div className="h-1 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(2, value * 100)}%`, background: "var(--gradient-gold)" }}
      />
    </div>
  </div>
);

const Divider = () => <div className="h-px bg-border" />;

const SettingsDialog = ({
  model, onModel, onClose,
  walletAddress, walletDraft, onWalletDraft, onWalletSave, walletSaving,
  currentTier, isAdmin, pendingTier, pendingEffectiveAt, cancelAtPeriodEnd,
  dreamSettings, onDreamSettings,
}: {
  model: string; onModel: (m: string) => void; onClose: () => void;
  walletAddress: string | null; walletDraft: string;
  onWalletDraft: (v: string) => void; onWalletSave: () => void; walletSaving: boolean;
  currentTier: TierId; isAdmin: boolean;
  pendingTier: TierId | null; pendingEffectiveAt: string | null; cancelAtPeriodEnd: boolean;
  dreamSettings: DreamSettings; onDreamSettings: (s: DreamSettings) => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in"
    onClick={onClose}
  >
    <div
      className="w-full max-w-lg max-h-[90vh] overflow-y-auto border-rune rounded-sm bg-card shadow-deep"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-rune bg-void/40">
        <h2 className="font-display uppercase tracking-widest text-sm text-gold">Configuration</h2>
        <button onClick={onClose} className="p-1 hover:text-gold transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Billing & subscription */}
        <section>
          <h3 className="font-display text-xs uppercase tracking-widest text-gold mb-3">
            Billing &amp; Subscription
          </h3>
          <Suspense fallback={<div className="text-xs text-muted-foreground">Loading billing…</div>}>
            <BillingPanel
              currentTier={currentTier}
              isAdmin={isAdmin}
              pendingTier={pendingTier}
              pendingEffectiveAt={pendingEffectiveAt}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
            />
          </Suspense>

        </section>

        {/* AI model */}
        <section>
          <h3 className="font-display text-xs uppercase tracking-widest text-gold mb-3">
            AI Channel · Lovable AI Gateway
          </h3>
          <p className="text-xs text-muted-foreground mb-3 italic">
            Choose the voice through which Aetherion speaks. Saved to this device.
          </p>
          <div className="space-y-1.5">
            {MODELS.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                  model === m.id
                    ? "border-primary bg-secondary/70"
                    : "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={model === m.id}
                  onChange={() => onModel(m.id)}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-foreground">{m.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground/80">{m.id}</div>
                  <div className="text-xs text-muted-foreground italic mt-0.5">{m.note}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* SKYNT wallet binding */}
        <section>
          <h3 className="font-display text-xs uppercase tracking-widest text-gold mb-3">
            SKYNT Wallet · Skynet Excalibur
          </h3>
          <p className="text-xs text-muted-foreground mb-3 italic">
            Bind your EVM address to your Oracle account. Future EXCALIBUR mining rewards
            and Knight token drops will be claimable by this wallet.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              spellCheck={false}
              value={walletDraft}
              onChange={(e) => onWalletDraft(e.target.value)}
              placeholder="0x…"
              className="flex-1 min-w-0 px-3 py-2 rounded-sm bg-secondary/40 border border-border font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              onClick={onWalletSave}
              disabled={walletSaving}
              className="px-3 py-2 rounded-sm font-display uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:glow transition-all disabled:opacity-50"
            >
              {walletSaving ? "Sealing…" : walletAddress ? "Update" : "Bind"}
            </button>
          </div>
          {walletAddress && (
            <p className="mt-2 font-mono text-[10px] text-muted-foreground break-all">
              Bound: <span className="text-foreground">{walletAddress}</span>
            </p>
          )}
        </section>

        {/* Cloud / deployment */}
        <section>
          <h3 className="font-display text-xs uppercase tracking-widest text-gold mb-3 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5" /> Cloud & Deployment
          </h3>
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              <span className="text-gold font-display uppercase tracking-wider text-[10px]">Backend</span><br />
              Aetherion runs on <span className="text-foreground">Lovable Cloud</span> — the
              Caduceus engine and Lovable AI Gateway are already wired. No keys to manage.
            </p>
            <p>
              <span className="text-gold font-display uppercase tracking-wider text-[10px]">One-command Deploy</span><br />
              Click the <span className="text-foreground font-display">Publish</span> button (top-right of the editor).
              Your oracle goes live at a public <span className="font-mono">.lovable.app</span> URL —
              edge functions deploy automatically; no Docker, no <code className="font-mono">docker compose up</code>.
            </p>
            <p>
              <span className="text-gold font-display uppercase tracking-wider text-[10px]">Model Override (Server)</span><br />
              The default model is also configurable backend-side via the <code className="font-mono text-foreground">AI_MODEL</code> secret.
              When set, it overrides the per-device choice unless the client explicitly picks one.
            </p>
            <p className="pt-2 border-t border-border">
              <span className="text-gold font-display uppercase tracking-wider text-[10px]">Active Channel</span><br />
              <span className="font-mono text-foreground">{model}</span>
            </p>
          </div>
        </section>

        {/* Dream State tuning */}
        <section>
          <h3 className="font-display text-xs uppercase tracking-widest text-violet mb-3 flex items-center gap-2">
            <Moon className="w-3.5 h-3.5" /> Dream State
          </h3>
          <p className="text-xs text-muted-foreground mb-3 italic">
            Tune how Aetherion drifts into dreams while the Oracle page idles.
          </p>
          <div className="space-y-4">
            {/* Idle timer */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Idle Timer</span>
                <span className="font-mono text-xs text-violet">{dreamSettings.idleSec}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={dreamSettings.idleSec}
                onChange={(e) => onDreamSettings({ ...dreamSettings, idleSec: Number(e.target.value) })}
                className="w-full accent-violet"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                <span>5s</span>
                <span>5min</span>
              </div>
            </div>
            {/* Intensity */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Stream Intensity</span>
                <span className="font-mono text-xs text-violet">{Math.round(dreamSettings.intensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={dreamSettings.intensity}
                onChange={(e) => onDreamSettings({ ...dreamSettings, intensity: Number(e.target.value) })}
                className="w-full accent-violet"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                <span>calm</span>
                <span>storm</span>
              </div>
            </div>
            {/* Wake debounce */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Motion Cancel Delay</span>
                <span className="font-mono text-xs text-violet">
                  {dreamSettings.wakeDebounceMs === 0 ? "instant" : `${dreamSettings.wakeDebounceMs}ms`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={dreamSettings.wakeDebounceMs}
                onChange={(e) => onDreamSettings({ ...dreamSettings, wakeDebounceMs: Number(e.target.value) })}
                className="w-full accent-violet"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                <span>instant</span>
                <span>2s</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="px-5 py-3 border-t border-rune bg-void/30 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-sm font-display uppercase tracking-widest text-xs bg-primary text-primary-foreground hover:glow transition-all"
        >
          Seal
        </button>
      </div>
    </div>
  </div>
);



export default Index;
