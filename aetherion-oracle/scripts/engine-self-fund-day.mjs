#!/usr/bin/env node
/**
 * Honest engine self-fund / day from the vacuum leftover STOCK.
 *
 * Writes public/treasure/engine-self-fund-day.json
 * Fetches live L1 baseFee + gasPrice (ethereum.publicnode.com) and zkSync gas.
 * Does NOT treat 0.00712 × N dry-runs as daily profit.
 *
 *   npm run self-fund:day
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ETHEREUM_RPC_DEFAULT,
  ZKSYNC_RPC_DEFAULT,
} from "../src/lib/vacuumWatch.ts";
import { LAST_VACUUM_NET_WEI, engineSelfFundPerDay, serializeEngineSelfFund } from "../src/lib/engineSelfFund.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "public/treasure/dust-vacuum-status.json");
const OUT_PATH = join(ROOT, "public/treasure/engine-self-fund-day.json");

const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? ETHEREUM_RPC_DEFAULT;
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? ZKSYNC_RPC_DEFAULT;
const FETCH_MS = 12_000;
const argv = process.argv.slice(2);
const cyclesFlag = argv.find((a) => a.startsWith("--cycles="));
const cyclesArg = argv.includes("--cycles") ? argv[argv.indexOf("--cycles") + 1] : cyclesFlag?.split("=")[1];

async function fetchJson(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function rpcCall(url, method, params) {
  const json = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (json?.error) throw new Error(json.error.message ?? method);
  return json?.result;
}

function parseHexBig(value) {
  if (value == null) return null;
  try {
    const t = String(value);
    if (!t) return null;
    return BigInt(t);
  } catch {
    return null;
  }
}

async function liveGas() {
  const [block, l1Price, zkPrice] = await Promise.all([
    rpcCall(ETHEREUM_RPC, "eth_getBlockByNumber", ["latest", false]),
    rpcCall(ETHEREUM_RPC, "eth_gasPrice", []),
    rpcCall(ZKSYNC_RPC, "eth_gasPrice", []),
  ]);
  const baseFee = parseHexBig(block?.baseFeePerGas);
  const l1Gas = parseHexBig(l1Price);
  const zkGas = parseHexBig(zkPrice);
  return {
    l1BaseFeeWei: baseFee,
    l1WeiPerGas: l1Gas ?? baseFee,
    zkWeiPerGas: zkGas,
    source: "live",
  };
}

function readVacuumStatus() {
  try {
    return JSON.parse(readFileSync(STATUS_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const status = readVacuumStatus();
  const netWei = status?.profit?.netWei ?? LAST_VACUUM_NET_WEI;
  const intervalMs = Number(status?.intervalMs) || 60_000;
  const dryRunCycles = Number(process.env.SELF_FUND_CYCLES ?? cyclesArg ?? status?.cycle) || 1;

  let gas = { source: "fallback", l1WeiPerGas: undefined, zkWeiPerGas: undefined, l1BaseFeeWei: undefined };
  try {
    gas = await liveGas();
  } catch (e) {
    console.warn(`live gas unavailable (${e instanceof Error ? e.message : e}) — using last-recorded fallback`);
  }

  const report = engineSelfFundPerDay({
    netWei,
    intervalMs,
    dryRunCycles,
    l1WeiPerGas: gas.l1WeiPerGas,
    zkWeiPerGas: gas.zkWeiPerGas,
    l1BaseFeeWei: gas.l1BaseFeeWei,
    gasSource: gas.source,
  });

  writeFileSync(OUT_PATH, serializeEngineSelfFund(report));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ENGINE SELF-FUND / DAY  —  stock, not a wage                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`$/ dry-run          $${report.usdPerDryRun.toFixed(2)}  (${report.pileEth} ETH × $${report.ethUsdOracle})`);
  console.log(`Honest / day        $${report.honest.usdPerDayAfterSweep.toFixed(2)}  (after one real sweep)`);
  console.log(`Hypothetical / day  $${report.hypotheticalIfRecurring.usdPerDay.toFixed(2)}  (IF well refilled every ${report.hypotheticalIfRecurring.watchIntervalMs}ms — NOT APY)`);
  console.log(`Hypothetical 60s    $${report.hypotheticalIfRecurring.usdPerDayIf60sWatch.toFixed(2)}  (IF well refilled every 60s helm tick — NOT APY)`);
  console.log(`Cycles observed     ${report.dryRunCyclesObserved}  (same well: ${report.sameWell})`);
  console.log(`L1 gas              ${report.liveGas.l1Gwei} gwei  (${report.liveGas.source})`);
  if (report.liveGas.l1BaseFeeWei) console.log(`L1 baseFee          ${report.liveGas.l1BaseFeeWei} wei`);
  console.log("");
  console.log("Scale — ops this pile funds (not × cycles):");
  console.log(`  transfers (21k)           ${report.scale.transfersFunded}`);
  console.log(`  claims (180k)             ${report.scale.claimsFunded}`);
  console.log(`  deploys (1.2M)            ${report.scale.deploysFunded}`);
  console.log(`  withdraw+finalize         ${report.scale.withdrawPlusFinalizeFunded}`);
  console.log("");
  for (const reason of report.cannotFund.reasons) console.log(`  ✗ ${reason}`);
  console.log("");
  console.log(report.honest.note);
  console.log(`wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
