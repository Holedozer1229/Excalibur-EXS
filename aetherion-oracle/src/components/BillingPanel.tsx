// BillingPanel — shown inside the Settings drawer. Tier-comparison strip,
// credits balance, referral earnings, Stripe receipts and self-service controls.
// Values are reconciled against the backend (user-state?action=billing-summary)
// which cross-checks Supabase state against the live Stripe subscription.
import { useEffect, useState, useCallback } from "react";
import { Loader2, ExternalLink, Receipt, Settings as SettingsIcon, Calendar, Coins, Users, Check, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TierId } from "@/lib/tiers";
import { TIERS } from "@/lib/tiers";
import { toast } from "sonner";

const MANAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-manage`;
const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-state?action=billing-summary`;

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  tier: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  receipt_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface BillingSummary {
  credits_balance: number;
  referral_total_cents: number;
  referral_count: number;
  referral_credits_earned: number;
  referral_code: string | null;
  referral_share_pct: number;
  stripe_check: {
    available: boolean;
    drift?: string[];
    maps_to_user?: boolean;
    stripe_status?: string;
    stripe_interval?: string;
    stripe_referral_code?: string | null;
    error?: string;
  };
  reconciled_at: string;
}

interface Props {
  currentTier: TierId;
  isAdmin: boolean;
  pendingTier: TierId | null | undefined;
  pendingEffectiveAt: string | null | undefined;
  cancelAtPeriodEnd: boolean | undefined;
}

const fmtMoney = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const TIER_ORDER: TierId[] = ["seeker", "acolyte", "oracle_pro"];

