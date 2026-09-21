#!/usr/bin/env node
/**
 * Probe live wrap components and write public/treasure/wrap-live.json.
 * WETH + mailbox + URUU token are expected live. fair_lattice mainnet is not.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { L1_WETH } from "../src/lib/eipUruuBridgeClaim.ts";
import { URUU_ADDRESS } from "../src/lib/uruu.ts";
import { ZKSYNC_L1_DIAMOND } from "../src/lib/vacuumWatch.ts";
import { FAIR_LATTICE_PROGRAM_ID } from "../src/lib/solana/fairLatticeProgram.ts";
import { WRAP_LIVE_PATH, buildWrapLiveView, serializeWrapLive } from "../src/lib/wrapLive.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETH_RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";
const ZK_RPC = process.env.ZKSYNC_RPC ?? "https://mainnet.era.zksync.io";
const SOL_RPC = process.env.SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";

async function ethCode(rpc, address) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"] }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  const code = String(json.result ?? "0x");
  return code !== "0x" && code !== "0x0";
}

async function solanaProgram(rpc, programId) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [programId, { encoding: "base64" }],
    }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  return Boolean(json.result?.value);
}

const [wethHasCode, mailboxHasCode, uruuHasCode, fairLatticeMainnet] = await Promise.all([
  ethCode(ETH_RPC, L1_WETH),
  ethCode(ETH_RPC, ZKSYNC_L1_DIAMOND),
  ethCode(ZK_RPC, URUU_ADDRESS),
  solanaProgram(SOL_RPC, FAIR_LATTICE_PROGRAM_ID.toBase58()),
]);

const view = buildWrapLiveView({ wethHasCode, mailboxHasCode, uruuHasCode, fairLatticeMainnet });
const dest = join(ROOT, "public", WRAP_LIVE_PATH.replace(/^\//, ""));
writeFileSync(dest, serializeWrapLive(view));
console.log(
  JSON.stringify(
    {
      ok: true,
      dest,
      wethHasCode,
      mailboxHasCode,
      uruuHasCode,
      fairLatticeMainnet,
      wethLive: view.weth.live,
      uruuCustodyWrapLive: view.uruu.custodyWrapLive,
    },
    null,
    2,
  ),
);
