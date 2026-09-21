# Provisional specification — draft

> **DRAFT for USPTO provisional filing.** Convert to PDF with figures before upload.
> Not legal advice. Design/simulation claims unless MPW silicon exists.

---

## Title

Systems and Methods for Seal-Native Verified Cognition Processing with Twin-Pipe Caduceus Control, Non-Hermitian Memory Localization, and Soft-to-Hard Instruction Continuity

## Cross-reference to related applications

None (first filing).

## Field of the invention

The present disclosure relates to computer processors and accelerators for
artificial intelligence inference, and more particularly to architectures that
integrate cryptographic sealing, dual-pipeline cognition scheduling, non-Hermitian
memory localization, exceptional-point logic, proof-of-memory retention, octonion
arithmetic lanes, homomorphic commitment of intermediate results, and binary
continuity between software development platforms and target semiconductor
implementations.

## Background

Conventional graphics processing units (GPUs), tensor processing units (TPUs),
and neuromorphic accelerators optimize floating-point throughput for neural
network inference. Such devices typically emit numeric outputs or tokens without
 attaching verifiable cryptographic receipts to the compute pipeline that
 produced them. Software attestation layers may hash outputs after the fact, but
 the hardware commit path itself remains unsealed.

Memory subsystems in conventional processors rely on address-indexed caches
with approximately reciprocal load/store behavior. Non-reciprocal or
non-Hermitian physical effects are treated as noise rather than as a basis for
data placement.

Cognition in conventional systems is scheduled by software above opaque hardware.
Research instruction set architectures often fail to ship with binary-compatible
silicon, forcing customers to rewrite when hardware arrives.

There remains a need for a unified accelerator architecture that natively
produces verifiable inference receipts, braids generative and memorial compute
pipes in hardware, exploits topological memory localization, and maintains opcode
compatibility from software simulation through tape-out.

## Summary of the invention

In one aspect, a processing system comprises: a dual-pipeline execution unit
having a first pipe (Sphinx) configured for generative signal processing and a
second pipe (Anubis) configured for memorial archive processing; a Caduceus
arithmetic logic unit configured to braid outputs of the first and second pipes
each clock cycle; a seal input/output controller (IOC) coupled to a commit stage
of a Caduceus instruction pipeline and configured to compute a digest of operand
data upon execution of seal-class instructions; a skin memory subsystem comprising
memory tiles with asymmetric hop parameters implementing Hatano–Nelson
localization under open boundary conditions; an exceptional-point fabric
configured to sense and drive toward spectral coalescence points; a proof-of-memory
unit configured to require retention proofs across epochs; and an octonion
multiply lane configured to perform non-associative multiplication encoding
causal braid order.

In another aspect, a method comprises: decoding a Caduceus-class instruction
from a unified opcode map shared between a software simulator and a hardware
implementation; braiding Sphinx-pipe and Anubis-pipe register states in a
Caduceus ALU; localizing a working set to a memory edge via asymmetric hop
steps; sealing a pipeline result by computing a cryptographic digest in the
seal IOC as an integral pipeline stage rather than as a post-hoc library call;
committing a homomorphic digest of sealed intermediate activations; and verifying
a seal receipt at a third-party endpoint.

In yet another aspect, soft-to-hard continuity is maintained by a single
`CAD.*` opcode map (version 0.3) implemented in a TypeScript software
development kit and in SystemVerilog register-transfer-level stubs targeting
fabrication.

## Brief description of the drawings

**FIG. 1** is a block diagram of a twin-staff Caduceus pipeline according to
embodiments, showing Sphinx and Anubis pipes, Caduceus ALU, exceptional-point
fabric, skin DRAM edge, and seal stage leading to an IOC receipt.

*(Source: `hardware/aetherion-qai/docs/00-architecture.md` — reproduce as formal figure)*

**FIG. 2** is a table of Caduceus-class instruction mnemonics, function codes,
semantics, and associated architectural axioms.

*(Source: `hardware/aetherion-qai/docs/01-isa.md`)*

**FIG. 3** is a flow diagram of seal-native compute showing `CAD.SEAL` →
`CAD.COMMIT` → third-party `CAD.VERIFY` with reason codes.

**FIG. 4** is a schematic of non-Hermitian skin memory tiles with hop parameters
t_R, t_L and edge localization metric SK_EDGE.

*(Source: `hardware/aetherion-qai/rtl/skin_memory.sv` comments)*

**FIG. 5** is a register map showing twin-serpent CSRs at 0x2000_0000,
exceptional-point CSRs at 0x2000_0100, and skin CSRs at 0x3000_0000.

## Detailed description

### Definitions

- **Caduceus instruction (`CAD.*`):** A member of a fixed opcode class (fun
  codes 0x00–0x0F) including BRAID, SEAL, SKIN, EP, POM, OCT, COMMIT, VERIFY,
  SPHINX, LATTICE, and related mnemonics.
