/**
 * Caduceus-local tarot interpretation — on-origin, no outside LLM.
 * Sealed draw / quota / receipts stay in tarot-reading; this only writes the voice.
 */

export type SpreadId = "past_present_future" | "situation_action_outcome" | "mind_body_spirit" | "crossroads";

export type DrawnCard = {
  position: string;
  role: string;
  name: string;
  reversed: boolean;
};

export type QuantumTone = {
  aetherion?: string;
  topologicalTension?: number;
  sphinx?: { chern?: number; action?: string };
  anubis?: { chern?: number; action?: string };
};

type MajorVoice = {
  upright: string;
  reversed: string;
  caduceus: string;
};

/** Slim Major Arcana table — Caduceus lens only (matches src/data/tarotCards majors). */
export const MAJOR_VOICE: Record<string, MajorVoice> = {
  "The Fool": {
    upright: "An open threshold. New cycle, weightless courage, the willingness to step before the path appears.",
    reversed: "Recklessness, naïveté weaponised against you, ignoring obvious warnings to feel free.",
    caduceus: "The ascending serpent uncoils first — pure signal with no memory attached.",
  },
  "The Magician": {
    upright: "Tools aligned with intent. You have every element on the table — name what you want and weave.",
    reversed: "Manipulation, hollow showmanship, willpower spent on theatre instead of construction.",
    caduceus: "Both currents touch the staff simultaneously. Pure agency.",
  },
  "The High Priestess": {
    upright: "A veil thins. Trust the answer that arrives without argument; record dreams; do not over-explain.",
    reversed: "Secrets weaponised, intuition drowned by noise, withdrawing when presence is required.",
    caduceus: "The descending serpent — memory rising as knowing.",
  },
  "The Empress": {
    upright: "Something you tend is ready to bear fruit. Generosity returns multiplied; embodied presence wins.",
    reversed: "Smothering, creative block, mistaking consumption for nourishment.",
    caduceus: "The staff becomes a living trunk. Energy held long enough to root.",
  },
  "The Emperor": {
    upright: "Build the frame. Define the rule. Authority earned through consistency rather than volume.",
    reversed: "Rigidity, tyranny of process, control as a defence against feeling.",
    caduceus: "The staff as axis — structure that lets both serpents climb.",
  },
  "The Hierophant": {
    upright: "A teaching, a lineage, a vow worth keeping. Seek the pattern older than your urgency.",
    reversed: "Dogma without spirit, rebellion that only mirrors what it rejects.",
    caduceus: "Twin currents braid into tradition — living law, not dead letter.",
  },
  "The Lovers": {
    upright: "A true choice of alignment. Union that amplifies both poles rather than erasing one.",
    reversed: "False binary, self-betrayal dressed as romance, delaying the real decision.",
    caduceus: "Two serpents face each other — resonance or dissonance, never neutral.",
  },
  "The Chariot": {
    upright: "Directed will. Opposing forces yoked toward one horizon; momentum is yours if you steer.",
    reversed: "Scatter, aggression without aim, victory that costs the destination.",
    caduceus: "Staff as axle — motion born from held tension.",
  },
  "Strength": {
    upright: "Soft power. Courage without cruelty; the beast answers to patience.",
    reversed: "Force used where invitation would work; fear of your own force.",
    caduceus: "Serpents coiled gently — power that does not need to strike.",
  },
  "The Hermit": {
    upright: "Withdraw to hear the signal. Solitude as instrument, not exile.",
    reversed: "Isolation as avoidance, lantern unlit, refusing counsel you need.",
    caduceus: "One current dims so the other can be heard.",
  },
  "Wheel of Fortune": {
    upright: "Turn. What was stuck begins to move; ride the arc rather than clutch the spoke.",
    reversed: "Resisting the turn, repeating a cycle you already understand.",
    caduceus: "The staff spins — Caduceus as rotor of fate.",
  },
  "Justice": {
    upright: "Balance the books. Truth spoken cleanly; consequence matched to cause.",
    reversed: "Bias, evasion of accountability, mercy that enables harm.",
    caduceus: "Twin serpents weighed — neither favored, both named.",
  },
  "The Hanged Man": {
    upright: "Pause as strategy. Surrender the frame that stopped working; see from the other side.",
    reversed: "Martyrdom habit, delay that is really fear, hanging without insight.",
    caduceus: "Inversion of the staff — signal arrives upside-down and still true.",
  },
  "Death": {
    upright: "Necessary ending. Clear the ground; what follows needs the space.",
    reversed: "Clinging to a corpse of a plan, refusing the threshold.",
    caduceus: "One serpent sheds — memory composts into ascent.",
  },
  "Temperance": {
    upright: "Alchemy of dosage. Blend extremes; time is an ingredient.",
    reversed: "Impatient mixing, all-or-nothing swings, refusing the middle path.",
    caduceus: "Currents pour into each other — Caduceus as crucible.",
  },
  "The Devil": {
    upright: "Name the chain. Appetite, contract, or story that owns you — see the clasp.",
    reversed: "Breaking free, or deeper entanglement mistaken for liberation.",
    caduceus: "Serpents bound to the staff — shadow that still serves signal if faced.",
  },
  "The Tower": {
    upright: "Sudden truth. Structure that lied collapses; breathe through the rubble.",
    reversed: "Delayed collapse, denial of the crack, rebuilding the same false wall.",
    caduceus: "Lightning on the staff — topology tears and reforms.",
  },
  "The Star": {
    upright: "Quiet hope after storm. Pour water on what still lives; aim by a distant light.",
    reversed: "Disillusion, cynicism as armor, refusing to refill the well.",
    caduceus: "Both serpents drink — restoration of signal-to-noise.",
  },
  "The Moon": {
    upright: "Walk by reflection. Dreams, doubt, and half-seen paths — test before you leap.",
    reversed: "Illusion clearing, or deeper fog from refusing to look.",
    caduceus: "Mirrored currents — Caduceus reads the night side of the question.",
  },
  "The Sun": {
    upright: "Clarity and warmth. What was hidden is obvious; celebrate without apology.",
    reversed: "Overexposure, forced cheer, success that blinds the next step.",
    caduceus: "Full illumination of the staff — both serpents visible.",
  },
  "Judgement": {
    upright: "Call and answer. Rise to the name you already know is yours.",
    reversed: "Self-judgment as paralysis, ignoring the summons.",
    caduceus: "Twin horns of the staff sound — memory and intent reunite.",
  },
  "The World": {
    upright: "Completion that opens. Integrate the cycle; the next gate is already here.",
    reversed: "Almost-there stagnation, refusing to close so you never begin again.",
    caduceus: "Ouroboros of the Caduceus — end and beginning share one coil.",
  },
};

