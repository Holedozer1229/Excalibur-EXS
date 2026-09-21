#!/usr/bin/env node
/**
 * Re-encode SKYNT ledger as Bitcoin addresses and probe mempool.space.
 * Curiosity only. Does not spend. Does not mint 137 BTC.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SKYNT_AS_BITCOIN_PATH,
  buildSkyntAsBitcoin,
  serializeSkyntAsBitcoin,
} from "../src/lib/skyntAsBitcoin.ts";
import { BITCOIN_GENESIS_TXID } from "../src/lib/skyntBitcoinWitness.ts";
import { SKYNT_EVM_RPCS, applySkyntChainLive } from "../src/lib/skyntChainFingerprint.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", SKYNT_AS_BITCOIN_PATH.replace(/^\//, ""));

const UA = { "user-agent": "aetherion-skynt-btc/2" };

async function probe(addr) {
  const url = `https://mempool.space/api/address/${addr}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return { sats: 0, tx: 0, ok: false };
  const json = await res.json();
  const chain = json.chain_stats ?? {};
  const mem = json.mempool_stats ?? {};
  const funded = Number(chain.funded_txo_sum ?? 0) + Number(mem.funded_txo_sum ?? 0);
  const spent = Number(chain.spent_txo_sum ?? 0) + Number(mem.spent_txo_sum ?? 0);
  return { sats: funded - spent, tx: Number(chain.tx_count ?? 0), ok: true };
}

async function probeScriptHash(hash) {
  const res = await fetch(`https://mempool.space/api/scripthash/${hash}`, { headers: UA });
  if (!res.ok) return { tx: 0, ok: false };
  const json = await res.json();
  return { tx: Number(json.chain_stats?.tx_count ?? 0) + Number(json.mempool_stats?.tx_count ?? 0), ok: true };
}

async function probeTx(txid) {
  const res = await fetch(`https://mempool.space/api/tx/${txid}`, { headers: UA });
  if (!res.ok) return { found: false, text: "" };
  const json = await res.json();
  return { found: true, text: JSON.stringify(json).toLowerCase() };
}

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...UA, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) return { ok: false };
  const json = await res.json();
  if (json.error) return { ok: false };
  return { ok: true, result: json.result };
}

async function probeEvm(chain, evm) {
  try {
    const [bal, code, nonce] = await Promise.all([
      rpc(chain.rpc, "eth_getBalance", [evm, "latest"]),
      rpc(chain.rpc, "eth_getCode", [evm, "latest"]),
      rpc(chain.rpc, "eth_getTransactionCount", [evm, "latest"]),
    ]);
    const wei = bal.ok ? BigInt(bal.result).toString() : "0";
    const hasCode = Boolean(code.ok && typeof code.result === "string" && code.result !== "0x" && code.result !== "0x0");
    return {
      id: chain.id,
      name: chain.name,
      chainId: chain.chainId,
      wei,
      nonce: nonce.ok ? Number(nonce.result) : 0,
      hasCode,
      rpcOk: Boolean(bal.ok && code.ok),
    };
  } catch {
    return { id: chain.id, name: chain.name, chainId: chain.chainId, wei: "0", nonce: 0, hasCode: false, rpcOk: false };
  }
}

async function jsonGet(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  const view = buildSkyntAsBitcoin();
  try {
    const [p2pkh, p2wpkh] = await Promise.all([
      probe(view.bitcoin.p2pkh),
      probe(view.bitcoin.p2wpkh),
    ]);
    view.probe = {
      source: "mempool.space",
      p2pkhSats: p2pkh.sats,
      p2wpkhSats: p2wpkh.sats,
      p2pkhTxCount: p2pkh.tx,
      p2wpkhTxCount: p2wpkh.tx,
    };
  } catch {
    /* probe optional */
  }
  try {
    const w = view.witness;
    const [skyntOp, postedOp, genesis, sha, dsha, padL, padR] = await Promise.all([
      probeScriptHash(w.opReturn.scriptHash),
      probeScriptHash(w.opReturn.postedScriptHash),
      probeTx(BITCOIN_GENESIS_TXID),
      probeTx(w.derivedTxids.sha256),
      probeTx(w.derivedTxids.doubleSha256),
      probeTx(w.derivedTxids.padLeft),
      probeTx(w.derivedTxids.padRight),
    ]);
    const found = [];
    if (sha.found) found.push("sha256");
    if (dsha.found) found.push("doubleSha256");
    if (padL.found) found.push("padLeft");
    if (padR.found) found.push("padRight");
    view.witnessLive = {
      source: "mempool.space",
      control: {
        genesisTxid: BITCOIN_GENESIS_TXID,
        found: genesis.found,
        coinbaseHasSkynt: genesis.text.includes(w.hash160Hex),
        coinbaseHasPostedOpReturn: genesis.text.includes(w.opReturn.postedHex),
      },
      opReturnSkyntTxCount: skyntOp.tx,
      opReturnPostedTxCount: postedOp.tx,
      derivedTxidsFound: found,
    };
  } catch {
    /* live compare optional */
  }
  try {
    const evm = view.chains.encodings.evm;
    const enc = view.chains.encodings;
    const [evmRows, ltc, ltcBech, doge, bch, dash, raven, tron] = await Promise.all([
      Promise.all(SKYNT_EVM_RPCS.map((c) => probeEvm(c, evm))),
      jsonGet(`https://litecoinspace.org/api/address/${enc.litecoinP2pkh}`),
      jsonGet(`https://litecoinspace.org/api/address/${enc.litecoinP2wpkh}`),
      jsonGet(`https://api.blockcypher.com/v1/doge/main/addrs/${enc.dogeP2pkh}/balance`),
      jsonGet(`https://api.bitcore.io/api/BCH/mainnet/address/${enc.bitcoinCashLegacy}/balance`),
      jsonGet(`https://insight.dash.org/insight-api/addr/${enc.dashP2pkh}/?noTxList=1`),
      jsonGet(`https://blockbook.ravencoin.org/api/v2/address/${enc.ravenP2pkh}?details=basic`),
      jsonGet(`https://api.trongrid.io/v1/accounts/${enc.tron}`),
    ]);
    const utxo = [
      {
        family: "ltc",
        address: enc.litecoinP2pkh,
        sats: Number(ltc?.chain_stats?.funded_txo_sum ?? 0) - Number(ltc?.chain_stats?.spent_txo_sum ?? 0),
        txs: Number(ltc?.chain_stats?.tx_count ?? 0),
        ok: Boolean(ltc?.address),
      },
      {
        family: "ltc-bech32",
        address: enc.litecoinP2wpkh,
        sats: Number(ltcBech?.chain_stats?.funded_txo_sum ?? 0) - Number(ltcBech?.chain_stats?.spent_txo_sum ?? 0),
        txs: Number(ltcBech?.chain_stats?.tx_count ?? 0),
        ok: Boolean(ltcBech?.address),
      },
      {
        family: "doge",
        address: enc.dogeP2pkh,
        sats: Number(doge?.balance ?? 0),
        txs: Number(doge?.n_tx ?? 0),
        ok: doge?.address === enc.dogeP2pkh,
      },
      {
        family: "bch",
        address: enc.bitcoinCashLegacy,
        sats: Number(bch?.confirmed ?? bch?.balance ?? 0),
        txs: 0,
        ok: bch != null && typeof (bch.balance ?? bch.confirmed) === "number",
      },
      {
        family: "dash",
        address: enc.dashP2pkh,
        sats: Number(dash?.balanceSat ?? 0),
        txs: Number(dash?.txAppearances ?? dash?.txApperances ?? 0),
        ok: dash?.addrStr === enc.dashP2pkh,
      },
      {
        family: "raven",
        address: enc.ravenP2pkh,
        sats: Number(raven?.balance ?? 0),
        txs: Number(raven?.txs ?? 0),
        ok: raven?.address === enc.ravenP2pkh,
      },
      {
        family: "tron",
        address: enc.tron,
        sats: Number(tron?.data?.[0]?.balance ?? 0),
        txs: Array.isArray(tron?.data) ? tron.data.length : 0,
        ok: Array.isArray(tron?.data),
      },
    ];
    view.chains = applySkyntChainLive(view.chains, evmRows, utxo);
  } catch {
    /* cross-chain optional */
  }
  writeFileSync(OUT, serializeSkyntAsBitcoin(view));
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  SKYNT LEDGER → BASE58 / BITCOIN  ·  CURIOSITY               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Ledger:     ${view.skyntLedger}`);
  console.log(`hash160:    ${view.hash160Hex}`);
  console.log(`raw b58:    ${view.rawBase58}`);
  console.log(`P2PKH:      ${view.bitcoin.p2pkh}`);
  console.log(`P2WPKH:     ${view.bitcoin.p2wpkh}`);
  if (view.probe) {
    console.log(`Probe P2PKH:  ${view.probe.p2pkhSats} sats · ${view.probe.p2pkhTxCount} txs`);
    console.log(`Probe P2WPKH: ${view.probe.p2wpkhSats} sats · ${view.probe.p2wpkhTxCount} txs`);
  }
  console.log(`OP_RETURN:   ${view.witness.opReturn.scriptHex}`);
  console.log(`BIP-322:     header ${view.witness.signatures.bip322.header} · 20B ≠ 64B sig · overlap=${view.witness.signatures.bip322.containsSkynt}`);
  if (view.witnessLive) {
    console.log(`Live OP_RETURN SKYNT txs: ${view.witnessLive.opReturnSkyntTxCount}`);
    console.log(`Live OP_RETURN posted txs: ${view.witnessLive.opReturnPostedTxCount}`);
    console.log(`Live derived txids: ${view.witnessLive.derivedTxidsFound.join(",") || "none"}`);
    console.log(`Live genesis control: found=${view.witnessLive.control.found} · contains SKYNT=${view.witnessLive.control.coinbaseHasSkynt}`);
  }
  console.log(`EVM:         ${view.chains.encodings.evm}`);
  console.log(`LTC:         ${view.chains.encodings.litecoinP2pkh}`);
  console.log(`BCH legacy:  ${view.chains.encodings.bitcoinCashLegacy}`);
  console.log(`Closest:     ${view.chains.closestFamily} · liveHits=${view.chains.liveHits}`);
  console.log(view.chains.verdict);
  console.log(view.honesty.note);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
