// /verify — one-shot divination receipt verifier.
// A receipt's (nonce, commitment hash) can be claimed exactly once. The
// server-side `verify_divination_receipt` RPC atomically marks it verified
// and refuses every subsequent attempt with ALREADY_VERIFIED.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://www.excaliburcrypto.com";

type State =
  | { kind: "loading" }
  | { kind: "ok"; receipt: Record<string, unknown> }
  | { kind: "err"; reason: string; verifiedAt?: string };

const FRIENDLY: Record<string, string> = {
  NOT_FOUND: "No such receipt — the nonce is unknown to the Oracle.",
  HASH_MISMATCH: "The commitment hash does not match this nonce.",
  EXPIRED: "This divination receipt has expired.",
  ALREADY_VERIFIED: "This receipt has already been claimed — divinations are one-shot.",
  MISSING_PARAMS: "Both nonce and commitment hash are required.",
};

const VerifyDivination = () => {
  const [params] = useSearchParams();
  const nonce = params.get("nonce") ?? "";
  const hash = params.get("hash") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      if (!nonce || !hash) {
        setState({ kind: "err", reason: "MISSING_PARAMS" });
        return;
      }
      const { data, error } = await supabase.rpc("verify_divination_receipt", {
        _nonce: nonce,
        _commitment_hash: hash,
      });
      if (error) {
        setState({ kind: "err", reason: error.message });
        return;
      }
      const res = data as { ok: boolean; reason?: string; verified_at?: string } & Record<string, unknown>;
      if (res?.ok) setState({ kind: "ok", receipt: res });
      else setState({ kind: "err", reason: res?.reason ?? "UNKNOWN", verifiedAt: res?.verified_at });
    })();
  }, [nonce, hash]);

  return (
    <div className="min-h-screen text-foreground bg-background">
      <Helmet>
        <title>Verify Divination Receipt — Aetherion Oracle</title>
        <meta name="description" content="Verify a Caduceus tarot divination receipt. Each receipt can be claimed exactly once." />
        <link rel="canonical" href={`${SITE}/verify`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <Link to="/tarot" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to tarot
        </Link>

        <header className="space-y-2">
          <Badge variant="outline" className="border-primary/40 text-primary">Caduceus verifier</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Divination receipt</h1>
          <p className="text-muted-foreground">Each receipt is single-use. The Oracle will only confirm it once.</p>
        </header>

        <Card className="border-primary/40">
          <CardContent className="p-6 space-y-4">
            {state.kind === "loading" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Consulting the Oracle…
              </div>
            )}

            {state.kind === "ok" && (
              <>
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Receipt verified</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The Caduceus confirms this divination. It is now sealed and cannot be verified again.
                </p>
                <dl className="text-xs font-mono space-y-1 pt-2 border-t border-border/40">
                  <Row k="wallet" v={String((state.receipt.wallet_address as string) ?? "anonymous")} />
                  <Row k="nonce" v={String(state.receipt.nonce)} />
                  <Row k="commit" v={String(state.receipt.commitment_hash)} />
                  <Row k="issued" v={String(state.receipt.issued_at)} />
                  <Row k="sealed" v={String(state.receipt.verified_at)} />
                </dl>
              </>
            )}

            {state.kind === "err" && (
              <>
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-semibold">Verification refused</span>
                </div>
                <p className="text-sm text-muted-foreground">{FRIENDLY[state.reason] ?? state.reason}</p>
                {state.verifiedAt && (
                  <p className="text-xs font-mono text-muted-foreground">first sealed · {state.verifiedAt}</p>
                )}
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/tarot">Cast a fresh reading</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-3">
    <dt className="w-16 shrink-0 text-muted-foreground">{k}</dt>
    <dd className="truncate text-foreground/90">{v}</dd>
  </div>
);

export default VerifyDivination;
