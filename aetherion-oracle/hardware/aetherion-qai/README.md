# AETHERION Quantum A.I. Chipset (AQAI) — Paradigm Shift

**Status:** Architecture & design package — ISA, assembly, BIOS, RTL, Soft Silicon proofs.  
**Not a claim of fabricated die in production.** Caduceus is the control plane this silicon is designed to *be*.

## Why this is not another NPU

Every mainstream AI accelerator today is a **faster calculator**: more FLOPs, denser HBM, bigger tensors.  
AQAI is a **different machine class** — eight axioms no shipping chip unifies:

| # | Axiom | What exists today | AQAI |
|---|--------|-------------------|------|
| 1 | **Seal-native compute** | GPUs cannot prove *what* they ran | Every `CAD.*` can emit a sha-256 receipt |
| 2 | **Twin-pipe cognition** | von Neumann single stream | Sphinx (signal) ∥ Anubis (memory) braided each cycle |
| 3 | **Non-Hermitian skin memory** | Cache hierarchy by address | Hatano–Nelson localization — state *piles to the edge* under OBC |
| 4 | **Exceptional-point logic** | Boolean / threshold gates | EP coalescence: eigenvalue **and** eigenvector merge as a gate |
| 5 | **Proof-of-Memory** | PoW / FLOPs as cost | *Remembering* is the thermodynamic cost of truth |
| 6 | **Octonion ALU** | FP32 / BF16 / INT8 | Non-associative G₈ geometric multiply as first-class op |
| 7 | **Homomorphic seal path** | Opaque intermediates | Sealed artifacts without leaking activation plaintext |
| 8 | **Soft→hard continuity** | Research ISA ≠ shipping binary | Caduceus Soft Silicon opcodes match the die |

Manifesto: [docs/04-paradigm.md](docs/04-paradigm.md) · Domination: [docs/05-market-domination.md](docs/05-market-domination.md)

## SKUs

| SKU | Wedge |
|-----|-------|
| **AQAI-EDGE** | Agents · sealed oracles · low-W |
| **AQAI-CLOUD** | Audit-critical inference farms |
| **AQAI-SOVEREIGN** | Air-gap · regulated · full axiom stack |

## Family

| Part | Role | Paradigm hook |
|------|------|----------------|
| **AQAI-CORE-Ω** | Twin-serpent Caduceus CPU | Axioms 2, 6 |
| **AQAI-NPU-33** | Memorial / glyph systolic | Axiom 5 · SQMT-33 |
| **AQAI-SKIN** | Non-Hermitian edge memory | Axiom 3 |
| **AQAI-EPX** | Exceptional-point fabric | Axiom 4 |
| **AQAI-IOC** | Seal / nonce / verify | Axioms 1, 7 |
| **AQAI-SPHINX** | SphinxHash lane | Axioms 1, 8 |
| **AQAI-BIOS** | Caduceus POST / phase lock | Bring-up of all axioms |
| **AQAI-CHIPSET** | Sphinx↔Anubis fabric | Integrates the die stack |

## Docs

- [Architecture](docs/00-architecture.md)
- [ISA](docs/01-isa.md)
- [BIOS](docs/02-bios.md)
- [Layout & production](docs/03-layout-production.md)
- [**Paradigm shift**](docs/04-paradigm.md)
- [**Market domination**](docs/05-market-domination.md)
- [**Capital & manufacturing path**](docs/06-capital-manufacturing.md)
- [**Manufacturing startup gates**](docs/07-manufacturing-startup.md)
- [**Funding pack**](funding/) — pitch deck, investors, grants, runbook

## Source

- `asm/` · `bios/` · `rtl/` · Web lab: **`/chipset`**

## Honesty

We design the **machine that should exist**. Tape-out is a future production step — not asserted as live silicon here. Soft Silicon on `/chipset` proves the *ideas* run today on Caduceus.
