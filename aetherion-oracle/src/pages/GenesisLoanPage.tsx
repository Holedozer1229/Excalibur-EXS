/**
 * /genesis-loan — BIP-322 + BIP-173 self-fund · two loan mechanisms.
 * Attestation credit (ledger EXCAL) + gas facility (vacuum leftover stock).
 * Never sweeps 1A1zP1…. EXCAL ≠ 1-to-1 BTC.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHead } from "@/components/PageHead";
import { composeGenesisLoan, GENESIS_LOAN_HONESTY } from "@/lib/genesisLoanMechanisms";

export default function GenesisLoanPage() {
  const loan = useMemo(() => composeGenesisLoan({ updatedAt: new Date().toISOString() }), []);
  const [attestation, gas] = loan.mechanisms;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#12182a_0%,_#07060c_55%,_#040308_100%)] text-foreground">
      <PageHead
        title="Genesis Loan — BIP-322 + BIP-173 Self-Fund | Aetherion"
        description="Two self-fund loan mechanisms sealed by BIP-322 attestation and BIP-173 Bech32 costumes. Attestation credit + gas facility. Never sweeps Satoshi genesis."
        path="/genesis-loan"
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">
            Self-fund · BIP-322 · BIP-173
          </p>
          <h1 className="font-serif text-4xl leading-tight text-cyan-50 sm:text-5xl">Genesis Loan</h1>
          <p className="max-w-xl text-sm text-muted-foreground">{GENESIS_LOAN_HONESTY}</p>
          <p className="font-mono text-[11px] text-emerald-200/90">
            verdict {loan.verdict} · seal {loan.seal.slice(0, 24)}…
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-md border border-cyan-400/25 bg-black/35 p-4 space-y-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200">① {attestation.label}</h2>
            <p className="text-lg text-foreground/90">{attestation.status}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {attestation.creditAvailable}/{attestation.creditCap} {attestation.creditUnit}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{attestation.note}</p>
          </article>
          <article className="rounded-md border border-amber-400/25 bg-black/35 p-4 space-y-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">② {gas.label}</h2>
            <p className="text-lg text-foreground/90">{gas.status}</p>
            <p className="font-mono text-xs text-muted-foreground">
              transfers {gas.transfersFunded} · claims {gas.claimsFunded} · deploys {gas.deploysFunded}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{gas.note}</p>
          </article>
        </section>

        <section className="space-y-3 rounded-md border border-violet-500/20 bg-black/30 p-4 font-mono text-[11px] text-muted-foreground">
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-violet-200">Artifacts</h2>
          <p>
            BIP-322 · conformant {String(loan.bip322.eip2.conformant)} · seal {loan.bip322.seal.slice(0, 20)}…
          </p>
          <p>
            BIP-173 · {loan.bip173.addresses.length} costumes · match {String(loan.bip173.genesisHash160MatchesPosted)}
          </p>
          <ul className="space-y-1 break-all">
            {loan.bip173.addresses.map((a) => (
              <li key={a.role}>
                <span className="text-violet-300/80">{a.role}</span> · {a.address}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 text-[11px] text-muted-foreground">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200/80">Blockers</h2>
          <ul className="list-disc space-y-1 pl-5">
            {loan.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <p className="text-center text-[10px] text-muted-foreground">
          <Link to="/" className="underline underline-offset-2">
            home
          </Link>
          {" · "}
          <Link to="/surprise" className="underline underline-offset-2">
            surprise
          </Link>
          {" · "}
          <Link to="/live-ledger" className="underline underline-offset-2">
            live ledger
          </Link>
          {" · "}
          <span className="font-mono">npm run self-fund:genesis-loan</span>
        </p>
      </div>
    </main>
  );
}
