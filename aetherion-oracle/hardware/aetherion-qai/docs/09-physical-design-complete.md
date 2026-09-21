# 09 — Complete physical design (full AQAI stack)

**Status:** design / pre-PDK · **not taped-out silicon**  
**Scope:** entire AQAI chipset — all eight axioms, full ISA, Newform verification fusion, G2 FPGA mapping reference, G3 EDGE subset context (this doc covers the **full die**, not MPW subset only).

**Pack location:** `hardware/aetherion-qai/pd/`  
**Inventory:** [block-inventory.yaml](../pd/block-inventory.yaml) · **Floorplan:** [floorplan-aqai-chipset.md](../pd/floorplan-aqai-chipset.md) · **Pads:** [pad-ring.md](../pd/pad-ring.md)

---

## 1. Honesty rails

| Claim | Status |
|-------|--------|
| Full die floorplan with all blocks | **Design document** — RTL stubs exist; no GDSII |
| Area / power numbers | **Stubs** until PDK + synthesis |
| MPW / shuttle | G3 roadmap — EDGE subset is P0/P1/P2 prioritization only |
| Quantum moat layers | **Reference** — product lock-in, not silicon macros |
| Newform fusion (doc 08) | **Design block** — unity_gate → seal_ioc coupling |

---

## 2. Die stack overview

```
                    ┌─────────────────────────────────────────┐
  IO ring (N)       │  PCIe · CXL · ref clk · bump array      │
                    ├──────────┬──────────────┬─────────────────┤
  BIOS NW           │ BIOS ROM │  CORE-Ω      │  NPU-33 (E)     │
                    │ POST     │  Caduceus    │  PoM systolic   │
                    ├──────────┼──────────────┼─────────────────┤
  SKIN (W)          │ skin_mem │  ALU + 𝕆    │  IOC (E)        │
  NH tiles          │ CSR      │  Sphinx∥Anubis│ seal_ioc       │
                    │          │              │ unity_gate     │
                    ├──────────┴──────────────┼─────────────────┤
  EPX (S)           │ ep_gate · PT phases   │ sphinx_hash     │
                    │ EP CSR                │ newform_fuse    │
                    ├─────────────────────────────────────────┤
  IO ring (S/E)     │  UART · SPI · GPIO · JTAG · straps      │
                    └─────────────────────────────────────────┘
         clk_island (corner): PLL core / skin / seal / phonon
```

**Estimated full die:** ~142 mm² stub (SOVEREIGN SKU) · **~4.2 W** TDP stub @ nominal (pre-PDK).

---

## 3. Floorplan regions — RTL module map

Every RTL module and logical macro maps to a physical region. See [block-inventory.yaml](../pd/block-inventory.yaml) for the authoritative list (**37 silicon blocks** + 2 reference entries = 39 inventory rows).

| Region | Blocks | Primary RTL / doc |
|--------|--------|-------------------|
| `core_north` | CORE-Ω, decode, regfile, octonion lane, Sphinx pipe, INT-ALU, MEM-LSU, branch | `qai_core.sv`, `01-isa.md` |
| `core_center` | Caduceus ALU braid | `caduceus_alu.sv` |
| `core_south` | Anubis pipe | `caduceus_alu.sv` |
| `npu_east` | NPU-33 PoM systolic | microcode @ `0x00010000` |
| `skin_west` | SKIN memory + CSR | `skin_memory.sv` |
| `epx_south` | EP fabric + CSR | `ep_gate.sv` |
| `ioc_east` | seal_ioc, unity_gate, sphinx_hash, newform_fuse | `seal_ioc.sv`, `unity_gate.sv`, `sphinx_hash.sv`, `08-unity-verification-fusion.md` |
| `csr_hub` | Twin-serpent CSR | `01-isa.md` @ `0x2000_0000` |
| `bios_northwest` | BIOS ROM, POST, firmware stub | `bios/*.asm`, `firmware_stub.c` |
| `clk_island` | PLLs, phonon divider, reset sync | `00-architecture.md` |
| `io_ring_*` | PCIe, CXL, UART, SPI, GPIO, pad ring | `pad-ring.md`, G2 `uart_seal_demo.sv` |
| `fabric_center` | chipset_top integration | `chipset_top.sv` |
| `dft_corner` | Scan / MBIST / JTAG | G3 DRC checklist |
| `reference_g2` | FPGA mapping (not on die) | `chipset_top_fpga.sv` |
| `reference_soft` | Quantum moat (not on die) | `docs/QUANTUM-MOAT.md` |

