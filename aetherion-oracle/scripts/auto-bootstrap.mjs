#!/usr/bin/env node
/**
 * Auto-bootstrap every helm rail. Autoscale watch replicas honestly.
 * Does not mint $1M. Fail-closed without operator L1 gas.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";
import {
  AUTO_BOOTSTRAP_PATH,
  buildAutoBootstrap,
  serializeAutoBootstrap,
} from "../src/lib/autoBootstrap.ts";
import { HELM_PIPELINES } from "../src/lib/helmPipelines.ts";
import { eip7949Conformant } from "../src/lib/eip7949Genesis.ts";
import { parseBip322Eip2 } from "../src/lib/eipConformance.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", AUTO_BOOTSTRAP_PATH.replace(/^\//, ""));
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

async function main() {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-auto-bootstrap/1" } } }),
  });
  let operatorWei = 0n;
  try {
    operatorWei = await client.getBalance({ address: SOLANA_DERIVED_EVM });
  } catch {
    operatorWei = 0n;
  }

  const live = process.env.BOOTSTRAP_LIVE === "1" || process.env.BOOTSTRAP_LIVE === "true";
  const report = buildAutoBootstrap({
    live,
    operatorWei,
    newLeftoverUsd: 0,
    alreadySwept: false,
    stepResults: [
      { id: "pipelines", ok: true, detail: `${HELM_PIPELINES.length} rails hooked` },
      { id: "operator", ok: operatorWei > 0n, detail: `L1 ${operatorWei.toString()} wei` },
      { id: "excal", ok: true, detail: "CREATE2 predicted — bytecode pending gas" },
      { id: "eip-7949", ok: eip7949Conformant(), detail: "posted genesis-mainnet.json" },
      { id: "eip-2", ok: parseBip322Eip2().conformant, detail: "BIP-322 low-s" },
      { id: "millionaire", ok: false, detail: "$1M in 72h is not reachable from this stock" },
    ],
  });

  writeFileSync(OUT, serializeAutoBootstrap(report));
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  AUTO-BOOTSTRAP  ·  AUTOSCALE  ·  HONEST 72h                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Stock:       $${report.stockUsd.toFixed(2)} once`);
  console.log(`$1M / 72h:   need ~$${report.millionaire.usdPerHourNeeded}/hr NEW leftover · honest $0/hr`);
  console.log(`Replicas:    ${report.autoscale.replicas} (${report.autoscale.reason})`);
  console.log(`Broadcast:   ${report.broadcast}  ${report.blockers.join(", ")}`);
  console.log(report.note);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
