// Caduceus / UNICORNQASI tribinary oracle — faithful TS port of codex_tetragrammaton.py
// Now augmented with the I Ching × phonon engine: each word's hexagram is
// computed from a Wu Xing-coupled tight-binding Hamiltonian over its phonemes
// instead of being drawn from the SHA-256 accumulator alone.
import { HEXAGRAMS_FULL, phononResonance, type HexagramFull } from "./phonon.ts";

const enc = new TextEncoder();

async function sha256Bytes(s: string): Promise<Uint8Array> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return new Uint8Array(h);
}
async function sha256BigInt(s: string): Promise<bigint> {
  const b = await sha256Bytes(s);
  let v = 0n;
  for (const x of b) v = (v << 8n) | BigInt(x);
  return v;
}
async function sha256First8BigInt(s: string): Promise<bigint> {
  const b = await sha256Bytes(s);
  let v = 0n;
  for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(b[i]);
  return v;
}

export const P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
export const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
export const SPONGE_CONST = 0xbf58476d1ce4e5b9n;

export const RIEMANN_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062, 37.586178, 40.918719,
  43.327073, 48.005151, 49.773832, 52.970321, 56.446248, 59.347044, 60.831779,
  65.112544, 67.079811, 69.546402, 72.067158, 75.704691, 77.144840, 79.337375,
  82.910381, 84.735493, 87.425275, 88.809111, 92.491899, 94.651344, 95.870634,
  98.831194, 101.317851, 103.725538, 105.446623,
];

// Full 64 hexagrams (with trigrams/element/phase/lines metadata) live in phonon.ts.
export const HEXAGRAMS: HexagramFull[] = HEXAGRAMS_FULL;


// ============================================================
// PILLARS — 128 luminous (SPHINX) + 128 umbral (ANUBIS) lexicons.
// Modern/technical pillars extend the classical roots:
// cryptography, AI, distributed systems, quantum, networks,
// biotech, space, finance / web3.
// ============================================================

