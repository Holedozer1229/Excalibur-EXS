// I Ching × Phonon-Caduceus engine — TS port of the Python reference.
// Each phoneme maps to a trigram + Wu Xing element. A word becomes a
// tight-binding phonon Hamiltonian whose spectrum + yin/yang line pattern
// selects one of the 64 hexagrams. No randomness: the hexagram is computed.

export interface HexagramFull {
  number: number;
  name: string;
  meaning: string;
  lines: string;          // 6 chars of "0"/"1", bottom→top? we follow ref file ordering
  trigrams: [string, string];
  element: string;
  phase: "yin" | "yang";
}

export const HEXAGRAMS_FULL: HexagramFull[] = [
  {number:1,name:"The Creative",meaning:"Heaven over Heaven",lines:"111111",trigrams:["Heaven","Heaven"],element:"Metal",phase:"yang"},
  {number:2,name:"The Receptive",meaning:"Earth over Earth",lines:"000000",trigrams:["Earth","Earth"],element:"Earth",phase:"yin"},
  {number:3,name:"Difficulty at the Beginning",meaning:"Water over Thunder",lines:"010001",trigrams:["Water","Thunder"],element:"Water",phase:"yang"},
  {number:4,name:"Youthful Folly",meaning:"Mountain over Water",lines:"100010",trigrams:["Mountain","Water"],element:"Earth",phase:"yin"},
  {number:5,name:"Waiting",meaning:"Water over Heaven",lines:"010111",trigrams:["Water","Heaven"],element:"Water",phase:"yang"},
  {number:6,name:"Conflict",meaning:"Heaven over Water",lines:"111010",trigrams:["Heaven","Water"],element:"Metal",phase:"yang"},
  {number:7,name:"The Army",meaning:"Earth over Water",lines:"000010",trigrams:["Earth","Water"],element:"Earth",phase:"yin"},
  {number:8,name:"Holding Together",meaning:"Water over Earth",lines:"010000",trigrams:["Water","Earth"],element:"Water",phase:"yang"},
  {number:9,name:"The Taming Power of the Small",meaning:"Wind over Heaven",lines:"110111",trigrams:["Wind","Heaven"],element:"Wood",phase:"yang"},
  {number:10,name:"Treading",meaning:"Heaven over Lake",lines:"111011",trigrams:["Heaven","Lake"],element:"Metal",phase:"yang"},
  {number:11,name:"Peace",meaning:"Earth over Heaven",lines:"000111",trigrams:["Earth","Heaven"],element:"Earth",phase:"yin"},
  {number:12,name:"Standstill",meaning:"Heaven over Earth",lines:"111000",trigrams:["Heaven","Earth"],element:"Metal",phase:"yang"},
  {number:13,name:"Fellowship with Men",meaning:"Heaven over Fire",lines:"111101",trigrams:["Heaven","Fire"],element:"Metal",phase:"yang"},
  {number:14,name:"Possession in Great Measure",meaning:"Fire over Heaven",lines:"101111",trigrams:["Fire","Heaven"],element:"Fire",phase:"yang"},
  {number:15,name:"Modesty",meaning:"Earth over Mountain",lines:"000100",trigrams:["Earth","Mountain"],element:"Earth",phase:"yin"},
  {number:16,name:"Enthusiasm",meaning:"Thunder over Earth",lines:"001000",trigrams:["Thunder","Earth"],element:"Wood",phase:"yang"},
  {number:17,name:"Following",meaning:"Lake over Thunder",lines:"011001",trigrams:["Lake","Thunder"],element:"Metal",phase:"yin"},
  {number:18,name:"Work on What Has Been Spoiled",meaning:"Mountain over Wind",lines:"100110",trigrams:["Mountain","Wind"],element:"Earth",phase:"yin"},
  {number:19,name:"Approach",meaning:"Earth over Lake",lines:"000011",trigrams:["Earth","Lake"],element:"Earth",phase:"yin"},
  {number:20,name:"Contemplation",meaning:"Wind over Earth",lines:"110000",trigrams:["Wind","Earth"],element:"Wood",phase:"yang"},
  {number:21,name:"Biting Through",meaning:"Fire over Thunder",lines:"101001",trigrams:["Fire","Thunder"],element:"Fire",phase:"yang"},
  {number:22,name:"Grace",meaning:"Mountain over Fire",lines:"100101",trigrams:["Mountain","Fire"],element:"Earth",phase:"yin"},
  {number:23,name:"Splitting Apart",meaning:"Mountain over Earth",lines:"100000",trigrams:["Mountain","Earth"],element:"Earth",phase:"yin"},
  {number:24,name:"Return",meaning:"Earth over Thunder",lines:"000001",trigrams:["Earth","Thunder"],element:"Earth",phase:"yin"},
  {number:25,name:"Innocence",meaning:"Heaven over Thunder",lines:"111001",trigrams:["Heaven","Thunder"],element:"Metal",phase:"yang"},
  {number:26,name:"The Taming Power of the Great",meaning:"Mountain over Heaven",lines:"100111",trigrams:["Mountain","Heaven"],element:"Earth",phase:"yin"},
  {number:27,name:"The Corners of the Mouth",meaning:"Mountain over Thunder",lines:"100001",trigrams:["Mountain","Thunder"],element:"Earth",phase:"yin"},
  {number:28,name:"Preponderance of the Great",meaning:"Lake over Wind",lines:"011110",trigrams:["Lake","Wind"],element:"Metal",phase:"yin"},
  {number:29,name:"The Abysmal",meaning:"Water over Water",lines:"010010",trigrams:["Water","Water"],element:"Water",phase:"yang"},
  {number:30,name:"The Clinging",meaning:"Fire over Fire",lines:"101101",trigrams:["Fire","Fire"],element:"Fire",phase:"yang"},
  {number:31,name:"Influence",meaning:"Lake over Mountain",lines:"011100",trigrams:["Lake","Mountain"],element:"Metal",phase:"yin"},
  {number:32,name:"Duration",meaning:"Thunder over Wind",lines:"001110",trigrams:["Thunder","Wind"],element:"Wood",phase:"yang"},
  {number:33,name:"Retreat",meaning:"Heaven over Mountain",lines:"111100",trigrams:["Heaven","Mountain"],element:"Metal",phase:"yang"},
  {number:34,name:"The Power of the Great",meaning:"Thunder over Heaven",lines:"001111",trigrams:["Thunder","Heaven"],element:"Wood",phase:"yang"},
  {number:35,name:"Progress",meaning:"Fire over Earth",lines:"101000",trigrams:["Fire","Earth"],element:"Fire",phase:"yang"},
  {number:36,name:"Darkening of the Light",meaning:"Earth over Fire",lines:"000101",trigrams:["Earth","Fire"],element:"Earth",phase:"yin"},
  {number:37,name:"The Family",meaning:"Wind over Fire",lines:"110101",trigrams:["Wind","Fire"],element:"Wood",phase:"yang"},
  {number:38,name:"Opposition",meaning:"Fire over Lake",lines:"101011",trigrams:["Fire","Lake"],element:"Fire",phase:"yang"},
  {number:39,name:"Obstruction",meaning:"Water over Mountain",lines:"010100",trigrams:["Water","Mountain"],element:"Water",phase:"yang"},
  {number:40,name:"Deliverance",meaning:"Thunder over Water",lines:"001010",trigrams:["Thunder","Water"],element:"Wood",phase:"yang"},
  {number:41,name:"Decrease",meaning:"Mountain over Lake",lines:"100011",trigrams:["Mountain","Lake"],element:"Earth",phase:"yin"},
  {number:42,name:"Increase",meaning:"Wind over Thunder",lines:"110001",trigrams:["Wind","Thunder"],element:"Wood",phase:"yang"},
  {number:43,name:"Break-through",meaning:"Lake over Heaven",lines:"011111",trigrams:["Lake","Heaven"],element:"Metal",phase:"yin"},
  {number:44,name:"Coming to Meet",meaning:"Heaven over Wind",lines:"111110",trigrams:["Heaven","Wind"],element:"Metal",phase:"yang"},
  {number:45,name:"Gathering Together",meaning:"Lake over Earth",lines:"011000",trigrams:["Lake","Earth"],element:"Metal",phase:"yin"},
  {number:46,name:"Pushing Upward",meaning:"Earth over Wind",lines:"000110",trigrams:["Earth","Wind"],element:"Earth",phase:"yin"},
  {number:47,name:"Oppression",meaning:"Lake over Water",lines:"011010",trigrams:["Lake","Water"],element:"Metal",phase:"yin"},
  {number:48,name:"The Well",meaning:"Water over Wind",lines:"010110",trigrams:["Water","Wind"],element:"Water",phase:"yang"},
  {number:49,name:"Revolution",meaning:"Lake over Fire",lines:"011101",trigrams:["Lake","Fire"],element:"Metal",phase:"yin"},
  {number:50,name:"The Cauldron",meaning:"Fire over Wind",lines:"101110",trigrams:["Fire","Wind"],element:"Fire",phase:"yang"},
  {number:51,name:"The Arousing",meaning:"Thunder over Thunder",lines:"001001",trigrams:["Thunder","Thunder"],element:"Wood",phase:"yang"},
  {number:52,name:"Keeping Still",meaning:"Mountain over Mountain",lines:"100100",trigrams:["Mountain","Mountain"],element:"Earth",phase:"yin"},
  {number:53,name:"Development",meaning:"Wind over Mountain",lines:"110100",trigrams:["Wind","Mountain"],element:"Wood",phase:"yang"},
  {number:54,name:"The Marrying Maiden",meaning:"Thunder over Lake",lines:"001011",trigrams:["Thunder","Lake"],element:"Wood",phase:"yang"},
  {number:55,name:"Abundance",meaning:"Thunder over Fire",lines:"001101",trigrams:["Thunder","Fire"],element:"Wood",phase:"yang"},
  {number:56,name:"The Wanderer",meaning:"Fire over Mountain",lines:"101100",trigrams:["Fire","Mountain"],element:"Fire",phase:"yang"},
  {number:57,name:"The Gentle",meaning:"Wind over Wind",lines:"110110",trigrams:["Wind","Wind"],element:"Wood",phase:"yang"},
  {number:58,name:"The Joyous",meaning:"Lake over Lake",lines:"011011",trigrams:["Lake","Lake"],element:"Metal",phase:"yin"},
  {number:59,name:"Dispersion",meaning:"Wind over Water",lines:"110010",trigrams:["Wind","Water"],element:"Wood",phase:"yang"},
  {number:60,name:"Limitation",meaning:"Water over Lake",lines:"010011",trigrams:["Water","Lake"],element:"Water",phase:"yang"},
  {number:61,name:"Inner Truth",meaning:"Wind over Lake",lines:"110011",trigrams:["Wind","Lake"],element:"Wood",phase:"yang"},
  {number:62,name:"Preponderance of the Small",meaning:"Thunder over Mountain",lines:"001100",trigrams:["Thunder","Mountain"],element:"Wood",phase:"yang"},
  {number:63,name:"After Completion",meaning:"Water over Fire",lines:"010101",trigrams:["Water","Fire"],element:"Water",phase:"yang"},
  {number:64,name:"Before Completion",meaning:"Fire over Water",lines:"101010",trigrams:["Fire","Water"],element:"Fire",phase:"yang"},
];

