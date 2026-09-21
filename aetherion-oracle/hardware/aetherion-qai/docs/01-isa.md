# AQAI Instruction Set Architecture (v0.3 — domination)

Word size: **64-bit**. Endian: little. Registers: `r0`–`r31` (r0 = 0), `sp`, `lr`, `pc`, `cpsr`, plus **pipe duals** `s0–s7` (Sphinx), `a0–a7` (Anubis).

Soft Silicon (`/chipset`) and hard Silicon share this opcode map (axiom 8).

## Caduceus class

| Mnemonic | Fun | Semantics | Axiom |
|----------|-----|-----------|-------|
| `CAD.BRAID rd, rs1, rs2` | `01` | Braid Sphinx/Anubis → rd | 2, 6 |
| `CAD.REFLECT rd, rs1` | `02` | Quantum reflect (phase + Chern) | 2 |
| `CAD.SEAL rd, rs1, rs2` | `03` | Seal digest of [rs1, rs2) | 1, 7 |
| `CAD.PHONON rd, imm8` | `04` | Phoneme / voice energy | — |
| `CAD.TAROT rd, rs1` | `05` | Seeded Major draw | 1 |
| `CAD.HEX rd, rs1` | `06` | Hexagram cast | — |
| `CAD.OCT rd, rs1, rs2` | `07` | Octonion lane multiply (stub) | 6 |
| `CAD.SKIN rd, rs1` | `08` | Skin-localize vector → edge profile | 3 |
| `CAD.EP rd, rs1, rs2` | `09` | Drive toward / sense EP (γ, κ) | 4 |
| `CAD.POM rd, rs1` | `0A` | Proof-of-Memory challenge step | 5 |
| `CAD.VERIFY rd, rs1, rs2` | `0B` | Verify seal commitment | 1, 7 |
| `CAD.SPHINX rd, rs1, rs2` | `0C` | SphinxHash fold (seed, block) | 1, 8 |
| `CAD.LATTICE rd, rs1, rs2` | `0D` | NH lattice hop step | 3 |
| `CAD.COMMIT rd, rs1` | `0E` | Homomorphic commit of sealed digest | 7 |
| `CAD.UNITY rd, rs1` | `10` | Unity constant `f(x)=cos(0)`; anchor when `rs1==1` | 1, 8 |
| `CAD.SCHNORR rd, rs1, rs2` | `11` | BIP340 Schnorr verify (msg @ rs1, sig\|\|pk @ rs2) → rd | 1, 7 |
| `NOP` | `00` | No-op | — |
| `HALT` | `0F` | Enter C1 | — |

## Integer / control

`ADD` `SUB` `MUL` `AND` `OR` `XOR` `LSL` `LSR` `ASR` `LDR` `STR` `B` `BL` `RET` `SVC`

## CSR banks

### Twin-serpent @ `0x2000_0000`

| Offset | Name |
|--------|------|
| `0x00` | `TS_SPHINX` |
| `0x08` | `TS_ANUBIS` |
| `0x10` | `TS_PHASE` |
| `0x18` | `TS_TENSION` |
| `0x20`/`0x28` | `TS_COMMIT` lo/hi |

### Exceptional point @ `0x2000_0100`

| Offset | Name |
|--------|------|
| `0x00` | `EP_GAMMA` |
| `0x08` | `EP_KAPPA` |
| `0x10` | `EP_SHEET` (braid winding) |

### Skin memory @ `0x3000_0000`

| Offset | Name |
|--------|------|
| `0x00` | `SK_TR` / `SK_TL` hop |
| `0x10` | `SK_GAMMA` asymmetry |
| `0x18` | `SK_EDGE` localization metric |

Assembler macros: `../asm/caduceus.inc`
