#!/usr/bin/env node
/**
 * Cross-reference Tetra-PoW tip hash → predicted L1 CREATE2 → 137 ETH proof ledger.
 * Dry-run by default. Never claims 137 ETH was mined on Ethereum mainnet.
 *
 * Optional: TETRA_REMINE=1 re-runs tetra-mine before cross-reference.
 * Live probe: POS_EVIDENCE_LIVE=1 (still fail-closed without operator L1 gas).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { buildPosEvidence } from "../src/lib/qai/posEvidence.ts";
import { EXCAL_CREATE2_PREDICTED } from "../src/lib/eip7949Excal.ts";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import { SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/treasure/pos-evidence.json");
const TETRA = join(ROOT, "public/treasure/tetra-pow.json");
const SKYNT = join(ROOT, "public/treasure/skynt-provenance-chain.json");
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const LIVE = process.env.POS_EVIDENCE_LIVE === "1" || process.env.POS_EVIDENCE_LIVE === "true";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  PoS EVIDENCE — Tetra-PoW tip → L1 anchor → 137 ETH ledger     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  if (process.env.TETRA_REMINE === "1") {
    console.log("==> Re-mining Tetra-PoW origin ledger…");
    execSync("npx --yes tsx ./scripts/tetra-mine.mjs", { cwd: ROOT, stdio: "inherit" });
    console.log("");
  }

  if (!existsSync(TETRA)) {
    console.log("==> tetra-pow.json missing — running tetra-mine…");
    execSync("npx --yes tsx ./scripts/tetra-mine.mjs", { cwd: ROOT, stdio: "inherit" });
    console.log("");
  }

  const tetra = loadJson(TETRA);
  const provenance = existsSync(SKYNT)
    ? loadJson(SKYNT)
    : { stateSig: "0x0", verdict: "MISSING — run npm run trace:skynt" };

  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-pos-evidence/1" } } }),
  });

  const block = await client.getBlock({ blockTag: "latest" });
  const liveExecutionBlock = Number(block.number);

  const [predCode, predWei, opWei] = await Promise.all([
    client.getCode({ address: EXCAL_CREATE2_PREDICTED }),
    client.getBalance({ address: EXCAL_CREATE2_PREDICTED }),
    client.getBalance({ address: SOLANA_DERIVED_EVM }),
  ]);

  let operatorAddress = SOLANA_DERIVED_EVM;
  try {
    const key = resolveBridgeKey();
    operatorAddress = key.address;
  } catch {
    operatorAddress = SOLANA_DERIVED_EVM;
  }

  const evidence = buildPosEvidence({
    tetra,
    provenance: {
      stateSig: provenance.stateSig,
      verdict: provenance.verdict ?? "unknown",
      create2Salt: provenance.create2Salt,
    },
    probe: {
      liveExecutionBlock,
      predictedHasCode: !!predCode && predCode !== "0x",
      predictedWei: predWei,
      operatorWei: opWei,
      operatorAddress,
      live: LIVE,
    },
  });

  writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(`Tetra tip:    h${evidence.tetraPow.height} ${evidence.tetraPow.tipHash.slice(0, 22)}…`);
  console.log(`CREATE2:      ${evidence.predictedL1.create2Address}  code=${evidence.predictedL1.hasCode}`);
  console.log(`Pred slot:    ${evidence.predictedL1.predictedBeaconSlot} (prediction only)`);
  console.log(`Attest hash:  ${evidence.crossReference.attestationHash.slice(0, 22)}…`);
  console.log(`137 ETH:      ${evidence.booty137.canonicalEth} — proof-ledger ONLY (not spendable L1)`);
  console.log(`PoS mined:    NO — blockProposed=false attestationBroadcast=false`);
  console.log(`Operator:     ${evidence.posMine.operatorAddress}  funded=${evidence.posMine.operatorFunded}`);
  console.log("");
  console.log(`Verdict: ${evidence.verdict}`);
  console.log(evidence.honestSummary);
  console.log("");
  for (const link of evidence.crossReference.links) {
    console.log(`  ${link.verified ? "✓" : "⊘"} ${link.label}`);
  }
  console.log("");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error("pos-evidence crashed:", err?.message ?? err);
  process.exit(1);
});
