# G3 — EDGE subset DRC checklist (CORE + IOC minimum)

First tape-out scope: minimum viable die matching Soft Silicon opcode map (axiom 8).

## In-scope RTL blocks

| Block | Module | Tape-out priority | Notes |
|-------|--------|-------------------|-------|
| CORE | `qai_core` | **P0** | OCT decode + register file |
| IOC | `seal_ioc` | **P0** | Seal commit/verify — product differentiator |
| ALU | `caduceus_alu` | P1 | Braid — combinational |
| SKIN | `skin_memory` | P2 | Defer to MPW v2 if area tight |
| EP | `ep_gate` | P2 | Defer if analog macro needed |
| SPHINX | `sphinx_hash` | P2 | Software fallback acceptable v1 |

## Physical design checklist

| Step | Tool (SKY130) | Exit criterion |
|------|---------------|----------------|
| RTL freeze tag | git tag `edge-v1-rtl-freeze` | Signed checklist |
| Synthesis | Yosys + OpenROAD | Netlist ≤ 200k gates |
| Floorplan | OpenLane | Core utilization 60–70% |
| Power grid | PDN template | IR drop sim pass |
| DRC | Magic / KLayout | **Zero violations** |
| LVS | Netgen | **Zero mismatches** |
| Antenna | OpenLane | Fixed |
| STA | OpenSTA | 100 MHz target met |
| IO ring | Caravel or custom | Seal IOC pins routed |
| GDS merge | KLayout | Shuttle-ready GDSII |

## DRC signoff report template

```
Project:     AQAI EDGE v1
Node:        SKY130
Date:        ___________
PD lead:     ___________
DRC tool:    Magic ___ / KLayout ___
DRC result:  PASS / FAIL
LVS result:  PASS / FAIL
Waived items: none / list
Signoff:     ___________
```

Store signed PDF in `gates/G3/drc-signoff-edge-v1.pdf` (on completion).

## Minimum pin list (IOC demo)

| Pin | Function |
|-----|----------|
| clk | System clock |
| rst_n | Reset |
| seal_commit | Commit pulse |
| seal_verify | Verify pulse |
| payload[127:0] | Seal payload bus |
| digest[63:0] | Out |
| seal_ok | Out |

## Gate linkage

G3 item `g3-edge-subset-drc` closes when P0 blocks are DRC/LVS clean and signoff report filed.

## Status

**ready_to_execute** — checklist defined; execution post-G2 FPGA parity.
