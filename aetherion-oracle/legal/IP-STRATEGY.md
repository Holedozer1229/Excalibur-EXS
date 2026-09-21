# IP strategy — AETHERION QAI / Caduceus

> **Disclaimer:** Strategic planning document for Travis D Jones.
> Not legal advice. Engage counsel for filing decisions.

## Goal

Protect the **Verified Cognition Silicon (VCS)** category and AQAI architecture
while keeping Soft Silicon open for adoption — without overclaiming fabricated
silicon or registered marks we do not yet hold.

## Layer 1 — Copyright (BSD-3-Clause)

**Status:** Active via [LICENSE](../LICENSE) + [NOTICE](../NOTICE)

- Covers: TypeScript SDK (`src/lib/qai/`), RTL stubs (`hardware/aetherion-qai/rtl/`),
  docs, pitch materials
- Effect: Others may fork/modify with attribution; cannot remove copyright
- Limit: Does not stop independent reimplementation of *ideas*

## Layer 2 — Trade secret

**Candidates to keep out of public repos:**

- Final GDSII / tape-out databases
- Foundry PDK-specific timing closure reports
- Unreleased yield and binning data
- Customer LOI terms under NDA

**Already public (not secret):** ISA v0.3, simulation RTL stubs, Soft Silicon
opcode map, seal receipt schema in product code.

## Layer 3 — Trademark

**Status:** Unregistered — use ™ per [NOTICE](../NOTICE)

| Mark | Role |
|------|------|
| AETHERION™ | Platform / company |
| AQAI™ | Chipset + ISA family |
| Caduceus™ | Cognition control plane (search before filing) |

Action: See [TRADEMARK.md](./TRADEMARK.md) — Classes 9 + 42 primary.

## Layer 4 — Patent

**Status:** Templates prepared in [patent/](./patent/) — **NOT filed**

Novel combinations to discuss with counsel (design/simulation claims only where
applicable today):

1. Seal-native compute — cryptographic receipt as pipeline stage on every
   `CAD.*` instruction class
2. Twin-pipe Caduceus cognition — Sphinx ∥ Anubis braid per cycle
3. Non-Hermitian skin memory — Hatano–Nelson edge localization as memory hierarchy
4. Exceptional-point logic — EP coalescence as native mode switch
5. Proof-of-Memory — retention-cost schedule (NPU-33 / memorial glyphs)
6. Octonion ALU — non-associative multiply lane for causal braid order
7. Homomorphic seal path — commit digests without revealing activations
8. Soft→hard continuity — identical `CAD.*` opcode map in SDK and RTL

**Prior art risk:** GPUs with attestation, neuromorphic chips, NH lattice papers,
confidential computing TEEs — see [patent/06-prior-art-search-notes.md](./patent/06-prior-art-search-notes.md).

## Product marking timeline

| Stage | Marking |
|-------|---------|
| Now (pre-filing) | AETHERION™ · AQAI™ · Caduceus™ in docs/UI |
| After provisional filed | "Patent Pending" where appropriate — see [patent/07-patent-pending-marking.md](./patent/07-patent-pending-marking.md) |
| After registration | ® only on registered marks in registered classes |

## What we do NOT claim today

- Fabricated AQAI silicon (design / simulation / Soft Silicon only)
- USPTO trademark registration (until certificates issue)
- Granted patents (until USPTO allows claims)
- Legal advice (these docs are operator templates)

## Recommended sequence for founder

1. ✅ Add BSD-3 + NOTICE (done in repo)
2. Run trademark search → file TEAS for AETHERION + AQAI (Class 9/42)
3. Review [patent/01-invention-disclosure.md](./patent/01-invention-disclosure.md)
4. File **provisional** via Patent Center (~$60–$300 micro entity)
5. Mark products "Patent Pending" after provisional serial number issued
6. Within **12 months**, engage patent attorney for non-provisional + claims
7. Maintain trade secrets for tape-out artifacts outside public repo

## Repository map

```
legal/
├── TRADEMARK.md
├── BSD-3-AND-IP.md
├── IP-STRATEGY.md          ← you are here
└── patent/
    ├── 00-README-provisional-patent.md
    ├── 01-invention-disclosure.md
    ├── 02-provisional-specification-draft.md
    ├── 03-claims-outline.md
    ├── 04-abstract.md
    ├── 05-inventor-declaration-template.md
    ├── 06-prior-art-search-notes.md
    └── 07-patent-pending-marking.md
```
