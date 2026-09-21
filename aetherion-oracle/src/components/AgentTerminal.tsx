// AgentTerminal — built-in command runner + optional SSH to a remote VM.
// Visible in agent mode (Oracle Pro). SSH host config is held in localStorage,
// never persisted server-side.
import { useEffect, useRef, useState } from "react";
import { Terminal as TermIcon, Loader2, Wifi, WifiOff, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Line { kind: "in" | "out" | "err" | "info"; text: string }

const LS_HOST = "aetherion_ssh_host";
const LS_HISTORY = "aetherion_term_history";

interface SshCfg { host: string; port: number; username: string; password?: string; privateKey?: string }

const TERMINAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/terminal-command`;
const VM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-terminal`;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  } : null;
}

export const AgentTerminal = () => {
  const [lines, setLines] = useState<Line[]>([
    { kind: "info", text: "aetherion terminal · type 'help' for commands · prefix with 'ssh ' to run on remote VM" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssh, setSsh] = useState<SshCfg | null>(null);
  const [showSsh, setShowSsh] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? "[]"); } catch { return []; }
  });
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_HOST);
      if (cached) {
        // Only host/port/username are persisted; password & privateKey are
        // re-entered every session so credentials never sit in localStorage.
        const safe = JSON.parse(cached) as Pick<SshCfg, "host" | "port" | "username">;
        setSsh({ host: safe.host, port: safe.port, username: safe.username });
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const append = (l: Line) => setLines((prev) => [...prev, l]);

  const run = async () => {
    const raw = input.trim();
    if (!raw || busy) return;
    setInput("");
    const next = [raw, ...history.filter((h) => h !== raw)].slice(0, 50);
    setHistory(next);
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(next)); } catch { /* */ }
    setHistIdx(-1);
    append({ kind: "in", text: `$ ${raw}` });
    setBusy(true);

    const headers = await authHeaders();
    if (!headers) { append({ kind: "err", text: "Not signed in." }); setBusy(false); return; }

    try {
      if (raw.startsWith("ssh ")) {
        if (!ssh) {
          append({ kind: "err", text: "No SSH host configured. Click the plug icon to set one." });
          setBusy(false); return;
        }
        const command = raw.slice(4);
        const sessionId = crypto.randomUUID();
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) { append({ kind: "err", text: "Not signed in." }); setBusy(false); return; }
        const topic = `vm-term:${uid}:${sessionId}`;
        const liveBuf = { stdout: "", stderr: "" };
        let gotDone = false;
        const channel = supabase
          .channel(topic, { config: { private: true, broadcast: { self: true } } })
          .on("broadcast", { event: "chunk" }, (msg) => {
            const p = msg.payload as { stream: "stdout" | "stderr"; text: string };
            liveBuf[p.stream] += p.text;
            append({ kind: p.stream === "stderr" ? "err" : "out", text: p.text.replace(/\n$/, "") });
          })
          .on("broadcast", { event: "done" }, (msg) => {
            gotDone = true;
            const p = msg.payload as {
              code: number; status: string; durationMs: number;
              stdoutBytes: number; stderrBytes: number;
              stdout: string; stderr: string; errorMessage: string | null;
            };
            // Recover any chunks that were dropped mid-stream
            if (p.stdout && p.stdout.length > liveBuf.stdout.length) {
              const missing = p.stdout.slice(liveBuf.stdout.length);
              if (missing) append({ kind: "out", text: missing.replace(/\n$/, "") });
            }
            if (p.stderr && p.stderr.length > liveBuf.stderr.length) {
              const missing = p.stderr.slice(liveBuf.stderr.length);
              if (missing) append({ kind: "err", text: missing.replace(/\n$/, "") });
            }
            append({
              kind: "info",
              text: `exit ${p.code} · ${p.status} · ${p.durationMs}ms · stdout ${p.stdoutBytes}B · stderr ${p.stderrBytes}B`,
            });
          });
        await new Promise<void>((resolve) => {
          channel.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
        });
        try {
          const r = await fetch(VM_URL, {
            method: "POST", headers,
            body: JSON.stringify({ ...ssh, command, sessionId }),
          });
          const j = await r.json();
          // Final fallback: nothing streamed AND no done event arrived
          if (!gotDone) {
            if (!liveBuf.stdout && j.stdout) append({ kind: "out", text: j.stdout });
            if (!liveBuf.stderr && j.stderr) append({ kind: "err", text: j.stderr });
            append({
              kind: "info",
              text: `exit ${j.code ?? "?"} · ${j.status ?? "?"} · ${j.durationMs ?? "?"}ms (recovered from HTTP)`,
            });
          }
          if (!j.ok && j.error) append({ kind: "err", text: j.error });
        } finally {
          supabase.removeChannel(channel);
        }
      } else {
        // Built-in command:  cmd.name {json args}
        const m = raw.match(/^(\S+)(?:\s+(\{.*\}))?$/);
        const command = m?.[1] ?? raw;
        let args: Record<string, unknown> = {};
        if (m?.[2]) {
          try { args = JSON.parse(m[2]); }
          catch { append({ kind: "err", text: "args must be valid JSON" }); setBusy(false); return; }
        }
        const r = await fetch(TERMINAL_URL, { method: "POST", headers, body: JSON.stringify({ command, args }) });
        const j = await r.json();
        if (!j.ok) {
          append({ kind: "err", text: j.error ?? "command failed" });
        } else {
          append({ kind: "out", text: typeof j.result === "string" ? j.result : JSON.stringify(j.result, null, 2) });
          if (j.cost_credits > 0) append({ kind: "info", text: `cost: ${j.cost_credits} credits` });
        }
      }
    } catch (e) {
      append({ kind: "err", text: e instanceof Error ? e.message : "request failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-primary/40 bg-black/60 rounded-sm font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 text-primary font-display uppercase tracking-widest text-[11px]">
          <TermIcon className="w-3.5 h-3.5" /> Agent Terminal
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-[10px] uppercase tracking-widest"
            title="Past SSH sessions"
          >
            <History className="w-3 h-3" /> Sessions
          </button>
          <button
            onClick={() => setShowSsh((s) => !s)}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] uppercase tracking-widest ${ssh ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground"}`}
            title="Configure remote VM"
          >
            {ssh ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {ssh ? ssh.host : "no vm"}
          </button>
        </div>
      </div>

      {showHistory && <SessionHistoryPanel onClose={() => setShowHistory(false)} />}

      {showSsh && (
        <SshConfigPanel
          initial={ssh}
          onSave={(cfg) => {
            setSsh(cfg);
            try {
              // Never persist password / privateKey — only the connection target.
              const { password: _pw, privateKey: _pk, ...safe } = cfg;
              localStorage.setItem(LS_HOST, JSON.stringify(safe));
            } catch { /* */ }
            setShowSsh(false);
            append({ kind: "info", text: `vm set: ${cfg.username}@${cfg.host}:${cfg.port}` });
          }}
          onClear={() => { setSsh(null); try { localStorage.removeItem(LS_HOST); } catch { /* */ } setShowSsh(false); append({ kind: "info", text: "vm cleared" }); }}
        />
      )}

      <div ref={scrollRef} className="p-3 h-72 overflow-y-auto space-y-1 bg-black/40">
        {lines.map((l, i) => (
          <pre
            key={i}
            className={`whitespace-pre-wrap break-words ${
              l.kind === "in" ? "text-primary" :
              l.kind === "err" ? "text-destructive" :
              l.kind === "info" ? "text-muted-foreground italic" :
              "text-foreground/90"
            }`}
          >{l.text}</pre>
        ))}
        {busy && <div className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />…</div>}
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-primary/30">
        <span className="text-primary">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
            else if (e.key === "ArrowUp") {
              const n = Math.min(histIdx + 1, history.length - 1);
              if (n >= 0 && history[n]) { setHistIdx(n); setInput(history[n]); }
            } else if (e.key === "ArrowDown") {
              const n = histIdx - 1;
              if (n < 0) { setHistIdx(-1); setInput(""); }
              else { setHistIdx(n); setInput(history[n]); }
            }
          }}
          disabled={busy}
          placeholder='help · tier.show · eth.balance {"address":"0x…"} · ssh ls -la'
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
};

const SshConfigPanel = ({ initial, onSave, onClear }: {
  initial: SshCfg | null;
  onSave: (c: SshCfg) => void;
  onClear: () => void;
}) => {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(initial?.port ?? 22);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  return (
    <div className="p-3 border-b border-primary/30 bg-card/40 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-amber-400">
        ⚠ Credentials kept locally in your browser. Do not paste shared keys.
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="host" className="col-span-2 px-2 py-1 bg-background border border-border rounded-sm" />
        <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} placeholder="22" className="px-2 py-1 bg-background border border-border rounded-sm" />
      </div>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full px-2 py-1 bg-background border border-border rounded-sm" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (optional)" className="w-full px-2 py-1 bg-background border border-border rounded-sm" />
      <textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY----- (optional)" className="w-full px-2 py-1 bg-background border border-border rounded-sm h-20 text-[10px]" />
      <div className="flex justify-end gap-2">
        <button onClick={onClear} className="px-3 py-1 border border-destructive/40 text-destructive rounded-sm uppercase tracking-widest text-[10px]">Clear</button>
        <button
          onClick={() => host && username && (password || privateKey) && onSave({ host, port, username, password: password || undefined, privateKey: privateKey || undefined })}
          className="px-3 py-1 border border-primary text-primary rounded-sm uppercase tracking-widest text-[10px]"
        >Save</button>
      </div>
    </div>
  );
};

