// PaymentStatusBanner — shown at top of the app when a user's most recent
// payment failed or the subscription needs action. Provides a one-click retry
// via the hosted Stripe invoice URL (or, fallback, the customer portal).
import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentStatus } from "@/lib/tiers";

const MANAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-manage`;

interface Props {
  status: PaymentStatus;
  invoiceUrl: string | null | undefined;
}

export const PaymentStatusBanner = ({ status, invoiceUrl }: Props) => {
  const [busy, setBusy] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(invoiceUrl ?? null);

  useEffect(() => { setResolvedUrl(invoiceUrl ?? null); }, [invoiceUrl]);

  if (status !== "past_due" && status !== "requires_action") return null;

  const openPortal = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const r = await fetch(MANAGE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "billing_portal" }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.url) window.location.href = j.url as string;
    } finally { setBusy(false); }
  };

  const label = status === "past_due"
    ? "Your last payment failed — retry to keep your tier active."
    : "Action required on your card to complete the charge.";

  return (
    <div className="border-b border-destructive/40 bg-destructive/10 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-xs sm:text-sm font-mono text-destructive flex-1 min-w-0">{label}</span>
        <div className="flex items-center gap-2">
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-destructive/60 bg-destructive/15 hover:bg-destructive/30 text-destructive font-display uppercase tracking-widest text-[10px] transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Pay invoice
            </a>
          )}
          <button
            onClick={openPortal}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-destructive/60 bg-background hover:bg-destructive/20 text-destructive font-display uppercase tracking-widest text-[10px] transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Manage card
          </button>
        </div>
      </div>
    </div>
  );
};
