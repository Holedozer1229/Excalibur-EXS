#!/usr/bin/env node
/**
 * Artificial Dust Mill — grind leftover into labeled crumbs (dry-run default).
 * Writes public/treasure/artificial-dust.json
 *
 * Phantom lots never count as profit. Live scatter needs ARTIFICIAL_DUST_LIVE + own key.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LAST_VACUUM_NET_WEI } from "../src/lib/engineSelfFund.ts";
import {
  buildArtificialDust,
  isArtificialDustLive,
  serializeArtificialDust,
} from "../src/lib/artificialDust.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public/treasure/artificial-dust.json");

async function main() {
  const report = buildArtificialDust({
    seedWei: process.env.ARTIFICIAL_DUST_SEED_WEI ?? LAST_VACUUM_NET_WEI,
    live: isArtificialDustLive(),
    signerAddress: process.env.ARTIFICIAL_DUST_SIGNER ?? null,
    updatedAt: new Date().toISOString(),
  });
  writeFileSync(OUT, serializeArtificialDust(report));

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ARTIFICIAL DUST MILL — maybe crumbs, never 137 ETH          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode:           ${report.mode}`);
  console.log(`Seed:           ${report.seedEth.toFixed(6)} ETH ($${report.seedUsd.toFixed(2)})`);
  console.log(`Repack crumbs:  ${report.crumbCount} · extractable $${report.extractableUsd.toFixed(2)}`);
  console.log(`Phantom lots:   ${report.phantom.length} · $${report.phantomUsd.toFixed(2)} (not profit)`);
  console.log(`Scatter:        ${report.scatter.action} · ${report.scatter.blocker ?? "ready"}`);
  console.log("");
  console.log(report.note);
  console.log(report.honesty.note);
  console.log("");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
