#!/usr/bin/env node
/**
 * Fetch zkSync finalizeEthWithdrawal params:
 *   - Prover API /proof_generation_data[/{batch}] (30-day witness inputs)
 *   - zks_getL2ToL1LogProof (merkle proof for the L2 withdraw tx)
 *
 * Usage:
 *   npm run withdraw:finalize
 *   L2_WITHDRAW_TX=0x… npm run withdraw:finalize
 *
 * Dry-run by default. FINALIZE_LIVE=1 broadcasts to L1 diamond if signer + gas exist.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import {
  assembleFinalizeParams,
  encodeFinalizeEthWithdrawal,
  finalizeReady,
  parseProverFilename,
  proverBatchInRetentionWindow,
  ZKSYNC_L1_DIAMOND,
  ZKSYNC_PROVER_API,
  ZKSYNC_ERA_RPC,
} from "../src/lib/zksyncFinalizeWithdrawal.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/finalize-eth-withdrawal.json");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? ZKSYNC_ERA_RPC;
const LIVE = process.env.FINALIZE_LIVE === "1";
const L2_TX = process.env.L2_WITHDRAW_TX ?? "";

async function headProver(path) {
  const res = await fetch(`${ZKSYNC_PROVER_API}${path}`, { method: "HEAD" });
  const parsed = parseProverFilename(res.headers.get("content-disposition"));
  return { ok: res.ok, status: res.status, ...parsed };
}

async function zksRpc(method, params) {
  const res = await fetch(ZKSYNC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return (await res.json()).result ?? null;
}

async function main() {
  const latest = await headProver("/proof_generation_data");
  let requestedBatch = latest.batch ?? null;
  let specific = { ok: false, filename: undefined, batch: undefined, status: 0 };

  let logProof = null;
  let l2TxNumberInBatch = 0;
  let message = "0x";
  let receiptBatch = null;

  if (L2_TX) {
    const receipt = await zksRpc("eth_getTransactionReceipt", [L2_TX]);
    l2TxNumberInBatch = Number(receipt?.l1BatchTxIndex ?? receipt?.transactionIndex ?? 0);
    receiptBatch = receipt?.l1BatchNumber ? Number(receipt.l1BatchNumber) : null;
    requestedBatch = receiptBatch ?? requestedBatch;
    const proof = await zksRpc("zks_getL2ToL1LogProof", [L2_TX]);
    if (proof?.proof) {
      logProof = {
        proof: proof.proof,
        id: proof.id ?? 0,
        root: proof.root,
        batchNumber: proof.batchNumber ?? receiptBatch,
      };
    }
    const l2ToL1 = receipt?.l2ToL1Logs?.[0] ?? receipt?.logs?.[0];
    if (l2ToL1?.data && l2ToL1.data !== "0x") message = l2ToL1.data;
  }

  if (requestedBatch != null) {
    specific = await headProver(`/proof_generation_data/${requestedBatch}`);
  }

  const prover = {
    latestBatch: latest.batch ?? null,
    requestedBatch,
    available: Boolean(specific.ok || (latest.ok && requestedBatch === latest.batch)),
    filename: specific.filename ?? latest.filename,
    retentionDays: 30,
    detail: latest.ok
      ? `Prover latest witness batch ${latest.batch}${
          requestedBatch != null && latest.batch != null
            ? proverBatchInRetentionWindow(requestedBatch, latest.batch)
              ? " — requested batch in ~30-day window"
              : " — requested batch may be outside 30-day retention"
            : ""
        }`
      : `Prover API ${latest.status}`,
  };

  const gate = finalizeReady({
    hasL2Tx: Boolean(L2_TX),
    logProof,
    prover: L2_TX ? prover : { ...prover, available: latest.ok },
  });

  let calldata = null;
  let params = null;
  if (logProof) {
    try {
      params = assembleFinalizeParams({
        logProof,
        l2TxNumberInBatch,
        message: message === "0x" ? "0x00" : message,
        l2BatchNumber: receiptBatch ?? logProof.batchNumber,
      });
      calldata = encodeFinalizeEthWithdrawal(params);
    } catch (err) {
      prover.detail = `${prover.detail}; assemble: ${err.message}`;
    }
  }

  const artifact = {
    kind: "finalize-eth-withdrawal",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    l2WithdrawTx: L2_TX || null,
    prover,
    logProof,
    params: params
      ? {
          l2BatchNumber: params.l2BatchNumber.toString(),
          l2MessageIndex: params.l2MessageIndex.toString(),
          l2TxNumberInBatch: params.l2TxNumberInBatch,
          message: params.message,
          merkleProof: params.merkleProof,
        }
      : null,
    l1: {
      diamond: ZKSYNC_L1_DIAMOND,
      function: "finalizeEthWithdrawal",
      calldata,
      valueWei: "0",
    },
    ready: gate.ready,
    detail: gate.detail,
    note: "Prover API supplies batch witness inputs (30 days). Merkle proof comes from zks_getL2ToL1LogProof after L2 execution.",
  };

  let txHash;
  if (LIVE && calldata && gate.ready) {
    const resolved = resolveBridgeKey();
    if (!resolved) {
      artifact.detail = "FINALIZE_LIVE set but no signer";
    } else {
      const account = privateKeyToAccount(resolved.privateKey);
      const eth = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
      const bal = await eth.getBalance({ address: account.address });
      if (bal === 0n) {
        artifact.detail = `Signer ${account.address} has 0 L1 ETH — fail-closed`;
      } else {
        const wallet = createWalletClient({ account, chain: mainnet, transport: http(ETHEREUM_RPC) });
        txHash = await wallet.sendTransaction({ to: ZKSYNC_L1_DIAMOND, data: calldata });
        artifact.l1.txHash = txHash;
      }
    }
  }

  writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  FINALIZE ETH WITHDRAWAL — Prover API + L2→L1 log proof       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Prover latest:  batch ${latest.batch ?? "?"}  (${latest.filename ?? "no filename"})`);
  console.log(`L2 withdraw:    ${L2_TX || "(set L2_WITHDRAW_TX)"}`);
  console.log(`Ready:          ${gate.ready}`);
  console.log(`Detail:         ${gate.detail}`);
  console.log(`Diamond:        ${ZKSYNC_L1_DIAMOND}`);
  if (txHash) console.log(`L1 tx:          https://etherscan.io/tx/${txHash}`);
  console.log("");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
