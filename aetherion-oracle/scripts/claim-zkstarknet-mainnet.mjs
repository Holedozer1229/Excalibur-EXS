#!/usr/bin/env node
/**
 * Generate + broadcast zkStarknet mainnet claim (137 ETH) on zkSync Era.
 * Tries simulation even without a signer — broadcasts when TREASURE_BRIDGE_PRIVATE_KEY is set.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";
import { CLAIM_TX_VALUE_WEI } from "../src/lib/zkStarknetClaim.ts";
import { zksyncRpc } from "../src/lib/mainnetRpc.ts";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  decodeErrorResult,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CLAIM_PATH = join(ROOT, "public/treasure/zkstarknet-mainnet-claim.json");
const RPC = zksyncRpc();

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [RPC] } },
};

const CLAIM_ABI = [
  {
    type: "function",
    name: "claimStarkProof",
    stateMutability: "payable",
    inputs: [
      { name: "lockCommitment", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "stateSig", type: "bytes32" },
      { name: "traceRoot", type: "bytes32" },
    ],
    outputs: [{ name: "claimed", type: "bool" }],
  },
] ;

function ensureClaim() {
  if (existsSync(CLAIM_PATH)) return;
  console.log("==> Generating zkStarknet claim artifact…");
  execSync("bash ./scripts/generate-zkstarknet-claim.sh", { cwd: ROOT, stdio: "inherit" });
}

async function simulateClaim(publicClient, claim, from) {
  const { mainnetClaim } = claim;
  console.log("==> Simulating claimStarkProof (eth_call)…");
  try {
    const result = await publicClient.call({
      account: from,
      to: mainnetClaim.contract,
      data: mainnetClaim.calldata,
      value: 0n,
    });
    console.log("    ✓ Simulation returned:", result.data ?? "(empty)");
    return true;
  } catch (err) {
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    console.log("    ⊘ Simulation reverted:", msg.slice(0, 200));
    try {
      if (err?.data) {
        const decoded = decodeErrorResult({ abi: CLAIM_ABI, data: err.data });
        console.log("    Revert:", decoded.errorName, decoded.args);
      }
    } catch {
      /* unknown selector */
    }
    return false;
  }
}

async function main() {
  ensureClaim();
  const claim = JSON.parse(readFileSync(CLAIM_PATH, "utf8"));
  if (claim.mainnetClaim) {
    claim.mainnetClaim.valueWei = CLAIM_TX_VALUE_WEI;
    writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));
  }
  const { mainnetClaim, amountEth, source, dest } = claim;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  zkStarknet MAINNET CLAIM — attempt 137 ETH release            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Amount:     ${amountEth} ETH`);
  console.log(`Source:     ${source.evmSource}`);
  console.log(`Dest:       ${dest.zksyncEra}`);
  console.log(`Contract:   ${mainnetClaim.contract}`);
  console.log(`Chain:      zkSync Era (${mainnetClaim.chainId})`);
  console.log(`Calldata:   ${mainnetClaim.calldata.slice(0, 66)}…`);
  console.log("");

  const publicClient = createPublicClient({ chain: zksync, transport: http(RPC) });
  const code = await publicClient.getBytecode({ address: mainnetClaim.contract });
  const isContract = Boolean(code && code !== "0x");
  console.log(`Contract code: ${isContract ? `${(code.length - 2) / 2} bytes` : "EOA / no code"}`);
  console.log(`Tx value:    ${CLAIM_TX_VALUE_WEI} wei (release from contract, do not attach 137 ETH)`);

  const resolved = resolveBridgeKey();
  const pk = resolved?.privateKey ?? null;
  const fromAddr = pk
    ? privateKeyToAccount(pk).address
    : source.evmSource;

  if (!isContract) {
    console.log("⊘ Vault is EOA — claimStarkProof eth_call is a no-op. Deploy SphinxBootyBridge (npm run inject:booty).");
    claim.mainnetClaim.simulation = {
      attemptedAt: new Date().toISOString(),
      network: "zksync-era-mainnet",
      contractIsContract: false,
      result: "reverted_eoa_vault",
      note: "Vault is EOA — deploy SphinxBootyBridge. valueWei is 0.",
    };
    writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));
  } else {
    await simulateClaim(publicClient, claim, fromAddr);
  }

  if (!pk) {
    console.log("");
    console.log("⊘ No signing key — load Solana keypair or set TREASURE_BRIDGE_PRIVATE_KEY.");
    console.log("  Claim artifact ready at public/treasure/zkstarknet-mainnet-claim.json");
    console.log("  Import MetaMask key for 0x5592…Db2A and re-run: npm run claim:zkstarknet");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk);
  const gasBal = await publicClient.getBalance({ address: account.address });
  console.log(`Signer:     ${account.address}`);
  console.log(`Gas:        ${formatEther(gasBal)} ETH on zkSync Era`);

  if (gasBal === 0n) {
    console.log("⚠ Fund signer on zkSync Era, then re-run.");
    process.exit(1);
  }

  const walletClient = createWalletClient({
    account,
    chain: zksync,
    transport: http(RPC),
  });

  console.log("==> Broadcasting claimStarkProof on mainnet…");
  const hash = await walletClient.sendTransaction({
    to: mainnetClaim.contract,
    data: mainnetClaim.calldata,
    value: 0n,
  });

  claim.mainnetClaim.status = "BROADCAST";
  claim.mainnetClaim.txHash = hash;
  claim.mainnetClaim.broadcastAt = new Date().toISOString();
  writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));

  console.log(`    ✓ Tx: ${hash}`);
  console.log(`    https://explorer.zksync.io/tx/${hash}`);
  console.log("");
  console.log("==> Next: npm run bridge:booty");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