export const BillingPanel = ({ currentTier, isAdmin, pendingTier, pendingEffectiveAt, cancelAtPeriodEnd }: Props) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const reconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const r = await fetch(SUMMARY_URL, {
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (r.ok) setSummary(await r.json() as BillingSummary);
    } catch (e) { console.warn("reconcile failed:", e); }
    finally { setReconciling(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: invs }] = await Promise.all([
        supabase.from("stripe_invoices" as never).select("*").order("created_at", { ascending: false }).limit(10),
        reconcile(),
      ]);
      if (cancelled) return;
      if (invs) setInvoices(invs as unknown as Invoice[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reconcile]);


  const callManage = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const r = await fetch(MANAGE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string })?.error ?? `HTTP ${r.status}`);
      return j as Record<string, unknown>;
    } finally { setBusy(null); }
  };

  const openPortal = async () => {
    try {
      const j = await callManage({ action: "billing_portal" }, "portal");
      if (j.url) window.location.href = j.url as string;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not open portal."); }
  };

  const cancel = async () => {
    if (!confirm("Cancel at the end of the current period? You'll keep access until then.")) return;
    try {
      const j = await callManage({ action: "cancel" }, "cancel");
      const eop = typeof j.period_end === "string" ? new Date(j.period_end).toLocaleDateString() : "the period end";
      toast.success(`Cancellation scheduled — access continues until ${eop}.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not cancel."); }
  };

  const resume = async () => {
    try {
      await callManage({ action: "resume" }, "resume");
      toast.success("Cancellation reverted — your subscription continues.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not resume."); }
  };

  const referralCode = summary?.referral_code ?? null;
  const referralShare = summary?.referral_share_pct ?? 20;
  const credits = summary?.credits_balance ?? 0;
  const referralCommissionCents = summary?.referral_total_cents ?? 0;
  const referralCount = summary?.referral_count ?? 0;
  const stripeDrift = summary?.stripe_check?.drift ?? [];
  const stripeOk = summary?.stripe_check?.available && stripeDrift.length === 0 && summary?.stripe_check?.maps_to_user !== false;

  const copyReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/?ref=${referralCode}`;
    try { await navigator.clipboard.writeText(link); toast.success("Referral link copied."); }
    catch { toast.error("Could not copy."); }
  };

  if (isAdmin) {
    return (
      <div className="p-4 border border-gold/40 bg-gold/5 rounded-sm">
        <div className="font-display uppercase tracking-widest text-[11px] text-gold">▌ Admin · billing bypassed ▐</div>
        <p className="text-xs text-muted-foreground font-mono mt-1">No invoices, no quotas — your account has unlimited access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reconciliation status */}
      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-sm border text-[10px] font-mono ${
        !summary ? "border-border bg-card/40 text-muted-foreground"
        : stripeOk ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400"
        : "border-amber-500/50 bg-amber-500/10 text-amber-400"
      }`}>
        <span className="flex items-center gap-1.5">
          {!summary ? <Loader2 className="w-3 h-3 animate-spin" />
            : stripeOk ? <ShieldCheck className="w-3 h-3" />
            : <AlertTriangle className="w-3 h-3" />}
          {!summary ? "Reconciling…"
            : !summary.stripe_check?.available ? "Local values · Stripe not reachable"
            : stripeDrift.length ? `Stripe drift: ${stripeDrift.join(", ")}`
            : summary.stripe_check?.maps_to_user === false ? "Stripe subscription not mapped to your user"
            : "Reconciled with Stripe"}
        </span>
        <button onClick={reconcile} disabled={reconciling} title="Refresh from backend" className="hover:text-foreground">
          <RefreshCw className={`w-3 h-3 ${reconciling ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tier comparison strip */}
      <div className="grid grid-cols-3 gap-1.5">
        {TIER_ORDER.map((id) => {
          const t = TIERS[id];
          const active = id === currentTier;
          const pending = id === pendingTier;
          return (
            <div
              key={id}
              className={`p-2 rounded-sm border text-center ${
                active ? "border-primary bg-primary/15 text-primary"
                : pending ? "border-amber-500/60 bg-amber-500/10"
                : "border-border bg-card/40 text-muted-foreground"
              }`}
            >
              <div className="font-display uppercase tracking-widest text-[9px]">{t.name}</div>
              <div className="font-mono text-[10px] mt-0.5">{t.price}</div>
              <div className="font-mono text-[9px] opacity-70">{t.monthlyLimit.toLocaleString()}/mo</div>
              {active && <Check className="w-3 h-3 inline-block mt-1" />}
              {pending && <div className="text-[8px] uppercase mt-0.5">Scheduled</div>}
            </div>
          );
        })}
      </div>

      {/* Credits + referral earnings */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-sm border border-border bg-card/40">
          <div className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
            <Coins className="w-3 h-3" /> Credits
          </div>
          <div className="font-mono text-lg mt-1">{credits.toLocaleString()}</div>
          <div className="text-[9px] font-mono text-muted-foreground/80">authoritative · backend balance</div>
        </div>
        <div className="p-3 rounded-sm border border-border bg-card/40">
          <div className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
            <Users className="w-3 h-3" /> Referrals
          </div>
          <div className="font-mono text-lg mt-1">{fmtMoney(referralCommissionCents)}</div>
          <div className="text-[9px] font-mono text-muted-foreground/80">{referralCount} signups · {referralShare}% share</div>
        </div>
      </div>
      {referralCode && (
        <button
          onClick={copyReferralLink}
          className="w-full text-left px-3 py-2 rounded-sm border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <div className="text-[10px] font-display uppercase tracking-widest text-primary">Your referral code</div>
          <div className="font-mono text-sm mt-0.5">{referralCode} <span className="text-muted-foreground text-[10px]">· click to copy link</span></div>
        </button>
      )}


      {/* Pending change banner */}
      {pendingTier && pendingEffectiveAt && (
        <div className="p-3 border border-primary/40 bg-primary/10 rounded-sm flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span className="font-mono">
            Scheduled change to <span className="text-primary font-display uppercase tracking-widest">{TIERS[pendingTier]?.name ?? pendingTier}</span>
            {" "}on {new Date(pendingEffectiveAt).toLocaleDateString()}.
          </span>
        </div>
      )}
      {cancelAtPeriodEnd && !pendingTier && (
        <div className="p-3 border border-amber-500/40 bg-amber-500/10 rounded-sm flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-amber-400">Cancellation scheduled at period end.</span>
          <button onClick={resume} disabled={busy === "resume"} className="px-2 py-1 rounded-sm border border-amber-500/60 text-amber-400 font-display uppercase tracking-widest text-[10px] hover:bg-amber-500/20 disabled:opacity-60">
            {busy === "resume" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Keep my plan"}
          </button>
        </div>
      )}

      {/* Manage actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={openPortal}
          disabled={busy === "portal"}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-border bg-secondary/40 hover:bg-secondary text-xs font-display uppercase tracking-widest disabled:opacity-60"
        >
          {busy === "portal" ? <Loader2 className="w-3 h-3 animate-spin" /> : <SettingsIcon className="w-3 h-3" />}
          Manage card
        </button>
        {!cancelAtPeriodEnd && currentTier !== "seeker" && (
          <button
            onClick={cancel}
            disabled={busy === "cancel"}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-destructive/40 hover:bg-destructive/15 text-destructive text-xs font-display uppercase tracking-widest disabled:opacity-60"
          >
            {busy === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel plan"}
          </button>
        )}
      </div>

      {/* Invoice history */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-display uppercase tracking-[0.25em] text-muted-foreground mb-2">
          <Receipt className="w-3.5 h-3.5" /> Recent invoices
        </div>
        {loading ? (
          <div className="text-xs font-mono text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="text-xs font-mono text-muted-foreground italic">No invoices yet.</div>
        ) : (
          <ul className="space-y-1.5">
            {invoices.map((inv) => {
              const ok = inv.status === "paid";
              return (
                <li key={inv.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm border ${ok ? "border-border bg-card/40" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="min-w-0">
                    <div className="text-xs font-mono">
                      {fmtMoney(ok ? inv.amount_paid : inv.amount_due, inv.currency)}
                      <span className="ml-2 text-[10px] uppercase tracking-widest font-display text-muted-foreground">
                        {inv.tier ? TIERS[inv.tier as TierId]?.name ?? inv.tier : "—"} · {inv.status}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/80">
                      {new Date(inv.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {inv.invoice_pdf && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="p-1.5 rounded-sm border border-border hover:text-primary text-[10px]" title="Download PDF">
                        PDF
                      </a>
                    )}
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-sm border border-border hover:text-primary" title="View invoice">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
