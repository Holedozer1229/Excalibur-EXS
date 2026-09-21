# AQAI pad / bump ring specification

**Die:** caduceus-die-v1 · **Packages:** FC-BGA per SKU (see [09-physical-design-complete.md](../docs/09-physical-design-complete.md))  
**Honesty:** pin counts and electricals are design stubs until package SI signoff.

---

## 1. Ring topology

```
                    [NORTH: high-speed SerDes]
                           PCIe x16
                           CXL Type-2
                           refclk_p/n
    [WEST: SKIN]                              [EAST: debug + flash]
    skin_dram bumps                           UART TX/RX
    (CLOUD/SOV)                               SPI CLK/MOSI/MISO/CS
                                              JTAG TCK/TMS/TDI/TDO
                    [SOUTH: GPIO + power]
                    GPIO[15:0] · straps · VDD/VSS arrays
```

Pad ring macro: `IO-PAD-RING` in [block-inventory.yaml](block-inventory.yaml).

---

## 2. Power / ground pads (stub)

| Net | Domain | Pad type | Count (stub) |
|-----|--------|----------|--------------|
| VDD_CORE | PD_CORE | core power | 120 |
| VDD_SKIN | PD_SKIN | skin array | 48 |
| VDD_IOC | PD_IOC | seal path | 32 |
| VDD_IO | PD_IO | 1.2 V IO | 64 |
| VDD_AON | PD_ALWAYS_ON | PLL / BIOS | 16 |
| VSS | GND | return | 280+ |

Decap strategy: on-die MIM under IOC + core; package caps on VDD_CORE/VDD_IOC.

---

## 3. Clock / reset

| Signal | Dir | Pad location | Notes |
|--------|-----|--------------|-------|
| ref_clk_p | in | North | 100 MHz XO |
| ref_clk_n | in | North | differential |
| rst_n | in | South | strap-able |
| clk_core_test | out | East | DFT only |
| clk_seal_test | out | East | DFT only |

---

## 4. Seal IOC demo pins (G2 / EDGE minimum)

Matches [G3 edge-subset-drc-checklist](../gates/G3/edge-subset-drc-checklist.md) minimum list + full die extras.

| Signal | Width | Dir | Domain | Function |
|--------|-------|-----|--------|----------|
| clk | 1 | in | PD_CORE | System clock |
| rst_n | 1 | in | PD_AON | Async reset |
| seal_commit | 1 | in | PD_IOC | Commit pulse |
| seal_verify | 1 | in | PD_IOC | Verify pulse |
| payload_lo | 64 | in | PD_IOC | Seal payload low |
| payload_hi | 64 | in | PD_IOC | Seal payload high |
| seal_expected | 64 | in | PD_IOC | Expected digest |
| digest | 64 | out | PD_IOC | Commit digest out |
| seal_ok | 1 | out | PD_IOC | Verify pass |
| sealed | 1 | out | PD_IOC | Commit complete |
| unity_out | 64 | out | PD_IOC | CAD.UNITY result |
| unity_at_x1 | 1 | out | PD_IOC | x==1 anchor flag |

---

## 5. PCIe / CXL (CLOUD / SOVEREIGN)

| Signal group | Lanes | Location | Notes |
|--------------|-------|----------|-------|
| PCIe TX/RX | x16 | North | Gen5 stub — foundry PHY |
| CXL | shared | North | CXL.mem on CLOUD+ |
| PERST# | 1 | North | standard |
| WAKE# | 1 | North | optional |

EDGE SKU: PCIe/CXL pads **NC** (bond-out optional).

---

## 6. Debug / boot

| Signal | Dir | SKU | Notes |
|--------|-----|-----|-------|
| uart_tx | out | ALL | G2 seal demo |
| uart_rx | in | ALL | 115200 default |
| spi_* | bidir | ALL | BIOS load |
| jtag_* | in/out | CLOUD+ | manufacturing |
| gpio[15:0] | IO | ALL | straps, LEDs |
| boot_mode[1:0] | in | ALL | South straps |

---

## 7. Skin DRAM bump-out (CLOUD / SOVEREIGN)

| Signal | Notes |
|--------|-------|
| skin_dq[63:0] | NH tile array data |
| skin_addr[31:0] | Edge-hot map |
| skin_tr/tl/gamma | Hop asymmetry analog bias (stub) |

EDGE: skin pads NC — PoM uses internal SRAM only.

---

## 8. ESD / latch-up (checklist)

- [ ] IO ring ESD cells per foundry rule deck  
- [ ] SerDes pads: foundry-provided ESD only  
- [ ] Analog EP sense pads: guard ring + separate ESD  
- [ ] Antenna rules on long seal digest buses (see G3 DRC)  
- [ ] Latch-up review on VDD domain crossings  

---

## 9. Package pin map (EDGE 15×15 mm FC-BGA stub)

| Quadrant | Functions |
|----------|-----------|
| A1–A8 | VSS |
| B1–H1 | VDD_CORE |
| Row N | ref_clk, PCIe diff pairs (NC on EDGE) |
| Row S | GPIO, rst_n, boot_mode |
| Row E | UART, SPI, JTAG, seal IOC bundle |
| Row W | VSS / decap |

Full BGA map spreadsheet: `pd/bga-map-edge-v1.csv` (TODO at package design).

---

## 10. Cross-references

- [block-inventory.yaml](block-inventory.yaml) — `IO-*` blocks  
- [floorplan-aqai-chipset.md](floorplan-aqai-chipset.md) — ring placement  
- [G2 uart_seal_demo.sv](../gates/G2/rtl/fpga/uart_seal_demo.sv) — FPGA pin template
