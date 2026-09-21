#!/usr/bin/env node
/**
 * Honest mainnet mining orchestrator — dry-run by default.
 *
 * Rails:
 *   1. Tetra-PoW (origin ledger CPU mine → public/treasure/tetra-pow.json)
 *   2. Bitcoin mainnet header hunt (real double-SHA256, live tip, no fake wins)
 *
 * Live Bitcoin submit requires BTC_MINE_LIVE=1 + BITCOIN_RPC (bitcoind submitblock).
 * Operator L1 gas rails stay fail-closed — 137 ETH is proof-ledger only.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, formatEther, http } from "viem";
import { mainnet } from "viem/chains";
import { runAlchemicalHunt } from "../src/lib/alchemicalHunt.ts";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { CANONICAL_BOOTY_ETH } from "../src/lib/pirateTreasureFunding.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/treasure/mainnet-mine-status.json");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const LIVE = process.env.BTC_MINE_LIVE === "1";
const RPC = process.env.BITCOIN_RPC ?? "";
const MAX_HASHES = Number(process.env.BTC_MAX_HASHES || 50_000);

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  MAINNET MINE — honest dry-run (Tetra-PoW + BTC header hunt)   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  const resolved = resolveBridgeKey();
  const eth = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });

  let operatorL1 = 0n;
  let vaultL1 = 0n;
  if (resolved) {
    operatorL1 = await eth.getBalance({ address: resolved.address });
  }
  vaultL1 = await eth.getBalance({ address: TREASURE_VAULT });

  console.log(`Operator:     ${resolved?.address ?? "(none)"}  L1 ${formatEther(operatorL1)} ETH`);
  console.log(`Vault:        ${TREASURE_VAULT}  L1 ${formatEther(vaultL1)} ETH`);
  console.log(`137 ETH:      proof-ledger only — canonical ${CANONICAL_BOOTY_ETH} ETH NOT on L1`);
  console.log(`BTC live:     ${LIVE ? "yes (needs BITCOIN_RPC + valid header find)" : "no — dry-run submit"}`);
  console.log("");

  console.log("==> [1/2] Tetra-PoW CPU mine (origin ledger, not Bitcoin mainnet)");
  const { execSync } = await import("node:child_process");
  execSync("npx --yes tsx ./scripts/tetra-mine.mjs", { cwd: ROOT, stdio: "inherit" });

  console.log("");
  console.log("==> [2/2] Bitcoin mainnet header hunt (live tip, real hashes)");
  const hunt = await runAlchemicalHunt({
    maxHashes: MAX_HASHES,
    liveSubmit: LIVE && Boolean(RPC),
    rpcUrl: RPC || undefined,
  });

  const btc = hunt.bitcoin;
  console.log(`    Tip:         h${btc.tip.height} ${btc.tip.hash.slice(0, 16)}… (${btc.tip.source})`);
  console.log(`    Target:      next h${btc.height} bits 0x${btc.bits.toString(16)}`);
  console.log(`    Hashes:      ${btc.hashesTried}`);
  console.log(`    Found:       ${btc.found ? "YES — submitblock payload ready" : "no (expected on mainnet CPU)"}`);
  console.log(`    Miner addr:  ${btc.coinbase.minerAddress}`);
  console.log(`    Subsidy:     ${Number(btc.coinbase.valueSats) / 1e8} BTC (if accepted)`);
  if (btc.submitted && btc.submitted !== false) {
    console.log(`    Submitted:   live=${btc.submitted.live} ok=${btc.submitted.ok ?? false}`);
    if (btc.submitted.error) console.log(`    Submit err:  ${btc.submitted.error}`);
  }

  const blockMined = btc.found && btc.submitted?.live && btc.submitted?.ok;
  const tetraMined = true;

  const status = {
    kind: "mainnet-mine-status",
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    verdict: blockMined ? "BLOCK_ACCEPTED" : btc.found ? "HEADER_FOUND_DRY_RUN" : "NO_FIND",
    honestSummary:
      blockMined
        ? "Valid header found and submitblock accepted by bitcoind."
        : btc.found
          ? "Valid header found locally but not broadcast (dry-run or submit failed)."
          : `Tried ${btc.hashesTried} hashes against live mainnet difficulty — no find (expected). Tetra-PoW ledger block mined locally.`,
    rails: {
      tetraPow: {
        mined: tetraMined,
        chain: "EXCAL Tetra-PoW origin ledger",
        artifact: "/treasure/tetra-pow.json",
        isBitcoinMainnet: false,
      },
      bitcoinMainnet: {
        attempted: true,
        found: btc.found,
        hashesTried: btc.hashesTried,
        tipHeight: btc.tip.height,
        nextHeight: btc.height,
        bits: `0x${btc.bits.toString(16)}`,
        minerAddress: btc.coinbase.minerAddress,
        subsidyBtc: Number(btc.coinbase.valueSats) / 1e8,
        submitted: btc.submitted,
        liveSubmitEnabled: LIVE && Boolean(RPC),
      },
    },
    operator: {
      address: resolved?.address ?? null,
      l1Wei: operatorL1.toString(),
      l1Eth: Number(operatorL1) / 1e18,
      fundedForL1Gas: operatorL1 > 0n,
      keySource: resolved?.source ?? null,
    },
    vault: {
      address: TREASURE_VAULT,
      l1Wei: vaultL1.toString(),
      l1Eth: Number(vaultL1) / 1e18,
      canonicalEthBooty: CANONICAL_BOOTY_ETH,
      spendableCanonical: false,
    },
    blockers: [],
    next: [],
  };

  if (!btc.found) {
    status.blockers.push(
      "Bitcoin mainnet CPU mining at current difficulty has effectively zero chance of finding a block.",
    );
  }
  if (!resolved) {
    status.blockers.push("No operator key — set TREASURE_BRIDGE_PRIVATE_KEY or Solana id.json.");
  } else if (operatorL1 === 0n) {
    status.blockers.push(`Operator ${resolved.address} has 0 ETH on L1 — fund for gas (do not invent 137 ETH).`);
  }
  if (vaultL1 < 1_000_000_000_000_000n) {
    status.blockers.push(
      `Vault L1 ${formatEther(vaultL1)} ETH — canonical ${CANONICAL_BOOTY_ETH} ETH remains proof-ledger only.`,
    );
  }
  if (btc.found && !LIVE) {
    status.next.push("Set BTC_MINE_LIVE=1 and BITCOIN_RPC to attempt submitblock (requires bitcoind with wallet).");
  }
  status.next.push("For Tetra-PoW: npm run tetra:mine");
  status.next.push("For operator rails: npm run mainnet");
  status.next.push("Fund operator L1 wallet with real ETH for gas before any live L1 broadcast.");

  writeFileSync(OUT, `${JSON.stringify(status, null, 2)}\n`);
  console.log("");
  console.log(`Verdict: ${status.verdict}`);
  console.log(`Wrote ${OUT}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("mainnet-mine crashed:", err?.message ?? err);
  process.exit(1);
});
