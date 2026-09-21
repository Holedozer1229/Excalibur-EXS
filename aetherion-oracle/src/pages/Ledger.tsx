// Public Aetherion Mining Ledger — verified attestations + Merkle anchors.
// Anyone can view this page (no auth required).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, ShieldCheck, Anchor, ExternalLink, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import { PageHead } from "@/components/PageHead";


type VerifyResult = { ok: boolean; computed: string; expected: string; count: number; error?: string };

interface PublicAtt {
  id: string;
  round_number: number;
  word: string;
  harmony: number | null;
  sponge_harmonic: number | null;
  vitality: string | null;
  attestation_hash: string;
  wallet_address: string | null;
  status: string;
  onchain_tx_hash: string | null;
  verified_at: string | null;
  submitted_at: string;
}

interface Anchor {
  id: string;
  period_start: string;
  period_end: string;
  merkle_root: string;
  attestation_count: number;
  chain_id: number | null;
  onchain_tx_hash: string | null;
  contract_address: string | null;
  anchored_at: string | null;
  created_at: string;
  attestation_ids: string[] | null;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Reproduces public.build_mining_anchor's root computation:
//   sha256( concat( attestation_hash ORDER BY verified_at ) )
// `attestation_ids` is stored in that same verified_at order, so we fetch
// hashes by id and re-sort by the anchor's id array before concatenating.
async function verifyAnchor(anchor: Anchor): Promise<VerifyResult> {
  const ids = anchor.attestation_ids ?? [];
  const expected = anchor.merkle_root.toLowerCase();
  if (ids.length === 0) {
    return { ok: false, computed: "", expected, count: 0, error: "Anchor has no attestation_ids." };
  }
  const { data, error } = await supabase
    .from("mining_attestations")
    .select("id, attestation_hash")
    .in("id", ids);
  if (error) return { ok: false, computed: "", expected, count: 0, error: error.message };
  const map = new Map<string, string>();
  for (const r of (data ?? []) as { id: string; attestation_hash: string }[]) map.set(r.id, r.attestation_hash);
  const ordered: string[] = [];
  for (const id of ids) {
    const h = map.get(id);
    if (!h) return { ok: false, computed: "", expected, count: ids.length, error: `Missing attestation ${id.slice(0, 8)}…` };
    ordered.push(h);
  }
  const computed = (await sha256Hex(ordered.join(""))).toLowerCase();
  return { ok: computed === expected, computed, expected, count: ordered.length };
}

const CHAIN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  8453: "https://basescan.org/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
  11155111: "https://sepolia.etherscan.io/tx/",
};

