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
- **Fees:** 0.0001 BTC Forge Fee / 0.0001 BTC Forge Fee
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
  - Tetra-PoW miner: `pkg/miner/tetra_pow_miner.py`
  - HPP-1 protocol: `pkg/foundry/exs_foundry.py`
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

---
## 🏗️ Project Structure

```
Excalibur-EXS/
├── cmd/
│   ├── miner/          # Ω′ Δ18 CLI miner
│   └── rosetta/        # Go Rosetta API server
├── pkg/
│   ├── crypto/         # Core cryptographic logic
│   └── bitcoin/        # Taproot, Bech32m support
├── web/
│   └── forge-ui/       # Forge React/TypeScript UI
├── admin/
│   └── merlins-portal/ # Admin dashboard
└── docs/               # Documentation
```

---
## 🧭 Getting Started

**Knights:**
1. Visit `/web/knights-round-table`
2. Enter the 13-word Axiom
3. Click Draw the Sword

**Administrators:**
1. Visit `/admin/merlins-portal` (credentials required)
2. Monitor treasury, adjust difficulty, view forge analytics

---
## ⚡ Deployment Options

- **Docker:**  
  ```bash
  docker-compose up -d
  ```  
  See [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md)

- **Vercel:**  
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)  
  See [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md)

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
- **Miner Benchmark:**  
  ```bash
  cd cmd/miner
  go run main.go benchmark --rounds 1000
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

- **Whitepaper:** [`docs/manifesto.md`](docs/manifesto.md)
- **Rosetta API Specs:** [`docs/rosetta.md`](docs/rosetta.md)

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
