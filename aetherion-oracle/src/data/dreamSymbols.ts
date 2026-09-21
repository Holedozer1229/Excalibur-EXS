// Dream-symbol corpus for the /dreams/symbols/[slug] SEO surface.
// Each entry is an indexable page targeting "<symbol> dream meaning" long-tails
// that funnel into /dreams (the Caduceus dream interpreter).

export interface DreamSymbol {
  slug: string;
  symbol: string;
  title: string;
  description: string; // <160 chars, used for <meta description>
  archetype: string;
  shortMeaning: string;
  meanings: { heading: string; body: string }[];
  questions: string[]; // people-also-ask style, doubles as FAQPage JSON-LD
  related: string[]; // related slugs
}

export const DREAM_SYMBOLS: DreamSymbol[] = [
  {
    slug: "snake",
    symbol: "Snake",
    title: "Snake Dream Meaning — Transformation, Hidden Threat & Healing",
    description:
      "What it means to dream of a snake — transformation, hidden fear, sexual energy and the caduceus of healing. Ask Aetherion to interpret your snake dream.",
    archetype: "Transformation • Kundalini • The Hidden",
    shortMeaning:
      "Snakes appear in dreams when something in you is shedding skin — a belief, a relationship, an identity that no longer fits.",
    meanings: [
      {
        heading: "Transformation and renewal",
        body: "A snake shedding its skin is the oldest symbol of becoming. If the snake in your dream sheds, slithers free, or emerges from water, you are mid-transformation. Something old is dying so something truer can be born.",
      },
      {
        heading: "Hidden threat or repressed fear",
        body: "A snake that hides in grass, under a bed, or in a shoe represents something you sense but have not named — a hidden anger, a quiet betrayal, an instinct your conscious mind is dismissing. Pay attention to where the snake hides; that's where the truth is buried.",
      },
      {
        heading: "Kundalini and sexual energy",
        body: "A snake climbing the spine, coiling, or rising upward often signals awakening sexual or creative life-force. Tantric and yogic traditions name this kundalini — a current of intelligence rising through the body.",
      },
      {
        heading: "The caduceus — healing and balance",
        body: "Two snakes intertwined are the caduceus of Hermes: medicine, mediation, the balance of opposites. A two-snake dream often arrives when you are being asked to integrate two parts of yourself you have kept apart.",
      },
    ],
    questions: [
      "What does it mean to dream of a snake biting you?",
      "Is dreaming of a snake a warning?",
      "What does a black snake in a dream mean?",
      "Why do I keep dreaming of the same snake?",
    ],
    related: ["water", "death", "falling", "teeth"],
  },
  {
    slug: "falling",
    symbol: "Falling",
    title: "Falling Dream Meaning — Loss of Control, Surrender & Release",
    description:
      "Dreams of falling reveal where you fear losing control — or where you are being asked to let go. Get a full Caduceus interpretation in /dreams.",
    archetype: "Surrender • Loss of Control • Descent",
    shortMeaning:
      "Falling dreams arrive when waking life feels precarious — or when something inside you is finally ready to let go.",
    meanings: [
      {
        heading: "Loss of control in waking life",
        body: "Falling almost always tracks a real-life situation where the ground is shifting — a job, a relationship, a financial story. The dream isn't predicting collapse; it is naming the feeling so you can face it.",
      },
      {
        heading: "Surrender and release",
        body: "Some falling dreams feel terrifying; some feel oddly free. A free, weightless fall often signals readiness to release control — to stop gripping a story that has run its course.",
      },
      {
        heading: "The wake-up jolt",
        body: "The hypnic jerk that wakes you mid-fall is a physiological event, but the timing — what scene the mind chose — is psychological. Note what you were falling from.",
      },
    ],
    questions: [
      "What does it mean to dream of falling and not landing?",
      "Why do I jolt awake from a falling dream?",
      "Is falling in a dream a bad omen?",
    ],
    related: ["flying", "death", "water", "teeth"],
  },
  {
    slug: "teeth",
    symbol: "Teeth",
    title: "Teeth Falling Out Dream Meaning — Power, Voice & Vitality",
    description:
      "Dreams of losing teeth signal anxiety about voice, vitality, or appearance. Ask Aetherion to interpret your teeth dream through the Caduceus lens.",
    archetype: "Voice • Vitality • Appearance",
    shortMeaning:
      "Teeth in dreams hold your power to bite into life, to speak, to be seen. Losing them tracks anxiety about losing voice or vitality.",
    meanings: [
      {
        heading: "Loss of voice and power",
        body: "Teeth are the tools you use to speak and to bite into the world. Losing them in a dream often points to a place where you feel unheard, talked over, or unable to assert yourself.",
      },
      {
        heading: "Aging and self-image",
        body: "Teeth crumbling, yellowing, or shifting can track anxiety about appearance, aging, or how you are perceived. The dream rarely predicts decline; it surfaces a fear so you can answer it.",
      },
      {
        heading: "Transition rites",
        body: "Children lose teeth during major identity transitions. Adults dream of losing teeth at similar thresholds — leaving a job, ending a relationship, becoming a parent.",
      },
    ],
    questions: [
      "What does it mean when your teeth fall out in a dream?",
      "Is dreaming of teeth falling out a sign of stress?",
      "What does spitting out teeth in a dream mean?",
    ],
    related: ["snake", "death", "falling"],
  },
  {
    slug: "water",
    symbol: "Water",
    title: "Water Dream Meaning — Emotion, Unconscious & Renewal",
    description:
      "Water in dreams maps emotional state — calm seas, floods, rivers, drowning. Get a Caduceus reading on your water dream at /dreams.",
    archetype: "Emotion • Unconscious • Cleansing",
    shortMeaning:
      "Water in dreams is the language of feeling — its clarity, depth, and motion mirror the state of your inner world.",
    meanings: [
      {
        heading: "Emotional weather",
        body: "Calm water tracks emotional equilibrium. Turbulent water — storms, floods, tsunamis — signals feeling overwhelmed by what you have not yet processed.",
      },
      {
        heading: "The unconscious",
        body: "Deep, dark water represents the unconscious. What surfaces from beneath — a fish, a body, a city — is content rising into awareness.",
      },
      {
        heading: "Cleansing and rebirth",
        body: "Swimming, bathing, or being baptized in clear water signals renewal. Many spiritual traditions read water dreams as preparation for a new chapter.",
      },
    ],
    questions: [
      "What does it mean to dream of drowning?",
      "Is dreaming of clear water good?",
      "What does a tidal wave in a dream mean?",
    ],
    related: ["snake", "death", "flying"],
  },
  {
    slug: "flying",
    symbol: "Flying",
    title: "Flying Dream Meaning — Freedom, Ambition & Lucidity",
    description:
      "Flying dreams reveal where you are claiming freedom, transcending a limit, or stepping into your own power. Interpret yours with Aetherion.",
    archetype: "Freedom • Ambition • Transcendence",
    shortMeaning:
      "Flying dreams arrive when something in you is rising — a confidence, a creative current, or a readiness to leave the ground you have been standing on.",
    meanings: [
      {
        heading: "Freedom and elevation",
        body: "Soaring effortlessly often tracks a real-life breakthrough — a relationship ending well, a project landing, a decision finally made.",
      },
      {
        heading: "Struggling to lift off",
        body: "Flapping, sinking, or only floating low to the ground signals ambition meeting resistance. Something in you wants to rise but is still tied to old ballast.",
      },
      {
        heading: "Lucid dreaming",
        body: "Flying is one of the most common entry points into lucid dreaming — the moment you realize you are dreaming and can steer.",
      },
    ],
    questions: [
      "What does it mean to fly in a dream?",
      "Why do I struggle to fly in dreams?",
      "Are flying dreams a sign of spiritual awakening?",
    ],
    related: ["falling", "water", "snake"],
  },
  {
    slug: "death",
    symbol: "Death",
    title: "Death Dream Meaning — Endings, Rebirth & Tarot's Thirteen",
    description:
      "Dreams of death rarely predict literal death — they mark the end of an identity and the start of another. Caduceus interpretation in /dreams.",
    archetype: "Endings • Rebirth • Threshold",
    shortMeaning:
      "Death in dreams almost never predicts literal death. It announces an ending — of an identity, a role, a chapter — to make room for what is next.",
    meanings: [
      {
        heading: "An ending, not an omen",
        body: "Across traditions — Jungian, Tibetan, Western esoteric — dream death is the symbolic close of a chapter. The Death card in Tarot (XIII) carries the same meaning: transformation, not extinction.",
      },
      {
        heading: "Your own death",
        body: "Dreaming of your own death often arrives at the edge of a major identity shift — leaving a career, ending a marriage, finishing a long project.",
      },
      {
        heading: "Death of someone you love",
        body: "These dreams are rarely literal. They usually reflect a fear of loss, a change in the relationship, or the dreamer's own grief about something unrelated to that person.",
      },
    ],
    questions: [
      "Is dreaming about death a bad sign?",
      "What does it mean to dream of your own funeral?",
      "What does it mean when a loved one dies in your dream?",
    ],
    related: ["snake", "falling", "water"],
  },
  {
    slug: "fire",
    symbol: "Fire",
    title: "Fire Dream Meaning — Passion, Destruction & Purification",
    description:
      "Fire dreams reveal where passion, anger, or transformation is burning through your life. Get a Caduceus interpretation at /dreams.",
    archetype: "Passion • Purification • Destruction",
    shortMeaning:
      "Fire in dreams is the element of transformation — it consumes what is dead and reveals what is true.",
    meanings: [
      {
        heading: "Passion and creative drive",
        body: "A controlled flame — a candle, a hearth, a forge — tracks creative aliveness. Something in you is generative right now.",
      },
      {
        heading: "Destruction and anger",
        body: "A house fire, wildfire, or fire you cannot escape often surfaces anger you have not yet acknowledged or a situation burning out of control.",
      },
      {
        heading: "Purification",
        body: "Walking through fire unharmed is one of the oldest initiation symbols across cultures — proof of having met something difficult and survived.",
      },
    ],
    questions: [
      "What does dreaming of fire mean?",
      "Is a house fire dream a warning?",
      "What does it mean to walk through fire in a dream?",
    ],
    related: ["death", "snake", "water"],
  },
  {
    slug: "house",
    symbol: "House",
    title: "House Dream Meaning — The Self, the Psyche & Hidden Rooms",
    description:
      "In dreams, the house is the self. Each room is a part of you. Decode hidden-room and locked-door dreams with Aetherion's Caduceus engine.",
    archetype: "Self • Psyche • Inner Architecture",
    shortMeaning:
      "Jung read the house as the architecture of the psyche. Every room you walk through is a part of you.",
    meanings: [
      {
        heading: "Hidden rooms",
        body: "Discovering a new room — especially one you didn't know existed — signals unrecognized capacity, talent, or memory rising into awareness.",
      },
      {
        heading: "The basement",
        body: "The basement is the unconscious. What you find there — a creature, a child, a treasure — is content from your shadow side asking for attention.",
      },
      {
        heading: "Locked doors and missing keys",
        body: "Locked doors and lost keys point to a part of yourself you cannot currently access. The dream is asking what you have closed off.",
      },
    ],
    questions: [
      "What does a house in a dream symbolize?",
      "What does it mean to find a hidden room in a dream?",
      "What does a flooded house dream mean?",
    ],
    related: ["water", "death", "snake"],
  },
  {
    slug: "being-chased",
    symbol: "Being Chased",
    title: "Being Chased Dream Meaning — Avoidance, Fear & Pursuit",
    description:
      "Chase dreams reveal what you are running from — a feeling, a memory, a decision. Ask the Caduceus engine what your pursuer represents.",
    archetype: "Avoidance • Shadow • Pursuit",
    shortMeaning:
      "What chases you in dreams is usually what you are avoiding in waking life. The pursuer is rarely the threat — the running is.",
    meanings: [
      {
        heading: "Avoidance",
        body: "Chase dreams almost always track avoidance — a conversation you are not having, a decision you are postponing, a feeling you will not sit with.",
      },
      {
        heading: "The shadow self",
        body: "When the pursuer is faceless, hooded, or shadowy, it often represents your own shadow — a part of you you have disowned and that is now asking to be integrated.",
      },
      {
        heading: "Turning around",
        body: "If you ever stop and face the pursuer in a dream, the dream usually transforms — the chaser becomes a teacher, a child, or simply disappears.",
      },
    ],
    questions: [
      "What does it mean to be chased in a dream?",
      "Why can't I run fast in my chase dreams?",
      "What does a faceless pursuer mean?",
    ],
    related: ["falling", "snake", "death"],
  },
  {
    slug: "baby",
    symbol: "Baby",
    title: "Baby Dream Meaning — New Beginnings, Vulnerability & Potential",
    description:
      "Dreaming of a baby reveals what is newly born in you — a project, a relationship, a self. Caduceus interpretation at /dreams.",
    archetype: "New Beginnings • Vulnerability • Potential",
    shortMeaning:
      "The baby in your dream is rarely a literal child. It is something new in you — fragile, demanding, full of potential.",
    meanings: [
      {
        heading: "A new beginning",
        body: "A healthy baby usually marks a new chapter — a project, a relationship, a self you are growing into. Note what the baby needs; that tells you what the new thing requires.",
      },
      {
        heading: "Forgotten baby",
        body: "Forgetting a baby is one of the most common — and most unsettling — dreams. It almost always tracks a real-life part of yourself or your work that you have neglected.",
      },
      {
        heading: "Crying baby",
        body: "A crying or distressed baby signals an inner need that is not being met. Ask: what in me is hungry, tired, or alone right now?",
      },
    ],
    questions: [
      "What does it mean to dream of a baby?",
      "What does forgetting a baby in a dream mean?",
      "Is dreaming of a baby a sign of pregnancy?",
    ],
    related: ["house", "water", "death"],
  },
  {
    slug: "spider",
    symbol: "Spider",
    title: "Spider Dream Meaning — Weaving, Patience & the Feminine",
    description:
      "Spiders in dreams symbolize creation, patience, and the weaving of fate. Get a Caduceus reading on your spider dream at /dreams.",
    archetype: "Weaving • Creation • The Feminine",
    shortMeaning:
      "The spider is the weaver — patient, creative, and quietly powerful. Spider dreams arrive when you are building something subtle.",
    meanings: [
      {
        heading: "Weaving fate",
        body: "Across mythologies — Arachne, Anansi, Spider Grandmother — the spider weaves reality itself. A spider in your dream often signals that you are spinning something important.",
      },
      {
        heading: "Patience and trap",
        body: "A spider in a web can also reflect feeling trapped, or someone weaving a situation around you. Note who is in the web.",
      },
      {
        heading: "The feminine creative",
        body: "Many traditions read the spider as a feminine creator-archetype — patient, quiet, deadly when threatened. A spider dream can announce a creative phase emerging.",
      },
    ],
    questions: [
      "What does a spider in a dream mean?",
      "Is a spider dream good or bad luck?",
      "What does dreaming of a giant spider mean?",
    ],
    related: ["snake", "house", "death"],
  },
  {
    slug: "naked-in-public",
    symbol: "Naked in Public",
    title: "Naked in Public Dream Meaning — Vulnerability & Authenticity",
    description:
      "Dreaming of being naked in public reveals fear of exposure or readiness to be seen. Get a Caduceus reading at /dreams.",
    archetype: "Exposure • Authenticity • Shame",
    shortMeaning:
      "Naked-in-public dreams arrive when you are afraid of being seen — or, paradoxically, when you are finally ready to be.",
    meanings: [
      {
        heading: "Fear of exposure",
        body: "These dreams often track impostor feelings or a sense that you are about to be found out — at work, in a relationship, in public life.",
      },
      {
        heading: "Authenticity",
        body: "When the dreamer is calm or others don't notice, the dream is naming readiness to be seen as you actually are.",
      },
      {
        heading: "Vulnerability as strength",
        body: "Sometimes the dream is rehearsing the experience of dropping the costume — a transition into more honest self-presentation.",
      },
    ],
    questions: [
      "What does it mean to dream you are naked?",
      "Why do I dream of being naked at school?",
      "Is a naked dream a sign of shame?",
    ],
    related: ["teeth", "being-chased", "house"],
  },
  {
    slug: "ex-partner",
    symbol: "Ex-Partner",
    title: "Dreaming of an Ex — Unfinished Feeling & Integration",
    description:
      "Dreaming about an ex rarely means you want them back — it means something they represented is asking for integration. Caduceus reading at /dreams.",
    archetype: "Unfinished • Integration • Memory",
    shortMeaning:
      "Dreams of an ex are usually about you, not them. The ex is a symbol for an unintegrated chapter of who you were.",
    meanings: [
      {
        heading: "Unfinished feeling",
        body: "Ex dreams often surface during transitions — when something in your current life rhymes with that old chapter and triggers unfinished feeling.",
      },
      {
        heading: "Integration",
        body: "The ex represents qualities you once shared with them — passion, instability, safety, freedom. The dream is asking you to reclaim or release those qualities in yourself.",
      },
      {
        heading: "Not a prediction",
        body: "These dreams almost never predict reconciliation. They are inner work, not omens.",
      },
    ],
    questions: [
      "Why do I keep dreaming about my ex?",
      "Does dreaming of an ex mean they miss me?",
      "What does it mean to dream of getting back with an ex?",
    ],
    related: ["baby", "house", "death"],
  },
  {
    slug: "car-accident",
    symbol: "Car Accident",
    title: "Car Accident Dream Meaning — Direction, Control & Collision",
    description:
      "A car accident in a dream often tracks a collision in waking life — values, relationships, or direction. Get a Caduceus reading at /dreams.",
    archetype: "Direction • Control • Collision",
    shortMeaning:
      "Cars in dreams are your path; an accident signals a collision between where you're going and what you actually want.",
    meanings: [
      {
        heading: "Loss of control",
        body: "Brakes failing, steering locking, or skidding — these track a real-life situation where you feel you cannot stop the momentum of what is happening.",
      },
      {
        heading: "Collision of values",
        body: "Two cars crashing often represents two parts of your life — work and relationship, ambition and rest — that are colliding instead of cooperating.",
      },
      {
        heading: "Wake-up call",
        body: "These dreams sometimes function as warnings from the body — slow down, change route, stop.",
      },
    ],
    questions: [
      "What does a car accident in a dream mean?",
      "Is dreaming of a car crash a warning?",
      "What does it mean to dream of brakes failing?",
    ],
    related: ["falling", "being-chased", "death"],
  },
  {
    slug: "pregnancy",
    symbol: "Pregnancy",
    title: "Pregnancy Dream Meaning — Creation, Gestation & New Self",
    description:
      "Pregnancy dreams reveal what is gestating in you — a project, a self, a vision. Get a Caduceus interpretation at /dreams.",
    archetype: "Creation • Gestation • New Self",
    shortMeaning:
      "Pregnancy dreams are about what is incubating in you — rarely literal, almost always creative.",
    meanings: [
      {
        heading: "Creative gestation",
        body: "A project, an idea, or a new identity is forming. Note how far along the pregnancy is; that tells you how close to birth it is.",
      },
      {
        heading: "Vulnerability",
        body: "Pregnancy is a vulnerable state. The dream can also surface protective feelings about something fragile you are growing.",
      },
      {
        heading: "Literal pregnancy",
        body: "Occasionally these dreams do arrive in people who are or are about to be pregnant — the body sometimes knows first.",
      },
    ],
    questions: [
      "What does it mean to dream of being pregnant?",
      "Are pregnancy dreams a sign of actual pregnancy?",
      "What does dreaming of a pregnant stranger mean?",
    ],
    related: ["baby", "water", "house"],
  },
  {
    slug: "money",
    symbol: "Money",
    title: "Money Dream Meaning — Value, Self-Worth & Energy",
    description:
      "Money in dreams maps to self-worth and energy, not literal cash. Find missing-money, found-money, and gift dream meanings at /dreams.",
    archetype: "Value • Self-Worth • Energy",
    shortMeaning:
      "Money in dreams is rarely about money. It tracks self-worth, energetic exchange, and what you believe you deserve.",
    meanings: [
      {
        heading: "Finding money",
        body: "Finding money often signals recognizing value in yourself or your situation that you had not seen.",
      },
      {
        heading: "Losing money",
        body: "Losing money can track fear of loss — but also resentment about giving more than you receive in a relationship or job.",
      },
      {
        heading: "Counting money",
        body: "Counting money tracks evaluation — you are weighing what something is worth to you.",
      },
    ],
    questions: [
      "What does it mean to dream of finding money?",
      "Is losing money in a dream bad luck?",
      "What does it mean to dream of being given money?",
    ],
    related: ["house", "baby", "ex-partner"],
  },
  {
    slug: "wolf",
    symbol: "Wolf",
    title: "Wolf Dream Meaning — Instinct, Pack & the Wild Self",
    description:
      "Wolves in dreams speak to instinct, freedom, and the wild self — alone or in pack. Get a Caduceus reading at /dreams.",
    archetype: "Instinct • Pack • Wild Self",
    shortMeaning:
      "The wolf is your instinct — solitary, loyal to its pack, dangerous if cornered. Wolf dreams arrive when your wild self is asking to be heard.",
    meanings: [
      {
        heading: "Instinct returning",
        body: "A wolf appearing at the edge of the forest or on a road often signals an instinct rising in you — something you have suppressed and need to listen to.",
      },
      {
        heading: "The lone wolf",
        body: "A solitary wolf can reflect chosen solitude or painful isolation, depending on how the dream feels in your body.",
      },
      {
        heading: "Pack dynamics",
        body: "A pack of wolves can represent your community, your family of origin, or the inner crowd of your competing selves.",
      },
    ],
    questions: [
      "What does a wolf in a dream mean?",
      "What does a pack of wolves represent?",
      "Is dreaming of a wolf a spiritual sign?",
    ],
    related: ["snake", "being-chased", "fire"],
  },
  {
    slug: "blood",
    symbol: "Blood",
    title: "Blood Dream Meaning — Life-Force, Sacrifice & Lineage",
    description:
      "Blood in dreams signals life-force, ancestral lineage, or what you are sacrificing. Get a Caduceus interpretation at /dreams.",
    archetype: "Life-Force • Lineage • Sacrifice",
    shortMeaning:
      "Blood is life-force made visible. In dreams it carries vitality, lineage, sacrifice — what you are willing to bleed for.",
    meanings: [
      {
        heading: "Life-force",
        body: "Bright, flowing blood often signals vitality — sometimes returning after a depleted period.",
      },
      {
        heading: "Sacrifice and cost",
        body: "Bleeding from a wound can track what something is costing you — energy, time, peace.",
      },
      {
        heading: "Lineage and ancestors",
        body: "Blood in dreams sometimes surfaces ancestral material — a grief, a gift, or a pattern moving through generations.",
      },
    ],
    questions: [
      "What does it mean to dream of blood?",
      "Is dreaming of bleeding a warning?",
      "What does menstrual blood in a dream mean?",
    ],
    related: ["fire", "death", "snake"],
  },
  {
    slug: "ocean",
    symbol: "Ocean",
    title: "Ocean Dream Meaning — The Vast Unconscious & the Sacred Feminine",
    description:
      "The ocean in dreams is the vast unconscious. Read tidal-wave, calm-sea, and ocean-creature dreams with the Caduceus engine.",
    archetype: "Unconscious • Vastness • Sacred Feminine",
    shortMeaning:
      "The ocean is the collective unconscious itself — vaster than any one dream can hold. Ocean dreams arrive at thresholds.",
    meanings: [
      {
        heading: "Standing at the edge",
        body: "Standing at the shore often represents standing at the edge of something vast you are not yet ready to enter.",
      },
      {
        heading: "Tidal waves",
        body: "Tidal waves usually track feelings — grief, fear, change — about to break over your conscious life. They are warnings to prepare, not predictions of doom.",
      },
      {
        heading: "What rises from below",
        body: "Whales, octopuses, drowned cities — what rises from the deep is unconscious material asking to be acknowledged.",
      },
    ],
    questions: [
      "What does the ocean symbolize in dreams?",
      "What does a tidal wave dream mean?",
      "Why do I dream of standing at the edge of the sea?",
    ],
    related: ["water", "snake", "death"],
  },
  {
    slug: "mirror",
    symbol: "Mirror",
    title: "Mirror Dream Meaning — Self-Reflection, Identity & the Double",
    description:
      "Mirror dreams confront you with your own face — sometimes accurately, sometimes not. Get a Caduceus reading at /dreams.",
    archetype: "Self-Reflection • Identity • The Double",
    shortMeaning:
      "Mirrors in dreams show you what you actually look like to yourself — not always what you expect to see.",
    meanings: [
      {
        heading: "Self-recognition",
        body: "A clear mirror showing your face often arrives during periods of genuine self-honesty.",
      },
      {
        heading: "The unfamiliar reflection",
        body: "Seeing someone else — or an older, younger, or distorted version of yourself — signals that your self-image is shifting.",
      },
      {
        heading: "Broken or empty mirrors",
        body: "A broken mirror can track shattered self-image; an empty mirror (no reflection) can signal a phase of feeling invisible or unformed.",
      },
    ],
    questions: [
      "What does it mean to dream of a mirror?",
      "What does a broken mirror in a dream mean?",
      "Why did I see a stranger in the mirror in my dream?",
    ],
    related: ["house", "naked-in-public", "ex-partner"],
  },
];

export const DREAM_SYMBOL_SLUGS: string[] = DREAM_SYMBOLS.map((s) => s.slug);

export function getDreamSymbol(slug: string): DreamSymbol | undefined {
  return DREAM_SYMBOLS.find((s) => s.slug === slug);
}
