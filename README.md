# Excalibur $EXS Protocol: The Manifesto

> ⚠️ **IMPORTANT NOTICE**: This is a demonstration/prototype implementation. It is **NOT production-ready** and should **NOT** be used with real funds or on mainnet. See [PRODUCTION_TODO.md](PRODUCTION_TODO.md) for items that must be addressed before production deployment.

## 🗡️ The Legend Awakens

**Excalibur $EXS** is an axiomatic ambiguity fork of Bitcoin, wielding the power of the **Ω′ Δ18 Tetra-PoW** miner. Through the sacred 13-word prophecy axiom, forge unique, un-linkable Taproot (P2TR) vaults. Quantum-hardened via **HPP-1** (600,000 rounds) and 128-round unrolled nonlinear state shifts.

---

## 📜 The Axiom: The 13-Word Prophecy

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

This is the foundation upon which all forges are built—a cryptographic incantation that binds the past, present, and future of the Excalibur network.

---

## 🏰 Ω′ Δ18 Tetra-PoW Technical Overview

The **Ω′ Δ18** (Omega Prime Delta 18) mining algorithm represents a revolutionary approach to Proof-of-Work:

- **128 Unrolled Nonlinear Rounds**: Each computation pass through 128 discrete, non-repeating cryptographic transformations
- **HPP-1 Hardening**: 600,000 iterations of PBKDF2-HMAC-SHA512 provide quantum-resistant key derivation
- **Axiomatic Input**: Every forge begins with the 13-word prophecy, ensuring deterministic yet unpredictable outputs
- **Taproot Native**: All rewards materialize as P2TR (Pay-to-Taproot) addresses for maximum privacy and efficiency

The algorithm operates in four phases:
1. **Prophecy Binding**: The 13-word axiom is cryptographically committed
2. **Nonlinear Expansion**: 128 rounds of state transformation with dynamic difficulty adjustment
3. **HPP-1 Forging**: 600,000 PBKDF2 rounds temper the raw material into unbreakable steel
4. **Rune Inscription**: Valid forges are inscribed onto the blockchain as immutable artifacts

---

## 🚪 The Double-Portal Architecture

Excalibur operates through two distinct portals, separating sovereignty from participation:

### 👑 Merlin's Portal (Private Admin Dashboard)
**Path**: `/admin/merlins-portal`

The sanctum of King Arthur—where the architect monitors and adjusts the kingdom:
- **Treasury Monitoring**: Real-time tracking of accumulated Satoshi fees (1% of all rewards)
- **Difficulty Adjustment**: Manual forge weight calibration to maintain network equilibrium
- **Global Anomaly Map**: Visual representation of all active forges across the realm

### ⚔️ The Knights' Round Table (Public Forge UI)
**Path**: `/web/knights-round-table`

Where the Knights gather to prove their worth:
- **Axiomatic Entry**: Input field for the Prophecy (13-word axiom verification)
- **"Draw the Sword" Button**: Initiates the Ω′ Δ18 mining process
- **Real-Time Visualization**: Watch the 128 nonlinear rounds unfold in mesmerizing detail
- **Forge Results**: Immediate feedback on successful forges with P2TR address generation

---

## 💰 Tokenomics & Economic Model

