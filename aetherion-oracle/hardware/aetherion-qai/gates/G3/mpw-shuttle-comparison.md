# G3 — MPW / shuttle comparison

| Vendor | Node | Est. slot cost | Queue / lead | Min. die mm² | AQAI fit | Status |
|--------|------|----------------|--------------|--------------|----------|--------|
| **Efabless + SkyWater** | SKY130 | **$10–75k** | 6–9 mo | ~3 mm² | **Best first** | ready_to_execute |
| Google OSS MPW | SKY130 | $0 die fee* | Lottery | ~3 mm² | Good if selected | watch |
| MOSIS | 130nm CMOS | $20–50k | 9–12 mo | varies | Academic path | backup |
| GlobalFoundries MPW | 180MCU | $100–250k | 9–15 mo | ~5 mm² | Mixed-signal IOC | scale |
| Europractice | 130/65nm | €30–80k | 12+ mo | varies | EU customers | optional |
| TSMC shuttle | 65/40nm | $500k–2M | 12–18 mo | small | Production scale | future |

\*OSS MPW programs may waive wafer cost; still budget NRE for design, packaging, test.

## Timeline model (Sky130 first)

```
Month 0   — G3 NDA + PDK setup (open PDK)
Month 1–3 — EDGE subset RTL freeze + synthesis
Month 3–5 — Place/route + DRC/LVS
Month 5   — Shuttle reservation + mask prep
Month 6–9 — Fab + die ship
Month 9–10 — OSAT package + bring-up (G4)
```

## Cost stack (illustrative)

| Item | USD |
|------|-----|
| MPW slot (Efabless) | 25,000 |
| PD contractor | 80,000 |
| OSAT package (100 units) | 15,000 |
| Test socket + board | 10,000 |
| Contingency 15% | 19,500 |
| **Total to G4 exit** | **~$149,500** |

Aligns with T2 tranche ($1–3M) in manufacturing doc.

## Selection

**Primary:** Efabless Sky130 MPW  
**Backup:** MOSIS 130nm  
**Scale:** GF 180MCU after first silicon learnings

## Honesty

Shuttle slot status is **ready_to_execute** — LOI template in `shuttle-reservation-template.md`; not signed until funding + DRC clean.
