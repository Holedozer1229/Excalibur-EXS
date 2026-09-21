// /admin/btc-claims — process ATART + AETX BRC-20 claim queues on Bitcoin mainnet
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bitcoin, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AetxDeployStatus, { AETX_INSCRIPTION_ID } from "@/components/AetxDeployStatus";

type ClaimRow = {
  id: string;
  amount: number;
  btc_address: string;
  status: string;
  created_at: string;
  inscription_id: string | null;
};

type WorkerPayload = {
  claim_id: string;
  amount: number;
  btc_address: string;
  mint_json: string;
  transfer_json: string;
  instructions: string;
};

type WorkerResult = {
  ok: boolean;
  processed: number;
  claims: WorkerPayload[];
  error?: string;
};

async function invokeWorker(
  fn: "tart-claims-worker" | "aetx-claims-worker",
  body: Record<string, unknown>,
): Promise<WorkerResult> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  if ((data as { error?: unknown })?.error) {
    throw new Error(JSON.stringify((data as { error: unknown }).error));
  }
  return data as WorkerResult;
}

export default function AdminBtcClaims() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [atartPending, setAtartPending] = useState<ClaimRow[]>([]);
  const [aetxPending, setAetxPending] = useState<ClaimRow[]>([]);
  const [lastAtart, setLastAtart] = useState<WorkerPayload[]>([]);
  const [lastAetx, setLastAetx] = useState<WorkerPayload[]>([]);
  const [markTick, setMarkTick] = useState<"ATART" | "AETX">("ATART");
  const [markClaimId, setMarkClaimId] = useState("");
  const [markInscriptionId, setMarkInscriptionId] = useState("");
  const [markTxHash, setMarkTxHash] = useState("");

  const refresh = useCallback(async () => {
    const [{ data: atart }, { data: aetx }] = await Promise.all([
      supabase
        .from("tart_claims")
        .select("id, amount, btc_address, status, created_at, inscription_id")
        .in("status", ["pending", "inscribing"])
        .order("created_at", { ascending: true })
        .limit(30),
      supabase
        .from("aetx_claims")
        .select("id, amount, btc_address, status, created_at, inscription_id")
        .in("status", ["pending", "inscribing"])
        .order("created_at", { ascending: true })
        .limit(30),
    ]);
    setAtartPending((atart ?? []) as ClaimRow[]);
    setAetxPending((aetx ?? []) as ClaimRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) await refresh();
      setLoading(false);
    })();
  }, [navigate, refresh]);

  const processBatch = async (tick: "ATART" | "AETX") => {
    const fn = tick === "ATART" ? "tart-claims-worker" : "aetx-claims-worker";
    setBusy(tick);
    try {
      const result = await invokeWorker(fn, { action: "process", limit: 10 });
      if (tick === "ATART") setLastAtart(result.claims ?? []);
      else setLastAetx(result.claims ?? []);
      toast({
        title: `${tick} batch processed`,
        description: `${result.processed} claim(s) → inscribing`,
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Worker failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const markInscribed = async () => {
    if (!markClaimId || !markInscriptionId) {
      toast({ title: "claim_id and inscription_id required", variant: "destructive" });
      return;
    }
    const fn = markTick === "ATART" ? "tart-claims-worker" : "aetx-claims-worker";
    setBusy("mark");
    try {
      await invokeWorker(fn, {
        action: "mark_inscribed",
        claim_id: markClaimId,
        inscription_id: markInscriptionId,
        tx_hash: markTxHash || undefined,
      });
      toast({ title: `${markTick} claim inscribed` });
      setMarkClaimId("");
      setMarkInscriptionId("");
      setMarkTxHash("");
      await refresh();
    } catch (e) {
      toast({
        title: "Mark failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return <p className="p-8 text-center text-muted-foreground">Admin only.</p>;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bitcoin className="h-6 w-6 text-amber-400" />
            Bitcoin mainnet claims
          </h1>
          <p className="text-sm text-muted-foreground">
            Process ATART + AETX BRC-20 queues. Fund deployer wallet with BTC for inscription fees.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <AetxDeployStatus compact />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ops checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Confirm AETX deploy:{" "}
            <a
              href={`https://ordinals.com/inscription/${AETX_INSCRIPTION_ID}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              ordinals.com <ExternalLink className="inline h-3 w-3" />
            </a>
          </p>
          <p>2. Deploy ATART if needed via <Link to="/admin/brc20" className="text-primary hover:underline">/admin/brc20</Link>.</p>
          <p>3. Process pending → inscribe mint+transfer with UniSat/Xverse → mark inscribed.</p>
          <p>4. Users track status on <Link to="/claim/tart" className="text-primary hover:underline">/claim/tart</Link> and{" "}
            <Link to="/claim/aetx" className="text-primary hover:underline">/claim/aetx</Link>.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ClaimQueueCard
          tick="ATART"
          rows={atartPending}
          busy={busy === "ATART"}
          onProcess={() => void processBatch("ATART")}
        />
        <ClaimQueueCard
          tick="AETX"
          rows={aetxPending}
          busy={busy === "AETX"}
          onProcess={() => void processBatch("AETX")}
        />
      </div>

      {(lastAtart.length > 0 || lastAetx.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest inscription payloads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...lastAtart.map((p) => ({ ...p, tick: "ATART" as const })), ...lastAetx.map((p) => ({ ...p, tick: "AETX" as const }))].map((p) => (
              <div key={p.claim_id} className="rounded border border-border p-3 text-xs">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{p.tick}</Badge>
                  <span className="font-mono">{p.amount} → {p.btc_address.slice(0, 12)}…</span>
                </div>
                <pre className="mb-1 overflow-x-auto rounded bg-muted p-2">mint: {p.mint_json}</pre>
                <pre className="mb-2 overflow-x-auto rounded bg-muted p-2">xfer: {p.transfer_json}</pre>
                <p className="text-muted-foreground">{p.instructions}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mark inscribed</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Token</Label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={markTick}
              onChange={(e) => setMarkTick(e.target.value as "ATART" | "AETX")}
            >
              <option value="ATART">ATART</option>
              <option value="AETX">AETX</option>
            </select>
          </div>
          <div>
            <Label>Claim ID</Label>
            <Input value={markClaimId} onChange={(e) => setMarkClaimId(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <Label>Inscription ID</Label>
            <Input value={markInscriptionId} onChange={(e) => setMarkInscriptionId(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <Label>Tx hash (optional)</Label>
            <Input value={markTxHash} onChange={(e) => setMarkTxHash(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void markInscribed()} disabled={busy === "mark"}>
              {busy === "mark" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm inscribed on L1
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClaimQueueCard({
  tick,
  rows,
  busy,
  onProcess,
}: {
  tick: string;
  rows: ClaimRow[];
  busy: boolean;
  onProcess: () => void;
}) {
  const pending = rows.filter((r) => r.status === "pending").length;
  const inscribing = rows.filter((r) => r.status === "inscribing").length;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{tick}</CardTitle>
        <div className="flex gap-2 text-[10px] uppercase tracking-widest">
          <Badge variant="secondary">{pending} pending</Badge>
          <Badge variant="outline">{inscribing} inscribing</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" onClick={onProcess} disabled={busy || pending === 0}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Process next batch (max 10)
        </Button>
        <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
          {rows.length === 0 ? (
            <li className="text-muted-foreground">Queue empty</li>
          ) : (
            rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 rounded border border-border/60 px-2 py-1">
                <span className="font-mono truncate">{r.amount} · {r.btc_address.slice(0, 14)}…</span>
                <Badge variant="outline" className="shrink-0 text-[9px]">
                  {r.status}
                </Badge>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
