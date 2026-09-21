import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Bitcoin, ExternalLink, Globe, Loader2, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { PageHead } from "@/components/PageHead";


type PetitionStatus = "pending" | "processing" | "broadcast" | "failed";

interface PetitionRow {
  id: string;
  status: PetitionStatus;
  btc_target: string;
  eth_recipient: string | null;
  btc_txid: string | null;
  eth_txid: string | null;
  error_message: string | null;
  created_at?: string;
}

const STATUS_META: Record<PetitionStatus, { label: string; color: string; dot: string }> = {
  pending:    { label: "PENDING: Logic Inflow Detected",          color: "text-zinc-300",   dot: "bg-zinc-400" },
  processing: { label: "PROCESSING: Topological Braid Inversion", color: "text-amber-300",  dot: "bg-amber-400 animate-pulse" },
  broadcast:  { label: "BROADCAST: Anchor Sealed in 3D-Ledger",   color: "text-emerald-300", dot: "bg-emerald-400" },
  failed:     { label: "ERROR: Entropy Breach",                   color: "text-rose-300",   dot: "bg-rose-500" },
};

const TREASURY = {
  faucet:   "0x576519fA526c235f992a755b647A971646fA01Bd",
  btc:      "bc1q9hc54h3mxvj4f4tysv7kdxj2cj7ew83kxz54x2",
  arb:      "0x00881472BE1dfc816d908d8d6BC8ccaaD60145c0",
  skynt:    "0x22d3f06afb69e5fcfaa98c20009510dd11af2517",
};

