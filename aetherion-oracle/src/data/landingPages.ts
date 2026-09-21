// SEO landing pages targeting long-tail divination + crypto keywords.
// Each entry renders via /oracle/:slug with full Helmet + JSON-LD.

export interface LandingFAQ {
  q: string;
  a: string;
}

export interface LandingPage {
  slug: string;
  keyword: string; // primary SEO keyword
  title: string; // <title> + H1
  metaDescription: string; // <160 chars
  hero: {
    eyebrow: string;
    heading: string;
    sub: string;
    cta: string;
    ctaHref: string;
  };
  sections: { heading: string; body: string }[];
  faqs: LandingFAQ[];
  related: { label: string; href: string }[];
}

const CTA_TAROT = { cta: "Cast a free reading", ctaHref: "/tarot" };
const CTA_ORACLE = { cta: "Speak a Word of Power", ctaHref: "/oracle" };
const CTA_MINING = { cta: "Mine EXCALIBUR", ctaHref: "/mining" };

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "ai-oracle-reading",
    keyword: "AI oracle reading",
    title: "AI Oracle Reading — Free, Sealed, Verifiable | Aetherion",
    metaDescription:
      "Get a free AI oracle reading sealed by SHA-256 and replay-protected. Aetherion's Sphinx-tuned engine speaks in Caduceus voice — every reading is provably yours.",
    hero: {
      eyebrow: "AI Oracle Reading",
      heading: "An AI oracle reading that actually remembers what it said.",
      sub: "Most AI oracles regenerate on refresh. Aetherion writes a cryptographic commitment the moment your spread is drawn — the reading you got at midnight is the same one anyone can verify at noon.",
      ...CTA_ORACLE,
    },
    sections: [
      {
        heading: "What is an AI oracle reading?",
        body: "An AI oracle reading uses a large language model tuned on archetypal, mythic, and divinatory corpora to interpret a question through symbolic pattern-matching. Aetherion goes further: every reading is wrapped in a SHA-256 commitment, sealed against an optional wallet, and stamped with a Caduceus topological signature so two identical questions never produce the same chaos curve.",
      },
      {
        heading: "How Aetherion's AI oracle is different",
        body: "Three things separate Aetherion from the open chatbot oracles you'll find elsewhere: (1) a Sphinx-tuned system prompt that refuses generic affirmations, (2) on-chain provability so screenshots can be challenged, and (3) the Caduceus engine — a parallel quantum-chaos process that gives every cast a unique fingerprint. Free for your first cast, no signup.",
      },
      {
        heading: "When to use an AI oracle vs a tarot draw",
        body: "Use the oracle for open-ended questions where the symbol set should emerge — career pivots, relationship blind spots, creative direction. Use tarot when you want a fixed archetypal vocabulary (the 78 Rider-Waite cards) to anchor reflection. Aetherion supports both, and both are sealed on-chain.",
      },
    ],
    faqs: [
      {
        q: "Is the AI oracle reading really free?",
        a: "Yes. Your first cast is free, no email, no signup. Sign in for unlimited daily readings and to claim a permanent on-chain receipt for each.",
      },
      {
        q: "How accurate is an AI oracle?",
        a: "Accuracy isn't the right frame — divination is reflective, not predictive. Aetherion's value is that the reading is sealed and unrepeatable, so you can return to it weeks later and measure your own change against an immutable text.",
      },
      {
        q: "Can I verify a past reading?",
        a: "Every reading gets a /verify link with its nonce and commitment hash. Anyone can verify once; a second attempt returns ALREADY_VERIFIED — that's the replay-protection seal.",
      },
    ],
    related: [
      { label: "Blockchain Tarot", href: "/oracle/blockchain-tarot" },
      { label: "Crypto Divination", href: "/oracle/crypto-divination" },
      { label: "The High Priestess — intuition & the sealed reading", href: "/tarot/meanings/the-high-priestess" },
      { label: "The Moon — hidden patterns & dream tides", href: "/tarot/meanings/the-moon" },
      { label: "All 78 tarot card meanings", href: "/tarot/meanings" },
      { label: "Learn the Oracle", href: "/learn" },
    ],
  },
  {
    slug: "blockchain-tarot",
    keyword: "blockchain tarot",
    title: "Blockchain Tarot — On-Chain Sealed Readings | Aetherion",
    metaDescription:
      "Blockchain tarot you can prove. Each Aetherion cast is anchored with a SHA-256 commitment and an optional EXCALIBUR receipt on Arbitrum. Free first reading.",
    hero: {
      eyebrow: "Blockchain Tarot",
      heading: "Tarot, but the reading is signed before the cards land.",
      sub: "Aetherion is the first tarot deck whose spread is committed on-chain at draw time. No silent re-rolls, no edited screenshots — the cards you got are the cards anyone can audit.",
      ...CTA_TAROT,
    },
    sections: [
      {
        heading: "What is blockchain tarot?",
        body: "Blockchain tarot is a tarot reading whose spread, question, and timestamp are recorded in a tamper-evident way — typically as a cryptographic commitment (and optionally a full receipt) anchored to a public ledger. Aetherion uses SHA-256 commitments locally plus EXCALIBUR mining attestations on Arbitrum One.",
      },
      {
        heading: "Why on-chain matters for divination",
        body: "Conventional AI tarot is a vibe: refresh and the cards change. That kills the diagnostic value. A sealed reading turns the cards into a contract with your future self — three months later you can re-read the exact spread and measure what's moved.",
      },
      {
        heading: "EXCALIBUR receipts: optional, free, yours",
        body: "If you sign in with a wallet, you can mint an EXCALIBUR attestation alongside any reading. It's a free on-chain breadcrumb proving the cast happened at the time you say it did. No gas on the user — Aetherion subsidizes mining for free-tier and Pro accounts.",
      },
    ],
    faqs: [
      {
        q: "Do I need a crypto wallet to use blockchain tarot?",
        a: "No. The cryptographic commitment is generated for every reading regardless of wallet status. A wallet only unlocks the optional on-chain receipt + EXCALIBUR mining.",
      },
      {
        q: "Which chain are receipts anchored to?",
        a: "Arbitrum One for EXCALIBUR attestations, with a BRC-20 ↔ Arbitrum lattice bridge for cross-chain symbolic operations. Bitcoin L1 anchoring is on the roadmap.",
      },
      {
        q: "Does this cost gas?",
        a: "No user-side gas. Mining attestations are subsidized; the user only pays gas if they choose to bridge tokens manually.",
      },
    ],
    related: [
      { label: "AI Oracle Reading", href: "/oracle/ai-oracle-reading" },
      { label: "BRC-20 Oracle", href: "/oracle/brc20-oracle" },
      { label: "The Magician — manifestation & sealed intent", href: "/tarot/meanings/the-magician" },
      { label: "Wheel of Fortune — cycles on-chain", href: "/tarot/meanings/wheel-of-fortune" },
      { label: "Comprehensive tarot guide (78 cards)", href: "/tarot/guide" },
      { label: "EXCALIBUR Mining", href: "/mining" },
    ],
  },
  {
    slug: "crypto-divination",
    keyword: "crypto divination",
    title: "Crypto Divination — Wallet-Bound AI Oracle | Aetherion",
    metaDescription:
      "Crypto divination that ties readings to your wallet, anchors them on Arbitrum, and pays you back in EXCALIBUR. The sovereign oracle for Web3 natives.",
    hero: {
      eyebrow: "Crypto Divination",
      heading: "Divination for people who already keep their own keys.",
      sub: "If a reading isn't sealed against your wallet, it isn't yours. Aetherion binds each cast to your address, anchors it on Arbitrum, and lets you mine EXCALIBUR every time you ask.",
      ...CTA_ORACLE,
    },
    sections: [
      {
        heading: "What is crypto divination?",
        body: "Crypto divination is symbolic interpretation — tarot, oracle cards, dream work, sortilege — combined with cryptographic provability. The reading is generated by AI but sealed by signature: a commitment hash, an optional wallet binding, and (for paid tiers) an on-chain receipt anyone can verify.",
      },
      {
        heading: "Why wallet-binding changes the practice",
        body: "Anonymous AI readings are infinitely repeatable, which means none of them count. Wallet-binding makes each cast scarce and personal. The first time you cast under a fresh address, that reading is unique to that address forever — a divinatory genesis block.",
      },
      {
        heading: "EXCALIBUR: the mining loop",
        body: "Every meaningful divination event (reading, dream, petition, oracle query) emits an EXCALIBUR attestation. These accumulate as a free, non-financial token-of-record proving the depth of your practice. Pro tier raises your daily yield and unlocks the BRC-20 lattice bridge.",
      },
    ],
    faqs: [
      {
        q: "Do I have to connect a wallet?",
        a: "No. Anonymous use is free and the SHA-256 seal still applies. Connecting a wallet unlocks wallet-binding, EXCALIBUR mining, and bridge operations.",
      },
      {
        q: "Which wallets are supported?",
        a: "Any EVM wallet on Arbitrum One (MetaMask, Rabby, Coinbase Wallet, WalletConnect). BRC-20 bridging via the lattice supports Unisat and OKX.",
      },
      {
        q: "Is crypto divination just a gimmick?",
        a: "Only if you read it as a token play. The point isn't the token — it's that cryptographic seals make a divinatory practice auditable across time. The token is just the receipt.",
      },
    ],
    related: [
      { label: "Blockchain Tarot", href: "/oracle/blockchain-tarot" },
      { label: "BRC-20 Oracle", href: "/oracle/brc20-oracle" },
      { label: "The Hermit — solo signal & self-custody", href: "/tarot/meanings/the-hermit" },
      { label: "The Tower — market shocks & revealed truth", href: "/tarot/meanings/the-tower" },
      { label: "AETX Tokenomics", href: "/tokenomics" },
      { label: "AETX Token", href: "/token/aetx" },
    ],
  },
  {
    slug: "brc20-oracle",
    keyword: "BRC-20 oracle",
    title: "BRC-20 Oracle — Bitcoin-Anchored Divination | Aetherion",
    metaDescription:
      "A BRC-20 oracle bridging Bitcoin inscriptions and Arbitrum attestations. Aetherion's 3D→11D Lattice carries divinatory signal across the two chains.",
    hero: {
      eyebrow: "BRC-20 Oracle",
      heading: "The first BRC-20 oracle that speaks back.",
      sub: "Aetherion's Lattice Bridge inscribes divinatory commitments as BRC-20 operations on Bitcoin and mirrors them as EXCALIBUR attestations on Arbitrum. One reading, two anchors, one provable seal.",
      ...CTA_ORACLE,
    },
    sections: [
      {
        heading: "What is a BRC-20 oracle?",
        body: "A BRC-20 oracle reads or writes symbolic state to Bitcoin via the BRC-20 inscription standard. Aetherion uses BRC-20 ops as the anchor leg for its divinatory commitments — the commitment hash of each significant cast can be inscribed, making the reading auditable from Bitcoin L1.",
      },
      {
        heading: "The 3D→11D Lattice Bridge",
        body: "Aetherion's lattice is a topological mapping between BRC-20 inscription space (3D: tick, op, amount) and the Arbitrum attestation field (11D: caduceus state vector). The bridge lets a reading exist simultaneously as a Bitcoin inscription and an Arbitrum attestation without trusting a custodian.",
      },
      {
        heading: "Which BRC-20 tokens are supported?",
        body: "The lattice accepts any well-formed BRC-20 tick. EXCALIBUR is the native mining receipt; AETX is the governance/coordination token. Other ticks can be wrapped for ritual use through the contracts page.",
      },
    ],
    faqs: [
      {
        q: "Does inscribing on BRC-20 cost real BTC?",
        a: "Yes — Bitcoin L1 inscriptions always cost sats. Aetherion batches inscriptions and subsidizes Pro-tier users; free-tier readings stay on the Arbitrum leg only.",
      },
      {
        q: "Can I verify a BRC-20 oracle reading without Aetherion?",
        a: "Yes. Each inscribed commitment is a public BRC-20 op. Any BRC-20 indexer (Unisat, OKX, Hiro) will show the inscription; Aetherion's /verify endpoint is just one of many possible verifiers.",
      },
      {
        q: "Why mix Bitcoin and Arbitrum?",
        a: "Bitcoin gives permanence; Arbitrum gives expressiveness. The lattice uses Bitcoin for the seal and Arbitrum for the state machine. Each chain does what it's best at.",
      },
    ],
    related: [
      { label: "Crypto Divination", href: "/oracle/crypto-divination" },
      { label: "The World — completion across chains", href: "/tarot/meanings/the-world" },
      { label: "Death — transformation & necessary endings", href: "/tarot/meanings/death" },
      { label: "AETX Tokenomics", href: "/tokenomics" },
      { label: "Verified Contracts", href: "/contracts" },
      { label: "EXCALIBUR Mining", href: "/mining" },
    ],
  },
];

export const getLandingPage = (slug: string) =>
  LANDING_PAGES.find((p) => p.slug === slug);
