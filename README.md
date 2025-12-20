# ⚔️Excalibur-EXS⚔️

$EXS: The Excalibur Anomaly Protocol. An axiomatic ambiguity fork of Bitcoin utilizing the Ω′ Δ18 Tetra-PoW miner. Forge unique, un-linkable Taproot (P2TR) vaults through the 13-word prophecy axiom. Quantum-hardened via HPP-1 (600,000 rounds) and 128-round unrolled nonlinear state shifts.

## 👑 Overview 

Excalibur-EXS is a next-generation blockchain protocol that combines Bitcoin's proven architecture with cutting-edge cryptographic innovations:

- **Ω′ Δ18 Tetra-PoW**: 128-round unrolled nonlinear state shift mining algorithm
- **HPP-1**: Quantum-hardened key derivation with 600,000 PBKDF2 rounds
- **13-Word Prophecy Axiom**: Deterministic yet un-linkable Taproot vault generation
- **Taproot Integration**: Native P2TR addresses with Bech32m encoding
- **Rosetta API**: Full exchange integration support

## 🏰 Project Structure

```
Excalibur-EXS/
├── cmd/
│   ├── miner/        # Ω′ Δ18 CLI mining tool
│   └── rosetta/      # Go-based Rosetta API server
├── pkg/
│   ├── crypto/       # HPP-1 and Tetra-PoW implementations
│   └── bitcoin/      # Taproot and Bech32m logic
├── web/
│   └── forge-ui/     # React/TypeScript Arthurian Forge
└── docs/
    ├── manifesto.md  # Axiomatic Ambiguity whitepaper
    └── rosetta.md    # Rosetta integration specs
```

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- npm or yarn

### Build & Run the Miner

```bash
cd cmd/miner
go build
./miner mine --data "Excalibur-EXS" --difficulty 0x00FFFFFFFFFFFFFF
```

### Start the Rosetta API Server

```bash
cd cmd/rosetta
go build
./rosetta serve --port 8080 --network mainnet
```

### Run the Web Interface

