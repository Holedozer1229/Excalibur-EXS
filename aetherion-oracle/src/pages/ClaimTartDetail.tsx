import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bitcoin,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Hammer,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Claim = {
  id: string;
  user_id: string;
  amount: number;
  btc_address: string;
  status: "pending" | "inscribing" | "inscribed" | "failed" | "canceled";
  inscription_id: string | null;
  tx_hash: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const TICK = "ATART";

const statusTone: Record<Claim["status"], string> = {
  pending: "border-amber-500/50 text-amber-300",
  inscribing: "border-sky-500/50 text-sky-300",
  inscribed: "border-emerald-500/50 text-emerald-300",
  failed: "border-destructive/60 text-destructive",
  canceled: "border-muted-foreground/40 text-muted-foreground",
};

const StatusIcon = ({ status }: { status: Claim["status"] }) => {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 mr-1" />;
    case "inscribing":
      return <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
    case "inscribed":
      return <Check className="h-3 w-3 mr-1" />;
    default:
      return <ShieldCheck className="h-3 w-3 mr-1" />;
  }
};

const PayloadBlock = ({
  title,
  icon,
  json,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  json: string;
  hint: string;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success(`${title} copied`);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {icon}
          {title}
        </div>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={copy}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="text-[11px] font-mono bg-background/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
        {json}
      </pre>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
};

const ClaimTartDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("tart_claims")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      setNotFound(true);
    } else {
      setClaim(data as Claim);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`claim-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tart_claims", filter: `id=eq.${id}` },
        (payload) => setClaim(payload.new as Claim)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const payloads = useMemo(() => {
    if (!claim) return null;
    const amt = String(claim.amount);
    return {
      mint: JSON.stringify({ p: "brc-20", op: "mint", tick: TICK, amt }),
      transfer: JSON.stringify({ p: "brc-20", op: "transfer", tick: TICK, amt }),
    };
  }, [claim]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>ATART claim {id?.slice(0, 8)} | Aetherion</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/claim/tart">
              <ArrowLeft className="h-4 w-4 mr-2" /> All claims
            </Link>
          </Button>
          {claim && (
            <Badge variant="outline" className={statusTone[claim.status]}>
              <StatusIcon status={claim.status} />
              {claim.status}
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading claim…
          </div>
        ) : notFound || !claim ? (
          <Card>
            <CardContent className="p-6 text-sm">
              Claim not found, or you don't have access to it.
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bitcoin className="h-6 w-6 text-amber-400" />
                {claim.amount} ATART → Bitcoin
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{claim.id}</p>
            </motion.div>

            <Card className="border-primary/30 bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base">Reservation</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Amount reserved</div>
                  <div className="font-semibold text-base">{claim.amount} ATART</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Requested</div>
                  <div>{new Date(claim.created_at).toLocaleString()}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Destination address</div>
                  <div className="font-mono text-[11px] break-all">{claim.btc_address}</div>
                </div>
                {claim.note && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Note</div>
                    <div className="text-[11px]">{claim.note}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {(claim.status === "pending" || claim.status === "inscribing") && payloads && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">BRC-20 inscription payloads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PayloadBlock
                    title="1. Mint inscription"
                    icon={<Hammer className="h-3 w-3" />}
                    json={payloads.mint}
                    hint="Inscribe this JSON first to claim the ATART supply for this batch."
                  />
                  <PayloadBlock
                    title="2. Transfer inscription"
                    icon={<Send className="h-3 w-3" />}
                    json={payloads.transfer}
                    hint={`Inscribe and send to ${claim.btc_address} to deliver the tokens.`}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The Aetherion ops team batches and broadcasts these inscriptions on Bitcoin. You don't need
                    to do anything — this page updates automatically once the reveal tx confirms.
                  </p>
                </CardContent>
              </Card>
            )}

            {(claim.inscription_id || claim.tx_hash || claim.status === "inscribed") && (
              <Card className="border-emerald-500/40 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" /> On-chain proof
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {claim.inscription_id && (
                    <div>
                      <div className="text-muted-foreground mb-1">Inscription ID</div>
                      <a
                        href={`https://ordinals.com/inscription/${claim.inscription_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline font-mono text-[11px] break-all"
                      >
                        {claim.inscription_id}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {claim.tx_hash && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-muted-foreground mb-1">Reveal transaction</div>
                        <a
                          href={`https://mempool.space/tx/${claim.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline font-mono text-[11px] break-all"
                        >
                          {claim.tx_hash}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </>
                  )}
                  <Separator />
                  <a
                    href={`https://unisat.io/brc20/${TICK}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline text-[11px]"
                  >
                    View ATART on UniSat <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            )}

            {claim.status === "failed" || claim.status === "canceled" ? (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="p-4 text-xs">
                  This claim was {claim.status}. The {claim.amount} ATART has been refunded to your balance.
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default ClaimTartDetail;
