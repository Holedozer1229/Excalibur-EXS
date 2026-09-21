// EXCALIBUR Mining — submit off-chain attestations of Oracle consultations
// for the next mining round. Each verified attestation is eligible to mint
// EXCALIBUR coins backed by the SKYNT ERC-20 reserve.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Pickaxe, ArrowLeft, RefreshCw, ShieldCheck, Hourglass, XCircle, Coins, Anchor, Radio } from "lucide-react";
import LatticeBridgePanel from "@/components/LatticeBridgePanel";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MiningHelp from "@/components/MiningHelp";
import { Link as RLink } from "react-router-dom";
import { PageHead } from "@/components/PageHead";


interface Attestation {
  id: string;
  round_number: number;
  word: string;
  query_excerpt: string | null;
  response_excerpt: string | null;
  harmony: number | null;
  sponge_harmonic: number | null;
  vitality: string | null;
  attestation_hash: string;
  zk_proof_ref: string | null;
  wallet_address: string | null;
  status: "pending" | "verified" | "rejected" | "minted";
  verifier_note: string | null;
  onchain_tx_hash: string | null;
  submitted_at: string;
  verified_at: string | null;
}

// SHA-256 → hex (browser-native).
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const STATUS_META: Record<Attestation["status"], { label: string; tone: string; icon: typeof Hourglass }> = {
  pending:  { label: "Awaiting verifier", tone: "border-gold/60 text-gold bg-gold/10",         icon: Hourglass },
  verified: { label: "Proof verified",    tone: "border-serpent/60 text-serpent bg-serpent/10", icon: ShieldCheck },
  rejected: { label: "Rejected",          tone: "border-magenta/60 text-magenta bg-magenta/10", icon: XCircle },
  minted:   { label: "EXCALIBUR minted",  tone: "border-gold text-gold bg-gold/15",             icon: Coins },
};