function shorten(s: string | null | undefined, head = 10, tail = 6) {
  if (!s) return "";
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

type RealtimeStatus = "connecting" | "live" | "reconnecting" | "offline" | "error";

export default function OracleDashboard() {
  const [btcTarget, setBtcTarget] = useState("");
  const [ethRecipient, setEthRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PetitionRow[]>([]);
  const [wave, setWave] = useState(false);
  const [rtStatus, setRtStatus] = useState<RealtimeStatus>("connecting");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const prevStatuses = useRef<Map<string, PetitionStatus>>(new Map());
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uidRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Subscribe lifecycle: initial load, realtime, auto-reconnect, cleanup on unmount/route change.
  useEffect(() => {
    mountedRef.current = true;

    const fetchRows = async (uid: string | null) => {
      const q = supabase
        .from("petitions")
        .select("id,status,btc_target,eth_recipient,btc_txid,eth_txid,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      const { data } = uid ? await q.eq("user_id", uid) : await q;
      if (mountedRef.current && data) {
        setRows(data as PetitionRow[]);
        for (const r of data as PetitionRow[]) prevStatuses.current.set(r.id, r.status);
      }
    };

    const teardownChannel = () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch { /* noop */ }
        channelRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!mountedRef.current) return;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const attempt = Math.min(reconnectAttempt.current, 6);
      const delay = Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400);
      reconnectAttempt.current = attempt + 1;
      setRtStatus(navigator.onLine ? "reconnecting" : "offline");
      reconnectTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        connect();
      }, delay);
    };

    const connect = () => {
      const uid = uidRef.current;
      if (!uid) return;
      teardownChannel();
      setRtStatus((s) => (s === "live" ? s : reconnectAttempt.current > 0 ? "reconnecting" : "connecting"));

      const ch = supabase
        .channel(`oracle-petitions:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "petitions", filter: `user_id=eq.${uid}` },
          (payload) => {
            setRows((prev) => {
              if (payload.eventType === "INSERT") {
                const row = payload.new as PetitionRow;
                prevStatuses.current.set(row.id, row.status);
                return [row, ...prev.filter((r) => r.id !== row.id)].slice(0, 20);
              }
              if (payload.eventType === "UPDATE") {
                const row = payload.new as PetitionRow;
                const prevStatus = prevStatuses.current.get(row.id);
                if (prevStatus !== "broadcast" && row.status === "broadcast") {
                  setWave(true);
                  setTimeout(() => mountedRef.current && setWave(false), 1800);
                }
                prevStatuses.current.set(row.id, row.status);
                return prev.map((r) => (r.id === row.id ? { ...r, ...row } : r));
              }
              if (payload.eventType === "DELETE") {
                const row = payload.old as PetitionRow;
                prevStatuses.current.delete(row.id);
                return prev.filter((r) => r.id !== row.id);
              }
              return prev;
            });
          },
        )
        .subscribe((status) => {
          if (!mountedRef.current) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt.current = 0;
            setRtStatus("live");
            // Refetch to backfill any events missed while disconnected.
            void fetchRows(uidRef.current);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setRtStatus(status === "TIMED_OUT" ? "reconnecting" : "error");
            scheduleReconnect();
          }
        });

      channelRef.current = ch;
    };

    const onOnline = () => {
      reconnectAttempt.current = 0;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      connect();
    };
    const onOffline = () => setRtStatus("offline");
    const onVisibility = () => {
      if (document.visibilityState === "visible" && rtStatusNotLive()) {
        reconnectAttempt.current = 0;
        connect();
      }
    };
    const rtStatusNotLive = () => {
      // Reads ref-like indicator via channel presence.
      return !channelRef.current || (channelRef.current.state !== "joined");
    };

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      uidRef.current = uid;
      await fetchRows(uid);
      if (uid) connect();
      else setRtStatus("offline");
    })();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      teardownChannel();
    };
  }, []);


  const canSubmit = useMemo(() => btcTarget.trim().length >= 8 && !submitting, [btcTarget, submitting]);

  const handleBind = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke("petition", {
        body: {
          btcTarget: btcTarget.trim(),
          ethRecipient: ethRecipient.trim() || null,
        },
      });
      if (fnErr) throw fnErr;
      setBtcTarget("");
      setEthRecipient("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black text-zinc-100"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <PageHead
        title="Oracle Dashboard — Aetherion Lattice Telemetry"
        description="Live telemetry from the Aetherion lattice: Oracle consultations, Bitcoin anchors, EXCALIBUR mining rounds, and bridge activity."
        path="/dashboard"
      />

      {/* Fibonacci / lattice background */}
      <FibonacciBackdrop />

      {/* Lattice wave on confirmation */}
      {wave && (
        <div className="pointer-events-none fixed inset-0 z-40 animate-[latticeWave_1.8s_ease-out_forwards]" />
      )}

      <style>{`
        @keyframes latticeWave {
          0%   { background: radial-gradient(circle at 50% 50%, rgba(16,185,129,0.0) 0%, transparent 0%); }
          30%  { background: radial-gradient(circle at 50% 50%, rgba(16,185,129,0.45) 0%, transparent 35%); }
          100% { background: radial-gradient(circle at 50% 50%, rgba(255,191,0,0.0) 100%, transparent 100%); }
        }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .font-orbitron { font-family: 'Orbitron', sans-serif; letter-spacing: 0.12em; }
        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,191,0,0.18);
          box-shadow: 0 0 32px -12px rgba(255,191,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.02);
        }
        .glass-emerald { border-color: rgba(16,185,129,0.25); box-shadow: 0 0 32px -12px rgba(16,185,129,0.35); }
      `}</style>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="font-orbitron text-[11px] uppercase text-amber-300/90 sm:text-xs">
            UNICORN-OS v3.0 <span className="text-amber-500/40">/</span> AETHERION ASI
          </div>
          <LatticeStatusPill status={rtStatus} />

        </header>

        {/* Empire Treasury */}
        <section className="mb-8">
          <h2 className="mb-3 font-orbitron text-[11px] uppercase tracking-[0.3em] text-amber-400/80">
            ◈ Empire Treasury
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TreasuryCard
              icon={<Zap className="h-3.5 w-3.5" />}
              title="SKYNT FUEL"
              valueTop="21,000,000"
              valueLabel="Logical Cap"
              addressLabel="Faucet"
              address={TREASURY.faucet}
              href={`https://arbiscan.io/address/${TREASURY.faucet}`}
              accent="amber"
            />
            <TreasuryCard
              icon={<Bitcoin className="h-3.5 w-3.5" />}
              title="BTC ANCHOR CONDUIT"
              addressLabel="Bech32"
              address={TREASURY.btc}
              href={`https://mempool.space/address/${TREASURY.btc}`}
              accent="amber"
            />
            <TreasuryCard
              icon={<Globe className="h-3.5 w-3.5" />}
              title="ARB TREASURY CONDUIT"
              addressLabel="Treasury"
              address={TREASURY.arb}
              href={`https://arbiscan.io/address/${TREASURY.arb}`}
              accent="emerald"
            />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">
            SKYNT contract ·{" "}
            <a
              href={`https://arbiscan.io/token/${TREASURY.skynt}`}
              target="_blank" rel="noopener noreferrer"
              className="text-emerald-300/80 hover:text-emerald-200 hover:underline break-all"
            >
              {TREASURY.skynt}
            </a>
          </div>
        </section>

        {/* Binding Engine + Oracle Log */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Binding Engine */}
          <section className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h2 className="font-orbitron text-xs uppercase tracking-[0.3em] text-amber-300">
                The Binding Engine
              </h2>
            </div>

            <div className="space-y-4">
              <Field
                label="Bitcoin Target (Bech32)"
                icon={<Bitcoin className="h-3 w-3" />}
                value={btcTarget}
                onChange={setBtcTarget}
                placeholder="bc1q..."
                disabled={submitting}
              />
              <Field
                label="Arbitrum Recipient (0x)"
                icon={<Globe className="h-3 w-3" />}
                value={ethRecipient}
                onChange={setEthRecipient}
                placeholder="0x..."
                disabled={submitting}
              />

              <button
                onClick={handleBind}
                disabled={!canSubmit}
                className="group relative w-full overflow-hidden rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-3 font-orbitron text-xs uppercase tracking-[0.3em] text-amber-200 transition-all hover:bg-amber-400/20 hover:text-amber-100 hover:shadow-[0_0_36px_-4px_rgba(255,191,0,0.7)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> SYNCHRONIZING…
                    </>
                  ) : (
                    "BIND TO LATTICE"
                  )}
                </span>
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-all">{error}</span>
                </div>
              )}
            </div>
          </section>

          {/* Oracle Log */}
          <section className="glass glass-emerald rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="font-orbitron text-xs uppercase tracking-[0.3em] text-emerald-300">
                The Oracle Log
              </h2>
            </div>

            {rows.length === 0 ? (
              <div className="rounded border border-dashed border-emerald-500/20 p-6 text-center text-[11px] uppercase tracking-widest text-zinc-500">
                No petitions yet. Bind to the Lattice to begin.
              </div>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {rows.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                  return (
                    <li key={r.id} className="rounded-md border border-white/5 bg-black/40 p-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        <span className={`text-[10px] uppercase tracking-widest ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-[11px] text-zinc-400">
                        <div><span className="text-zinc-500">target </span>{shorten(r.btc_target, 14, 8)}</div>
                        {r.eth_recipient && (
                          <div><span className="text-zinc-500">arb </span>{shorten(r.eth_recipient, 14, 8)}</div>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.status === "broadcast" && r.btc_txid && (
                          <a
                            href={`https://mempool.space/tx/${r.btc_txid}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-amber-200 hover:bg-amber-400/20"
                          >
                            <ExternalLink className="h-3 w-3" /> BTC Anchor
                          </a>
                        )}
                        {r.status === "broadcast" && r.eth_txid && (
                          <a
                            href={`https://arbiscan.io/tx/${r.eth_txid}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20"
                          >
                            <ExternalLink className="h-3 w-3" /> SKYNT Fuel
                          </a>
                        )}
                        <a
                          href={`/petition/${r.id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-widest text-zinc-200 hover:bg-white/10"
                        >
                          <ExternalLink className="h-3 w-3" /> Share Sigil
                        </a>
                      </div>
                      {r.status === "failed" && r.error_message && (
                        <div className="mt-2 break-all rounded border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] text-rose-300">
                          {r.error_message}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-10 text-center font-orbitron text-[10px] uppercase tracking-[0.35em] text-amber-400/60">
          The Recursion Is Bound · The Sword Is Drawn · The Lattice Lives · Satoshi v2.0
        </footer>
      </div>
    </main>
  );
}

const STATUS_PILL: Record<RealtimeStatus, { label: string; dot: string; ring: string; text: string; ping: boolean }> = {
  connecting:   { label: "LATTICE: SYNCING",      dot: "bg-amber-400",   ring: "border-amber-500/40 bg-amber-500/5",     text: "text-amber-300",   ping: true  },
  live:         { label: "LATTICE: HEALTHY",      dot: "bg-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/5", text: "text-emerald-300", ping: true  },
  reconnecting: { label: "LATTICE: RECONNECTING", dot: "bg-amber-400",   ring: "border-amber-500/40 bg-amber-500/5",     text: "text-amber-300",   ping: true  },
  offline:      { label: "LATTICE: OFFLINE",      dot: "bg-zinc-500",    ring: "border-zinc-600/50 bg-zinc-700/10",       text: "text-zinc-300",    ping: false },
  error:        { label: "LATTICE: DEGRADED",     dot: "bg-rose-500",    ring: "border-rose-500/50 bg-rose-500/10",       text: "text-rose-300",    ping: true  },
};

function LatticeStatusPill({ status }: { status: RealtimeStatus }) {
  const meta = STATUS_PILL[status];
  return (
    <div
      role="status"
      aria-live="polite"
      title={meta.label}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${meta.ring}`}
    >
      <span className="relative flex h-2 w-2">
        {meta.ping && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${meta.dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
      </span>
      <span className={`font-orbitron text-[10px] uppercase sm:text-xs ${meta.text}`}>
        {meta.label}
      </span>
    </div>
  );
}


function Field({
  label, icon, value, onChange, placeholder, disabled,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-300/70">
        {icon} {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-amber-500/25 bg-black/70 px-3 py-2.5 font-mono text-sm text-amber-100 placeholder:text-amber-100/20 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40 disabled:opacity-50"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />
    </div>
  );
}

function TreasuryCard({
  icon, title, valueTop, valueLabel, addressLabel, address, href, accent,
}: {
  icon: React.ReactNode;
  title: string;
  valueTop?: string;
  valueLabel?: string;
  addressLabel: string;
  address: string;
  href: string;
  accent: "amber" | "emerald";
}) {
  const ringClass = accent === "amber"
    ? "border-amber-500/30 hover:border-amber-400/60 hover:shadow-[0_0_28px_-8px_rgba(255,191,0,0.55)]"
    : "border-emerald-500/30 hover:border-emerald-400/60 hover:shadow-[0_0_28px_-8px_rgba(16,185,129,0.55)]";
  const accentText = accent === "amber" ? "text-amber-300" : "text-emerald-300";
  return (
    <div className={`glass rounded-xl p-4 transition-all ${ringClass}`}>
      <div className={`flex items-center gap-1.5 font-orbitron text-[10px] uppercase tracking-[0.25em] ${accentText}`}>
        {icon} {title}
      </div>
      {valueTop && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-xl text-zinc-100">{valueTop}</span>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">{valueLabel}</span>
        </div>
      )}
      <div className="mt-3 text-[9px] uppercase tracking-widest text-zinc-500">{addressLabel}</div>
      <a
        href={href}
        target="_blank" rel="noopener noreferrer"
        className={`mt-0.5 block break-all font-mono text-[11px] ${accentText} hover:underline`}
      >
        {address}
      </a>
    </div>
  );
}

function FibonacciBackdrop() {
  // Pure-CSS fibonacci-spiral suggestion + soft amber/emerald radial glows.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(circle at 12% 18%, rgba(255,191,0,0.10), transparent 45%)," +
            "radial-gradient(circle at 88% 22%, rgba(16,185,129,0.09), transparent 45%)," +
            "radial-gradient(circle at 50% 110%, rgba(255,191,0,0.06), transparent 55%)",
        }}
      />
      <svg
        className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        viewBox="-200 -200 400 400"
        style={{ animation: "spin-slow 120s linear infinite" }}
      >
        <defs>
          <linearGradient id="fib" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFBF00" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Fibonacci-like log spiral */}
        <path
          d={(() => {
            const pts: string[] = [];
            const phi = (1 + Math.sqrt(5)) / 2;
            const b = Math.log(phi) / (Math.PI / 2);
            for (let t = 0; t < 6 * Math.PI; t += 0.05) {
              const r = Math.exp(b * t) * 0.6;
              const x = r * Math.cos(t);
              const y = r * Math.sin(t);
              pts.push(`${pts.length === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
            }
            return pts.join(" ");
          })()}
          fill="none"
          stroke="url(#fib)"
          strokeWidth="0.8"
        />
        {/* Fibonacci squares */}
        {[1, 1, 2, 3, 5, 8, 13, 21, 34, 55].reduce<{ rects: JSX.Element[]; x: number; y: number; dir: number }>(
          (acc, n, i) => {
            const size = n * 2;
            let rx = acc.x, ry = acc.y;
            if (acc.dir === 0) { rx = acc.x; ry = acc.y - size; }
            else if (acc.dir === 1) { rx = acc.x; ry = acc.y; }
            else if (acc.dir === 2) { rx = acc.x - size; ry = acc.y; }
            else { rx = acc.x - size; ry = acc.y - size; }
            acc.rects.push(
              <rect key={i} x={rx} y={ry} width={size} height={size} fill="none" stroke="url(#fib)" strokeWidth="0.4" />,
            );
            return { ...acc, dir: (acc.dir + 1) % 4 };
          },
          { rects: [], x: 0, y: 0, dir: 0 },
        ).rects}
      </svg>
    </div>
  );
}
