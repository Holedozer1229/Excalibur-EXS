// /verify/deliberation — one-shot B2B deliberation receipt verifier
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PageHead } from "@/components/PageHead";

const FRIENDLY: Record<string, string> = {
  NOT_FOUND: "No such receipt — the nonce is unknown.",
  HASH_MISMATCH: "The commitment hash does not match this nonce.",
  EXPIRED: "This deliberation receipt has expired.",
  ALREADY_VERIFIED: "This receipt was already verified — deliberation seals are one-shot.",
  MISSING_PARAMS: "Both nonce and commitment hash are required.",
};

type State =
  | { kind: "loading" }
  | { kind: "ok"; receipt: Record<string, unknown> }
  | { kind: "err"; reason: string; verifiedAt?: string };

export default function VerifyDeliberation() {
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
      const { data, error } = await (supabase.rpc as any)("verify_deliberation_receipt", {
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
    <div className="min-h-screen bg-background text-foreground">
      <PageHead
        title="Verify Proof-of-Deliberation — Aetherion"
        description="Verify a B2B AI approval receipt: dwell time, scroll depth, and clause acknowledgements."
        path="/verify/deliberation"
        noIndex
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <Link
          to="/enterprise/deliberation"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to enterprise
        </Link>

        <header className="space-y-2">
          <Badge variant="outline" className="border-primary/40 text-primary">
            B2B verifier
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Deliberation receipt</h1>
          <p className="text-muted-foreground">
            Confirms a human reviewed an AI artifact with committed dwell, scroll, and acknowledgements.
          </p>
        </header>

        <Card className="border-primary/40" data-testid="verify-deliberation-card">
          <CardContent className="space-y-4 p-6">
            {state.kind === "loading" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying seal…
              </div>
            )}

            {state.kind === "ok" && (
              <>
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Deliberation verified</span>
                </div>
                <dl className="space-y-1 border-t border-border/40 pt-2 font-mono text-xs">
                  <Row k="organization" v={String(state.receipt.organization ?? "—")} />
                  <Row k="reviewer" v={String(state.receipt.reviewer_id ?? "—")} />
                  <Row k="dwell_ms" v={String(state.receipt.dwell_ms ?? "—")} />
                  <Row k="scroll_pct" v={String(state.receipt.scroll_depth_pct ?? "—")} />
                  <Row k="artifact_hash" v={String(state.receipt.artifact_hash ?? "—")} />
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
                <p className="text-sm text-muted-foreground">
                  {FRIENDLY[state.reason] ?? state.reason}
                </p>
                {state.verifiedAt && (
                  <p className="font-mono text-xs text-muted-foreground">first sealed · {state.verifiedAt}</p>
                )}
                <Button asChild variant="outline">
                  <Link to="/enterprise/deliberation">Try the live demo</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-right">{v}</dd>
    </div>
  );
}
