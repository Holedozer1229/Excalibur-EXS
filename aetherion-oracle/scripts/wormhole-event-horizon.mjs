#!/usr/bin/env node
/**
 * Wormhole horizon status — prints the last own-wallet scan artifact.
 * Full live rescan lives on the horizon branch; this helm hook stays honest
 * about 0 own leftover without importing Node key resolvers into the client.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "public/treasure/wormhole-event-horizon.json");

const json = JSON.parse(readFileSync(PATH, "utf8"));
const own =
  (Array.isArray(json.ownHarvestable) ? json.ownHarvestable.length : 0) +
  (Array.isArray(json.ownUnredeemed) ? json.ownUnredeemed.length : 0);

console.log(
  JSON.stringify(
    {
      kind: json.kind,
      updatedAt: json.updatedAt,
      ownLeftover: own,
      harvestable: false,
      note: json.note,
      honesty: json.honesty?.note,
    },
    null,
    2,
  ),
);
if (own === 0) process.exit(0);