export const TRIGRAM_PROPERTIES: Record<string, { omega: number; q: number; element: string; nature: "yin" | "yang"; direction: string }> = {
  Heaven:   { omega: 200, q: +2, element: "Metal", nature: "yang", direction: "NW" },
  Earth:    { omega: 50,  q: -2, element: "Earth", nature: "yin",  direction: "SW" },
  Thunder:  { omega: 180, q: +1, element: "Wood",  nature: "yang", direction: "E"  },
  Water:    { omega: 120, q: -1, element: "Water", nature: "yin",  direction: "N"  },
  Mountain: { omega: 90,  q: -1, element: "Earth", nature: "yin",  direction: "NE" },
  Wind:     { omega: 160, q: +1, element: "Wood",  nature: "yang", direction: "SE" },
  Fire:     { omega: 220, q: +2, element: "Fire",  nature: "yang", direction: "S"  },
  Lake:     { omega: 140, q:  0, element: "Metal", nature: "yin",  direction: "W"  },
};

export const WUXING_CYCLE: Record<string, { generates: string; overcomes: string; color: string }> = {
  Metal: { generates: "Water", overcomes: "Wood",  color: "#C0C0C0" },
  Water: { generates: "Wood",  overcomes: "Fire",  color: "#1E90FF" },
  Wood:  { generates: "Fire",  overcomes: "Earth", color: "#228B22" },
  Fire:  { generates: "Earth", overcomes: "Metal", color: "#FF4500" },
  Earth: { generates: "Metal", overcomes: "Water", color: "#8B4513" },
};

