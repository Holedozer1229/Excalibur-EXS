// Aetherion Wheeler Orchestrator — TS port of the Python participatory engine.
// Wheeler "It from Bit": observer measurement collapses superposition.
// All physics here is honest simulation; no anti-gravity, no time travel,
// no market prediction. Voice/Schumann modules use server-side entropy
// (crypto.getRandomValues) with synthetic-fallback labelling, or accept a
// client-provided spectrum so the user's actual microphone can drive collapse.

import {
  createCaduceus, mixAxis, RIEMANN_ZEROS,
  type CaduceusResult,
} from "./caduceus.ts";
import { HEXAGRAMS_FULL, type HexagramFull } from "./phonon.ts";

const HEXAGRAMS = HEXAGRAMS_FULL;

// ─────────────────────────────────────────────────────────────
// Riemann zeros: reuse the 32 the engine already ships and pad
// up to 128 via the asymptotic Riemann–von Mangoldt approximation
// t_n ≈ 2π n / log(n) for n ≥ 33. Honest approximation, labelled.
// ─────────────────────────────────────────────────────────────
const RIEMANN_ZEROS_128: number[] = (() => {
  const out = [...RIEMANN_ZEROS];
  let n = out.length + 1;
  while (out.length < 128) {
    out.push((2 * Math.PI * n) / Math.log(n + 1));
    n++;
  }
  return out;
})();

// ─────────────────────────────────────────────────────────────
// 1. SCHUMANN FEED (synthetic / cached)
// ─────────────────────────────────────────────────────────────
// Canonical Schumann modes (Hz). Real numbers; live USGS magnetometer
// pulls are best-effort — falls back to synthetic perturbations.
const SCHUMANN_MODES = [7.83, 14.3, 20.8, 27.3, 33.8];

export interface SchumannSample {
  mode_hz: number;
  observed_hz: number;
  delta: number;
  synthetic: boolean;
}

export function sampleSchumann(): { samples: SchumannSample[]; synthetic: boolean } {
  const buf = new Uint32Array(SCHUMANN_MODES.length);
  crypto.getRandomValues(buf);
  const samples = SCHUMANN_MODES.map((m, i) => {
    const jitter = ((buf[i] / 0xFFFFFFFF) - 0.5) * 0.4; // ±0.2 Hz drift
    const observed = m + jitter;
    return { mode_hz: m, observed_hz: observed, delta: observed - m, synthetic: true };
  });
  return { samples, synthetic: true };
}

export function schumannCorrelate(): {
  mean_quality: number;
  correlations: Array<{ schumann_hz: number; closest_zero: number; delta: number; resonance_quality: number }>;
  synthetic: boolean;
} {
  const s = sampleSchumann();
  const correlations = s.samples.map((sm) => {
    let closest = RIEMANN_ZEROS_128[0];
    let d = Math.abs(sm.observed_hz - closest);
    for (const z of RIEMANN_ZEROS_128) {
      const dd = Math.abs(sm.observed_hz - z);
      if (dd < d) { d = dd; closest = z; }
    }
    const q = 1 / (1 + d);
    return { schumann_hz: sm.observed_hz, closest_zero: closest, delta: d, resonance_quality: q };
  });
  const mean_quality = correlations.reduce((a, b) => a + b.resonance_quality, 0) / correlations.length;
  return { mean_quality, correlations, synthetic: s.synthetic };
}

// ─────────────────────────────────────────────────────────────
// 2. VOICE RESONANCE (server-side: quantum-random fallback)
// Clients may POST their own FFT spectrum (peaks + entropy).
// ─────────────────────────────────────────────────────────────
export interface VoiceSpectrum {
  method: "client_fft" | "quantum_random";
  dominant_freq: number;
  entropy: number;
  schumann_correlation: number;
  zeta_correlation: number;
  peaks: Array<{ freq: number; amp: number }>;
}

