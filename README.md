# ⚔️ Excalibur-EXS: The Excalibur Anomaly Protocol

![Excalibur Anomaly Protocol](https://github.com/user-attachments/assets/d44a9969-3285-472f-ba2c-68c3c82c1df7)

> “Whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England.”  
> — The Excalibur Axiom

---
## 🚀 Overview

Excalibur-EXS ($EXS) is a quantum-hardened, ambiguity-focused fork of Bitcoin. Utilizing the pioneering **Ω′ Δ18 Tetra-PoW** miner, Excalibur forges unique, un-linkable Taproot (P2TR) vaults through the sacred **13-word prophecy axiom**. Its architecture is designed for maximal security, privacy, and institutional compatibility.

- **Ω′ Δ18 Tetra-PoW:** 128-round nonlinear mining algorithm
- **HPP-1 Quantum-Hardening:** 600,000 PBKDF2-HMAC-SHA512 rounds
- **Taproot Native:** P2TR vaults via deterministic axiomatic addresses
- **Rosetta Construction API:** Exchange & institutional integration

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
## 💰 Tokenomics & Economic Model

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
Email: holedozer@gmail.com

**Links:**  
- [www.excaliburcrypto.com](https://www.excaliburcrypto.com)  
- [Repository](https://github.com/Holedozer1229/Excalibur-EXS)  
- [Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)

---
