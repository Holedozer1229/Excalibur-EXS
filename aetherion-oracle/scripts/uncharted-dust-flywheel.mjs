#!/usr/bin/env node
/**
 * Uncharted dust flywheel — live inventory + dry-run evaluate.
 *
 * Writes:
 *   public/treasure/uncharted-dust-flywheel.json
 *   public/treasure/engine-self-fund-day.json
 *
 * Default is dry-run. VACUUM_LIVE=1 / VACUUM_SWEEP=1 still fail-closed
 * without the owning key (this script never broadcasts).
 *
 *   npm run dust:flywheel
 *   npm run self-fund:day
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeEngineSelfFund } from "../src/lib/engineSelfFund.ts";
import {
  ENTRYPOINT_V06,
  ENTRYPOINT_V07,
  FLYWHEEL_OWNED_EOAS,
  LAST_VACUUM_NET_WEI,
  UNCHARTED_CHAINS,
  applyFlywheelGates,
  buildUnchartedFlywheel,
  defaultGhostGalleonPayloads,
  foldChartedVacuumFindings,
  isSweepBroadcastEnabled,
  scanEntryPointAndPaymaster,
  scanOriginatedPayloads,
  scanUnchartedNatives,
  scanUnchartedTokens,
  serializeFlywheel,
} from "../src/lib/unchartedDustFlywheel.ts";
import { parseAtomic } from "../src/lib/vacuumWatch.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "public/treasure/dust-vacuum-status.json");
const FLYWHEEL_OUT = join(ROOT, "public/treasure/uncharted-dust-flywheel.json");
const SELF_FUND_OUT = join(ROOT, "public/treasure/engine-self-fund-day.json");

const FETCH_MS = 10_000;
const LIVE = isSweepBroadcastEnabled(process.env);

function padAddr(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function encodeBalanceOf(address) {
  return `0x70a08231${padAddr(address)}`;
}

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
  if (value == null) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

async function settle(promises) {
  return Promise.all(
    promises.map((p) =>
      p.then((v) => ({ ok: true, value: v })).catch((e) => ({ ok: false, error: e })),
    ),
  );
}

async function scanChain(chain) {
  const rpc = process.env[`${chain.id.toUpperCase()}_RPC`] ?? chain.rpc;
  const snapshot = {
    chain: chain.id,
    weiPerGas: 0n,
    rpcOk: false,
    natives: [],
    tokens: [],
    entryPointDeposits: [],
    messengerCredits: [],
  };
  try {
    const gas = await rpcCall(rpc, "eth_gasPrice", []);
    snapshot.weiPerGas = parseHexBig(gas);
    snapshot.rpcOk = true;
  } catch (e) {
    snapshot.rpcError = e instanceof Error ? e.message : String(e);
    return { snapshot, rpc };
  }

  const owners = FLYWHEEL_OWNED_EOAS.map((w) => w.address);
  const nativeCalls = owners.map((addr) => rpcCall(rpc, "eth_getBalance", [addr, "latest"]));
  const tokenCalls = [];
  for (const addr of owners) {
    for (const token of chain.tokens) {
      tokenCalls.push({
        addr,
        token,
        p: rpcCall(rpc, "eth_call", [{ to: token.address, data: encodeBalanceOf(addr) }, "latest"]),
      });
    }
  }
  const epCalls = [];
  for (const addr of owners) {
    for (const [ep, version] of [
      [ENTRYPOINT_V06, "v0.6"],
      [ENTRYPOINT_V07, "v0.7"],
    ]) {
      epCalls.push({
        addr,
        ep,
        version,
        p: rpcCall(rpc, "eth_call", [{ to: ep, data: encodeBalanceOf(addr) }, "latest"]),
      });
    }
  }

  const nativeSettled = await settle(nativeCalls);
  nativeSettled.forEach((row, i) => {
    snapshot.natives.push({
      address: owners[i],
      wei: row.ok ? parseHexBig(row.value) : 0n,
    });
  });

  const tokenSettled = await settle(tokenCalls.map((t) => t.p));
  tokenSettled.forEach((row, i) => {
    const meta = tokenCalls[i];
    snapshot.tokens.push({
      address: meta.addr,
      token: meta.token.address,
      symbol: meta.token.symbol,
      amount: row.ok ? parseHexBig(row.value) : 0n,
      decimals: meta.token.decimals,
    });
  });

  const epSettled = await settle(epCalls.map((e) => e.p));
  epSettled.forEach((row, i) => {
    const meta = epCalls[i];
    snapshot.entryPointDeposits.push({
      address: meta.addr,
      entryPoint: meta.ep,
      version: meta.version,
      depositWei: row.ok ? parseHexBig(row.value) : 0n,
      stakeWei: 0n,
    });
  });

  return { snapshot, rpc };
}

function readVacuumStatus() {
  try {
    return JSON.parse(readFileSync(STATUS_PATH, "utf8"));
  } catch {
    return null;
  }
}

function foldStatusFindings(status) {
  if (!Array.isArray(status?.findings)) return [];
  return foldChartedVacuumFindings(
    status.findings.map((f) => ({
      id: String(f.id ?? "row"),
      scanner: f.scanner ?? "failed_tx_refund",
      chain: f.chain ?? "ethereum",
      from: f.from ?? TREASURE_HINT,
      to: f.to ?? TREASURE_HINT,
      role: f.role ?? "skynt_portfolio",
      amountAtomic: parseAtomic(f.amountAtomic),
      feeAtomic: parseAtomic(f.feeAtomic),
      netAtomic: parseAtomic(f.netAtomic),
      unit: f.unit ?? "wei",
      action: f.action ?? "inventory_only",
      executable: false,
      profitable: !!f.profitable,
      blocker: f.blocker,
      detail: String(f.detail ?? "vacuum fold-in"),
    })),
  );
}

const TREASURE_HINT = "0xc5a47c9adab637d1caa791cce193079d22c8cb20";

async function liveL1Gas(ethereumRpc, zksyncRpc) {
  try {
    const [block, l1Price, zkPrice] = await Promise.all([
      rpcCall(ethereumRpc, "eth_getBlockByNumber", ["latest", false]),
      rpcCall(ethereumRpc, "eth_gasPrice", []),
      rpcCall(zksyncRpc, "eth_gasPrice", []),
    ]);
    return {
      l1BaseFeeWei: parseHexBig(block?.baseFeePerGas),
      l1WeiPerGas: parseHexBig(l1Price),
      zkWeiPerGas: parseHexBig(zkPrice),
      source: "live",
    };
  } catch {
    return { source: "fallback", l1WeiPerGas: undefined, zkWeiPerGas: undefined, l1BaseFeeWei: undefined };
  }
}

async function main() {
  const status = readVacuumStatus();
  const chartedNet = status?.profit?.netWei ?? LAST_VACUUM_NET_WEI;
  const intervalMs = Number(status?.intervalMs) || 60_000;
  const dryRunCycles = Number(process.env.SELF_FUND_CYCLES ?? status?.cycle) || 1;

  const scanned = await Promise.all(UNCHARTED_CHAINS.map((chain) => scanChain(chain)));
  const snapshots = scanned.map((s) => s.snapshot);
  const rpc = {};
  for (let i = 0; i < UNCHARTED_CHAINS.length; i += 1) {
    const chain = UNCHARTED_CHAINS[i];
    const row = scanned[i];
    rpc[chain.id] = {
      url: row.rpc,
      ok: row.snapshot.rpcOk,
      ...(row.snapshot.rpcError ? { error: row.snapshot.rpcError } : {}),
    };
  }

  const findings = [
    ...scanUnchartedNatives(snapshots),
    ...scanUnchartedTokens(snapshots),
    ...scanEntryPointAndPaymaster(snapshots),
    ...scanOriginatedPayloads(defaultGhostGalleonPayloads()),
    ...foldStatusFindings(status),
  ];

  const gated = applyFlywheelGates(findings, {
    live: LIVE,
    revoke: false,
    signerAddress: null,
    solanaSignerPresent: false,
  });

  const ethRpc = rpc.ethereum?.url ?? "https://ethereum.publicnode.com";
  const zkRpc = rpc.zksync?.url ?? "https://mainnet.era.zksync.io";
  const gas = await liveL1Gas(ethRpc, zkRpc);

  const report = buildUnchartedFlywheel({
    findings: gated,
    chartedVacuumNetWei: chartedNet,
    dryRunCycles,
    intervalMs,
    l1WeiPerGas: gas.l1WeiPerGas,
    zkWeiPerGas: gas.zkWeiPerGas,
    l1BaseFeeWei: gas.l1BaseFeeWei,
    gasSource: gas.source,
    mode: LIVE ? "live" : "dry-run",
    rpc,
    chainsReached: snapshots.filter((s) => s.rpcOk).length,
  });

  writeFileSync(FLYWHEEL_OUT, serializeFlywheel(report));
  writeFileSync(SELF_FUND_OUT, serializeEngineSelfFund(report.selfFund));

  const reached = snapshots.filter((s) => s.rpcOk).map((s) => s.chain).join(", ");
  const missed = snapshots.filter((s) => !s.rpcOk).map((s) => `${s.chain}${s.rpcError ? ` (${s.rpcError})` : ""}`);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  UNCHARTED DUST FLYWHEEL  —  stock, not a wage               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode                ${report.mode}  (broadcast: never from this script)`);
  console.log(`$/ dry-run          $${report.usdPerDryRun.toFixed(2)}  (${report.extractableEth} ETH × $${report.ethUsdOracle})`);
  console.log(`Uncharted extract   ${report.unchartedExtractableEth} ETH`);
  console.log(`Charted vacuum net  ${report.chartedVacuumNetWei} wei`);
  console.log(`Sources found       ${report.unchartedSourcesFound} uncharted · ${report.chartedFoldIns} fold-ins`);
  console.log(`Gas tank ${(report.split.gasTankBps / 100).toFixed(0)}%      ${report.split.tankEth} ETH  ($${report.split.tankUsd.toFixed(2)})`);
  console.log(`Berth WETH          ${report.split.berthEth} ETH  ($${report.split.berthUsd.toFixed(2)}) → ${report.split.destination}`);
  console.log(`Honest / day        $${report.honest.usdPerDayAfterSweep.toFixed(2)}  (after one real sweep)`);
  console.log(`Hypothetical 60s    $${report.hypotheticalIfRecurring.usdPerDayIf60sWatch.toFixed(2)}  (IF well refilled — NOT APY)`);
  console.log(`Chains reached      ${report.chainsReached}/${report.chainsScanned}  ${reached || "(none)"}`);
  if (missed.length) console.log(`Chains missed       ${missed.join(" · ")}`);
  console.log(`L1 gas              ${report.selfFund.liveGas.l1Gwei} gwei  (${report.selfFund.liveGas.source})`);
  console.log("");
  console.log("Scale — ops this pile funds (not × cycles):");
  console.log(`  transfers (21k)           ${report.selfFund.scale.transfersFunded}`);
  console.log(`  claims (180k)             ${report.selfFund.scale.claimsFunded}`);
  console.log(`  deploys (1.2M)            ${report.selfFund.scale.deploysFunded}`);
  console.log(`  withdraw+finalize         ${report.selfFund.scale.withdrawPlusFinalizeFunded}`);
  console.log("");
  console.log(report.copy.tagline);
  console.log(report.honest.note);
  console.log(`wrote ${FLYWHEEL_OUT}`);
  console.log(`wrote ${SELF_FUND_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
