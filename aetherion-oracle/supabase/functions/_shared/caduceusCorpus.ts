// Shared utilities for the Caduceus corpus generator + RAG layer.
// Builds natural-language resolutions from CaduceusStaff engine states
// and calls the Lovable AI embeddings gateway.

import type { CaduceusResult } from "./caduceus.ts";
import { HEXAGRAMS_FULL } from "./phonon.ts";

export const EMBED_MODEL = "google/gemini-embedding-2";
export const EMBED_DIMS = 3072;
export const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
export const EMBED_BATCH_LIMIT = 100; // per Gemini gateway cap

/** Curated seed lexicon spanning archetypes, elements, virtues, shadows,
 *  cosmology, and the Sphinx/Anubis lex keys. */
export const SEED_WORDS: string[] = [
  // archetypes & phases
  "love", "death", "birth", "shadow", "light", "silence", "sound", "chaos",
  "order", "sacrifice", "return", "descent", "ascent", "witness", "veil",
  "threshold", "mirror", "gate", "spiral", "flame", "abyss", "throne",
  "crown", "seed", "root", "wing", "bone", "breath", "blood", "star",
  // virtues / states
  "harmony", "discord", "wisdom", "folly", "courage", "fear", "hope",
  "despair", "mercy", "judgment", "faith", "doubt", "peace", "war",
  "patience", "urgency", "compassion", "cruelty", "truth", "lie",
  // elements & bodies
  "fire", "water", "earth", "wind", "metal", "wood", "aether", "salt",
  "mercury", "sulfur", "gold", "silver", "iron", "copper", "crystal",
  // cosmology
  "sun", "moon", "eclipse", "comet", "nebula", "black-hole", "singularity",
  "orbit", "gravity", "levity", "void", "abundance", "weight", "density",
  // psyche
  "dream", "memory", "forgetting", "waking", "trance", "vision", "prophecy",
  "oracle", "sigil", "glyph", "rune", "mantra", "prayer", "curse", "blessing",
  // relational
  "father", "mother", "child", "sibling", "lover", "stranger", "enemy",
  "friend", "teacher", "student", "priest", "beggar", "king", "servant",
  // time
  "past", "future", "present", "eternity", "moment", "cycle", "hour",
  "dawn", "dusk", "midnight", "noon", "solstice", "equinox",
  // action
  "begin", "end", "wait", "run", "fall", "rise", "hold", "release",
  "speak", "listen", "cross", "return", "seek", "hide", "reveal", "seal",
  // symbolic
  "excalibur", "caduceus", "hexagram", "phoenix", "serpent", "lion", "eagle",
  "bull", "raven", "wolf", "swan", "dove", "spider", "web", "tree",
  "river", "mountain", "desert", "sea", "cave", "forest",
];

/** Optional modifiers to expand the same seed into multiple resolutions. */
export const PHASE_MODIFIERS = ["", "-inverted", "-echo", "-silent", "-crown", "-shadow"];