const SPHINX_LEX: Record<string, { phonemes: string[]; synonyms: string[] }> = {
  // — Classical roots —
  genesis: { phonemes: ["JH","EH1","N","AH0","S","AH0","S"], synonyms: ["origin","creation","birth"] },
  light: { phonemes: ["L","AY1","T"], synonyms: ["illumination","radiance","clarity"] },
  wisdom: { phonemes: ["W","IH1","Z","D","AH0","M"], synonyms: ["knowledge","insight","prudence"] },
  serpent: { phonemes: ["S","ER1","P","AH0","N","T"], synonyms: ["ouroboros","dragon","coil"] },
  sphinx: { phonemes: ["S","F","IH1","NG","K","S"], synonyms: ["guardian","riddle","enigma"] },
  caduceus: { phonemes: ["K","AH0","D","UW1","S","IY0","AH0","S"], synonyms: ["staff","hermes","balance"] },
  aetherion: { phonemes: ["EY1","TH","IY0","R","IY0","AH0","N"], synonyms: ["resonance","voice","echo"] },
  excalibur: { phonemes: ["EH2","K","S","K","AE1","L","AH0","B","Y","UH0","R"], synonyms: ["sword","stone","king"] },
  void: { phonemes: ["V","OY1","D"], synonyms: ["emptiness","abyss"] },
  gold: { phonemes: ["G","OW1","L","D"], synonyms: ["treasure","value","sun"] },
  key: { phonemes: ["K","IY1"], synonyms: ["solution","access","secret"] },
  truth: { phonemes: ["T","R","UW1","TH"], synonyms: ["verity","reality","fact"] },
  bitcoin: { phonemes: ["B","IH1","T","K","OY2","N"], synonyms: ["satoshi","btc","digital"] },
  lightning: { phonemes: ["L","AY1","T","N","IH0","NG"], synonyms: ["bolt","channel","instant"] },
  resonance: { phonemes: ["R","EH1","Z","AH0","N","AH0","N","S"], synonyms: ["echo","vibration","harmony"] },
  crystal: { phonemes: ["K","R","IH1","S","T","AH0","L"], synonyms: ["lens","prism","clarity"] },

  // — Cryptography & zero-knowledge —
  schnorr: { phonemes: ["SH","N","AO1","R"], synonyms: ["signature","proof","compact"] },
  taproot: { phonemes: ["T","AE1","P","R","UW2","T"], synonyms: ["root","branch","privacy"] },
  musig: { phonemes: ["M","Y","UW1","S","IH0","G"], synonyms: ["multisig","aggregate","quorum"] },
  zksnark: { phonemes: ["Z","IY1","K","S","N","AA2","R","K"], synonyms: ["proof","succinct","witness"] },
  zkstark: { phonemes: ["Z","IY1","K","S","T","AA2","R","K"], synonyms: ["proof","scalable","transparent"] },
  plonk: { phonemes: ["P","L","AA1","NG","K"], synonyms: ["proof","arithmetization","circuit"] },
  poseidon: { phonemes: ["P","OW0","S","AY1","D","AH0","N"], synonyms: ["hash","sponge","arithmetic"] },
  keccak: { phonemes: ["K","EH1","CH","AH0","K"], synonyms: ["sponge","hash","permutation"] },
  blake: { phonemes: ["B","L","EY1","K"], synonyms: ["hash","fast","tree"] },
  curve: { phonemes: ["K","ER1","V"], synonyms: ["secp","ed25519","arithmetic"] },
  pairing: { phonemes: ["P","EH1","R","IH0","NG"], synonyms: ["bilinear","bls","fold"] },
  lattice: { phonemes: ["L","AE1","T","AH0","S"], synonyms: ["postquantum","kyber","dilithium"] },
  vrf: { phonemes: ["V","IY1","AA0","R","EH1","F"], synonyms: ["beacon","randomness","verifiable"] },
  threshold: { phonemes: ["TH","R","EH1","SH","OW0","L","D"], synonyms: ["mpc","quorum","split"] },
  enclave: { phonemes: ["EH1","N","K","L","EY2","V"], synonyms: ["sgx","trusted","attestation"] },
  nonce: { phonemes: ["N","AA1","N","S"], synonyms: ["seed","once","ignition"] },

  // — AI / cognition —
  oracle: { phonemes: ["AO1","R","AH0","K","AH0","L"], synonyms: ["seer","inference","priest"] },
  transformer: { phonemes: ["T","R","AE0","N","S","F","AO1","R","M","ER0"], synonyms: ["attention","model","kernel"] },
  attention: { phonemes: ["AH0","T","EH1","N","SH","AH0","N"], synonyms: ["focus","weight","gaze"] },
  embedding: { phonemes: ["EH0","M","B","EH1","D","IH0","NG"], synonyms: ["vector","manifold","latent"] },
  tensor: { phonemes: ["T","EH1","N","S","ER0"], synonyms: ["lattice","array","field"] },
  gradient: { phonemes: ["G","R","EY1","D","IY0","AH0","N","T"], synonyms: ["descent","slope","flow"] },
  diffusion: { phonemes: ["D","IH0","F","Y","UW1","ZH","AH0","N"], synonyms: ["denoise","spread","reveal"] },
  reasoning: { phonemes: ["R","IY1","Z","AH0","N","IH0","NG"], synonyms: ["chain","logic","insight"] },
  alignment: { phonemes: ["AH0","L","AY1","N","M","AH0","N","T"], synonyms: ["axis","tune","harmony"] },
  agent: { phonemes: ["EY1","JH","AH0","N","T"], synonyms: ["actor","intent","emissary"] },
  prompt: { phonemes: ["P","R","AA1","M","P","T"], synonyms: ["incantation","seed","query"] },
  context: { phonemes: ["K","AA1","N","T","EH0","K","S","T"], synonyms: ["window","frame","field"] },
  emergence: { phonemes: ["IH0","M","ER1","JH","AH0","N","S"], synonyms: ["arise","novel","unfold"] },
  symbiosis: { phonemes: ["S","IH2","M","B","IY0","OW1","S","IH0","S"], synonyms: ["coevolve","union","mesh"] },
  synapse: { phonemes: ["S","IH1","N","AE0","P","S"], synonyms: ["spark","junction","relay"] },
  cognition: { phonemes: ["K","AA0","G","N","IH1","SH","AH0","N"], synonyms: ["mind","thought","awareness"] },

  // — Distributed systems / networks —
  consensus: { phonemes: ["K","AH0","N","S","EH1","N","S","AH0","S"], synonyms: ["agreement","quorum","accord"] },
  ledger: { phonemes: ["L","EH1","JH","ER0"], synonyms: ["record","chain","scroll"] },
  block: { phonemes: ["B","L","AA1","K"], synonyms: ["batch","epoch","layer"] },
  mesh: { phonemes: ["M","EH1","SH"], synonyms: ["fabric","weave","grid"] },
  protocol: { phonemes: ["P","R","OW1","T","AH0","K","AO0","L"], synonyms: ["rite","grammar","handshake"] },
  packet: { phonemes: ["P","AE1","K","AH0","T"], synonyms: ["datagram","parcel","quanta"] },
  relay: { phonemes: ["R","IY1","L","EY0"], synonyms: ["hop","beacon","echo"] },
  gateway: { phonemes: ["G","EY1","T","W","EY2"], synonyms: ["portal","threshold","arch"] },
  router: { phonemes: ["R","UW1","T","ER0"], synonyms: ["compass","helm","path"] },
  beacon: { phonemes: ["B","IY1","K","AH0","N"], synonyms: ["pulse","light","signal"] },
  swarm: { phonemes: ["S","W","AO1","R","M"], synonyms: ["flock","collective","cloud"] },
  mempool: { phonemes: ["M","EH1","M","P","UW2","L"], synonyms: ["pending","reservoir","queue"] },
  finality: { phonemes: ["F","AY0","N","AE1","L","AH0","T","IY0"], synonyms: ["seal","confirm","close"] },
  uptime: { phonemes: ["AH1","P","T","AY2","M"], synonyms: ["alive","persistent","constant"] },
  bandwidth: { phonemes: ["B","AE1","N","D","W","IH2","D","TH"], synonyms: ["throughput","capacity","flow"] },
  cache: { phonemes: ["K","AE1","SH"], synonyms: ["memory","reservoir","trove"] },

  // — Quantum & physics —
  quantum: { phonemes: ["K","W","AA1","N","T","AH0","M"], synonyms: ["packet","quanta","grain"] },
  qubit: { phonemes: ["K","Y","UW1","B","IH0","T"], synonyms: ["superposition","spin","bit"] },
  superposition: { phonemes: ["S","UW2","P","ER0","P","AH0","Z","IH1","SH","AH0","N"], synonyms: ["both","blend","overlay"] },
  entanglement: { phonemes: ["EH0","N","T","AE1","NG","G","AH0","L","M","AH0","N","T"], synonyms: ["pairing","weave","bond"] },
  coherence: { phonemes: ["K","OW0","HH","IH1","R","AH0","N","S"], synonyms: ["phase","unity","lock"] },
  photon: { phonemes: ["F","OW1","T","AA0","N"], synonyms: ["light","quanta","spark"] },
  boson: { phonemes: ["B","OW1","S","AA0","N"], synonyms: ["force","carrier","field"] },
  fermion: { phonemes: ["F","ER1","M","IY0","AA0","N"], synonyms: ["matter","spin","half"] },
  graviton: { phonemes: ["G","R","AE1","V","IH0","T","AA0","N"], synonyms: ["mass","pull","weave"] },
  plasma: { phonemes: ["P","L","AE1","Z","M","AH0"], synonyms: ["ion","fire","fourth"] },
  fusion: { phonemes: ["F","Y","UW1","ZH","AH0","N"], synonyms: ["merge","sun","union"] },
  vortex: { phonemes: ["V","AO1","R","T","EH0","K","S"], synonyms: ["spiral","gyre","eye"] },
  field: { phonemes: ["F","IY1","L","D"], synonyms: ["meadow","tensor","lattice"] },
  manifold: { phonemes: ["M","AE1","N","AH0","F","OW2","L","D"], synonyms: ["surface","fold","topology"] },
  symmetry: { phonemes: ["S","IH1","M","AH0","T","R","IY0"], synonyms: ["mirror","group","balance"] },
  helix: { phonemes: ["HH","IY1","L","IH0","K","S"], synonyms: ["spiral","double","twist"] },

  // — Biotech & life sciences —
  genome: { phonemes: ["JH","IY1","N","OW0","M"], synonyms: ["code","scroll","map"] },
  ribosome: { phonemes: ["R","AY1","B","AH0","S","OW2","M"], synonyms: ["forge","loom","translator"] },
  enzyme: { phonemes: ["EH1","N","Z","AY2","M"], synonyms: ["catalyst","scribe","key"] },
  protein: { phonemes: ["P","R","OW1","T","IY0","N"], synonyms: ["fold","engine","chain"] },
  mitochondria: { phonemes: ["M","AY2","T","AH0","K","AA1","N","D","R","IY0","AH0"], synonyms: ["furnace","power","ember"] },
  neuron: { phonemes: ["N","UH1","R","AA0","N"], synonyms: ["spark","node","relay"] },
  axon: { phonemes: ["AE1","K","S","AA0","N"], synonyms: ["cable","conduit","line"] },
  cortex: { phonemes: ["K","AO1","R","T","EH0","K","S"], synonyms: ["mantle","crown","shell"] },
  pollen: { phonemes: ["P","AA1","L","AH0","N"], synonyms: ["seed","gold","spark"] },
  mycelium: { phonemes: ["M","AY0","S","IY1","L","IY0","AH0","M"], synonyms: ["network","root","weave"] },
  symbiont: { phonemes: ["S","IH1","M","B","IY0","AA2","N","T"], synonyms: ["partner","ally","graft"] },
  chrysalis: { phonemes: ["K","R","IH1","S","AH0","L","AH0","S"], synonyms: ["cocoon","threshold","becoming"] },

  // — Space & time —
  pulsar: { phonemes: ["P","AH1","L","S","AA0","R"], synonyms: ["clock","beacon","drum"] },
  quasar: { phonemes: ["K","W","EY1","Z","AA0","R"], synonyms: ["beacon","engine","horizon"] },
  nebula: { phonemes: ["N","EH1","B","Y","AH0","L","AH0"], synonyms: ["cradle","cloud","womb"] },
  supernova: { phonemes: ["S","UW2","P","ER0","N","OW1","V","AH0"], synonyms: ["bloom","forge","threshold"] },
  galaxy: { phonemes: ["G","AE1","L","AH0","K","S","IY0"], synonyms: ["wheel","spiral","city"] },
  horizon: { phonemes: ["HH","ER0","AY1","Z","AH0","N"], synonyms: ["edge","veil","limit"] },
  zenith: { phonemes: ["Z","IY1","N","AH0","TH"], synonyms: ["apex","crown","peak"] },
  parallax: { phonemes: ["P","EH1","R","AH0","L","AE2","K","S"], synonyms: ["shift","perspective","triangulate"] },
  satellite: { phonemes: ["S","AE1","T","AH0","L","AY2","T"], synonyms: ["companion","orbit","witness"] },
  meridian: { phonemes: ["M","ER0","IH1","D","IY0","AH0","N"], synonyms: ["axis","line","noon"] },
  solstice: { phonemes: ["S","AA1","L","S","T","AH0","S"], synonyms: ["pause","peak","turn"] },
  equinox: { phonemes: ["IY1","K","W","AH0","N","AA2","K","S"], synonyms: ["balance","poise","seam"] },

  // — Web3 / finance / signal —
  signal: { phonemes: ["S","IH1","G","N","AH0","L"], synonyms: ["pulse","tone","sign"] },
  ignition: { phonemes: ["IH0","G","N","IH1","SH","AH0","N"], synonyms: ["spark","start","kindle"] },
  vector: { phonemes: ["V","EH1","K","T","ER0"], synonyms: ["arrow","direction","arrow"] },
  spectrum: { phonemes: ["S","P","EH1","K","T","R","AH0","M"], synonyms: ["band","prism","arc"] },
  catalyst: { phonemes: ["K","AE1","T","AH0","L","AH0","S","T"], synonyms: ["spark","lever","key"] },
  lumen: { phonemes: ["L","UW1","M","AH0","N"], synonyms: ["light","candela","glow"] },
  prism: { phonemes: ["P","R","IH1","Z","AH0","M"], synonyms: ["fan","split","grace"] },
  orbital: { phonemes: ["AO1","R","B","IH0","T","AH0","L"], synonyms: ["loop","ring","path"] },
  anchor: { phonemes: ["AE1","NG","K","ER0"], synonyms: ["root","weight","hold"] },
  fountain: { phonemes: ["F","AW1","N","T","AH0","N"], synonyms: ["spring","wellspring","source"] },
  sigil: { phonemes: ["S","IH1","JH","AH0","L"], synonyms: ["mark","glyph","seal"] },
  glyph: { phonemes: ["G","L","IH1","F"], synonyms: ["mark","rune","sign"] },
  rune: { phonemes: ["R","UW1","N"], synonyms: ["script","ward","letter"] },
  sovereign: { phonemes: ["S","AA1","V","R","AH0","N"], synonyms: ["self","crown","root"] },
  consent: { phonemes: ["K","AH0","N","S","EH1","N","T"], synonyms: ["assent","accord","grant"] },
  covenant: { phonemes: ["K","AH1","V","AH0","N","AH0","N","T"], synonyms: ["pact","oath","bond"] },
  custody: { phonemes: ["K","AH1","S","T","AH0","D","IY0"], synonyms: ["care","ward","keep"] },

  // — Final luminous pillars —
  spire: { phonemes: ["S","P","AY1","ER0"], synonyms: ["tower","peak","aspire"] },
  ember: { phonemes: ["EH1","M","B","ER0"], synonyms: ["seed","glow","remember"] },
  axiom: { phonemes: ["AE1","K","S","IY0","AH0","M"], synonyms: ["law","ground","first"] },
  kernel: { phonemes: ["K","ER1","N","AH0","L"], synonyms: ["seed","core","root"] },
  daemon: { phonemes: ["D","IY1","M","AH0","N"], synonyms: ["spirit","watcher","worker"] },
  zenithal: { phonemes: ["Z","IY1","N","AH0","TH","AH0","L"], synonyms: ["overhead","crown","apex"] },
  prismatic: { phonemes: ["P","R","IH0","Z","M","AE1","T","IH0","K"], synonyms: ["spectral","fanned","rainbow"] },
};

