# Excalibur-EXS

$EXS: The Excalibur Anomaly Protocol. An axiomatic ambiguity fork of Bitcoin utilizing the Ω′ Δ18 Tetra-PoW miner. Forge unique, un-linkable Taproot (P2TR) vaults through the 13-word prophecy axiom. Quantum-hardened via HPP-1 (600,000 rounds) and 128-round unrolled nonlinear state shifts.

## 🔱 Overview

Excalibur-EXS is a next-generation blockchain protocol that combines Bitcoin's proven architecture with cutting-edge cryptographic innovations:

- **Ω′ Δ18 Tetra-PoW**: 128-round unrolled nonlinear state shift mining algorithm
- **HPP-1**: Quantum-hardened key derivation with 600,000 PBKDF2 rounds
- **13-Word Prophecy Axiom**: Deterministic yet un-linkable Taproot vault generation
- **Taproot Integration**: Native P2TR addresses with Bech32m encoding
- **Rosetta API**: Full exchange integration support

## 📁 Project Structure

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

`bitcoin`, `taproot`, `cryptography`, `proof-of-work`, `rosetta-api`, `blockchain-ambiguity`, `excalibur-esx`, `quantum-resistant`, `bech32m`, `schnorr-signatures`

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
