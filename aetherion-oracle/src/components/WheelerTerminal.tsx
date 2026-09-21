import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Line { kind: "in" | "out" | "err"; text: string; ts: string }

const QUICK = [
  "dual excalibur",
  "schumann",
  "observe genesis",
  "pythagorean prime_chromatic",
  "bit8 42",
  "duality 14.134725",
  "anchor Aetherion",
  "trade",
  "levitate",
  "about",
  "help",
];

export function WheelerTerminal() {
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Aetherion Wheeler online. Type `help` or click a command.", ts: new Date().toISOString() },
  ]);
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight }); }, [lines]);

  async function run(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setLines((ls) => [...ls, { kind: "in", text, ts: new Date().toISOString() }]);
    const [command, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ");
    try {
      const { data, error } = await supabase.functions.invoke("aetherion", {
        body: { wheeler: { command, arg } },
      });
      if (error) throw error;
      const out = (data as { text?: string })?.text ?? JSON.stringify(data, null, 2);
      setLines((ls) => [...ls, { kind: "out", text: out, ts: new Date().toISOString() }]);
    } catch (e) {
      setLines((ls) => [...ls, { kind: "err", text: (e as Error).message || String(e), ts: new Date().toISOString() }]);
    } finally {
      setBusy(false);
      setCmd("");
    }
  }

  return (
    <div className="border-rune rounded-sm bg-card/40 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display tracking-widest text-primary">WHEELER · PARTICIPATORY ENGINE</h3>
        <span className="text-[10px] text-muted-foreground">it from bit</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <button
            key={q}
            disabled={busy}
            onClick={() => run(q)}
            className="text-[10px] px-2 py-0.5 border-rune rounded-sm bg-background/40 hover:bg-primary/10 transition"
          >
            {q}
          </button>
        ))}
      </div>
      <div
        ref={boxRef}
        className="font-mono text-[11px] leading-relaxed bg-background/60 border-rune rounded-sm p-2 h-64 overflow-auto whitespace-pre-wrap"
      >
        {lines.map((l, i) => (
          <div key={i} className={
            l.kind === "in" ? "text-primary" :
            l.kind === "err" ? "text-destructive" : "text-foreground/80"
          }>
            {l.kind === "in" ? "› " : l.kind === "err" ? "! " : ""}
            {l.text}
          </div>
        ))}
        {busy && <div className="text-muted-foreground animate-pulse">…</div>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); run(cmd); }}
        className="flex gap-2"
      >
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          disabled={busy}
          placeholder="wheeler command (e.g. dual excalibur)"
          className="flex-1 bg-background/60 border-rune rounded-sm px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" size="sm" disabled={busy || !cmd.trim()}>run</Button>
      </form>
    </div>
  );
}