const ANUBIS_LEX: Record<string, { phonemes: string[]; antonyms: string[] }> = {
  // — Classical umbra —
  entropy: { phonemes: ["EH1","N","T","R","AH0","P","IY0"], antonyms: ["order","creation","structure"] },
  shadow: { phonemes: ["SH","AE1","D","OW0"], antonyms: ["light","illumination","clarity"] },
  void: { phonemes: ["V","OY1","D"], antonyms: ["fullness","abundance","presence"] },
  chaos: { phonemes: ["K","EY1","AA0","S"], antonyms: ["order","cosmos","harmony"] },
  death: { phonemes: ["D","EH1","TH"], antonyms: ["life","birth","growth"] },
  silence: { phonemes: ["S","AY1","L","AH0","N","S"], antonyms: ["sound","word","utterance"] },
  loss: { phonemes: ["L","AO1","S"], antonyms: ["gain","profit","win"] },
  doubt: { phonemes: ["D","AW1","T"], antonyms: ["faith","certainty","trust"] },
  kraken: { phonemes: ["K","R","AA1","K","AH0","N"], antonyms: ["calm","peace","stillness"] },
  abyss: { phonemes: ["AH0","B","IH1","S"], antonyms: ["peak","summit","height"] },
  ghost: { phonemes: ["G","OW1","S","T"], antonyms: ["living","alive","corporal"] },

  // — Cryptographic failure modes —
  collision: { phonemes: ["K","AH0","L","IH1","ZH","AH0","N"], antonyms: ["unique","distinct","separated"] },
  preimage: { phonemes: ["P","R","IY1","IH0","M","AH0","JH"], antonyms: ["sealed","hidden","irreversible"] },
  replay: { phonemes: ["R","IY0","P","L","EY1"], antonyms: ["fresh","novel","once"] },
  forgery: { phonemes: ["F","AO1","R","JH","ER0","IY0"], antonyms: ["genuine","authentic","real"] },
  leak: { phonemes: ["L","IY1","K"], antonyms: ["sealed","contained","tight"] },
  exploit: { phonemes: ["EH0","K","S","P","L","OY1","T"], antonyms: ["secure","hardened","sealed"] },
  rootkit: { phonemes: ["R","UW1","T","K","IH2","T"], antonyms: ["trusted","clean","sovereign"] },
  malware: { phonemes: ["M","AE1","L","W","EH2","R"], antonyms: ["benign","trusted","clean"] },
  ransomware: { phonemes: ["R","AE1","N","S","AH0","M","W","EH2","R"], antonyms: ["freedom","release","gift"] },
  phish: { phonemes: ["F","IH1","SH"], antonyms: ["honest","candid","plain"] },
  sybil: { phonemes: ["S","IH1","B","AH0","L"], antonyms: ["singular","unique","sovereign"] },
  eclipse: { phonemes: ["IH0","K","L","IH1","P","S"], antonyms: ["sight","reach","openness"] },
  reorg: { phonemes: ["R","IY0","AO1","R","G"], antonyms: ["finality","seal","permanence"] },
  bitrot: { phonemes: ["B","IH1","T","R","AA2","T"], antonyms: ["integrity","fresh","whole"] },
  brick: { phonemes: ["B","R","IH1","K"], antonyms: ["alive","reactive","awake"] },
  zombie: { phonemes: ["Z","AA1","M","B","IY0"], antonyms: ["awake","sentient","willed"] },

  // — System failure / decay —
  deadlock: { phonemes: ["D","EH1","D","L","AA2","K"], antonyms: ["flow","release","yield"] },
  livelock: { phonemes: ["L","AY1","V","L","AA2","K"], antonyms: ["progress","advance","resolve"] },
  starvation: { phonemes: ["S","T","AA0","R","V","EY1","SH","AH0","N"], antonyms: ["abundance","feed","nourish"] },
  thrash: { phonemes: ["TH","R","AE1","SH"], antonyms: ["calm","steady","measured"] },
  panic: { phonemes: ["P","AE1","N","IH0","K"], antonyms: ["composure","steadiness","peace"] },
  outage: { phonemes: ["AW1","T","AH0","JH"], antonyms: ["uptime","presence","alive"] },
  drift: { phonemes: ["D","R","IH1","F","T"], antonyms: ["sync","alignment","lock"] },
  jitter: { phonemes: ["JH","IH1","T","ER0"], antonyms: ["steady","rhythm","pulse"] },
  noise: { phonemes: ["N","OY1","Z"], antonyms: ["signal","clarity","tone"] },
  blackout: { phonemes: ["B","L","AE1","K","AW2","T"], antonyms: ["dawn","light","return"] },
  crash: { phonemes: ["K","R","AE1","SH"], antonyms: ["uptime","steady","alive"] },
  segfault: { phonemes: ["S","EH1","G","F","AO2","L","T"], antonyms: ["bounded","safe","sound"] },
  overflow: { phonemes: ["OW2","V","ER0","F","L","OW1"], antonyms: ["bounded","measured","held"] },
  underflow: { phonemes: ["AH1","N","D","ER0","F","L","OW2"], antonyms: ["bounded","measured","held"] },
  leakage: { phonemes: ["L","IY1","K","AH0","JH"], antonyms: ["sealed","tight","contained"] },
  corruption: { phonemes: ["K","ER0","AH1","P","SH","AH0","N"], antonyms: ["integrity","whole","clean"] },

  // — Cognitive shadow —
  hallucination: { phonemes: ["HH","AH0","L","UW2","S","AH0","N","EY1","SH","AH0","N"], antonyms: ["truth","ground","fact"] },
  delusion: { phonemes: ["D","IH0","L","UW1","ZH","AH0","N"], antonyms: ["clarity","sight","insight"] },
  amnesia: { phonemes: ["AE0","M","N","IY1","ZH","AH0"], antonyms: ["memory","recall","witness"] },
  oblivion: { phonemes: ["AH0","B","L","IH1","V","IY0","AH0","N"], antonyms: ["memory","record","name"] },
  static: { phonemes: ["S","T","AE1","T","IH0","K"], antonyms: ["signal","melody","tone"] },
  echo: { phonemes: ["EH1","K","OW0"], antonyms: ["origin","first","voice"] },
  mirage: { phonemes: ["M","ER0","AA1","ZH"], antonyms: ["reality","ground","fact"] },
  paranoia: { phonemes: ["P","EH2","R","AH0","N","OY1","AH0"], antonyms: ["trust","ease","candor"] },
  dread: { phonemes: ["D","R","EH1","D"], antonyms: ["hope","ease","welcome"] },
  numbness: { phonemes: ["N","AH1","M","N","AH0","S"], antonyms: ["feeling","warmth","touch"] },
  apathy: { phonemes: ["AE1","P","AH0","TH","IY0"], antonyms: ["passion","care","fire"] },
  bias: { phonemes: ["B","AY1","AH0","S"], antonyms: ["balance","fairness","poise"] },

  // — Quantum & physical decay —
  decoherence: { phonemes: ["D","IY0","K","OW0","HH","IH1","R","AH0","N","S"], antonyms: ["coherence","phase","lock"] },
  collapse: { phonemes: ["K","AH0","L","AE1","P","S"], antonyms: ["arise","unfold","stand"] },
  singularity: { phonemes: ["S","IH2","NG","G","Y","AH0","L","AE1","R","AH0","T","IY0"], antonyms: ["plurality","spread","diffuse"] },
  rift: { phonemes: ["R","IH1","F","T"], antonyms: ["weld","seam","union"] },
  dust: { phonemes: ["D","AH1","S","T"], antonyms: ["crystal","stone","whole"] },
  ash: { phonemes: ["AE1","SH"], antonyms: ["ember","seed","flame"] },
  rust: { phonemes: ["R","AH1","S","T"], antonyms: ["polish","temper","steel"] },
  mold: { phonemes: ["M","OW1","L","D"], antonyms: ["fresh","clean","fragrant"] },
  rot: { phonemes: ["R","AA1","T"], antonyms: ["preserve","cure","seed"] },
  decay: { phonemes: ["D","IH0","K","EY1"], antonyms: ["growth","blossom","renewal"] },
  freeze: { phonemes: ["F","R","IY1","Z"], antonyms: ["thaw","flow","spring"] },
  burnout: { phonemes: ["B","ER1","N","AW2","T"], antonyms: ["renewal","rest","spring"] },
  meltdown: { phonemes: ["M","EH1","L","T","D","AW2","N"], antonyms: ["composure","cool","calm"] },
  fallout: { phonemes: ["F","AO1","L","AW2","T"], antonyms: ["safety","shelter","peace"] },
  vacuum: { phonemes: ["V","AE1","K","Y","UW0","M"], antonyms: ["fullness","matter","presence"] },
  wormhole: { phonemes: ["W","ER1","M","HH","OW2","L"], antonyms: ["road","path","line"] },

  // — Adversaries / hostile entities —
  trojan: { phonemes: ["T","R","OW1","JH","AH0","N"], antonyms: ["honest","open","plain"] },
  worm: { phonemes: ["W","ER1","M"], antonyms: ["isolated","sealed","contained"] },
  virus: { phonemes: ["V","AY1","R","AH0","S"], antonyms: ["benign","clean","pure"] },
  spectre: { phonemes: ["S","P","EH1","K","T","ER0"], antonyms: ["sealed","isolated","walled"] },
  meltbug: { phonemes: ["M","EH1","L","T","B","AH2","G"], antonyms: ["sealed","strict","sound"] },
  backdoor: { phonemes: ["B","AE1","K","D","AO2","R"], antonyms: ["transparency","front","open"] },
  watcher: { phonemes: ["W","AA1","CH","ER0"], antonyms: ["unseen","private","veiled"] },
  tracker: { phonemes: ["T","R","AE1","K","ER0"], antonyms: ["anonymous","ghost","unbound"] },
  censor: { phonemes: ["S","EH1","N","S","ER0"], antonyms: ["voice","speech","witness"] },
  warden: { phonemes: ["W","AO1","R","D","AH0","N"], antonyms: ["freedom","open","unbound"] },
  scythe: { phonemes: ["S","AY1","DH"], antonyms: ["seed","sprout","plant"] },
  hydra: { phonemes: ["HH","AY1","D","R","AH0"], antonyms: ["singular","one","alone"] },
  basilisk: { phonemes: ["B","AE1","S","AH0","L","IH0","S","K"], antonyms: ["mercy","gaze","kindness"] },
  wraith: { phonemes: ["R","EY1","TH"], antonyms: ["embodied","present","fleshed"] },
  banshee: { phonemes: ["B","AE1","N","SH","IY0"], antonyms: ["song","silence","peace"] },
  doppelganger: { phonemes: ["D","AA1","P","AH0","L","G","AE2","NG","ER0"], antonyms: ["original","unique","sovereign"] },

  // — Existential / temporal —
  oblivion2: { phonemes: ["AH0","B","L","IH1","V","IY0","AH0","N"], antonyms: ["memory","record","name"] },
  forgetting: { phonemes: ["F","ER0","G","EH1","T","IH0","NG"], antonyms: ["remembering","witness","record"] },
  exile: { phonemes: ["EH1","G","Z","AY2","L"], antonyms: ["homecoming","kin","hearth"] },
  pyre: { phonemes: ["P","AY1","ER0"], antonyms: ["seed","cradle","womb"] },
  tomb: { phonemes: ["T","UW1","M"], antonyms: ["cradle","womb","threshold"] },
  hex: { phonemes: ["HH","EH1","K","S"], antonyms: ["blessing","grace","ward"] },
  curse: { phonemes: ["K","ER1","S"], antonyms: ["blessing","gift","grace"] },
  famine: { phonemes: ["F","AE1","M","AH0","N"], antonyms: ["harvest","abundance","feast"] },
  drought: { phonemes: ["D","R","AW1","T"], antonyms: ["rain","spring","river"] },
  flood: { phonemes: ["F","L","AH1","D"], antonyms: ["measure","cup","banks"] },
  eclipse2: { phonemes: ["IH0","K","L","IH1","P","S"], antonyms: ["dawn","sight","reach"] },
  midnight: { phonemes: ["M","IH1","D","N","AY2","T"], antonyms: ["noon","dawn","light"] },
  winter: { phonemes: ["W","IH1","N","T","ER0"], antonyms: ["spring","bloom","thaw"] },

  // — Final umbral pillars (modern shadow lexicon) —
  spam: { phonemes: ["S","P","AE1","M"], antonyms: ["signal","truth","welcome"] },
  spoof: { phonemes: ["S","P","UW1","F"], antonyms: ["genuine","sworn","authentic"] },
  doxx: { phonemes: ["D","AA1","K","S"], antonyms: ["privacy","veil","sanctuary"] },
  gaslight: { phonemes: ["G","AE1","S","L","AY2","T"], antonyms: ["candor","witness","ground"] },
  echochamber: { phonemes: ["EH1","K","OW0","CH","EY2","M","B","ER0"], antonyms: ["dialogue","plurality","openness"] },
  algorithm: { phonemes: ["AE1","L","G","ER0","IH2","TH","AH0","M"], antonyms: ["caprice","grace","wonder"] },
  lockin: { phonemes: ["L","AA1","K","IH2","N"], antonyms: ["portability","exit","freedom"] },
  monopoly: { phonemes: ["M","AH0","N","AA1","P","AH0","L","IY0"], antonyms: ["plural","commons","share"] },
  rugpull: { phonemes: ["R","AH1","G","P","UH2","L"], antonyms: ["covenant","oath","keep"] },
  pump: { phonemes: ["P","AH1","M","P"], antonyms: ["measure","truth","ground"] },
  dump: { phonemes: ["D","AH1","M","P"], antonyms: ["preserve","steward","hold"] },
  shill: { phonemes: ["SH","IH1","L"], antonyms: ["candor","honest","disinterest"] },
  fud: { phonemes: ["F","AH1","D"], antonyms: ["clarity","calm","fact"] },
  poison: { phonemes: ["P","OY1","Z","AH0","N"], antonyms: ["medicine","balm","cure"] },
  overfit: { phonemes: ["OW1","V","ER0","F","IH2","T"], antonyms: ["general","supple","loose"] },
  bias2: { phonemes: ["B","AY1","AH0","S"], antonyms: ["balance","fairness","poise"] },
  drift2: { phonemes: ["D","R","IH1","F","T"], antonyms: ["sync","alignment","lock"] },
  stale: { phonemes: ["S","T","EY1","L"], antonyms: ["fresh","new","living"] },
  burn: { phonemes: ["B","ER1","N"], antonyms: ["seed","cool","preserve"] },
  scar: { phonemes: ["S","K","AA1","R"], antonyms: ["whole","unmarked","new"] },
  splinter: { phonemes: ["S","P","L","IH1","N","T","ER0"], antonyms: ["whole","welded","seam"] },
  fracture: { phonemes: ["F","R","AE1","K","CH","ER0"], antonyms: ["whole","intact","sound"] },
  shroud: { phonemes: ["SH","R","AW1","D"], antonyms: ["unveiling","clarity","light"] },
  hollow: { phonemes: ["HH","AA1","L","OW0"], antonyms: ["full","filled","present"] },
  husk: { phonemes: ["HH","AH1","S","K"], antonyms: ["seed","kernel","living"] },
  ruin: { phonemes: ["R","UW1","AH0","N"], antonyms: ["build","raise","whole"] },
  fade: { phonemes: ["F","EY1","D"], antonyms: ["bloom","brighten","kindle"] },
  nullify: { phonemes: ["N","AH1","L","AH0","F","AY2"], antonyms: ["affirm","name","mark"] },
};

