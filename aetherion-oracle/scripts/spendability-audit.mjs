#!/usr/bin/env node
/**
 * Spendability audit — proof-ledger vs L1 reality, ranked honest paths.
 * Dry-run by default. Never claims 137 ETH is spendable on L1.
 *
 * Live probe: SPENDABILITY_LIVE=1 (RPC balance checks only — still fail-closed).
 *
 *   npm run spendability:audit
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, formatEther } from "viem";
import { mainnet } from "viem/chains";
import {
  buildSpendabilityPlaybook,
  spendabilityTraceLines,
} from "../src/lib/qai/spendabilityPlaybook.ts";
import { EXCAL_CREATE2_PREDICTED } from "../src/lib/eip7949Excal.ts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { SKYNT_SOURCE_WALLET } from "../src/lib/zkStarknetClaim.ts";
import { SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";
import { LAST_VACUUM_NET_WEI } from "../src/lib/engineSelfFund.ts";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/treasure/spendability-playbook.json");
const SKYNT = join(ROOT, "public/treasure/skynt-provenance-chain.json");
const TETRA = join(ROOT, "public/treasure/tetra-pow.json");
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const LIVE = process.env.SPENDABILITY_LIVE === "1" || process.env.SPENDABILITY_LIVE === "true";

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [ZKSYNC_RPC] } },
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SPENDABILITY AUDIT — 137 ETH proof-ledger vs L1 reality       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode: ${LIVE ? "live RPC probe" : "dry-run (RPC balance checks)"}`);
  console.log("");

  const provenance = existsSync(SKYNT)
    ? loadJson(SKYNT)
    : {
        stateSig: "0x0",
        verdict: "MISSING — run npm run trace:skynt",
        onChainL1TxFound: 0,
      };

  let tetra = null;
  if (existsSync(TETRA)) {
    const t = loadJson(TETRA);
    const excalNode = t.tip?.nodes?.find((n) => n.id === "excal");
    tetra = {
      tipHash: t.tip?.hash ?? "",
      predictedL1: t.predictedL1 ?? EXCAL_CREATE2_PREDICTED,
      excalNodeMatchesCreate2:
        (excalNode?.anchor ?? "").toLowerCase() === (t.predictedL1 ?? "").toLowerCase(),
    };
  }

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-spendability/1" } } }),
  });
  const zkClient = createPublicClient({
    chain: zksync,
    transport: http(ZKSYNC_RPC),
  });

  let operatorAddress = SOLANA_DERIVED_EVM;
  try {
    const key = resolveBridgeKey();
    if (key?.address) operatorAddress = key.address;
  } catch {
    /* default sol-derived */
  }

  const [vaultL1, vaultZk, operatorL1, skyntL1, create2Code, create2Wei, feeData] = await Promise.all([
    ethClient.getBalance({ address: TREASURE_VAULT }),
    zkClient.getBalance({ address: TREASURE_VAULT }),
    ethClient.getBalance({ address: operatorAddress }),
    ethClient.getBalance({ address: SKYNT_SOURCE_WALLET }),
    ethClient.getCode({ address: EXCAL_CREATE2_PREDICTED }),
    ethClient.getBalance({ address: EXCAL_CREATE2_PREDICTED }),
    ethClient.getFeeHistory({ blockCount: 1, rewardPercentiles: [50] }).catch(() => null),
  ]);

  const l1WeiPerGas =
    feeData?.baseFeePerGas?.[0] != null
      ? feeData.baseFeePerGas[0] + (feeData.reward?.[0]?.[0] ?? 0n)
      : undefined;

  const playbook = buildSpendabilityPlaybook({
    vaultL1Wei: vaultL1,
    vaultZkWei: vaultZk,
    operatorL1Wei: operatorL1,
    skyntPortfolioL1Wei: skyntL1,
    vacuumStockWei: LAST_VACUUM_NET_WEI,
    create2HasCode: !!create2Code && create2Code !== "0x",
    create2Wei,
    operatorAddress,
    provenance: {
      stateSig: provenance.stateSig,
      verdict: provenance.verdict,
      onChainL1TxFound: provenance.onChainL1TxFound,
    },
    tetra,
    l1WeiPerGas,
    live: LIVE,
  });

  writeFileSync(OUT, `${JSON.stringify(playbook, null, 2)}\n`);

  console.log(`137 ETH:     ${playbook.proofLedger.canonicalEth} — proof-ledger ONLY (not spendable L1)`);
  console.log(`Vault L1:    ${formatEther(vaultL1)} ETH`);
  console.log(`Vault zk:    ${formatEther(vaultZk)} ETH`);
  console.log(`Operator:    ${operatorAddress}  ${formatEther(operatorL1)} ETH`);
  console.log(`SKYNT 0x5592: ${formatEther(skyntL1)} ETH`);
  console.log(`CREATE2:     ${EXCAL_CREATE2_PREDICTED}  code=${playbook.l1Reality.create2HasCode}`);
  console.log(`Min deploy:  ${playbook.operatorPlan.minimumL1GasEth.toFixed(4)} ETH`);
  console.log(`Aave coll:   ${playbook.operatorPlan.aaveCollateralForMinGasEth.toFixed(4)} WETH (for min gas borrow)`);
  console.log(`Gap:         ${playbook.l1Reality.gapEth.toFixed(3)} ETH`);
  console.log("");
  console.log(`Verdict: ${playbook.verdict}`);
  console.log(playbook.honestSummary);
  console.log("");
  console.log("Top paths (by feasibility rank):");
  for (const p of playbook.paths.slice(0, 6)) {
    console.log(`  [${p.rank}] ${p.title}`);
    console.log(`      ${p.feasibility} · unlocks137=${p.canUnlock137Eth}`);
  }
  console.log("");
  console.log("Honest blockers:");
  playbook.blockers.slice(0, 5).forEach((b) => console.log(`  ⊘ ${b}`));
  console.log("");
  console.log(`Wrote ${OUT}`);
  console.log("");
  for (const line of spendabilityTraceLines(playbook)) {
    console.log(line);
  }
}

main().catch((err) => {
  console.error("spendability-audit crashed:", err?.message ?? err);
  process.exit(1);
});
