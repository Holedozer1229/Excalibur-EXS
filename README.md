# ![image](https://github.com/user-attachments/assets/d44a9969-3285-472f-ba2c-68c3c82c1df7)


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

#### Security Layer
- `pkg/guardian/guardian.go`: Lancelot Guardian Protocol for authentication and authorization
- `cmd/guardian/`: CLI tool for security management

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
- **Lancelot Guardian Protocol**: Multi-layered authentication and authorization system
  - Argon2id password hashing (OWASP compliant)
  - Role-based access control (King Arthur, Knight, Squire)
  - Token bucket rate limiting
  - IP whitelisting and session management
  - See [`docs/guardian.md`](docs/guardian.md) for details

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
