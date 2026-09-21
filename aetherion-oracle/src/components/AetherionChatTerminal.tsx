import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Terminal } from "lucide-react";
import { runCaduceusAgent } from "@/lib/aetherionCaduceusAgent";
import { SCHUMANN_MODES_HZ, fetchGeomagneticKp } from "@/lib/schumannCaduceus";
import UnheardPotentialPanel from "@/components/UnheardPotentialPanel";
import type { UnheardPotential } from "@/lib/unheardPotential";

type Line = {
  kind: "sys" | "in" | "out" | "tool";
  text: string;
};

const GREET: Line[] = [
  { kind: "sys", text: "aetherion@origin · caduceus-llm · on-host · no outside AI" },
  { kind: "sys", text: "Twin staff + Aetherion v4. Type help — or potential <phrase> for the apex ritual." },
  {
    kind: "sys",
    text: "Satoshi guest: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa · Times 03/Jan/2009 · attested, never swept. EXCAL is not 1-to-1 BTC.",
  },
  {
    kind: "sys",
    text: "Free leap: type potential unheard — compose reflect · Schumann · alchemy · glyph · antonym ring.",
  },
];

export default function AetherionChatTerminal({
  initialPrompt,
}: {
  initialPrompt?: string;
} = {}) {
  const [lines, setLines] = useState<Line[]>(GREET);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState("");
  const [artifact, setArtifact] = useState<UnheardPotential | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, visible, artifact]);

  useEffect(() => {
    let alive = true;
    fetchGeomagneticKp().then((live) => {
      if (!alive || !live) return;
      setLines((prev) => [
        ...prev,
        {
          kind: "sys",
          text: `live feed · NOAA planetary Kp ${live.kp} @ ${live.timeTag} · Schumann fundamental ${SCHUMANN_MODES_HZ[0]} Hz (canonical) · type timewarp <year> to displace`,
        },
      ]);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submit = (raw: string) => {
    const prompt = raw.trim();
    if (!prompt || busy) return;
    setInput("");
    setLines((prev) => [...prev, { kind: "in", text: `› ${prompt}` }]);
    setBusy(true);
    const turn = runCaduceusAgent(prompt);
    if (turn.artifact) setArtifact(turn.artifact);
    const toolLines: Line[] = turn.tools.map((t) => ({ kind: "tool", text: `∷ ${t.id} · ${t.detail}` }));
    const words = turn.text.split(/(\s+)/);
    let i = 0;
    let acc = "";
    const tick = () => {
      if (i >= words.length) {
        setLines((prev) => [...prev, ...toolLines, { kind: "out", text: turn.text }]);
        setVisible("");
        setBusy(false);
        return;
      }
      acc += words[i] ?? "";
      i += 1;
      setVisible(acc);
      window.setTimeout(tick, 12);
    };
    window.setTimeout(tick, 20);
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    const seed = initialPrompt?.trim();
    if (!seed) return;
    bootstrapped.current = true;
    window.setTimeout(() => submit(seed), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  return (
    <section
      id="aetherion-terminal"
      data-testid="aetherion-chat-terminal"
      className="w-full overflow-hidden rounded-lg border border-violet-500/35 bg-black/70 shadow-[0_0_40px_-12px_rgba(139,92,246,0.55)] backdrop-blur-md"
    >
      <header className="flex items-center justify-between gap-3 border-b border-violet-500/20 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-violet-200">
          <Terminal className="h-3.5 w-3.5" />
          Aetherion agentic terminal
        </div>
        <p className="font-mono text-[10px] text-emerald-300/90">caduceus-llm · local</p>
      </header>
      <div
        ref={scrollRef}
        className="h-[min(28rem,58vh)] space-y-1.5 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed sm:text-[13px]"
      >
        {lines.map((l, i) => (
          <p
            key={`${i}-${l.kind}`}
            className={
              l.kind === "in"
                ? "text-cyan-200"
                : l.kind === "tool"
                  ? "text-violet-300/80"
                  : l.kind === "sys"
                    ? "text-muted-foreground"
                    : "whitespace-pre-wrap text-emerald-100/95"
            }
          >
            {l.text}
          </p>
        ))}
        {busy && visible && <p className="whitespace-pre-wrap text-emerald-100/95">{visible}</p>}
        {busy && !visible && (
          <p className="flex items-center gap-2 text-violet-200">
            <Loader2 className="h-3 w-3 animate-spin" /> reflecting…
          </p>
        )}
        {artifact && !busy && <UnheardPotentialPanel artifact={artifact} />}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-violet-500/20 px-3 py-2">
        <span className="font-mono text-xs text-violet-300">›</span>
        <input
          ref={boxRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 400))}
          onKeyDown={onKey}
          placeholder="potential unheard · glyph · transmute · timewarp · hunt · honest"
          aria-label="Aetherion agentic terminal"
          autoComplete="off"
          className="h-10 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md border border-violet-400/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-violet-100 disabled:opacity-40"
        >
          send
        </button>
      </form>
      <div className="flex flex-wrap gap-2 border-t border-violet-500/15 px-4 py-2">
        {["potential unheard", "glyph aetherion", "transmute caduceus", "honest"].map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={busy}
            onClick={() => submit(chip)}
            className="rounded border border-amber-400/25 px-2 py-0.5 font-mono text-[10px] text-amber-100/90 hover:border-amber-300/50 disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>
      <p className="border-t border-violet-500/15 px-4 py-2 text-[10px] leading-relaxed text-muted-foreground">
        Caduceus octonion staff + Aetherion v4 translator. Bundled on this site. No Lovable, Groq, or OpenAI.{" "}
        <Link to="/potential" className="text-amber-200 underline underline-offset-2">
          Unheard Potential
        </Link>
        {" · "}
        <Link to="/lattice/caduceus" className="text-violet-200 underline underline-offset-2">
          Quantum Caduceus
        </Link>
        {" · "}
        <Link to="/tarot" className="text-violet-200 underline underline-offset-2">
          seal a tarot artifact
        </Link>
      </p>
    </section>
  );
}