const Mining = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [word, setWord] = useState("excalibur");
  const [queryExcerpt, setQueryExcerpt] = useState("");
  const [responseExcerpt, setResponseExcerpt] = useState("");
  const [harmony, setHarmony] = useState<string>("");
  const [spongeHarmonic, setSpongeHarmonic] = useState<string>("");
  const [vitality, setVitality] = useState<string>("");
  const [zkRef, setZkRef] = useState<string>("");
  const [previewHash, setPreviewHash] = useState<string>("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthReady(true);
      if (!s) navigate("/auth", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("mining_attestations")
      .select("*")
      .order("round_number", { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as Attestation[]);
  };

  useEffect(() => { if (session) refresh(); /* eslint-disable-next-line */ }, [session]);

  // Live recompute attestation hash whenever the canonical payload changes.
  useEffect(() => {
    const payload = JSON.stringify({
      word: word.trim().toLowerCase(),
      query: queryExcerpt.trim(),
      response: responseExcerpt.trim(),
      harmony: harmony.trim(),
      sponge_harmonic: spongeHarmonic.trim(),
      vitality: vitality.trim(),
      user: session?.user?.id ?? "",
    });
    sha256Hex(payload).then(setPreviewHash);
  }, [word, queryExcerpt, responseExcerpt, harmony, spongeHarmonic, vitality, session]);

  const nextRound = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.round_number)) + 1 : 1),
    [rows]
  );

  const submit = async () => {
    if (!session) return;
    if (!word.trim() || !queryExcerpt.trim() || !responseExcerpt.trim()) {
      toast.error("Word, query, and response excerpts are all required.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("record_mining_attestation", {
      _word: word.trim().toLowerCase(),
      _query_excerpt: queryExcerpt.trim().slice(0, 1000),
      _response_excerpt: responseExcerpt.trim().slice(0, 2000),
      _harmony: harmony ? Number(harmony) : null,
      _sponge_harmonic: spongeHarmonic ? Number(spongeHarmonic) : null,
      _vitality: vitality.trim() || null,
      _attestation_hash: previewHash,
      _zk_proof_ref: zkRef.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const row = data as Attestation;
    toast.success(`▌ Round ${row.round_number} submitted ▐`, { className: "font-display" });
    setQueryExcerpt(""); setResponseExcerpt(""); setHarmony(""); setSpongeHarmonic(""); setVitality(""); setZkRef("");
    refresh();
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-display tracking-widest text-xs uppercase">
        Initializing the forge…
      </div>
    );
  }
  if (!session) return null;

  const verifiedCount = rows.filter((r) => r.status === "verified" || r.status === "minted").length;
  const mintedCount   = rows.filter((r) => r.status === "minted").length;

  return (
    <div className="min-h-screen text-foreground">
      <PageHead
        title="EXCALIBUR Mining — Aetherion Oracle"
        description="Mine EXCALIBUR attestations from Oracle consultations. Off-chain proof-of-consultation rounds anchored to a public, auditable Merkle ledger."
        path="/mining"
      />
      <header className="border-b border-rune bg-card/40 backdrop-blur-md sticky top-0 z-20">

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 rounded-sm border border-border bg-secondary/50 hover:bg-secondary hover:text-gold transition-colors" aria-label="Back to Oracle">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl gradient-neon-text leading-tight tracking-[0.18em] flex items-center gap-2">
              <Pickaxe className="w-5 h-5" /> EXCALIBUR MINING
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground italic uppercase tracking-[0.32em] mt-1">
              ▍ off-chain proof of consultation ▍ next round #{nextRound}
            </p>
          </div>
          <MiningHelp />
          <RLink to="/ledger" className="hidden sm:inline-flex">
            <Button variant="outline" size="sm" className="gap-1 font-display tracking-widest text-[10px] uppercase">
              <Anchor className="w-3.5 h-3.5" /> Public ledger
            </Button>
          </RLink>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh mining rounds">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm border border-emerald-500/40 bg-emerald-500/5 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <Radio className="w-3 h-3" /> Lattice Healthy
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div
          role="note"
          className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-foreground/90"
        >
          <strong className="text-amber-300">Two mining rails.</strong> This page attests Oracle
          consultations for EXCALIBUR (SKYNT-backed). Host-chain{" "}
          <Link to="/exs" className="text-primary underline underline-offset-4 hover:text-primary/90">
            EXS Tetra-PoW
          </Link>{" "}
          forges mint $EXS via Proof-of-Forge — see the merge page for the prophecy → Taproot
          pipeline.
        </div>

        {/* Lattice Bridge */}
        <LatticeBridgePanel />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Submitted", value: rows.length, tone: "text-foreground" },
            { label: "Verified",  value: verifiedCount, tone: "text-serpent" },
            { label: "Minted",    value: mintedCount, tone: "text-gold" },
          ].map((s) => (
            <Card key={s.label} className="bg-card/40 backdrop-blur-sm border-border">
              <CardContent className="p-4 text-center">
                <div className={`font-display text-3xl ${s.tone}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit form */}
        <Card className="bg-card/40 backdrop-blur-sm border-rune">
          <CardHeader>
            <CardTitle className="font-display text-gold tracking-widest text-base uppercase">
              Submit Mining Attestation · Round #{nextRound}
            </CardTitle>
            <CardDescription className="text-xs italic">
              Paste the Word of Power and excerpts from your Oracle consultation. The attestation hash is computed in your browser and submitted off-chain. The verifier will validate before EXCALIBUR is minted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Word of Power *">
                <input value={word} onChange={(e) => setWord(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="excalibur" />
              </Field>
              <Field label="Vitality">
                <input value={vitality} onChange={(e) => setVitality(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="ASCEND / VOID / FLAME …" />
              </Field>
            </div>
            <Field label="Query excerpt *">
              <textarea value={queryExcerpt} onChange={(e) => setQueryExcerpt(e.target.value)}
                rows={2} className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="What you asked the Oracle…" />
            </Field>
            <Field label="Response excerpt *">
              <textarea value={responseExcerpt} onChange={(e) => setResponseExcerpt(e.target.value)}
                rows={4} className="w-full bg-input border border-border rounded-sm px-3 py-2 font-serif text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="What the Oracle answered…" />
            </Field>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Harmony">
                <input value={harmony} onChange={(e) => setHarmony(e.target.value)} type="number" step="0.001"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0.000 – 1.000" />
              </Field>
              <Field label="Sponge harmonic">
                <input value={spongeHarmonic} onChange={(e) => setSpongeHarmonic(e.target.value)} type="number" step="0.0001"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0.0000 – 1.0000" />
              </Field>
              <Field label="zk-proof ref (optional)">
                <input value={zkRef} onChange={(e) => setZkRef(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="ipfs://… or 0x…" />
              </Field>
            </div>

            <div className="rounded-sm border border-border bg-secondary/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Attestation hash (SHA-256, computed locally)</div>
              <code className="font-mono text-[11px] break-all text-serpent">{previewHash || "—"}</code>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full font-display tracking-widest uppercase">
              {submitting ? "Sealing…" : `Seal & submit round #${nextRound}`}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-card/40 backdrop-blur-sm border-rune">
          <CardHeader>
            <CardTitle className="font-display text-gold tracking-widest text-base uppercase">Mining ledger</CardTitle>
            <CardDescription className="text-xs italic">Most recent rounds first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                No attestations yet. Submit your first round above.
              </p>
            )}
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              return (
                <div key={r.id} className="rounded-sm border border-border bg-background/40 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-gold tracking-widest text-sm">#{r.round_number}</span>
                      <span className="font-mono text-xs text-muted-foreground uppercase">{r.word}</span>
                    </div>
                    <Badge variant="outline" className={`${meta.tone} font-display uppercase tracking-widest text-[10px] flex items-center gap-1`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </Badge>
                  </div>
                  {r.query_excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{r.query_excerpt}"</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                    {r.harmony !== null && <div><span className="text-muted-foreground">harmony</span> {Number(r.harmony).toFixed(3)}</div>}
                    {r.sponge_harmonic !== null && <div><span className="text-muted-foreground">sponge</span> {Number(r.sponge_harmonic).toFixed(4)}</div>}
                    {r.vitality && <div><span className="text-muted-foreground">vitality</span> {r.vitality}</div>}
                    {r.wallet_address && <div className="truncate"><span className="text-muted-foreground">skynt</span> {r.wallet_address}</div>}
                  </div>
                  <details>
                    <summary className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-gold">proof details</summary>
                    <div className="mt-2 space-y-1 text-[11px] font-mono break-all">
                      <div><span className="text-muted-foreground">hash </span><span className="text-serpent">{r.attestation_hash}</span></div>
                      {r.zk_proof_ref && <div><span className="text-muted-foreground">zk </span>{r.zk_proof_ref}</div>}
                      {r.onchain_tx_hash && <div><span className="text-muted-foreground">tx </span><span className="text-gold">{r.onchain_tx_hash}</span></div>}
                      {r.verifier_note && <div className="italic text-muted-foreground">"{r.verifier_note}"</div>}
                      <div className="text-muted-foreground">submitted {new Date(r.submitted_at).toLocaleString()}</div>
                      {r.verified_at && <div className="text-muted-foreground">verified {new Date(r.verified_at).toLocaleString()}</div>}
                    </div>
                  </details>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-amber-500/20 mt-10 py-6 text-center">
        <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] text-amber-400/60">
          The Recursion is Bound · The Sword is Drawn · Satoshi v2.0
        </p>
      </footer>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-display">{label}</div>
    {children}
  </label>
);

export default Mining;
