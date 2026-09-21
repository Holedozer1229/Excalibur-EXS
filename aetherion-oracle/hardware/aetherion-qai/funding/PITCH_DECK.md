# AETHERION QAI — Investor Pitch Deck (narrative)

**One-liner:** Aetherion = **Quantum AI Superpower** — Verified Cognition + quantum-class physics (EP, NH, octonion) + Caduceus control plane. Soft Silicon ships today; fabless hardware follows.

**HTML deck:** `public/chipset/pitch-deck.html` (served at `/chipset/pitch-deck.html`) · sync copy: `hardware/aetherion-qai/funding/pitch-deck.html`

**Manifesto:** `/docs/AETHERION-QUANTUM-AI-SUPERPOWER.md` · **Quantum Moat:** `/docs/QUANTUM-MOAT.md`

**Ask (illustrative pre-seed):** $1.5M SAFE · 18–24 month runway to FPGA + first MPW  
**Use of funds:** 40% RTL/FPGA · 25% MPW/PDK · 20% grants/BD · 15% ops/legal

**Contact:** Travis D Jones · Founder & Architect · [sphinxqasi@gmail.com](mailto:sphinxqasi@gmail.com) · 1515 Trainer-Wuest Rd, Blanco, TX 78606

---

## Slide 1 — Title
**AETHERION QAI** · Verified Cognition Silicon · Caduceus-powered  
Stats: 8 axioms · +48 category index margin* · 15 CAD.* opcodes · G0 Soft Silicon live  
CTA: `/chipset` lab · *excludes dense matmul; design/simulation only until MPW exit

## Slide 2 — Problem
**AI won speed. It lost truth.**  
GPUs/TPUs (FLOPs, no receipts) · confidential VMs (host isolation) · quantum annealers (no ISA/seal) · neuromorphic (no crypto verify).  
Buyers need **Verified Cognition**, not another matmul chart.

## Slide 3 — Solution
**Eight axioms. One braid.**  
Seal-native · twin-pipe · skin memory · EP logic · Proof-of-Memory · octonion ALU · homomorphic seal · Soft→Hard continuity.

## Slide 4 — Quantum AI Superpower
**Aetherion = Quantum AI Superpower** — different from OpenAI/NVIDIA/Google (scale vs verified cognition).

Three pillars:
1. **Quantum-class compute** — EP fabric · NH skin · octonion ALU (design / Soft Silicon — not room-temp qubits)
2. **Sealed cognition** — sha-256 receipts on every inference class; live on Caduceus today
3. **Soft→Hard sovereignty** — G0→G6 gates; adopt API now, die matches binary

World map: AI market · quantum-class market · sovereign compute (honest G0–G6 stages).

## Slide 5 — Architecture
Twin-staff Caduceus pipeline (Sphinx ∥ Anubis) · clock domains · die blocks (CORE-Ω, NPU-33, SKIN, EPX, IOC, SPHINX, BIOS, CHIPSET).

## Slide 5b — Complete physical design
**Everything on die** — full SOVEREIGN floorplan (~142 mm² stub), not CORE-only stub.

- 39-block inventory: CORE-Ω · NPU-33 · SKIN · EPX · IOC · unity_gate · seal_ioc · sphinx_hash · caduceus_alu · BIOS · PCIe/CXL ring · Newform fuse
- Power domains: PD_CORE · PD_SKIN · PD_IOC · PD_EPX · PD_IO · PD_ALWAYS_ON
- SKUs: EDGE (~48 mm²) · CLOUD (~98 mm²) · SOVEREIGN (full die)
- Honesty: area/power stubs until PDK · G3 MPW targets EDGE subset · pack at `hardware/aetherion-qai/pd/`

## Slide 6 — Seal receipt
**caduceus.seal.v1** schema + verify flow · live on Caduceus product · maps to CAD.SEAL → CAD.COMMIT → CAD.VERIFY on die.

## Slide 7 — Market
AI inference · agent economies · quantum-class · sovereign — AQAI wins on sealed, auditable cognition.  
SKUs: AQAI-EDGE · AQAI-CLOUD · AQAI-SOVEREIGN.

## Slide 8 — TAM / SAM / SOM
Honest, design-stage sizing by budget line (no fabricated share, no $XXB without third-party source).  
36-month beachhead: Caduceus-native → FPGA eval → 3 binding pilot LOIs.

## Slide 9 — Unit economics
Soft Silicon (&lt;$200k) → FPGA ($250–500k) → MPW ($0.5–5M) → seed scale ($2–8M).  
Revenue model (design-stage): API seats · FPGA eval · EDGE modules · CLOUD/SOVEREIGN contracts. No fabricated ARR.

## Slide 10 — Superpower index
Category scorecard vs GPU/TPU/neuro — AQAI 66 vs best rival 18 on non-FLOP axes (+48 margin). Win truth budgets.

## Slide 11 — Why now
EU AI Act + audit · agent economies · CHIPS/grant windows · Soft Silicon live on Aetherion product.

## Slide 12 — Traction (honest)
Caduceus control plane live · ISA/BIOS/RTL package · 15 opcodes · founder Stripe path · **not claiming fabricated die**.

G0 live · G1–G6 todo (Entity → FPGA → PDK → MPW → LOIs → Scale).

## Slide 13 — Competitive moat (summary)
NVIDIA · Google TPU · neuromorphic · quantum annealer · confidential VMs — kill scenarios and moat stack.

## Slide 14 — The Quantum Moat (7 layers)
1. Receipt format lock-in (`caduceus.seal.v1`) — **live**
2. ISA binary continuity Soft→Hard — **live** (G0)
3. Physics hierarchy (NH skin + EP) — **live**
4. Caduceus brand + live product — **live**
5. Patent package (`legal/patent/`) — **roadmap** (not "patent pending" until USPTO filing)
6. Founder network / sovereign wedge — **roadmap**
7. Time — early Soft Silicon adopters never rewrite — **live**

## Slide 15 — The Unstoppable Force
Compounding flywheel: Adopt → Prove → Freeze → Silicon → Sovereign → Compound.  
Honesty rails: no fabricated die · no fake customers · no 137 ETH · quantum-class = EP/NH/octonion.

## Slide 16 — Roadmap G0–G6
Fail-closed gates with exit criteria · spend tranches T0–T3.

## Slide 17 — Risk & honesty
PDK risk · FLOPs trap · explicit will/won't claim lists.

## Slide 18 — Team & hires
**Travis D Jones** · Founder & Architect — Caduceus / AQAI ISA · G0 live  
Hires with raise: RTL/FPGA (G2) · PD/DFT (G3) · BD/grants (G1–G5).

## Slide 19 — The ask
**$1.5M SAFE** · 18–24 month runway · parallel NSF SBIR + angel rolling close  
Milestones: G2 FPGA demo · G3 PDK · G4 MPW · G5 pilot LOIs  
Contact: Travis D Jones · sphinxqasi@gmail.com · `/chipset` CTA  
Footer: BSD-3 · patent package ready (`legal/patent/`) — not patent pending until filed

---

*Design / Soft Silicon claims only until MPW exit. Fabless — never own a fab. See `docs/06-capital-manufacturing.md`.*
