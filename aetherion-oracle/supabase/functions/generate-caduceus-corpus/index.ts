// Admin-only: generate synthetic {engine_state → resolution} pairs from the
// Sphinx/Anubis/Aetherion logic and store them (with embeddings) in
// public.caduceus_corpus. Also seeds public.hexagram_docs on demand.
//
// POST body:
//   { mode?: "corpus" | "hexagrams" | "both", count?: number, offset?: number,
//     words?: string[], modifiers?: boolean, embed?: boolean, seed_extra?: string }
//
// Response: { inserted_corpus, inserted_hexagrams, next_offset, done }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { createCaduceus } from "../_shared/caduceus.ts";
import { HEXAGRAMS_FULL } from "../_shared/phonon.ts";
import {
  SEED_WORDS,
  PHASE_MODIFIERS,
  buildResolution,
  embedInputFor,
  hexagramDocRow,
  embedBatch,
  toVectorLiteral,
  EMBED_BATCH_LIMIT,
} from "../_shared/caduceusCorpus.ts";

const Body = z.object({
  mode: z.enum(["corpus", "hexagrams", "both"]).default("corpus"),
  count: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
  words: z.array(z.string().min(1).max(64)).max(2000).optional(),
  modifiers: z.boolean().default(true),
  embed: z.boolean().default(true),
  seed_extra: z.string().max(64).optional(),
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Expand a base seed list into all (word, modifier) combinations. */
function expandSeeds(words: string[], useModifiers: boolean): string[] {
  const mods = useModifiers ? PHASE_MODIFIERS : [""];
  const out: string[] = [];
  for (const w of words) for (const m of mods) out.push(w + m);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // Auth: require admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supaAuth = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u, error: uErr } = await supaAuth.auth.getUser(token);
  if (uErr || !u?.user) return json(401, { error: "unauthorized" });
  const { data: isAdmin, error: rErr } = await supaAuth.rpc("has_role", {
    _user_id: u.user.id, _role: "admin",
  });
  if (rErr || !isAdmin) return json(403, { error: "admin_only" });

  // Parse body.
  let parsed;
  try {
    parsed = Body.safeParse(await req.json().catch(() => ({})));
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
  const { mode, count, offset, words, modifiers, embed, seed_extra } = parsed.data;

  const supa = createClient(url, service);
  let inserted_corpus = 0;
  let inserted_hexagrams = 0;
  let next_offset = offset;
  let done = false;

  // ---- Hexagram doc seeding ----
  if (mode === "hexagrams" || mode === "both") {
    const rows: Array<Record<string, unknown>> = [];
    const inputs: string[] = [];
    for (const hex of HEXAGRAMS_FULL) {
      const row = hexagramDocRow(hex);
      rows.push(row);
      inputs.push(`${row.title}. ${row.content}`);
    }
    // Embed in batches of 100, upsert per-batch to avoid parameter-count issues.
    if (embed) {
      for (let i = 0; i < rows.length; i += EMBED_BATCH_LIMIT) {
        const batch = rows.slice(i, i + EMBED_BATCH_LIMIT);
        const vecs = await embedBatch(inputs.slice(i, i + EMBED_BATCH_LIMIT));
        batch.forEach((r, k) => { r.embedding = toVectorLiteral(vecs[k]); });
        // Delete-then-insert (avoids conflict-target complexity on the halfvec index).
        const nums = batch.map((r) => r.hexagram_number);
        await supa.from("hexagram_docs").delete()
          .eq("kind", "hexagram").in("hexagram_number", nums as number[]);
        const { error } = await supa.from("hexagram_docs").insert(batch);
        if (error) return json(500, { error: `hexagram_insert: ${error.message}` });
        inserted_hexagrams += batch.length;
      }
    } else {
      await supa.from("hexagram_docs").delete().eq("kind", "hexagram");
      const { error } = await supa.from("hexagram_docs").insert(rows);
      if (error) return json(500, { error: `hexagram_insert: ${error.message}` });
      inserted_hexagrams = rows.length;
    }
  }

  // ---- Corpus generation ----
  if (mode === "corpus" || mode === "both") {
    const base = words && words.length ? words : SEED_WORDS;
    const expanded = expandSeeds(base, modifiers);
    if (offset >= expanded.length) {
      done = true;
    } else {
      const slice = expanded.slice(offset, offset + count);
      next_offset = offset + slice.length;
      done = next_offset >= expanded.length;

      // Compute engine states.
      const rows: Array<Record<string, unknown>> = [];
      const inputs: string[] = [];
      for (const w of slice) {
        const staff = await createCaduceus(seed_extra ? `${seed_extra}:${w}` : w);
        const r = await staff.speakBoth(w);
        const resolution = buildResolution(w, r);
        const engine_state = {
          word: w,
          sphinx: {
            state: r.sphinx.state,
            wisdom: r.sphinx.wisdom,
            contemplation: r.sphinx.contemplation,
            phonon: r.sphinx.phonon,
          },
          anubis: {
            state: r.anubis.state,
            chaos: r.anubis.chaos,
            stillness: r.anubis.stillness,
            phonon: r.anubis.phonon,
          },
          aetherion: {
            state: r.aetherion.state,
            harmony: r.aetherion.harmony,
            hexagram: r.aetherion.hexagram,
          },
          axis: r.axis.toString(),
        };
        rows.push({
          word: w,
          engine_state,
          resolution,
          hexagram_number: r.aetherion.hexagram.number,
          aetherion_phase: r.aetherion.state,
          harmony: Number(r.aetherion.harmony.toFixed(4)),
          tags: [
            r.aetherion.state.toLowerCase(),
            `hex-${r.aetherion.hexagram.number}`,
            r.aetherion.hexagram.element.toLowerCase(),
            r.aetherion.hexagram.phase,
          ],
          seed: Number(BigInt.asIntN(64, r.axis)),
        });
        inputs.push(embedInputFor(w, r, resolution));
      }

      // Embed in batches.
      if (embed && rows.length) {
        for (let i = 0; i < rows.length; i += EMBED_BATCH_LIMIT) {
          const batchRows = rows.slice(i, i + EMBED_BATCH_LIMIT);
          const vecs = await embedBatch(inputs.slice(i, i + EMBED_BATCH_LIMIT));
          batchRows.forEach((r, k) => { r.embedding = toVectorLiteral(vecs[k]); });
        }
      }

      // Insert (chunk to keep individual requests small).
      const CHUNK = 100;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supa.from("caduceus_corpus")
          .insert(rows.slice(i, i + CHUNK));
        if (error) return json(500, { error: `corpus_insert: ${error.message}` });
        inserted_corpus += Math.min(CHUNK, rows.length - i);
      }
    }
  }

  return json(200, {
    ok: true, mode, inserted_corpus, inserted_hexagrams,
    next_offset, done,
    total_expanded: mode === "hexagrams"
      ? HEXAGRAMS_FULL.length
      : expandSeeds(words?.length ? words : SEED_WORDS, modifiers).length,
  });
});