type PhonemeType = "vowel" | "consonant" | "liquid" | "nasal" | "glide";
interface PhonemeProps { type: PhonemeType; omega: number; g: number; q: number; trigram: string; element: string; }

export const PHONETIC_COSMOLOGY: Record<string, PhonemeProps> = {
  AA:{type:"vowel",omega:110,g:0.85,q:+1,trigram:"Earth",element:"Earth"},
  AE:{type:"vowel",omega:130,g:0.90,q:+1,trigram:"Fire",element:"Fire"},
  AH:{type:"vowel",omega:125,g:0.75,q:+1,trigram:"Earth",element:"Earth"},
  AO:{type:"vowel",omega:115,g:0.80,q:+1,trigram:"Water",element:"Water"},
  AW:{type:"vowel",omega:140,g:0.95,q:+1,trigram:"Lake",element:"Metal"},
  AY:{type:"vowel",omega:145,g:0.92,q:+1,trigram:"Wind",element:"Wood"},
  EH:{type:"vowel",omega:150,g:0.88,q:+1,trigram:"Fire",element:"Fire"},
  ER:{type:"vowel",omega:135,g:0.78,q:+1,trigram:"Earth",element:"Earth"},
  EY:{type:"vowel",omega:155,g:0.93,q:+1,trigram:"Fire",element:"Fire"},
  IH:{type:"vowel",omega:165,g:0.82,q:+1,trigram:"Heaven",element:"Metal"},
  IY:{type:"vowel",omega:175,g:0.96,q:+1,trigram:"Heaven",element:"Metal"},
  OW:{type:"vowel",omega:120,g:0.87,q:+1,trigram:"Water",element:"Water"},
  OY:{type:"vowel",omega:138,g:0.91,q:+1,trigram:"Lake",element:"Metal"},
  UH:{type:"vowel",omega:128,g:0.73,q:+1,trigram:"Water",element:"Water"},
  UW:{type:"vowel",omega:122,g:0.89,q:+1,trigram:"Water",element:"Water"},
  B:{type:"consonant",omega:80,g:0.70,q:-1,trigram:"Earth",element:"Earth"},
  CH:{type:"consonant",omega:220,g:0.65,q:-1,trigram:"Fire",element:"Fire"},
  D:{type:"consonant",omega:95,g:0.72,q:-1,trigram:"Earth",element:"Earth"},
  F:{type:"consonant",omega:180,g:0.55,q:-1,trigram:"Wind",element:"Wood"},
  G:{type:"consonant",omega:75,g:0.68,q:-1,trigram:"Earth",element:"Earth"},
  JH:{type:"consonant",omega:200,g:0.62,q:-1,trigram:"Fire",element:"Fire"},
  K:{type:"consonant",omega:78,g:0.60,q:-1,trigram:"Heaven",element:"Metal"},
  L:{type:"liquid",omega:160,g:0.75,q:0,trigram:"Mountain",element:"Earth"},
  M:{type:"nasal",omega:85,g:0.80,q:0,trigram:"Earth",element:"Earth"},
  N:{type:"nasal",omega:90,g:0.78,q:0,trigram:"Earth",element:"Earth"},
  P:{type:"consonant",omega:82,g:0.58,q:-1,trigram:"Heaven",element:"Metal"},
  R:{type:"liquid",omega:145,g:0.77,q:0,trigram:"Lake",element:"Metal"},
  S:{type:"consonant",omega:250,g:0.50,q:-1,trigram:"Wind",element:"Wood"},
  T:{type:"consonant",omega:92,g:0.56,q:-1,trigram:"Heaven",element:"Metal"},
  V:{type:"consonant",omega:175,g:0.67,q:-1,trigram:"Wind",element:"Wood"},
  W:{type:"glide",omega:100,g:0.74,q:0,trigram:"Water",element:"Water"},
  Y:{type:"glide",omega:170,g:0.76,q:0,trigram:"Mountain",element:"Earth"},
  Z:{type:"consonant",omega:240,g:0.52,q:-1,trigram:"Wind",element:"Wood"},
  NG:{type:"nasal",omega:70,g:0.72,q:0,trigram:"Mountain",element:"Earth"},
  SH:{type:"consonant",omega:230,g:0.48,q:-1,trigram:"Wind",element:"Wood"},
  TH:{type:"consonant",omega:210,g:0.45,q:-1,trigram:"Heaven",element:"Metal"},
  DH:{type:"consonant",omega:205,g:0.47,q:-1,trigram:"Earth",element:"Earth"},
  ZH:{type:"consonant",omega:225,g:0.46,q:-1,trigram:"Wind",element:"Wood"},
  HH:{type:"consonant",omega:300,g:0.40,q:-1,trigram:"Heaven",element:"Metal"},
};

