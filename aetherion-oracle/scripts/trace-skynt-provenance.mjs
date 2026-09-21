#!/usr/bin/env node
/**
 * Trace SKYNT wallet provenance → BTC/ETH genesis → 137 ETH booty claim.
 * Writes public/treasure/skynt-provenance-chain.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { buildSkyntProvenanceChain } from "../src/lib/skyntProvenance.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/skynt-provenance-chain.json");
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

async function checkL1Txs(txids) {
  const client = createPublicClient({ chain: mainnet, transport: http(RPC) });
  const results = [];
  for (const txid of txids) {
    try {
      const tx = await client.getTransaction({ hash: txid });
      results.push({ txid, found: !!tx?.blockHash });
    } catch {
      results.push({ txid, found: false });
    }
  }
  return results;
}

async function main() {
  const genesis = loadJson("public/treasure/genesis-mainnet_9334.json");
  const manifest = loadJson("public/treasure/MANIFEST_f42c.json");
  const receipt = loadJson("public/treasure/davy_jones_claim_receipt_1b27d2f7_9a45.json");
  const stark = loadJson("public/treasure/stark-bridge-claim-1814332222_88b0.json");

  let skynt = null;
  const skyntPath = process.env.SKYNT_EXPORT_PATH ?? "/tmp/test-kp.json";
  if (existsSync(skyntPath)) skynt = JSON.parse(readFileSync(skyntPath, "utf8"));

  const txids = skynt?.address_history
    ? Object.values(skynt.address_history).flat().map((e) => e.txid).filter((t) => t?.startsWith("0x"))
    : [];

  const l1TxResults = txids.length ? await checkL1Txs(txids.slice(0, 12)) : [];

  const chain = buildSkyntProvenanceChain({
    genesis,
    manifest,
    receipt,
    stark,
    skynt,
    l1TxResults,
  });

  writeFileSync(OUT, JSON.stringify(chain, null, 2));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SKYNT PROVENANCE — genesis → 137 ETH booty chain              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Verdict:    ${chain.verdict}`);
  console.log(`stateSig:   ${chain.stateSig.slice(0, 22)}…`);
  console.log(`BTC anchor: ${chain.bitcoinGenesis}`);
  console.log(`ETH genesis ${chain.ethGenesisBlockHash.slice(0, 22)}…`);
  console.log(`SKYNT txs:  ${chain.skyntGenesisHeightTxCount} at genesis height / ${chain.skyntWalletTxs.length} total`);
  console.log("");
  for (const link of chain.links) {
    console.log(`  ${link.verified ? "✓" : "⊘"} ${link.label}`);
    console.log(`      ${link.detail}`);
  }
  console.log("");
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
