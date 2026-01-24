# Excalibur EXS Full Ecosystem Guide

## 🗡️ Overview

Excalibur EXS is a quantum-resistant, privacy-first Bitcoin fork featuring:
- **Dual Mining**: Tetra-PoW (Go) + Dice-Roll (Python)
- **Lancelot Guardian**: 24/7 blockchain monitoring
- **Treasury**: Staggered CLTV mini-output releases (12-month rolling)
- **Arthurian Axiom**: 13-word deterministic entropy seed
- **Rosetta API**: Full institutional integration
- **Multi-Platform**: Web dashboard + Mobile app

## 🏗️ Architecture

```
┌─────────────────────────────┐
│  Arthurian 13-Word Axiom   │
│  (Hashed Entropy Source)   │
└─────────────┬──────────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼─────┐    ┌─────▼────┐
│Tetra-PoW │    │Dice-Roll │
│  Miner   │    │  Miner   │
│ (Go:8082)│    │ (Py:8083)│
└────┬─────┘    └─────┬────┘
     │                │
     └────────┬───────┘
              │
         ┌────▼─────────┐
         │   Treasury   │
         │  CLTV Locks  │
         │   (:8080)    │
         └────┬─────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼────┐      ┌────▼────┐
│Lancelot │      │ Rosetta │
│Guardian │      │   API   │
│ (:8084) │      │ (:8081) │
└────┬────┘      └────┬────┘
     │                │
     └────────┬───────┘
              │
         ┌────▼─────┐
         │Forge UI  │
         │ (:3000)  │
         └──────────┘
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Deploy entire ecosystem
./scripts/deploy-exs.sh

# Or manually
docker-compose -f docker-compose.exs.yml up -d --build
```

### Option 2: Manual Setup

#### 1. Start Tetra-PoW Go Miner
```bash
cd cmd/tetra_pow
go run . --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" --port 8082
```

#### 2. Start Dice-Roll Python Miner
```bash
cd cmd/diceminer
pip install -r requirements.txt
python dice_roll_miner.py mine --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

#### 3. Start Lancelot Guardian
```bash
cd cmd/lancelot_guardian
pip install requests pyyaml
python guardian.py
```

#### 4. Start Treasury API
```bash
cd cmd/treasury
go run .
```

#### 5. Start Rosetta API
```bash
cd cmd/rosetta
go run .
```

#### 6. Start Forge UI
```bash
cd web/forge-ui
npm install
npm run dev
```

## 🔑 Arthurian 13-Word Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

**Security Model:**
- ✅ Displayed visually in UI (ForgeInitiation, mobile app)
- ✅ Hashed with SHA-256 before any cryptographic use
- ❌ NEVER stored on-chain
- ❌ NEVER transmitted raw over network
- ✅ Used as deterministic entropy for:
  - Miner nonce generation
  - P2TR vault derivation
  - Treasury calculations

## 📦 Components

### Tetra-PoW Go Miner (`cmd/tetra_pow/`)
- **Algorithm**: 128-round nonlinear hash
- **Quantum Hardening**: HPP-1 (600,000 PBKDF2 iterations)
- **API**: HTTP endpoints for mining, stats, config
- **Port**: 8082

Endpoints:
- `GET /health` - Health check
- `POST /mine` - Start mining round
- `GET /stats` - Mining statistics
- `GET /config` - Configuration

### Dice-Roll Python Miner (`cmd/diceminer/`)
- **Algorithm**: Probabilistic dice-roll (d100)
- **Multi-Core**: Parallel processing support
- **CLI**: mine, benchmark, stats commands
- **Port**: 8083

Usage:
```bash
python dice_roll_miner.py mine --difficulty 4
python dice_roll_miner.py benchmark --rounds 1000
python dice_roll_miner.py stats
```

### Lancelot Guardian (`cmd/lancelot_guardian/`)
- **Monitoring**: All miners + treasury + network
- **Alerts**: Slack, Discord, Email
- **Health Checks**: Every 60 seconds
- **CLTV Tracking**: Upcoming unlock notifications
- **Port**: 8084

Configuration: `config.yaml`

### Treasury API (`cmd/treasury/`)
- **Allocation**: 15% per block (7.5 EXS)
- **Mini-Outputs**: 3 × 2.5 EXS per block
- **CLTV Locks**: 0, 4,320, 8,640 blocks
- **Rolling Release**: 12-month staggered vesting
- **Port**: 8080

Endpoints:
- `GET /stats` - Treasury statistics
- `GET /balance` - Balance breakdown
- `GET /mini-outputs` - All mini-outputs
- `POST /forge` - Process new forge

### Rosetta API (`cmd/rosetta/`)
- **Standard**: Rosetta v1.4.10
- **Integration**: Coinbase, exchanges
- **Endpoints**: Account, Block, Transaction, Construction
- **Port**: 8081

### Forge UI (`web/forge-ui/`)
- **Framework**: Next.js 14 + TypeScript
- **Components**:
  - **ForgeInitiation**: Visual axiom + miner control
  - **TreasuryVisualization**: CLTV timeline + balances
  - **MiningStats**: Real-time hashrate
  - **NetworkStatus**: Guardian alerts
- **Port**: 3000

## 🔒 CLTV Time-Lock Schedule

Each block's 7.5 EXS treasury allocation splits into:

| Output | Amount | Lock Period | Unlock Blocks | Purpose |
|--------|--------|-------------|---------------|---------|
| 1 | 2.5 EXS | 0 blocks | Immediate | Operational |
| 2 | 2.5 EXS | 4,320 blocks | ~30 days | Development |
| 3 | 2.5 EXS | 8,640 blocks | ~60 days | Reserves |

**Example Timeline:**

```
Block 1000 → Creates 3 outputs:
├─ Output A: 2.5 EXS @ block 1000 🔓
├─ Output B: 2.5 EXS @ block 5320 🔒
└─ Output C: 2.5 EXS @ block 9640 🔒