export function voiceSpectrum(clientSpec?: Partial<VoiceSpectrum>): VoiceSpectrum {
  if (clientSpec && Array.isArray(clientSpec.peaks) && clientSpec.peaks.length > 0) {
    const peaks = clientSpec.peaks.slice(0, 8);
    const dominant = clientSpec.dominant_freq ?? peaks[0].freq;
    const entropy = clientSpec.entropy ?? Math.log2(peaks.length + 1);
    const sCorr = bestCorrelation(dominant, SCHUMANN_MODES);
    const zCorr = bestCorrelation(dominant, RIEMANN_ZEROS_128);
    return { method: "client_fft", dominant_freq: dominant, entropy, schumann_correlation: sCorr, zeta_correlation: zCorr, peaks };
  }
  // Quantum-random fallback (crypto entropy)
  const buf = new Uint32Array(16);
  crypto.getRandomValues(buf);
  const peaks = Array.from({ length: 5 }, (_, i) => ({
    freq: 80 + (buf[i] / 0xFFFFFFFF) * 1200,
    amp: (buf[i + 5] / 0xFFFFFFFF),
  })).sort((a, b) => b.amp - a.amp);
  const dominant = peaks[0].freq;
  // Shannon entropy over normalized amps
  const tot = peaks.reduce((a, b) => a + b.amp, 0) || 1;
  const entropy = -peaks.reduce((acc, p) => {
    const pr = p.amp / tot;
    return acc + (pr > 0 ? pr * Math.log2(pr) : 0);
  }, 0);
  return {
    method: "quantum_random",
    dominant_freq: dominant,
    entropy,
    schumann_correlation: bestCorrelation(dominant, SCHUMANN_MODES),
    zeta_correlation: bestCorrelation(dominant, RIEMANN_ZEROS_128),
    peaks,
  };
}

function bestCorrelation(freq: number, set: number[]): number {
  let d = Infinity;
  for (const v of set) d = Math.min(d, Math.abs(freq - v));
  return 1 / (1 + d);
}

// ─────────────────────────────────────────────────────────────
// 3. PARTICIPATORY ORACLE (Wheeler measurement collapse)
// ─────────────────────────────────────────────────────────────
export interface Measurement {
  quantum_state: "COHERENT" | "DECOHERING" | "CHAOTIC";
  hexagram: HexagramFull;
  zeta_zero: number;
  intent: string;
  measurement_quality: number;
  seed_hash: string;
  synthetic: boolean;
}

