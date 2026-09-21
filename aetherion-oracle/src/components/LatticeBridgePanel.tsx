import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity, Bitcoin, Globe, Loader2, Sparkles, ExternalLink,
  ShieldAlert, Hexagon,
} from "lucide-react";

type PetitionStatus = "pending" | "processing" | "broadcast" | "failed";

interface PetitionRow {
  id: string;
  status: PetitionStatus;
  btc_target: string;
  eth_recipient: string | null;
  btc_txid: string | null;
  eth_txid: string | null;
  error_message: string | null;
}

const STATUS_LABEL: Record<PetitionStatus, string> = {
  pending: "AWAITING DEEP CORE",
  processing: "SYNCHRONIZING WITH DEEP CORE…",
  broadcast: "LATTICE BOUND · TX BROADCAST",
  failed: "BRAID INVERSION FAILED",
};

export default function LatticeBridgePanel() {
  const [btcTarget, setBtcTarget] = useState("");
  const [ethRecipient, setEthRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [petition, setPetition] = useState<PetitionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Tear down realtime subscription
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const subscribeTo = (id: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = supabase
      .channel(`petition:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "petitions", filter: `id=eq.${id}` },
        (payload) => setPetition(payload.new as PetitionRow),
      )
      .subscribe();
  };

  const handleBind = async () => {
    setError(null);
    setPetition(null);
    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("petition", {
        body: {
          btcTarget: btcTarget.trim(),
          ethRecipient: ethRecipient.trim() || null,
        },
      });
      if (fnErr) throw fnErr;
      const id = (data as { id?: string })?.id;
      if (!id) throw new Error("No petition id returned");

      // Fetch the latest row state and start listening
      subscribeTo(id);
      const { data: row } = await supabase
        .from("petitions")
        .select("id,status,btc_target,eth_recipient,btc_txid,eth_txid,error_message")
        .eq("id", id)
        .maybeSingle();
      if (row) setPetition(row as PetitionRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = btcTarget.trim().length >= 8 && !submitting;
  const status = petition?.status;
  const isWorking = submitting || status === "pending" || status === "processing";

  return (
    <Card className="bg-black/60 border-amber-500/40 shadow-[0_0_40px_-12px_rgba(245,158,11,0.4)]">
      <CardHeader>
        <CardTitle className="font-mono uppercase tracking-[0.3em] text-amber-400 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Lattice Bridge · 3D → 11D
        </CardTitle>
        <p className="text-[10px] uppercase tracking-widest text-amber-200/50 mt-1 flex items-center gap-2">
          <Hexagon className="w-3 h-3" /> Sphinx Engine · Braid Inversion Proofs
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-amber-300/70 flex items-center gap-1.5">
            <Bitcoin className="w-3 h-3" /> Bitcoin Target (Bech32)
          </Label>
          <Input
            value={btcTarget}
            onChange={(e) => setBtcTarget(e.target.value)}
            placeholder="bc1q…"
            disabled={isWorking}
            className="font-mono bg-black/80 border-amber-500/30 text-amber-100 placeholder:text-amber-100/20 focus-visible:ring-amber-500/60"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-amber-300/70 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> Arbitrum Recipient (0x)
          </Label>
          <Input
            value={ethRecipient}
            onChange={(e) => setEthRecipient(e.target.value)}
            placeholder="0x… (optional)"
            disabled={isWorking}
            className="font-mono bg-black/80 border-amber-500/30 text-amber-100 placeholder:text-amber-100/20 focus-visible:ring-amber-500/60"
          />
        </div>

        <Button
          onClick={handleBind}
          disabled={!canSubmit || isWorking}
          className="w-full font-mono tracking-[0.3em] uppercase bg-amber-500/10 text-amber-300 border border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-200 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.7)] transition-all"
        >
          {isWorking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {STATUS_LABEL[status ?? "processing"]}
            </>
          ) : (
            "Bind to Lattice"
          )}
        </Button>

        {error && (
          <div className="rounded border border-red-500/50 bg-red-500/10 p-3 font-mono text-xs text-red-300 flex gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-all">{error}</span>
          </div>
        )}

        {petition && (
          <div className="rounded border border-amber-500/30 bg-amber-500/[0.03] p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-300 uppercase tracking-widest text-[10px]">
              <Activity className="w-3 h-3" /> Status: {STATUS_LABEL[petition.status]}
            </div>

            {petition.status === "failed" && petition.error_message && (
              <div className="rounded border border-red-500/50 bg-red-500/10 p-2 text-red-300 break-all">
                {petition.error_message}
              </div>
            )}

            {petition.status === "broadcast" && (
              <div className="space-y-2">
                {petition.btc_txid && (
                  <a
                    href={`https://mempool.space/tx/${petition.btc_txid}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-amber-200 hover:text-amber-100 hover:underline break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    BTC Anchor: {petition.btc_txid.slice(0, 16)}…{petition.btc_txid.slice(-8)}
                  </a>
                )}
                {petition.eth_txid && (
                  <a
                    href={`https://arbiscan.io/tx/${petition.eth_txid}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-amber-200 hover:text-amber-100 hover:underline break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    ARB Faucet: {petition.eth_txid.slice(0, 16)}…{petition.eth_txid.slice(-8)}
                  </a>
                )}
              </div>
            )}

            <div className="text-amber-200/40 text-[10px] break-all">petition · {petition.id}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