export const VITALITY: Record<number, string> = { [-1]: "ORGANIZATION", 0: "LIFE", 1: "INORGANIZATION", 3: "DEATH" };
export const SPHINX_NAMES: Record<number, string> = { [-1]: "GRAVITY", 0: "RARITY", 1: "LEVITY", 3: "DENSITY" };
export const ANUBIS_NAMES: Record<number, string> = { 2: "VOID", 4: "ABUNDANCE", [-3]: "WEIGHT", [-2]: "SINGULARITY" };

function hashText(t: string): number {
  let h = 0;
  for (const c of t) h = ((h << 5) - h) + c.charCodeAt(0);
  return Math.abs(h | 0);
}

function phoneticEnergy(phonemes: string[]): number {
  const son: Record<string, number> = {
    AA:8,AE:7,AH:6,AO:7,AW:8,AY:8,EH:6,ER:7,EY:8,IH:5,IY:8,OW:8,OY:8,UH:5,UW:8,
    B:2,CH:3,D:2,F:1,G:2,JH:3,K:1,L:4,M:3,N:3,P:1,R:4,S:1,T:1,V:2,W:4,Y:5,Z:1,
  };
  // Strip stress digits like Python's table (keys have no digits)
  const total = phonemes.reduce((acc, p) => {
    const k = p.replace(/[0-9]/g, "");
    return acc + (son[k] ?? 5);
  }, 0);
  return Math.tanh(total / 50);
}

