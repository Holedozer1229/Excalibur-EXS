// /token/skynt — Ethereum leg of the Aetherion cross-chain lattice.
// Static, presentational, SEO-tuned. No wallet, no RPC.
import { useEffect, useState } from "react";
import CrossChainMap from "@/components/CrossChainMap";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Droplets, Link2, ShieldCheck } from "lucide-react";
import { SKYNT_AS_BITCOIN_PATH, buildSkyntAsBitcoin, type SkyntBitcoinView } from "@/lib/skyntAsBitcoin";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SITE = "https://www.excaliburcrypto.com";

const FACTS = [
  { k: "Chain", v: "Ethereum mainnet" },
  { k: "Standard", v: "ERC-20" },
  { k: "Primary venue", v: "SKYNT / WETH pair" },
  { k: "Role", v: "Reference price anchor for the lattice" },
  { k: "Bridge", v: "URUU over zkSync → Solana wURUU" },
];

const FAQS = [
  {
    q: "What is SKYNT?",
    a: "SKYNT is the Ethereum-side ERC-20 leg of the Aetherion cross-chain lattice. Its WETH pair carries the deepest pool, so it acts as the reference price surface that the Solana wURUU bonding curve reads against.",
  },
  {
    q: "How does SKYNT relate to ATART and AETX?",
    a: "ATART and AETX are BRC-20 receipts inscribed on Bitcoin — they record divinatory practice. SKYNT is a liquidity leg, not a receipt. The three meet at the wURUU bonding curve on Solana, where WETH-side depth and the BRC-20 reading bonus are both priced.",
  },
  {
    q: "Is SKYNT an investment?",
    a: "No. Aetherion makes no price, revenue, or return claims. The lattice pages are documentation of how the liquidity legs are wired, not an offer or solicitation.",
  },
  {
    q: "How does the bridge work?",
    a: "The URUU token is live on zkSync Era. Any wrap into Solana wURUU is opt-in and not live. The custom bonding curve on /token/lattice is a calculator. See /token/uruu.",
  },
  {
    q: "Is the SKYNT ledger a Bitcoin address?",
    a: "The skynt: payload is 20 bytes — the same width as a Bitcoin hash160 — so it can be spoken as Base58Check P2PKH or bc1q. That is a re-encoding costume. It does not prove coins sit there, does not reveal a key, and does not turn 137 ETH into BTC.",
  },
  {
    q: "Is the SKYNT ledger an OP_RETURN or a Bitcoin signature?",
    a: "It can be wrapped as OP_RETURN 6a14… or sliced against the posted BIP-322 r/s. 20 bytes cannot be a secp256k1 signature (those are 64/65 bytes). Live mempool.space shows 0 OP_RETURN txs and no derived txids. Posted OP_RETURN ff7f8192… is a different 24-byte blob.",
  },
  {
    q: "Is the SKYNT ledger already ETH, an L2, Litecoin, or Bitcoin Cash?",
    a: "The 20-byte payload checksums as a valid Ethereum address and can be versioned as LTC/BCH/DOGE/DASH. Live RPCs show 0 wei and no code on Ethereum plus 14 L2s/sidechains, including zkSync and Base. Litecoin, Bitcoin Cash, Dogecoin, Dash, Ravencoin, and Tron are empty too. It is not the SKYNT portfolio 0x5592….",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Tokenomics", item: `${SITE}/tokenomics` },
      { "@type": "ListItem", position: 3, name: "SKYNT", item: `${SITE}/token/skynt` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function TokenSkynt() {
  const [btc, setBtc] = useState<SkyntBitcoinView>(() => buildSkyntAsBitcoin());
  useEffect(() => {
    void fetch(`${SKYNT_AS_BITCOIN_PATH}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.kind === "skynt-as-bitcoin" && j.witness && j.chains) setBtc(j as SkyntBitcoinView);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="SKYNT — Ethereum ERC-20 Leg of the Aetherion Lattice"
        description="SKYNT is the Ethereum ERC-20 leg of Aetherion's cross-chain lattice: WETH pair depth anchors the reference price bridged by URUU over zkSync to Solana wURUU."
        path="/token/skynt"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">Tokenomics</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">SKYNT</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            Ethereum · ERC-20
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            SKYNT
          </h1>
          <p className="text-lg text-muted-foreground">
            The Ethereum leg of the Aetherion lattice. The SKYNT/WETH pair
            carries the deepest pool in the system, which is why it sets the
            reference price the rest of the lattice reads against.
          </p>
        </header>

        <Card className="mb-10 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <dl className="divide-y divide-border text-sm">
              {FACTS.map((f) => (
                <div key={f.k} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{f.k}</dt>
                  <dd className="text-right font-mono text-xs md:text-sm">{f.v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="mb-10 border-amber-500/30 bg-card/60 backdrop-blur-sm" data-testid="skynt-as-bitcoin">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Curiosity · SKYNT ledger as Bitcoin
            </p>
            <p className="text-sm text-muted-foreground">
              {btc.skyntLedger} is 20 bytes. Spoken as Base58 / P2PKH / bc1q. Costume only — not a key, not 137 BTC.
            </p>
            <dl className="space-y-1.5 font-mono text-[11px]">
              <div>
                <dt className="text-muted-foreground">raw Base58</dt>
                <dd className="break-all">{btc.rawBase58}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">P2PKH</dt>
                <dd className="break-all">
                  <a
                    href={`https://mempool.space/address/${btc.bitcoin.p2pkh}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {btc.bitcoin.p2pkh}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">P2SH</dt>
                <dd className="break-all">
                  <a
                    href={`https://mempool.space/address/${btc.bitcoin.p2sh}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {btc.bitcoin.p2sh}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">P2WPKH</dt>
                <dd className="break-all">
                  <a
                    href={`https://mempool.space/address/${btc.bitcoin.p2wpkh}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {btc.bitcoin.p2wpkh}
                  </a>
                </dd>
              </div>
            </dl>
            {btc.probe && (
              <p className="text-xs text-muted-foreground">
                mempool.space · P2PKH {btc.probe.p2pkhSats} sats / {btc.probe.p2pkhTxCount} txs · P2WPKH{" "}
                {btc.probe.p2wpkhSats} sats / {btc.probe.p2wpkhTxCount} txs
              </p>
            )}
            <p className="pt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              OP_RETURN · signatures · live Bitcoin
            </p>
            <dl className="space-y-1.5 font-mono text-[11px]">
              <div>
                <dt className="text-muted-foreground">SKYNT as OP_RETURN</dt>
                <dd className="break-all">{btc.witness.opReturn.scriptHex}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Posted OP_RETURN (different)</dt>
                <dd className="break-all">{btc.witness.opReturn.postedHex}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">BIP-322</dt>
                <dd>
                  header {btc.witness.signatures.bip322.header} · {btc.witness.signatures.bip322.bytes}B · 20B cannot be
                  a 64B sig · overlap {String(btc.witness.signatures.bip322.containsSkynt)}
                </dd>
              </div>
            </dl>
            {btc.witnessLive && (
              <p className="text-xs text-muted-foreground">
                live mempool.space · SKYNT OP_RETURN {btc.witnessLive.opReturnSkyntTxCount} txs · posted OP_RETURN{" "}
                {btc.witnessLive.opReturnPostedTxCount} txs · derived txids{" "}
                {btc.witnessLive.derivedTxidsFound.length ? btc.witnessLive.derivedTxidsFound.join(", ") : "none"} ·
                genesis control {btc.witnessLive.control.found ? "found" : "missing"} · contains SKYNT{" "}
                {String(btc.witnessLive.control.coinbaseHasSkynt)}
              </p>
            )}
            <p className="pt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Cross-chain fingerprint · ETH / L2 / LTC / BCH
            </p>
            <p className="text-sm text-muted-foreground">{btc.chains.verdict}</p>
            <dl className="space-y-1.5 font-mono text-[11px]">
              <div>
                <dt className="text-muted-foreground">EVM (ETH + L2s)</dt>
                <dd className="break-all">
                  <a
                    href={`https://etherscan.io/address/${btc.chains.encodings.evm}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {btc.chains.encodings.evm}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Litecoin</dt>
                <dd className="break-all">{btc.chains.encodings.litecoinP2pkh}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bitcoin Cash (legacy)</dt>
                <dd className="break-all">{btc.chains.encodings.bitcoinCashLegacy}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tron</dt>
                <dd className="break-all">{btc.chains.encodings.tron}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              closest {btc.chains.closestFamily} · live hits {btc.chains.liveHits} · equals portfolio{" "}
              {String(btc.chains.equalsSkyntPortfolio)}
            </p>
          </CardContent>
        </Card>

        <article className="space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <Droplets className="h-5 w-5" /> Why the WETH pair matters
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              A bonding curve is only as honest as the price it references.
              The SKYNT/WETH pool is the deepest venue in the lattice, so its
              mid-price is the least manipulable signal available. It is the
              floor P₀ of the{" "}
              <Link to="/token/lattice" className="text-primary hover:underline">custom bonding curve</Link>
              {" "}on Solana, which quotes{" "}
              <span className="font-mono text-sm">P(s) = P₀ (1 + s/S)ⁿ</span>
              {" "}rather than inventing its own starting price.
            </p>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              That relationship is one-directional by design: Ethereum prices,
              Solana quotes. Bitcoin contributes flow — reading receipts on{" "}
              <Link to="/claim/tart" className="text-primary hover:underline">ATART</Link>{" "}
              route a BRC-20 bonus into the same curve.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-accent">
              <Link2 className="h-5 w-5" /> The URUU bridge
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              <Link to="/token/uruu" className="text-primary hover:underline">URUU</Link>{" "}
              is live on zkSync Era. Connecting the Ethereum SKYNT pool to
              the Solana wURUU curve is an opt-in wrap that is not live. The
              wrapped representation on Solana is the destination side of that
              route — see the{" "}
              <Link to="/tokenomics" className="text-primary hover:underline">
                cross-chain lattice map
              </Link>{" "}
              for the full topology, including the{" "}
              <Link to="/token/aetx" className="text-primary hover:underline">AETX</Link>{" "}
              round seal on Bitcoin.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <ShieldCheck className="h-5 w-5" /> Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Aetherion makes no price, revenue, or return claims about SKYNT
              or any other tick documented here. These pages describe how the
              liquidity legs are wired; nothing on them is an offer, a
              solicitation, or financial advice. Verify every contract and
              pool yourself before interacting with it.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl uppercase tracking-widest text-primary">
              Frequently asked
            </h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <Card key={f.q} className="bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="mb-1 text-sm font-medium">{f.q}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </article>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="mb-4 text-sm uppercase tracking-widest text-muted-foreground">
            Explore further
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "URUU on zkSync", href: "/token/uruu" },
              { label: "wURUU on Solana", href: "/token/wuruu" },
              { label: "Custom bonding curve", href: "/token/lattice" },
              { label: "AETX token page", href: "/token/aetx" },
              { label: "Full tokenomics", href: "/tokenomics" },
              { label: "Verified contracts", href: "/contracts" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <CrossChainMap />
        </section>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/tokenomics">
              Read the full tokenomics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