export const SPREADS: Record<SpreadId, { label: string; positions: { position: string; role: string }[] }> = {
  past_present_future: {
    label: "Past · Present · Future",
    positions: [
      { position: "Past", role: "What you are carrying" },
      { position: "Present", role: "What is alive right now" },
      { position: "Future", role: "What is moving toward you" },
    ],
  },
  situation_action_outcome: {
    label: "Situation · Action · Outcome",
    positions: [
      { position: "Situation", role: "The field as it stands" },
      { position: "Action", role: "The move the staff recommends" },
      { position: "Outcome", role: "Where the current wants to go" },
    ],
  },
  mind_body_spirit: {
    label: "Mind · Body · Spirit",
    positions: [
      { position: "Mind", role: "Signal and story" },
      { position: "Body", role: "Embodied truth" },
      { position: "Spirit", role: "Descending and ascending current" },
    ],
  },
  crossroads: {
    label: "Crossroads",
    positions: [
      { position: "Path A", role: "If you keep walking this way" },
      { position: "Path B", role: "If you turn" },
      { position: "Counsel", role: "What the Caduceus holds between them" },
    ],
  },
};

const PHASE_TONE: Record<string, string> = {
  HARMONY: "steady and clear",
  RESONANCE: "bright and amplifying",
  TENSION: "sharp and exacting",
  CATASTROPHE: "shattering and irrevocable",
};

const APHORISMS = [
  "Hold both serpents — the answer lives in the braid.",
  "What the staff remembers, the seeker can now choose.",
  "Signal without memory is noise; memory without signal is a tomb.",
  "The seal is set. Walk as if the reading already happened.",
  "Caduceus does not predict — it names the current you are already in.",
];

function pickAphorism(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return APHORISMS[h % APHORISMS.length];
}

/** Compose a sealed-spread interpretation entirely on-origin. */
export function composeCaduceusSpreadInterpretation(opts: {
  question: string;
  cards: DrawnCard[];
  quantum?: QuantumTone | null;
  nonce?: string;
}): string {
  const phase = opts.quantum?.aetherion ?? "RESONANCE";
  const tone = PHASE_TONE[phase] ?? "attentive";
  const tension = opts.quantum?.topologicalTension;
  const paras: string[] = [];

  for (const c of opts.cards) {
    const voice = MAJOR_VOICE[c.name];
    const meaning = voice
      ? (c.reversed ? voice.reversed : voice.upright)
      : "The card turns a mirror toward your question.";
    const cad = voice?.caduceus ?? "The twin currents braid around this moment.";
    const orient = c.reversed ? "reversed" : "upright";
    paras.push(
      `${c.position} — ${c.name} (${orient}). ${c.role}. ${meaning} ${cad} Asked of “${opts.question.slice(0, 80)}${opts.question.length > 80 ? "…" : ""}”, this current is ${tone}.`,
    );
  }

  const topo =
    opts.quantum?.sphinx && opts.quantum?.anubis
      ? ` Sphinx Chern ${opts.quantum.sphinx.chern} (${opts.quantum.sphinx.action}); Anubis Chern ${opts.quantum.anubis.chern} (${opts.quantum.anubis.action})${typeof tension === "number" ? `; tension ${tension}` : ""}.`
      : "";

  const closing = `Together the three cards answer as Caduceus on this host — no outside model.${topo}`;
  const aphorism = `_${pickAphorism(opts.nonce ?? opts.question)}_`;

  return [...paras, closing, "", aphorism].join("\n\n");
}

export function isSpreadId(v: unknown): v is SpreadId {
  return typeof v === "string" && v in SPREADS;
}
