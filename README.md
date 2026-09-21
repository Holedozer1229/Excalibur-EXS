# ⚔️ Excalibur-EXS: The Excalibur Anomaly Protocol

![Excalibur Anomaly Protocol](https://github.com/user-attachments/assets/d44a9969-3285-472f-ba2c-68c3c82c1df7)

> “Whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England.”  
> — The Excalibur Axiom

---
## 🚀 Overview

Excalibur-EXS ($EXS) is a luxury, status-driven cryptocurrency where users "forge" EXS tokens through a quantum-hardened **Proof-of-Forge** ritual. By speaking the sacred 13-word prophecy, completing cryptographic derivation, and sending Bitcoin to a deterministic Taproot address, users mint 50 EXS tokens and join an exclusive digital kingdom.

### Key Features

- **🔮 Proof-of-Forge Protocol**: 5-step cryptographic ritual combining prophecy, Tetra-POW, and Taproot
- **⚡ Quantum-Hardened**: 600,000 PBKDF2 iterations (HPP-1) for post-quantum security
- **👑 Founder Swords NFTs**: 13 exclusive NFTs granting perpetual revenue sharing (1-2% of forge fees)
- **🏛️ Cross-Chain Architecture**: Bitcoin security meets Ethereum programmability
- **💎 Fixed Supply**: 21,000,000 EXS tokens (no inflation)
- **🌐 Transparent**: All allocations verifiable on-chain

### Launch System Components

- **Smart Contracts**: Production-ready Solidity (ERC-20, ERC-721, Forge Verification, DAO)
- **Cryptographic Core**: Complete Proof-of-Forge implementation (Go + Rust)
- **Blockchain Node**: Rust-based foundation with P2P networking
- **Launch Documentation**: Comprehensive whitepaper, transparency framework, 7-day launch plan

---
## 📜 The 13-Word Prophecy Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```
Every forge begins with these words, binding the protocol’s entropy and ensuring cryptographic certainty through ambiguity.

---
## 🏰 Double-Portal Architecture

- **Merlin’s Portal (Admin Dashboard):** `/admin/merlins-portal`
  - Treasury monitoring & difficulty calibration
  - Global anomaly map (active forges monitoring)
- **Knights’ Round Table (Public Forge UI):** `/web/knights-round-table`
  - Axiom entry & mining initiation (“Draw the Sword”)
  - Real-time visualization (128 nonlinear rounds)
  - P2TR vault & reward generation

---

## 🎯 Launch System (NEW)

### Production-Ready Components

The Excalibur EXS ecosystem is built on a comprehensive launch system ready for production deployment:

#### 1. Smart Contracts (`/contracts/`)
- ✅ **ExcaliburToken.sol**: ERC-20 with vesting schedules (4-year linear for founders/dev)
- ✅ **FounderSwordsNFT.sol**: 13 exclusive NFTs with perpetual 1-2% revenue sharing
- ✅ **ForgeVerifier.sol**: BTC oracle integration for proof verification
- ✅ **TreasuryDAO.sol**: Multi-sig treasury with configurable thresholds

#### 2. Proof-of-Forge Implementation
- ✅ **Go Implementation** (`pkg/crypto/proof_of_forge.go`): Production-ready
- ✅ **Rust Implementation** (`blockchain/src/crypto/mod.rs`): Node foundation
- ✅ **5-Step Pipeline**: Prophecy → Tetra-POW → PBKDF2 → Zetahash → Taproot

#### 3. Blockchain Node (`/blockchain/`)
- ✅ Rust-based foundation with CLI
- ✅ Complete crypto module
- ✅ Module structure for P2P, consensus, storage, RPC
- 🚧 Full node implementation in progress

#### 4. Launch Documentation (`/docs/`)
- ✅ **WHITEPAPER.md**: 15KB technical specification
- ✅ **TRANSPARENCY.md**: On-chain verification framework
- ✅ **LAUNCH_PLAN.md**: Hour-by-hour 7-day execution plan
- ✅ **IMPLEMENTATION_COMPLETE.md**: Full system summary

### Quick Start (Launch System)

```bash
# 1. Deploy smart contracts (requires Hardhat)
cd contracts/
npm install
npm run deploy -- --network sepolia  # testnet first!

# 2. Test Proof-of-Forge derivation
cd ../blockchain/
cargo build --release
cargo run --release -- forge --network testnet

# 3. Review launch documentation
cat docs/WHITEPAPER.md
cat docs/LAUNCH_PLAN.md
```

### Tokenomics (Launch System)

| Allocation | Amount | Percentage | Status |
|------------|--------|------------|--------|
| **Proof-of-Forge Rewards** | 10,500,000 EXS | 50% | Mintable per forge |
| **Development Fund** | 3,150,000 EXS | 15% | 4-year vesting |
| **Treasury** | 2,100,000 EXS | 10% | DAO controlled |
| **Community Fund** | 2,100,000 EXS | 10% | Grants |
| **Founder Allocation** | 2,100,000 EXS | 10% | 4-year vesting |
| **Liquidity** | 1,050,000 EXS | 5% | 2-year lock |

**Forge Dynamics**:
- Forge Reward: 50 EXS per successful forge
- Dynamic Fee: 1 BTC → 21 BTC (increases every 10k forges)
- Maximum Forges: 210,000 total

**Founder Swords NFTs**:
- 13 unique swords with perpetual revenue sharing
- Revenue Share: 1-2% of ALL forge fees
- Governance: Veto power for Swords 0-3
- Benefits: Physical sword, annual summit, priority access

---
## 💰 Original Tokenomics & Economic Model (Legacy)

- **Total Supply:** 21,000,000 $EXS (fixed)
- **Forge Reward:** 50 $EXS per successful forge
- **Distribution:** 60% PoF Miners / 15% Treasury / 20% Liquidity / 5% Airdrop
- **Fees:** 0.0001 BTC Forge Fee
- **Treasury Allocation:** 7.5 $EXS per block (15% direct allocation)
- **12-Month Rolling Release:** Treasury split into 3 mini-outputs (2.5 $EXS each)
  - Output 1: Immediately available (0 blocks)
  - Output 2: Locked for ~1 month (4,320 blocks)
  - Output 3: Locked for ~2 months (8,640 blocks)
- **Time-Lock Security:** Bitcoin CLTV (OP_CHECKLOCKTIMEVERIFY) scripts
- **Halving:** Every 210,000 blocks

**Multi-Stream Revenue:**  
Excalibur’s treasury sustains itself from nine sources:
  1. Cross-chain mining (BTC, ETH, LTC, XMR, DOGE)
  2. Smart contract futures
  3. Lightning fee routing
  4. Taproot transaction batching
  5. DeFi yield farming (Aave, Compound, Curve, Convex)
  6. MEV extraction
  7. Multi-chain staking (ETH, ADA, DOT, ATOM, SOL)
  8. NFT royalty pools
  9. $EXS lending protocol

**User Reward Multipliers:**  
Bonuses for long-term holding, active forging, and liquidity provision.

See:  
- [`pkg/economy/tokenomics_v2.json`](pkg/economy/tokenomics_v2.json)
- [`pkg/economy/ENHANCED_TOKENOMICS.md`](pkg/economy/ENHANCED_TOKENOMICS.md)
- [`pkg/revenue/revenue_manager.py`](pkg/revenue/revenue_manager.py)

---
## 🔗 Institutional-Grade Infrastructure

- **Rosetta API:** v1.4.10 for Coinbase, cross-exchange, and standardized integration (`pkg/rosetta/rosetta-exs.yaml`)
- **Core Engine:**  
  - Tetra-PoW miners: `miners/tetra-pow-go/` (production) and `miners/tetra-pow-python/` (reference)
  - HPP-1 protocol: `pkg/foundry/exs_foundry.py`
  - Universal kernel: `miners/lib/tetrapow_dice_universal.py`
- **Economic Layer:**  
  - Tokenomics: `pkg/economy/tokenomics.json`
  - Treasury: `pkg/economy/treasury.go`
- **Automation:**  
  - GitHub Actions: `.github/workflows/forge-exs.yml`

---
## 🔒 Security & Privacy

- **Quantum Hardened:** 600,000 PBKDF2 iterations (HPP-1)
- **Nonlinear State Shifts:** 128 round cryptographic maze
- **Taproot Privacy:** P2TR conceals spending conditions
- **Axiomatic Unlinkability:** All outputs bound, yet unpredictable
- **Zero-Torsion Validation:** Entropy uniformity checks prevent manipulation
- **Rune Signatures:** Multi-layer cryptographic proof system

---
## ✨ New Modular Features (v2.0)

### Prophecy System
- **Rune Validation:** Cryptographic prophecy validation with ancient rune encoding
- **Prophecy Engine:** Lifecycle management for cryptographic predictions
- **Zero-Torsion Proofs:** Validates entropy uniformity for proof integrity

### Mathematical Visualizations
- **Möbius Trajectories:** Non-Euclidean geometric proof paths
- **Berry Phase Calculations:** Quantum-inspired geometric phase analysis
- **Curvature & Torsion:** Mathematical verification of cryptographic properties

### Quest System
- **Mining Quests:** Earn rewards by finding valid hashes
- **Validation Quests:** Verify proofs for EXS rewards
- **Puzzle Quests:** Solve cryptographic challenges
- **Grail Quest:** Legendary 6-leading-zero challenge (1000 $EXS reward!)

### Enhanced Oracle
- **Unified Interface:** All subsystems accessible through enhanced oracle
- **Blockchain Watcher:** Async real-time monitoring with error resilience
- **Intelligent Guidance:** Context-aware protocol assistance

See [QUICKSTART_ENHANCED.md](QUICKSTART_ENHANCED.md) for usage examples!

---
## 🏗️ Project Structure

```
Excalibur-EXS/
├── pkg/
│   ├── prophecy/         # 🆕 Prophecy validation & rune system
│   ├── mathematics/      # 🆕 Möbius trajectories & Berry phases
│   ├── engine/           # 🆕 Zero-torsion validation
│   ├── quest/            # 🆕 Quest system & Grail Quest
│   ├── oracle/           # 🆕 Enhanced oracle integration
│   ├── blockchain/       # 🆕 Block structure & premining
│   ├── crypto/           # Core cryptographic logic
│   ├── bitcoin/          # Taproot, Bech32m support
│   ├── economy/          # Treasury and tokenomics
│   ├── foundry/          # Forge processing
│   └── miner/            # Mining kernels
├── miners/
│   ├── tetra-pow-go/     # Go production miner
│   ├── tetra-pow-python/ # Python reference miner
│   ├── dice-miner/       # Probabilistic dice miner
│   └── universal-miner/  # Multi-strategy miner
├── cmd/
│   ├── forge-api/        # Forge HTTP API
│   └── rosetta/          # Go Rosetta API server
├── web/
│   ├── knights-round-table/ # Public forge UI
│   └── forge-ui/         # Forge React/TypeScript UI
├── admin/
│   └── merlins-portal/   # Admin dashboard
├── scripts/
│   └── premine.py        # 🆕 Blockchain premining script
├── docs/                 # Documentation
├── Dockerfile            # 🆕 Complete system container
└── ARCHITECTURE.md       # 🆕 System architecture guide
```

### 🧬 Fused Subtrees

Two sibling projects live in this repo as clean subtrees (see `FUSION.md`
for the full map and honest boundaries):

- **`genesis-fork/`** — Genesis Fork (GSF): standalone pure-Python UTXO
  chain node (EXCAL) + its Rosetta (Mesh) Data/Construction API adapter.
  A separate asset and chain from $EXS.
- **`aetherion-oracle/`** — Aetherion Oracle: Vite + React + TypeScript
  oracle app (sealed tarot/dreams/oracle, Caduceus control plane).
  Build with `npm run build` inside that directory.

---

## ⛏️ Mining Structure

All mining implementations are now consolidated in the `miners/` directory for better organization and discoverability.

### Available Miners

- **Tetra-PoW Go** (`miners/tetra-pow-go/`) - Production miner with hardware acceleration
- **Tetra-PoW Python** (`miners/tetra-pow-python/`) - Reference implementation, easy to modify
- **Dice Miner** (`miners/dice-miner/`) - Probabilistic mining with provably fair cryptography
- **Universal Miner** (`miners/universal-miner/`) - Multi-strategy miner supporting merge mining

### Quick Start Mining

```bash
# Go miner (best performance)
cd miners/tetra-pow-go
go build -o tetra-pow-miner
./tetra-pow-miner mine --data "Excalibur-EXS"

# Python miner (easy to modify)
cd miners/tetra-pow-python
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

# Dice miner (probabilistic)
cd miners/dice-miner
python3 dice_roll_miner.py mine --axiom "..."

# Universal miner (merge mining)
cd miners/universal-miner
python3 unified_miner.py merge --chains BTC,LTC --axiom "..."
```

For detailed miner documentation, see [`miners/README.md`](miners/README.md)

### Contributing New Consensus Engines

We welcome contributions of new mining algorithms and consensus mechanisms! To add a new miner:

1. Create a new directory under `miners/` with a descriptive name
2. Implement your consensus algorithm
3. Add a comprehensive README.md with:
   - Algorithm description and security properties
   - Installation and usage instructions
   - Performance characteristics and benchmarks
   - Integration examples
4. Ensure compatibility with:
   - The canonical 13-word axiom system
   - Configurable difficulty targets
   - P2TR vault address generation
   - Treasury allocation (15% of rewards)
5. Submit a pull request with tests and documentation

See [`miners/README.md`](miners/README.md) for detailed contribution guidelines.


---
## 🧭 Getting Started

📖 **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes!  
📖 **[Enhanced Quickstart](QUICKSTART_ENHANCED.md)** - Complete guide with new modular features!  
📐 **[Architecture Guide](ARCHITECTURE.md)** - Deep dive into system design  
⛏️ **[Premining Guide](docs/PREMINING.md)** - Initialize Genesis block and premined blocks

### Console Node (Recommended for Power Users)

```bash
# Install binary
wget https://github.com/Holedozer1229/Excalibur-EXS/releases/latest/download/excalibur-exs-linux-amd64.tar.gz
tar -xzf excalibur-exs-linux-amd64.tar.gz
sudo mv exs-node /usr/local/bin/

# Create wallet
exs-node wallet create my-wallet --passphrase "secure-password"

# Start mining
exs-node mine start --address bc1p... --threads 4

# Start forge (Knights' Round Table features)
exs-node forge start --address bc1p... --visualize

# Consult oracle
exs-node oracle ask "How do I mine effectively?"

# View revenue streams
exs-node revenue show

# Dashboard
exs-node dashboard
```

📖 **[Console Node Documentation](cmd/exs-node/README.md)**  
📖 **[Deployment Guide](docs/CONSOLE_NODE_DEPLOYMENT.md)**  
📖 **[AWS Bitcoin Integration](docs/AWS_BITCOIN_INTEGRATION.md)**

### Web Interfaces

**Knights (Public):**
1. Visit `/web/knights-round-table`
2. Enter the 13-word Axiom
3. Click Draw the Sword

**Administrators:**
1. Visit `/admin/merlins-portal` (credentials required)
2. Monitor treasury, adjust difficulty, view forge analytics

---
## ⚡ Deployment Options

- **Digital Ocean (Recommended):**  
  One-command deployment to www.excaliburcrypto.com:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/quick-deploy-digitalocean.sh | sudo bash
  ```  
  See [`DIGITAL_OCEAN_DEPLOY.md`](DIGITAL_OCEAN_DEPLOY.md) for complete guide

- **Docker:**  
  ```bash
  docker-compose up -d
  ```  
  See [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md)

- **Vercel:**  
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)  
  See [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md)  
  **Hostinger DNS Setup:** [`HOSTINGER_VERCEL_SETUP.md`](HOSTINGER_VERCEL_SETUP.md)

- **GitHub Pages:**  
  See [`GITHUB_PAGES_DEPLOY.md`](GITHUB_PAGES_DEPLOY.md)

- **Traditional VPS:**  
  ```bash
  sudo ./scripts/deploy.sh
  sudo ./scripts/setup-ssl.sh
  ```  
  See [`DEPLOY.md`](DEPLOY.md)

Compare: [`DEPLOYMENT_COMPARISON.md`](DEPLOYMENT_COMPARISON.md)

---
## 📱 Mobile Applications

- Cross-platform iOS & Android (React Native)
- Axiom challenge, portal WebView, forge tracking, dark Arthurian theme

**Build & Run:**
```bash
cd mobile-app
npm install
npm run ios    # or npm run android
```
See: [`mobile-app/README.md`](mobile-app/README.md)

---
## 🧪 Development & Testing

- **Go Tests:** `go test ./pkg/...`
- **Integration Tests:** `./test.sh`
- **Miner Benchmark:**  
  ```bash
  # Go miner (fastest)
  cd miners/tetra-pow-go
  go build -o tetra-pow-miner
  ./tetra-pow-miner benchmark --rounds 1000
  
  # Python miner
  cd miners/tetra-pow-python
  python3 tetra_pow_miner.py --axiom "test" --difficulty 2 --max-attempts 1000
  ```
- **Rosetta API Health:**  
  ```bash
  curl http://localhost:8080/health
  ```
- **Web UI:**  
  ```bash
  cd web/forge-ui
  npm install
  npm run dev
  ```

---
## 📚 Documentation

### Core Protocol Documentation
- **Whitepaper:** [`docs/manifesto.md`](docs/manifesto.md)
- **Genesis & Protocol Initialization:** [`docs/GENESIS.md`](docs/GENESIS.md)
- **Tetra-PoW Blockchain Interaction:** [`docs/TETRAPOW_BLOCKCHAIN_INTERACTION.md`](docs/TETRAPOW_BLOCKCHAIN_INTERACTION.md)
- **Mining Fees & Miner Rewards:** [`docs/MINING_FEES.md`](docs/MINING_FEES.md)

### Integration & API Documentation
- **Rosetta API Specs:** [`docs/rosetta.md`](docs/rosetta.md)
- **Architecture Guide:** [`ARCHITECTURE.md`](ARCHITECTURE.md)

---
## 🤝 Contributing

Pull requests and contributions are welcome!  
Please read our guidelines prior to submitting.

---
## 📄 License

BSD 3-Clause License  
See [`LICENSE`](LICENSE) for full terms.

---
## 🌟 The Legend Lives On

*In ambiguity, we find certainty. In chaos, we forge order.*  
Forge your destiny at the Knights' Round Table—and join the legend.

---

**Lead Architect:**  
Travis D Jones  
Email: holedozer@icloud.com

**Links:**  
- [www.excaliburcrypto.com](https://www.excaliburcrypto.com)  
- [Repository](https://github.com/Holedozer1229/Excalibur-EXS)  
- [Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)

---
