#!/usr/bin/env node
/**
 * CPU-mine Tetra-PoW genesis (+ optional extra blocks) and write public/treasure/tetra-pow.json.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TETRA_DIFFICULTY_BITS,
  TETRA_POW_PATH,
  buildGenesis,
  buildTetraView,
  draftNextBlock,
  mineBlock,
} from "../src/lib/tetraPow.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bits = Number(process.env.TETRA_BITS || TETRA_DIFFICULTY_BITS);
const extra = Number(process.env.TETRA_EXTRA_BLOCKS || 1);

const genesis = buildGenesis(bits);
const chain = [genesis];
for (let i = 0; i < extra; i += 1) {
  chain.push(mineBlock(draftNextBlock(chain[chain.length - 1], "origin-cpu")));
}

const view = buildTetraView(chain);
const dest = join(ROOT, "public", TETRA_POW_PATH.replace(/^\//, ""));
writeFileSync(dest, `${JSON.stringify(view, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ok: true,
      dest,
      height: view.height,
      tipHash: view.tip.hash,
      supply: view.supply,
      satoshi: view.satoshi.address,
      neverSweep: view.satoshi.neverSweep,
    },
    null,
    2,
  ),
);
