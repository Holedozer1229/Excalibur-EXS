# G2 — FPGA target selection

## Decision matrix: AMD/Xilinx vs Intel

| Criterion | AMD/Xilinx (Artix-7 / Kria) | Intel (Cyclone V / Agilex) | Weight |
|-----------|----------------------------|----------------------------|--------|
| Vivado/Quartus RTL fit | Excellent SystemVerilog | Good SystemVerilog | 20% |
| Dev board cost | **$129–$250** (Arty A7) | $200–$400 (DE10-Lite+) | 15% |
| BRAM for skin_memory | 100–200 KB easy | Comparable | 15% |
| Seal demo I/O | PMOD UART, LEDs | GPIO headers | 10% |
| Team familiarity | Vivado common in semi | Quartus strong in defense | 10% |
| IP ecosystem (PCIe, DDR) | Kria SOM for later | Good | 10% |
| Power measurement | PMBus on some boards | Varies | 10% |
| Shuttle story (FPGA→ASIC) | Xilinx flow → TSMC common | Intel foundry optional | 10% |

**Weighted score:** AMD/Xilinx **8.2/10** · Intel **7.1/10**

## Recommendation

**Primary:** Digilent **Arty A7-100T** (Xilinx Artix-7 XC7A100T)

- Toolchain: **Vivado ML Edition** (free WebPACK for Artix-7)
- Clock: 100 MHz onboard oscillator
- Seal demo: UART @ 115200 on PMOD JA, status LEDs on seal_ok / at_ep
- Cost: ~$129 — fits T1 FPGA budget

**Stretch (post-T1):** AMD **Kria KV260** for Linux host + DMA seal pipeline demo.

## RTL scope for G2

Port from `hardware/aetherion-qai/rtl/`:

| Module | FPGA notes |
|--------|------------|
| `chipset_top` | Top — use `chipset_top_fpga` wrapper |
| `seal_ioc` | Direct port; 2-cycle commit path |
| `skin_memory` | BRAM inference; N=32 default |
| `ep_gate` | Fixed-point γ/κ scan |
| `qai_core` | Subset — OCT decode only for demo |
| `caduceus_alu` | Combinational braid |
| `sphinx_hash` | Optional — defer if timing tight |

## Honesty

Until Arty A7 is funded, **simulation-only** seal round-trip satisfies G2 prep. Status remains `ready_to_execute`, not `complete`, until wire demo or labeled sim recording ships.

## Evidence

- This file → checklist item `g2-fpga-family`
- Constraints → `fpga-constraints.xdc`
- Build → `fpga-build-runbook.md`