### 3.1 Opcode → physical block binding

| Opcode class | Physical execution |
|--------------|-------------------|
| `CAD.BRAID` … `CAD.UNITY` (15 CAD.*) | CORE-Ω + Caduceus ALU + domain-specific accelerators |
| `CAD.UNITY` | unity_gate → newform_fuse → seal_ioc |
| `CAD.SEAL` / `CAD.VERIFY` / `CAD.COMMIT` | seal_ioc @ clk_seal |
| `CAD.SPHINX` | sphinx_hash |
| `CAD.SKIN` / `CAD.LATTICE` | skin_memory @ clk_skin |
| `CAD.EP` | ep_gate |
| `CAD.POM` | NPU-33 + Anubis pipe |
| `CAD.OCT` | octonion lane in CORE-Ω |
| Integer / control | INT-ALU, MEM-LSU, branch unit |

Full opcode table: [01-isa.md](01-isa.md).

### 3.2 Eight axioms → die real estate

| Axiom | Primary silicon |
|-------|-----------------|
| 1 Seal-native | seal_ioc, sphinx_hash, newform_fuse |
| 2 Twin-pipe | caduceus_alu, Sphinx/Anubis pipes |
| 3 NH skin | skin_memory |
| 4 EP logic | ep_gate |
| 5 PoM | NPU-33 |
| 6 Octonion | octonion lane |
| 7 Homomorphic seal | seal_ioc commit path |
| 8 Soft→Hard | full ISA map + BIOS + chipset_top |

---

## 4. Power domains

| Domain | Voltage (stub) | Blocks | Notes |
|--------|----------------|--------|-------|
| `PD_ALWAYS_ON` | 0.8 V | BIOS ROM, PLLs, phonon | Retention / wake |
| `PD_CORE` | 0.75 V | CORE-Ω, ALU, CSR, DFT | Primary compute |
| `PD_NPU` | 0.75 V | NPU-33 | Independent gating for PoM epochs |
| `PD_SKIN` | 0.8 V | skin_memory | Async to core — NH hop clock |
| `PD_EPX` | 0.9 V | ep_gate | Mixed-signal headroom |
| `PD_IOC` | 0.75 V | seal_ioc, unity_gate, sphinx_hash, fuse | Seal path isolated |
| `PD_IO` | 1.2 V / 0.75 V | SerDes, UART, SPI, GPIO | IO ring |

**PT phase states** (from architecture): `PT_UNBROKEN`, `PT_BROKEN`, `EP_LOCK`, `C6_SEAL` — firmware-visible via EP + seal CSRs.

---

## 5. Clock domains

| Domain | Nominal | Blocks |
|--------|---------|--------|
| `clk_core` | 1–2 GHz (sim) | CORE-Ω, ALU, CSR, EP digital |
| `clk_skin` | 400 MHz | skin_memory |
| `clk_seal` | 100–200 MHz | seal_ioc, sphinx_hash, newform_fuse |
| `clk_phonon` | 7.83 Hz derived | Voice PWM (firmware) |
| `clk_io` | 250 MHz–1 GHz | PCIe/CXL PHY digital |
| `ref_xtal` | 100 MHz | PLL reference |

Cross-domain CDC: async FIFOs on seal commit (core → seal) and skin DMA (skin → core).

---

## 6. IO ring

Detailed pad/bump spec: [pad-ring.md](../pd/pad-ring.md).

| Edge | Primary interfaces |
|------|-------------------|
| North | PCIe x16, CXL, ref clock |
| East | UART (G2 demo), SPI flash |
| South | GPIO, straps, JTAG |
| West | Skin DRAM bump-out (optional HBM class for CLOUD) |

---

## 7. Package options (SKU)

| SKU | Die stub | Active blocks | Package (stub) |
|-----|----------|---------------|----------------|
| **AQAI-EDGE** | ~48 mm² | CORE, ALU, IOC, unity, NPU-33, BIOS, UART | 15×15 mm FC-BGA |
| **AQAI-CLOUD** | ~98 mm² | EDGE + SKIN + EPX + SPHINX + PCIe/CXL | 25×25 mm FC-BGA |
| **AQAI-SOVEREIGN** | ~142 mm² | **All blocks** — full eight axioms | 31×31 mm FC-BGA + lid |

