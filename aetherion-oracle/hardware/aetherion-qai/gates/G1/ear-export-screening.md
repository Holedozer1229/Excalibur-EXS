# G1 — EAR export-control screening (dual-use compute)

**Not legal advice.** Engage export counsel before defense sales or controlled technology transfer.

## Scope

AQAI / Caduceus seal-native compute may touch **EAR Category 3** (electronics) and **Category 5** (telecom/security) depending on performance, cryptography, and end-use. This screen covers Soft Silicon + planned EDGE silicon.

## Product lines screened

| Asset | Description | Preliminary classification |
|-------|-------------|---------------------------|
| Soft Silicon API | `/chipset` encode/decode, seal digest in software | Likely EAR99 if no strong crypto |
| `seal_ioc` RTL | Pipeline commit/verify digest lane | Review if implements AES/SHA hardware |
| `sphinx_hash` RTL | Hash stub | Counsel if matches SHA-256 ASIC |
| SOVEREIGN SKU | Sovereign / air-gap positioning | **High scrutiny** — end-use + entity list |
| FPGA prototype (G2) | AMD/Xilinx dev board running AQAI RTL | Generally EAR99 dev kit; verify if encrypted bitstream export |

## Dual-use checklist

| # | Question | AQAI answer (draft) | Action |
|---|----------|---------------------|--------|
| 1 | Is technology designed for military end-use? | No — commercial audit AI / sealed agents | Document marketing + end-user statements |
| 2 | Does it exceed specified encryption (5A002/5D002)? | Soft Silicon uses standard SHA-256 in software | Counsel confirms ECCN |
| 3 | Performance thresholds (3A001.z)? | Not a general-purpose supercomputer | Monitor if scaled |
| 4 | Will you export physical chips or RTL to embargoed countries? | **No** — deny list policy | Written export policy |
| 5 | Foreign nationals access to RTL? | US persons until counsel clears | Visitor / cloud access policy |
| 6 | Defense customer or ITAR data? | Not without separate program | Do not claim ITAR without registration |

## Recommended ECCN hypothesis (counsel to confirm)

- **EAR99** for Soft Silicon SDK and documentation-only releases
- **3A991** or **EAR99** for first EDGE MPW if no advanced crypto accelerators
- Re-screen before SOVEREIGN defense pilots

## Screening workflow

1. **Self-assessment** — complete table above with founder + counsel
2. **Classification memo** — store in `legal/export/classification-memo.pdf`
3. **Export policy** — one-page employee/contractor policy
4. **Denied parties** — screen customers against BIS lists before shipment
5. **Re-screen triggers** — G2 FPGA demo to foreign entity; G4 silicon ship; new crypto IP

## Evidence

| Item | Status | Path |
|------|--------|------|
| Self-assessment complete | ready_to_execute | this file |
| Counsel memo | pending | `legal/export/classification-memo.pdf` |
| Export policy | ready_to_execute | `legal/export/export-policy.md` |

## Gate linkage

G1 item `g1-ear-screen` closes when self-assessment is complete and counsel engagement is scheduled or memo received.
