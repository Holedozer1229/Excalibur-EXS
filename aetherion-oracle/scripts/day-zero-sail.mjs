#!/usr/bin/env node
/**
 * Day-zero helm — withdraw zkSync leftover only if it beats L1 gas, then
 * CREATE2-dock an empty SphinxBootyBridge at genesis salt 0x7c2bac1d.
 *
 * Default: dry-run, exit 0, writes public/treasure/day-zero-status.json.
 * Live: DAYZERO_LIVE=1 (still fail-closed without vault key / L1 gas).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, formatEther, http } from "viem";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { UNIFIED_STATE_SIG } from "../src/lib/skyntProvenance.ts";
import {
  CREATE2_FACTORY,
  SPHINX_BOOTY_BRIDGE_BYTECODE_PATH,
  encodeBridgeConstructor,
} from "../src/lib/bootyInject.ts";
import { OPERATOR_EVM, SKYNT_PORTFOLIO, parseBalanceHex } from "../src/lib/dustVacuum.ts";
import {
  buildDayZeroStatus,
  dayZeroBerth,
  decideDayZeroAction,
  evaluateDayZeroKeel,
  isSlackTide,
} from "../src/lib/dayZeroSail.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/day-zero-status.json");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const LIVE = process.env.DAYZERO_LIVE === "1";

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [ZKSYNC_RPC] } },
};

async function rpcWei(url, address) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [address, "latest"],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return parseBalanceHex(json.result);
}

async function main() {
  const eth = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  const block = await eth.getBlock({ blockTag: "latest" });
  const l1WeiPerGas = block.baseFeePerGas ?? 1_000_000_000n;

  const [vaultL1, vaultZk, skyntL1, operatorL1] = await Promise.all([
    rpcWei(ETHEREUM_RPC, TREASURE_VAULT),
    rpcWei(ZKSYNC_RPC, TREASURE_VAULT),
    rpcWei(ETHEREUM_RPC, SKYNT_PORTFOLIO),
    rpcWei(ETHEREUM_RPC, OPERATOR_EVM),
  ]);

  const reclaimableWei = vaultZk + skyntL1 + vaultL1;
  const keel = evaluateDayZeroKeel({
    reclaimableWei,
    refundWei: 0n,
    sweepFeeWei: 21_000n * l1WeiPerGas,
    l1WeiPerGas,
    zkWeiPerGas: l1WeiPerGas,
    zkSyncLeftoverWei: vaultZk,
  });

  const slackTide = isSlackTide(new Date(), l1WeiPerGas);
  const resolved = resolveBridgeKey();
  const hasVaultKey = resolved?.matchesTreasureVault === true;
  const hasL1SignerGas = operatorL1 > keel.l1DeployGasWei || (resolved != null && operatorL1 > 0n);

  const nextAction = decideDayZeroAction({
    keel,
    slackTide,
    hasVaultKey,
    hasL1SignerGas: hasL1SignerGas && operatorL1 > keel.l1DeployGasWei,
  });

  const bytecodePath = join(ROOT, SPHINX_BOOTY_BRIDGE_BYTECODE_PATH);
  let predictedBridge = null;
  const blockers = [];
  if (existsSync(bytecodePath)) {
    const raw = readFileSync(bytecodePath, "utf8").trim();
    const bytecode = `0x${raw.replace(/^0x/, "")}`;
    const initCode = encodeBridgeConstructor(bytecode, UNIFIED_STATE_SIG, TREASURE_VAULT);
    predictedBridge = dayZeroBerth(initCode).address;
  } else {
    blockers.push("Bridge bytecode missing — compile SphinxBootyBridge to predict CREATE2 berth");
  }

  if (!resolved) {
    blockers.push("No signer — TREASURE_BRIDGE_PRIVATE_KEY or Solana id.json");
  } else if (!hasVaultKey) {
    blockers.push(
      `Signer ${resolved.address} ≠ vault ${TREASURE_VAULT} — cannot withdraw zkSync leftover`,
    );
  }
  if (operatorL1 === 0n) {
    blockers.push(`Operator ${OPERATOR_EVM} has 0 L1 ETH — cannot CREATE2-dock until funded`);
  }
  if (LIVE) {
    blockers.push("DAYZERO_LIVE=1 set but no broadcast: fail-closed without vault key + L1 gas");
  }

  const status = buildDayZeroStatus({
    keel,
    slackTide,
    nextAction,
    predictedBridge,
    blockers,
  });

  writeFileSync(OUT, `${JSON.stringify(status, null, 2)}\n`);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  DAY ZERO — burn the longboat, dock the empty frigate         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Slack tide:     ${slackTide ? "yes" : "no — wait"}`);
  console.log(`Keel:           ${status.engineKeel}`);
  console.log(`Next:           ${nextAction}`);
  console.log(`zkSync leftover ${formatEther(vaultZk)} ETH`);
  console.log(`L1 base fee:    ${l1WeiPerGas} wei`);
  console.log(`CREATE2 factory ${CREATE2_FACTORY}`);
  console.log(`Predicted berth ${predictedBridge ?? "(need bytecode)"}`);
  console.log(`Captain's cut → ${status.captainsCutDest ?? "undocked"}`);
  console.log(`claim valueWei  ${status.claimValueWei}`);
  console.log("");
  console.log("Letter of marque:");
  for (const cmd of status.letterOfMarque) console.log(`  ${cmd}`);
  console.log("");
  console.log(`Wrote ${OUT}`);
  console.log(`Next command: ${status.nextCommand}`);
  if (!LIVE) console.log("Dry-run — set DAYZERO_LIVE=1 only when vault key + L1 gas exist.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
