#!/usr/bin/env node
/**
 * Compare HexagramSequenceHash / merkabaDigest vs Bitcoin-style dual SHA-256.
 *
 *   node scripts/compare-merkaba-dual-sha256.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  hexagramSequenceHash,
  merkabaDigest,
  toHex,
} from "../src/lib/sacredGeometry/hexagramSequenceHash.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TETRA = join(ROOT, "public/treasure/tetra-pow.json");
const OUT = join(ROOT, "public/treasure/merkaba-vs-dual-sha256.json");
const ZERO_TIP = "0000000000000000000000000000000000000000000000000000000000000000";

function utf8(s) {
  return new TextEncoder().encode(s);
}

function dualSha256(message) {
  const bytes = typeof message === "string" ? utf8(message) : message;
  return sha256(sha256(bytes));
}

function dualSha256Hex(message) {
  return toHex(dualSha256(message));
}

/** Sample 80-byte Bitcoin block header (genesis-shaped, little-endian fields). */
function sampleBitcoinHeader() {
  const header = new Uint8Array(80);
  header.set([0x01, 0x00, 0x00, 0x00]); // version
  // prev block hash (32 bytes) — genesis prev is all zeros
  header.set(
    [
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00,
    ],
    4,
  );
  // merkle root (32 bytes) — genesis merkle root
  header.set(
    [
      0x3b, 0xa3, 0xed, 0xfd, 0x7a, 0x7b, 0x12, 0xb2, 0x7a, 0xc7, 0x2c, 0x3e, 0x67, 0x76, 0x8f,
      0x61, 0x7f, 0xc8, 0x1b, 0xc3, 0x88, 0x8a, 0x51, 0x32, 0x3a, 0x9f, 0xb8, 0xaa, 0x4b, 0x1e,
      0x5e, 0x4a,
    ],
    36,
  );
  header.set([0x29, 0xab, 0x5f, 0x49], 68); // timestamp 1231006505
  header.set([0xff, 0xff, 0x00, 0x1d], 72); // bits
  header.set([0x1d, 0xac, 0x2b, 0x7c], 76); // nonce 2083236893
  return header;
}

function merkabaBoundBytes(message, tipHex) {
  const tipNorm = tipHex.replace(/^0x/i, "").slice(0, 64).padEnd(64, "0");
  const tipBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    tipBytes[i] = Number.parseInt(tipNorm.slice(i * 2, i * 2 + 2), 16);
  }
  const msgBytes = typeof message === "string" ? utf8(message) : message;
  const bound = new Uint8Array(msgBytes.length + 32);
  bound.set(msgBytes);
  bound.set(tipBytes, msgBytes.length);
  return bound;
}

function compareCase({ id, label, merkabaHex, preimage, dualHex }) {
  const match = merkabaHex === dualHex;
  return {
    id,
    label,
    preimageDescription: typeof preimage === "string" ? preimage : preimage.description,
    preimageHex: typeof preimage === "string" ? undefined : toHex(preimage.bytes),
    merkabaDigestHex: merkabaHex,
    dualSha256Hex: dualHex,
    verdict: match ? "MATCH" : "NO_MATCH",
    match,
  };
}

