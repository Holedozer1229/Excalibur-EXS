#!/usr/bin/env node
/**
 * Build + attempt broadcast of EIP-gated L1→L2 wrapped-ETH URUU claim.
 * FAIL_CLOSED without operator L1 gas / key. Does not mint 137 ETH.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";
import { ZKSYNC_L1_DIAMOND } from "../src/lib/vacuumWatch.ts";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import {
  EIP_URUU_CLAIM_PATH,
  ZKSYNC_MAILBOX_ABI,
  L2_GAS_LIMIT,
  L2_GAS_PER_PUBDATA,
  buildEipUruuBridgeClaim,
  serializeEipUruuClaim,
} from "../src/lib/eipUruuBridgeClaim.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", EIP_URUU_CLAIM_PATH.replace(/^\//, ""));
const ETH_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZK_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";

async function main() {
  const eth = createPublicClient({
    chain: mainnet,
    transport: http(ETH_RPC, { fetchOptions: { headers: { "user-agent": "aetherion-eip-uruu-claim/1" } } }),
  });
  const zk = createPublicClient({
    chain: { ...mainnet, id: 324, name: "zkSync Era" },
    transport: http(ZK_RPC, { fetchOptions: { headers: { "user-agent": "aetherion-eip-uruu-claim/1" } } }),
  });

  const [opWei, vaultL1, vaultZk] = await Promise.all([
    eth.getBalance({ address: SOLANA_DERIVED_EVM }).catch(() => 0n),
    eth.getBalance({ address: TREASURE_VAULT }).catch(() => 0n),
    zk.getBalance({ address: TREASURE_VAULT }).catch(() => 0n),
  ]);

  let signer = null;
  try {
    signer = resolveBridgeKey();
  } catch {
    signer = null;
  }

  const live = process.env.CLAIM_LIVE === "1" || process.env.CLAIM_LIVE === "true";
  const spendable = vaultL1 > 0n ? vaultL1 : 0n;
  let txHash = null;

  if (live && signer && opWei > 0n && spendable > 0n) {
    const account = privateKeyToAccount(signer.privateKey);
    const wallet = createWalletClient({ account, chain: mainnet, transport: http(ETH_RPC) });
    txHash = await wallet.writeContract({
      address: ZKSYNC_L1_DIAMOND,
      abi: ZKSYNC_MAILBOX_ABI,
      functionName: "requestL2Transaction",
      args: [TREASURE_VAULT, spendable, "0x", L2_GAS_LIMIT, L2_GAS_PER_PUBDATA, [], TREASURE_VAULT],
      value: spendable,
    });
  }

  const report = buildEipUruuBridgeClaim({
    live,
    l1Wei: vaultL1,
    zkWei: vaultZk,
    operatorWei: opWei,
    txHash,
  });
  writeFileSync(OUT, serializeEipUruuClaim(report));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  EIP-2 · EIP-6 · EIP-3326 · EIP-7949  ·  L1→L2 URUU CLAIM    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  for (const g of report.gates) console.log(`${g.ok ? "✔" : "✗"} ${g.id}  ${g.detail}`);
  console.log(`Operator:    ${formatEther(opWei)} ETH`);
  console.log(`Vault L1:    ${formatEther(vaultL1)} ETH`);
  console.log(`Vault zk:    ${formatEther(vaultZk)} ETH`);
  console.log(`Broadcast:   ${report.broadcast}  ${report.blockers.join(", ")}`);
  console.log(report.note);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
