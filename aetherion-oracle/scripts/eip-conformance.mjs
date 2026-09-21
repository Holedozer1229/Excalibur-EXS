#!/usr/bin/env node
/**
 * Write posted EIP conformance + commitment-chain artifacts.
 * Does not broadcast. Does not mint 137 ETH.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEipConformance,
  EIP_CONFORMANCE_PATH,
  serializeEipConformance,
} from "../src/lib/eipConformance.ts";
import {
  buildCommitmentChain,
  COMMITMENT_CHAIN_PATH,
  serializeCommitmentChain,
} from "../src/lib/commitmentChain.ts";
import { eip7949Conformant } from "../src/lib/eip7949Genesis.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const eip = buildEipConformance();
  const chain = buildCommitmentChain();
  const eipOut = join(ROOT, "public", EIP_CONFORMANCE_PATH.replace(/^\//, ""));
  const chainOut = join(ROOT, "public", COMMITMENT_CHAIN_PATH.replace(/^\//, ""));
  writeFileSync(eipOut, serializeEipConformance(eip));
  writeFileSync(chainOut, serializeCommitmentChain(chain));
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  EIP CONFORMANCE  ·  COMMITMENT CHAIN  ·  HONEST             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`EIP-7949:    ${eip7949Conformant() ? "conformant" : "FAIL"}`);
  console.log(`EIP-2:       ${eip.eip2.conformant ? "low-s canonical" : "FAIL"}  v=${eip.eip2.ethereumV}`);
  console.log(`Posted hash: ${eip.hashes.postedDisplayBytes} bytes (display)`);
  console.log(`On-chain:    ${eip.hashes.onChainKeccak}`);
  console.log(`AIR:         ${chain.air.satisfied}`);
  console.log(`Solvency:    ${chain.solvency.postedEth} ≥ ${chain.solvency.canonicalEth} ledger-only`);
  console.log(`Wrote ${eipOut}`);
  console.log(`Wrote ${chainOut}`);
}

main();
