import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LIVE_LEDGER_PATH, LIVE_LEDGER_ROUTE, type LiveMainnetLedger } from "@/lib/liveMainnetLedger";
import { ATLAS_PATH, buildContractAtlas, type ContractAtlas } from "@/lib/contractAtlas";
import { siteUrl } from "@/lib/site";
import { BITCOIN_GENESIS_ADDRESS, CREATE2_FACTORY, CREATE2_SALT_SHORT, EXCAL_PASTE_18, EXCAL_POSTED_ALLOC, EXCAL_STATUS_PATH, opReturnLast20, type ExcalCreate2Status } from "@/lib/eip7949Excal";
import { EIP7949_GENESIS_DOWNLOAD } from "@/lib/eip7949Genesis";
import { EIP_CONFORMANCE_PATH, type EipConformance } from "@/lib/eipConformance";
import { COMMITMENT_CHAIN_PATH, type CommitmentChain } from "@/lib/commitmentChain";
import { UMBRELLA_STATUS_PATH, type UmbrellaRecovery } from "@/lib/umbrellaBackstop";
import { SKYNT_AS_BITCOIN_PATH, buildSkyntAsBitcoin, type SkyntBitcoinView } from "@/lib/skyntAsBitcoin";
import WrapConsole from "@/components/WrapConsole";