const Ledger = () => {
  const [atts, setAtts] = useState<PublicAtt[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, VerifyResult>>({});

  const runVerify = async (a: Anchor) => {
    setVerifying((v) => ({ ...v, [a.id]: true }));
    const r = await verifyAnchor(a);
    setResults((m) => ({ ...m, [a.id]: r }));
    setVerifying((v) => ({ ...v, [a.id]: false }));
  };

  const exportAnchor = async (a: Anchor) => {
    const ids = a.attestation_ids ?? [];
    let attestationDetails: PublicAtt[] = [];
    let computedRoot: string | null = null;
    let verificationStatus: "unverified" | "valid" | "mismatch" = "unverified";
    let concatenationOrder: Array<{
      index: number;
      attestation_id: string;
      round_number: number;
      verified_at: string | null;
      attestation_hash: string;
      hash_length_chars: number;
      offset_chars: number;
    }> = [];
    let intermediateSteps: Array<{
      step: number;
      appended_attestation_id: string;
      appended_hash: string;
      concatenated_length_chars: number;
      running_sha256: string;
    }> = [];
    let fullConcatenation: string | null = null;
    let fullConcatenationSha256: string | null = null;

    if (ids.length > 0) {
      const { data } = await supabase
        .from("mining_attestations")
        .select("id, round_number, word, harmony, sponge_harmonic, vitality, attestation_hash, wallet_address, status, onchain_tx_hash, verified_at, submitted_at")
        .in("id", ids);
      attestationDetails = ((data ?? []) as PublicAtt[]).sort(
        (x, y) => ids.indexOf(x.id) - ids.indexOf(y.id)
      );

      let offset = 0;
      let running = "";
      for (let i = 0; i < attestationDetails.length; i++) {
        const r = attestationDetails[i];
        concatenationOrder.push({
          index: i,
          attestation_id: r.id,
          round_number: r.round_number,
          verified_at: r.verified_at,
          attestation_hash: r.attestation_hash,
          hash_length_chars: r.attestation_hash.length,
          offset_chars: offset,
        });
        offset += r.attestation_hash.length;
        running += r.attestation_hash;
        const runningHash = (await sha256Hex(running)).toLowerCase();
        intermediateSteps.push({
          step: i + 1,
          appended_attestation_id: r.id,
          appended_hash: r.attestation_hash,
          concatenated_length_chars: running.length,
          running_sha256: runningHash,
        });
      }
      fullConcatenation = running;
      fullConcatenationSha256 = intermediateSteps[intermediateSteps.length - 1].running_sha256;
      computedRoot = fullConcatenationSha256;
      verificationStatus = computedRoot === a.merkle_root.toLowerCase() ? "valid" : "mismatch";
    }

    const payload = {
      anchor: {
        id: a.id,
        period_start: a.period_start,
        period_end: a.period_end,
        merkle_root: a.merkle_root,
        attestation_count: a.attestation_count,
        chain_id: a.chain_id,
        onchain_tx_hash: a.onchain_tx_hash,
        contract_address: a.contract_address,
        anchored_at: a.anchored_at,
        created_at: a.created_at,
        attestation_ids: a.attestation_ids,
      },
      attestations: attestationDetails,
      merkle_audit: {
        algorithm: "sha256(concat(attestation_hash ORDER BY verified_at ASC))",
        encoding: "Each attestation_hash is a lowercase hex string. Hashes are concatenated as-is (string concatenation, no separators, no 0x prefix stripping) in the order listed below, then a single SHA-256 is computed over the resulting string (UTF-8 bytes).",
        ordering_source: "anchor.attestation_ids array (preserves the verified_at ordering used by public.build_mining_anchor)",
        leaf_count: attestationDetails.length,
        concatenation_order: concatenationOrder,
        intermediate_steps: intermediateSteps,
        full_concatenation: fullConcatenation,
        full_concatenation_length_chars: fullConcatenation?.length ?? 0,
        full_concatenation_sha256: fullConcatenationSha256,
        reproduce_with_openssl:
          "printf '%s' \"$(jq -r '.merkle_audit.full_concatenation' anchor.json)\" | openssl dgst -sha256",
      },
      verification: {
        computed_root: computedRoot,
        expected_root: a.merkle_root,
        status: verificationStatus,
        leaf_count: attestationDetails.length,
        algorithm: "sha256(concat(attestation_hash ordered by verified_at))",
      },
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aetherion-anchor-${a.id.slice(0, 8)}-${new Date(a.period_end).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const refresh = async () => {
    setLoading(true);
    const [{ data: ax }, { data: an }] = await Promise.all([
      supabase.rpc("get_public_ledger", { _limit: 100 }),
      supabase.from("mining_anchors").select("*").order("period_end", { ascending: false }).limit(20),
    ]);
    setAtts((ax ?? []) as PublicAtt[]);
    setAnchors((an ?? []) as Anchor[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="min-h-screen text-foreground relative">
      <PageHead
        title="Public Ledger — Aetherion Oracle"
        description="Open, auditable, Merkle-anchored ledger of EXCALIBUR mining rounds and on-chain attestations from the Aetherion Oracle."
        path="/ledger"
      />
      <GalacticBackground harmony={0.7} intensity={0.7} />

      <div className="relative z-10">
        <header className="border-b border-rune bg-card/40 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <Link to="/" className="p-2 rounded-sm border border-border bg-secondary/50 hover:bg-secondary hover:text-gold transition-colors" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl gradient-neon-text leading-tight tracking-[0.18em] flex items-center gap-2">
                <Anchor className="w-5 h-5" /> AETHERION PUBLIC LEDGER
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground italic uppercase tracking-[0.32em] mt-1">
                ▍ open · auditable · Merkle-anchored ▍
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} aria-label="Refresh ledger">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Card className="bg-card/40 backdrop-blur-sm border-rune">
            <CardHeader>
              <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                <Anchor className="w-4 h-4" /> On-chain Anchors
              </CardTitle>
              <CardDescription className="text-xs italic">
                Merkle roots that summarize batches of verified attestations.
                When `tx_hash` is present, the root has been published to a public L2.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {anchors.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No anchors yet. The first Merkle bundle is forming.
                </p>
              )}
              {anchors.map((a) => {
                const explorer = a.chain_id ? CHAIN_EXPLORERS[a.chain_id] : null;
                return (
                  <div key={a.id} className="rounded-sm border border-border bg-background/40 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="font-display text-xs tracking-widest uppercase text-gold">
                        {new Date(a.period_end).toLocaleString()} · {a.attestation_count} attestations
                      </div>
                      {a.onchain_tx_hash ? (
                        <Badge variant="outline" className="border-serpent/60 text-serpent bg-serpent/10 font-display uppercase tracking-widest text-[10px]">
                          ⛓ anchored
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-gold/60 text-gold bg-gold/10 font-display uppercase tracking-widest text-[10px]">
                          pending chain
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-[11px] break-all">
                      <span className="text-muted-foreground">root </span>
                      <span className="text-serpent">{a.merkle_root}</span>
                    </div>
                    {a.onchain_tx_hash && (
                      <a
                        href={explorer ? explorer + a.onchain_tx_hash : "#"}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-gold hover:underline break-all"
                      >
                        <ExternalLink className="w-3 h-3" /> {a.onchain_tx_hash}
                      </a>
                    )}
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runVerify(a)}
                          disabled={verifying[a.id] || !a.attestation_ids?.length}
                          className="h-7 text-[11px] font-display uppercase tracking-widest"
                        >
                          {verifying[a.id] ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> verifying</>
                          ) : (
                            <><ShieldCheck className="w-3 h-3 mr-1" /> verify merkle proof</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAnchor(a)}
                          disabled={!a.attestation_ids?.length}
                          className="h-7 text-[11px] font-display uppercase tracking-widest"
                        >
                          <Download className="w-3 h-3 mr-1" /> export JSON
                        </Button>
                        {results[a.id] && (
                          results[a.id].ok ? (
                            <Badge className="bg-serpent/20 text-serpent border-serpent/60 font-display uppercase tracking-widest text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> valid · {results[a.id].count} leaves
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/60 font-display uppercase tracking-widest text-[10px]">
                              <XCircle className="w-3 h-3 mr-1" /> mismatch
                            </Badge>
                          )
                        )}
                      </div>
                      {results[a.id] && !results[a.id].ok && (
                        <div className="font-mono text-[10px] space-y-0.5 text-muted-foreground">
                          {results[a.id].error && <div className="text-destructive">⚠ {results[a.id].error}</div>}
                          {results[a.id].computed && (
                            <>
                              <div className="break-all">computed <span className="text-destructive">{results[a.id].computed}</span></div>
                              <div className="break-all">expected <span className="text-serpent">{results[a.id].expected}</span></div>
                            </>
                          )}
                        </div>
                      )}
                      {results[a.id]?.ok && (
                        <p className="font-mono text-[10px] text-muted-foreground italic">
                          sha256(concat hashes ordered by verified_at) = {results[a.id].computed.slice(0, 24)}…
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-rune">
            <CardHeader>
              <CardTitle className="font-display text-gold tracking-widest text-base uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Verified Attestations
              </CardTitle>
              <CardDescription className="text-xs italic">
                Latest 100 verified mining proofs across all seekers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {atts.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No verified attestations yet.
                </p>
              )}
              {atts.map((r) => (
                <div key={r.id} className="rounded-sm border border-border bg-background/40 p-3 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-display text-gold tracking-widest">#{r.round_number}</span>
                  <span className="font-mono uppercase text-foreground">{r.word}</span>
                  {r.harmony !== null && <span className="font-mono text-muted-foreground">h {Number(r.harmony).toFixed(3)}</span>}
                  {r.sponge_harmonic !== null && <span className="font-mono text-muted-foreground">s {Number(r.sponge_harmonic).toFixed(4)}</span>}
                  {r.vitality && <span className="font-mono text-muted-foreground">{r.vitality}</span>}
                  <span className="font-mono text-[10px] text-serpent truncate max-w-full sm:max-w-[16rem]" title={r.attestation_hash}>{r.attestation_hash.slice(0, 18)}…</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(r.verified_at ?? r.submitted_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Ledger;