interface SessionRow {
  id: string;
  session_id: string;
  host: string;
  username: string | null;
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
}

const SessionHistoryPanel = ({ onClose }: { onClose: () => void }) => {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vm_terminal_sessions")
        .select("id,session_id,host,username,command,stdout,stderr,exit_code,duration_ms,status,error_message,started_at,ended_at")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) setErr(error.message);
      else setRows((data ?? []) as SessionRow[]);
    })();
  }, []);

  return (
    <div className="border-b border-primary/30 bg-card/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/20">
        <div className="text-[10px] uppercase tracking-widest text-primary">Past SSH Sessions</div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {err && <div className="p-3 text-destructive text-[11px]">{err}</div>}
        {!rows && !err && <div className="p-3 text-muted-foreground text-[11px]">Loading…</div>}
        {rows && rows.length === 0 && <div className="p-3 text-muted-foreground text-[11px]">No sessions yet.</div>}
        {rows?.map((r) => {
          const isOpen = expanded === r.id;
          const ok = r.status === "ok";
          return (
            <div key={r.id} className="border-b border-border/40 last:border-b-0">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full text-left px-3 py-2 hover:bg-primary/5 flex items-center gap-2"
              >
                <span className={`text-[10px] uppercase tracking-widest ${ok ? "text-emerald-400" : "text-destructive"}`}>
                  {r.status}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(r.started_at).toLocaleString()}
                </span>
                <span className="text-foreground/80 truncate flex-1">
                  {r.username ? `${r.username}@` : ""}{r.host}: {r.command}
                </span>
                <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                  exit {r.exit_code ?? "?"} · {r.duration_ms ?? "?"}ms
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 bg-black/40">
                  {r.stdout && (
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">stdout · {r.stdout.length}B</div>
                      <pre className="whitespace-pre-wrap break-words text-foreground/90 text-[11px]">{r.stdout}</pre>
                    </div>
                  )}
                  {r.stderr && (
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">stderr · {r.stderr.length}B</div>
                      <pre className="whitespace-pre-wrap break-words text-destructive text-[11px]">{r.stderr}</pre>
                    </div>
                  )}
                  {r.error_message && (
                    <div className="text-destructive text-[11px]">error: {r.error_message}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
