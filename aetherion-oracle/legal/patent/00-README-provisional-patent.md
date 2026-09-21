# Provisional patent — operator README

> **We prepare documents. We do NOT file with USPTO.** You submit via Patent Center.

## What this folder contains

Templates to assemble a **provisional patent application** for the AQAI /
Caduceus Verified Cognition Silicon architecture. Fill in, review with counsel,
then upload yourself.

| File | Purpose |
|------|---------|
| [01-invention-disclosure.md](./01-invention-disclosure.md) | Internal invention record |
| [02-provisional-specification-draft.md](./02-provisional-specification-draft.md) | Spec skeleton for USPTO |
| [03-claims-outline.md](./03-claims-outline.md) | Claim drafts — **lawyer review required** |
| [04-abstract.md](./04-abstract.md) | ≤150-word abstract |
| [05-inventor-declaration-template.md](./05-inventor-declaration-template.md) | Inventor block |
| [06-prior-art-search-notes.md](./06-prior-art-search-notes.md) | Prior art honesty section |
| [07-patent-pending-marking.md](./07-patent-pending-marking.md) | Post-filing product marking |

## Step-by-step: file a provisional

### 1. Prepare (1–3 days)

- [ ] Read [01-invention-disclosure.md](./01-invention-disclosure.md) — confirm facts match codebase
- [ ] Merge [02-provisional-specification-draft.md](./02-provisional-specification-draft.md) into one PDF
- [ ] Attach drawings: architecture from `hardware/aetherion-qai/docs/00-architecture.md`,
  ISA table from `docs/01-isa.md`, pipeline diagram from pitch deck
- [ ] Copy [04-abstract.md](./04-abstract.md) into the filing form
- [ ] Complete [05-inventor-declaration-template.md](./05-inventor-declaration-template.md)

### 2. Create USPTO account

- Go to [Patent Center](https://patentcenter.uspto.gov/)
- Register for a USPTO.gov account if needed
- Confirm **micro entity** or **small entity** status (fee reduction)

### 3. Start new application

- Application type: **Provisional**
- Subject matter: **Utility**
- Upload:
  - Specification PDF (text + figures)
  - Cover sheet data (title, inventors, correspondence)
- **Claims are optional** for provisional but recommended as outline in spec

### 4. Pay fees (verify current schedule)

| Entity | Approx. filing fee |
|--------|-------------------|
| Micro entity | ~$60–$80 |
| Small entity | ~$120–$160 |
| Large entity | ~$300+ |

Fees change — check [USPTO fee schedule](https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule).

### 5. After filing

- Save **application serial number** and filing date
- You may mark products **"Patent Pending"** — see [07](./07-patent-pending-marking.md)
- Provisional **does not** publish like a non-provisional; it holds your priority date

### 6. The 12-month clock

A provisional expires **12 months** after filing. Before expiry you must either:

- File a **non-provisional** claiming priority to the provisional, **or**
- Lose the priority date

Non-provisional requires formal claims, often IDS (prior art disclosure), and
**patent attorney strongly recommended** for claim drafting.

## Honesty rails

1. **Design/simulation only** — do not claim shipped silicon unless true
2. **No legal advice** — these templates are starting points
3. **Prior art** — disclose known references; see [06](./06-prior-art-search-notes.md)
4. **BSD-3 license ≠ patent** — open-source code does not substitute for filing
5. **Trademark separate** — see [../TRADEMARK.md](../TRADEMARK.md)

## Inventor / correspondence

**Travis D Jones**  
1515 Trainer-Wuest Rd, Blanco, TX 78606  
sphinxqasi@gmail.com

## Related repo paths

- ISA: `hardware/aetherion-qai/docs/01-isa.md`
- Architecture: `hardware/aetherion-qai/docs/00-architecture.md`
- Paradigm (8 axioms): `hardware/aetherion-qai/docs/04-paradigm.md`
- Soft Silicon: `src/lib/qai/qaiChipset.ts`
- RTL stubs: `hardware/aetherion-qai/rtl/`
