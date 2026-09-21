#!/usr/bin/env node
/**
 * Swap booty ETH → SOL at full 137 ETH scale (Wormhole L1 → Solana, then Jupiter WETH→SOL).
 *
 * Env:
 *   TREASURE_BRIDGE_PRIVATE_KEY — EVM signer with ETH on Ethereum L1
 *   SOLANA_DEPLOY_WALLET — recipient (default: solana address CLI)
 *   ETHEREUM_RPC / ZKSYNC_RPC — optional
 *   SWAP_ETH_WEI — override amount (default: all spendable L1 minus gas reserve)
 *   DRY_RUN=1 — plan only, no broadcast
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { PublicKey } from "@solana/web3.js";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import {
  buildBootySolSwapPlan,
  solanaPubkeyToBytes32,
  WORMHOLE_TOKEN_BRIDGE_ETH,
  WORMHOLE_ETHEREUM_CHAIN_ID,
  WORMHOLE_SOLANA_CHAIN_ID,
} from "../src/lib/bootySolSwap.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const VAULT = "0xc5a47c9adab637d1caa791cce193079d22c8cb20";
const WORMHOLE_CORE_ETH = "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B";
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const WRAP_ABI = [
  {
    type: "function",
    name: "wrapAndTransferETH",
    stateMutability: "payable",
    inputs: [
      { name: "recipientChain", type: "uint16" },
      { name: "recipient", type: "bytes32" },
      { name: "arbiterFee", type: "uint256" },
      { name: "nonce", type: "uint32" },
    ],
    outputs: [{ name: "sequence", type: "uint64" }],
  },
  {
    type: "event",
    name: "LogMessagePublished",
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "sequence", type: "uint64" },
      { indexed: false, name: "nonce", type: "uint32" },
      { indexed: false, name: "payload", type: "bytes" },
      { indexed: false, name: "consistencyLevel", type: "uint8" },
    ],
  },
] ;

const MESSAGE_FEE_ABI = [
  {
    type: "function",
    name: "messageFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] ;

const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
const zkClient = createPublicClient({
  chain: { ...mainnet, id: 324, name: "zkSync Era", rpcUrls: { default: { http: [ZKSYNC_RPC] } } },
  transport: http(ZKSYNC_RPC),
});

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
    return process.env.SOLANA_DEPLOY_WALLET ?? "";
  }
}

async function getBalance(client, addr) {
  try {
    return await client.getBalance({ address: addr });
  } catch {
    return 0n;
  }
}

async function jupiterQuoteSol(ethAmount) {
  try {
    const url = `https://price.jup.ag/v6/price?ids=ETH&vsToken=SOL`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const ethUsd = json?.data?.ETH?.price;
    if (!ethUsd) return null;
    const manifest = JSON.parse(readFileSync(join(ROOT, "public/treasure/booty-manifest.json"), "utf8"));
    const solUsd = manifest.solUsdOracle ?? 150;
    const solOut = (ethAmount * ethUsd) / solUsd;
    return { ethUsd, solUsd, solOut };
  } catch {
    return null;
  }
}

async function pollVaa(emitter, sequence, attempts = 30) {
  const emitterHex = emitter.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const url = `https://api.wormholescan.io/api/v1/signed_vaa/${WORMHOLE_ETHEREUM_CHAIN_ID}/${emitterHex}/${sequence}`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.vaaBytes) return json.vaaBytes;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(ROOT, "public/treasure/booty-manifest.json"), "utf8"));
  const solWallet = solanaAddress();
  let recipientBytes32 = null;
  try {
    recipientBytes32 = solanaPubkeyToBytes32(new PublicKey(solWallet).toBytes());
  } catch {
    /* invalid */
  }

  const [vaultL1, vaultZk, sourceL1] = await Promise.all([
    getBalance(ethClient, VAULT),
    getBalance(zkClient, VAULT),
    getBalance(ethClient, "0x5592CF5822Dea1c7AC79E17DDaBD67B2B095Db2A"),
  ]);

  const plan = buildBootySolSwapPlan(
    { ethereumWei: vaultL1, zksyncWei: vaultZk },
    solWallet,
    recipientBytes32,
    manifest.canonicalEthBooty,
  );

  const quote = await jupiterQuoteSol(plan.canonicalEthBooty);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  BOOTY SWAP — 137 ETH → SOL (Wormhole + Jupiter)               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Canonical booty:  ${plan.canonicalEthBooty} ETH`);
  console.log(`Target SOL:       ~${plan.targetSol.toLocaleString()} (@ $${plan.oracleEthUsd}/ETH · $${plan.oracleSolUsd}/SOL)`);
  if (quote) console.log(`Jupiter spot:     ~${Math.round(quote.solOut).toLocaleString()} SOL for full booty`);
  console.log("");
  console.log(`Vault L1:         ${formatEther(vaultL1)} ETH`);
  console.log(`Vault zkSync:     ${formatEther(vaultZk)} ETH`);
  console.log(`Source 0x5592…:   ${formatEther(sourceL1)} ETH`);
  console.log(`Bridgeable L1:    ${formatEther(plan.bridgeableWei)} ETH (after gas reserve)`);
  console.log(`Solana wallet:    ${solWallet || "(unset)"}`);
  console.log(`Wormhole bridge:  ${WORMHOLE_TOKEN_BRIDGE_ETH}`);
  console.log("");

  if (plan.blockers.length) {
    console.log("Blockers:");
    plan.blockers.forEach((b) => console.log(`  ⊘ ${b}`));
    console.log("");
  }

  const pk = process.env.TREASURE_BRIDGE_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!pk) {
    console.log("⊘ TREASURE_BRIDGE_PRIVATE_KEY not set — cannot broadcast Wormhole transfer.");
    console.log("  Set key for vault/source EOA, fund L1 ETH, then: npm run swap:booty");
    console.log("");
    console.log("Steps when keyed:");
    plan.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    process.exit(plan.blockers.length ? 1 : 0);
  }

  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  const signerL1 = await getBalance(ethClient, account.address);

  const canonicalWei = BigInt(Math.floor(plan.canonicalEthBooty * 1e18));
  const overrideWei = process.env.SWAP_ETH_WEI ? BigInt(process.env.SWAP_ETH_WEI) : null;
  let swapWei = overrideWei ?? plan.bridgeableWei;

  if (account.address.toLowerCase() !== VAULT.toLowerCase()) {
    const signerSpendable = signerL1 > plan.spendableL1Wei ? signerL1 - 500_000_000_000_000n : 0n;
    if (signerSpendable > swapWei) swapWei = signerSpendable;
  }

  if (signerL1 >= canonicalWei && !overrideWei) {
    swapWei = canonicalWei;
  }

  if (swapWei === 0n) {
    console.log(`⚠ Signer ${account.address} has no spendable L1 ETH (${formatEther(signerL1)} total).`);
    console.log("  Withdraw zkSync vault ETH to L1 first, or deposit booty to L1.");
    process.exit(1);
  }

  const messageFee = await ethClient.readContract({
    address: WORMHOLE_CORE_ETH,
    abi: MESSAGE_FEE_ABI,
    functionName: "messageFee",
  });

  const totalValue = swapWei + messageFee;
  console.log(`Signer:           ${account.address}`);
  console.log(`Swap amount:      ${formatEther(swapWei)} ETH`);
  console.log(`Wormhole fee:     ${formatEther(messageFee)} ETH`);
  console.log(`Tx value:         ${formatEther(totalValue)} ETH`);
  console.log(`Est. SOL out:     ~${ethWeiToSolEstimate(swapWei).toFixed(0)} SOL (oracle)`);
  console.log("");

  if (DRY_RUN) {
    console.log("DRY_RUN=1 — skipping broadcast.");
    process.exit(0);
  }

  if (signerL1 < totalValue) {
    console.log(`⚠ Insufficient L1 balance: need ${formatEther(totalValue)} ETH, have ${formatEther(signerL1)}`);
    process.exit(1);
  }

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(ETHEREUM_RPC),
  });

  const nonce = Math.floor(Date.now() / 1000) >>> 0;
  console.log("==> Broadcasting Wormhole wrapAndTransferETH (ETH → Solana WETH)…");

  const hash = await walletClient.writeContract({
    address: WORMHOLE_TOKEN_BRIDGE_ETH,
    abi: WRAP_ABI,
    functionName: "wrapAndTransferETH",
    args: [WORMHOLE_SOLANA_CHAIN_ID, recipientBytes32, 0n, nonce],
    value: totalValue,
  });

  console.log(`    ✓ Submitted: ${hash}`);
  console.log(`    https://etherscan.io/tx/${hash}`);

  const receipt = await ethClient.waitForTransactionReceipt({ hash });
  const logs = parseEventLogs({
    abi: WRAP_ABI,
    logs: receipt.logs,
    eventName: "LogMessagePublished",
  });
  const sequence = logs[0]?.args?.sequence?.toString();

  if (sequence) {
    console.log(`    Sequence: ${sequence}`);
    console.log("==> Polling Wormhole VAA…");
    const emitter = WORMHOLE_TOKEN_BRIDGE_ETH;
    const vaa = await pollVaa(emitter, sequence);
    if (vaa) {
      console.log("    ✓ VAA ready — redeem at https://portalbridge.com or npm run swap:booty redeem");
      console.log(`    VAA length: ${vaa.length} chars`);
    } else {
      console.log("    ⊘ VAA not ready yet — check portalbridge.com in ~1–5 min");
    }
  }

  console.log("");
  console.log("==> Next: redeem WETH on Solana → Jupiter swap to native SOL");
  console.log(`    Then: npm run booty:mainnet`);
}

function ethWeiToSolEstimate(wei) {
  const eth = Number(wei) / 1e18;
  return (eth * 2500) / 150;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
