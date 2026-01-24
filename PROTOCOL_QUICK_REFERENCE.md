# Excalibur $EXS Protocol - Quick Reference Guide

## 🎯 Protocol Overview

**Name:** Excalibur $EXS Protocol  
**Lead Architect:** Travis D. Jones (holedozer@icloud.com)  
**License:** BSD 3-Clause  
**Status:** Production Ready

---

## 🔑 Core Parameters

| Parameter | Value |
|-----------|-------|
| **Axiom** | `sword legend pull magic kingdom artist stone destroy forget fire steel honey question` |
| **Miner** | Ω′ Δ18 (128-Round Unrolled Nonlinear Hash) |
| **Hardness** | 600,000 PBKDF2-HMAC-SHA512 iterations (HPP-1) |
| **Difficulty** | 4 leading zero bytes |
| **Total Supply** | 21,000,000 $EXS |
| **Forge Reward** | 50 $EXS per forge |
| **Treasury Fee** | 1% (0.5 $EXS per forge) |
| **Forge Fee** | 0.0001 BTC |
| **Rosetta API** | v1.4.10 |

---

## 🏰 Double-Portal Architecture

### Merlin's Portal (Admin)
- **URL:** `/admin/merlins-portal`
- **Purpose:** King Arthur's admin dashboard
- **Features:**
  - Treasury monitoring
  - Difficulty adjustment
  - Global anomaly map
  - Forge analytics

### Knights' Round Table (Public)
- **URL:** `/web/knights-round-table`
- **Purpose:** Public forge interface
- **Features:**
  - Axiom entry
  - "Draw the Sword" mining
  - 128-round visualization
  - Real-time feedback

---

## 💰 Tokenomics

### Distribution
- **60% PoF Miners:** 12,600,000 $EXS
- **15% Treasury:** 3,150,000 $EXS (12-month rolling release)
- **20% Liquidity:** 4,200,000 $EXS
- **5% Airdrop:** 1,050,000 $EXS

### Forge Economics
- Each forge generates 50 $EXS
- 49.5 $EXS to miner (99%)
- 0.5 $EXS to treasury (1%)
- 0.0001 BTC forge fee required

---

## 🛠️ Quick Start Commands

### Mine with Python
```bash
python3 pkg/miner/tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4
```

### Verify a Nonce
```bash
python3 pkg/miner/tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --verify 12345
```

### Run Foundry Demo
```bash
python3 pkg/foundry/exs_foundry.py
```

### Run Go Tests
```bash
go test ./pkg/...
```

### Generate Treasury Admin Credentials
```bash
python3 forge_treasury_key.py
```

**Treasury Key Security:**
- Uses **1.2 million rounds** PBKDF2-HMAC-SHA512 (2x forge key iterations)
- Combines: `name|email|secret` with the 13-word AXIOM as "Merlin Vector"
- Generates MERLIN-{id} portal ID and 64-byte access key
- Controls entire $EXS Treasury - protect this secret carefully

---

## 📁 Key Files

### Core Components
- `pkg/miner/tetra_pow_miner.py` - Ω′ Δ18 miner
- `pkg/foundry/exs_foundry.py` - HPP-1 protocol
- `pkg/economy/treasury.go` - Treasury backend
- `pkg/economy/tokenomics.json` - Economic model
- `forge_treasury_key.py` - Treasury admin credential generator

### Portals
- `admin/merlins-portal/index.html` - Admin dashboard
- `web/knights-round-table/index.html` - Public forge UI

### Configuration
- `pkg/rosetta/rosetta-exs.yaml` - Rosetta API config
- `.github/workflows/forge-exs.yml` - Forge validation action

### Documentation
- `README.md` - Project manifesto
- `LICENSE` - BSD 3-Clause license
- `INITIALIZATION_VERIFICATION.md` - Verification report

---

## 🔐 Security Features

1. **Quantum Hardening:** HPP-1 with 600,000 iterations (forge keys)
2. **Enhanced Treasury Security:** 1.2 million iterations for admin credentials
3. **Nonlinear State Shifts:** 128-round cryptographic maze
3. **Taproot Privacy:** P2TR conceals spending conditions
4. **CLTV Time-Locks:** Treasury security via Bitcoin scripts
5. **Axiomatic Unlinkability:** Deterministic yet unpredictable

---

## 🤖 GitHub Actions

### Forge Trigger Workflow
- **File:** `.github/workflows/forge-exs.yml`
- **Triggers:** Pull requests to main/camelot
- **Function:** Validates forge claims with Ω′ Δ18 miner
- **Auto-Comments:** Success/failure notifications on PRs

---

## 🧪 Test Coverage

All test suites passing:
- ✅ pkg/bitcoin (Taproot, Bech32m)
- ✅ pkg/crypto (HPP-1, Tetra-PoW)
- ✅ pkg/economy (Treasury, CLTV)
- ✅ pkg/guardian (Security)
- ✅ pkg/hardware (Acceleration)

---

## 🌐 Deployment

Multiple deployment options available:
- Digital Ocean (recommended)
- Docker Compose
- Vercel
- GitHub Pages
- Traditional VPS

See deployment documentation for details.

---

## 📞 Contact

**Lead Architect:** Travis D. Jones  
**Email:** holedozer@icloud.com  
**Repository:** https://github.com/Holedozer1229/Excalibur-EXS  
**Website:** https://www.excaliburcrypto.com

---

## 🎭 The Legend

> "Whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England."

*In ambiguity, we find certainty. In chaos, we forge order.*

**The sword is ready. Draw it wisely. ⚔️**
