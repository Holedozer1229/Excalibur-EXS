// /enterprise/deliberation — B2B Proof-of-Deliberation product page + live demo seal
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Clock, ScrollText, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import DeliberationSealPanel from "@/components/deliberation/DeliberationSealPanel";
import { siteUrl } from "@/lib/site";

const PROOF_POINTS = [
  {
    icon: Clock,
    title: "Minimum dwell time",
    body: "Configurable floor (default 8s) — proves the reviewer did not instant-click approve.",
  },
  {
    icon: ScrollText,
    title: "Scroll depth",
    body: "≥85% of the artifact must be scrolled before seal — catches summary-only skims.",
  },
  {
    icon: ShieldCheck,
    title: "Clause acknowledgements",
    body: "Explicit checkboxes committed into the sha-256 receipt — audit-ready, not honor system.",
  },
];

export default function EnterpriseDeliberation() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Proof-of-Deliberation — B2B AI Approval Receipts | Aetherion"
        description="Cryptographic proof your team read an AI output before approving it. Dwell time, scroll depth, and clause acknowledgements sealed in a verifiable receipt."
        path="/enterprise/deliberation"
        ogType="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Aetherion Proof-of-Deliberation",
            applicationCategory: "BusinessApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            url: siteUrl("/enterprise/deliberation"),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="enterprise-deliberation-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/">Home</Link>
          <span>/</span>
          <span className="text-foreground">Enterprise</span>
        </nav>

        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-violet-200">
            <Building2 className="h-3 w-3" /> B2B · Compliance rail
          </div>
          <h1 className="font-saga text-4xl leading-tight md:text-5xl">
            Proof-of-Deliberation
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sell slowness to enterprises. Every AI approval becomes a cryptographic artifact —
            dwell time, scroll depth, and explicit clauses sealed before the button unlocks.
          </p>
        </header>

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {PROOF_POINTS.map((p) => (
            <div key={p.title} className="rounded-lg border border-border/50 bg-card/30 p-4 backdrop-blur">
              <p.icon className="mb-2 h-5 w-5 text-primary" />
              <h2 className="font-saga text-sm">{p.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <DeliberationSealPanel className="mb-8" />

        <section className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center text-sm">
          <p className="text-muted-foreground">
            Auditors verify receipts at{" "}
            <Link to="/verify/deliberation" className="text-primary underline underline-offset-4">
              /verify/deliberation
            </Link>
            {" "}— single-use, replay-protected, same seal model as tarot artifacts.
          </p>
          <ButtonRow />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ButtonRow() {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      <Link
        to="/rollup"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-primary hover:underline"
      >
        Full devnet rollup <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