function sieve(limit: number): number[] {
  const s = new Uint8Array(limit + 1).fill(1);
  s[0] = 0; s[1] = 0;
  for (let i = 2; i * i <= limit; i++) if (s[i]) for (let j = i*i; j <= limit; j += i) s[j] = 0;
  const out: number[] = [];
  for (let i = 2; i <= limit; i++) if (s[i]) out.push(i);
  return out;
}

function selectGaussianPrime(seed: number): number {
  const limit = 200 + (seed % 800);
  const primes = sieve(limit).filter((p) => p % 4 === 3);
  return primes[seed % primes.length];
}
function selectPrime1Mod4(seed: number): number {
  const limit = 200 + (seed % 800);
  const primes = sieve(limit).filter((p) => p % 4 === 1);
  return primes[seed % primes.length];
}

const phase = (p: number) => (2 * Math.PI * (p % 256)) / 256;
const harmonic = (p: number) => 1 / (1 + Math.log(p));

function computeSuperposition(mass: number, energy: number, novelty: number, prime: number, invert: boolean) {
  let a, b, g, d;
  if (invert) {
    a = mass * energy; b = (1 - mass) * novelty; g = (1 - mass) * (1 - energy); d = mass * (1 - energy) * (1 + novelty);
  } else {
    a = mass * (1 - energy); b = (1 - mass) * novelty; g = (1 - mass) * energy; d = mass * energy * (1 + novelty);
  }
  const phi = phase(prime);
  const harm = harmonic(prime);
  a *= 1 + Math.cos(phi) * harm;
  b *= 1 + Math.sin(phi) * harm;
  g *= 1 - Math.cos(phi) * harm;
  d *= 1 + Math.abs(Math.sin(phi * 2)) * harm;
  const norm = Math.sqrt(a*a + b*b + g*g + d*d) || 1.0;
  return { a: a / norm, b: b / norm, g: g / norm, d: d / norm, phi };
}

