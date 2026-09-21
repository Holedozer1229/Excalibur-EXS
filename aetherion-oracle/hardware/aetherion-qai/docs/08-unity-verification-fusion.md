# Unity Verification Fusion — X₀(348) Newforms × Unity Seal × Caduceus ISA

**Honesty:** design / simulation only. No fabricated die. Exact math where stated; physics analogies labeled speculation.

## Unity Seal (exact)

| Symbol | Meaning |
|--------|---------|
| `f(x) = cos(0)` | Constant function; `cos(0) = 1` exactly |
| `x = 1` | Unit anchor — identity input where the seal names unity |
| `CAD.UNITY` | Pipeline opcode; `rs1` carries `x`; `rd` ← `1` |

Soft Silicon: `unityGate()` in `src/lib/qai/qaiChipset.ts`  
RTL: `unity_gate.sv` — `at_x1` when `x_in == 1`, `unity_out == 1` always (cos(0) stub).

## seal_ioc coupling

The Seal IOC (`seal_ioc.sv`) commits mixed digests on `CAD.SEAL` / `CAD.COMMIT`. Unity fusion adds a **pre-seal normalization lane**:

1. `CAD.UNITY rd, rs1` — assert `f(x)=1` at the identity anchor.
2. `CAD.SEAL rd, rs1, rs2` — digest the normalized tuple.
3. `CAD.VERIFY` — round-trip against Soft Silicon SHA-256 in lab; RTL uses `mix64` stub.

Unity digest (lab): `sha-256("cos(0):x=1:${seed}")` — see `unityDigest()` in `unitySeal.ts`.

## X₀(348) automorphic fingerprint (verified structure)

LMFDB-verified invariants fused into chip metaphor:

| Automorphic data | Chip / framework mapping |
|------------------|--------------------------|
| 4 rational newforms (348.2.a.a–d) | 4 primordial resonators A, B, C, D |
| AL signs (W₂, W₃, W₂₉) | Discrete symmetry ops in CSR / chunk grid |
| 2 ghost modes | 2 diagonals of the 2×2 W₃×sign grid (pair-correlations) |
| 51 oldforms | Emergent bulk spectrum — effective field from lower levels |
| 12 cusps | Boundary mouths (ER=EPR heuristic — speculation) |
| W₄ = −1 pinning | Constraint that halves AL sign space for newforms |
| 348.2.a.c rank 1 | Single vanishing L-function — “central charge” slot |

### 2×2 newform grid (ghost diagonals)

```
      W₃=+      W₃=−
a.a ──── a.c     │  diagonal AC
a.b ──── a.d     │  diagonal BD
```

**14/16 gap (framework count):** 16 voices = 4 chunks × 4 AL states; 14 eigenvalues = 16 − 2 constraints (W₄ pinned, Fricke dependent). The 2 ghost modes are the **diagonal pair-states**, not single-newform observables.

### Negative space (computation)

Forbidden AL patterns (W₄ = +1 with no newform) define **negative space** — structurally active, populated by oldforms. The constraint compresses genus 55 → 4 visible newform dimensions while preserving correlation structure. In silicon terms: `CAD.UNITY` normalizes to unity; constraints (`at_x1`, seal verify) carve the allowed pipeline states.

## Pipeline fuse diagram

```
rs1 (x) ──► unity_gate ──► rd = 1 (cos(0))
                │
                ├── at_x1 (x==1)
                │
                ▼
         seal_ioc ◄── CAD.SEAL / COMMIT / VERIFY
                │
                ▼
         qai_core CAD.UNITY (fun=0x10)
```

## Opcode reference

| Mnemonic | Fun | Semantics |
|----------|-----|-----------|
| `CAD.UNITY rd, rs1` | `0x10` | `rd ← 1`; flags anchor when `rs1 == 1` |

See also: `docs/01-isa.md`, `08` fuses with `seal_ioc.sv` and `/chipset` → **Run unity chip fuse**.

## What is not claimed

- Room-temperature quantum advantage from modular curves
- Puzzle-solving or key-recovery from X₀(348) structure
- Hardware `cos()` — stub returns constant 1
- Shipping silicon — G2 FPGA / G3 MPW roadmap only
