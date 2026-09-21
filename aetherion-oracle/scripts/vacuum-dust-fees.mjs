#!/usr/bin/env node
/**
 * Dust / leftover-fee vacuum + fail-closed profit test — MAX allowable on own funds.
 *
 * Default: status / dry-run — always writes public/treasure/dust-vacuum-status.json and exits 0.
 * Live sweep: --sweep, SWEEP=1, or VACUUM_LIVE=1 — exits non-zero if a requested sweep cannot proceed.
 * Watch: --watch (60s default, backoff on HTTP 429).
 *
 * Only documented vault / SKYNT / operator / SKYNT-export / treasure wallets.
 * Never sweeps Bitcoin genesis or third-party addresses. Never invents 137 ETH.
 * Economic floor: collect ANY amount where value > sweep fee (no 0.0001 cutoff).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { Keypair } from "@solana/web3.js";
import { resolveBridgeKey, DEFAULT_SOLANA_KEYPAIR } from "../src/lib/bridgeKeyResolver.ts";
import {
  BTC_UTXO_API_DEFAULT,
  ENGINE_GAS,
  ETHEREUM_RPC_DEFAULT,
  OPERATOR_EVM,
  SOLANA_DEPLOY_WALLET,
  SOLANA_RPC_DEFAULT,
  VACUUM_INTERVAL_MS_DEFAULT,
  ZKSYNC_RPC_DEFAULT,
  buildDustVacuumStatus,
  evaluateProfitTest,
  formatAtomic,
  isAllowedEvmSweepDest,
  isAllowedEvmSweepSource,
  isBitcoinGenesisAddress,
  isEvmDustChain,
  isLiveBroadcastEnabled,
  maxLimitSettings,
  nextWatchBackoffMs,
  parseBalanceHex,
  planBtcSweep,
  planEvmSweep,
  planSolSweep,
  signerOwnsLot,
  watchIntervalMs,
} from "../src/lib/dustVacuum.ts";
import {
  MAX_L2_NETWORKS,
  WATCHED_SPENDERS,
  WATCHED_TOKENS,
  applyMaxExecutionGates,
  documentedAddressesMax,
  extraOwnedEvmFromHits,
  extraOwnedSolanaFromHits,
  extractOwnedAddressesFromArtifacts,
  findingsToSweepSteps,
  scanFailedTxRefunds,
  scanLeftoverErc20,
  scanSolanaRentLeftovers,
  scanStuckAllowances,
  scanUnclaimedWithdrawals,
  scanUnusedL2Bridges,
} from "../src/lib/dustVacuumMax.ts";
import { TREASURE_VAULT as VAULT } from "../src/lib/pirateTreasureFunding.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "public/treasure/dust-vacuum-status.json");

const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? ETHEREUM_RPC_DEFAULT;
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? ZKSYNC_RPC_DEFAULT;
const SOLANA_RPC = process.env.SOLANA_RPC ?? SOLANA_RPC_DEFAULT;
const BTC_API = process.env.BTC_UTXO_API ?? BTC_UTXO_API_DEFAULT;

const args = new Set(process.argv.slice(2));
const WATCH = args.has("--watch");
const SWEEP =
  args.has("--sweep") ||
  isLiveBroadcastEnabled(process.env);
const DRY_RUN = !SWEEP;
const DEST_MODE = process.env.VACUUM_DEST === "signer" ? "signer" : "vault";
const FETCH_MS = 12_000;
let lastHttpStatus = 200;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

function writeStatus(status) {
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
}

async function fetchJson(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    lastHttpStatus = res.status;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function padAddr(address) {
  return address.slice(2).toLowerCase().padStart(64, "0");
}

function loadJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function loadTreasureArtifacts() {
  const dir = join(ROOT, "public/treasure");
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const json = loadJsonSafe(join(dir, name));
    if (json) out.push(json);
  }
  return out;
}

function loadSkyntExport() {
  const path = process.env.SKYNT_EXPORT_PATH;
  if (path && existsSync(path)) return loadJsonSafe(path);
  return null;
}

async function rpcHex(url, method, params) {
  const json = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (json?.error) throw new Error(json.error.message ?? method);
  return json?.result;
}

function solanaAddress() {
  try {
    return execSync("solana address", {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/share/solana/install/active_release/bin:${process.env.PATH}`,
      },
    }).trim();
  } catch {
    const path = process.env.SOLANA_KEYPAIR_PATH ?? DEFAULT_SOLANA_KEYPAIR;
    if (existsSync(path)) {
      try {
        const raw = JSON.parse(readFileSync(path, "utf8"));
        if (Array.isArray(raw) && raw.length >= 64) {
          return Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey.toBase58();
        }
      } catch {
        /* ignore */
      }
    }
    return process.env.SOLANA_DEPLOY_WALLET ?? "";
  }
}

