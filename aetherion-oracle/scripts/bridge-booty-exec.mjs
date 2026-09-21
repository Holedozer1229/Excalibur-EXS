#!/usr/bin/env node
/**
 * Execute booty bridge: audit vault → broadcast micro-claim (if keyed) → fund Solana wallet.
 *
 * Env:
 *   TREASURE_BRIDGE_PRIVATE_KEY — vault/controller EOA (0x…, never commit)
 *   ZKSYNC_RPC / ETHEREUM_RPC — optional
 *   SOLANA_DEPLOY_WALLET — defaults to solana address CLI
 */
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const VAULT = "0xc5a47c9adab637d1caa791cce193079d22c8cb20";

const zksyncClient = createPublicClient({
  chain: { ...mainnet, id: 324, name: "zkSync Era", rpcUrls: { default: { http: [ZKSYNC_RPC] } } },
  transport: http(ZKSYNC_RPC),
});

const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });

async function getBalance(client, addr) {
  try {
    return await client.getBalance({ address: addr });
  } catch {
    return 0n;
  }
}

function solanaAddress() {
  try {
    return execSync("solana address", {
      encoding: "utf8",
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/solana/install/active_release/bin:${process.env.PATH}` },
    }).trim();
  } catch {
    return process.env.SOLANA_DEPLOY_WALLET ?? "";
  }
}

async function main() {
  const claim = JSON.parse(readFileSync(join(ROOT, "public/treasure/claim_tx_eba9.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(ROOT, "public/treasure/booty-manifest.json"), "utf8"));
  const solWallet = solanaAddress();

  const [ethWei, zkWei] = await Promise.all([
    getBalance(ethClient, VAULT),
    getBalance(zksyncClient, VAULT),
  ]);
  const totalEth = Number(ethWei + zkWei) / 1e18;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  BOOTY BRIDGE — Davy Jones locker → Solana deploy wallet       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Vault:           ${VAULT}`);
  console.log(`Canonical booty: ${manifest.canonicalEthBooty} ETH (proof ledger)`);
  console.log(`On-chain vault:  ${totalEth.toFixed(6)} ETH (L1 ${formatEther(ethWei)} + zkSync ${formatEther(zkWei)})`);
  console.log(`Solana wallet:   ${solWallet || "(unset)"}`);
  console.log(`Micro-claim:     ${claim.amount_eth} ETH · ${claim.status}`);
  console.log("");

  const pk = process.env.TREASURE_BRIDGE_PRIVATE_KEY;
  if (!pk) {
    console.log("⊘ TREASURE_BRIDGE_PRIVATE_KEY not set — cannot sign vault claim broadcast.");
    console.log("  Export the vault/controller EOA key, then re-run: npm run bridge:booty");
    console.log("");
    if (totalEth < claim.amount_eth) {
      console.log("⚠ On-chain vault balance is below micro-claim amount.");
      console.log("  Proofs establish intent; L1 deposit to vault still required for live bridge.");
    }
    process.exit(1);
  }

  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  console.log(`Signer:          ${account.address}`);

  const walletClient = createWalletClient({
    account,
    chain: { ...mainnet, id: 324, name: "zkSync Era", rpcUrls: { default: { http: [ZKSYNC_RPC] } } },
    transport: http(ZKSYNC_RPC),
  });

  const signerBal = await getBalance(zksyncClient, account.address);
  if (signerBal === 0n) {
    console.log("⚠ Signer has 0 ETH on zkSync Era — fund for gas before broadcast.");
    process.exit(1);
  }

  console.log("==> Broadcasting micro-claim submitVAA on zkSync Era…");
  const hash = await walletClient.sendTransaction({
    to: claim.to,
    data: claim.calldata_hex,
    value: BigInt(claim.amount_wei),
  });
  console.log(`    ✓ Tx submitted: ${hash}`);
  console.log(`    Explorer: https://explorer.zksync.io/tx/${hash}`);
  console.log("");
  console.log("==> Next: swap released ETH → SOL and send to", solWallet);
  console.log("    Then: npm run booty:mainnet");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
