# Manufacturing startup process — Soft Silicon → global scale

Deploy this as the operating system for AQAI silicon. Each gate is fail-closed: do not spend the next tranche until exit criteria pass.

## Stage gates

### G0 — Soft Silicon live (DONE / continuous)
- [x] ISA + RTL stubs + `/chipset` demos
- [x] Caduceus control plane on product
- [ ] Seal receipt schema v1 published
- [ ] SDK npm/package documented
- **Exit:** Developers can encode/decode CAD.* and verify a seal digest in software

### G1 — Entity & compliance
- [ ] Delaware C-corp (or equivalent) with clean IP assignment → [G1 pack](../gates/G1/)
- [ ] Cap table + 83(b) where applicable → [cap-table-template.csv](../gates/G1/cap-table-template.csv)
- [ ] Export-control screen (EAR) for dual-use compute claims — counsel → [ear-export-screening.md](../gates/G1/ear-export-screening.md)
- [ ] Insurance / D&O once raising → [insurance-d-o-checklist.md](../gates/G1/insurance-d-o-checklist.md)
- **Exit:** Bank + SAFE/SPA templates ready; grant UEI/SAM.gov if US federal → [G1-checklist.yaml](../gates/G1/G1-checklist.yaml)

### G2 — FPGA prototype
- [ ] Pick FPGA family (Xilinx/AMD or Intel) → [fpga-target-selection.md](../gates/G2/fpga-target-selection.md) (**Artix-7 / Arty A7 chosen**)
- [ ] Port `chipset_top` + seal_ioc + skin_memory + ep_gate → [rtl/fpga/](../gates/G2/rtl/fpga/)
- [ ] Board bring-up; seal round-trip demo on wire → [fpga-seal-demo.sh](../gates/G2/scripts/fpga-seal-demo.sh) *(sim OK until board funded)*
- **Exit:** Live demo video + measured latency/power for Soft Silicon parity → [seal-roundtrip-report.json](../gates/G2/seal-roundtrip-report.json)

### G3 — Foundry engagement
- [ ] NDA + PDK access (e.g. 65/40/28 nm specialty or shuttle-friendly node first) → [pdk-selection.md](../gates/G3/pdk-selection.md)
- [ ] Choose **shuttle / MPW** vendor (lower mask cost) → [mpw-shuttle-comparison.md](../gates/G3/mpw-shuttle-comparison.md)
- [ ] Package / OSAT shortlist → [osat-shortlist.md](../gates/G3/osat-shortlist.md)
- **Exit:** Signed shuttle slot + DRC-clean EDGE subset → [shuttle-reservation-template.md](../gates/G3/shuttle-reservation-template.md) *(LOI template — ready_to_execute)*

### G4 — First silicon (MPW)
- [ ] Tape-out EDGE subset (CORE + IOC minimum)
- [ ] Package, socket, bring-up firmware (AQAI-BIOS)
- [ ] Characterization report
- **Exit:** Working parts that match Soft Silicon opcode map (axiom 8)

### G5 — Pilot customers
- [ ] 3 design-win LOIs (sealed oracle, audit AI, sovereign pilot)
- [ ] Second shuttle or engineering masks if needed
- **Exit:** Paid pilots or binding LOIs

### G6 — Production & global scale
- [ ] Production mask set for EDGE
- [ ] CLOUD chiplet roadmap with partner
- [ ] Regional distribution + support
- [ ] ISO / security certifications as required by SOVEREIGN deals
- **Exit:** Repeatable revenue + yield model

## Org chart (minimum)

| Role | When |
|------|------|
| Founder / Caduceus architect | G0 |
| RTL / FPGA engineer | G2 |
| Physical design / DFT (contract ok) | G3 |
| Packaging / test (OSAT liaison) | G4 |
| BD / grants | G1–G5 |
| Counsel (IP + export) | G1 |

## Spend discipline

| Tranche | Unlock |
|---------|--------|
| T0 operating | Soft Silicon + Stripe |
| T1 (~$250–500k) | G1+G2 |
| T2 (~$1–3M) | G3+G4 MPW |
| T3 (Series A) | G5→G6 production |

## Global GTM after first silicon

1. **Americas** — audit AI + crypto-native agents  
2. **EU** — sovereign / GDPR-aligned sealed inference  
3. **APAC** — edge modules + foundry-adjacent partnerships  
4. **Defense corridors** — only with counsel + proper entity

## Honesty rails

- Do not advertise “shipping silicon” before G4 exit.
- Soft Silicon ≠ fabricated die.
- 137 ETH / vacuum / genesis narratives are **not** chip CapEx.
- G2 FPGA may be **sim-only** until dev board funded — see [G2 pack](../gates/G2/).
- G3 shuttle slot is **LOI template** until signed — status `ready_to_execute`, not `signed`.

## Gate dashboard

Master index: [gates/README.md](../gates/README.md) · UI: `/chipset` → Run G1/G2/G3 panels
