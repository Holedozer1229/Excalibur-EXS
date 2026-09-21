#!/usr/bin/env node
/**
 * zkSync L2 withdraw + L1 claimWithdrawal (ethrex CommonBridge) / finalizeEthWithdrawal.
 *
 * Env:
 *   TREASURE_BRIDGE_PRIVATE_KEY — vault EOA (never commit)
 *   ETHEREUM_RPC — default https://ethereum.publicnode.com
 *   ZKSYNC_RPC — default https://mainnet.era.zksync.io
 *   ETHREX_COMMON_BRIDGE_L1 — L1 CommonBridge address (optional)
 *   ETHREX_CLAIM_PROOF_PATH — JSON { claimedAmountWei, withdrawalBatchNumber, withdrawalMessageId, withdrawalProof }
 *   ZKSYNC_WITHDRAWAL_TX_HASH — L2 withdraw tx to fetch merkle proof
 *   BROADCAST=1 — actually send txs (default: plan + simulate only)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";
import {
  buildWithdrawalPlan,
  encodeEthrexClaimWithdrawal,
  encodeZkSyncFinalizeEthWithdrawal,
  L2_WITHDRAW_ABI,
  ZKSYNC_L1_DIAMOND,
  ZKSYNC_L2_ETH_TOKEN,
} from "../src/lib/ethrexClaimWithdrawal.ts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { ethereumRpc, zksyncRpc } from "../src/lib/mainnetRpc.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/claim-withdrawal-status.json");
const ETHEREUM_RPC = ethereumRpc();
const ZKSYNC_RPC = zksyncRpc();
const BROADCAST = process.env.BROADCAST === "1" || process.env.BROADCAST === "true";
const VAULT = TREASURE_VAULT;

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [ZKSYNC_RPC] } },
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function getBalance(client, addr) {
  try {
    return await client.getBalance({ address: addr });
  } catch {
    return 0n;
  }
}

async function fetchZkSyncLogProof(txHash) {
  try {
    const res = await fetch(ZKSYNC_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "zks_getL2ToL1LogProof",
        params: [txHash],
      }),
    });
    const json = await res.json();
    return json?.result ?? null;
  } catch {
    return null;
  }
}

function loadEthrexProof() {
  const p = process.env.ETHREX_CLAIM_PROOF_PATH;
  if (!p || !existsSync(p)) return null;
  return loadJson(p);
}

async function main() {
  const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  const zkClient = createPublicClient({ chain: zksync, transport: http(ZKSYNC_RPC) });

  const [ethWei, zkWei] = await Promise.all([
    getBalance(ethClient, VAULT),
    getBalance(zkClient, VAULT),
  ]);

  const ethrexProof = loadEthrexProof();
  let zksyncProof = null;
  const withdrawTx = process.env.ZKSYNC_WITHDRAWAL_TX_HASH;
  if (withdrawTx) {
    const proof = await fetchZkSyncLogProof(withdrawTx);
    if (proof?.proof?.length) {
      zksyncProof = {
        l2BatchNumber: String(proof.batchNumber ?? proof.id ?? "0"),
        l2MessageIndex: String(proof.index ?? proof.id ?? "0"),
        l2TxNumberInBatch: Number(proof.l2TxNumberInBatch ?? 0),
        message: proof.message ?? "0x",
        merkleProof: proof.proof,
      };
    }
  }

  const plan = buildWithdrawalPlan(
    { ethereumWei: ethWei, zksyncWei: zkWei },
    {
      l1Receiver: VAULT,
      ethrexCommonBridgeL1: process.env.ETHREX_COMMON_BRIDGE_L1 ?? null,
      ethrexProof,
      zksyncProof,
    },
  );

  const artifact = {
    ...plan,
    updatedAt: new Date().toISOString(),
    rpc: { ethereum: ETHEREUM_RPC, zksync: ZKSYNC_RPC },
    broadcast: false,
    l2WithdrawTxHash: null,
    l1ClaimTxHash: null,
    note: "claimWithdrawal / finalizeEthWithdrawal msg.value is 0 — release from bridge, do not attach 137 ETH",
  };

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  L2 WITHDRAW + L1 claimWithdrawal (ethrex / zkSync)            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Vault:            ${VAULT}`);
  console.log(`L1:               ${formatEther(ethWei)} ETH`);
  console.log(`zkSync Era:       ${formatEther(zkWei)} ETH`);
  console.log(`Withdrawable L2:  ${plan.withdrawableL2Eth.toFixed(6)} ETH`);
  console.log(`L2 withdraw to:   ${plan.l2WithdrawTo}`);
  console.log(`zkSync L1 diamond ${plan.zksyncL1Diamond}`);
  console.log(`ethrex bridge:    ${plan.ethrexCommonBridgeL1 ?? "(unset)"}`);
  console.log("");

  if (plan.blockers.length) {
    console.log("Blockers:");
    plan.blockers.forEach((b) => console.log(`  ⊘ ${b}`));
    console.log("");
  }

  const resolved = resolveBridgeKey();
  if (!resolved) {
    writeFileSync(OUT, JSON.stringify(artifact, null, 2));
    console.log("⊘ No signing key — plan written, no broadcast.");
    console.log(`  Wrote ${OUT}`);
    process.exit(0);
  }

  const account = privateKeyToAccount(resolved.privateKey);
  console.log(`Signer:           ${account.address} (${resolved.source})`);

  if (!BROADCAST) {
    writeFileSync(OUT, JSON.stringify({ ...artifact, signer: account.address }, null, 2));
    console.log("DRY RUN — set BROADCAST=1 to send L2 withdraw / L1 claim.");
    console.log(`  Wrote ${OUT}`);
    process.exit(0);
  }

  const withdrawable = BigInt(plan.withdrawableL2Wei);
  if (withdrawable > 0n && account.address.toLowerCase() === VAULT.toLowerCase()) {
    const zkWallet = createWalletClient({ account, chain: zksync, transport: http(ZKSYNC_RPC) });
    console.log("==> Broadcasting L2EthToken.withdraw → L1 vault…");
    try {
      const hash = await zkWallet.writeContract({
        address: ZKSYNC_L2_ETH_TOKEN,
        abi: L2_WITHDRAW_ABI,
        functionName: "withdraw",
        args: [VAULT],
        value: withdrawable,
      });
      artifact.l2WithdrawTxHash = hash;
      artifact.broadcast = true;
      console.log(`    ✓ ${hash}`);
      console.log("    Wait for batch verify, then re-run with ZKSYNC_WITHDRAWAL_TX_HASH");
    } catch (err) {
      console.log("    ⊘ L2 withdraw:", (err?.shortMessage ?? err?.message ?? String(err)).slice(0, 200));
    }
  } else if (withdrawable > 0n) {
    console.log(`⊘ Signer is not vault ${VAULT} — cannot withdraw vault L2 ETH.`);
  }

  const l1Wallet = createWalletClient({ account, chain: mainnet, transport: http(ETHEREUM_RPC) });

  if (ethrexProof && plan.ethrexCommonBridgeL1) {
    const calldata = encodeEthrexClaimWithdrawal(ethrexProof);
    console.log("==> Simulating ethrex claimWithdrawal (value 0)…");
    try {
      await ethClient.call({
        account: account.address,
        to: plan.ethrexCommonBridgeL1,
        data: calldata,
        value: 0n,
      });
      console.log("    ✓ Simulation passed");
      const hash = await l1Wallet.sendTransaction({
        to: plan.ethrexCommonBridgeL1,
        data: calldata,
        value: 0n,
      });
      artifact.l1ClaimTxHash = hash;
      artifact.broadcast = true;
      console.log(`    ✓ ${hash}`);
    } catch (err) {
      console.log("    ⊘ claimWithdrawal:", (err?.shortMessage ?? err?.message ?? String(err)).slice(0, 200));
    }
  } else if (zksyncProof) {
    const calldata = encodeZkSyncFinalizeEthWithdrawal(zksyncProof);
    console.log("==> Simulating zkSync finalizeEthWithdrawal (value 0)…");
    try {
      await ethClient.call({
        account: account.address,
        to: ZKSYNC_L1_DIAMOND,
        data: calldata,
        value: 0n,
      });
      const hash = await l1Wallet.sendTransaction({
        to: ZKSYNC_L1_DIAMOND,
        data: calldata,
        value: 0n,
      });
      artifact.l1ClaimTxHash = hash;
      artifact.broadcast = true;
      console.log(`    ✓ ${hash}`);
    } catch (err) {
      console.log("    ⊘ finalizeEthWithdrawal:", (err?.shortMessage ?? err?.message ?? String(err)).slice(0, 200));
    }
  }

  writeFileSync(OUT, JSON.stringify(artifact, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error("claim-withdrawal failed closed:", err?.shortMessage ?? err?.message ?? err);
  process.exit(1);
});
