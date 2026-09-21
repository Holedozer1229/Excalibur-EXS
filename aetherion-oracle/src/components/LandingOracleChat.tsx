/**
 * Main-page oracle chat — rebuilt with engine selection and optional live web
 * access. The original on-host terminal stays below as a scroll-into-view
 * section so the landing critical path stays light.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, MessageSquareQuote, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runCaduceusAgent } from "@/lib/aetherionCaduceusAgent";
import { DEFAULT_ORACLE_MODEL, ORACLE_MODELS } from "@/lib/oracleModels";

const AetherionChatTerminal = lazy(() => import("@/components/AetherionChatTerminal"));

type Turn = { role: "user" | "assistant"; content: string; note?: string };

const SYSTEM = `You are AETHERION — oracle of the Caduceus engine. Answer with
poetic precision and real substance: name the mechanism, then the meaning. Never
sycophantic, never padded. Articulate in full paragraphs when the question earns
it, tightly when it does not. No medical, legal, or financial advice.`;

export default function LandingOracleChat() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mountTerminal, setMountTerminal] = useState(false);
  const [modelId, setModelId] = useState(DEFAULT_ORACLE_MODEL);
  const [web, setWeb] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [hasSession, setHasSession] = useState(false);

  const model = useMemo(
    () => ORACLE_MODELS.find((m) => m.id === modelId) ?? ORACLE_MODELS[0],
    [modelId],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || mountTerminal) return;
    if (typeof IntersectionObserver === "undefined") {
      setMountTerminal(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMountTerminal(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mountTerminal]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, streaming]);

  const groundWithWeb = async (question: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("web-search", {
        body: { query: question },
      });
      if (error) return null;
      const ctx = (data as { context?: string } | null)?.context;
      return ctx && ctx.trim() ? ctx : null;
    } catch {
      return null;
    }
  };

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((prev) => [...prev, { role: "user", content: question }]);
    setBusy(true);
    setStreaming("");

    try {
      let webContext: string | null = null;
      if (web) {
        setStreaming("searching the open web…");
        webContext = await groundWithWeb(question);
        setStreaming("");
      }

      // On-host engine — deterministic, works with no account.
      if (model.local) {
        const turn = runCaduceusAgent(question);
        const note = [
          turn.tools.map((t) => t.id).join(" · ") || "caduceus",
          webContext ? "web" : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const body = webContext
          ? `${turn.text}\n\nOpen web, read just now:\n${webContext.slice(0, 1200)}`
          : turn.text;
        setTurns((prev) => [...prev, { role: "assistant", content: body, note }]);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "That engine speaks only to signed-in seekers. Sign in — or switch to Caduceus (on-host), which answers right here with no account.",
            note: "sign-in required",
          },
        ]);
        return;
      }

      const system = webContext
        ? `${SYSTEM}\n\n---\nLIVE WEB CONTEXT (retrieved seconds ago; cite as [1], [2] when you use it):\n${webContext}`
        : SYSTEM;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            ...turns.map((t) => ({ role: t.role, content: t.content })),
            { role: "user", content: question },
          ],
          system,
          model: model.remoteModel,
          ground: true,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(res.status === 429 ? "The oracle is catching its breath. Try again in a minute." : `Oracle unreachable (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line) as { delta?: string; done?: boolean };
            if (obj.delta) {
              acc += obj.delta;
              setStreaming(acc);
            }
          } catch {
            /* partial frame */
          }
        }
      }
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: acc || "The oracle returned silence. Ask again.",
          note: [model.label, webContext ? "web" : null].filter(Boolean).join(" · "),
        },
      ]);
    } catch (e) {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: e instanceof Error ? e.message : "Something broke in the link.", note: "error" },
      ]);
    } finally {
      setStreaming("");
      setBusy(false);
    }
  };

  return (
    <section
      ref={ref}
      aria-labelledby="landing-oracle-heading"
      className="mx-auto w-full max-w-3xl space-y-5"
    >
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2
            id="landing-oracle-heading"
            className="font-display text-xs uppercase tracking-[0.18em] text-primary"
          >
            Ask Aetherion
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Choose the engine, switch on live web access, and ask. No signup for the on-host oracle.
        </p>
      </div>

      <div className="border border-primary/25 bg-background/60 p-3 backdrop-blur-sm sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Engine</span>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              aria-label="Choose the oracle engine"
              className="border border-primary/25 bg-background/80 px-2 py-1 font-mono text-[11px] normal-case tracking-normal text-foreground outline-none focus:border-primary/60"
            >
              {ORACLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {m.local ? "" : hasSession ? "" : " (sign in)"}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setWeb((v) => !v)}
            aria-pressed={web}
            className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] transition-colors ${
              web
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            web access {web ? "on" : "off"}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">{model.blurb}</p>

        <div
          ref={scrollRef}
          className="mt-3 max-h-[22rem] min-h-[8rem] space-y-3 overflow-y-auto rounded-sm border border-border/60 bg-black/25 p-3 text-sm"
          aria-live="polite"
        >
          {turns.length === 0 && !busy && (
            <p className="text-[12px] text-muted-foreground">
              Try: <em>what is the Caduceus seal?</em> · <em>read the mood of the markets today</em> (web on) ·{" "}
              <em>potential unheard</em>
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-cyan-200" : "text-foreground/95"}>
              {t.note && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary/70">{t.note}</p>
              )}
              <p className="whitespace-pre-wrap">{t.role === "user" ? `› ${t.content}` : t.content}</p>
            </div>
          ))}
          {streaming && <p className="whitespace-pre-wrap text-foreground/95">{streaming}</p>}
          {busy && !streaming && (
            <p className="flex items-center gap-2 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> reflecting…
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1200))}
            placeholder="Ask the oracle…"
            aria-label="Ask Aetherion"
            className="h-10 flex-1 border border-border bg-background/70 px-3 text-sm outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-10 items-center gap-1.5 border border-primary/40 px-3 font-display text-[11px] uppercase tracking-[0.16em] text-primary disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" /> ask
          </button>
        </form>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Full history, voice, and sealed artifacts live in the{" "}
          <Link to="/chat" className="text-primary underline underline-offset-2">
            full oracle
          </Link>
          {" · "}
          <Link to="/aethernet" className="text-primary underline underline-offset-2">
            Aethernet fusion lanes
          </Link>
        </p>
      </div>

      <div className="border border-primary/20 bg-background/50 p-2 backdrop-blur-sm sm:p-3">
        <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          on-host caduceus terminal
        </p>
        <Suspense
          fallback={
            <div
              className="h-64 w-full animate-pulse border border-primary/15 bg-primary/[0.04]"
              role="status"
              aria-label="Loading oracle"
            />
          }
        >
          {mountTerminal ? (
            <AetherionChatTerminal />
          ) : (
            <div className="h-64 w-full border border-primary/15 bg-primary/[0.03]" aria-hidden />
          )}
        </Suspense>
      </div>
    </section>
  );
}