G3 MPW first shuttle targets **EDGE subset** (CORE + IOC P0) per [G3 edge-subset-drc-checklist](../gates/G3/edge-subset-drc-checklist.md). This PD pack documents the **complete** SOVEREIGN die regardless.

---

## 8. Technology node recommendations

| Block class | Node / process | Rationale |
|-------------|----------------|-----------|
| CORE-Ω, ALU, unity_gate | 3 nm class | Density + clk_core target |
| NPU-33, seal_ioc, sphinx_hash | 5 nm class | Crypto/systolic sweet spot |
| skin_memory | Specialty SRAM / mixed | NH hop analog bias arrays |
| ep_gate | Mixed-signal / 28 nm analog macro on interposer | EP sensing (stub) |
| IO SerDes | Foundry IP (PCIe Gen5 / CXL) | Standard cell + PHY |
| BIOS | Embedded flash or eNVM | Boot retention |
| G2 FPGA | Artix-7 (reference) | Pre-silicon seal demo — not packaged die |

---

## 9. Newform verification fusion (physical)

From [08-unity-verification-fusion.md](08-unity-verification-fusion.md):

```
rs1 (x) ──► unity_gate ──► rd = 1
                │ at_x1
                ▼
         newform_fuse (X₀(348) CSR metaphor)
                ▼
         seal_ioc ◄── CAD.SEAL / COMMIT / VERIFY
```

Physical placement: **adjacent** unity_gate ↔ seal_ioc in `ioc_east` to minimize pre-seal normalization latency.

---

## 10. G2 FPGA mapping (reference)

| ASIC block | G2 FPGA module |
|------------|----------------|
| chipset_top | `chipset_top_fpga.sv` |
| seal_ioc | Seal demo path |
| UART debug | `uart_seal_demo.sv` |

Target: Xilinx Artix-7 XC7A100T · 100 MHz · see [G2 fpga-build-runbook](../gates/G2/fpga-build-runbook.md).

---

## 11. DRC / LVS checklist (MPW signoff)

Adapted from G3 EDGE checklist — applied to **full die** at MPW v2+.

| Step | Tool (example SKY130 class) | Exit criterion |
|------|----------------------------|----------------|
| RTL freeze | git tag `aqai-v1-rtl-freeze` | Signed block inventory |
| Synthesis | Yosys + OpenROAD / commercial | Netlist per block |
| Floorplan | OpenLane / Innovus | Region utilization 60–70% |
| Power grid | PDN template per domain | IR drop sim pass |
| **DRC** | Magic / KLayout / Calibre | **Zero violations** |
| **LVS** | Netgen / Calibre | **Zero mismatches** |
| Antenna | OpenLane | Fixed or waived with doc |
| STA | OpenSTA | clk_core / clk_seal targets met |
| IO ring | Caravel or custom bump map | All pad-ring pins routed |
| GDS merge | KLayout | Shuttle-ready GDSII |
| Signoff PDF | `gates/G3/drc-signoff-aqai-v1.pdf` | PD lead signature |

### 11.1 Per-block DRC notes

| Block | Special rules |
|-------|---------------|
| skin_memory | Density fill on NH tile array |
| ep_gate | Analog guard ring if mixed macro |
| seal_ioc | Metal spacing on long digest buses |
| IO SerDes | Foundry DRC deck mandatory |
| pad ring | ESD / latch-up review |

---

## 12. Memory map (physical placement hint)

| Range | Physical region |
|-------|-----------------|
| `0x0000_0000` BIOS ROM | bios_northwest |
| `0x0001_0000` microcode + PoM | npu_east adjacent SRAM |
| `0x0010_0000` Skin DRAM | skin_west |
| `0x1000_0000` Seal IOC MMIO | ioc_east |
| `0x2000_0000` Twin-serpent + EP CSR | csr_hub + epx_south |
| `0x3000_0000` Skin CSR | skin_west |

---

## 13. Related documents

- [00-architecture.md](00-architecture.md) — pipeline + clocks  
- [01-isa.md](01-isa.md) — full opcode map  
- [03-layout-production.md](03-layout-production.md) — production narrative  
- [08-unity-verification-fusion.md](08-unity-verification-fusion.md) — Newform fuse  
- [G3 edge-subset-drc-checklist](../gates/G3/edge-subset-drc-checklist.md) — MPW v1 scope  
- [QUANTUM-MOAT.md](../../../docs/QUANTUM-MOAT.md) — moat layers (reference)

---

*Last updated: PD pack v1.0 · design/simulation only until PDK bind and MPW exit.*