/** Build the natural-language resolution for a CaduceusResult snapshot. */
export function buildResolution(word: string, r: CaduceusResult): string {
  const s = r.sphinx;
  const a = r.anubis;
  const ae = r.aetherion;
  const hex = ae.hexagram;
  const wisdom = (s.wisdom ?? 0).toFixed(3);
  const contemplation = (s.contemplation ?? 0).toFixed(3);
  const chaos = (a.chaos ?? 0).toFixed(3);
  const stillness = (a.stillness ?? 0).toFixed(3);
  const harmony = ae.harmony.toFixed(3);
  const sPhon = s.phonon;
  const aPhon = a.phonon;

  const lines: string[] = [];
  lines.push(
    `On the word "${word}", the Caduceus staff resolves under hexagram ${hex.number} — ` +
      `${hex.name} (${hex.meaning}, ${hex.element}/${hex.phase}, lines ${hex.lines}).`,
  );
  lines.push(
    `Aetherion phase: ${ae.state}. Harmony coefficient: ${harmony}.`,
  );
  lines.push(
    `Sphinx collapses to state ${s.state} — wisdom ${wisdom}, contemplation ${contemplation}.`,
  );
  lines.push(
    `Anubis inverts to state ${a.state} — chaos ${chaos}, stillness ${stillness}.`,
  );
  if (sPhon && aPhon) {
    lines.push(
      `Phonon spectrum — Sphinx ground energy ${sPhon.groundEnergy.toFixed(4)}, gap ${sPhon.gap.toFixed(4)}, ` +
        `topological charge ${sPhon.topoCharge}; Anubis mirror ground ${aPhon.groundEnergy.toFixed(4)}, ` +
        `entanglement ${aPhon.entanglement.toFixed(4)}, inverted line-string ${aPhon.lineString}.`,
    );
  }
  // Interpretive gloss keyed to Aetherion phase.
  const gloss: Record<string, string> = {
    HARMONY: "The staff advises coherent action — the two serpents braid; the seeker may proceed and consolidate.",
    DISCORD: "The staff warns of misalignment — Sphinx and Anubis speak past each other; the seeker should pause and re-listen.",
    ECHO: "The staff returns the question — this moment mirrors a prior one; look for the pattern that repeats before choosing.",
    SILENCE: "The staff withdraws — no clear resolution; sit in stillness, let the field settle, and re-cast when signal returns.",
  };
  lines.push(gloss[ae.state] ?? "The staff issues no gloss; interpret the coefficients directly.");
  return lines.join(" ");
}

/** Compact text used as the embedding input for a corpus row. */
export function embedInputFor(word: string, r: CaduceusResult, resolution: string): string {
  const hex = r.aetherion.hexagram;
  return [
    `word=${word}`,
    `hexagram=${hex.number} ${hex.name} (${hex.meaning})`,
    `phase=${r.aetherion.state}`,
    `harmony=${r.aetherion.harmony.toFixed(3)}`,
    resolution,
  ].join(" | ");
}

/** Build one canonical hexagram doc row (used to seed hexagram_docs). */
export function hexagramDocRow(hex: typeof HEXAGRAMS_FULL[number]) {
  const title = `Hexagram ${hex.number}: ${hex.name}`;
  const content = [
    `${title}.`,
    `Meaning: ${hex.meaning}.`,
    `Trigrams: ${hex.trigrams.join(" over ")}. Element: ${hex.element}. Phase: ${hex.phase}.`,
    `Line string (bottom→top): ${hex.lines}.`,
    `In the Caduceus engine, hexagram ${hex.number} is the phonon-resonant ground state ` +
      `when the Sphinx and Anubis speak a word whose spectrum aligns to lines ${hex.lines}. ` +
      `Its ${hex.element} element modulates the harmony coefficient; ${hex.phase} phase governs ` +
      `whether the field advises action (yang) or receptivity (yin).`,
  ].join(" ");
  const tags = [
    "hexagram",
    `n${hex.number}`,
    hex.element.toLowerCase(),
    hex.phase,
    ...hex.trigrams.map((t) => t.toLowerCase()),
  ];
  return { hexagram_number: hex.number, kind: "hexagram", title, content, tags };
}

/** Call the Lovable AI embeddings gateway for a batch of strings (≤100). */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  if (inputs.length > EMBED_BATCH_LIMIT) {
    throw new Error(`embedBatch: max ${EMBED_BATCH_LIMIT} inputs per call`);
  }
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY_MISSING");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EMBED_${res.status}: ${body.slice(0, 400)}`);
  }
  const json = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
  // Reassemble by index just in case the provider reordered.
  const out: number[][] = new Array(inputs.length);
  for (const row of json.data) out[row.index] = row.embedding;
  return out;
}

/** Format a Postgres `vector` literal from a JS number array. */
export function toVectorLiteral(vec: number[]): string {
  return "[" + vec.map((n) => (Number.isFinite(n) ? n.toFixed(7) : "0")).join(",") + "]";
}