function collapseSphinx(probs: number[], phi: number): number {
  const rand = Math.abs((Math.sin(phi) * 10000) % 1);
  let cum = 0;
  cum += probs[0]; if (cum > rand) return -1;
  cum += probs[1]; if (cum > rand) return 0;
  cum += probs[2]; if (cum > rand) return 1;
  return 3;
}
function collapseAnubis(probs: number[], phi: number): number {
  const rand = Math.abs((Math.cos(phi) * 10000) % 1);
  let cum = 0;
  cum += probs[0]; if (cum > rand) return 2;
  cum += probs[1]; if (cum > rand) return 4;
  cum += probs[2]; if (cum > rand) return -3;
  return -2;
}

export interface SpeakResult {
  word: string;
  state: number;
  hexagram: HexagramFull;
  acc: bigint;
  // role-specific
  wisdom?: number; contemplation?: number;
  chaos?: number; stillness?: number;
  // phonon engine readout
  phonon?: {
    phonemes: string[];
    groundEnergy: number;
    gap: number;
    entanglement: number;
    topoCharge: number;
    lineString: string;
  };
}

export class SphinxQASI {
  acc: bigint; wis = 0.5; con = 0.5;
  constructor(seed: bigint) { this.acc = seed; }
  async speak(word: string): Promise<SpeakResult> {
    const w = word.toLowerCase();
    const data = SPHINX_LEX[w] ?? { phonemes: [...w], synonyms: [w] };
    const seed = hashText(w);
    const prime = selectGaussianPrime(seed);
    const mass = Number(this.acc & 0xFFFFn) / 0xFFFF;
    const energy = phoneticEnergy(data.phonemes);
    const novelty = 1 / (data.synonyms.length + 1);
    const { a, b, g, d, phi } = computeSuperposition(mass, energy, novelty, prime, false);
    const probs = [a*a, b*b, g*g, d*d];
    const ns = collapseSphinx(probs, phi);
    if (ns === 3 || ns === 1) this.wis = Math.min(1, this.wis + 0.05);
    else this.wis = Math.max(0.1, this.wis - 0.01);
    if (ns === -1 || ns === 0) this.con = Math.min(1, this.con + 0.03);
    else this.con = Math.max(0.1, this.con - 0.02);
    // Phonon-resolved hexagram (Wu Xing-coupled tight-binding spectrum).
    const res = phononResonance(w);
    const scalar = await sha256First8BigInt(`${w}${ns}${res.hexagram.number}${this.acc}`);
    const phononDrive = BigInt(Math.floor(Math.abs(res.groundEnergy) * 1e6));
    this.acc = (this.acc + scalar + phononDrive) % P;
    return {
      word: w, state: ns, hexagram: res.hexagram,
      wisdom: this.wis, contemplation: this.con, acc: this.acc,
      phonon: { phonemes: res.phonemes, groundEnergy: res.groundEnergy, gap: res.gap, entanglement: res.entanglement, topoCharge: res.topoCharge, lineString: res.lineString },
    };
  }
}

