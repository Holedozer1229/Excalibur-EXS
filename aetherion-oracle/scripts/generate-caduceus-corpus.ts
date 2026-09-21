// Deno script: generate millions of Caduceus {engine_state → resolution} pairs
// and stream them into JSONL shards under an output directory. Meant for
// producing RAG seed data and fine-tuning corpora offline (no DB, no embeddings).
//
// Run:
//   deno run --allow-read --allow-write --allow-env --allow-net \
//     scripts/generate-caduceus-corpus.ts \
//     --count 2000000 --shard 100000 --out ./data/caduceus
//
// Flags:
//   --count   total pairs to emit (default 1_000_000)
//   --shard   pairs per JSONL shard file (default 100_000)
//   --out     output directory (default ./data/caduceus)
//   --seed    starting index offset (for resumable runs, default 0)
//   --words   optional path to a newline-delimited custom lexicon
//   --modifiers  optional path to newline-delimited modifiers
//   --format  "training" (prompt/completion) | "rag" (word + engine_state + resolution)
//             | "both" (default) — writes two shards per batch.
//   --upload  upload each finished shard + a manifest to Supabase Storage using
//             resumable (tus) multipart uploads. Requires SUPABASE_URL and
//             SUPABASE_SERVICE_ROLE_KEY (or --key) in the environment.
//   --bucket  storage bucket for uploads (default "corpus-shards")
//   --prefix  key prefix inside the bucket (default "caduceus/<run-id>")
//   --key     override the storage API key (defaults to SUPABASE_SERVICE_ROLE_KEY)
//   --keep    keep local shard files after a successful upload (default: keep;
//             pass --keep false to delete each shard once uploaded)
//
// Uploads are resumable: interrupted transfers are continued from the byte
// offset the server confirmed, tracked in <out>/.upload-state.json.
//
// Each pair records the full CaduceusResult snapshot plus the natural-language
// resolution built by _shared/caduceusCorpus.ts, so it can be re-embedded or
// re-serialized for any downstream trainer.

import { createCaduceus } from "../supabase/functions/_shared/caduceus.ts";
import {
  buildResolution,
  embedInputFor,
  SEED_WORDS,
  PHASE_MODIFIERS,
} from "../supabase/functions/_shared/caduceusCorpus.ts";
import { ResumableUploader } from "./lib/resumableUpload.ts";

interface Args {
  count: number;
  shard: number;
  out: string;
  seed: number;
  words?: string;
  modifiers?: string;
  format: "training" | "rag" | "both";
  upload: boolean;
  bucket: string;
  prefix?: string;
  key?: string;
  keep: boolean;
}

function parseArgs(): Args {
  const args = Deno.args;
  const get = (k: string, d?: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const has = (k: string) => args.includes(`--${k}`);
  return {
    count: parseInt(get("count", "1000000")!, 10),
    shard: parseInt(get("shard", "100000")!, 10),
    out: get("out", "./data/caduceus")!,
    seed: parseInt(get("seed", "0")!, 10),
    words: get("words"),
    modifiers: get("modifiers"),
    format: (get("format", "both") as Args["format"]),
    upload: has("upload"),
    bucket: get("bucket", "corpus-shards")!,
    prefix: get("prefix"),
    key: get("key"),
    keep: get("keep", "true") !== "false",
  };
}


async function loadLines(path?: string): Promise<string[] | null> {
  if (!path) return null;
  const txt = await Deno.readTextFile(path);
  return txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function pad(n: number, w = 5) {
  return n.toString().padStart(w, "0");
}

async function main() {
  const args = parseArgs();
  await Deno.mkdir(args.out, { recursive: true });

  const words = (await loadLines(args.words)) ?? SEED_WORDS;
  const modifiers = (await loadLines(args.modifiers)) ?? PHASE_MODIFIERS;
  const combos = words.length * modifiers.length;
  console.log(
    `[caduceus-gen] words=${words.length} modifiers=${modifiers.length} combos=${combos} ` +
      `target=${args.count} shard=${args.shard} out=${args.out}`,
  );

  const staff = await createCaduceus("corpus-generator");

  let emitted = 0;
  let shardIdx = Math.floor(args.seed / args.shard);
  let ragHandle: Deno.FsFile | null = null;
  let trainHandle: Deno.FsFile | null = null;
  let inShard = 0;
  const encoder = new TextEncoder();
  const bigintReplacer = (_: string, v: unknown) =>
    typeof v === "bigint" ? v.toString() : v;
  const stringify = (o: unknown) => JSON.stringify(o, bigintReplacer);


  async function openShard() {
    const base = `${args.out}/shard-${pad(shardIdx)}`;
    if (args.format !== "training") {
      ragHandle = await Deno.open(`${base}.rag.jsonl`, {
        create: true, append: true, write: true,
      });
    }
    if (args.format !== "rag") {
      trainHandle = await Deno.open(`${base}.train.jsonl`, {
        create: true, append: true, write: true,
      });
    }
    inShard = 0;
  }

  async function rollShard() {
    if (ragHandle) { ragHandle.close(); ragHandle = null; }
    if (trainHandle) { trainHandle.close(); trainHandle = null; }
    shardIdx++;
    await openShard();
  }

  await openShard();
  const t0 = Date.now();

  for (let i = args.seed; i < args.seed + args.count; i++) {
    const w = words[i % words.length];
    const m = modifiers[Math.floor(i / words.length) % modifiers.length];
    const word = m ? `${w}${m}` : w;

    const result = await staff.speakBoth(word);
    const resolution = buildResolution(word, result);
    const embedInput = embedInputFor(word, result, resolution);

    if (ragHandle) {
      const row = {
        idx: i,
        word,
        resolution,
        embed_input: embedInput,
        hexagram_number: result.aetherion.hexagram.number,
        aetherion_phase: result.aetherion.state,
        harmony: result.aetherion.harmony,
        engine_state: result,
      };
      await ragHandle.write(encoder.encode(stringify(row) + "\n"));
    }
    if (trainHandle) {
      const row = {
        idx: i,
        prompt:
          `You are the Caduceus oracle. Given the seeker's word and the engine snapshot, ` +
          `produce a coherent resolution.\n\nWord: ${word}\nEngine: ${stringify({
            phase: result.aetherion.state,
            harmony: Number(result.aetherion.harmony.toFixed(3)),
            hexagram: result.aetherion.hexagram.number,
            sphinx: result.sphinx.state,
            anubis: result.anubis.state,
          })}`,
        completion: resolution,
      };
      await trainHandle.write(encoder.encode(stringify(row) + "\n"));
    }

    emitted++;
    inShard++;
    if (inShard >= args.shard) await rollShard();

    if (emitted % 10000 === 0) {
      const dt = (Date.now() - t0) / 1000;
      const rate = emitted / dt;
      const eta = (args.count - emitted) / rate;
      console.log(
        `[caduceus-gen] ${emitted}/${args.count} pairs — ${rate.toFixed(0)}/s — ` +
          `shard ${shardIdx} — ETA ${(eta / 60).toFixed(1)}m`,
      );
    }
  }

  if (ragHandle) ragHandle.close();
  if (trainHandle) trainHandle.close();

  const dt = (Date.now() - t0) / 1000;
  console.log(
    `[caduceus-gen] done — ${emitted} pairs in ${dt.toFixed(1)}s ` +
      `(${(emitted / dt).toFixed(0)}/s) across shards 0..${shardIdx}`,
  );
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("[caduceus-gen] fatal:", e);
    Deno.exit(1);
  });
}
