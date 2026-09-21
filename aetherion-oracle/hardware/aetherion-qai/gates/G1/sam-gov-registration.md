# G1 — SAM.gov / UEI registration (NSF SBIR)

Required before NSF SBIR Project Pitch and most US federal grants.

## Entity information

| Field | Value |
|-------|-------|
| Legal name | Aetherion QAI, Inc. |
| DBA | AQAI |
| EIN | (after incorporation) |
| Physical address | 1515 Trainer-Wuest Rd, Blanco, TX 78606 |
| POC | Travis D Jones, sphinxqasi@gmail.com |
| NAICS (primary) | 334413 — Semiconductor and Related Device Manufacturing |
| NAICS (secondary) | 541715 — R&D in Physical/Engineering Sciences |
| Business type | Small business, for-profit, US-owned |

## Step-by-step

### 1. Obtain UEI (Unique Entity ID)

1. Go to [SAM.gov](https://sam.gov) → Create account (Login.gov).
2. **Get Unique Entity ID** — no fee; ties to legal business name + EIN.
3. Record UEI: `________________` (12-character alphanumeric).

### 2. Complete entity registration

1. **Core Data** — legal name, address, EIN, incorporation state (DE), date of incorporation.
2. **Assertions** — small business, not debarred, no federal debt default.
3. **Representations & Certifications** — annual reps (far 52.212-3 style in SAM).
4. **Points of Contact** — Electronic Business POC + Government Business POC (can be same: Travis D Jones).

### 3. NSF SBIR-specific

1. Register in [SBIR Company Registry](https://www.sbir.gov) (SBC control requirements).
2. Prepare **Project Pitch** per `hardware/aetherion-qai/funding/GRANTS.md`:
   - Problem: verifiable sealed compute for audit AI
   - Solution: AQAI Soft→Hard (G2 FPGA → G3 MPW)
   - Team: founder + planned RTL hire
3. SAM registration must show **Active** before award (not always before pitch — verify current NSF rules).

### 4. Maintenance

| Task | Frequency |
|------|-----------|
| SAM annual renewal | Every 365 days |
| Update address / officers | Within 30 days of change |
| SBIR registry | Update on ownership change > 50% |

## Evidence checklist

| Artifact | Path |
|----------|------|
| UEI confirmation | `legal/grants/uei-confirmation.pdf` |
| SAM active screenshot | `legal/grants/sam-active.png` |
| SBIR registry ID | `legal/grants/sbir-registry.pdf` |

## Status

**ready_to_execute** — blocked on G1 Delaware C-corp + EIN. Start UEI immediately after EIN issued.