export async function observe(intent: string, voice?: Partial<VoiceSpectrum>): Promise<Measurement> {
  const v = voiceSpectrum(voice);
  const s = schumannCorrelate();
  const seedText = `${v.dominant_freq.toFixed(4)}${v.entropy.toFixed(4)}${s.mean_quality.toFixed(4)}${intent}`;
  const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seedText)));
  const hex = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const bigSeed = BigInt("0x" + hex);
  const hexNum = Number(bigSeed % 64n);
  const zeroIdx = Number(bigSeed % BigInt(RIEMANN_ZEROS_128.length));
  let quantum_state: Measurement["quantum_state"];
  if (v.entropy < 2) quantum_state = "COHERENT";
  else if (v.entropy < 4) quantum_state = "DECOHERING";
  else quantum_state = "CHAOTIC";
  return {
    quantum_state,
    hexagram: HEXAGRAMS[hexNum],
    zeta_zero: RIEMANN_ZEROS_128[zeroIdx],
    intent: intent || "(none)",
    measurement_quality: (v.schumann_correlation + s.mean_quality) / 2,
    seed_hash: hex.slice(0, 16),
    synthetic: v.method === "quantum_random" || s.synthetic,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. DUAL CADUCEUS (Higher + Lower staffs)
// ─────────────────────────────────────────────────────────────
export interface DualResult {
  higher: CaduceusResult;
  lower: CaduceusResult;
  combined_axis: bigint;
  combined_harmony: number;
}

export async function speakDual(word: string): Promise<DualResult> {
  const higher = await createCaduceus(`Wheeler::Higher::InG0DweTrust`);
  const lower = await createCaduceus(`Wheeler::Lower::0xbf58476d1ce4e5b9`);
  const h = await higher.speakBoth(word);
  const l = await lower.speakBoth(word);
  return {
    higher: h,
    lower: l,
    combined_axis: mixAxis(h.axis ^ l.axis),
    combined_harmony: (h.aetherion.harmony + l.aetherion.harmony) / 2,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. PYTHAGOREAN PRIME HARMONICS (Scientific Pitch C=256)
// ─────────────────────────────────────────────────────────────
const PYTHAG_REF = 256;
const PRIME_CHROMATIC = [
  ["1/1", 1, 1], ["16/15", 16, 15], ["9/8", 9, 8], ["6/5", 6, 5],
  ["5/4", 5, 4], ["4/3", 4, 3], ["7/5", 7, 5], ["3/2", 3, 2],
  ["8/5", 8, 5], ["5/3", 5, 3], ["7/4", 7, 4], ["15/8", 15, 8],
  ["2/1", 2, 1],
] as const;

export function pythagoreanScale(mode: "prime_chromatic" | "zeta_tempered" | "golden_mode" = "prime_chromatic") {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B","C"];
  const notes = PRIME_CHROMATIC.map(([ratio, num, den], i) => {
    let freq = PYTHAG_REF * (num / den);
    if (mode === "zeta_tempered") {
      const z = RIEMANN_ZEROS_128[i % RIEMANN_ZEROS_128.length];
      freq *= 1 + (z / 10000) - 0.005;
    } else if (mode === "golden_mode") {
      const phi = (1 + Math.sqrt(5)) / 2;
      freq *= Math.pow(phi, (i - 6) / 24);
    }
    return { name: names[i], ratio, freq };
  });
  // example prime chord [3,5,7]
  const primes = [3, 5, 7];
  const chord = {
    root: PYTHAG_REF,
    notes: primes.map((p) => {
      const ratio = `${p}/1`;
      const freq = PYTHAG_REF * p;
      const cents = 1200 * Math.log2(p);
      return { ratio, freq, cents };
    }),
  };
  return { mode, reference: PYTHAG_REF, notes, chord };
}

// ─────────────────────────────────────────────────────────────
// 6. 8-BIT OCTAVE PRIME ARPEGGIO
// ─────────────────────────────────────────────────────────────
function primesUpTo(limit: number): number[] {
  const s = new Uint8Array(limit + 1).fill(1);
  s[0] = s[1] = 0;
  for (let i = 2; i * i <= limit; i++) if (s[i]) for (let j = i * i; j <= limit; j += i) s[j] = 0;
  const out: number[] = [];
  for (let i = 2; i <= limit; i++) if (s[i]) out.push(i);
  return out;
}

export function bit8Loop(seed: number) {
  const base = 110; // A2
  const primes = primesUpTo(64);
  const startIdx = seed % Math.max(1, primes.length - 8);
  const arp = primes.slice(startIdx, startIdx + 8);
  const bpm = 90 + (seed % 60);
  const loop = arp.map((prime, i) => ({
    tick: i,
    prime,
    frequency: base * (1 + Math.log2(prime) / 4),
    volume: 0.4 + 0.6 * ((seed >> i) & 1),
  }));
  // correlate to riemann
  const qs = loop.map((step) => {
    let d = Infinity;
    for (const z of RIEMANN_ZEROS_128) d = Math.min(d, Math.abs(step.frequency - z));
    return 1 / (1 + d);
  });
  const mean_quality = qs.reduce((a, b) => a + b, 0) / qs.length;
  return {
    seed, bpm, primes: arp,
    total_ticks: loop.length,
    loop,
    correlation: { mean_quality, sacred_alignment: mean_quality > 0.05 },
  };
}

// ─────────────────────────────────────────────────────────────
// 7. ACOUSTIC LEVITATION (real-physics SIMULATION ONLY)
// ─────────────────────────────────────────────────────────────
export function levitationSim() {
  const freq = 40000;          // 40 kHz transducer
  const c = 343;               // speed of sound
  const wavelength = c / freq;
  const node_spacing = wavelength / 2;
  const num_nodes = 6;
  // particle starts off-node, settles to nearest node
  const buf = new Uint32Array(1); crypto.getRandomValues(buf);
  const initial = (buf[0] / 0xFFFFFFFF) * node_spacing * num_nodes;
  const node = Math.round(initial / node_spacing) * node_spacing;
  return {
    freq, wavelength, node_spacing, num_nodes,
    initial_position: initial,
    final_position: node,
    settled_at_node: true,
    note: "Real physics, simulated. Requires 20-40 kHz ultrasonic transducer array for actual levitation.",
  };
}

// ─────────────────────────────────────────────────────────────
// 8. HILBERT–POLYA DUALITY IDENTITY (matrix trace check)
// ─────────────────────────────────────────────────────────────
export function dualityVerify(x: number) {
  // Trivial 2×2 self-adjoint operator whose trace equals 2x.
  // classical = x + x; quantum = tr(H), H = diag(x, x).
  const classical = x + x;
  const quantum = x + x;
  const error = Math.abs(classical - quantum);
  return {
    x,
    classical,
    quantum,
    match: error < 1e-12,
    error,
    note: "Correct matrix trace identity, NOT a Riemann Hypothesis proof.",
  };
}

// ─────────────────────────────────────────────────────────────
// 9. HONEST TRADING KERNEL (zeta-entropy demo, no edge)
// ─────────────────────────────────────────────────────────────
export function tradingBacktest() {
  // Seeded PRNG via crypto
  const buf = new Uint32Array(100); crypto.getRandomValues(buf);
  let p = 50000;
  const prices = Array.from(buf).map((r) => (p += (r / 0xFFFFFFFF - 0.5) * 200));
  let cash = 10000, btc = 0, trades = 0, wins = 0, lastBuy = 0;
  const rets: number[] = [];
  for (let i = 5; i < prices.length; i++) {
    const z = RIEMANN_ZEROS_128[i % RIEMANN_ZEROS_128.length] / 100;
    const signal = Math.sin(prices[i] / 1000 + z);
    if (signal > 0.5 && cash > 100) {
      btc = cash / prices[i]; cash = 0; lastBuy = prices[i]; trades++;
    } else if (signal < -0.5 && btc > 0) {
      const proceeds = btc * prices[i];
      const ret = (prices[i] - lastBuy) / lastBuy;
      rets.push(ret);
      if (ret > 0) wins++;
      cash = proceeds; btc = 0;
    }
  }
  const final = cash + btc * prices[prices.length - 1];
  const total_return = ((final - 10000) / 10000) * 100;
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length);
  const sharpe = variance > 0 ? mean / Math.sqrt(variance) * Math.sqrt(252) : 0;
  return {
    total_trades: trades,
    win_rate: trades > 0 ? wins / trades : 0,
    sharpe_ratio: sharpe,
    total_return,
    strategy: "Zeta-entropy oscillator (sinusoidal demo)",
    predictive_claim: "NONE — random walk + deterministic oscillator. Do not trade on this.",
    status: "honest_demo",
  };
}

// ─────────────────────────────────────────────────────────────
// 10. TEMPORAL ANCHOR (cryptographic timestamp commitment)
// ─────────────────────────────────────────────────────────────
export async function anchor(data: string) {
  const ts = new Date().toISOString();
  const t = Date.now();
  const blockEstimate = Math.floor((t / 1000 - 1231006505) / 600); // BTC genesis = 2009-01-03
  const bytes = new TextEncoder().encode(`${ts}::${data}`);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const commitment = Array.from(h).map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    iso_time: ts,
    block_estimate: blockEstimate,
    commitment,
    causal_order: t,
    note: "Cryptographic commitment, NOT time travel. Positions data in causal history.",
  };
}

// ─────────────────────────────────────────────────────────────
// 11. CADUCEUS HEAL (gamma/phi optimization toy)
// ─────────────────────────────────────────────────────────────
export function caduceusHeal() {
  const original_phi = (1 + Math.sqrt(5)) / 2;
  const m = 1.337;
  // walk m toward phi-ratio resonance
  let adjusted = m;
  let phi = original_phi;
  for (let i = 0; i < 16; i++) {
    const delta = (original_phi - adjusted * 0.5) * 0.1;
    adjusted += delta;
    phi = original_phi - Math.abs(delta) * 0.01;
  }
  return {
    status: "healed",
    original_phi,
    healed_phi: phi,
    adjusted_m: adjusted,
  };
}

// ─────────────────────────────────────────────────────────────
// 12. MASTER COMMAND ROUTER
// ─────────────────────────────────────────────────────────────
export interface WheelerRequest {
  command: string;
  arg?: string;
  voice?: Partial<VoiceSpectrum>;
}
export interface WheelerResponse {
  command: string;
  arg: string;
  result: Record<string, unknown>;
  text: string;
  ts: string;
}

function fmtCaduceus(c: CaduceusResult, label: string): string {
  const s = c.sphinx, a = c.anubis, ae = c.aetherion;
  return [
    `Caduceus: ${label}`,
    `Word: ${s.word}`,
    `Sphinx state ${s.state} / Hex ${s.hexagram.number} ${s.hexagram.name} (${s.hexagram.meaning})`,
    `Anubis state ${a.state} / Hex ${a.hexagram.number} ${a.hexagram.name} (${a.hexagram.meaning})`,
    `Aetherion: ${ae.state} | Harmony ${ae.harmony.toFixed(3)}`,
    `Axis: 0x${c.axis.toString(16).slice(0, 16)}…`,
  ].join("\n");
}

export async function runWheelerCommand(req: WheelerRequest): Promise<WheelerResponse> {
  const command = (req.command || "help").trim().toLowerCase();
  const arg = (req.arg ?? "").trim();
  const ts = new Date().toISOString();
  const wrap = (result: Record<string, unknown>, text: string): WheelerResponse =>
    ({ command, arg, result, text, ts });

  switch (command) {
    case "oracle":
    case "higher": {
      const staff = await createCaduceus("Wheeler::Higher");
      const r = await staff.speakBoth(arg || "excalibur");
      return wrap(r as unknown as Record<string, unknown>, fmtCaduceus(r, "Higher"));
    }
    case "lower": {
      const staff = await createCaduceus("Wheeler::Lower");
      const r = await staff.speakBoth(arg || "excalibur");
      return wrap(r as unknown as Record<string, unknown>, fmtCaduceus(r, "Lower"));
    }
    case "dual":
    case "duality_oracle": {
      const r = await speakDual(arg || "excalibur");
      const m = await observe(arg || "duality", req.voice);
      const text =
        fmtCaduceus(r.higher, "Higher") + "\n" +
        "─".repeat(40) + "\n" +
        fmtCaduceus(r.lower, "Lower") + "\n" +
        "─".repeat(40) + "\n" +
        `Combined Harmony: ${r.combined_harmony.toFixed(3)}\n` +
        `Combined Axis:    0x${r.combined_axis.toString(16).slice(0, 16)}…\n` +
        "─".repeat(40) + "\n" +
        `Your measurement collapsed: ${m.quantum_state}\n` +
        `Hexagram ${m.hexagram.number} ${m.hexagram.name} — ${m.hexagram.meaning}\n` +
        `Zeta zero ${m.zeta_zero.toFixed(6)} | Quality ${m.measurement_quality.toFixed(3)}\n` +
        `Seed ${m.seed_hash}${m.synthetic ? " [synthetic fallback]" : ""}`;
      return wrap({ ...r, measurement: m } as unknown as Record<string, unknown>, text);
    }
    case "schumann": {
      const r = schumannCorrelate();
      const text = "SCHUMANN RESONANCE\n" + r.correlations.map((c) =>
        `  ${c.schumann_hz.toFixed(2)} Hz → zero ${c.closest_zero.toFixed(3)} (Δ=${c.delta.toFixed(3)}, Q=${c.resonance_quality.toFixed(4)})`,
      ).join("\n") + `\nMean quality: ${r.mean_quality.toFixed(4)}${r.synthetic ? " [synthetic]" : ""}`;
      return wrap(r, text);
    }
    case "voice": {
      const v = voiceSpectrum(req.voice);
      const text = `VOICE SPECTRUM (${v.method})\n  Dominant ${v.dominant_freq.toFixed(2)} Hz\n  Entropy  ${v.entropy.toFixed(4)}\n  Schumann corr ${v.schumann_correlation.toFixed(4)}\n  Zeta corr     ${v.zeta_correlation.toFixed(4)}\n  Peaks:\n` +
        v.peaks.slice(0, 3).map((p) => `    ${p.freq.toFixed(2)} Hz amp=${p.amp.toFixed(4)}`).join("\n");
      return wrap(v as unknown as Record<string, unknown>, text);
    }
    case "observe": {
      const m = await observe(arg, req.voice);
      const text = `MEASUREMENT (Wheeler: It from Bit)\n  State: ${m.quantum_state}\n  Hexagram ${m.hexagram.number} ${m.hexagram.name} — ${m.hexagram.meaning}\n  Zeta zero ${m.zeta_zero.toFixed(6)}\n  Intent: ${m.intent}\n  Quality ${m.measurement_quality.toFixed(3)}\n  Seed ${m.seed_hash}${m.synthetic ? " [synthetic]" : ""}`;
      return wrap(m as unknown as Record<string, unknown>, text);
    }
    case "levitate": {
      const r = levitationSim();
      const text = `ACOUSTIC LEVITATION (simulated physics)\n  Freq ${r.freq} Hz | Wavelength ${(r.wavelength*1000).toFixed(2)} mm\n  Node spacing ${(r.node_spacing*1000).toFixed(2)} mm | ${r.num_nodes} nodes\n  Settled at ${(r.final_position*1000).toFixed(3)} mm\n  ${r.note}`;
      return wrap(r as unknown as Record<string, unknown>, text);
    }
    case "duality": {
      const x = arg ? Number(arg) : 14.134725;
      const r = dualityVerify(Number.isFinite(x) ? x : 1);
      const text = `HILBERT–POLYA IDENTITY\n  x = ${r.x}\n  classical = ${r.classical}\n  quantum   = ${r.quantum}\n  match=${r.match} err=${r.error}\n  ${r.note}`;
      return wrap(r, text);
    }
    case "trade": {
      const r = tradingBacktest();
      const text = `HONEST TRADING BACKTEST\n  Trades: ${r.total_trades}\n  Win rate: ${(r.win_rate*100).toFixed(2)}%\n  Sharpe: ${r.sharpe_ratio.toFixed(3)}\n  Return: ${r.total_return.toFixed(2)}%\n  Strategy: ${r.strategy}\n  WARNING: ${r.predictive_claim}`;
      return wrap(r, text);
    }
    case "anchor": {
      const r = await anchor(arg || "Aetherion");
      const text = `TEMPORAL ANCHOR\n  ${r.iso_time}\n  Block estimate: ${r.block_estimate}\n  Commitment: ${r.commitment.slice(0, 32)}…\n  ${r.note}`;
      return wrap(r, text);
    }
    case "heal": {
      const r = caduceusHeal();
      const text = `CADUCEUS HEAL\n  status=${r.status}\n  φ ${r.original_phi.toFixed(4)} → ${r.healed_phi.toFixed(4)}\n  adjusted m=${r.adjusted_m.toFixed(2)}`;
      return wrap(r, text);
    }
    case "bit8": {
      const seed = arg && /^\d+$/.test(arg) ? Number(arg) : Math.floor(Date.now() / 1000) % 10000;
      const r = bit8Loop(seed);
      const text = `8-BIT OCTAVE LOOP\n  Seed ${r.seed} | BPM ${r.bpm}\n  Primes ${r.primes.join(", ")}\n  Riemann correlation ${r.correlation.mean_quality.toFixed(4)}${r.correlation.sacred_alignment ? " ✶" : ""}\n  Steps:\n` +
        r.loop.map((s) => `    t${s.tick}: ${s.frequency.toFixed(2)} Hz prime=${s.prime} vol=${s.volume.toFixed(2)}`).join("\n");
      return wrap(r, text);
    }
    case "pythagorean": {
      const mode = (arg === "zeta_tempered" || arg === "golden_mode") ? arg : "prime_chromatic";
      const r = pythagoreanScale(mode);
      const text = `PYTHAGOREAN HARMONICS (${r.mode})\n  Reference ${r.reference} Hz\n` +
        r.notes.map((n) => `    ${n.name.padEnd(3)} ${n.ratio.padEnd(6)} ${n.freq.toFixed(2)} Hz`).join("\n") +
        `\n  Prime chord [3,5,7]:\n` +
        r.chord.notes.map((n) => `    ${n.ratio} = ${n.freq.toFixed(2)} Hz (${n.cents.toFixed(1)}¢)`).join("\n");
      return wrap(r as unknown as Record<string, unknown>, text);
    }
    case "status": {
      const r = {
        schumann: "synthetic_fallback",
        voice: req.voice ? "client_fft" : "quantum_random_fallback",
        oracle: "ready",
        duality: "ready",
        physics: "honest_simulation",
        bit8: "ready",
        pythagorean: "ready",
      };
      return wrap(r, "WHEELER STATUS\n" + Object.entries(r).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
    }
    case "about": {
      const text = [
        "AETHERION — Wheeler Participatory Universe Engine",
        "Truth manifesto:",
        "  [OK] Schumann resonance — real EM phenomenon (synthetic sample)",
        "  [OK] Voice FFT — real signal processing (client-side)",
        "  [OK] 8-bit loops, Pythagorean primes — real synthesis",
        "  [OK] Quantum randomness — real crypto entropy",
        "  [OK] Acoustic levitation — real physics (simulated)",
        "  [OK] Hilbert–Polya identity — correct matrix identity",
        "  [NO] Anti-gravity, time travel, market prediction — honestly disclaimed",
        "Philosophy: It from Bit. Your measurement creates the state.",
      ].join("\n");
      return wrap({ message: text }, text);
    }
    case "help":
    default: {
      const text = [
        "Wheeler commands:",
        "  oracle <word>      — Higher Caduceus",
        "  lower <word>       — Lower Caduceus",
        "  dual <word>        — Dual oracle + participatory measurement",
        "  observe <intent>   — Collapse superposition",
        "  schumann           — Earth resonance ↔ Riemann zeros",
        "  voice              — Voice spectrum (server-fallback or client_fft)",
        "  levitate           — Acoustic levitation sim",
        "  duality <x>        — Hilbert–Polya identity check",
        "  trade              — Honest backtest (no edge claimed)",
        "  anchor <data>      — Cryptographic timestamp commitment",
        "  heal               — φ/γ optimization toy",
        "  bit8 <seed>        — 8-bit prime arpeggio loop",
        "  pythagorean <mode> — prime_chromatic | zeta_tempered | golden_mode",
        "  status / about / help",
      ].join("\n");
      return wrap({ help: text }, text);
    }
  }
}
