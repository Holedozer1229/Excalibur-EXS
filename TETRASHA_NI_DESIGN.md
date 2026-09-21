# TetraSHA-NI — Design

**Status:** research/experimental. A new construction, not independently
cryptanalyzed. It does NOT replace the canonical Ω′ Δ18 spec unless Travis
explicitly adopts it.

## Motivation (measured)

The canonical Ω′ Δ18 kernel spends per round: 1× SHA-512 + 1× SHA-256 +
1× BLAKE2b (measured on this box: 0.32 / 1.36 / 0.26 Mhash/s at ~96-byte
inputs). SHA-NI accelerates **only** SHA-256 — so 2/3 of the hashes, and the
two slowest ones, can never use the hardware. TetraSHA-NI restructures the
round so 100% of compression work is SHA-256 on the SHA-NI path
(OpenSSL already auto-detects `sha_ni`; verified present on this CPU).

## Construction: Ω′ Δ18-SN

- State: 32 bytes. Rounds: 128 (lineage with Ω′ Δ18). Width ("tetra"): 4
  parallel SHA-256 per round.
- Per-round domain separation: `salt_r = b"TetraSHA-NI" || LE16(r)`.

```
S0  = SHA256(b"TetraSHA-NI-INIT" || input)
for r in 1..128:
    p0..p3 = salt_r || 0x00..0x03          # precomputed prefixes
    H_i    = SHA256(p_i || S)      (i = 0..3, one compression each)
    T      = H0 ^ H1 ^ H2 ^ H3             # 256-bit XOR fold
    S      = T ^ S                         # Davies–Meyer-style feedforward
    S      = rotl_bytes(S, r mod 32)        # round-dependent byte rotation
OUT = SHA256(b"TetraSHA-NI-FINAL" || S128)
```

Per candidate: 4×128 + 2 = **514 SHA-256 compressions**, all single-block
(~45-byte inputs), all SHA-NI-eligible. Zero SHA-512, zero BLAKE2b.

## Why this shape

- **4-wide ("tetra")**: XOR of four domain-separated SHA-256 outputs.
  Preimaging the XOR-sum is at least as hard as preimaging one branch;
  the branches are independent via domain separation, so no
  cross-branch shortcut.
- **Feedforward (`T ^ S`)**: even a hypothetical weakness in one SHA-256
  call doesn't yield round inversion — the input state is mixed back in.
- **Byte rotation by `r mod 32`**: cheap diffusion across byte positions;
  round-dependent so every round's wiring differs.
- **128 rounds**: same depth as Ω′ Δ18 — no security-depth regression vs
  the spec it descends from.
- **Framing hashes** (INIT/FINAL): domain-separate the construction from
  raw SHA-256 uses elsewhere.

## Security posture (honest)

| Property | Statement |
|---|---|
| Classical preimage | 256-bit (output is 256 bits; inversion ⇒ SHA-256 preimage break) |
| Quantum preimage | 128-bit (Grover) — same as any 256-bit hash |
| Collision | 128-bit classical birthday — same as SHA-256 |
| Analysis status | **None** — new construction, research label. The margin argument is structural (128 rounds, feedforward, domain separation), not a proof. |
| What it is NOT | Not "quantum-proof". Not audited. Not the EXS spec until adopted. |

## Performance model → measured

Pure-Python 4-wide: 291 H/s vs canonical kernel 308 H/s head-to-head
(64 candidates, 128 rounds) — **0.94×, fails the speedup falsifier**.
Python per-round overhead dominates; SHA-NI cannot fix Python overhead.

C accelerator (`pkg/mining/tetrasha_ni_c.c`, OpenSSL SHA256 = SHA-NI path,
128-round loop fully in C, byte-identical to the Python reference —
verified on 26 random vectors + rounds {1,2,64,127,128} + batch):

| Implementation | H/s (this box) | vs canonical |
|---|---|---|
| canonical Ω′ Δ18 kernel | 308 | 1× |
| TetraSHA-NI pure Python | 291 | 0.94× (kill as speedup) |
| TetraSHA-NI C (`hash`) | **4,558** | **14.8×** |
| TetraSHA-NI C (`hash_batch`) | 3,425 | 11.1× |

Verdict: the *design* is vindicated, but only with the C execution layer —
the pure-Python 4-wide is retired as a mining path (kept as the readable
reference + test oracle). 219 µs/hash = 514 SHA-NI compressions with no
Python in the loop.

## Adoption rule

TetraSHA-NI may only become consensus (e.g., for the sovereign genesis
grind) on Travis's explicit word. The running Ω′ Δ18 grind is untouched by
this design work.

## Falsifiers

- Benchmark shows <1.3× the canonical kernel → the design failed its
  purpose; kill it.
- Non-determinism across runs/machines → void.
- Any input where flipping 1 input bit flips <40% or >60% of output bits
  over a sample → diffusion suspect; investigate before use.
