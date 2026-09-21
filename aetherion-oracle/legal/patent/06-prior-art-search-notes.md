# Prior art search notes

> Honest prior art survey for IDS planning and claim drafting.
> **Not exhaustive** — run professional search before non-provisional.
> Not legal advice.

## Purpose

Identify references that may affect patentability (35 U.S.C. §§ 102, 103) or
that must be disclosed in an Information Disclosure Statement (IDS) during
non-provisional prosecution.

## Search methodology (recommended)

1. USPTO Patent Public Search — keywords below
2. Google Patents / Lens.org
3. Non-patent literature (arXiv, IEEE, ACM)
4. Product docs: NVIDIA, Google TPU, Intel TDX, AMD SEV, neuromorphic vendors
5. Trademark TESS for Caduceus (separate from patent)

## Category A — GPU / accelerator attestation & receipts

| Reference type | Examples | Overlap with AQAI | Distinction |
|----------------|----------|-------------------|-------------|
| GPU confidential computing | NVIDIA H100 confidential compute, AMD SEV-SNP | Host-level isolation | AQAI: semantic seal on Caduceus pipeline stage, not VM isolation alone |
| Remote attestation | Intel SGX, TPM quotes | Binary attestation | AQAI: per-inference receipt schema (`caduceus.seal.v1`) tied to ISA |
| Blockchain AI verification | Various PoW/PoS inference proofs | Output hashing | AQAI: in-pipeline IOC + homomorphic commit path |

**Risk:** Examiner may cite attestation as obvious combination. **Response angle:**
specific union of twin-pipe braid + seal IOC on every `CAD.*` class + NH skin memory.

## Category B — Neuromorphic / brain-inspired silicon

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| SpiNNaker, Loihi, TrueNorth | Event-driven sparse compute | Low-power inference | No Caduceus twin-pipe; no cryptographic seal IOC as first-class ops |
| Memristor crossbars | Various academic | In-memory compute | Different memory physics; AQAI uses NH lattice skin localization |

## Category C — Non-Hermitian / skin effect physics

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| Hatano–Nelson model | Hatano & Nelson, PRL 1996 | Skin localization theory | AQAI applies as **memory tile hierarchy** with CSRs and CAD.SKIN ops |
| Non-Hermitian photonics | Exceptional point sensors | EP phenomenology | AQAI: EP as **logic fabric** with CAD.EP and sheet braiding |
| NH metamaterials | Recent PRL/ Nature papers | Edge modes | Hardware ISA + PoM + seal integration is novel combination |

**Action:** Cite foundational NH papers in background; claim hardware implementation.

## Category D — Octonion / geometric algebra compute

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| Quaternion neural nets | Academic QNN | Non-commutative algebra | Octonion non-associativity + braid shadow (`CAD.BRAID`) |
| Geometric algebra GPUs | Research projects | Clifford algebras | Specific 𝕆 lane + Caduceus schedule |

## Category E — Homomorphic encryption / MPC inference

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| FHE schemes (CKKS, BGV) | Microsoft SEAL, Zama | Encrypted compute | AQAI: homomorphic **seal commit** of digests, not full FHE matmul |
| Zero-knowledge ML | zkML projects | Proof of inference | AQAI integrates ZK-friendly path with full cognition ISA |

## Category F — Instruction set / soft-hard continuity

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| RISC-V extensions | Custom opcodes | Extensible ISA | AQAI: domain-specific Caduceus class for cognition + seal |
| Gem5 / QEMU models | Simulation before silicon | SW/HW co-design | AQAI: **identical** opcode map in TS SDK and SV RTL for product continuity |

## Category G — Proof-of-work / proof-of-memory

| Reference type | Examples | Overlap | Distinction |
|----------------|----------|---------|-------------|
| Bitcoin PoW | Nakamoto | Energy cost | AQAI PoM costs **retention**, not hash nonces |
| Proof-of-space | Chia, Filecoin | Storage proof | AQAI: memorial glyphs in NPU-33 epoch schedule |

## Category H — Trademarks (not patent prior art but clearance)

| Mark context | Risk for "Caduceus" |
|--------------|---------------------|
| Medical / pharma logos | Medium — different class but famous |
| Existing software "Caduceus" | Run TESS — may affect brand not patent |
| Mythological generic use | Weak mark alone; stronger as compound |

## Known repository public disclosures

| Disclosure | Date | Notes |
|------------|------|-------|
| GitHub repo Holedozer1229/aetherion-oracle-arcane | *(fill first public commit)* | May start 12-month grace in some jurisdictions — US is grace period friendly for inventor's own disclosure within 1 year |
| excaliburcrypto.com/chipset | Live Soft Silicon | Public use evidence |
| Pitch deck | `hardware/aetherion-qai/funding/pitch-deck.html` | Design claims only |

## Differentiation summary (for examiner interview)

AQAI's argued novelty lies in the **architectural braid**:

1. Seal IOC as pipeline stage on Caduceus ops (not host attestation bolt-on)
2. Sphinx ∥ Anubis hardware schedule every cycle
3. NH skin memory as primary hierarchy (not L1/L2 cache metaphor)
4. EP fabric as native logic mode
5. PoM retention economics
6. Octonion lane + discrete braid shadow
7. Homomorphic commit of sealed intermediates
8. Binary-identical Soft Silicon ↔ RTL opcode map

No single reference in Categories A–G is known to unify all eight; **combination
obviousness** is the primary prosecution risk.

## Recommended actions before non-provisional

- [ ] Professional patent search (~$1–3k)
- [ ] Prepare IDS with cited papers/patents
- [ ] Attorney revises claims to design/simulation vs manufactured article scope
- [ ] Document conception dates in lab notebook / git history

---

**Prepared by:** Repository maintainer (template)  
**Inventor:** Travis D Jones  
**Status:** Working notes — update after professional search