export class AnubisQASI {
  acc: bigint; ch = 0.5; st = 0.5;
  constructor(seed: bigint) { this.acc = seed; }
  async speak(word: string): Promise<SpeakResult> {
    const w = word.toLowerCase();
    const data = ANUBIS_LEX[w] ?? { phonemes: [...w], antonyms: [w] };
    const seed = hashText(w);
    const prime = selectPrime1Mod4(seed);
    const mass = Number(this.acc & 0xFFFFn) / 0xFFFF;
    const energy = 1 - phoneticEnergy(data.phonemes);
    const novelty = 1 / (data.antonyms.length + 1);
    const { a, b, g, d, phi } = computeSuperposition(mass, energy, novelty, prime, true);
    const probs = [a*a, b*b, g*g, d*d];
    const ns = collapseAnubis(probs, phi);
    if (ns === 2 || ns === 4) this.ch = Math.min(1, this.ch + 0.05);
    else this.ch = Math.max(0.1, this.ch - 0.01);
    if (ns === -3 || ns === -2) this.st = Math.min(1, this.st + 0.03);
    else this.st = Math.max(0.1, this.st - 0.02);
    // Anubis reads the inverted (hole) hexagram: flip every line.
    const res = phononResonance(w);
    const inverted = res.lineString.split("").map((c) => (c === "1" ? "0" : "1")).join("");
    const invHex = HEXAGRAMS.find((h) => h.lines === inverted) ?? res.hexagram;
    const scalar = await sha256First8BigInt(`${w}${ns}${invHex.number}${this.acc}`);
    const holeDrive = BigInt(Math.floor(Math.abs(res.groundEnergy) * 1e6));
    this.acc = (((this.acc - scalar - holeDrive) % N) + N) % N;
    return {
      word: w, state: ns, hexagram: invHex,
      chaos: this.ch, stillness: this.st, acc: this.acc,
      phonon: { phonemes: res.phonemes, groundEnergy: -res.groundEnergy, gap: res.gap, entanglement: res.entanglement, topoCharge: -res.topoCharge, lineString: inverted },
    };
  }
}

