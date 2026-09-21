#!/usr/bin/env node
/**
 * Self-funding compound loop + fail-closed live CREATE2 dock on Ethereum mainnet.
 *
 * Default dry-run. COMPOUND_LIVE=1 attempts CREATE2 deploy of empty SphinxBootyBridge
 * at genesis salt — only if the signer has L1 gas. Never attaches 137 ETH.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";
import { TREASURE_VAULT } from "../src/lib/pirateTreasureFunding.ts";
import { UNIFIED_STATE_SIG } from "../src/lib/skyntProvenance.ts";
import {
  CREATE2_FACTORY,
  SPHINX_BOOTY_BRIDGE_BYTECODE_PATH,
  encodeBridgeConstructor,
  encodeCreate2FactoryCall,
} from "../src/lib/bootyInject.ts";
import { SKYNT_PORTFOLIO, parseBalanceHex } from "../src/lib/dustVacuum.ts";
import { dayZeroBerth } from "../src/lib/dayZeroSail.ts";
import { buildCompoundStatus, planSelfCompound } from "../src/lib/selfCompound.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/compound-status.json");
const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZKSYNC_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const LIVE = process.env.COMPOUND_LIVE === "1";
const PERIOD_PROFIT = BigInt(process.env.CAPTAINS_CUT_PERIOD_PROFIT_WEI ?? "0");

async function rpcWei(url, address) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const json = await res.json();
  return parseBalanceHex(json.result);
}

async function main() {
  const eth = createPublicClient({ chain: mainnet, transport: http(ETHEREUM_RPC) });
  const block = await eth.getBlock({ blockTag: "latest" });
  const l1WeiPerGas = block.baseFeePerGas ?? 1_000_000_000n;

  const [vaultL1, vaultZk, skyntL1] = await Promise.all([
    rpcWei(ETHEREUM_RPC, TREASURE_VAULT),
    rpcWei(ZKSYNC_RPC, TREASURE_VAULT),
    rpcWei(ETHEREUM_RPC, SKYNT_PORTFOLIO),
  ]);

  const extractableWei = vaultZk + skyntL1 + vaultL1;
  const sweepFeeWei = 21_000n * l1WeiPerGas;

  const bytecodePath = join(ROOT, SPHINX_BOOTY_BRIDGE_BYTECODE_PATH);
  let berth = null;
  let initCode = null;
  const blockers = [];
  if (!existsSync(bytecodePath)) {
    blockers.push("Compile SphinxBootyBridge before live CREATE2 dock");
  } else {
    const raw = readFileSync(bytecodePath, "utf8").trim();
    const bytecode = `0x${raw.replace(/^0x/, "")}`;
    initCode = encodeBridgeConstructor(bytecode, UNIFIED_STATE_SIG, TREASURE_VAULT);
    berth = dayZeroBerth(initCode).address;
  }

  let berthBalance = 0n;
  let berthCode = "0x";
  if (berth) {
    berthBalance = await eth.getBalance({ address: berth });
    berthCode = (await eth.getBytecode({ address: berth })) ?? "0x";
  }

  const plan = planSelfCompound({
    extractableWei,
    sweepFeeWei,
    l1WeiPerGas,
    periodProfitWei: PERIOD_PROFIT,
    berthBalanceWei: berthBalance,
  });

  const resolved = resolveBridgeKey();
  let deploy = {
    attempted: false,
    live: LIVE,
    status: "DRY_RUN",
    detail: "Dry-run — set COMPOUND_LIVE=1 to attempt CREATE2 dock",
  };

  if (berthCode && berthCode !== "0x") {
    deploy = {
      attempted: false,
      live: LIVE,
      status: "ALREADY_DEPLOYED",
      detail: `Berth ${berth} already has contract code`,
    };
  } else if (LIVE && initCode && resolved) {
    const account = privateKeyToAccount(resolved.privateKey);
    const signerBal = await eth.getBalance({ address: account.address });
    deploy.attempted = true;
    if (signerBal < plan.gasReserveWei + 1n) {
      deploy.status = "FAIL_CLOSED";
      deploy.detail = `Signer ${account.address} has ${formatEther(signerBal)} ETH — cannot pay CREATE2 gas`;
      blockers.push(deploy.detail);
    } else {
      const wallet = createWalletClient({
        account,
        chain: mainnet,
        transport: http(ETHEREUM_RPC),
      });
      try {
        const hash = await wallet.sendTransaction({
          to: CREATE2_FACTORY,
          data: encodeCreate2FactoryCall(initCode),
        });
        deploy = {
          attempted: true,
          live: true,
          status: "BROADCAST",
          txHash: hash,
          detail: `CREATE2 dock broadcast ${hash}`,
        };
      } catch (err) {
        deploy = {
          attempted: true,
          live: true,
          status: "FAIL_CLOSED",
          detail: (err?.shortMessage ?? err?.message ?? String(err)).slice(0, 200),
        };
        blockers.push(deploy.detail);
      }
    }
  } else if (LIVE && !resolved) {
    deploy = {
      attempted: true,
      live: true,
      status: "FAIL_CLOSED",
      detail: "No TREASURE_BRIDGE_PRIVATE_KEY / Solana id.json — cannot deploy",
    };
    blockers.push(deploy.detail);
  } else if (!resolved) {
    blockers.push("No signer for live dock — operator 0xf8F3… has 0 L1 ETH");
  }

  if (!resolved?.matchesTreasureVault) {
    blockers.push("Vault key missing — zkSync leftover cannot move into the berth until the vault EOA signs");
  }

  const status = buildCompoundStatus({ plan, berth, deploy, blockers });
  writeFileSync(OUT, `${JSON.stringify(status, null, 2)}\n`);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  COMPOUND — extract → reserve → reinvest → empty CREATE2 dock ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Extractable:  ${formatEther(extractableWei)} ETH (own leftover, not 137)`);
  console.log(`Reinvest:     ${formatEther(plan.reinvestWei)} ETH → berth`);
  console.log(`Captain cut:  ${formatEther(plan.captainsCutWei)} ETH (333 bps of real profit)`);
  console.log(`Self-funding: ${plan.selfFunding}  phase=${plan.nextPhase}`);
  console.log(`Berth:        ${berth ?? "(no bytecode)"}`);
  console.log(`Deploy:       ${deploy.status}  ${deploy.detail}`);
  if (deploy.txHash) console.log(`Tx:           https://etherscan.io/tx/${deploy.txHash}`);
  console.log(`claim value   0`);
  console.log("");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
