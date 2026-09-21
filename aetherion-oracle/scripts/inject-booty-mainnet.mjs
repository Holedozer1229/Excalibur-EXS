#!/usr/bin/env node
/**
 * Inject 137 ETH booty onto Ethereum mainnet:
 *   1. Deploy SphinxBootyBridge (validates SKYNT stateSig)
 *   2. Optional depositBooty() if signer holds ETH
 *   3. claimStarkProof → releases contract balance to vault
 *
 * Env:
 *   TREASURE_BRIDGE_PRIVATE_KEY — deploy + claim signer
 *   DEPOSIT_WEI — optional ETH to deposit into bridge before claim
 *   ETHEREUM_RPC — default publicnode
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";
import {
  buildInjectStatus,
  buildL1ClaimCalldata,
  bootyWeiString,
  encodeBridgeConstructor,
  SPHINX_BOOTY_BRIDGE_ABI,
  SPHINX_BOOTY_BRIDGE_BYTECODE_PATH,
} from "../src/lib/bootyInject.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const STATUS_PATH = join(ROOT, "public/treasure/inject-booty-status.json");
const CLAIM_PATH = join(ROOT, "public/treasure/zkstarknet-mainnet-claim.json");
const STARK_PATH = join(ROOT, "public/treasure/stark-bridge-claim-1814332222_88b0.json");
const BYTECODE_PATH = join(ROOT, SPHINX_BOOTY_BRIDGE_BYTECODE_PATH);

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

function loadBytecode() {
  if (!existsSync(BYTECODE_PATH)) {
    throw new Error(`Bytecode missing — run: npx solc@0.8.20 --bin contracts/SphinxBootyBridge.sol -o build/contracts`);
  }
  const raw = readFileSync(BYTECODE_PATH, "utf8").trim();
  return `0x${raw}`;
}

function asBytes32(hex) {
  const h = hex.startsWith("0x") ? hex : `0x${hex}`;
  return h;
}

async function main() {
  const stark = JSON.parse(readFileSync(STARK_PATH, "utf8"));
  const stateSig = asBytes32(stark.stateSig);
  const lockCommitment = asBytes32(stark.lock.commitment);
  const traceRoot = asBytes32(stark.starkProof.traceRoot);
  const nonce = BigInt(stark.vaa.nonce);
  const bootyWei = BigInt(bootyWeiString());
  const bytecode = loadBytecode();

  const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  INJECT BOOTY — 137 ETH → Ethereum mainnet vault               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Booty:      ${formatEther(bootyWei)} ETH`);
  console.log(`Vault:      ${stark.lock.l2Dest}`);
  console.log(`stateSig:   ${stateSig.slice(0, 18)}…`);
  console.log("");

  console.log("==> [0/4] Trace SKYNT provenance (genesis → 137 ETH)");
  try {
    execSync("npx --yes tsx ./scripts/trace-skynt-provenance.mjs", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.log("    ⊘ Provenance trace incomplete");
  }

  const pk = resolveBridgeKey();
  if (!pk) {
    const status = buildInjectStatus({
      stateSig,
      blockers: [
        "No signing key — set TREASURE_BRIDGE_PRIVATE_KEY or load Solana keypair at ~/.config/solana/id.json",
        "137 ETH exists in SKYNT proof ledger; bridge contract must be deployed + funded on L1.",
      ],
    });
    writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
    console.log("⊘ No bridge signing key found.");
    console.log("  Load Solana keypair: solana config set --keypair ~/.config/solana/id.json");
    console.log("  Or: TREASURE_BRIDGE_PRIVATE_KEY=0x… npm run inject:booty");
    console.log("");
    console.log("Manual path:");
    status.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    process.exit(1);
  }

  const account = privateKeyToAccount(pk.privateKey);
  const signerBal = await ethClient.getBalance({ address: account.address });
  console.log(`Signer:     ${account.address} (from ${pk.source})`);
  if (!pk.matchesSkyntPortfolio && pk.source === "solana_keypair") {
    console.log(`Note:       SKYNT portfolio is ${stark.lock.source} — different address curve`);
  }
  console.log(`L1 balance: ${formatEther(signerBal)} ETH`);

  if (signerBal === 0n) {
    console.log("");
    console.log("⚠ Signer has 0 ETH on L1 — fund for gas before deploy:");
    console.log(`  Send ≥0.01 ETH to ${account.address}`);
    const status = buildInjectStatus({
      stateSig,
      blockers: [`Fund ${account.address} with L1 ETH for gas`],
    });
    writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
    process.exit(1);
  }

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(ETHEREUM_RPC),
  });

  const deployData = encodeBridgeConstructor(bytecode, stateSig, stark.lock.l2Dest, bootyWei);
  const deployHash = await walletClient.sendTransaction({ data: deployData });
  console.log(`==> Deploying SphinxBootyBridge…`);
  console.log(`    Tx: ${deployHash}`);
  const receipt = await ethClient.waitForTransactionReceipt({ hash: deployHash });
  const bridgeAddress = receipt.contractAddress;
  if (!bridgeAddress) {
    console.error("Deploy failed — no contract address");
    process.exit(1);
  }
  console.log(`    ✓ Bridge: ${bridgeAddress}`);
  console.log(`    https://etherscan.io/address/${bridgeAddress}`);

  const depositWei = process.env.DEPOSIT_WEI ? BigInt(process.env.DEPOSIT_WEI) : 0n;
  if (depositWei > 0n) {
    console.log(`==> Depositing ${formatEther(depositWei)} ETH into bridge…`);
    const depHash = await walletClient.writeContract({
      address: bridgeAddress,
      abi: SPHINX_BOOTY_BRIDGE_ABI,
      functionName: "depositBooty",
      value: depositWei,
    });
    await ethClient.waitForTransactionReceipt({ hash: depHash });
    console.log(`    ✓ Deposit tx: ${depHash}`);
  }

  const bridgeBal = await ethClient.readContract({
    address: bridgeAddress,
    abi: SPHINX_BOOTY_BRIDGE_ABI,
    functionName: "contractBalance",
  });
  console.log(`Bridge balance: ${formatEther(bridgeBal)} ETH`);

  const calldata = buildL1ClaimCalldata({ lockCommitment, nonce, stateSig, traceRoot });
  console.log("==> Simulating claimStarkProof on L1…");
  try {
    await ethClient.simulateContract({
      account: account.address,
      address: bridgeAddress,
      abi: CLAIM_ABI,
      functionName: "claimStarkProof",
      args: [lockCommitment, nonce, stateSig, traceRoot],
      value: 0n,
    });
    console.log("    ✓ Simulation passed");
  } catch (err) {
    console.log("    ⊘ Simulation:", (err?.shortMessage ?? err?.message ?? String(err)).slice(0, 120));
  }

  let claimTxHash;
  if (bridgeBal > 0n || depositWei > 0n) {
    console.log("==> Broadcasting claimStarkProof (releases ETH to vault)…");
    claimTxHash = await walletClient.writeContract({
      address: bridgeAddress,
      abi: CLAIM_ABI,
      functionName: "claimStarkProof",
      args: [lockCommitment, nonce, stateSig, traceRoot],
      value: 0n,
    });
    console.log(`    ✓ Claim: ${claimTxHash}`);
    console.log(`    https://etherscan.io/tx/${claimTxHash}`);
  } else {
    console.log("");
    console.log("⊘ Bridge unfunded — claim would release 0 ETH.");
    console.log("  Fund bridge: send 137 ETH to", bridgeAddress);
    console.log("  Or set CAPTAINS_CUT_PERIOD_PROFIT_WEI + CAPTAINS_CUT_MNEMONIC on Supabase");
    console.log("  Then re-run: npm run inject:booty -- claim");
  }

  const claim = existsSync(CLAIM_PATH) ? JSON.parse(readFileSync(CLAIM_PATH, "utf8")) : {};
  claim.l1EthereumClaim = {
    network: "ethereum-mainnet",
    chainId: 1,
    contract: bridgeAddress,
    function: "claimStarkProof",
    calldata,
    valueWei: "0",
    status: claimTxHash ? "BROADCAST" : "BRIDGE_DEPLOYED_AWAITING_FUNDING",
    txHash: claimTxHash,
    deployTxHash: deployHash,
    broadcastAt: claimTxHash ? new Date().toISOString() : undefined,
  };
  writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));

  const status = buildInjectStatus({
    stateSig,
    bridgeContract: bridgeAddress,
    deployTxHash: deployHash,
    blockers: bridgeBal === 0n && !claimTxHash
      ? [`Fund ${bridgeAddress} with ${formatEther(bootyWei)} ETH, then npm run inject:booty -- claim`]
      : [],
    claim: {
      calldata,
      status: claim.l1EthereumClaim.status,
      txHash: claimTxHash,
    },
  });
  writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));

  console.log("");
  console.log("==> Next: npm run swap:booty");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
