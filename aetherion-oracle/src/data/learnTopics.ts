// Seed topics for the /learn content hub. Each entry can be served as
// a pre-cached AI guide via the generate-learn-article edge function.
// Cards on /learn link to /learn/:slug which renders the guide.

export interface LearnTopic {
  slug: string;
  topic: string; // human-readable working title for the AI generator
  keyword: string; // primary SEO keyword
  category: "Tarot" | "Oracle" | "Dreams" | "Crypto" | "Practice";
  blurb: string; // short card description shown on /learn
}

export const LEARN_TOPICS: LearnTopic[] = [
  // Tarot
  { slug: "tarot-card-meanings-major-arcana", topic: "Tarot card meanings: a complete guide to the 22 Major Arcana", keyword: "tarot card meanings major arcana", category: "Tarot", blurb: "The 22 Major Arcana, from The Fool to The World — meanings, reversals, and how Aetherion seals them." },
  { slug: "tarot-card-meanings-minor-arcana", topic: "Tarot card meanings: a guide to the 56 Minor Arcana suits", keyword: "tarot minor arcana meanings", category: "Tarot", blurb: "Cups, Pentacles, Swords, Wands — the elemental scaffolding of every reading." },
  { slug: "three-card-spread-guide", topic: "How to read a three-card tarot spread", keyword: "three card tarot spread", category: "Tarot", blurb: "Past / present / future and the four other classic three-card layouts, with prompts." },
  { slug: "celtic-cross-spread-guide", topic: "The Celtic Cross spread: a step-by-step guide", keyword: "celtic cross tarot spread", category: "Tarot", blurb: "Ten positions, ten questions — the deepest classical spread, demystified." },
  { slug: "tarot-yes-or-no-readings", topic: "Yes-or-no tarot readings and why they usually mislead", keyword: "yes or no tarot", category: "Tarot", blurb: "When binary questions help, when they don't, and how Aetherion reframes them." },
  { slug: "ai-tarot-guide", topic: "AI tarot vs traditional tarot: how to get an accurate, verifiable AI tarot reading", keyword: "ai tarot", category: "Tarot", blurb: "How AI tarot actually works, where free AI generators fall short, and why Aetherion's wallet-bound, sha-256-sealed readings are verifiable." },
  { slug: "tarot-reading-free-guide", topic: "Free tarot reading online: how to get a meaningful free tarot reading without spam", keyword: "tarot reading free", category: "Tarot", blurb: "What 'free tarot reading' really gets you, what to avoid, and how to pull a free verifiable cast on Aetherion." },

  // Oracle
  { slug: "what-is-an-ai-oracle", topic: "What is an AI oracle and how does it differ from a chatbot", keyword: "what is an AI oracle", category: "Oracle", blurb: "Definitions, mechanics, and the line between divination and prompt engineering." },
  { slug: "word-of-power-guide", topic: "Speaking a Word of Power: how Aetherion's oracle protocol works", keyword: "word of power oracle", category: "Oracle", blurb: "The protocol behind every oracle query and why the seal matters." },
  { slug: "ai-divination-ethics", topic: "AI divination ethics: consent, sealing, and not predicting", keyword: "AI divination ethics", category: "Oracle", blurb: "What an oracle should never claim — and what makes a cast trustworthy." },

  // Dreams
  { slug: "dream-journal-method", topic: "How to keep a dream journal that actually surfaces patterns", keyword: "dream journal method", category: "Dreams", blurb: "Tools, cadence, and the symbol-density score Aetherion uses to find your themes." },
  { slug: "lucid-dreaming-primer", topic: "Lucid dreaming: a beginner's primer with practical techniques", keyword: "lucid dreaming techniques", category: "Dreams", blurb: "WBTB, MILD, SSILD — and how to weave them with a sealed dream journal." },
  { slug: "numerology-life-path-guide", topic: "Numerology life path numbers: how to calculate and read yours", keyword: "numerology life path", category: "Dreams", blurb: "Pythagorean reduction, master numbers, and a practical reading method." },
  { slug: "common-dream-themes", topic: "Common dream themes: snakes, teeth falling out, being chased and what they really mean", keyword: "dream interpretation", category: "Dreams", blurb: "Archetypal meanings of the most-searched dream symbols — snakes, teeth, falling, water — contrasted with Aetherion's personalized AI dream analysis." },

  // Crypto
  { slug: "on-chain-attestations-explained", topic: "On-chain attestations: what they are, how they work, and why divination uses them", keyword: "on-chain attestations", category: "Crypto", blurb: "EAS, Verax, and EXCALIBUR — the receipt layer for symbolic events." },
  { slug: "brc20-explained", topic: "BRC-20 explained: inscriptions, indexers, and oracle use-cases", keyword: "BRC-20 explained", category: "Crypto", blurb: "The minimal token standard on Bitcoin and why Aetherion uses it." },
  { slug: "arbitrum-vs-bitcoin-for-oracles", topic: "Arbitrum vs Bitcoin for oracles: a comparison for divination apps", keyword: "arbitrum vs bitcoin oracles", category: "Crypto", blurb: "Speed, permanence, cost — the trade-offs the lattice bridge solves." },

  // Practice
  { slug: "daily-divination-practice", topic: "Building a daily divination practice that compounds", keyword: "daily divination practice", category: "Practice", blurb: "A 12-week protocol mixing oracle, tarot, and dream-work with sealed receipts." },
  { slug: "petition-magic-modern", topic: "Petition magic for the modern practitioner", keyword: "petition magic guide", category: "Practice", blurb: "Intent, sealing, and review — without the gatekeeping or the candles." },
];

export const getLearnTopic = (slug: string) => LEARN_TOPICS.find((t) => t.slug === slug);