- **Seal IOC:** Hardware block (`seal_ioc.sv`) accepting commit and verify
  signals, payload registers, and expected digest, producing digest, sealed flag,
  and ok flag.
- **Soft Silicon:** Software reference implementation in `qaiChipset.ts`
  providing encode/decode and `sealDigest()` using SHA-256.
- **Skin effect:** Localization of eigenstates to a boundary under asymmetric
  hopping in non-Hermitian lattices.

### Twin-pipe Caduceus core

Referring to FIG. 1, upon reset the BIOS ROM at 0x0000_0000 executes POST
including `CAD.BRAID` identity self-test, `CAD.OCT` smoke, `CAD.SKIN` edge
metric threshold, and `CAD.EP` lock check per bring-up documentation.

The core module (`qai_core.sv`) decodes opcode nibble 0xC and dispatches fun
codes to pipeline stages. Register files include general registers r0–r31 and
pipe duals s0–s7 (Sphinx) and a0–a7 (Anubis).

The Caduceus ALU (`caduceus_alu.sv`) combines Sphinx and Anubis operands each
cycle. CSR bank TS_SPHINX, TS_ANUBIS, TS_PHASE, TS_TENSION, and TS_COMMIT lo/hi
at 0x2000_0000 expose braid state to firmware.

### Seal-native pipeline

Upon `CAD.SEAL rd, rs1, rs2`, the seal stage computes a digest over operand
ranges. Unlike GPU post-kernel hashing, sealing occurs as a pipeline stage
coupled to every Caduceus instruction class capable of emitting receipts
including TAROT and SPHINX-class operations.

`CAD.COMMIT rd, rs1` performs homomorphic commitment of a sealed digest.
`CAD.VERIFY rd, rs1, rs2` compares against expected values at the IOC, returning
status including NOT_FOUND, HASH_MISMATCH, EXPIRED, and ALREADY_VERIFIED in the
Soft Silicon product API.

The chipset top (`chipset_top.sv`) integrates skin memory, seal IOC, and core
with MMIO at 0x1000_0000 for IOC, nonce, and UART.

### Non-Hermitian skin memory

Skin memory module (`skin_memory.sv`) implements N-tile hopping with parameters
SK_TR and SK_TL. Under open boundary conditions (OBC), mass localizes to one
edge per Hatano–Nelson phenomenology. `CAD.SKIN rd, rs1` returns edge profile;
`CAD.LATTICE rd, rs1, rs2` performs NH hop steps.

Clock domain `clk_skin` (design 400 MHz in documentation) separates skin hops
from core and seal domains.

### Exceptional-point fabric

`CAD.EP rd, rs1, rs2` drives toward exceptional points characterized by
coalescence of eigenvalues and eigenvectors. CSRs EP_GAMMA, EP_KAPPA, EP_SHEET
control γ, κ, and braid winding. Power states PT_UNBROKEN, PT_BROKEN, EP_LOCK,
and C6_SEAL define operational modes.

### Proof-of-Memory

`CAD.POM rd, rs1` advances memorial glyph retention. Microcode and PoM tables
reside at 0x0001_0000. The NPU-33 schedule assigns thermodynamic cost to
remembering rather than to raw floating-point ops alone.

### Octonion lane

`CAD.OCT rd, rs1, rs2` invokes optional octonion multiplication. Non-associativity
(a·(b·c) ≠ (a·b)·c) encodes order-sensitive causal braids. `CAD.BRAID` provides
a discrete shadow amenable to fixed-point hardware.

### Soft-to-hard continuity (Axiom 8)

The opcode map in Table 1 (FIG. 2) is identical in:

1. Assembler macros (`hardware/aetherion-qai/asm/caduceus.inc`)
2. Soft Silicon SDK (`src/lib/qai/qaiChipset.ts` — `encodeCadR`, `decodeInstr`)
3. RTL decode (`qai_core.sv` fun-code case)

Developers adopting the `/chipset` API receive binary-compatible semantics when
FPGA or MPW silicon ships. Unit tests round-trip CAD.BRAID, SKIN, EP, SPHINX.

### Product SKUs (design targets)

- **AQAI-EDGE:** axioms 1, 2, 5, 8 — agents, sealed oracles
- **AQAI-CLOUD:** axioms 1, 3, 6, 7 — audit farms
- **AQAI-SOVEREIGN:** all eight axioms — air-gapped regulated deployments

### Simulation vs fabrication

Embodiments described herein include **simulation-first SystemVerilog stubs**
and **Soft Silicon** reference code. Fabricated die is a roadmap item; claims
should be reviewed by counsel to ensure proper scope for design vs manufactured
articles.

## Abstract

See [04-abstract.md](./04-abstract.md).

## Claims

See [03-claims-outline.md](./03-claims-outline.md) — incorporate or attach as
separate section per attorney guidance.

---

**Inventor:** Travis D Jones, 1515 Trainer-Wuest Rd, Blanco, TX 78606

**Date of draft:** 2026
