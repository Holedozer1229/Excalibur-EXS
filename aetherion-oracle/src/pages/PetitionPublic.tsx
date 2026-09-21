import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, ExternalLink, Twitter, Share2 } from "lucide-react";
import { toast } from "sonner";

type PublicPetition = {
  id: string;
  status: string;
  btc_target_masked: string | null;
  eth_recipient_masked: string | null;
  btc_txid: string | null;
  eth_txid: string | null;
  created_at: string;
  updated_at: string;
};

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SITE = "https://www.excaliburcrypto.com";

function statusTone(status: string): string {
  switch (status) {
    case "confirmed":
    case "complete":
    case "broadcast":
      return "text-emerald-400 border-emerald-400/40 bg-emerald-400/10";
    case "failed":
    case "error":
      return "text-red-400 border-red-400/40 bg-red-400/10";
    default:
      return "text-amber-400 border-amber-400/40 bg-amber-400/10";
  }
}

export default function PetitionPublic() {
  const { id } = useParams<{ id: string }>();
  const [petition, setPetition] = useState<PublicPetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const shareUrl = `${SITE}/petition/${id ?? ""}`;
  const ogUrl = `${SUPA_URL}/functions/v1/petition-og?id=${id ?? ""}&format=png&v=2`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${SUPA_URL}/functions/v1/petition-public?id=${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data) setPetition(data);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const short = id ? id.slice(0, 8).toUpperCase() : "";
  const title = petition
    ? `Petition ${short} · ${petition.status.toUpperCase()} · Aetherion Oracle`
    : `Aetherion Oracle Petition ${short}`;
  const description = petition
    ? `BRC-20 → Arbitrum binding ${petition.status}. The Lattice has witnessed petition ${short}.`
    : "Bind BRC-20 to Arbitrum through the Aetherion Oracle Lattice.";

  const tweet = encodeURIComponent(
    `⚔ Petition ${short} ${petition?.status === "confirmed" ? "is BOUND TO THE LATTICE" : "is being witnessed by the Aetherion Oracle"}.\n\nTHE RECURSION IS BOUND. THE SWORD IS DRAWN.\n\n${shareUrl}`
  );

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="min-h-screen bg-black text-foreground relative overflow-hidden">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={shareUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogUrl} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: title,
          description,
          url: shareUrl,
          image: ogUrl,
        })}</script>
      </Helmet>

      {/* Fibonacci background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(800px 400px at 30% 20%, rgba(255,191,0,0.08), transparent 60%), radial-gradient(700px 400px at 80% 80%, rgba(16,185,129,0.07), transparent 60%)",
        }}
      />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-amber-500/20">
        <Link to="/" className="font-mono text-amber-400 tracking-[0.3em] text-sm">
          AETHERION · ORACLE
        </Link>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="font-mono text-xs">
            Open Dashboard
          </Button>
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-10 sm:py-16">
        <div className="text-amber-400/70 font-mono text-xs tracking-[0.3em] mb-3">
          PETITION RECORD
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-amber-400 drop-shadow-[0_0_24px_rgba(255,191,0,0.35)] leading-tight">
          {short}
        </h1>

        {loading ? (
          <div className="mt-10 font-mono text-amber-400/60">Loading the Lattice…</div>
        ) : notFound || !petition ? (
          <Card className="mt-10 p-8 bg-black/60 backdrop-blur-xl border border-amber-500/20">
            <div className="font-mono text-amber-400/80">
              Petition not found. It may have been revoked, or the ID is incorrect.
            </div>
            <Link to="/dashboard" className="inline-block mt-6">
              <Button>Create a Petition</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div
              className={`mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-md border font-mono text-sm tracking-[0.2em] ${statusTone(
                petition.status
              )}`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {petition.status.toUpperCase()}
            </div>

            <Card className="mt-8 p-6 sm:p-8 bg-black/60 backdrop-blur-xl border border-amber-500/30 space-y-6">
              <Row label="BTC Target" value={petition.btc_target_masked} tone="amber" />
              <Row label="Arbitrum Recipient" value={petition.eth_recipient_masked} tone="emerald" />
              {petition.btc_txid && (
                <LinkRow
                  label="BTC Transaction"
                  value={petition.btc_txid}
                  href={`https://mempool.space/tx/${petition.btc_txid}`}
                  onCopy={() => copy(petition.btc_txid!, "BTC txid")}
                />
              )}
              {petition.eth_txid && (
                <LinkRow
                  label="Arbitrum Transaction"
                  value={petition.eth_txid}
                  href={`https://arbiscan.io/tx/${petition.eth_txid}`}
                  onCopy={() => copy(petition.eth_txid!, "Arbitrum txid")}
                />
              )}
              <div className="text-xs font-mono text-muted-foreground pt-2 border-t border-amber-500/10">
                Witnessed {new Date(petition.created_at).toUTCString()}
              </div>
            </Card>

            {/* OG image preview */}
            <div className="mt-8">
              <img
                src={ogUrl}
                alt={`Aetherion petition ${short} sigil`}
                width={1200}
                height={630}
                className="w-full rounded-lg border border-amber-500/20 shadow-[0_0_60px_-20px_rgba(255,191,0,0.5)]"
                loading="lazy"
              />
            </div>

            {/* Share */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${tweet}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full font-mono" variant="default">
                  <Twitter className="w-4 h-4 mr-2" /> Share on X
                </Button>
              </a>
              <Button
                variant="outline"
                className="w-full font-mono"
                onClick={() => copy(shareUrl, "Link")}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
              <Button
                variant="outline"
                className="w-full font-mono"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ title, text: description, url: shareUrl });
                    } catch { /* user cancelled */ }
                  } else {
                    copy(shareUrl, "Link");
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </>
        )}

        <footer className="mt-16 pt-8 border-t border-amber-500/20 text-center font-mono text-xs tracking-[0.3em] text-amber-400/60">
          THE RECURSION IS BOUND · THE SWORD IS DRAWN · THE LATTICE LIVES · SATOSHI V2.0
        </footer>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: "amber" | "emerald";
}) {
  const color = tone === "amber" ? "text-amber-400" : "text-emerald-400";
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg break-all ${color}`}>{value ?? "—"}</div>
    </div>
  );
}

function LinkRow({
  label,
  value,
  href,
  onCopy,
}: {
  label: string;
  value: string;
  href: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-emerald-400 hover:underline break-all flex-1"
        >
          {value}
        </a>
        <button
          onClick={onCopy}
          className="text-muted-foreground hover:text-amber-400 transition-colors"
          aria-label="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-amber-400 transition-colors"
          aria-label="Open"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
