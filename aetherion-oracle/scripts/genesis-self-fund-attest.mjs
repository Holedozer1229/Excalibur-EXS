#!/usr/bin/env node
/**
 * Self-fund genesis loan pipeline:
 *   BIP-322 attest bundle + BIP-173 costumes + 2 loan mechanisms
 *
 * Writes:
 *   public/treasure/bip322-genesis-attest.json
 *   public/treasure/bip173-genesis-costume.json
 *   public/treasure/genesis-loan-status.json
 *
 *   npm run self-fund:genesis-loan
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { composeGenesisLoan, summarizeGenesisLoan } from "../src/lib/genesisLoanMechanisms.ts";
import { LAST_VACUUM_NET_WEI } from "../src/lib/engineSelfFund.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "public/treasure/dust-vacuum-status.json");
const OUT_LOAN = join(ROOT, "public/treasure/genesis-loan-status.json");
const OUT_BIP322 = join(ROOT, "public/treasure/bip322-genesis-attest.json");
const OUT_BIP173 = join(ROOT, "public/treasure/bip173-genesis-costume.json");

function readPileWei() {
  try {
    const j = JSON.parse(readFileSync(STATUS_PATH, "utf8"));
    const w = j?.netWei ?? j?.leftoverWei ?? j?.pileWei;
    if (w != null && String(w) !== "") return String(w);
  } catch {
    /* fall through */
  }
  return LAST_VACUUM_NET_WEI;
}

const loan = composeGenesisLoan({
  updatedAt: new Date().toISOString(),
  netWei: readPileWei(),
});

writeFileSync(OUT_BIP322, JSON.stringify(loan.bip322, null, 2) + "\n");
writeFileSync(OUT_BIP173, JSON.stringify(loan.bip173, null, 2) + "\n");
writeFileSync(OUT_LOAN, JSON.stringify(loan, null, 2) + "\n");

console.log(summarizeGenesisLoan(loan));
console.log(`==> ${OUT_BIP322}`);
console.log(`==> ${OUT_BIP173}`);
console.log(`==> ${OUT_LOAN}`);
console.log(`==> verdict ${loan.verdict}`);