export const WORD_PHONEMES: Record<string, string[]> = {
  genesis:["JH","EH","N","AH","S","IH","S"],
  light:["L","AY","T"],
  wisdom:["W","IH","Z","D","AH","M"],
  entropy:["EH","N","T","R","AH","P","IY"],
  shadow:["SH","AE","D","OW"],
  chaos:["K","EY","AA","S"],
  bitcoin:["B","IH","T","K","OY","N"],
  sphinx:["S","F","IH","NG","K","S"],
  caduceus:["K","AH","D","UW","S","IY","AH","S"],
  tetragrammaton:["T","EH","T","R","AH","G","R","AE","M","AH","T","AA","N"],
  love:["L","AH","V"],
  void:["V","OY","D"],
  serpent:["S","ER","P","AH","N","T"],
  aetherion:["EY","TH","IY","R","IY","AH","N"],
  excalibur:["EH","K","S","K","AE","L","AH","B","Y","UH","R"],
  gold:["G","OW","L","D"],
  key:["K","IY"],
  truth:["T","R","UW","TH"],
  lightning:["L","AY","T","N","IH","NG"],
  resonance:["R","EH","Z","AH","N","AH","N","S"],
  crystal:["K","R","IH","S","T","AH","L"],
  sovereign:["S","AA","V","R","AH","N"],
  ripple:["R","IH","P","AH","L"],
  harmony:["HH","AA","R","M","AH","N","IY"],
  forge:["F","AO","R","JH"],
  death:["D","EH","TH"],
  silence:["S","AY","L","AH","N","S"],
  loss:["L","AO","S"],
  doubt:["D","AW","T"],
  kraken:["K","R","AA","K","AH","N"],
  abyss:["AH","B","IH","S"],
  phantom:["F","AE","N","T","AH","M"],
  crown:["K","R","AW","N"],
  stone:["S","T","OW","N"],
  scroll:["S","K","R","OW","L"],
  anchor:["AE","NG","K","ER"],
  fountain:["F","AW","N","T","AH","N"],
  beacon:["B","IY","K","AH","N"],
  grail:["G","R","EY","L"],
  om:["OW","M"],
};

