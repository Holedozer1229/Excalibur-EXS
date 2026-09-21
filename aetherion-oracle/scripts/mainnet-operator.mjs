#!/usr/bin/env node
/**
 * Single mainnet operator path — dry-run + fail-closed status.
 * Does not invent 137 ETH. Exits 0 when software is healthy and blockers are documented.
 *
 * Env:
 *   BROADCAST=1 — pass through to live scripts (still fail-closed)
 *   ETHEREUM_RPC — default https://ethereum.publicnode.com
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "./lib/resolve-bridge-key.mjs";
import { buildMainnetOperatorStatus } from "../src/lib/mainnetOperator.ts";
import { CLAIM_TX_VALUE_WEI } from "../src/lib/zkStarknetClaim.ts";
import { SPHINX_BOOTY_BRIDGE_BYTECODE_PATH } from "../src/lib/bootyInject.ts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { ethereumRpc, zksyncRpc } from "../src/lib/mainnetRpc.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/mainnet-operator-status.json");
const CLAIM_PATH = join(ROOT, "public/treasure/zkstarknet-mainnet-claim.json");
const PROV_PATH = join(ROOT, "public/treasure/skynt-provenance-chain.json");
const ETHEREUM_RPC = ethereumRpc();
const ZKSYNC_RPC = zksyncRpc();
const VAULT = TREASURE_VAULT;

const zksync = {
  ...mainnet,
  id: 324,
  name: "zkSync Era",
  rpcUrls: { default: { http: [ZKSYNC_RPC] } },
};

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: opts.silent ? "pipe" : "inherit", env: process.env });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err?.message?.slice(0, 240) ?? "failed" };
  }
}

async function getBalance(client, addr) {
  try {
    return await client.getBalance({ address: addr });
  } catch {
    return 0n;
  }
}

async function getCode(client, addr) {
  try {
    const code = await client.getBytecode({ address: addr });
    return Boolean(code && code !== "0x");
  } catch {
    return false;
  }
}

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

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  MAINNET OPERATOR — fail-closed dry-run                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`RPC L1:     ${ETHEREUM_RPC}`);
  console.log(`RPC zkSync: ${ZKSYNC_RPC}`);
  console.log(`Vault:      ${VAULT}`);
  console.log("");

  console.log("==> [1/6] SKYNT provenance");
  run("npx --yes tsx ./scripts/trace-skynt-provenance.mjs");

  console.log("==> [2/6] Refresh claim artifact (valueWei=0)");
  run("bash ./scripts/generate-zkstarknet-claim.sh");

  const ethClient = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  const zkClient = createPublicClient({ chain: zksync, transport: http(ZKSYNC_RPC) });

  console.log("==> [3/6] Live vault audit");
  const [vaultL1, vaultZk] = await Promise.all([
    getBalance(ethClient, VAULT),
    getBalance(zkClient, VAULT),
  ]);
  const [skyntL1, solDerivedL1] = await Promise.all([
    getBalance(ethClient, "0x5592CF5822Dea1c7AC79E17DDaBD67B2B095Db2A"),
    getBalance(ethClient, "0xf8F395CEb5D866ecc94c7b1685A22432ef7F47d6"),
  ]);
  const vaultIsContract = await getCode(ethClient, VAULT);
  const vaultIsContractZk = await getCode(zkClient, VAULT);

  console.log(`    Vault L1:      ${formatEther(vaultL1)} ETH  ${vaultIsContract ? "(contract)" : "(EOA)"}`);
  console.log(`    Vault zkSync:  ${formatEther(vaultZk)} ETH  ${vaultIsContractZk ? "(contract)" : "(EOA)"}`);
  console.log(`    SKYNT 0x5592:  ${formatEther(skyntL1)} ETH`);
  console.log(`    Sol-derived:   ${formatEther(solDerivedL1)} ETH`);

  const resolved = resolveBridgeKey();
  let signerL1 = 0n;
  let signerZk = 0n;
  if (resolved) {
    signerL1 = await getBalance(ethClient, resolved.address);
    signerZk = await getBalance(zkClient, resolved.address);
    console.log(`    Signer:        ${resolved.address}  L1 ${formatEther(signerL1)} / zk ${formatEther(signerZk)}`);
  } else {
    console.log("    Signer:        (none)");
  }

  let claim = {};
  if (existsSync(CLAIM_PATH)) {
    claim = JSON.parse(readFileSync(CLAIM_PATH, "utf8"));
    if (claim.mainnetClaim) {
      claim.mainnetClaim.valueWei = CLAIM_TX_VALUE_WEI;
      writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));
    }
  }

  console.log("==> [4/6] Simulate claimStarkProof (value 0)");
  try {
    const to = claim.mainnetClaim?.contract ?? VAULT;
    const data = claim.mainnetClaim?.calldata;
    if (!vaultIsContractZk) {
      console.log("    ⊘ Vault is EOA — eth_call cannot claim; deploy SphinxBootyBridge");
    } else if (data) {
      await zkClient.call({
        account: resolved?.address ?? "0x5592CF5822Dea1c7AC79E17DDaBD67B2B095Db2A",
        to,
        data,
        value: 0n,
      });
      console.log("    ✓ Simulation returned");
    } else {
      console.log("    ⊘ No calldata — generate-zkstarknet-claim first");
    }
  } catch (err) {
    const msg = err?.shortMessage ?? err?.message ?? String(err);
    console.log("    ⊘ Simulation reverted (expected if vault is EOA):", msg.slice(0, 160));
    if (claim.mainnetClaim) {
      claim.mainnetClaim.simulation = {
        attemptedAt: new Date().toISOString(),
        network: "zksync-era-mainnet",
        contractIsContract: vaultIsContractZk,
        result: vaultIsContractZk ? "reverted" : "reverted_eoa_vault",
        note: "Vault is EOA — deploy SphinxBootyBridge; claim valueWei is 0 (release from contract)",
      };
      writeFileSync(CLAIM_PATH, JSON.stringify(claim, null, 2));
    }
  }

  console.log("==> [5/6] Withdrawal + inject readiness");
  run("npx --yes tsx ./scripts/claim-withdrawal-l1.mjs", { silent: false });

  const bytecodePath = join(ROOT, SPHINX_BOOTY_BRIDGE_BYTECODE_PATH);
  if (!existsSync(bytecodePath)) {
    run("npx --yes solc@0.8.20 --bin --abi contracts/SphinxBootyBridge.sol -o build/contracts");
  }

  let provenance = {};
  if (existsSync(PROV_PATH)) {
    provenance = JSON.parse(readFileSync(PROV_PATH, "utf8"));
  }

  const injectStatusPath = join(ROOT, "public/treasure/inject-booty-status.json");
  let injectBridge = null;
  if (existsSync(injectStatusPath)) {
    injectBridge = JSON.parse(readFileSync(injectStatusPath, "utf8")).bridgeContract ?? null;
  }

  const withdrawalPath = join(ROOT, "public/treasure/claim-withdrawal-status.json");
  let ethrexProofPresent = false;
  let zksyncFinalizeProofPresent = false;
  if (existsSync(withdrawalPath)) {
    const w = JSON.parse(readFileSync(withdrawalPath, "utf8"));
    ethrexProofPresent = Boolean(w.ethrexClaimCalldata);
    zksyncFinalizeProofPresent = Boolean(w.zksyncFinalizeCalldata);
  }

  const status = buildMainnetOperatorStatus({
    vaultL1Wei: vaultL1,
    vaultZkWei: vaultZk,
    signerPresent: Boolean(resolved),
    signerAddress: resolved?.address,
    signerL1Wei: signerL1,
    signerZkWei: signerZk,
    claimValueWei: claim.mainnetClaim?.valueWei ?? CLAIM_TX_VALUE_WEI,
    claimContractIsContract: vaultIsContract || vaultIsContractZk,
    provenanceVerdict: provenance.verdict,
    provenanceOnChainL1TxFound: provenance.onChainL1TxFound,
    injectBytecodePresent: existsSync(bytecodePath),
    injectBridgeAddress: injectBridge,
    solanaRecipient: solanaAddress(),
    ethrexProofPresent,
    zksyncFinalizeProofPresent,
  });

  status.live = {
    skyntPortfolioL1Eth: Number(skyntL1) / 1e18,
    solanaDerivedL1Eth: Number(solDerivedL1) / 1e18,
    rpc: { ethereum: ETHEREUM_RPC, zksync: ZKSYNC_RPC },
  };

  writeFileSync(OUT, JSON.stringify(status, null, 2));

  console.log("");
  console.log("==> [6/6] Operator verdict");
  console.log(`    Verdict:     ${status.verdict}`);
  console.log(`    Software:    ${status.softwareReady ? "ready" : "broken"}`);
  console.log(`    Broadcast:   ${status.readyToBroadcast ? "yes" : "no — fail closed"}`);
  console.log(`    Claim value: ${status.claimTxValueWei} wei`);
  console.log("");
  console.log("Stages:");
  for (const s of status.stages) {
    const mark = s.status === "ok" || s.status === "ready" ? "✓" : "⊘";
    console.log(`  ${mark} [${s.status}] ${s.label} — ${s.detail}`);
  }
  console.log("");
  if (status.blockers.length) {
    console.log("Honest blockers:");
    status.blockers.forEach((b) => console.log(`  ⊘ ${b}`));
    console.log("");
  }
  console.log("Next:");
  status.next.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
  console.log("");
  console.log(`Wrote ${OUT}`);

  if (!status.softwareReady) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("mainnet operator crashed:", err?.shortMessage ?? err?.message ?? err);
  process.exit(1);
});
