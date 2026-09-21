import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Code2, Link2, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/funnel";
import {
  buildEmbedSnippet,
  buyUruuShareUrl,
  defaultOrigin,
  embedLatticeUrl,
  ensureUserReferralCode,
  latticeShareUrl,
  lookupReferralCode,
} from "@/lib/curveShare";

type CopyTarget = "lattice" | "buy" | "embed" | null;

export default function CurveReferralHub() {
  const [code, setCode] = useState<string | null>(null);
  const [incomingRef, setIncomingRef] = useState<string | null>(null);
  const [sharePct, setSharePct] = useState<number | null>(null);
  const [copied, setCopied] = useState<CopyTarget>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const stored = localStorage.getItem("aetherion_ref")?.toUpperCase() ?? null;
      if (stored) {
        setIncomingRef(stored);
        const lookup = await lookupReferralCode(stored);
        if (lookup) setSharePct(lookup.sharePct);
      }
      if (user) {
        const userCode = await ensureUserReferralCode();
        if (userCode) setCode(userCode);
      }
      setLoading(false);
    })();
  }, []);

  const origin = defaultOrigin();
  const links = useMemo(() => {
    if (!code) return null;
    return {
      lattice: latticeShareUrl(origin, code),
      buy: buyUruuShareUrl(origin, code),
      embed: embedLatticeUrl(origin, code),
      snippet: buildEmbedSnippet(embedLatticeUrl(origin, code)),
    };
  }, [code, origin]);

  async function copyText(text: string, target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      if (target === "embed") void trackEvent("curve_embed_copied", { code });
      else void trackEvent("curve_referral_link_copied", { code, target });
      window.setTimeout(() => setCopied(null), 1800);
    } catch { /* noop */ }
  }

  if (loading) return null;

  return (
    <Card className="mb-10 border-violet-500/30 bg-violet-500/5" data-testid="curve-referral-hub">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-violet-300">
          <Share2 className="h-4 w-4" />
          <h2 className="font-display text-lg uppercase tracking-widest">
            Distribution kit
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Share the curve, buy page, or embed widget. Referral codes use the same{" "}
          <span className="font-mono text-foreground/80">aetherion_ref</span> storage
          as signups — when someone creates an account with your link,{" "}
          <code className="text-xs">record_referral_signup</code> attributes them.
          {incomingRef && incomingRef !== code ? (
            <>
              {" "}You arrived via <span className="font-mono text-violet-200">{incomingRef}</span>
              {sharePct != null ? ` (${sharePct}% share on billing referrals)` : ""}.
            </>
          ) : null}
        </p>

        {code && links ? (
          <div className="space-y-3">
            <div className="rounded-md border border-violet-500/30 bg-background/50 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Your code</p>
              <p className="font-mono text-sm text-violet-200">{code}</p>
            </div>

            <LinkRow
              label="Fair lattice"
              url={links.lattice}
              copied={copied === "lattice"}
              onCopy={() => copyText(links.lattice, "lattice")}
            />
            <LinkRow
              label="Buy URUU landing"
              url={links.buy}
              copied={copied === "buy"}
              onCopy={() => copyText(links.buy, "buy")}
            />

            <div className="rounded-md border border-border/60 bg-background/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Code2 className="h-3 w-3" /> Embed widget
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => copyText(links.snippet, "embed")}
                >
                  {copied === "embed" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] text-foreground/80">
                {links.snippet}
              </pre>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Paste on any site. Preview at{" "}
                <Link to="/embed/lattice" className="text-primary hover:underline">
                  /embed/lattice
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
            <p>
              Sign in to get your referral code, embed snippet, and share links tied to Supabase.
            </p>
            <Button asChild size="sm" className="mt-3" variant="outline">
              <Link to="/auth">Sign in for your distribution kit</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkRow({
  label,
  url,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-violet-500/20 bg-background/50 px-3 py-2">
      <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-[11px] text-foreground/90">{url}</p>
      </div>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={onCopy}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
