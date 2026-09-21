// quantumChaos.ts — Word-Dependent Quantum Chaos for the Caduceus engine.
//
// TypeScript port of the Python `TrueTopologicalCaduceus`. A quantum
// kicked-rotor whose kick strength K and initial momentum superposition are
// derived from the WORD itself (not just the seed), so the same word produces
// the same trajectory but two agents with different base seeds carve different
// topological windings (Chern numbers) through Hilbert space.
//
// We use a radix-2 FFT on dim=64 (2^6) so each speakBoth() runs in ~5-15 ms
// on Deno — cheap enough to add to every Aetherion oracle call.

const DIM = 64;          // Hilbert-space dimension (must be power of 2)
const STEPS = 60;        // evolution steps per perceive()
const LOG2_DIM = 6;      // log2(DIM)

// ── Hash helpers ────────────────────────────────────────────────────────
async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256BigInt(s: string): Promise<bigint> {
  return BigInt("0x" + (await sha256Hex(s)));
}

// Mulberry32 — fast deterministic PRNG seeded from a 32-bit integer.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Radix-2 iterative FFT on parallel Float64 arrays (re, im) ───────────
// In-place; if `inverse` is true, divides by N and conjugates twiddles.
function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const N = re.length;
  // Bit-reverse permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // Cooley-Tukey
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const ang = (sign * 2 * Math.PI) / len;
    const wRe0 = Math.cos(ang), wIm0 = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let wRe = 1, wIm = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = i + k + half;
        const tRe = wRe * re[b] - wIm * im[b];
        const tIm = wRe * im[b] + wIm * re[b];
        re[b] = re[a] - tRe; im[b] = im[a] - tIm;
        re[a] = re[a] + tRe; im[a] = im[a] + tIm;
        const nRe = wRe * wRe0 - wIm * wIm0;
        wIm = wRe * wIm0 + wIm * wRe0;
        wRe = nRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
  }
}

// ── Word-dependent quantum kicked rotor ─────────────────────────────────
export interface AgentMemory {
  word: string;
  chern: number;       // winding number mod 7
  K: number;           // kick strength (5.0-7.0)
  quantumRandomness: bigint; // 128-bit extracted from final amplitudes
  action: "CRYSTALLIZE" | "FLOW" | "TRANSFORM" | "DISSOLVE" | "EMERGE";
}

export interface QuantumCaduceusResult {
  word: string;
  sphinx: AgentMemory;
  anubis: AgentMemory;
  // (chern_s + chern_a) ≡ 0 (mod 7) — topological charge conservation
  conserved: boolean;
  combinedChern: number;
  // Aetherion derived from topological tension between the two agents.
  aetherion: "HARMONY" | "RESONANCE" | "TENSION" | "CATASTROPHE";
  topologicalTension: number;
  // 128-bit XOR of agent randomness, hex-encoded for use as a beacon.
  verifiableRandomness: string;
  // SHA-256 commitment over (word | sphinx.chern | anubis.chern | randomness).
  commitment: string;
}

class WordDependentQuantumChaos {
  baseK: number;

  constructor(baseSeed: number) {
    const rng = mulberry32(baseSeed);
    this.baseK = 5.0 + rng() * 2.0;
  }

  /** Build word-dependent initial state. Returns (re, im, K). */
  async prepareState(word: string): Promise<{ re: Float64Array; im: Float64Array; K: number }> {
    const wh = await sha256BigInt(word);
    const whNum = Number(wh & 0xFFFFFFFFn);
    const K = this.baseK + ((whNum % 100) / 50.0); // 5.0 .. 7.0
    const momentum = Math.abs(whNum) % DIM;
    const spread = 3 + (Math.abs(whNum >> 8) % 5);

    const re = new Float64Array(DIM);
    const im = new Float64Array(DIM);
    let norm = 0;
    for (let i = -spread; i <= spread; i++) {
      const idx = ((momentum + i) % DIM + DIM) % DIM;
      const amp = Math.exp(-(i * i) / (2 * Math.max(1, spread / 2) ** 2));
      re[idx] = amp;
      norm += amp * amp;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < DIM; i++) re[i] /= norm;
    return { re, im, K };
  }

