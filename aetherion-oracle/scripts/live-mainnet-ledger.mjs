#!/usr/bin/env node
/**
 * Live mainnet ledger + contract atlas.
 * Reads public RPCs. Never broadcasts without LEDGER_LIVE + own key + L1 gas.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, erc20Abi } from "viem";
import { base, mainnet, zksync } from "viem/chains";
import {
  L1_USDC,
  LIVE_LEDGER_RPC,
  SOLANA_DERIVED_EVM,
  buildLiveMainnetLedger,
  documentedLiveSubjects,
  isLedgerLive,
} from "../src/lib/liveMainnetLedger.ts";
import { SKYNT_PORTFOLIO_EVM } from "../src/lib/bridgeKeyResolver.ts";
import { buildContractAtlas, serializeContractAtlas } from "../src/lib/contractAtlas.ts";
import { resolveBridgeKey } from "../src/lib/bridgeKeyResolver.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LEDGER_OUT = join(ROOT, "public/treasure/live-mainnet-ledger.json");
const ATLAS_OUT = join(ROOT, "public/treasure/contract-atlas.json");
const UA = { fetchOptions: { headers: { "user-agent": "aetherion-live-ledger/1.0" } } };

function client(chain, url) {
  return createPublicClient({ chain, transport: http(url, UA) });
}

async function head(c) {
  try {
    const b = await c.getBlock({ blockTag: "latest" });
    return { number: Number(b.number), baseFee: b.baseFeePerGas ?? 0n };
  } catch {
    return { number: null, baseFee: 0n };
  }
}

async function account(c, address) {
  try {
    const [wei, code] = await Promise.all([c.getBalance({ address }), c.getCode({ address })]);
    return { wei, hasCode: !!code && code !== "0x" };
  } catch {
    return { wei: 0n, hasCode: false };
  }
}

async function main() {
  const eth = client(mainnet, LIVE_LEDGER_RPC.ethereum);
  const zk = client(zksync, LIVE_LEDGER_RPC.zksync);
  const bas = client(base, LIVE_LEDGER_RPC.base);
  const [ethHead, zkHead, baseHead] = await Promise.all([head(eth), head(zk), head(bas)]);

  const subjects = documentedLiveSubjects();
  const accounts = [];
  for (const s of subjects) {
    const c = s.chain === "zksync" ? zk : s.chain === "base" ? bas : eth;
    const snap = await account(c, s.address);
    accounts.push({ ...s, wei: snap.wei, hasCode: snap.hasCode });
  }

  let usdcRaw = 0n;
  try {
    usdcRaw = await eth.readContract({
      address: L1_USDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [SKYNT_PORTFOLIO_EVM],
    });
  } catch {
    usdcRaw = 0n;
  }

  let wormholeOwnOps = 0;
  try {
    const res = await fetch(
      `https://api.wormholescan.io/api/v1/operations?address=${SKYNT_PORTFOLIO_EVM}&pageSize=1`,
      { headers: { "user-agent": "aetherion-live-ledger/1.0" } },
    );
    if (res.ok) {
      const json = await res.json();
      wormholeOwnOps = Array.isArray(json.operations) ? json.operations.length : 0;
    }
  } catch {
    wormholeOwnOps = 0;
  }

  let signer = null;
  try {
    signer = resolveBridgeKey();
  } catch {
    signer = null;
  }

  const live = isLedgerLive();
  const ledger = buildLiveMainnetLedger({
    live,
    signerPresent: !!signer,
    signerSource: signer?.source ?? null,
    signerAddress: signer?.address ?? null,
    ethereumBlock: ethHead.number,
    zksyncBlock: zkHead.number,
    baseBlock: baseHead.number,
    l1BaseFeeWei: ethHead.baseFee,
    accounts,
    usdcRaw,
    wormholeOwnOps,
    updatedAt: new Date().toISOString(),
  });

  const berth = accounts.find((a) => a.role === "create2_berth");
  const skynt = accounts.find((a) => a.role === "skynt_portfolio" && a.chain === "ethereum");
  let uruuCode = false;
  try {
    const code = await zk.getCode({ address: "0x5B6C9d85465Cc6FFe84039183872239657D90208" });
    uruuCode = !!code && code !== "0x";
  } catch {
    uruuCode = false;
  }
  let factoryCode = false;
  try {
    const code = await eth.getCode({ address: "0x4e59b44847b379578588920cA78FbF26c0B4956C" });
    factoryCode = !!code && code !== "0x";
  } catch {
    factoryCode = false;
  }
  let scavengerCode = false;
  try {
    const code = await eth.getCode({ address: "0xd8b934580fcE35a11B58C6D73aDee468a2833fa8" });
    scavengerCode = !!code && code !== "0x";
  } catch {
    scavengerCode = false;
  }

  const atlas = buildContractAtlas({
    updatedAt: ledger.updatedAt,
    liveDeployed: {
      skynt: !!skynt?.hasCode,
      berth: !!berth?.hasCode,
      uruu: uruuCode,
      create2: factoryCode,
      scavenger: scavengerCode,
      "zksync-diamond": true,
      "wormhole-bridge": true,
    },
  });

  writeFileSync(LEDGER_OUT, `${JSON.stringify(ledger, null, 2)}\n`);
  writeFileSync(ATLAS_OUT, serializeContractAtlas(atlas));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  LIVE MAINNET LEDGER + CONTRACT ATLAS                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`L1 head:        ${ledger.heads.ethereumBlock} @ ${ledger.heads.l1Gwei.toFixed(6)} gwei`);
  console.log(`Hash:           ${ledger.hash}`);
  console.log(`Native ≈        ${ledger.totals.nativeEth.toFixed(6)} ETH + tokens $${ledger.totals.nativeUsd.toFixed(2)}`);
  console.log(`Berth empty:    ${ledger.berth.empty}`);
  console.log(`Operator L1:    ${ledger.operator.l1Wei} wei · broadcast=${ledger.operator.canBroadcast}`);
  console.log(`Wormhole own:   ${ledger.wormholeOwnOps}`);
  console.log(`Anchor:         ${ledger.anchor.blocker ?? "ready"}`);
  console.log(`Our live nodes: ${atlas.honesty.ourDeployedContracts}`);
  console.log(`Optimize #1:    ${atlas.optimize[0].title}`);
  console.log("");
  console.log(ledger.note);
  console.log(atlas.note);
  console.log("");
  console.log(`Wrote ${LEDGER_OUT}`);
  console.log(`Wrote ${ATLAS_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