export default function LiveMainnetLedgerPage() {
  const [ledger, setLedger] = useState<LiveMainnetLedger | null>(null);
  const [atlas, setAtlas] = useState<ContractAtlas>(() => buildContractAtlas());
  const [excal, setExcal] = useState<ExcalCreate2Status | null>(null);
  const [eip, setEip] = useState<EipConformance | null>(null);
  const [chain, setChain] = useState<CommitmentChain | null>(null);
  const [umbrella, setUmbrella] = useState<UmbrellaRecovery | null>(null);
  const [skyntBtc, setSkyntBtc] = useState<SkyntBitcoinView>(() => buildSkyntAsBitcoin());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [l, a, e, ei, c, u, sb] = await Promise.all([
          fetch(`${LIVE_LEDGER_PATH}?t=${Date.now()}`),
          fetch(`${ATLAS_PATH}?t=${Date.now()}`),
          fetch(`${EXCAL_STATUS_PATH}?t=${Date.now()}`),
          fetch(`${EIP_CONFORMANCE_PATH}?t=${Date.now()}`),
          fetch(`${COMMITMENT_CHAIN_PATH}?t=${Date.now()}`),
          fetch(`${UMBRELLA_STATUS_PATH}?t=${Date.now()}`),
          fetch(`${SKYNT_AS_BITCOIN_PATH}?t=${Date.now()}`),
        ]);
        if (l.ok) setLedger((await l.json()) as LiveMainnetLedger);
        if (a.ok) setAtlas((await a.json()) as ContractAtlas);
        if (e.ok) setExcal((await e.json()) as ExcalCreate2Status);
        if (ei.ok) setEip((await ei.json()) as EipConformance);
        if (c.ok) setChain((await c.json()) as CommitmentChain);
        if (u.ok) setUmbrella((await u.json()) as UmbrellaRecovery);
        if (sb.ok) {
          const j = (await sb.json()) as SkyntBitcoinView;
          if (j?.kind === "skynt-as-bitcoin" && j.witness && j.chains) setSkyntBtc(j);
        }
        if (!l.ok) setError(`ledger ${l.status}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "unavailable");
      }
    })();
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Live mainnet ledger — contract atlas + profit flow"
        description="Every address we touch, what is actually deployed, and the profit path to optimize."
        path={LIVE_LEDGER_ROUTE}
        ogType="website"
        jsonLd={[{ "@context": "https://schema.org", "@type": "WebPage", name: "Live mainnet ledger", url: siteUrl(LIVE_LEDGER_ROUTE) }]}
      />
      <main className="relative z-10 mx-auto max-w-4xl px-5 py-12 md:py-20 space-y-8" data-testid="live-mainnet-ledger-page">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Port
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/mind-of-the-cosmos" className="hover:text-foreground">
            Mind of the Cosmos
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Live ledger</span>
        </nav>

        <header className="space-y-3">
          <Badge variant="outline" className="tracking-[0.28em] uppercase text-[10px]">
            Mainnet · live RPC · fail-closed
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Live mainnet ledger</h1>
          <p className="text-muted-foreground font-serif text-lg leading-relaxed">
            Full address map and profit flow. 137 ETH is not on this chain. The operator has 0 L1 ETH, so nothing broadcasts.
          </p>
        </header>

        {error && <p className="text-sm text-destructive">Live JSON unavailable ({error}). Showing static atlas.</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Native + tokens</p>
              <p className="text-2xl font-display" data-testid="live-ledger-usd">
                ${ledger?.totals.nativeUsd.toFixed(2) ?? "…"}
              </p>
              <p className="text-xs text-muted-foreground">{ledger?.totals.nativeEth.toFixed(6) ?? "…"} ETH if keyed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Berth</p>
              <p className="text-2xl font-display">{ledger?.berth.empty ? "empty" : "docked"}</p>
              <p className="text-xs font-mono break-all text-muted-foreground">{ledger?.berth.address}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Broadcast</p>
              <p className="text-2xl font-display">{ledger?.operator.canBroadcast ? "ready" : "blocked"}</p>
              <p className="text-xs text-muted-foreground">{ledger?.anchor.blocker ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="live-excal-attestation">
          <CardContent className="p-6 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">EIP-7949 · CamelotScavenger EXCAL</p>
            <p className="text-sm text-muted-foreground">
              ERC-20 CREATE2 via {CREATE2_FACTORY.slice(0, 10)}… salt {CREATE2_SALT_SHORT}. Posted alloc{" "}
              {EXCAL_POSTED_ALLOC} is the EIP-7949 counterfactual — do not sweep. Posted {EXCAL_PASTE_18} is an
              18-byte tail. OP_RETURN last 20 is {opReturnLast20()}. Bitcoin genesis {BITCOIN_GENESIS_ADDRESS} is
              attestation-only.
            </p>
            <p className="font-mono text-xs break-all">
              compiled {excal?.predicted ?? "compile pending"} · code {excal?.predictedHasCode ? "yes" : "no"} ·{" "}
              {excal?.broadcast ?? "FAIL_CLOSED"}
            </p>
            <p className="text-xs">
              <a href={EIP7949_GENESIS_DOWNLOAD} download className="underline underline-offset-4">
                Download genesis-mainnet.json
              </a>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>mintByMnemonic(string) — 1,000 EXCAL, one mint per address</li>
              <li>withdrawRemaining() — owner only (vault, not the factory)</li>
              <li>getGenesisAttestation() — pubkey, BIP-322 sig, message, hash, expected</li>
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="live-eip-console">
            <CardContent className="p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">EIP conformance</p>
              <p className="text-sm text-muted-foreground">
                {(eip?.checks ?? []).map((c) => `${c.id} ${c.status}`).join(" · ") || "EIP-2 · EIP-6 · EIP-3326 · EIP-7949"}
              </p>
              <p className="font-mono text-[10px] break-all text-muted-foreground">
                keccak {eip?.hashes.onChainKeccak ?? "…"}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="live-commitment-chain">
            <CardContent className="p-6 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Commitment chain</p>
              <p className="text-xs text-muted-foreground">
                AIR {chain?.air.satisfied ?? "12/12"} · solvency {chain?.solvency.postedEth ?? 138} ≥{" "}
                {chain?.solvency.canonicalEth ?? 137.190325} ledger-only
              </p>
              <p className="font-mono text-[10px] break-all">{chain?.lockCommitment ?? "…"}</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="live-umbrella-backstop">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Umbrella backstop · official recovery
            </p>
            <p className="text-sm text-muted-foreground">
              Hierarchy {umbrella?.hierarchy.join(" → ") ?? "backstop → reserve → socialize"}. Official rail is zkSync
              native finalize of own leftover. Merkle claims only the vacuum stock leaf. Mettalex P2P is plan-only.
              Broadcast {umbrella?.broadcast ?? "FAIL_CLOSED"}.
            </p>
            <p className="font-mono text-[10px] break-all">
              predicted {umbrella?.predicted ?? "compile pending"} · salt {umbrella?.salt ?? "0x756d6272"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="live-skynt-as-bitcoin">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              SKYNT ledger → Base58 / Bitcoin
            </p>
            <p className="text-sm text-muted-foreground">
              {skyntBtc.skyntLedger} is 20 bytes — spoken as P2PKH {skyntBtc.bitcoin.p2pkh} or wrapped as OP_RETURN{" "}
              {skyntBtc.witness.opReturn.scriptHex}. 20 bytes cannot be a secp256k1 signature. Posted OP_RETURN{" "}
              {skyntBtc.witness.opReturn.postedHex} is a different blob. Costume only. Genesis{" "}
              {BITCOIN_GENESIS_ADDRESS} stays attestation-only.
            </p>
            {skyntBtc.probe && (
              <p className="text-xs text-muted-foreground">
                mempool.space · P2PKH {skyntBtc.probe.p2pkhSats} sats / {skyntBtc.probe.p2pkhTxCount} txs · P2WPKH{" "}
                {skyntBtc.probe.p2wpkhSats} sats / {skyntBtc.probe.p2wpkhTxCount} txs
              </p>
            )}
            {skyntBtc.witnessLive && (
              <p className="text-xs text-muted-foreground">
                live · OP_RETURN SKYNT {skyntBtc.witnessLive.opReturnSkyntTxCount} txs · posted{" "}
                {skyntBtc.witnessLive.opReturnPostedTxCount} txs · derived txids{" "}
                {skyntBtc.witnessLive.derivedTxidsFound.length ? skyntBtc.witnessLive.derivedTxidsFound.join(", ") : "none"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              closest {skyntBtc.chains.closestFamily}: {skyntBtc.chains.encodings.evm} · LTC{" "}
              {skyntBtc.chains.encodings.litecoinP2pkh} · BCH {skyntBtc.chains.encodings.bitcoinCashLegacy} · live hits{" "}
              {skyntBtc.chains.liveHits}
            </p>
            <p className="text-xs">
              <Link to="/token/skynt" className="underline underline-offset-4">
                SKYNT token page →
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mb-6">
          <WrapConsole compact />
        </div>

        <Card data-testid="live-eip-uruu-claim">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              EIP L1→L2 wrapped ETH · URUU claim
            </p>
            <p className="text-sm text-muted-foreground">
              Gates EIP-2 / EIP-6 / EIP-3326 / EIP-7949 pass. Canonical WETH wrap is live on /wrap.
              Operator L1→L2 broadcast is FAIL_CLOSED (0 L1 ETH). URUU→wURUU custody wrap is not live.
              137 ETH is not on this chain.
            </p>
          </CardContent>
        </Card>

        <Card data-testid="live-atlas-optimize">
          <CardContent className="p-6 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Profit flow to optimize</p>
            <ol className="space-y-3 text-sm leading-relaxed">
              {atlas.optimize.map((step) => (
                <li key={step.id}>
                  <span className="font-display text-lg">{step.rank}. {step.title}</span>
                  <p className="text-muted-foreground">{step.why}</p>
                  <p className="text-xs text-muted-foreground">Unlocks: {step.unlocks}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card data-testid="live-atlas-nodes">
          <CardContent className="p-6 space-y-4 overflow-x-auto">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Contract + wallet atlas</p>
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2 pr-3">Node</th>
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Live</th>
                  <th className="py-2">Address</th>
                </tr>
              </thead>
              <tbody>
                {atlas.nodes.map((n) => (
                  <tr key={`${n.id}-${n.chain}`} className="border-t border-border/40 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-foreground">{n.label}</div>
                      <div className="text-muted-foreground">{n.role}</div>
                    </td>
                    <td className="py-2 pr-3 font-mono">{n.kind}</td>
                    <td className="py-2 pr-3">{n.deployed ? "yes" : "no"}</td>
                    <td className="py-2 font-mono break-all">
                      <a className="underline underline-offset-2" href={n.explorer} target="_blank" rel="noreferrer">
                        {n.address}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {ledger && (
          <Card>
            <CardContent className="p-6 space-y-3 text-xs">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live RPC snapshot</p>
              <p className="font-mono break-all">hash {ledger.hash}</p>
              <p className="text-muted-foreground">{ledger.note}</p>
              <ul className="space-y-1 font-mono">
                {ledger.accounts.map((a) => (
                  <li key={`${a.chain}-${a.address}-${a.role}`}>
                    {a.chain} {a.role} {a.eth.toFixed(8)} ETH · {a.classification}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
