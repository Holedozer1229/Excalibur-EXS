# Excalibur $EXS Protocol — The Manifesto

> *"Only those who prove their worth through ancient axioms may draw the sword from the stone."*

## The 13-Word Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

This sacred sequence forms the cryptographic foundation of the Excalibur $EXS Protocol — a prophetic bridge between myth and mathematics.

---

## What is Excalibur $EXS?

**Excalibur $EXS** is an axiomatic ambiguity fork of Bitcoin, utilizing the revolutionary **Ω′ Δ18 Tetra-PoW** consensus mechanism. Through the 13-word prophecy axiom, participants forge unique, un-linkable Taproot (P2TR) vaults, quantum-hardened via **HPP-1** (600,000 PBKDF2-HMAC-SHA512 rounds) and secured by 128-round unrolled nonlinear state shifts.

The protocol establishes a **Double-Portal Architecture**:
- **Merlin's Portal** (`/admin/merlins-portal`): Private administrative dashboard for King Arthur (treasury monitoring, difficulty adjustment, global anomaly tracking)
- **Knights' Round Table** (`/web/knights-round-table`): Public forge interface for The Knights (axiomatic entry, sword-drawing mechanism, real-time visualization)

---

## Technical Overview: Ω′ Δ18 Tetra-PoW

The **Ω′ Δ18** miner implements a 128-round unrolled nonlinear hash algorithm, creating an unprecedented level of computational hardness while maintaining deterministic verifiability.

### Core Specifications

- **Mining Algorithm**: Ω′ Δ18 (128-Round Unrolled)
- **Hardness**: 600,000 iterations (HPP-1 protocol)
- **Default Difficulty**: 4 leading zero bytes
- **Supply Cap**: 21,000,000 $EXS
- **Reward per Forge**: 50 $EXS
- **Treasury Fee**: 1% on all rewards
- **Forge Fee**: 0.0001 BTC

### Distribution Breakdown

- **60%** — Proof-of-Forge (PoF) miners
- **15%** — Protocol treasury
- **20%** — Liquidity pools
- **5%** — Community airdrops

---

## Architecture

### Core Cryptographic Engine

**`pkg/miner/tetra_pow_miner.py`**  
Implements the 128-round Ω′ Δ18 nonlinear hash algorithm with configurable difficulty targeting.

**`pkg/foundry/exs_foundry.py`**  
Implements the HPP-1 protocol (600,000 PBKDF2-HMAC-SHA512 rounds), treasury fee collection, and forge fee validation.

### Institutional Layer

**`pkg/rosetta/rosetta-exs.yaml`**  
Rosetta Construction API v1.4.10 implementation for institutional exchange compatibility (Coinbase, Kraken, etc.).

**`pkg/economy/tokenomics.json`**  
Defines the 21M $EXS supply cap, reward schedule, and distribution mechanics.

**`pkg/economy/treasury.go`**  
Backend logic for fee collection and $EXS Rune distribution to treasury and liquidity providers.

### Automation

**`.github/workflows/forge-exs.yml`**  
GitHub Action serving as the "Forge Trigger" — validates incoming Claim Pull Requests by running the Ω′ Δ18 miner before merge into Camelot (main branch).

---

## The Double-Portal Mission

**Excalibur $EXS** reimagines cryptocurrency governance through a dual-interface paradigm:

1. **Transparency**: All participants witness the forge in real-time
2. **Sovereignty**: Administrative controls remain with the protocol architect
3. **Proof-of-Forge**: Computational work validated through axiomatic prophecy
4. **Quantum Resistance**: HPP-1 hardening protects against future cryptographic threats

---

## Quick Start

### Prerequisites

- Python 3.10+
- Go 1.21+
- Node.js 18+
- Bitcoin Core (for P2TR vault creation)

### Forge Your First $EXS

```bash
# Clone the repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Run the Ω′ Δ18 miner
python pkg/miner/tetra_pow_miner.py --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

# Launch the Knights' Round Table UI
cd web/knights-round-table
npm install && npm run dev
```

---

## License

**BSD 3-Clause License**  
Copyright (c) 2025, Travis D. Jones (holedozer@gmail.com)

See [LICENSE](LICENSE) for full terms.

---

## Contact

**Lead Architect**: Travis D. Jones  
**Email**: holedozer@gmail.com  
**Protocol**: Excalibur $EXS  
**Axiom**: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`

---

*"The sword awaits those who dare to forge their destiny."*
