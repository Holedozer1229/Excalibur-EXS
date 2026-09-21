# G3 — PDK selection

## Recommendation

**First shuttle:** **SkyWater SKY130** (130 nm) via **Efabless MPW** or **Google + SkyWater Open MPW**

| Factor | SKY130 | GF 180MCU | TSMC 65nm |
|--------|--------|-----------|-----------|
| PDK access | Open (no NDA for PDK) | NDA + MPW fee | NDA + partner |
| Mask cost (MPW) | **~$10–75k** slot | ~$100–300k | $500k+ |
| Digital + analog IOC | Good | Excellent mixed-signal | Best density |
| AQAI EDGE fit | CORE + seal_ioc OK | Larger area OK | Overkill for v1 |
| Timeline to first silicon | **6–12 mo** | 9–15 mo | 12–18 mo |

## PDK access steps (Sky130)

1. Clone [skywater-pdk](https://github.com/google/skywater-pdk) and [open_pdks](https://github.com/efabless/open_pdks).
2. Install Magic, Netgen, OpenLane (or Silicon Compiler flow).
3. Map AQAI RTL → synthesized netlist (Yosys) for digital subset.
4. Run DRC/LVS on `qai_core` + `seal_ioc` macro floorplan.
5. Join Efabless community for MPW slot announcements.

## PDK access steps (GF / TSMC — scale path)

1. Execute mutual NDA (counsel review).
2. Apply to GF MPW or TSMC OIP with company deck + G2 FPGA demo.
3. Receive PDK download credentials under license agreement.
4. Engage CAD support for seal_ioc memory compiler if needed.

## Node decision

| Phase | Node | Rationale |
|-------|------|-----------|
| MPW v1 | **SKY130** | Shuttle-friendly, open PDK, honest pre-revenue fit |
| MPW v2 | GF 12LP or SKY130 rev | Add skin_memory SRAM macro |
| Production | 28nm specialty or chiplet | Post-G5 revenue |

## Evidence

- Tracker: `foundry-nda-tracker.csv`
- DRC scope: `edge-subset-drc-checklist.md`
- Shuttle compare: `mpw-shuttle-comparison.md`

## Status

**ready_to_execute** — PDK selected (SKY130); NDA/slot signing pending T2 fundraise.