Block 1001 → Creates 3 more outputs:
├─ Output D: 2.5 EXS @ block 1001 🔓
├─ Output E: 2.5 EXS @ block 5321 🔒
└─ Output F: 2.5 EXS @ block 9641 🔒

= Rolling maturity ensures continuous availability
```

## 📊 Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Treasury | 8080 | HTTP | CLTV mini-outputs + stats |
| Rosetta | 8081 | HTTP | Blockchain API |
| Tetra-PoW | 8082 | HTTP | Go miner |
| Dice-Roll | 8083 | HTTP | Python miner |
| Guardian | 8084 | HTTP | Monitoring + alerts |
| Forge UI | 3000 | HTTP | Web dashboard |

## 🧪 Testing

```bash
# Test Tetra-PoW miner
curl http://localhost:8082/health
curl -X POST http://localhost:8082/mine -d '{"nonce": 0}'

# Test Dice-Roll miner
python cmd/diceminer/dice_roll_miner.py benchmark --rounds 100

# Test Treasury
curl http://localhost:8080/stats
curl http://localhost:8080/mini-outputs

# Test Guardian
curl http://localhost:8084/health
```

## 📱 Mobile App Integration

See: `mobile-app/` directory

The mobile app displays:
- ✅ Arthurian axiom visually
- ✅ Treasury unlocks
- ✅ Mining stats
- ✅ P2TR vault generation

## 🔐 Security

- **Quantum Hardening**: HPP-1 (600,000 PBKDF2)
- **Nonlinear Mining**: 128-round Tetra-PoW
- **CLTV Time-Locks**: Bitcoin-proven OP_CHECKLOCKTIMEVERIFY
- **Taproot Privacy**: P2TR vaults
- **Axiom Protection**: Hashed before any crypto operation

## 📝 Environment Variables

```bash
# Miner Configuration
AXIOM="sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
DIFFICULTY=4
TREASURY_URL=http://localhost:8080
ROSETTA_URL=http://localhost:8081

# UI Configuration
NEXT_PUBLIC_TETRA_POW_URL=http://localhost:8082
NEXT_PUBLIC_DICE_ROLL_URL=http://localhost:8083
NEXT_PUBLIC_TREASURY_URL=http://localhost:8080
NEXT_PUBLIC_ROSETTA_URL=http://localhost:8081
NEXT_PUBLIC_GUARDIAN_URL=http://localhost:8084
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

BSD 3-Clause License

Copyright (c) 2025 Travis D. Jones (holedozer@icloud.com)

---

**⚔️ "Whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England."**
