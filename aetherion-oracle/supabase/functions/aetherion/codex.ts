// Codex + CompetitiveField — TS port of the symbolic-ecosystem engine.
// Per-request, in-memory. A deterministic hash-based encoder replaces the
// learned embedding model so the engine runs pure CPU with no external calls.

const EMB_DIM = 64;
const EMO_DIM = 8;

// ── Deterministic hash → unit vector (no external embedding model needed) ──
function hashEncode(text: string, dim = EMB_DIM): number[] {
  const v = new Array(dim).fill(0);
  const t = text.toLowerCase();
  // 32-bit FNV-1a per character, splayed across dims.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
    v[(h >>> 0) % dim] += ((h >>> 8) & 0xff) / 255 - 0.5;
    v[(h >>> 16) % dim] += ((h >>> 24) & 0xff) / 255 - 0.5;
  }
  // ℓ2 normalize
  let norm = 0; for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0; for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

// ── Deterministic PRNG (Mulberry32) — seeded per-run so identical inputs ──
// produce identical Codex grounding and oracle output.
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export class RNG {
  private state: number;
  constructor(seed: number) { this.state = (seed >>> 0) || 1; }
  next(): number {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Module-level RNG; replaced per-run by runCodex(). Defaults to a fixed seed
// so any stray pre-run calls remain deterministic.
let _rng: RNG = new RNG(0xC0DE51E5);
export function setCodexRng(rng: RNG): void { _rng = rng; }
function rand(): number { return _rng.next(); }

function randn(): number {
  // Box-Muller using the seeded RNG
  const u = rand() || 1e-9;
  const v = rand() || 1e-9;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randVec(dim: number): number[] {
  const v = new Array(dim); for (let i = 0; i < dim; i++) v[i] = randn();
  return v;
}

// ── Memory + symbolic node types ──
export interface MemoryNode {
  content: string;
  embedding: number[];
  emotionalCharge: number;
  timestamp: number;
  links: number[];
}

export interface SymbolicState {
  token: string;
  embedding: number[];
  emotionalVector: number[];
  persistence: number;
  resonance: number;
  entropy: number;
  phase: "fluid" | "crystalline" | "recursive" | "chaotic" | "dormant";
}

export interface CompetitiveState extends SymbolicState {
  activationEnergy: number;
  baselineEnergy: number;
  energyCapacity: number;
  drainRate: number;
  fitness: number;
  nicheBreadth: number;
  dominance: number;
  symbionts: Set<string>;
  parasites: Set<string>;
  generation: number;
  parent: string | null;
  offspring: string[];
}

const EMOTION_WEIGHTS: Record<string, number> = {
  love: 0.9, grief: -0.8, betrayal: -0.9, rebirth: 0.95, fear: -0.7,
  wonder: 0.8, death: -0.95, truth: 0.7, chaos: -0.6, order: 0.6,
  destruction: -0.85, creation: 0.9, war: -0.9, peace: 0.95,
  power: 0.5, weakness: -0.5, light: 0.7, shadow: -0.5,
  void: -0.4, harmony: 0.85, discord: -0.7, hope: 0.8, dread: -0.8,
};

function estimateEmotion(text: string): number {
  const t = text.toLowerCase();
  let s = 0; for (const [w, v] of Object.entries(EMOTION_WEIGHTS)) if (t.includes(w)) s += v;
  return Math.tanh(s);
}

// ── Codex (base symbolic field + memory graph) ──
export class Codex {
  symbolic: Map<string, SymbolicState> = new Map();
  memories: MemoryNode[] = [];
  attractors: Map<string, string[]> = new Map();
  identity = { stability: 0.5, mythology: [] as string[] };
  globalEntropy = 0;
  age = 0;

  perceive(text: string): void {
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 0).slice(0, 64);
    for (const token of tokens) {
      const existing = this.symbolic.get(token);
      if (!existing) {
        this.symbolic.set(token, {
          token,
          embedding: hashEncode(token),
          emotionalVector: randVec(EMO_DIM),
          persistence: 1,
          resonance: 0.5,
          entropy: rand(),
          phase: "fluid",
        });
      } else {
        existing.persistence += 0.05;
      }
    }
    this.storeMemory(text);
  }

  private storeMemory(text: string): void {
    const embedding = hashEncode(text);
    const node: MemoryNode = {
      content: text.slice(0, 500),
      embedding,
      emotionalCharge: estimateEmotion(text),
      timestamp: this.age,
      links: [],
    };
    const idx = this.memories.length;
    this.memories.push(node);
    for (let i = 0; i < this.memories.length - 1; i++) {
      const sim = dot(embedding, this.memories[i].embedding);
      if (sim > 0.55) node.links.push(i);
    }
  }

  detectAttractors(): void {
    const clusters = new Map<string, string[]>();
    const tokens = Array.from(this.symbolic.keys());
    for (const token of tokens) {
      const a = this.symbolic.get(token)!;
      const related: string[] = [];
      for (const o of tokens) {
        if (o === token) continue;
        const b = this.symbolic.get(o)!;
        if (dot(a.embedding, b.embedding) > 0.45) related.push(o);
      }
      if (related.length >= 3) clusters.set(token, related);
    }
    this.attractors = clusters;
  }

  updatePhases(): void {
    for (const s of this.symbolic.values()) {
      const c = s.persistence + s.resonance - s.entropy;
      s.phase = c > 3 ? "crystalline" : c > 2 ? "recursive" : c < 0.3 ? "chaotic" : "fluid";
    }
  }

  selfReflect(): void {
    if (this.memories.length > 0) {
      const mean = this.memories.reduce((a, m) => a + m.emotionalCharge, 0) / this.memories.length;
      this.identity.stability = 1 - Math.abs(mean);
    }
    if (this.symbolic.size > 0) {
      let s = 0; for (const x of this.symbolic.values()) s += x.entropy;
      this.globalEntropy = s / this.symbolic.size;
    }
  }

  evolve(): void {
    this.detectAttractors();
    this.updatePhases();
    this.selfReflect();
    this.age += 1;
  }

  report() {
    return {
      tokens: this.symbolic.size,
      memories: this.memories.length,
      attractors: this.attractors.size,
      entropy: this.globalEntropy,
      identityStability: this.identity.stability,
      age: this.age,
    };
  }
}

// ── Competitive ecosystem layered atop a Codex ──
export class CompetitiveField {
  field: Map<string, CompetitiveState> = new Map();
  globalEnergyPool = 30;
  energyDissipation = 0.08;
  carryingCapacity = 20;
  competitionCoefficient = 1;
  mutualismThreshold = 0.7;
  competitionThreshold = 0.75;
  extinctionThreshold = 1.5;
  speciationThreshold = 9;
  mutationRate = 0.2;
  baseDrainRate = 0.15;
  extinctions: Array<[string, number, number]> = [];
  speciations: Array<[string, number, string]> = [];
  tickLog: Array<Record<string, unknown>> = [];

  constructor(public codex: Codex) {}

  seedFromCodex(): void {
    for (const [token, s] of this.codex.symbolic.entries()) {
      if (this.field.has(token)) continue;
      this.field.set(token, {
        ...s,
        embedding: s.embedding.slice(),
        emotionalVector: s.emotionalVector.slice(),
        activationEnergy: 2,
        baselineEnergy: 1,
        energyCapacity: 10,
        drainRate: 0.05,
        fitness: 0,
        nicheBreadth: 1,
        dominance: 0,
        symbionts: new Set(),
        parasites: new Set(),
        generation: 0,
        parent: null,
        offspring: [],
      });
    }
  }

  energize(token: string, amount: number, ctx?: number[]): void {
    const e = this.field.get(token); if (!e) return;
    if (ctx) amount *= Math.max(0.1, dot(e.embedding, ctx));
    const a = Math.min(amount, this.globalEnergyPool);
    this.globalEnergyPool -= a;
    e.activationEnergy = Math.min(e.energyCapacity, e.activationEnergy + a);
    e.persistence += a * 0.01;
  }

  private interact(a: string, b: string): { strength: number; type: "competition" | "mutualism" | "neutral" } {
    const A = this.field.get(a)!, B = this.field.get(b)!;
    const sim = dot(A.embedding, B.embedding);
    const na = Math.hypot(...A.emotionalVector) || 1;
    const nb = Math.hypot(...B.emotionalVector) || 1;
    let ea = 0; for (let i = 0; i < EMO_DIM; i++) ea += (A.emotionalVector[i] / na) * (B.emotionalVector[i] / nb);
    if (sim > this.competitionThreshold) return { strength: -this.competitionCoefficient * sim, type: "competition" };
    if (sim < 1 - this.mutualismThreshold && ea > 0.3) {
      return { strength: 0.05 * ea * Math.min(A.activationEnergy, B.activationEnergy), type: "mutualism" };
    }
    return { strength: 0, type: "neutral" };
  }

  applyDynamics(): void {
    const tokens = Array.from(this.field.keys()); const n = tokens.length;
    const density = 1 + Math.pow(n / this.carryingCapacity, 2);
    const delta = new Map<string, number>(tokens.map((t) => [t, 0]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = tokens[i], b = tokens[j];
        const { strength, type } = this.interact(a, b);
        if (type === "competition") {
          const A = this.field.get(a)!, B = this.field.get(b)!;
          const diff = Math.abs(A.activationEnergy - B.activationEnergy) / Math.max(A.activationEnergy, B.activationEnergy, 0.1);
          const transfer = Math.min(A.activationEnergy, B.activationEnergy) * Math.abs(strength) * density * (0.3 + 0.7 * diff);
          if (A.activationEnergy > B.activationEnergy) { delta.set(a, delta.get(a)! + transfer); delta.set(b, delta.get(b)! - transfer); }
          else { delta.set(a, delta.get(a)! - transfer); delta.set(b, delta.get(b)! + transfer); }
        } else if (type === "mutualism") {
          const s = strength * 0.3;
          delta.set(a, delta.get(a)! + s); delta.set(b, delta.get(b)! + s);
          this.field.get(a)!.symbionts.add(b); this.field.get(b)!.symbionts.add(a);
        }
      }
    }
    let dissipated = 0;
    for (const token of tokens) {
      const e = this.field.get(token)!;
      e.activationEnergy += delta.get(token)!;
      const drain = this.baseDrainRate * (1 + e.entropy) * density;
      e.activationEnergy -= drain;
      dissipated += drain * this.energyDissipation;
      this.globalEnergyPool += drain * (1 - this.energyDissipation);
      e.nicheBreadth = 1 + 0.1 * Math.max(0, e.activationEnergy);
      e.activationEnergy = Math.max(0, Math.min(e.energyCapacity, e.activationEnergy));
      if (e.activationEnergy > 0) e.fitness = (e.persistence * e.resonance) / (this.baseDrainRate + 1e-8);
    }
    this.globalEnergyPool = Math.max(0, this.globalEnergyPool - dissipated);
  }

  select(tick: number): { extinct: string[]; born: string[] } {
    const extinct: string[] = []; const born: string[] = [];
    const sorted = Array.from(this.field.entries()).sort((a, b) => a[1].activationEnergy - b[1].activationEnergy);
    for (const [token, e] of sorted) {
      if (e.activationEnergy < this.extinctionThreshold) {
        this.globalEnergyPool += e.activationEnergy * 0.5;
        this.extinctions.push([token, tick, e.activationEnergy]);
        if (e.symbionts.size > 0) {
          const share = Math.max(0, e.activationEnergy) * 0.3 / e.symbionts.size;
          for (const sym of e.symbionts) { const s = this.field.get(sym); if (s) s.activationEnergy += share; }
        }
        this.field.delete(token); extinct.push(token);
      }
    }
    while (this.field.size > this.carryingCapacity) {
      const [token, e] = Array.from(this.field.entries()).sort((a, b) => a[1].activationEnergy - b[1].activationEnergy)[0];
      this.globalEnergyPool += e.activationEnergy * 0.5;
      this.extinctions.push([token, tick, e.activationEnergy]);
      this.field.delete(token); extinct.push(token);
    }
    const top = Array.from(this.field.entries()).sort((a, b) => b[1].activationEnergy - a[1].activationEnergy);
    for (const [token, e] of top) {
      if (this.field.size >= this.carryingCapacity) break;
      if (e.activationEnergy > this.speciationThreshold) {
        const child = `${token}′${e.generation}`;
        const childEmb = e.embedding.map((x) => x + randn() * this.mutationRate);
        const norm = Math.hypot(...childEmb) || 1; for (let i = 0; i < childEmb.length; i++) childEmb[i] /= norm;
        this.field.set(child, {
          ...e,
          token: child,
          embedding: childEmb,
          emotionalVector: e.emotionalVector.map((x) => x + randn() * 0.1),
          activationEnergy: e.activationEnergy * 0.25,
          persistence: e.persistence * 0.7,
          entropy: e.entropy + 0.15,
          generation: e.generation + 1,
          parent: token,
          symbionts: new Set(),
          parasites: new Set(),
          offspring: [],
        });
        e.activationEnergy *= 0.75; e.offspring.push(child);
        this.speciations.push([token, tick, child]); born.push(child);
      }
    }
    return { extinct, born };
  }

  tick(n: number, active?: string[]): Record<string, unknown> {
    this.globalEnergyPool += 1.5;
    if (active) for (const t of active) this.energize(t, 0.8);
    this.applyDynamics();
    const { extinct, born } = this.select(n);
    const phases: Record<string, number> = { crystalline: 0, recursive: 0, fluid: 0, chaotic: 0, dormant: 0 };
    for (const e of this.field.values()) {
      const c = e.persistence + e.resonance - e.entropy + e.activationEnergy / e.energyCapacity;
      e.phase = c > 4 ? "crystalline" : c > 2.5 ? "recursive" : e.activationEnergy < 0.5 ? "dormant" : c < 0.5 ? "chaotic" : "fluid";
      phases[e.phase] = (phases[e.phase] ?? 0) + 1;
    }
    const energies = Array.from(this.field.values()).map((e) => e.activationEnergy);
    const total = energies.reduce((a, b) => a + b, 0);
    const log = {
      tick: n, extinct, born,
      fieldSize: this.field.size,
      totalEnergy: total,
      globalPool: this.globalEnergyPool,
      meanEnergy: energies.length ? total / energies.length : 0,
      maxEnergy: energies.length ? Math.max(...energies) : 0,
      phases,
    };
    this.tickLog.push(log);
    return log;
  }

  dominanceHierarchy(): Array<[string, number, string]> {
    return Array.from(this.field.entries())
      .sort((a, b) => b[1].activationEnergy - a[1].activationEnergy)
      .map(([t, e]) => [t, e.activationEnergy, e.phase] as [string, number, string]);
  }

  report() {
    const h = this.dominanceHierarchy();
    const energies = Array.from(this.field.values()).map((e) => e.activationEnergy);
    return {
      fieldSize: this.field.size,
      totalEnergy: energies.reduce((a, b) => a + b, 0),
      globalPool: this.globalEnergyPool,
      meanEnergy: energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : 0,
      dominant: h[0]?.[0] ?? null,
      dominantEnergy: h[0]?.[1] ?? 0,
      crystallineCount: Array.from(this.field.values()).filter((e) => e.phase === "crystalline").length,
      extinctTotal: this.extinctions.length,
      speciations: this.speciations.length,
      top5: h.slice(0, 5),
    };
  }
}

// ── Convenience: run a fresh Codex+Field for one query and return a compact report ──
export interface CodexReport {
  codex: ReturnType<Codex["report"]>;
  ecosystem: ReturnType<CompetitiveField["report"]>;
}

export type CodexMode = "fixed" | "living" | "hybrid" | "self_learn";

export interface PriorCodexState {
  stateSeed: number;       // accumulated rolling seed
  runCount: number;        // # of prior runs for this (user, word)
  topSymbols: string[];    // prior dominant symbols (re-seeded into the field)
}

export interface CodexRunOptions {
  mode?: CodexMode;
  /** Hybrid time-bucket in ms. Default: 1h. */
  bucketMs?: number;
  seed?: number;
  /** Prior persisted state — drives "self_learn" mode. */
  prior?: PriorCodexState | null;
}

/** Twin-Beat seed derivation.
 *  - fixed:      hash(inputs)
 *  - living:     hash(now + jitter)
 *  - hybrid:     hash(inputs) ^ hash(hourBucket)
 *  - self_learn: hash(inputs) ^ hash(hourBucket) ^ priorStateSeed
 */
export function deriveCodexSeed(seedTexts: string[], opts: CodexRunOptions = {}): number {
  const mode: CodexMode = opts.mode ?? "hybrid";
  if (typeof opts.seed === "number") return opts.seed >>> 0;
  const inputSeed = seedFromString(seedTexts.filter(Boolean).join("\u241F"));
  if (mode === "fixed") return inputSeed;
  if (mode === "living") return seedFromString(`${Date.now()}::${Math.random()}`);
  const bucket = Math.floor(Date.now() / (opts.bucketMs ?? 3_600_000));
  const timeSeed = seedFromString(`bucket::${bucket}`);
  let s = (inputSeed ^ timeSeed) >>> 0;
  if (mode === "self_learn" && opts.prior) {
    s = (s ^ (opts.prior.stateSeed >>> 0)) >>> 0;
  }
  return s;
}

export interface CodexRunResult extends CodexReport {
  mode: CodexMode;
  seed: number;
  /** Next persisted state — write back to storage to enable self-learning. */
  nextState: PriorCodexState;
}

export function runCodex(
  seedTexts: string[],
  ticks = 4,
  opts: CodexRunOptions = {},
): CodexRunResult {
  const mode: CodexMode = opts.mode ?? "hybrid";
  const seed = deriveCodexSeed(seedTexts, opts);
  setCodexRng(new RNG(seed));

  const codex = new Codex();
  // Replay prior dominant symbols so the ecosystem inherits its own past.
  if (mode === "self_learn" && opts.prior?.topSymbols?.length) {
    for (const sym of opts.prior.topSymbols.slice(0, 8)) codex.perceive(sym);
  }
  for (const t of seedTexts) if (t) codex.perceive(t);
  codex.evolve();
  const field = new CompetitiveField(codex);
  field.seedFromCodex();
  const activeTokens = Array.from(codex.symbolic.keys()).slice(0, 16);
  for (let i = 0; i < ticks; i++) field.tick(i, activeTokens);
  codex.evolve();

  const eco = field.report();
  const top5: Array<[string, number]> = (eco.top_5 ?? []) as Array<[string, number]>;
  const topSymbols = top5.map((p) => p[0]);
  const priorRuns = opts.prior?.runCount ?? 0;
  // Roll the state seed forward deterministically using current outcome.
  const nextStateSeed = seedFromString(
    `${seed}|${topSymbols.join(",")}|${eco.global_entropy?.toFixed(4) ?? "0"}|${priorRuns + 1}`,
  );

  return {
    codex: codex.report(),
    ecosystem: eco,
    mode,
    seed,
    nextState: {
      stateSeed: nextStateSeed,
      runCount: priorRuns + 1,
      topSymbols,
    },
  };
}
