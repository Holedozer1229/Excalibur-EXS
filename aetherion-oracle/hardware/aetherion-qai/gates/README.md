# AQAI Manufacturing Gates — G0–G6 Dashboard

Master index for Aetherion QAI fabless manufacturing stage gates. Each gate is **fail-closed**: do not spend the next tranche until exit criteria pass.

| Gate | Name | Pack | Status | Progress |
|------|------|------|--------|----------|
| G0 | Soft Silicon | — | live | continuous |
| **G1** | Entity & compliance | [G1/](G1/) | ready_to_execute | packs complete |
| **G2** | FPGA prototype | [G2/](G2/) | ready_to_execute | sim path ready |
| **G3** | Foundry / PDK | [G3/](G3/) | ready_to_execute | LOI template |
| G4 | First silicon (MPW) | (future) | todo | — |
| G5 | Pilot customers | — | todo | — |
| G6 | Production scale | — | todo | — |

## G1 — Entity & compliance

**Exit:** Bank + SAFE/SPA templates ready; grant UEI/SAM.gov if US federal

| Artifact | Path |
|----------|------|
| Checklist | [G1-checklist.yaml](G1/G1-checklist.yaml) |
| Entity runbook | [entity-formation-runbook.md](G1/entity-formation-runbook.md) |
| Cap table | [cap-table-template.csv](G1/cap-table-template.csv) |
| SAFE outline | [safe-template-outline.md](G1/safe-template-outline.md) |
| EAR screen | [ear-export-screening.md](G1/ear-export-screening.md) |
| SAM.gov | [sam-gov-registration.md](G1/sam-gov-registration.md) |
| D&O insurance | [insurance-d-o-checklist.md](G1/insurance-d-o-checklist.md) |

**Founder:** Travis D Jones · sphinxqasi@gmail.com · Blanco, TX

## G2 — FPGA prototype

**Exit:** Live demo video + measured latency/power for Soft Silicon parity

| Artifact | Path |
|----------|------|
| Checklist | [G2-checklist.yaml](G2/G2-checklist.yaml) |
| FPGA selection | [fpga-target-selection.md](G2/fpga-target-selection.md) |
| Constraints | [fpga-constraints.xdc](G2/fpga-constraints.xdc) |
| Build runbook | [fpga-build-runbook.md](G2/fpga-build-runbook.md) |
| RTL wrappers | [rtl/fpga/](G2/rtl/fpga/) |
| Seal demo script | [scripts/fpga-seal-demo.sh](G2/scripts/fpga-seal-demo.sh) |
| Metrics report | [seal-roundtrip-report.json](G2/seal-roundtrip-report.json) |

**Honesty:** Board bring-up blocked until Arty A7 funded; simulation satisfies prep.

**Recommendation:** AMD/Xilinx Artix-7 (Digilent Arty A7-100T)

## G3 — Foundry engagement

**Exit:** Signed shuttle slot + DRC-clean EDGE subset

| Artifact | Path |
|----------|------|
| Checklist | [G3-checklist.yaml](G3/G3-checklist.yaml) |
| NDA tracker | [foundry-nda-tracker.csv](G3/foundry-nda-tracker.csv) |
| PDK selection | [pdk-selection.md](G3/pdk-selection.md) |
| MPW comparison | [mpw-shuttle-comparison.md](G3/mpw-shuttle-comparison.md) |
| OSAT shortlist | [osat-shortlist.md](G3/osat-shortlist.md) |
| DRC checklist | [edge-subset-drc-checklist.md](G3/edge-subset-drc-checklist.md) |
| Shuttle LOI | [shuttle-reservation-template.md](G3/shuttle-reservation-template.md) |

**Honesty:** Shuttle slot status is `ready_to_execute` — LOI template until signed.

**Recommendation:** SkyWater SKY130 via Efabless MPW (~$10–75k)

## UI integration

- `/chipset` lab → **Run G2 FPGA status** + G1/G2/G3 gate panels
- `src/lib/qai/gateProgress.ts` — checklist loader
- `src/lib/qai/fundingPlaybook.ts` — MANUFACTURING_GATES parameter schema

## Operating doc

See [docs/07-manufacturing-startup.md](../docs/07-manufacturing-startup.md) for tranche discipline and org chart.