```bash
cd web/forge-ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔐 Cryptographic Features

### HPP-1: High-Performance PBKDF2

Quantum-hardened key derivation:
- 600,000 rounds of SHA-256
- Configurable salt with protocol identifiers
- Post-quantum computational hardening

### Tetra-PoW: Ω′ Δ18 Algorithm

Novel proof-of-work mechanism:
- 4-state (64-bit each) nonlinear transformation
- 128 rounds of unrolled state shifts
- Mathematical constant entropy injection
- ASIC-resistant design

### 13-Word Prophecy Axiom

Unique vault generation system:
- Deterministic address creation
- Cryptographically un-linkable vaults
- Privacy-preserving by design
- Taproot-native implementation

## 🏗️ Components

### 1. Miner (`/cmd/miner`)

CLI tool for mining operations:
- `mine` - Mine blocks using Tetra-PoW
- `hpp1` - Run HPP-1 key derivation
- `benchmark` - Performance testing

### 2. Rosetta Server (`/cmd/rosetta`)

Exchange integration API:
- `/network/*` - Network endpoints
- `/account/balance` - Balance queries
- `/block` - Block data
- `/health` - Health checks
- `validate-address` - Taproot address validation
- `generate-vault` - Create new vaults

### 3. Crypto Package (`/pkg/crypto`)

Core cryptographic implementations:
- HPP-1 key derivation
- Tetra-PoW state machine
- Mining functions

### 4. Bitcoin Package (`/pkg/bitcoin`)

Taproot and address handling:
- Taproot vault generation
- Bech32m encoding/decoding
- Address validation
- Schnorr signature support

### 5. Forge UI (`/web/forge-ui`)

React/TypeScript web interface:
- Vault Generator
- Miner Dashboard
- Network Status Monitor

## 📚 Documentation

- [Manifesto](docs/manifesto.md) - Comprehensive whitepaper
- [Rosetta Integration](docs/rosetta.md) - API specifications

## 🏷️ Topics/Tags

`bitcoin`, `taproot`, `cryptography`, `proof-of-work`, `rosetta-api`, `blockchain-ambiguity`, `excalibur-exs`, `quantum-resistant`, `bech32m`, `schnorr-signatures`

## 🧪 Testing

### Run Go Tests

```bash
go test ./pkg/...
```

### Test Miner

```bash
cd cmd/miner
go run main.go benchmark --rounds 1000
```

### Test Rosetta API

```bash
# Start server
cd cmd/rosetta
go run main.go serve

# Test health endpoint
curl http://localhost:8080/health

# Test network list
curl -X POST http://localhost:8080/network/list -d '{}'
```

## 🔧 Development

### Install Dependencies

```bash
# Go dependencies
go mod download

# Frontend dependencies
cd web/forge-ui
npm install
```

### Build All Components

```bash
# Build miner
cd cmd/miner && go build

# Build Rosetta server
cd cmd/rosetta && go build

# Build web UI
cd web/forge-ui && npm run build
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Links

- Repository: https://github.com/Holedozer1229/Excalibur-EXS
- Issues: https://github.com/Holedozer1229/Excalibur-EXS/issues

---

*"In ambiguity, we find certainty. In chaos, we forge order."*  
— The Excalibur Axiom
# Excalibur $EXS Protocol

> **"sword legend pull magic kingdom artist stone destroy forget fire steel honey question"**  
> *The 13-Word Axiom*

## 🗡️ The Excalibur Manifesto

$EXS is the **Excalibur Anomaly Protocol**: an axiomatic ambiguity fork of Bitcoin that harnesses the power of the **Ω′ Δ18 Tetra-PoW** miner to forge unique, un-linkable Taproot (P2TR) vaults through the sacred 13-word prophecy axiom.

**Quantum-hardened** via HPP-1 (600,000 PBKDF2-HMAC-SHA512 rounds) and secured through 128-round unrolled nonlinear state shifts, Excalibur $EXS represents the next evolution in cryptographic sovereignty.

---

## ⚔️ The Ω′ Δ18 Tetra-PoW Technical Overview

### Architecture
The Ω′ Δ18 (Omega-Prime Delta-18) algorithm is a **128-round unrolled nonlinear hash function** designed to resist quantum attacks and ASIC mining centralization. Each round applies:

- **Nonlinear State Mixing**: Combines input with axiom-derived entropy
- **Tetra-Proof-of-Work**: Four-dimensional difficulty validation
- **HPP-1 Hardening**: 600,000 iterations of PBKDF2-HMAC-SHA512
- **Δ18 Offset**: 18-byte entropic displacement per round

### Mining Parameters
- **Rounds**: 128 (unrolled)
- **Hardness**: 600,000 iterations
- **Difficulty**: 4 (adjustable by King Arthur)
- **Block Reward**: 50 $EXS per successful forge
- **Treasury Fee**: 1% on all rewards
- **Forge Fee**: 0.0001 BTC per attempt

---

## 🏰 The Double-Portal Architecture

Excalibur $EXS operates through two interconnected portals, each serving a distinct purpose in the protocol's governance and operation:

### 1️⃣ Merlin's Portal (`/admin/merlins-portal`)
**The Private Admin Dashboard** - Reserved for King Arthur (Protocol Administrator)

**Features:**
- 📊 **Treasury Monitoring**: Real-time tracking of Satoshi fees and $EXS distribution
- ⚖️ **Difficulty Adjustment**: Dynamic forge weight calibration
- 🗺️ **Global Anomaly Map**: Visual tracking of all active forges worldwide

**Purpose**: Sovereign control over protocol parameters and economic stability.

### 2️⃣ Knights' Round Table (`/web/knights-round-table`)
**The Public Forge UI** - Open to all Knights (Public Miners)

**Features:**
- ✍️ **Axiomatic Entry**: Input your prophecy (13-word axiom or custom)
- 🗡️ **"Draw the Sword" Button**: Initiates the Ω′ Δ18 mining process
- 📈 **Real-Time Visualization**: Watch all 128 rounds execute in real-time
- 🏆 **Forge History**: Track your successful $EXS discoveries

**Purpose**: Democratized access to $EXS forging and transparent protocol participation.

---

## 💰 Tokenomics

### Supply & Distribution
- **Total Supply**: 21,000,000 $EXS (fixed cap)
- **Block Reward**: 50 $EXS per forge
- **Halving**: Every 210,000 blocks (mirroring Bitcoin)

### Distribution Breakdown
- **60%** - Proof-of-Forge (PoF) rewards to miners
- **15%** - Treasury (protocol development & security)
- **20%** - Liquidity pools (DEX/CEX integration)
- **5%** - Airdrop (community building & early adopters)

### Fee Structure
- **Treasury Fee**: 1% on all mining rewards
- **Forge Fee**: 0.0001 BTC per mining attempt (prevents spam)

---

## 🔗 Institutional Integration

### Rosetta API Compatibility
Excalibur $EXS implements the **Rosetta Construction API v1.4.10**, ensuring:
- ✅ Coinbase listing readiness
- ✅ Standardized transaction construction
- ✅ Cross-chain interoperability
- ✅ Enterprise-grade integration paths

---

## 🚀 Getting Started

### For Knights (Public Miners)
1. Navigate to the **Knights' Round Table** portal
2. Enter your 13-word axiom or use the default prophecy
3. Click **"Draw the Sword"** to begin forging
4. Watch the 128 rounds execute in real-time
5. Claim your $EXS rewards upon successful forge

### For King Arthur (Protocol Admin)
1. Access **Merlin's Portal** with administrative credentials
2. Monitor treasury and network health
3. Adjust difficulty parameters as needed
4. View global forge analytics

---

## 📜 Protocol Metadata

| Parameter | Value |
|-----------|-------|
| **Axiom** | `sword legend pull magic kingdom artist stone destroy forget fire steel honey question` |
| **Miner** | Ω′ Δ18 (128-Round Unrolled) |
| **Hardness** | 600,000 iterations (PBKDF2-HMAC-SHA512) |
| **Difficulty** | 4 (adjustable) |
| **Lead Architect** | Travis D Jones |
| **License** | BSD 3-Clause |

---

## 🛠️ Development

### Repository Structure
```
Excalibur-EXS/
├── admin/merlins-portal/      # Private admin dashboard
├── web/knights-round-table/   # Public forge interface
├── pkg/
│   ├── miner/                 # Ω′ Δ18 implementation
│   ├── foundry/               # HPP-1 protocol & fees
│   ├── rosetta/               # Rosetta API integration
│   └── economy/               # Tokenomics & treasury
└── .github/workflows/         # Automated forge validation
```

---

## 📄 License

BSD 3-Clause License - Copyright (c) 2025, Travis D Jones (holedozer@gmail.com)

See [LICENSE](./LICENSE) for full details.

---

## 🌟 The Legend Continues

*Pull the sword from the stone. Forge your destiny. Join the Knights of Excalibur.*