async function evmBalance(rpc, address, blockers, label) {
  try {
    const hex = await rpcHex(rpc, "eth_getBalance", [address, "latest"]);
    return parseBalanceHex(hex);
  } catch (e) {
    blockers.push(`${label} balance RPC failed (${rpc}): ${e instanceof Error ? e.message : e}`);
    return 0n;
  }
}

async function evmGasPrice(rpc, blockers, label) {
  try {
    return parseBalanceHex(await rpcHex(rpc, "eth_gasPrice", []));
  } catch (e) {
    blockers.push(`${label} gasPrice RPC failed (${rpc}): ${e instanceof Error ? e.message : e}`);
    return 0n;
  }
}

async function solBalance(address, blockers) {
  if (!address) return 0n;
  try {
    const json = await fetchJson(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    const value = json?.result?.value;
    return typeof value === "number" ? BigInt(value) : 0n;
  } catch (e) {
    blockers.push(`Solana balance RPC failed (${SOLANA_RPC}): ${e instanceof Error ? e.message : e}`);
    return 0n;
  }
}

async function btcInventory(address, blockers) {
  const urls = [
    `${BTC_API.replace(/\/$/, "")}/address/${address}`,
    `https://blockstream.info/api/address/${address}`,
  ];
  for (const url of urls) {
    try {
      const json = await fetchJson(url);
      const chain = json?.chain_stats ?? {};
      const funded = BigInt(chain.funded_txo_sum ?? 0);
      const spent = BigInt(chain.spent_txo_sum ?? 0);
      const sats = funded > spent ? funded - spent : 0n;
      const utxoCount = Number(chain.funded_txo_count ?? 0) - Number(chain.spent_txo_count ?? 0);
      return { sats, utxoCount: Math.max(0, utxoCount) };
    } catch {
      /* try next */
    }
  }
  blockers.push(`BTC UTXO lookup failed for ${address} (mempool.space / blockstream)`);
  return { sats: 0n, utxoCount: 0 };
}

async function erc20Balance(rpc, token, owner, blockers, label) {
  try {
    const hex = await rpcHex(rpc, "eth_call", [{ to: token, data: `0x70a08231${padAddr(owner)}` }, "latest"]);
    return parseBalanceHex(hex);
  } catch (e) {
    blockers.push(`${label} ERC-20 balance failed: ${e instanceof Error ? e.message : e}`);
    return 0n;
  }
}

async function erc20Allowance(rpc, token, owner, spender, blockers, label) {
  try {
    const hex = await rpcHex(rpc, "eth_call", [
      { to: token, data: `0xdd62ed3e${padAddr(owner)}${padAddr(spender)}` },
      "latest",
    ]);
    return parseBalanceHex(hex);
  } catch (e) {
    blockers.push(`${label} allowance failed: ${e instanceof Error ? e.message : e}`);
    return 0n;
  }
}

async function solTokenAccounts(owner, blockers) {
  if (!owner) return [];
  try {
    const json = await fetchJson(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [owner, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }],
      }),
    });
    const values = json?.result?.value;
    if (!Array.isArray(values)) return [];
    return values.map((row) => {
      const info = row?.account?.data?.parsed?.info;
      const amt = info?.tokenAmount?.amount ?? "0";
      return {
        pubkey: row?.pubkey ?? "",
        owner,
        mint: info?.mint ?? "",
        amount: BigInt(amt),
        lamports: BigInt(row?.account?.lamports ?? 0),
      };
    });
  } catch (e) {
    blockers.push(`Solana token accounts failed: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

async function btcFeeRate(blockers) {
  try {
    const json = await fetchJson(`${BTC_API.replace(/\/$/, "")}/v1/fees/recommended`);
    const v = Number(json?.halfHourFee ?? json?.fastestFee ?? 0);
    if (Number.isFinite(v) && v > 0) return BigInt(Math.floor(v));
  } catch (e) {
    blockers.push(`BTC fee rate lookup failed: ${e instanceof Error ? e.message : e}`);
  }
  return 5n;
}

function printReport(status, profit) {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  DUST VACUUM — max-allowable own-funds (value > sweep fee)    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`VERDICT:          ${status.verdict}`);
  console.log(
    `Engine 137 ETH:   ${status.engine.canFundCanonicalBooty ? "YES" : "NO"} — vacuum cannot mint proof-ledger booty`,
  );
  console.log(
    `Engine gas:       ${status.engine.canFundEngineGas ? "YES" : "NO"}  (claim=${status.engine.coverage.l1Claim} deploy=${status.engine.coverage.l1Deploy} zkWithdraw=${status.engine.coverage.zkWithdraw} solDeploy=${status.engine.coverage.solanaDeploy})`,
  );
  console.log(`Sweep net:        ${status.netProfit.eth} ETH (${status.netProfit.wei} wei)  [can be negative]`);
  console.log(`Mode:             ${status.mode}`);
  console.log(`Ethereum RPC:     ${status.rpc.ethereum}`);
  console.log("");
  console.log("Dust inventory (live, not invented):");
  for (const d of status.dustFound) {
    const flag = d.sweepable ? "" : " [NOT SWEEPABLE]";
    console.log(`  ${d.chain.padEnd(8)} ${d.role.padEnd(24)} ${d.display}${flag}`);
    console.log(`           ${d.address}`);
  }
  console.log("");
  console.log("Sweep plan:");
  if (!status.sweepPlan.length) console.log("  (none)");
  for (const s of status.sweepPlan) {
    console.log(`  • ${s.action} ${s.chain} ${s.from.slice(0, 12)}… → ${s.to.slice(0, 18)} exec=${s.executable}`);
    if (s.blocker) console.log(`      ⊘ ${s.blocker}`);
  }
  console.log("");
  console.log("Estimated gas:");
  console.log(`  L1 transfer  ${formatAtomic(BigInt(profit.estimatedGas.l1TransferWei), "wei")}`);
  console.log(`  L1 claim     ${formatAtomic(BigInt(profit.estimatedGas.l1ClaimWei), "wei")}`);
  console.log(`  L1 deploy    ${formatAtomic(BigInt(profit.estimatedGas.l1DeployWei), "wei")}`);
  console.log(`  zk withdraw  ${formatAtomic(BigInt(profit.estimatedGas.zkWithdrawWei), "wei")}`);
  console.log(`  SOL deploy   ${formatAtomic(BigInt(profit.estimatedGas.solanaDeployLamports), "lamport")}`);
  console.log("");
  if (status.blockers.length) {
    console.log("Blockers:");
    for (const b of status.blockers) console.log(`  ⊘ ${b}`);
    console.log("");
  }
  console.log(`Wrote ${STATUS_PATH}`);
  if (status.verdict === "UNPROFITABLE") {
    console.log("Honest read: leftover dust cannot fund the 137 ETH engine. Vacuum only if dust > sweep cost.");
  } else if (!status.engine.canFundEngineGas) {
    console.log("Honest read: vacuum may reclaim leftover gas, but cannot fund L1 deploy / Solana deploy / 137 ETH.");
  }
}

async function main() {
  const extraBlockers = [];
  if (ETHEREUM_RPC.includes("llamarpc")) {
    extraBlockers.push("Refuse eth.llamarpc.com — use https://ethereum.publicnode.com");
  }

  const pk = resolveBridgeKey();
  const signerAddr = pk?.address ?? null;
  const solWallet = solanaAddress() || SOLANA_DEPLOY_WALLET;

  const hits = extractOwnedAddressesFromArtifacts(loadTreasureArtifacts(), loadSkyntExport());
  const extraOwnedEvm = extraOwnedEvmFromHits(hits);
  const extraOwnedSolana = extraOwnedSolanaFromHits(hits);

  const addresses = documentedAddressesMax({
    solanaDeploy: solWallet || SOLANA_DEPLOY_WALLET,
    operatorSigner: signerAddr ?? OPERATOR_EVM,
    extraOwnedEvm,
    extraOwnedSolana,
    includeUnusedL2s: true,
  });

  const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  try {
    await ethClient.getBlockNumber();
  } catch (e) {
    extraBlockers.push(
      `Ethereum RPC ${ETHEREUM_RPC} unreachable: ${e instanceof Error ? e.message : e}`,
    );
  }

  const [l1Gas, zkGas, btcFee] = await Promise.all([
    evmGasPrice(ETHEREUM_RPC, extraBlockers, "Ethereum L1"),
    evmGasPrice(ZKSYNC_RPC, extraBlockers, "zkSync"),
    btcFeeRate(extraBlockers),
  ]);

  const quotes = {
    l1WeiPerGas: l1Gas > 0n ? l1Gas : 1_000_000_000n,
    zkWeiPerGas: zkGas > 0n ? zkGas : 25_000_000n,
    solanaFeeLamports: ENGINE_GAS.solanaTxFeeLamports,
    btcSatPerVbyte: btcFee,
  };
  if (l1Gas === 0n) extraBlockers.push("L1 gasPrice unavailable — used 1 gwei fallback for estimates only");
  if (zkGas === 0n) extraBlockers.push("zkSync gasPrice unavailable — used fallback for estimates only");

  const lots = [];
  const steps = [];
  let btcUtxoCount = 0;

  for (const addr of addresses) {
    if (addr.chain === "ethereum") {
      const amount = await evmBalance(ETHEREUM_RPC, addr.address, extraBlockers, `${addr.id} L1`);
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: amount,
        unit: "wei",
        sweepable: addr.sweepable,
        skipReason: addr.sweepable ? undefined : addr.reason,
      };
      lots.push(dust);
      steps.push(
        planEvmSweep({
          lot: dust,
          gasPriceWei: quotes.l1WeiPerGas,
          gasLimit: ENGINE_GAS.l1Transfer,
          vault: VAULT,
          signer: signerAddr,
          destMode: DEST_MODE,
          signerOwnsSource: signerOwnsLot(dust, signerAddr),
          extraOwnedEvm,
        }),
      );
    } else if (addr.chain === "zksync") {
      const amount = await evmBalance(ZKSYNC_RPC, addr.address, extraBlockers, `${addr.id} zkSync`);
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: amount,
        unit: "wei",
        sweepable: addr.sweepable,
        skipReason: addr.sweepable ? undefined : addr.reason,
      };
      lots.push(dust);
      steps.push(
        planEvmSweep({
          lot: dust,
          gasPriceWei: quotes.zkWeiPerGas,
          gasLimit: ENGINE_GAS.zkTransfer,
          vault: VAULT,
          signer: signerAddr,
          destMode: DEST_MODE,
          signerOwnsSource: signerOwnsLot(dust, signerAddr),
          extraOwnedEvm,
        }),
      );
    } else if (isEvmDustChain(addr.chain)) {
      const net = MAX_L2_NETWORKS.find((n) => n.id === addr.chain);
      const rpc = net?.rpc ?? ZKSYNC_RPC;
      const amount = await evmBalance(rpc, addr.address, extraBlockers, `${addr.id} ${addr.chain}`);
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: amount,
        unit: "wei",
        sweepable: addr.sweepable,
        skipReason: addr.sweepable ? undefined : addr.reason,
      };
      lots.push(dust);
      steps.push(
        planEvmSweep({
          lot: dust,
          gasPriceWei: quotes.zkWeiPerGas,
          gasLimit: ENGINE_GAS.zkTransfer,
          vault: VAULT,
          signer: signerAddr,
          destMode: DEST_MODE,
          signerOwnsSource: signerOwnsLot(dust, signerAddr),
          extraOwnedEvm,
        }),
      );
    } else if (isEvmDustChain(addr.chain)) {
      const net = MAX_L2_NETWORKS.find((n) => n.id === addr.chain);
      const rpc = net?.rpc ?? ZKSYNC_RPC;
      const amount = await evmBalance(rpc, addr.address, extraBlockers, `${addr.id} ${addr.chain}`);
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: amount,
        unit: "wei",
        sweepable: addr.sweepable,
        skipReason: addr.sweepable ? undefined : addr.reason,
      };
      lots.push(dust);
      steps.push(
        planEvmSweep({
          lot: dust,
          gasPriceWei: quotes.zkWeiPerGas,
          gasLimit: ENGINE_GAS.zkTransfer,
          vault: VAULT,
          signer: signerAddr,
          destMode: DEST_MODE,
          signerOwnsSource: signerOwnsLot(dust, signerAddr),
        }),
      );
    } else if (addr.chain === "solana") {
      const amount = await solBalance(addr.address, extraBlockers);
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: amount,
        unit: "lamport",
        sweepable: addr.sweepable,
      };
      lots.push(dust);
      steps.push(planSolSweep({ lot: dust, feeLamports: quotes.solanaFeeLamports }));
    } else if (addr.chain === "bitcoin") {
      const inv = await btcInventory(addr.address, extraBlockers);
      if (!isBitcoinGenesisAddress(addr.address)) btcUtxoCount += inv.utxoCount;
      const dust = {
        id: addr.id,
        chain: addr.chain,
        address: addr.address,
        role: addr.role,
        amountAtomic: inv.sats,
        unit: "sat",
        sweepable: addr.sweepable,
        skipReason: addr.sweepable ? undefined : addr.reason,
      };
      lots.push(dust);
      steps.push(
        planBtcSweep({
          lot: dust,
          utxoCount: inv.utxoCount,
          satPerVbyte: quotes.btcSatPerVbyte,
          hasBtcKey: Boolean(process.env.BTC_SWEEP_WIF),
        }),
      );
    }
  }

  const evmOwners = [];
  const seenOwner = new Set();
  for (const addr of addresses) {
    if (!isEvmDustChain(addr.chain)) continue;
    const n = addr.address.toLowerCase();
    if (seenOwner.has(n)) continue;
    seenOwner.add(n);
    evmOwners.push(addr);
  }

  const l1Lots = lots.filter((l) => l.chain === "ethereum");
  const refundFindings = scanFailedTxRefunds(
    l1Lots.map((l) => ({ address: l.address, role: l.role, wei: l.amountAtomic })),
    quotes.l1WeiPerGas,
    extraOwnedEvm,
  );
  const l2Findings = scanUnusedL2Bridges(
    lots
      .filter((l) => l.chain !== "ethereum" && l.chain !== "bitcoin" && l.chain !== "solana")
      .map((l) => ({ address: l.address, role: l.role, chain: l.chain, wei: l.amountAtomic })),
    quotes.zkWeiPerGas,
    extraOwnedEvm,
  );
  const unclaimedWei = parseBalanceHex(process.env.ZKSYNC_UNCLAIMED_WEI ?? "0x0");
  const unclaimedFindings = scanUnclaimedWithdrawals(
    unclaimedWei > 0n
      ? evmOwners.map((o) => ({
          address: o.address,
          role: o.role,
          unclaimedWei,
          proofReady: Boolean(process.env.ZKSYNC_WITHDRAWAL_TX_HASH),
        }))
      : [],
    quotes.l1WeiPerGas,
    extraOwnedEvm,
  );

  const erc20Rows = [];
  const allowRows = [];
  for (const owner of evmOwners) {
    for (const token of WATCHED_TOKENS) {
      const bal = await erc20Balance(
        ETHEREUM_RPC,
        token.address,
        owner.address,
        extraBlockers,
        `${owner.id} ${token.symbol}`,
      );
      erc20Rows.push({ owner: owner.address, role: owner.role, token, amountAtomic: bal });
      for (const spender of WATCHED_SPENDERS) {
        const allowance = await erc20Allowance(
          ETHEREUM_RPC,
          token.address,
          owner.address,
          spender.address,
          extraBlockers,
          `${owner.id} ${token.symbol} ${spender.id}`,
        );
        if (allowance > 0n) {
          allowRows.push({ owner: owner.address, role: owner.role, token, spender, allowance });
        }
      }
    }
  }
  const erc20Findings = scanLeftoverErc20(erc20Rows, quotes.l1WeiPerGas, extraOwnedEvm);
  const allowFindings = scanStuckAllowances(allowRows, quotes.l1WeiPerGas, extraOwnedEvm);

  const atas = [];
  for (const sol of addresses.filter((a) => a.chain === "solana")) {
    atas.push(...(await solTokenAccounts(sol.address, extraBlockers)));
  }
  const rentFindings = scanSolanaRentLeftovers(atas, quotes.solanaFeeLamports, extraOwnedSolana);

  const maxFindings = applyMaxExecutionGates(
    [...refundFindings, ...l2Findings, ...unclaimedFindings, ...erc20Findings, ...allowFindings, ...rentFindings],
    { live: SWEEP, signerAddress: signerAddr, extraOwnedEvm },
  );
  /* Native ETH/L2 lots already have sweep steps — only append additive leftover surfaces. */
  const additive = maxFindings.filter((f) =>
    f.scanner === "unclaimed_withdrawal" ||
    f.scanner === "leftover_erc20" ||
    f.scanner === "stuck_allowance" ||
    f.scanner === "solana_rent_exempt",
  );
  steps.push(...findingsToSweepSteps(additive));
  extraBlockers.push(
    `Max scanners: refunds=${refundFindings.length} l2=${l2Findings.length} unclaimed=${unclaimedFindings.length} erc20=${erc20Findings.length} allowances=${allowFindings.length} solRent=${rentFindings.length}`,
  );

  if (!pk) {
    extraBlockers.push(
      "No signing key — set TREASURE_BRIDGE_PRIVATE_KEY or load Solana id.json (status/dry-run still exits 0)",
    );
  }

  const profit = evaluateProfitTest({ lots, steps, quotes, btcUtxoCount });
  const status = buildDustVacuumStatus({
    mode: WATCH ? "watch" : SWEEP ? "sweep" : "dry-run",
    watchIntervalMs: watchIntervalMs(process.env),
    rpc: { ethereum: ETHEREUM_RPC, zksync: ZKSYNC_RPC, solana: SOLANA_RPC, bitcoin: BTC_API },
    addresses,
    lots,
    steps,
    profit,
    signer: {
      address: signerAddr,
      source: pk?.source ?? null,
      matchesSkyntPortfolio: Boolean(pk?.matchesSkyntPortfolio),
      matchesTreasureVault: signerAddr
        ? signerAddr.toLowerCase() === VAULT.toLowerCase()
        : false,
    },
    extraBlockers,
  });

  const broadcasts = [];

  if (SWEEP) {
    const executable = steps.filter(
      (s) =>
        s.executable &&
        isEvmDustChain(s.chain) &&
        (s.action === "consolidate_to_vault" || s.action === "fund_signer_gas"),
    );
    if (!pk) {
      writeStatus(status);
      printReport(status, profit);
      console.error("SWEEP requested but no key — refuse.");
      finish(1);
      return;
    }
    if (!executable.length) {
      writeStatus(status);
      printReport(status, profit);
      console.error("SWEEP requested but no executable leftover (dust < fee, no key match, or retain-only).");
      finish(1);
      return;
    }

    const account = privateKeyToAccount(pk.privateKey);
    for (const step of executable) {
      if (!isAllowedEvmSweepSource(step.from, account.address, extraOwnedEvm)) {
        extraBlockers.push(`Refuse live sweep of ${step.from}`);
        continue;
      }
      if (!isAllowedEvmSweepDest(step.to, account.address)) {
        extraBlockers.push(`Refuse live sweep dest ${step.to}`);
        continue;
      }
      if (account.address.toLowerCase() !== step.from.toLowerCase()) {
        extraBlockers.push(`Signer ${account.address} does not own ${step.from}`);
        continue;
      }
      const sendWei = step.amountAtomic > step.feeAtomic ? step.amountAtomic - step.feeAtomic : 0n;
      if (sendWei <= 0n) {
        extraBlockers.push(`Skip ${step.id}: nothing left after fee`);
        continue;
      }
      const chain =
        step.chain === "zksync"
          ? { ...mainnet, id: 324, name: "zkSync Era", rpcUrls: { default: { http: [ZKSYNC_RPC] } } }
          : mainnet;
      const rpc = step.chain === "zksync" ? ZKSYNC_RPC : ETHEREUM_RPC;
      const wallet = createWalletClient({ account, chain, transport: http(rpc) });
      const hash = await wallet.sendTransaction({ to: step.to, value: sendWei });
      broadcasts.push({ id: step.id, txHash: hash, chain: step.chain });
      console.log(`Broadcast ${step.id}: ${hash}`);
    }

    status.broadcasts = broadcasts;
    status.blockers = [...new Set([...status.blockers, ...extraBlockers])];
    writeStatus(status);
    printReport(status, profit);
    if (!broadcasts.length) {
      console.error("SWEEP requested but no transaction was broadcast.");
      finish(1);
      return;
    }
    finish(0);
    return;
  }

  writeStatus(status);
  printReport(status, profit);
  console.log("");
  console.log("DRY-RUN / STATUS — no broadcast. Re-run with --sweep, SWEEP=1, or VACUUM_LIVE=1 only when a step is executable.");
  console.log(`Max limit: value > sweep fee · watch ${watchIntervalMs(process.env)}ms · 429 backoff · ${addresses.length} address slots`);
  console.log(`Signer: ${signerAddr ?? "(none)"}  dest=${DEST_MODE}  vault=${VAULT}`);
  if (signerAddr) console.log(`Signer L1 note: ${formatEther(lots.find((l) => l.id === "operator-signer-l1")?.amountAtomic ?? 0n)} ETH leftover`);
  finish(0);
}

function finish(code) {
  if (WATCH) return;
  process.exit(code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce() {
  lastHttpStatus = 200;
  await main();
}

async function run() {
  if (!WATCH) {
    await runOnce();
    return;
  }
  let interval = watchIntervalMs(process.env);
  console.log(`WATCH mode — interval ${interval}ms, dry-run unless VACUUM_LIVE=1 or SWEEP=1, backoff on 429`);
  for (;;) {
    const started = Date.now();
    try {
      await runOnce();
    } catch (err) {
      console.error(err);
      if (SWEEP) throw err;
    }
    interval = nextWatchBackoffMs(interval, lastHttpStatus, watchIntervalMs(process.env));
    if (lastHttpStatus === 429) {
      console.log(`HTTP 429 — backing off watch interval to ${interval}ms`);
    } else {
      interval = watchIntervalMs(process.env);
    }
    const elapsed = Date.now() - started;
    const wait = Math.max(0, interval - elapsed);
    await sleep(wait);
  }
}

run().catch((err) => {
  const fallback = {
    kind: "dust-vacuum-status",
    version: "1.2.0",
    updatedAt: new Date().toISOString(),
    mode: WATCH ? "watch" : SWEEP ? "sweep" : "dry-run",
    maxLimit: maxLimitSettings(watchIntervalMs(process.env) || VACUUM_INTERVAL_MS_DEFAULT),
    rpc: {
      ethereum: ETHEREUM_RPC,
      zksync: ZKSYNC_RPC,
      solana: SOLANA_RPC,
      bitcoin: BTC_API,
    },
    addressesScanned: [],
    dustFound: [],
    sweepPlan: [],
    estimatedGas: {
      l1TransferWei: "0",
      l1ClaimWei: "0",
      l1DeployWei: "0",
      zkWithdrawWei: "0",
      solanaDeployLamports: ENGINE_GAS.solanaDeployLamports.toString(),
      solanaDeployWeiEquiv: "0",
      btcSweepFeeSats: "0",
    },
    netProfit: { wei: "0", eth: 0, lamports: "0", sats: "0", canBeNegative: true },
    verdict: "UNPROFITABLE",
    engine: {
      canonicalBootyEth: 137.190325,
      canFundCanonicalBooty: false,
      canFundEngineGas: false,
      coverage: { l1Claim: false, l1Deploy: false, zkWithdraw: false, solanaDeploy: false },
      note: "Status writer crashed — fail closed, no invented balances.",
    },
    signer: {
      present: false,
      address: null,
      source: null,
      matchesSkyntPortfolio: false,
      matchesTreasureVault: false,
    },
    blockers: [err instanceof Error ? err.message : String(err)],
  };
  try {
    writeStatus(fallback);
  } catch {
    /* ignore */
  }
  console.error(err);
  if (SWEEP) process.exit(1);
  process.exit(0);
});
