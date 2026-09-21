#!/usr/bin/env node
/**
 * Compile UmbrellaBackstop and CREATE2-deploy via Arachnid factory.
 * Fail-closed without operator L1 gas. Does not inject 137 ETH.
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
import { CREATE2_FACTORY, factoryCalldata } from "../src/lib/eip7949Excal.ts";
import {
  UMBRELLA_BYTECODE_PATH,
  UMBRELLA_SALT32,
  UMBRELLA_STATUS_PATH,
  buildUmbrellaRecovery,
  encodeUmbrellaInitCode,
  predictUmbrellaCreate2,
  serializeUmbrellaRecovery,
} from "../src/lib/umbrellaBackstop.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BIN = join(ROOT, UMBRELLA_BYTECODE_PATH);
const OUT = join(ROOT, "public", UMBRELLA_STATUS_PATH.replace(/^\//, ""));
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

function compile() {
  mkdirSync(join(ROOT, "build/contracts"), { recursive: true });
  execSync(
    "npx --yes solc@0.8.19 --bin --abi contracts/UmbrellaBackstop.sol -o build/contracts",
    { cwd: ROOT, stdio: "inherit" },
  );
}

function loadBytecode() {
  if (!existsSync(BIN)) return null;
  const hex = readFileSync(BIN, "utf8").trim();
  if (!hex) return null;
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

async function main() {
  compile();
  const creation = loadBytecode();
  const initCode = creation ? encodeUmbrellaInitCode(creation, TREASURE_VAULT, TREASURE_VAULT) : null;
  const predicted = initCode ? predictUmbrellaCreate2(initCode) : null;

  const client = createPublicClient({
    chain: mainnet,
    transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-umbrella/1" } } }),
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

  const live = process.env.UMBRELLA_LIVE === "1" || process.env.UMBRELLA_LIVE === "true";
  const factoryHasCode = !!factoryCode && factoryCode !== "0x";
  const predictedHasCode = !!predCode && predCode !== "0x";
  const cost = (block.baseFeePerGas ?? 0n) * 1_600_000n;
  let txHash = null;

  if (live && signer && initCode && predicted && !predictedHasCode && opWei >= cost) {
    const account = privateKeyToAccount(signer.privateKey);
    const wallet = createWalletClient({ account, chain: mainnet, transport: http(RPC) });
    txHash = await wallet.sendTransaction({
      to: CREATE2_FACTORY,
      data: factoryCalldata(initCode, UMBRELLA_SALT32),
      gas: 1_600_000n,
    });
  }

  const report = buildUmbrellaRecovery({
    predicted,
    predictedHasCode: predictedHasCode || !!txHash,
    predictedWei: predWei,
    live,
    operatorWei: opWei,
    deployCostWei: cost,
    txHash,
  });
  writeFileSync(OUT, serializeUmbrellaRecovery(report));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  UMBRELLA BACKSTOP  ·  OWN RECOVERY  ·  FAIL-CLOSED          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Factory:     ${CREATE2_FACTORY}  code=${factoryHasCode}`);
  console.log(`Salt32:      ${UMBRELLA_SALT32}`);
  console.log(`Predicted:   ${predicted ?? "(no bytecode)"}`);
  console.log(`Has code:    ${predictedHasCode}`);
  console.log(`Operator:    ${formatEther(opWei)} ETH`);
  console.log(`Broadcast:   ${report.broadcast}  ${report.blockers.join(", ")}`);
  for (const r of report.rails) console.log(`  ${r.status.padEnd(14)} ${r.id}`);
  console.log(report.note);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
