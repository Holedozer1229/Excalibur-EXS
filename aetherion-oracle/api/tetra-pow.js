/**
 * Origin gossip for Tetra-PoW. Serverless memory is ephemeral — genesis constants
 * are always returned. Peers keep the long chain in localStorage + BroadcastChannel.
 * Hash must match src/lib/tetraPow.ts (four-lane XOR SHA-256).
 */
import { createHash } from "node:crypto";

const TETRA_TICK = "EXCAL";
const SATOSHI_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const SATOSHI_TXID = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
const SATOSHI_TIMES = "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks";

function sha256(buf) {
  return createHash("sha256").update(buf).digest();
}

function tetraHash(preimage) {
  const input = Buffer.isBuffer(preimage) ? preimage : Buffer.from(preimage);
  const lanes = [0, 1, 2, 3].map((lane) => sha256(Buffer.concat([input, Buffer.from([lane])])));
  const mix = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) mix[i] = lanes[0][i] ^ lanes[1][i] ^ lanes[2][i] ^ lanes[3][i];
  return sha256(mix).toString("hex");
}

function headerPreimage(block) {
  return [
    block.height,
    block.prevHash,
    block.timestamp,
    block.bits,
    block.nonce,
    block.miner,
    block.quantumRoot,
  ].join("|");
}

function meetsDifficulty(hashHex, bits) {
  const hex = String(hashHex).replace(/^0x/i, "");
  const fullBytes = Math.floor(bits / 8);
  const rem = bits % 8;
  for (let i = 0; i < fullBytes; i += 1) {
    if (hex.slice(i * 2, i * 2 + 2) !== "00") return false;
  }
  if (rem === 0) return true;
  const next = Number.parseInt(hex.slice(fullBytes * 2, fullBytes * 2 + 2) || "ff", 16);
  const mask = 0xff << (8 - rem);
  return (next & mask) === 0;
}

function quantumRoot(nodes) {
  if (!Array.isArray(nodes)) return "";
  const payload = nodes.map((n) => `${n.id}:${n.state}:${n.hexagram}:${n.harmony}`).join(";");
  return sha256(Buffer.from(payload, "utf8")).toString("hex");
}

function verifyBlock(block, prev) {
  if (!block || typeof block !== "object") return false;
  if (block.tick !== TETRA_TICK) return false;
  if (block.hash !== tetraHash(headerPreimage(block))) return false;
  if (!meetsDifficulty(block.hash, block.bits)) return false;
  if (quantumRoot(block.nodes) !== block.quantumRoot) return false;
  if (!prev) {
    return block.height === 0 && block.prevHash === "0".repeat(64);
  }
  return block.height === prev.height + 1 && block.prevHash === prev.hash;
}

function validChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;
  return chain.every((block, index) => verifyBlock(block, index === 0 ? null : chain[index - 1]));
}

function genesisSeed() {
  return {
    kind: "tetra-pow",
    tick: TETRA_TICK,
    satoshi: {
      address: SATOSHI_ADDRESS,
      txid: SATOSHI_TXID,
      times: SATOSHI_TIMES,
      neverSweep: true,
    },
    honesty: {
      ledgerExcalNotL1: true,
      p2pIsOriginGossip: true,
      serverlessMemoryEphemeral: true,
      doesNotMint137Eth: true,
      excalNotBtc: true,
      cannotSweepGenesis: true,
      notOneToOneBtc: true,
    },
    chain: [],
  };
}

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        body = {};
      }
    }
    const chain = body?.chain;
    const ok = validChain(chain);
    res.status(ok ? 200 : 400).send(
      JSON.stringify({
        ...genesisSeed(),
        accepted: ok,
        height: ok ? chain[chain.length - 1].height : 0,
        chain: ok ? chain : [],
      }),
    );
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send(JSON.stringify({ error: "method" }));
    return;
  }
  res.status(200).send(JSON.stringify(genesisSeed()));
}
