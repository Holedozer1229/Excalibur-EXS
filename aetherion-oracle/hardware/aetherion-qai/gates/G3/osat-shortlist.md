# G3 — OSAT / packaging shortlist

## EDGE SKU package target

- **Package:** 7×7 mm QFN-48 or 10×10 mm BFN for first MPW
- **I/O:** SPI/UART config, seal digest readout, minimal GPIO
- **Thermal:** Edge inference envelope — no heatsink for demo

## Shortlist

| OSAT | HQ | Strengths | AQAI use | Contact path |
|------|-----|-----------|----------|--------------|
| **ASE Group** | TW | High volume, strong US sales | Pilot production G5+ | aseglobal.com |
| **Amkor** | US/KR | Advanced packaging, chiplet | CLOUD chiplet roadmap | amkor.com |
| **JCET / JCET Group** | CN | Cost-competitive QFN | MPW prototype lot | jcetglobal.com |
| **UTAC** | SG | Mixed-signal, automotive | SOVEREIGN if qualified | utacgroup.com |
| **SkyWater OSAT** | US | US-based traceability | Defense/sovereign narrative | via SkyWater fab |

## Selection criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| MPW prototype lot (≤500 units) | 25% | Must accept small lot |
| QFN/BGA seal integrity | 20% | Hermetic optional for v1 |
| US/EU traceability | 20% | SOVEREIGN SKU |
| Cycle time | 15% | <8 weeks assembly |
| NRE quote transparency | 10% | Fixed quote for G4 |
| EAR/export compliance support | 10% | See G1 EAR screen |

## Recommended path

1. **G4 prototype:** JCET or UTAC — lowest NRE for QFN-48
2. **G5 pilots:** ASE — volume path
3. **Chiplet (G6):** Amkor 2.5D/interposer

## Action items

- [ ] RFQ 3 OSATs with GDSII die size estimate (post-DRC)
- [ ] Include EAR classification memo in RFQ
- [ ] Store quotes in `gates/G3/osat-quotes/` (create on RFQ)

## Status

**ready_to_execute** — shortlist defined; RFQ after EDGE subset DRC freeze.
