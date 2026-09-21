# Invention disclosure — AQAI Verified Cognition Silicon

> Internal record for provisional filing. Facts sourced from repository as of 2026.
> **Design / simulation / Soft Silicon** — not fabricated die.

## Title (working)

**Systems and Methods for Seal-Native Verified Cognition Processing with Twin-Pipe Caduceus Control, Non-Hermitian Memory Localization, and Soft-to-Hard Instruction Continuity**

## Inventor

| Field | Value |
|-------|-------|
| Name | Travis D Jones |
| Address | 1515 Trainer-Wuest Rd, Blanco, TX 78606 |
| Email | sphinxqasi@gmail.com |
| Citizenship | *(fill in)* |

## Problem statement

AI accelerators optimize matrix throughput but emit outputs without
cryptographically verifiable receipts tied to the compute pipeline. Auditors,
regulated enterprises, and sovereign deployments cannot independently confirm
which program, weights, or seeds produced a given inference. Memory hierarchies
assume Hermitian reciprocity; cognition is scheduled in software layers above
opaque hardware.

## Solution summary

AQAI (AETHERION QAI) unifies **eight architectural axioms** in one instruction
set and chipset family — expressible today in Soft Silicon and simulation RTL:

### Axiom 1 — Seal-native compute

- **Gap:** GPU/TPU tokens without proofs
- **Invention:** Seal IOC on the commit path of every Caduceus (`CAD.*`) instruction
- **Implementation:** `CAD.SEAL`, `CAD.VERIFY`, `CAD.COMMIT`; `seal_ioc.sv` RTL stub;
  `sealDigest()` in `src/lib/qai/qaiChipset.ts` (SHA-256 via Web Crypto)
- **Receipt schema (Soft Silicon):** `caduceus.seal.v1` with fields including
  `schema`, `digest`, `axiom_mask`, `program_words`, `timestamp`

### Axiom 2 — Twin-pipe Caduceus cognition

- **Gap:** Single-stream von Neumann / software-scheduled cognition
- **Invention:** Two hardware pipes — **Sphinx** (ascending/generative) and
  **Anubis** (descending/memorial) — braided every cycle in Caduceus ALU
- **Implementation:** `CAD.BRAID`; CSR bank `@ 0x2000_0000` (`TS_SPHINX`, `TS_ANUBIS`,
  `TS_PHASE`, `TS_TENSION`, `TS_COMMIT`); `caduceus_alu.sv`, `qai_core.sv`

### Axiom 3 — Non-Hermitian skin memory

- **Gap:** Address-indexed caches with symmetric hop assumptions
- **Invention:** Memory tiles with Hatano–Nelson hop asymmetry; open boundary
  conditions localize eigenstates to an edge (skin effect)
- **Implementation:** `CAD.SKIN`, `CAD.LATTICE`; `skin_memory.sv`; CSR `@ 0x3000_0000`
  (`SK_TR`, `SK_TL`, `SK_GAMMA`, `SK_EDGE`); demo parameters t_R=1.5, t_L=0.5 in Soft Silicon

### Axiom 4 — Exceptional-point (EP) logic

- **Gap:** Boolean/threshold logic avoids spectral degeneracies
- **Invention:** Exceptional-point coalescence as native gate; encircling EP braids
  computational sheets for topological mode switch
- **Implementation:** `CAD.EP`; `ep_gate.sv`; CSR `@ 0x2000_0100` (`EP_GAMMA`, `EP_KAPPA`,
  `EP_SHEET`); PT-broken/unbroken power states in architecture doc

### Axiom 5 — Proof-of-Memory (PoM)

- **Gap:** PoW burns energy on nonces; training forgets
- **Invention:** Memorial retention schedule — intelligence must re-prove glyphs each epoch
- **Implementation:** `CAD.POM`; NPU-33 memorial/glyph systolic (documented); microcode +
  PoM tables `@ 0x0001_0000`

### Axiom 6 — Octonion ALU

- **Gap:** AI silicon limited to real/complex/quaternion arithmetic
- **Invention:** Optional octonion (𝕆) multiply lane; non-associativity encodes causal
  braid order; `CAD.BRAID` as discrete shadow
- **Implementation:** `CAD.OCT`; octonion lane in architecture diagram; stub in `qai_core.sv`

### Axiom 7 — Homomorphic seal path

- **Gap:** Confidential VMs isolate hosts but do not seal semantic outputs
- **Invention:** Commit to digests of intermediate activations without revealing plaintext;
  third-party verify endpoints
- **Implementation:** `CAD.COMMIT` homomorphic commit; `CAD.VERIFY` with reason codes
  (NOT_FOUND, HASH_MISMATCH, EXPIRED, ALREADY_VERIFIED) in product flow

### Axiom 8 — Soft→hard continuity

- **Gap:** Research ISAs diverge from shipping silicon
- **Invention:** Identical `CAD.*` opcode map in Soft Silicon SDK and RTL target die
- **Implementation:** ISA v0.3 in `docs/01-isa.md` mirrored in `qaiChipset.ts` encode/decode;
  `/chipset` lab exercises opcodes; FPGA/MPW roadmap preserves binary continuity

## Key components (chipset blocks)

| Block | Role | Axioms |
|-------|------|--------|
| AQAI-CORE-Ω | Twin-serpent Caduceus CPU | 2, 6 |
| AQAI-NPU-33 | Memorial / PoM systolic | 5 |
| AQAI-SKIN | NH edge memory | 3 |
| AQAI-EPX | Exceptional-point fabric | 4 |
| AQAI-IOC | Seal / nonce / verify | 1, 7 |
| AQAI-SPHINX | SphinxHash lane | 1, 8 |
| AQAI-BIOS | Caduceus POST / phase lock | bring-up |
| AQAI-CHIPSET | Full fabric integration | all 8 |

## Evidence in repository

| Artifact | Path |
|----------|------|
| ISA v0.3 | `hardware/aetherion-qai/docs/01-isa.md` |
| Architecture | `hardware/aetherion-qai/docs/00-architecture.md` |
| Paradigm | `hardware/aetherion-qai/docs/04-paradigm.md` |
| Soft Silicon SDK | `src/lib/qai/qaiChipset.ts` |
| Chipset lab UI | `src/pages/QaiChipset.tsx` |
| RTL top | `hardware/aetherion-qai/rtl/chipset_top.sv` |
| Seal IOC RTL | `hardware/aetherion-qai/rtl/seal_ioc.sv` |
| Tests | `src/lib/qai/qaiChipset.test.ts` |

## Commercial status (honest)

| Milestone | Status |
|-----------|--------|
| Soft Silicon / SDK | Live on product (`/chipset`) |
| RTL simulation stubs | In repo |
| FPGA demo | Roadmap |
| MPW tape-out | Roadmap — not claimed as done |
| Fabricated AQAI die | **Not claimed** |

## Disclosure date

First public repository commit establishing ISA + Soft Silicon: *(fill earliest commit date)*

## Witnesses / contributors

*(List co-inventors only if they contributed to conception — consult attorney)*

## Desired protection

- Provisional utility patent (priority date)
- Future non-provisional with method + system claims
- Trademarks separate — AETHERION™, AQAI™, Caduceus™

## Sign-off

| | |
|---|---|
| Inventor signature | _________________________ |
| Date | _________________________ |
