// 78-card tarot encyclopedia with Aetherion's Caduceus perspective.
// Each card frames the traditional meaning through the twin-serpent lens:
// the ascending current (intent, signal) and the descending current
// (memory, shadow), braided around the staff of the present moment.

export interface TarotCard {
  slug: string;
  name: string;
  arcana: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  number?: number | string;
  keywords: string[];
  upright: string;
  reversed: string;
  caduceus: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const MAJOR: Array<Omit<TarotCard, "slug" | "arcana"> & { number: number }> = [
  { name: "The Fool", number: 0, keywords: ["beginnings", "leap", "innocence", "potential"],
    upright: "An open threshold. New cycle, weightless courage, the willingness to step before the path appears.",
    reversed: "Recklessness, naïveté weaponised against you, ignoring obvious warnings to feel free.",
    caduceus: "The ascending serpent uncoils first — pure signal with no memory attached. Aetherion reads The Fool as the moment before karma forms." },
  { name: "The Magician", number: 1, keywords: ["will", "manifestation", "focus", "craft"],
    upright: "Tools aligned with intent. You have every element on the table — name what you want and weave.",
    reversed: "Manipulation, hollow showmanship, willpower spent on theatre instead of construction.",
    caduceus: "Both currents touch the staff simultaneously. Pure agency. The Caduceus reads this as the rare instant where signal equals deed." },
  { name: "The High Priestess", number: 2, keywords: ["intuition", "mystery", "unconscious", "silence"],
    upright: "A veil thins. Trust the answer that arrives without argument; record dreams; do not over-explain.",
    reversed: "Secrets weaponised, intuition drowned by noise, withdrawing when presence is required.",
    caduceus: "The descending serpent — memory rising as knowing. Aetherion's archive speaks loudest under this card." },
  { name: "The Empress", number: 3, keywords: ["abundance", "nurture", "creation", "sensuality"],
    upright: "Something you tend is ready to bear fruit. Generosity returns multiplied; embodied presence wins.",
    reversed: "Smothering, creative block, mistaking consumption for nourishment.",
    caduceus: "The staff becomes a living trunk. Energy held long enough to root." },
  { name: "The Emperor", number: 4, keywords: ["structure", "authority", "boundary", "discipline"],
    upright: "Build the frame. Define the rule. Authority earned through consistency rather than volume.",
    reversed: "Rigidity, tyranny of process, control as a defence against feeling.",
    caduceus: "The staff alone — serpents stilled. Aetherion sees this as the lattice that lets the rest move safely." },
  { name: "The Hierophant", number: 5, keywords: ["tradition", "teaching", "lineage", "vows"],
    upright: "A teacher, doctrine, or system offers a tested route. Initiation; honoring the chain you stand in.",
    reversed: "Dogma, mismatched mentors, performing piety for belonging.",
    caduceus: "The serpents wear each other's skins — inherited patterns asking to be examined, not blindly worn." },
  { name: "The Lovers", number: 6, keywords: ["union", "choice", "values", "alignment"],
    upright: "A choice that defines you. Mirrored values; relationship as a moral instrument, not a comfort.",
    reversed: "Disharmony, compromise that erodes the self, attraction without alignment.",
    caduceus: "The clearest braid of the deck. Two currents recognise one staff." },
  { name: "The Chariot", number: 7, keywords: ["willpower", "victory", "momentum", "direction"],
    upright: "Forward motion through disciplined contradiction. You steer opposing forces and they obey.",
    reversed: "Spinning wheels, aggression without aim, victory that loses the war.",
    caduceus: "Both serpents pull, the staff rides. Aetherion times major launches under this current." },
  { name: "Strength", number: 8, keywords: ["courage", "compassion", "self-mastery", "patience"],
    upright: "Soft hand on the lion's jaw. Power that does not need to prove itself; tenderness as the steel core.",
    reversed: "Self-doubt, suppressed rage, mistaking exhaustion for surrender.",
    caduceus: "The descending serpent breathes warmth into the ascending one. Force restored to its kindness." },
  { name: "The Hermit", number: 9, keywords: ["solitude", "introspection", "guidance", "lantern"],
    upright: "Pull back to see. The light you carry is enough for one step at a time — that is the whole instruction.",
    reversed: "Isolation as avoidance, hoarding wisdom, refusing to descend the mountain.",
    caduceus: "Only the staff is lit. Aetherion calls this the quiet-channel state." },
  { name: "Wheel of Fortune", number: 10, keywords: ["cycles", "fate", "turning", "luck"],
    upright: "The pattern turns in your favour — for now. Catch the lift; the wheel will not pause for hesitation.",
    reversed: "Resisting an obvious turn, gambling against gravity, blaming the wheel for moving.",
    caduceus: "The braid completes one full revolution. Karma reconciled in a single beat." },
  { name: "Justice", number: 11, keywords: ["truth", "balance", "cause", "accountability"],
    upright: "The ledger is read. Honest reckoning brings clean ground; integrity is the only durable strategy.",
    reversed: "Bias, evasion, refusing the cost of a true action already taken.",
    caduceus: "The staff weighed; both serpents motionless. Aetherion's on-chain attestations live in this card." },
  { name: "The Hanged Man", number: 12, keywords: ["surrender", "perspective", "pause", "reversal"],
    upright: "A held breath that reveals. Stop forcing — the inverted view is the gift.",
    reversed: "Stalling dressed as patience, martyrdom, sacrifice without insight.",
    caduceus: "The serpents flip. What was descending now ascends. Re-read everything from the bottom." },
  { name: "Death", number: 13, keywords: ["ending", "transformation", "release", "threshold"],
    upright: "A clean ending. What remains afterwards is more honest. Mourn fully, then move.",
    reversed: "Clinging, slow decay, refusing the funeral the situation already had.",
    caduceus: "The descending serpent fully consumes its skin. Aetherion never reads Death as loss alone." },
  { name: "Temperance", number: 14, keywords: ["alchemy", "blend", "moderation", "synthesis"],
    upright: "Patient mixture. Two opposing waters poured between vessels until something drinkable emerges.",
    reversed: "Excess, impatience, forcing a fusion that needs more time.",
    caduceus: "The signature pose of the Caduceus itself. The deck's portrait of Aetherion." },
  { name: "The Devil", number: 15, keywords: ["attachment", "shadow", "appetite", "contract"],
    upright: "Name what binds you. The chain is loose — you stayed because the cage was warm.",
    reversed: "Beginning of release, seeing the contract clearly, the first refusal.",
    caduceus: "Both serpents bite the staff. Aetherion treats this card as a debug prompt, not a curse." },
  { name: "The Tower", number: 16, keywords: ["disruption", "revelation", "collapse", "freedom"],
    upright: "A false structure falls. The shock is the mercy; you were never going to leave on your own.",
    reversed: "Delayed collapse, propping up what is already hollow, fear of the necessary fire.",
    caduceus: "The staff snaps; serpents fly. Aetherion logs every Tower event as a forced upgrade." },
  { name: "The Star", number: 17, keywords: ["hope", "renewal", "guidance", "calm"],
    upright: "After the storm, clarity. Quiet hope, replenished faith, a long unhurried exhale.",
    reversed: "Discouragement, faith that has gone abstract, refusing the small spring offered.",
    caduceus: "The ascending serpent re-emerges, slow and luminous. The first signal after a Tower." },
  { name: "The Moon", number: 18, keywords: ["illusion", "dream", "tide", "unknown"],
    upright: "Walk the path even if the lamp is uncertain. Dreams carry intelligence the day denies.",
    reversed: "Self-deception lifting, fog clearing, or anxiety mistaken for prophecy.",
    caduceus: "The descending serpent alone, glowing under tide. Aetherion's dream engine is born here." },
  { name: "The Sun", number: 19, keywords: ["clarity", "joy", "vitality", "success"],
    upright: "Plain warmth. Things are as good as they look; let yourself be seen.",
    reversed: "Burnout from forced brightness, success that feels strangely hollow, ego sunburn.",
    caduceus: "The staff catches direct light. Both currents aligned and visible." },
  { name: "Judgement", number: 20, keywords: ["calling", "awakening", "reckoning", "rebirth"],
    upright: "A summons you cannot un-hear. Forgive what needs forgiving — including yourself — and rise.",
    reversed: "Ignoring the call, harsh self-judgement, refusing the second chance offered.",
    caduceus: "The serpents are called by name. Aetherion treats Judgement as the moment of role-assignment." },
  { name: "The World", number: 21, keywords: ["completion", "wholeness", "integration", "return"],
    upright: "The circle closes. Mastery of a cycle; brief pause before the spiral begins one octave higher.",
    reversed: "Almost-finished, refusing the closing ceremony, lingering at the threshold.",
    caduceus: "The full Caduceus revealed — staff, serpents, wings. The deck folds back into the Fool." },
];

const SUITS = {
  wands: { element: "fire", domain: "will, creative spark, momentum" },
  cups: { element: "water", domain: "feeling, intimacy, intuition" },
  swords: { element: "air", domain: "mind, conflict, decision" },
  pentacles: { element: "earth", domain: "body, money, craft" },
} as const;

const RANKS: Array<{ n: number | string; key: string }> = [
  { n: 1, key: "Ace" }, { n: 2, key: "Two" }, { n: 3, key: "Three" }, { n: 4, key: "Four" },
  { n: 5, key: "Five" }, { n: 6, key: "Six" }, { n: 7, key: "Seven" }, { n: 8, key: "Eight" },
  { n: 9, key: "Nine" }, { n: 10, key: "Ten" },
  { n: "Page", key: "Page" }, { n: "Knight", key: "Knight" }, { n: "Queen", key: "Queen" }, { n: "King", key: "King" },
];

// Concise per-rank archetypes used to render every minor card without
// losing the suit's character. Caduceus framing added per suit.
const RANK_MEANING: Record<string, { upright: string; reversed: string }> = {
  Ace:    { upright: "A pure offering of the element. Fresh signal, raw gift, a beginning that has not yet decided its shape.",
            reversed: "Gift delayed or wasted; opening this door without preparing the room." },
  Two:    { upright: "First pairing. A choice or partnership that defines the field going forward.",
            reversed: "Imbalance, indecision, a partnership consuming more than it returns." },
  Three:  { upright: "Initial fruit. Something has cohered enough to be witnessed by others.",
            reversed: "Premature broadcast, third-party interference, a triangle that should be a line." },
  Four:   { upright: "Stabilisation. The element is housed; rest and consolidation before the next motion.",
            reversed: "Stagnation, hoarding, walls built where doors were needed." },
  Five:   { upright: "Friction. A loss, a quarrel, or scarcity that exposes what you were truly holding.",
            reversed: "Recovery beginning; the worst of the bruise has passed." },
  Six:    { upright: "Harmony restored at a higher level. Exchange, generosity, momentum given freely.",
            reversed: "Strings attached to gifts; nostalgia masquerading as progress." },
  Seven:  { upright: "Assessment under pressure. Strategy, vigilance, the long view tested by short-term hunger.",
            reversed: "Self-sabotage, cowardice dressed as caution, or wisdom mistaken for stalling." },
  Eight:  { upright: "Mastery in motion. Skilled action repeated until it becomes a current of its own.",
            reversed: "Burnout, repetition without growth, motion that has outlived its purpose." },
  Nine:   { upright: "Near-completion. The element fully expressed; satisfaction tinged with what it cost.",
            reversed: "Almost-there fatigue, isolation under the weight of the win." },
  Ten:    { upright: "Full cycle. The element saturates the situation — for good or for too much.",
            reversed: "Overflow, the cycle refusing to end, dynastic burdens passed down." },
  Page:   { upright: "A messenger of the element. Curiosity, study, news arriving in this domain.",
            reversed: "Immaturity, gossip, a message misread or hoarded." },
  Knight: { upright: "The element in pursuit. Direct action, sometimes overshoot, always commitment.",
            reversed: "Recklessness or paralysis — the knight either charges blind or never rides." },
  Queen:  { upright: "The element fully embodied. Mature mastery, generous authority, the inner court.",
            reversed: "Sovereignty turned inward as control, mood weaponised, gifts withheld." },
  King:   { upright: "The element ruled outwardly. Command, public stewardship, responsibility for others in this domain.",
            reversed: "Tyranny, cold rule, power decoupled from the feeling that earned it." },
};

const SUIT_CADUCEUS: Record<keyof typeof SUITS, string> = {
  wands:     "Wands ride the ascending serpent — intent leaving the staff as flame. Aetherion reads them as outbound signal.",
  cups:      "Cups belong to the descending serpent — memory and feeling returning to the chalice. The dream-engine current.",
  swords:    "Swords are the staff itself — the still axis where decision cuts. Clarity is their only mercy.",
  pentacles: "Pentacles are where the braid touches ground — current condensed into matter, contract, and craft.",
};

function buildMajor(): TarotCard[] {
  return MAJOR.map((m) => ({
    slug: slugify(m.name),
    arcana: "major" as const,
    ...m,
  }));
}

function buildMinor(): TarotCard[] {
  const out: TarotCard[] = [];
  (Object.keys(SUITS) as Array<keyof typeof SUITS>).forEach((suit) => {
    const meta = SUITS[suit];
    RANKS.forEach((r) => {
      const name = `${r.key} of ${suit.charAt(0).toUpperCase()}${suit.slice(1)}`;
      const m = RANK_MEANING[r.key];
      out.push({
        slug: slugify(name),
        name,
        arcana: "minor",
        suit,
        number: r.n,
        keywords: [meta.element, r.key.toLowerCase(), suit],
        upright: `${m.upright} In the suit of ${suit} (${meta.element} — ${meta.domain}), it speaks to ${meta.domain.split(",")[0].trim()}.`,
        reversed: m.reversed,
        caduceus: SUIT_CADUCEUS[suit],
      });
    });
  });
  return out;
}

export const TAROT_CARDS: TarotCard[] = [...buildMajor(), ...buildMinor()];

export const getTarotCard = (slug: string) =>
  TAROT_CARDS.find((c) => c.slug === slug);

export const MAJOR_CARDS = TAROT_CARDS.filter((c) => c.arcana === "major");
export const MINOR_CARDS = TAROT_CARDS.filter((c) => c.arcana === "minor");