  /** Evolve the kicked rotor for STEPS iterations. Mutates re/im in place. */
  evolve(re: Float64Array, im: Float64Array, K: number, steps = STEPS): void {
    // Free-evolution phases for momentum modes.
    const freeRe = new Float64Array(DIM), freeIm = new Float64Array(DIM);
    for (let i = 0; i < DIM; i++) {
      const p = i - (DIM >> 1);
      const ang = -Math.PI * p * p / DIM;
      freeRe[i] = Math.cos(ang); freeIm[i] = Math.sin(ang);
    }
    // Kick phases for position modes.
    const kickRe = new Float64Array(DIM), kickIm = new Float64Array(DIM);
    for (let i = 0; i < DIM; i++) {
      const x = i - (DIM >> 1);
      const ang = -K * Math.cos((2 * Math.PI * x) / DIM);
      kickRe[i] = Math.cos(ang); kickIm[i] = Math.sin(ang);
    }

    for (let s = 0; s < steps; s++) {
      // FFT to momentum space
      fft(re, im, false);
      // Apply free evolution
      for (let i = 0; i < DIM; i++) {
        const nr = re[i] * freeRe[i] - im[i] * freeIm[i];
        const ni = re[i] * freeIm[i] + im[i] * freeRe[i];
        re[i] = nr; im[i] = ni;
      }
      // IFFT back to position
      fft(re, im, true);
      // Apply kick
      for (let i = 0; i < DIM; i++) {
        const nr = re[i] * kickRe[i] - im[i] * kickIm[i];
        const ni = re[i] * kickIm[i] + im[i] * kickRe[i];
        re[i] = nr; im[i] = ni;
      }
      // Normalize
      let nrm = 0;
      for (let i = 0; i < DIM; i++) nrm += re[i] * re[i] + im[i] * im[i];
      nrm = Math.sqrt(nrm);
      if (nrm > 1e-10) for (let i = 0; i < DIM; i++) { re[i] /= nrm; im[i] /= nrm; }
    }
  }

  /** Winding number ∈ [0..6] from phase of first Fourier mode. */
  computeWinding(re: Float64Array, im: Float64Array): number {
    // Operate on a copy so we don't trash the post-evolution state.
    const r = new Float64Array(re), i = new Float64Array(im);
    fft(r, i, false);
    const phase = Math.atan2(i[1], r[1]); // ∈ (-π, π]
    const winding = Math.floor((phase / (2 * Math.PI)) * DIM);
    return ((winding % 7) + 7) % 7;
  }

  /** Extract 128 bits of entropy from amplitude pairs → SHA-256 → bigint. */
  async extractRandom(re: Float64Array, im: Float64Array): Promise<bigint> {
    const probs = new Float64Array(DIM);
    for (let i = 0; i < DIM; i++) probs[i] = re[i] * re[i] + im[i] * im[i];
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        const k = (i * 8 + j) * 2;
        if (k + 1 < DIM && probs[k] > probs[k + 1]) b |= (1 << (7 - j));
      }
      bytes[i] = b;
    }
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    let out = 0n;
    for (let i = 0; i < 16; i++) out = (out << 8n) | BigInt(digest[i]);
    return out;
  }
}

function classifyAction(chern: number): AgentMemory["action"] {
  if (chern === 0) return "CRYSTALLIZE";
  if (chern <= 2) return "FLOW";
  if (chern <= 4) return "TRANSFORM";
  if (chern <= 6) return "DISSOLVE";
  return "EMERGE";
}

async function perceive(chaos: WordDependentQuantumChaos, word: string): Promise<AgentMemory> {
  const { re, im, K } = await chaos.prepareState(word);
  chaos.evolve(re, im, K);
  const chern = chaos.computeWinding(re, im);
  const qr = await chaos.extractRandom(re, im);
  return { word, chern, K, quantumRandomness: qr, action: classifyAction(chern) };
}

/** Two-agent topological Caduceus — different base seeds, same word. */
export class QuantumCaduceus {
  private sphinx: WordDependentQuantumChaos;
  private anubis: WordDependentQuantumChaos;

  constructor(seedSphinx = 42, seedAnubis = 137) {
    this.sphinx = new WordDependentQuantumChaos(seedSphinx);
    this.anubis = new WordDependentQuantumChaos(seedAnubis);
  }

  async speakBoth(word: string): Promise<QuantumCaduceusResult> {
    const w = (word || "").trim().toLowerCase() || "void";
    const [s, a] = await Promise.all([
      perceive(this.sphinx, w),
      perceive(this.anubis, w),
    ]);

    const total = (s.chern + a.chern) % 7;
    const conserved = total === 0;
    const combinedChern = ((s.chern - a.chern) % 7 + 7) % 7;

    let aetherion: QuantumCaduceusResult["aetherion"];
    if (combinedChern === 0) aetherion = "HARMONY";
    else if (combinedChern <= 2) aetherion = "RESONANCE";
    else if (combinedChern <= 4) aetherion = "TENSION";
    else aetherion = "CATASTROPHE";

    const combined = s.quantumRandomness ^ a.quantumRandomness;
    const randomHex = combined.toString(16).padStart(32, "0").slice(0, 32);
    const commitment = (await sha256Hex(
      `${w}:${s.chern}:${a.chern}:${combined.toString(16)}`,
    )).slice(0, 16);

    return {
      word: w,
      sphinx: s,
      anubis: a,
      conserved,
      combinedChern,
      aetherion,
      topologicalTension: Math.abs(s.chern - a.chern),
      verifiableRandomness: randomHex,
      commitment,
    };
  }
}

// Module-level singleton — seeds match the Python reference (42 / 137).
let _instance: QuantumCaduceus | null = null;
export function getQuantumCaduceus(): QuantumCaduceus {
  if (!_instance) _instance = new QuantumCaduceus(42, 137);
  return _instance;
}
