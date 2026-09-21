#!/usr/bin/env node
/**
 * Live L1 sail — CREATE2-dock the empty berth. Fail-closed without operator gas.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { FLYWHEEL_BERTH } from "../src/lib/unchartedDustFlywheel.ts";
import { CREATE2_FACTORY, SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/treasure/l1-sail-status.json");
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

async function main() {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-l1-sail/1" } } }),
  });
  const [opWei, berthCode, block] = await Promise.all([
    client.getBalance({ address: SOLANA_DERIVED_EVM }),
    client.getCode({ address: FLYWHEEL_BERTH }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  let signer = null;
  try {
    signer = resolveBridgeKey();
  } catch {
    signer = null;
  }
  const live = process.env.L1_SAIL_LIVE === "1" || process.env.L1_SAIL_LIVE === "true";
  const empty = !berthCode || berthCode === "0x";
  const cost = (block.baseFeePerGas ?? 0n) * 1_200_000n;
  const blockers = [];
  if (!signer) blockers.push("no_signer");
  if (opWei < cost) blockers.push("operator_l1_empty");
  if (!live) blockers.push("dry_run_default");
  const status = {
    kind: "l1-sail-status",
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    network: "ethereum-mainnet",
    factory: CREATE2_FACTORY,
    berth: FLYWHEEL_BERTH,
    excalNote: "CamelotScavenger EXCAL uses the same factory + salt 0x7c2bac1d — npm run excal:create2",
    berthEmpty: empty,
    operator: SOLANA_DERIVED_EVM,
    operatorEth: Number(formatEther(opWei)),
    signer: signer?.address ?? null,
    live,
    broadcast: "FAIL_CLOSED",
    txHash: null,
    blockers,
    note: "Arrr — L1 sail is planned. Operator has 0 ETH so CREATE2 does not leave the dock.",
  };
  writeFileSync(OUT, `${JSON.stringify(status, null, 2)}\n`);
  console.log("L1 sail FAIL_CLOSED", blockers.join(", ") || "ready");
  console.log("Wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