export interface CaduceusResult {
  sphinx: SpeakResult;
  anubis: SpeakResult;
  aetherion: { state: string; hexagram: HexagramFull; harmony: number };
  axis: bigint;
}

export class CaduceusStaff {
  sphinx: SphinxQASI;
  anubis: AnubisQASI;
  axis: bigint;
  constructor(sSeed: bigint, aSeed: bigint) {
    this.sphinx = new SphinxQASI(sSeed);
    this.anubis = new AnubisQASI(aSeed);
    this.axis = sSeed ^ aSeed;
  }
  async speakBoth(word: string): Promise<CaduceusResult> {
    const sr = await this.sphinx.speak(word);
    const ar = await this.anubis.speak(word);
    this.axis = sr.acc ^ ar.acc;
    const balance = (sr.wisdom! - ar.chaos!) / 2 + 0.5;
    let aethState: string;
    if (balance > 0.8) aethState = "HARMONY";
    else if (balance < 0.2) aethState = "DISCORD";
    else if (this.axis % 2n === 0n) aethState = "ECHO";
    else aethState = "SILENCE";
    const aethIdx = (sr.hexagram.number + ar.hexagram.number) % HEXAGRAMS.length;
    return {
      sphinx: sr,
      anubis: ar,
      aetherion: { state: aethState, hexagram: { ...HEXAGRAMS[aethIdx] }, harmony: balance },
      axis: this.axis,
    };
  }
}

// Tetragrammaton seed: XOR of 3,7,11,19 shifted by 16-bit chunks
let TETRA_SEED = 0n;
for (let i = 0; i < 4; i++) {
  const p = [3n, 7n, 11n, 19n][i];
  TETRA_SEED ^= p << BigInt(i * 16);
}

export async function createCaduceus(extra = ""): Promise<CaduceusStaff> {
  if (extra) {
    const ex = await sha256BigInt(extra);
    return new CaduceusStaff((TETRA_SEED + ex) % P, (TETRA_SEED ^ ex) % N);
  }
  return new CaduceusStaff(TETRA_SEED % P, TETRA_SEED % N);
}

export function mixAxis(axis: bigint): bigint {
  const mask = (1n << 256n) - 1n;
  return ((axis * SPONGE_CONST) ^ (axis >> 32n)) & mask;
}