function main() {
  const tetra = JSON.parse(readFileSync(TETRA, "utf8"));
  const tipHash = tetra.tip?.hash ?? tetra.genesis?.hash ?? "";

  const cases = [];

  // 1. empty string
  cases.push(
    compareCase({
      id: "empty",
      label: "empty string",
      merkabaHex: toHex(hexagramSequenceHash("")),
      preimage: "",
      dualHex: dualSha256Hex(""),
    }),
  );

  // 2. hello
  cases.push(
    compareCase({
      id: "hello",
      label: '"hello"',
      merkabaHex: toHex(hexagramSequenceHash("hello")),
      preimage: "hello",
      dualHex: dualSha256Hex("hello"),
    }),
  );

  // 3. Tetra-PoW tip hash (UTF-8 hex string)
  if (tipHash) {
    cases.push(
      compareCase({
        id: "tetra-tip-utf8",
        label: `Tetra-PoW tip hash (UTF-8): ${tipHash.slice(0, 16)}…`,
        merkabaHex: toHex(hexagramSequenceHash(tipHash)),
        preimage: tipHash,
        dualHex: dualSha256Hex(tipHash),
      }),
    );
  }

  // 4. merkabaDigest lab seed
  const lab = merkabaDigest(ZERO_TIP, "aqai-chipset-lab");
  const labBound = merkabaBoundBytes("aqai-chipset-lab", ZERO_TIP);
  cases.push(
    compareCase({
      id: "merkaba-lab",
      label: 'merkabaDigest(ZERO_TIP, "aqai-chipset-lab")',
      merkabaHex: lab.digestHex,
      preimage: { description: "message||tipBytes (aqai-chipset-lab + zero tip)", bytes: labBound },
      dualHex: dualSha256Hex(labBound),
    }),
  );

  // 5. merkabaDigest with live Tetra tip
  if (tipHash) {
    const boundTip = merkabaBoundBytes("aqai-chipset-lab", tipHash);
    const live = merkabaDigest(tipHash, "aqai-chipset-lab");
    cases.push(
      compareCase({
        id: "merkaba-lab-live-tip",
        label: `merkabaDigest(tetra tip, "aqai-chipset-lab")`,
        merkabaHex: live.digestHex,
        preimage: {
          description: `message||tipBytes (aqai-chipset-lab + ${tipHash.slice(0, 16)}…)`,
          bytes: boundTip,
        },
        dualHex: dualSha256Hex(boundTip),
      }),
    );
  }

  // 6. Bitcoin block header sample (80 bytes)
  const header = sampleBitcoinHeader();
  cases.push(
    compareCase({
      id: "btc-header-sample",
      label: "Bitcoin genesis-shaped 80-byte header",
      merkabaHex: toHex(hexagramSequenceHash(header)),
      preimage: { description: "80-byte block header sample", bytes: header },
      dualHex: toHex(dualSha256(header)),
    }),
  );

  const matchCount = cases.filter((c) => c.match).length;
  const artifact = {
    kind: "merkaba-vs-dual-sha256",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    honesty:
      "Default bitcoin-isomorph mode maps upper Merkaba star (steps 0–2) to SHA256 pass 1 and lower star (steps 3–5) to pass 2. Expect MATCH for all comparison vectors.",
    algorithms: {
      merkaba: "hexagramSequenceHash / merkabaDigest (bitcoin-isomorph, v1.1.0)",
      dualSha256: "SHA256(SHA256(message)) via @noble/hashes",
    },
    summary: {
      total: cases.length,
      matches: matchCount,
      noMatches: cases.length - matchCount,
      anyMatch: matchCount > 0,
    },
    comparisons: cases,
  };

  writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║  MERKABA vs DUAL SHA-256 — side-by-side comparison                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(
    `${"input".padEnd(42)} | ${"merkabaDigest".slice(0, 16)}… | ${"dualSha256".slice(0, 16)}… | match`,
  );
  console.log("-".repeat(110));

  for (const c of cases) {
    const input = c.label.length > 40 ? `${c.label.slice(0, 37)}…` : c.label;
    const m = c.merkabaDigestHex.slice(0, 16);
    const d = c.dualSha256Hex.slice(0, 16);
    console.log(
      `${input.padEnd(42)} | ${m}… | ${d}… | ${c.match ? "yes" : "no"}`,
    );
    console.log(`  merkaba: ${c.merkabaDigestHex}`);
    console.log(`  dual:    ${c.dualSha256Hex}`);
    console.log("");
  }

  console.log(`Matches: ${matchCount}/${cases.length}`);
  console.log(`Artifact: ${OUT}`);
}

main();