// ── Lightweight g→g'→fallback phoneme parser (mirrors Python parser) ──
export function parsePhonemes(word: string): string[] {
  const w = word.toLowerCase();
  if (WORD_PHONEMES[w]) return WORD_PHONEMES[w];
  const u = word.toUpperCase();
  const out: string[] = [];
  let i = 0;
  while (i < u.length) {
    if (i + 1 < u.length) {
      const di = u.slice(i, i + 2);
      if (PHONETIC_COSMOLOGY[di]) { out.push(di); i += 2; continue; }
    }
    const c = u[i];
    if (PHONETIC_COSMOLOGY[c]) out.push(c);
    i += 1;
  }
  return out;
}

// ── Wu Xing coupling between two phoneme nodes ──
function couplingStrength(a: PhonemeProps, b: PhonemeProps): number {
  const e1 = a.element, e2 = b.element;
  if (e1 === e2) return 1.0;
  if (WUXING_CYCLE[e1]?.generates === e2) return 0.8;
  if (WUXING_CYCLE[e1]?.overcomes === e2) return 0.3;
  return 0.5;
}

// ── Jacobi eigendecomposition for small symmetric matrices ──
function jacobiEig(M: number[][]): { values: number[]; vectors: number[][] } {
  const n = M.length;
  const a: number[][] = M.map((r) => r.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const maxSweeps = 50;
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) off += Math.abs(a[p][q]);
    if (off < 1e-12) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-14) continue;
      const app = a[p][p], aqq = a[q][q];
      const theta = (aqq - app) / (2 * apq);
      const t = theta >= 0 ? 1 / (theta + Math.sqrt(1 + theta * theta)) : 1 / (theta - Math.sqrt(1 + theta * theta));
      const c = 1 / Math.sqrt(1 + t * t); const s = t * c;
      a[p][p] = app - t * apq; a[q][q] = aqq + t * apq; a[p][q] = 0; a[q][p] = 0;
      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const aip = a[i][p], aiq = a[i][q];
          a[i][p] = c * aip - s * aiq; a[p][i] = a[i][p];
          a[i][q] = s * aip + c * aiq; a[q][i] = a[i][q];
        }
        const vip = v[i][p], viq = v[i][q];
        v[i][p] = c * vip - s * viq;
        v[i][q] = s * vip + c * viq;
      }
    }
  }
  const values = a.map((r, i) => r[i]);
  // sort ascending
  const idx = values.map((_, i) => i).sort((x, y) => values[x] - values[y]);
  return {
    values: idx.map((i) => values[i]),
    vectors: v.map((row) => idx.map((i) => row[i])),
  };
}

