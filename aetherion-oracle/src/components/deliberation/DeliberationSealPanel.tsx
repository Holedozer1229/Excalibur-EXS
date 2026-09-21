import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, ScrollText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_DELIBERATION_CLAUSES,
  DEFAULT_MIN_DWELL_MS,
  DEFAULT_MIN_SCROLL_PCT,
  DEMO_AI_ARTIFACT,
  formatDwell,
  validateDeliberationMetrics,
  type DeliberationClause,
} from "@/lib/proofOfDeliberation";
import { trackEvent } from "@/lib/funnel";

type SealResult = {
  nonce: string;
  commitment_hash: string;
  verifyUrl: string;
  artifact_hash: string;
};

type Props = {
  artifactText?: string;
  clauses?: DeliberationClause[];
  minDwellMs?: number;
  minScrollPct?: number;
  className?: string;
};

export default function DeliberationSealPanel({
  artifactText = DEMO_AI_ARTIFACT,
  clauses = DEFAULT_DELIBERATION_CLAUSES,
  minDwellMs = DEFAULT_MIN_DWELL_MS,
  minScrollPct = DEFAULT_MIN_SCROLL_PCT,
  className = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const [organization, setOrganization] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [dwellMs, setDwellMs] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seal, setSeal] = useState<SealResult | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    const tick = () => {
      if (startedAt.current) setDwellMs(Date.now() - startedAt.current);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
    setScrollPct(pct);
  }, []);

  const toggleClause = (id: string, on: boolean) => {
    setChecked((prev) => ({ ...prev, [id]: on }));
  };

  const acknowledgedIds = clauses.filter((c) => checked[c.id]).map((c) => c.id);
  const validation = validateDeliberationMetrics(
    { dwellMs, scrollDepthPct: scrollPct, acknowledgedClauseIds: acknowledgedIds },
    { minDwellMs, minScrollPct, clauses },
  );
  const canSeal = validation.ok && organization.trim() && reviewerId.trim();

  const sealDeliberation = async () => {
    if (!canSeal) return;
    setBusy(true);
    setError(null);
    void trackEvent("deliberation_seal_started", { org_len: organization.length });
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("deliberation-seal", {
        body: {
          organization: organization.trim(),
          reviewer_id: reviewerId.trim(),
          artifact_text: artifactText,
          dwell_ms: dwellMs,
          scroll_depth_pct: scrollPct,
          acknowledged_clause_ids: acknowledgedIds,
          min_dwell_ms: minDwellMs,
          min_scroll_pct: minScrollPct,
        },
      });
      if (fnErr) throw fnErr;
      const res = data as { ok?: boolean; error?: string; detail?: string } & Partial<SealResult>;
      if (!res?.ok || !res.nonce || !res.commitment_hash) {
        throw new Error(res?.detail ?? res?.error ?? "Could not issue deliberation receipt.");
      }
      setSeal({
        nonce: res.nonce,
        commitment_hash: res.commitment_hash,
        verifyUrl: res.verifyUrl ?? `/verify/deliberation?nonce=${res.nonce}&hash=${res.commitment_hash}`,
        artifact_hash: res.artifact_hash ?? "",
      });
      void trackEvent("deliberation_seal_completed", { dwell_ms: dwellMs, scroll_pct: scrollPct });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seal failed.");
    } finally {
      setBusy(false);
    }
  };

  if (seal) {
    return (
      <Card className={`border-primary/40 ${className}`} data-testid="deliberation-seal-success">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Proof-of-Deliberation sealed</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Audit record issued. Share the verify link with compliance — independent parties can confirm
            dwell time, scroll depth, and clause acknowledgements were committed at seal time.
          </p>
          <dl className="space-y-1 font-mono text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">nonce</dt>
              <dd className="truncate">{seal.nonce}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">commit</dt>
              <dd className="truncate">{seal.commitment_hash}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">artifact</dt>
              <dd className="truncate">{seal.artifact_hash}</dd>
            </div>
          </dl>
          <Button asChild className="w-full">
            <a href={seal.verifyUrl}>Open verify page</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/60 ${className}`} data-testid="deliberation-seal-panel">
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delib-org">Organization</Label>
            <Input
              id="delib-org"
              placeholder="Acme Corp"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delib-reviewer">Reviewer ID</Label>
            <Input
              id="delib-reviewer"
              placeholder="employee@acme.com"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ScrollText className="h-3.5 w-3.5" /> AI artifact under review
            </span>
            <span data-testid="deliberation-scroll-pct">{scrollPct}% scrolled</span>
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="max-h-56 overflow-y-auto rounded-md border border-border/50 bg-card/40 p-4 text-sm leading-relaxed"
            data-testid="deliberation-artifact-scroll"
          >
            <pre className="whitespace-pre-wrap font-sans text-foreground/90">{artifactText}</pre>
          </div>
          <Progress value={scrollPct} className="h-1.5" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              Dwell:{" "}
              <span data-testid="deliberation-dwell" className="font-mono">
                {formatDwell(dwellMs / 1000)}
              </span>
              <span className="text-muted-foreground"> / {formatDwell(minDwellMs / 1000)} min</span>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Scroll ≥ {minScrollPct}% required</span>
          </div>
        </div>

        <div className="space-y-3">
          {clauses.map((clause) => (
            <label key={clause.id} className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={!!checked[clause.id]}
                onCheckedChange={(v) => toggleClause(clause.id, v === true)}
                data-testid={`deliberation-clause-${clause.id}`}
              />
              <span>{clause.label}</span>
            </label>
          ))}
        </div>

        {!validation.ok && (
          <p className="text-xs text-amber-200/90" data-testid="deliberation-validation-hint">
            {"reason" in validation ? validation.reason : null}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full gap-2"
          disabled={!canSeal || busy}
          onClick={() => void sealDeliberation()}
          data-testid="deliberation-seal-button"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Seal proof-of-deliberation
        </Button>
      </CardContent>
    </Card>
  );
}
