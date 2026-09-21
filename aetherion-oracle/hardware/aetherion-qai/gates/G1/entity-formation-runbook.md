# G1 — Delaware C-corp entity formation runbook

**Not legal advice.** Engage qualified counsel before filing. This runbook is an operator checklist for AQAI manufacturing gate G1.

| Field | Value |
|-------|-------|
| Founder | Travis D Jones |
| Address | 1515 Trainer-Wuest Rd, Blanco, TX 78606 |
| Email | sphinxqasi@gmail.com |
| Proposed entity | Aetherion QAI, Inc. (Delaware C-corp) |

## 1. Pre-incorporation

1. Reserve domain and trademark search (AQAI, Aetherion, Caduceus in compute class).
2. Choose registered agent (e.g. Northwest, CT Corporation, or counsel's agent).
3. Draft certificate of incorporation:
   - Authorized shares: **10,000,000** common @ $0.0001 par
   - Purpose: develop and commercialize seal-native compute hardware and software
   - Single-class common at formation; option pool authorized by board later

## 2. File Delaware C-corp

1. File **Certificate of Incorporation** with Delaware Division of Corporations (online or via agent).
2. Pay franchise tax / filing fees (~$89 filing + agent fees).
3. Receive stamped COI; store in `legal/entity/` (create when executed).

## 3. Post-incorporation (within 30 days)

1. **Organizational consent** — elect board, appoint officers (CEO/Secretary/Treasurer).
2. **Bylaws** — adopt standard startup bylaws.
3. **Founder stock purchase** — issue restricted shares to Travis D Jones; **83(b) within 30 days**.
4. **IP assignment** — execute agreement below; record in minute book.
5. **Foreign qualification** — if operating from Texas, file TX foreign corp registration if counsel advises.

## 4. EIN and banking

### EIN

1. Apply at [IRS EIN online](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online) after COI date is set.
2. Save CP 575 letter (EIN confirmation) to `legal/entity/ein-cp575.pdf`.

### Banking

1. Open business checking (Mercury, Brex, or regional bank with startup program).
2. Required docs: COI, EIN letter, founder ID, bylaws/consent, resolution authorizing account.
3. **Exit criterion:** operating account active before first SAFE wire.

## 5. 83(b) election

1. File within **30 calendar days** of restricted stock purchase.
2. Send duplicate to IRS (certified mail); keep proof of mailing.
3. Provide copy to company secretary for cap table records.

## 6. IP assignment agreement template

> **TECHNOLOGY ASSIGNMENT AGREEMENT** (template — counsel must review)
>
> **Assignor:** Travis D Jones ("Founder")  
> **Assignee:** Aetherion QAI, Inc. ("Company")  
> **Effective date:** _______________
>
> 1. **Assignment.** Founder assigns to Company all right, title, and interest in:
>    - AQAI ISA, RTL (`chipset_top`, `seal_ioc`, `skin_memory`, `ep_gate`, related modules)
>    - Caduceus control-plane software and lexicon
>    - Soft Silicon reference implementations and `/chipset` lab assets
>    - Domain names, logos, and documentation in `hardware/aetherion-qai/`
>    - All inventions conceived by Founder relating to seal-native compute prior to Effective Date
>
> 2. **Consideration.** Issuance of ______ shares of Common Stock / nominal consideration as set in SPA.
>
> 3. **Further assurances.** Founder will execute further documents to perfect assignment (patents, copyrights).
>
> 4. **Representations.** Founder is sole owner; no conflicting obligations; work is original.
>
> **Signatures:**  
> _________________________  Travis D Jones, Assignor  
> _________________________  Aetherion QAI, Inc., by CEO

## 7. Evidence checklist

| Artifact | Path / location |
|----------|-----------------|
| Stamped COI | `legal/entity/coi.pdf` |
| EIN CP 575 | `legal/entity/ein-cp575.pdf` |
| IP assignment (executed) | `legal/entity/ip-assignment.pdf` |
| Cap table | `gates/G1/cap-table-template.csv` (live copy in Carta/Pulley) |
| Board consent | `legal/entity/org-consent.pdf` |

## 8. Gate exit

G1 closes when: Delaware C-corp active, EIN + bank live, IP assigned, cap table + SAFE templates ready, EAR screen documented, SAM.gov path started if pursuing NSF SBIR.
