#!/usr/bin/env node
/**
 * Compile CamelotScavenger and CREATE2-deploy via Arachnid factory.
 * Fail-closed without operator L1 gas. Never broadcasts 137 ETH.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { SOLANA_DERIVED_EVM } from "../src/lib/liveMainnetLedger.ts";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import {
  CREATE2_FACTORY,
  CREATE2_SALT32,
  EXCAL_BYTECODE_PATH,
  EXCAL_STATUS_PATH,
  buildExcalCreate2Status,
  encodeExcalInitCode,
  factoryCalldata,
  predictExcalCreate2,
  serializeExcalStatus,
} from "../src/lib/eip7949Excal.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, EXCAL_BYTECODE_PATH);
const OUT = join(ROOT, "public", EXCAL_STATUS_PATH.replace(/^\//, ""));
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

function compile() {
  mkdirSync(join(ROOT, "build/contracts"), { recursive: true });
  execSync(
    "npx --yes solc@0.8.19 --bin --abi contracts/CamelotScavenger.sol -o build/contracts",
    { cwd: ROOT, stdio: "inherit" },
  );
}

function loadBytecode() {
  if (!existsSync(BIN)) return null;
  const hex = readFileSync(BIN, "utf8").trim();
  if (!hex) return null;
  return (hex.startsWith("0x") ? hex : `0x${hex}`);
}

async function main() {
  compile();
  const creation = loadBytecode();
  const initCode = creation ? encodeExcalInitCode(creation, TREASURE_VAULT) : null;
  const predicted = initCode ? predictExcalCreate2(initCode) : null;

  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-excal-create2/1" } } }),
  });

  const [factoryCode, predCode, predWei, opWei, block] = await Promise.all([
    client.getCode({ address: CREATE2_FACTORY }),
    predicted ? client.getCode({ address: predicted }) : Promise.resolve("0x"),
    predicted ? client.getBalance({ address: predicted }) : Promise.resolve(0n),
    client.getBalance({ address: SOLANA_DERIVED_EVM }),
    client.getBlock({ blockTag: "latest" }),
  ]);

  let signer = null;
  try {
    signer = resolveBridgeKey();
  } catch {
    signer = null;
  }

  const live = process.env.EXCAL_LIVE === "1" || process.env.EXCAL_LIVE === "true";
  const factoryHasCode = !!factoryCode && factoryCode !== "0x";
  const predictedHasCode = !!predCode && predCode !== "0x";
  const cost = (block.baseFeePerGas ?? 0n) * 1_800_000n;
  let txHash = null;

  if (live && signer && initCode && predicted && !predictedHasCode && opWei >= cost) {
    const account = privateKeyToAccount(signer.privateKey);
    const wallet = createWalletClient({
      account,
      chain: mainnet,
      transport: http(RPC),
    });
    txHash = await wallet.sendTransaction({
      to: CREATE2_FACTORY,
      data: factoryCalldata(initCode, CREATE2_SALT32),
      gas: 1_800_000n,
    });
  }

  const status = buildExcalCreate2Status({
    predicted,
    factoryHasCode,
    predictedHasCode: predictedHasCode || !!txHash,
    predictedWei: predWei,
    live,
    operatorWei: opWei,
    deployCostWei: cost,
    txHash,
  });

  writeFileSync(OUT, serializeExcalStatus(status));
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  EIP-7949  ·  CAMELOT SCAVENGER EXCAL CREATE2                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Factory:     ${CREATE2_FACTORY}  code=${factoryHasCode}`);
  console.log(`Salt32:      ${CREATE2_SALT32}`);
  console.log(`Owner:       ${TREASURE_VAULT}`);
  console.log(`Predicted:   ${predicted ?? "(no bytecode)"}`);
  console.log(`Has code:    ${predictedHasCode}`);
  console.log(`Operator:    ${formatEther(opWei)} ETH`);
  console.log(`Broadcast:   ${status.broadcast}  ${status.blockers.join(", ")}`);
  console.log(status.note);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
