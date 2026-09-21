# Layout & production — dominate by architecture, then by silicon

## Die stack (paradigm)

1. **CORE-Ω** — twin Caduceus pipes + octonion lane  
2. **EPX** — exceptional-point fabric (PT phase control)  
3. **SKIN** — non-Hermitian DRAM tiles (edge-hot hierarchy)  
4. **NPU-33** — Proof-of-Memory systolic  
5. **IOC** — seal / verify / nonce (axioms 1 · 7)  
6. **I/O ring** — PCIe / CXL / SPI / UART / flash  

## Process targets

| Node | Use |
|------|-----|
| Leading-edge (5/3 nm class) | CORE-Ω + EPX + NPU when funded |
| Specialty analog/mixed | Skin hop arrays |
| FPGA / emulator (now) | Full RTL + `/chipset` software proofs |

## Go-to-market (design narrative)

1. **Seal-native inference API** — every response ships a receipt (software today, IOC tomorrow).  
2. **Developer ISA** — Caduceus asm + microcode open for partners.  
3. **FPGA reference board** — prove skin + EP + seal path before tape-out.  
4. **Foundry engagement** — after ISA freeze + formal seal proofs.  

## Complete physical design pack

Full die documentation — **everything on chip**, not CORE stub only:

| Artifact | Path |
|----------|------|
| Master PD doc | [docs/09-physical-design-complete.md](09-physical-design-complete.md) |
| Floorplan ASCII + diagram | [pd/floorplan-aqai-chipset.md](../pd/floorplan-aqai-chipset.md) |
| Block inventory (YAML) | [pd/block-inventory.yaml](../pd/block-inventory.yaml) |
| Pad / bump ring spec | [pd/pad-ring.md](../pd/pad-ring.md) |
| Lab loader | `src/lib/qai/physicalDesign.ts` → `/chipset` **Run physical design** |

Covers: eight axioms · full ISA · Newform verification fusion (doc 08) · G2 FPGA mapping · G3 EDGE subset context · SOVEREIGN full die. Area/power are **stubs** until PDK bind.

## Checklist

- [x] Eight-axiom manifesto + Soft→Hard continuity  
- [x] Paradigm ISA v0.3  
- [x] RTL stubs: core, alu, skin, ep, seal_ioc, sphinx_hash, unity_gate, chipset_top  
- [x] `/chipset` live demos + funding lab  
- [x] Capital verdict + pitch deck + grants/investor pack  
- [x] **Complete PD pack** — floorplan, inventory, pad ring, lab integration  
- [ ] Formal verification of seal path  
- [ ] FPGA prototype  
- [ ] MPW tape-out  

**Honesty:** Market dominance is the *architectural* thesis. Fabricated AQAI silicon is not claimed shipping in this repo. PD numbers are design estimates until shuttle signoff.