- **Total Supply**: 21,000,000 $EXS (mirroring Bitcoin's scarcity)
- **Forge Reward**: 50 $EXS per successful forge
- **Distribution Breakdown**:
  - 60% Proof-of-Forge (PoF) Miners
  - 15% Treasury (Protocol Development & Revenue Operations)
  - 20% Liquidity Pools
  - 5% Community Airdrop

**Fee Structure**:
- **Treasury Fee**: 1% of all forge rewards (automatic)
- **Forge Fee**: 0.0001 BTC per forge attempt (prevents spam, funds infrastructure)

### 💎 Multi-Stream Revenue System

The Excalibur $EXS Protocol generates sustainable revenue through **9 diverse streams**, funding the treasury vault while providing **fair rewards to active users**:

#### Revenue Streams
1. **Cross-Chain Mining** (8-15% APR)
   - Mining across BTC, ETH, LTC, XMR, DOGE
   - Treasury: 40% | Users: 55% | Operations: 5%

2. **Smart Contract Futures** (12-25% APR)
   - Automated trading on GMX, dYdX, Synthetix, Hyperliquid
   - Treasury: 30% | Users: 60% | Risk Reserve: 10%

3. **Lightning Fee Routing** (10-20% APR)
   - P2TR Lightning channel routing fees (100 BTC capacity)
   - Treasury: 35% | Users: 60% | Channel Management: 5%

4. **Taproot Processing** (5-12% APR)
   - Transaction batching, Schnorr aggregation, MAST optimization
   - Treasury: 25% | Users: 70% | Infrastructure: 5%

5. **DeFi Yield Farming** (6-18% APR)
   - Aave, Compound, Curve, Convex strategies
   - Treasury: 30% | Users: 65% | Gas Reserve: 5%

6. **MEV Extraction** (15-40% APR)
   - Flashbots and MEV-boost strategies
   - Treasury: 40% | Users: 50% | Validator Tips: 10%

7. **Multi-Chain Staking** (4-12% APR)
   - ETH, ADA, DOT, ATOM, SOL staking pools
   - Treasury: 20% | Users: 75% | Operations: 5%

8. **NFT Royalty Pools** (8-25% APR)
   - Curated blue-chip NFT collections
   - Treasury: 30% | Users: 60% | Creators: 10%

9. **$EXS Lending Protocol** (5-15% APR)
   - Over-collateralized lending with BTC/ETH/USDC
   - Treasury: 25% | Lenders: 70% | Insurance: 5%

#### User Reward Multipliers
Active users receive revenue share bonuses based on:
- **Long-term Holding**: Up to 1.5x (2+ years)
- **Active Forging**: Up to 1.3x (100+ forges)
- **Liquidity Provision**: 1.2x multiplier

**See**: `pkg/economy/tokenomics_v2.json` and `pkg/revenue/revenue_manager.py` for details

---

## 🏛️ Institutional Grade Infrastructure

### Rosetta API Integration
Excalibur implements the **Rosetta Construction API v1.4.10** standard, ensuring:
- Coinbase listing compatibility
- Cross-exchange interoperability
- Standardized account and transaction models

### Components

#### Core Cryptographic Engine
- `pkg/miner/tetra_pow_miner.py`: The heart of Ω′ Δ18
- `pkg/foundry/exs_foundry.py`: HPP-1 protocol and fee management

#### Economic Layer
- `pkg/economy/tokenomics.json`: Supply, distribution, and reward schedules
- `pkg/economy/treasury.go`: Automated fee collection and distribution

#### Institutional Integration
- `pkg/rosetta/rosetta-exs.yaml`: Rosetta API configuration

#### Automation
- `.github/workflows/forge-exs.yml`: Continuous forge validation via GitHub Actions

---

## 🔐 Security Architecture

- **Quantum Hardening**: HPP-1 with 600,000 PBKDF2 iterations
- **Nonlinear State Shifts**: 128 rounds prevent pattern-based attacks
- **Taproot Privacy**: P2TR addresses obscure spending conditions
- **Axiomatic Binding**: Deterministic yet unpredictable outputs from prophecy input

---

## 🎯 Mission Statement

**"To forge a new financial realm where sovereignty is earned, not granted; where cryptography is legend, and legend becomes reality."**

The Excalibur $EXS Protocol embodies the spirit of King Arthur's legend—only those worthy enough can draw the sword from the stone. Through computational proof-of-work and axiomatic commitment, participants earn their place at the Round Table.

The Double-Portal architecture ensures that power remains distributed: Merlin's Portal grants oversight without control, while the Knights' Round Table ensures that anyone, anywhere, can participate in forging the future.

---

## 🚀 Getting Started

### For Knights (Public Users)
1. Navigate to `/web/knights-round-table`
2. Enter the 13-word Prophecy Axiom
3. Click "Draw the Sword"
4. Watch the Ω′ Δ18 miner work its magic
5. Receive your $EXS rewards to a Taproot address

### For Architects (Administrators)
1. Access `/admin/merlins-portal` with proper credentials
2. Monitor treasury accumulation
3. Adjust forge difficulty as needed
4. Track global forge activity

---

## 🌐 Deployment Options

Choose your deployment method:

### 1. 🐳 Docker (Full Production Stack)
```bash
docker-compose up -d
```
**Best for**: Complete backend with APIs, revenue operations, and database  
**Documentation**: [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md)

### 2. ⚡ Vercel (Instant Deployment)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)

**Best for**: Quick deployment with global CDN  
**Documentation**: [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md)

### 3. 📄 GitHub Pages (100% Free)
Already configured! Just enable in Settings → Pages  
**Best for**: Static website hosting  
**Documentation**: [`GITHUB_PAGES_DEPLOY.md`](GITHUB_PAGES_DEPLOY.md)

### 4. 🖥️ Traditional VPS
```bash
sudo ./scripts/deploy.sh
sudo ./scripts/setup-ssl.sh
```
**Best for**: Full control over infrastructure  
**Documentation**: [`DEPLOY.md`](DEPLOY.md)

**Compare all options**: [`DEPLOYMENT_COMPARISON.md`](DEPLOYMENT_COMPARISON.md)

---

## 📱 Mobile Applications

Cross-platform iOS & Android apps built with React Native.

### Features
- 🗝️ Axiom Gate challenge (XIII words)
- 🏰 Access to both portals via WebView
- ⚔️ Native forge interface with progress tracking
- 🌙 Dark Arthurian theme with animations

### Build & Run
```bash
cd mobile-app
npm install
npm run ios    # or npm run android
```

**Documentation**: `mobile-app/README.md`

---

## 🌐 Live Website

Visit **www.excaliburcrypto.com** for:
- ✨ Cryptic Arthurian landing page
- 📜 XIII Words prophecy display
- 🔮 Ω′ Δ18 Alchemy explanation
- 🚪 Dual portal navigation
- 📊 Interactive tokenomics visualization

---

## 📞 Lead Architect

**Travis D Jones**  
Email: holedozer@gmail.com  
Role: Protocol Architect & Keeper of the Axiom

---

## 📄 License

BSD 3-Clause License - See [LICENSE](LICENSE) for details

---

## ⚡ The Legend Lives

*"whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England"*

And so too, whosoever forges with the Ω′ Δ18 algorithm and commits to the 13-word Prophecy shall be rewarded with $EXS—the digital steel of a new era.
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
