#!/usr/bin/env node
/**
 * 24/7 MAINNET dust vacuum watch daemon.
 *
 * Default: dry-run scanner. Always writes public/treasure/dust-vacuum-status.json.
 * Scanner / dry-run exits 0 even when the verdict is UNPROFITABLE.
 *
 *   VACUUM_INTERVAL_MS=60000    loop delay (default 60s)
 *   VACUUM_LIVE=1               required to broadcast
 *   VACUUM_REVOKE=1             required to revoke stuck allowances (costs gas)
 *   --once                      single cycle (tests / cron)
 *
 * Only documented wallets. Never commits keys. Never sweeps strangers.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { resolveBridgeKey, DEFAULT_SOLANA_KEYPAIR } from "../src/lib/bridgeKeyResolver.ts";
import {
  ETHEREUM_RPC_DEFAULT,
  SOLANA_DEPLOY_WALLET,
  SOLANA_RPC_DEFAULT,
  WATCHED_SPENDERS,
  WATCHED_TOKENS,
  ZKSYNC_L2_ETH_TOKEN,
  ZKSYNC_RPC_DEFAULT,
  applyExecutionGates,
  buildVacuumWatchStatus,
  documentedWallets,
  encodeErc20Approve,
  encodeErc20Transfer,
  encodeL2EthWithdraw,
  isLiveBroadcastEnabled,
  isOwnedEvmAddress,
  isRevokeEnabled,
  parseAtomic,
  roleForEvm,
  scanAllowances,
  scanFailedTxRefunds,
  scanForgottenSends,
  scanL2Bridges,
  scanSolanaRent,
  watchIntervalMs,
} from "../src/lib/vacuumWatch.ts";
import { TREASURE_VAULT as VAULT } from "../src/lib/pirateTreasureFunding.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "public/treasure/dust-vacuum-status.json");

const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? ETHEREUM_RPC_DEFAULT;
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? ZKSYNC_RPC_DEFAULT;
const SOLANA_RPC = process.env.SOLANA_RPC ?? SOLANA_RPC_DEFAULT;
const FETCH_MS = 12_000;

const args = new Set(process.argv.slice(2));
const ONCE = args.has("--once") || process.env.VACUUM_ONCE === "1";
const LIVE = isLiveBroadcastEnabled(process.env);
const REVOKE = isRevokeEnabled(process.env);
const INTERVAL_MS = watchIntervalMs(process.env);

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [ZKSYNC_RPC] } },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function getBalance(client, addr) {
  try {
    return await client.getBalance({ address: addr });
  } catch {
    return 0n;
  }
}

async function getGasPrice(client, fallback) {
  try {
    return await client.getGasPrice();
  } catch {
    return fallback;
  }
}

async function failedTxCount(address) {
  const url = `https://eth.blockscout.com/api?module=account&action=txlist&address=${address}&page=1&offset=25&sort=desc`;
  try {
    const json = await fetchJson(url);
    const rows = Array.isArray(json?.result) ? json.result : [];
    const failed = rows.filter((tx) => tx?.isError === "1" || tx?.txreceipt_status === "0");
    return { count: failed.length, lastHash: failed[0]?.hash ?? null };
  } catch {
    return { count: 0, lastHash: null, unavailable: true };
  }
}

async function unclaimedZkWithdrawals(address) {
  const url = `https://block-explorer-api.mainnet.zksync.io/address/${address}/withdrawals?limit=10`;
  try {
    const json = await fetchJson(url);
    const items = json?.items ?? json?.result ?? [];
    if (!Array.isArray(items)) return { wei: 0n, proofReady: false };
    let wei = 0n;
    let proofReady = false;
    for (const row of items) {
      const status = String(row?.status ?? row?.type ?? "").toLowerCase();
      if (/claimed|finalized|done|complete/.test(status)) continue;
      wei += parseAtomic(row?.amount ?? row?.value ?? "0");
      if (/ready|available|proven|executable/.test(status) && !/pending_proof|unknown/.test(status)) {
        proofReady = true;
      }
    }
    return { wei, proofReady: false };
  } catch {
    return { wei: 0n, proofReady: false, unavailable: true };
  }
}

async function erc20Read(client, token, functionName, args) {
  try {
    return await client.readContract({ address: token, abi: [
      {
        type: "function",
        name: "allowance",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ], functionName, args });
  } catch {
    return 0n;
  }
}

async function solanaAtas(owner) {
  try {
    const result = await rpcCall(SOLANA_RPC, "getTokenAccountsByOwner", [
      owner,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" },
    ]);
    const values = result?.value ?? [];
    return values.map((v) => {
      const info = v?.account?.data?.parsed?.info ?? {};
      const tok = info?.tokenAmount ?? {};
      return {
        pubkey: v?.pubkey ?? "",
        owner,
        mint: info?.mint ?? "",
        amount: parseAtomic(tok?.amount ?? "0"),
        lamports: parseAtomic(v?.account?.lamports ?? 0),
      };
    }).filter((a) => a.pubkey);
  } catch {
    return [];
  }
}

async function loadSolanaSigner() {
  const { readFileSync } = await import("node:fs");
  const path = process.env.SOLANA_KEYPAIR_PATH ?? DEFAULT_SOLANA_KEYPAIR;
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const kp = Keypair.fromSecretKey(Uint8Array.from(raw));
    if (kp.publicKey.toBase58() !== SOLANA_DEPLOY_WALLET) return { keypair: kp, owned: false };
    return { keypair: kp, owned: true };
  } catch {
    return null;
  }
}

async function runCycle(cycle) {
  const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  const zkClient = createPublicClient({ chain: zksync, transport: http(ZKSYNC_RPC) });
  const resolved = resolveBridgeKey();
  const signerAddress = resolved?.address ?? null;
  const wallets = documentedWallets(signerAddress);

  const evmOwners = [...new Set(
    wallets.filter((w) => w.chain === "ethereum" || w.chain === "zksync").map((w) => w.address),
  )];

  const extraBlockers = [];
  const [l1Gas, zkGas] = await Promise.all([
    getGasPrice(ethClient, 2_000_000_000n),
    getGasPrice(zkClient, 25_000_000n),
  ]);
  const quotes = {
    l1WeiPerGas: l1Gas,
    zkWeiPerGas: zkGas,
    solanaFeeLamports: 5_000n,
  };

  const refundsIn = [];
  const l2In = [];
  const sendIn = [];
  const allowIn = [];

  for (const addr of evmOwners) {
    if (!isOwnedEvmAddress(addr, signerAddress)) {
      extraBlockers.push(`refused_stranger:${addr}`);
      continue;
    }
    const role = roleForEvm(addr, signerAddress);
    if (!role) continue;

    const [l1Wei, l2Wei, failed, unclaimed] = await Promise.all([
      getBalance(ethClient, addr),
      getBalance(zkClient, addr),
      failedTxCount(addr),
      unclaimedZkWithdrawals(addr),
    ]);

    refundsIn.push({
      address: addr,
      role,
      wei: l1Wei,
      failedTxCount: failed.count,
      lastFailedTxHash: failed.lastHash,
    });
    l2In.push({
      address: addr,
      role,
      l2Wei,
      unclaimedWithdrawalWei: unclaimed.wei,
      unclaimedProofReady: unclaimed.proofReady,
    });
    for (const token of WATCHED_TOKENS) {
      const bal = await erc20Read(ethClient, token.address, "balanceOf", [addr]);
      if (bal > 0n) sendIn.push({ address: addr, role, token, amountAtomic: bal });
      for (const spender of WATCHED_SPENDERS) {
        const allowance = await erc20Read(ethClient, token.address, "allowance", [addr, spender.address]);
        if (allowance > 0n) {
          allowIn.push({ owner: addr, role, token, spender, allowance });
        }
      }
    }
  }

  const atas = await solanaAtas(SOLANA_DEPLOY_WALLET);
  const solSigner = await loadSolanaSigner();

  let findings = [
    ...scanFailedTxRefunds(refundsIn, quotes),
    ...scanL2Bridges(l2In, quotes),
    ...scanAllowances(allowIn, quotes),
    ...scanForgottenSends(sendIn, quotes),
    ...scanSolanaRent(atas, quotes),
  ];

  findings = applyExecutionGates(findings, {
    live: LIVE,
    revoke: REVOKE,
    signerAddress,
    solanaSignerPresent: !!solSigner?.owned,
  });

  const broadcasts = [];
  if (LIVE && resolved?.privateKey) {
    const account = privateKeyToAccount(resolved.privateKey);
    const ethWallet = createWalletClient({
      account,
      chain: mainnet,
      transport: http(ETHEREUM_RPC),
    });
    const zkWallet = createWalletClient({
      account,
      chain: zksync,
      transport: http(ZKSYNC_RPC),
    });

    for (const f of findings) {
      if (!f.executable) continue;
      try {
        if (f.action === "consolidate_to_vault" && f.unit === "wei" && !f.id.startsWith("send-") && f.chain === "ethereum") {
          const send = f.sweepAtomic ?? f.netAtomic;
          const hash = await ethWallet.sendTransaction({
            to: VAULT,
            value: send > 0n ? send : 0n,
          });
          broadcasts.push({ id: f.id, txHash: hash, chain: "ethereum" });
        } else if (f.action === "consolidate_to_vault" && f.id.startsWith("send-")) {
          const token = WATCHED_TOKENS.find((t) => f.id.includes(`-${t.symbol}-`) || f.id.startsWith(`send-${t.symbol}`));
          if (!token) continue;
          const data = encodeErc20Transfer(VAULT, f.sweepAtomic ?? f.amountAtomic);
          const hash = await ethWallet.sendTransaction({ to: token.address, data });
          broadcasts.push({ id: f.id, txHash: hash, chain: "ethereum" });
        } else if (f.action === "revoke_allowance" && REVOKE) {
          const token = WATCHED_TOKENS.find((t) => f.id.includes(`-${t.symbol}-`));
          if (!token) continue;
          const data = encodeErc20Approve(f.to, 0n);
          const hash = await ethWallet.sendTransaction({ to: token.address, data });
          broadcasts.push({ id: f.id, txHash: hash, chain: "ethereum" });
        } else if (f.action === "withdraw_l2") {
          const data = encodeL2EthWithdraw(VAULT);
          const hash = await zkWallet.sendTransaction({
            to: ZKSYNC_L2_ETH_TOKEN,
            data,
            value: f.sweepAtomic ?? f.amountAtomic,
          });
          broadcasts.push({ id: f.id, txHash: hash, chain: "zksync" });
        } else if (f.action === "close_ata" && solSigner?.owned) {
          const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
          const conn = new Connection(SOLANA_RPC, "confirmed");
          const ix = {
            keys: [
              { pubkey: new PublicKey(f.from), isSigner: false, isWritable: true },
              { pubkey: solSigner.keypair.publicKey, isSigner: false, isWritable: true },
              { pubkey: solSigner.keypair.publicKey, isSigner: true, isWritable: false },
            ],
            programId: TOKEN_PROGRAM,
            data: Buffer.from([9]),
          };
          const tx = new Transaction().add(ix);
          const sig = await sendAndConfirmTransaction(conn, tx, [solSigner.keypair]);
          broadcasts.push({ id: f.id, txHash: sig, chain: "solana" });
        }
      } catch (err) {
        extraBlockers.push(`${f.id}: broadcast_failed:${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else if (LIVE && !resolved?.privateKey) {
    extraBlockers.push("VACUUM_LIVE set but TREASURE_BRIDGE_PRIVATE_KEY / Solana keypair missing — fail-closed");
  }

  const status = buildVacuumWatchStatus({
    mode: LIVE ? "live" : "dry-run",
    intervalMs: INTERVAL_MS,
    cycle,
    rpc: { ethereum: ETHEREUM_RPC, zksync: ZKSYNC_RPC, solana: SOLANA_RPC },
    wallets,
    findings,
    signer: {
      present: !!resolved,
      address: resolved?.address ?? null,
      source: resolved?.source ?? null,
    },
    revokeEnabled: REVOKE,
    broadcasts,
    extraBlockers,
  });

  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  return status;
}

function printStatus(status) {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  24/7 MAINNET VACUUM WATCH — documented wallets only         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode:       ${status.mode}   cycle ${status.cycle}   interval ${status.intervalMs}ms`);
  console.log(`Verdict:    ${status.profit.verdict}`);
  console.log(`Net ETH:    ${status.profit.netEth}`);
  console.log(`Net SOL:    ${Number(status.profit.netLamports) / 1e9}`);
  console.log(`Signer:     ${status.signer.address ?? "(none)"}`);
  console.log(`RPC:        ${status.rpc.ethereum}`);
  console.log("");
  for (const f of status.findings) {
    const mark = f.profitable ? "+" : f.blocker ? "⊘" : "·";
    console.log(`  ${mark} [${f.scanner}] ${f.detail}`);
    if (f.blocker) console.log(`      blocker: ${f.blocker}`);
  }
  console.log("");
  console.log(`Wrote ${STATUS_PATH}`);
  console.log(status.profit.note);
}

async function main() {
  let cycle = 0;
  let liveBroadcastFailed = false;

  do {
    cycle += 1;
    try {
      const status = await runCycle(cycle);
      printStatus(status);
      if (LIVE && status.blockers.some((b) => b.includes("broadcast_failed"))) {
        liveBroadcastFailed = true;
        if (ONCE) process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`cycle ${cycle} failed-closed: ${message}`);
      const fallback = buildVacuumWatchStatus({
        mode: LIVE ? "live" : "dry-run",
        intervalMs: INTERVAL_MS,
        cycle,
        rpc: { ethereum: ETHEREUM_RPC, zksync: ZKSYNC_RPC, solana: SOLANA_RPC },
        findings: [],
        extraBlockers: [`cycle_error:${message}`],
      });
      writeFileSync(STATUS_PATH, `${JSON.stringify(fallback, null, 2)}\n`);
      if (LIVE && ONCE) process.exit(1);
    }
    if (!ONCE) await sleep(INTERVAL_MS);
  } while (!ONCE);

  process.exit(liveBroadcastFailed ? 1 : 0);
}

main();
