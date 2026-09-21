# Grants pipeline — AQAI / Caduceus Verified Cognition Silicon

Track applications here. Status values: `todo` · `drafting` · `submitted` · `awarded` · `rejected`.

| ID | Program | Fit | Amount band | Status | Next action |
|----|---------|-----|-------------|--------|-------------|
| G-NSF-SBIR | NSF SBIR Phase I (AI / semiconductors / trusted compute) | Soft Silicon + seal-native inference | $275k–$305k typ. | todo | Register SAM.gov + draft Project Pitch |
| G-NSF-STTR | NSF STTR (if university partner) | EP / NH memory theory + hardware | Similar Phase I | todo | Identify academic co-PI |
| G-DOE | DOE microelectronics / ASCR related FOAs | Skin memory · EP fabric research | Varies | todo | Watch FOA calendar |
| G-CHIPS-RD | CHIPS Act R&D / NSTC-related (when eligible) | Domestic microelectronics | Large | todo | Counsel on eligibility entity |
| G-DOD-SBIR | DoD SBIR — trusted/verifiable AI topics | SOVEREIGN seal path | Phase I small | todo | Match open topics each cycle |
| G-STATE | State semiconductor / deep-tech matching | FPGA lab, jobs narrative | $50–500k | todo | Map HQ state incentives |
| G-EU | EU Chips Act / Horizon (if EU vehicle) | Sovereign AI hardware | Varies | todo | Only with EU entity |
| G-FOUNDATION | Schmidt, Open Phil, etc. AI safety/verify | Seal receipts as safety primitive | Discretionary | todo | Short LOI from pitch one-pager |

## Application kit (reuse)

1. **Technical abstract** — eight axioms + Soft Silicon continuity (from `PITCH_DECK.md` slides 2–3).  
2. **Work plan** — G2 FPGA → G3 PDK → G4 MPW (from `docs/07-manufacturing-startup.md`).  
3. **Budget** — align to capital stack in `docs/06-capital-manufacturing.md`.  
4. **Honesty statement** — design/simulation today; silicon after MPW.  
5. **Commercialization** — Soft Silicon seats + EDGE design wins.

## Draft Project Pitch (NSF SBIR — starter)

**Title:** Seal-Native Soft Silicon Control Plane for Verifiable AI Accelerators  

**Problem:** AI accelerators cannot emit third-party-verifiable proofs of inference.  

**Solution:** Caduceus Soft Silicon ISA and seal IOC path that remains binary-compatible with a fabless EDGE chipset (AQAI).  

**Technical objectives (Phase I):** (1) Formalize seal receipt schema; (2) FPGA demonstration of seal + twin-pipe braid; (3) MPW readiness package.  

**Commercial:** Soft Silicon API + sealed oracle beachhead → EDGE modules.

## Operator note

Federal portals require human identity (SAM.gov, Login.gov). This repo prepares materials; **submission is operator-executed**.