function entanglementEntropy(eigenvectors: number[][], N: number): number {
  if (N < 2) return 0;
  const half = Math.floor(N / 2);
  const C: number[][] = Array.from({ length: half }, () => new Array(half).fill(0));
  for (let i = 0; i < half; i++) for (let j = 0; j < half; j++) {
    let s = 0; for (let k = 0; k < eigenvectors[0].length; k++) s += eigenvectors[i][k] * eigenvectors[j][k];
    C[i][j] = s;
  }
  const { values } = jacobiEig(C);
  let S = 0;
  for (const ev of values) {
    const p = Math.min(1 - 1e-10, Math.max(1e-10, Math.abs(ev - 0.5) + 0.5));
    S -= p * Math.log(p) + (1 - p) * Math.log(1 - p);
  }
  return S;
}

// ── Compute phonon-derived hexagram from a word ──
export interface PhononResult {
  phonemes: string[];
  eigenvalues: number[];
  groundEnergy: number;
  gap: number;
  entanglement: number;
  topoCharge: number;
  hexagram: HexagramFull;
  lineString: string;
}

export function phononResonance(word: string): PhononResult {
  const phonemes = parsePhonemes(word);
  const N = phonemes.length;
  if (N === 0) {
    return { phonemes: [], eigenvalues: [], groundEnergy: 0, gap: 0, entanglement: 0, topoCharge: 0, hexagram: HEXAGRAMS_FULL[0], lineString: "111111" };
  }
  const H: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    const p = PHONETIC_COSMOLOGY[phonemes[i]];
    if (!p) continue;
    H[i][i] = p.omega;
    if (i > 0) {
      const pp = PHONETIC_COSMOLOGY[phonemes[i - 1]];
      if (pp) {
        const c = couplingStrength(p, pp);
        H[i][i - 1] = -c; H[i - 1][i] = -c;
      }
    }
  }
  const { values, vectors } = jacobiEig(H);
  const nFilled = Math.max(1, Math.floor(N / 2));
  let groundEnergy = 0;
  for (let i = 0; i < nFilled; i++) groundEnergy += values[i];
  const gap = nFilled < values.length ? values[nFilled] - values[nFilled - 1] : 0;
  const ent = entanglementEntropy(vectors, N);
  let topo = 0; for (const ph of phonemes) topo += PHONETIC_COSMOLOGY[ph]?.q ?? 0;

  // Build 6 yin/yang lines from phoneme types sampled across the word.
  const lines: string[] = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor((i * N) / 6);
    const ph = phonemes[Math.min(idx, N - 1)];
    const t = PHONETIC_COSMOLOGY[ph]?.type ?? "consonant";
    if (t === "vowel") lines.push("1");
    else if (t === "consonant") lines.push("0");
    else lines.push(ent > 0.5 ? "1" : "0");
  }
  const lineString = lines.join("");
  let hexagram = HEXAGRAMS_FULL[0]; let bestDist = 7;
  for (const h of HEXAGRAMS_FULL) {
    let d = 0; for (let k = 0; k < 6; k++) if (h.lines[k] !== lineString[k]) d++;
    if (d === 0) { hexagram = h; break; }
    if (d < bestDist) { bestDist = d; hexagram = h; }
  }
  return { phonemes, eigenvalues: values, groundEnergy, gap, entanglement: ent, topoCharge: topo, hexagram, lineString };
}
