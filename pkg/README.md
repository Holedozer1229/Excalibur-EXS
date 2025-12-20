# Excalibur $EXS - Core Package Components

This directory contains the essential components of the Excalibur $EXS Protocol.

## 📦 Packages

### 🔨 `/miner` - Tetra-PoW Mining Engine
**File**: `tetra_pow_miner.py`

The heart of the Excalibur $EXS Protocol - the Ω′ Δ18 (Omega Prime Delta 18) mining algorithm.

**Key Features:**
- 128 rounds of unrolled nonlinear transformations
- Multiple hash function mixing (SHA256, SHA512, BLAKE2b, SHA3-256)
- Round-specific XOR operations
- Nonlinear state permutations
- Difficulty-based proof-of-work validation

**Usage:**
```bash
python pkg/miner/tetra_pow_miner.py
```

**Algorithm Phases:**
1. **Prophecy Binding**: Cryptographic commitment to the 13-word axiom
2. **Nonlinear Expansion**: 128 unique transformation rounds
3. **Proof-of-Work**: Finding nonce that meets difficulty target

---

### 🏭 `/foundry` - HPP-1 Forge Processing
**File**: `exs_foundry.py`

Quantum-hardened key derivation and forge processing with the HPP-1 protocol.

**Key Features:**
- 600,000 iterations of PBKDF2-HMAC-SHA512
- Taproot (P2TR) address generation
- Automatic fee calculation (1% treasury + 0.0001 BTC forge fee)
- Forge verification and validation

**Usage:**
```bash
python pkg/foundry/exs_foundry.py
```

**HPP-1 Protocol:**
- **Algorithm**: PBKDF2-HMAC-SHA512
- **Iterations**: 600,000 (quantum-resistant)
- **Key Length**: 64 bytes
- **Salt**: 32 bytes (random or derived from hash)

---

### 💰 `/economy` - Economic & Treasury Management
**Files**: `tokenomics.json`, `treasury.go`

Economic model definition and treasury backend logic.

#### `tokenomics.json`
Complete tokenomics specification:
- Total supply: 21,000,000 $EXS
- Forge reward: 50 $EXS
- Distribution: 60% PoF, 15% Treasury, 20% Liquidity, 5% Airdrop
- Fee structure and emission schedule

#### `treasury.go`
Go-based treasury management backend:
- Fee collection (1% treasury + 0.0001 BTC forge fee)
- $EXS distribution tracking
- Balance management
- Historical distribution records

**Usage:**
```go
// Import the treasury package
import "github.com/Holedozer1229/Excalibur-EXS/pkg/economy"

// Create treasury manager
tm := economy.NewTreasuryManager()

// Process a forge
result, err := tm.ProcessForge("bc1p...")

// Get statistics
stats := tm.GetTreasuryStats()
```

---

### 🏛️ `/rosetta` - Institutional API Integration
**File**: `rosetta-exs.yaml`

Rosetta Construction API v1.4.10 configuration for exchange listing compatibility.

**Key Features:**
- Coinbase/Kraken/Binance compatible
- Standardized account and transaction models
- P2TR address support
- Comprehensive error handling
- Network and block configuration

**Supported Exchanges:**
- ✅ Coinbase
- ✅ Kraken
- ✅ Binance
- ✅ Gemini

**API Version**: 1.4.10

**Endpoints**: All standard Rosetta endpoints including:
- Network status and options
- Account balance and coins
- Block and transaction queries
- Mempool operations
- Construction API (derive, preprocess, metadata, payloads, combine, parse, hash, submit)

---

## 🔗 Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Interface Layer                     │
│  ┌────────────────┐              ┌────────────────┐        │
│  │  Merlin's      │              │   Knights'     │        │
│  │  Portal        │              │  Round Table   │        │
│  │  (Admin UI)    │              │  (Public UI)   │        │
│  └────────┬───────┘              └───────┬────────┘        │
└───────────┼──────────────────────────────┼─────────────────┘
            │                              │
            │                              │
┌───────────┼──────────────────────────────┼─────────────────┐
│           │         Backend Layer        │                 │
│           │                              │                 │
│  ┌────────▼────────┐          ┌─────────▼────────┐        │
│  │   Treasury      │          │   Tetra-PoW      │        │
│  │   (treasury.go) │◄─────────┤   Miner          │        │
│  └────────┬────────┘          │   (miner.py)     │        │
│           │                   └─────────┬────────┘        │
│           │                             │                 │
│           │                   ┌─────────▼────────┐        │
│           │                   │   EXS Foundry    │        │
│           └───────────────────┤   (foundry.py)   │        │
│                               └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Institutional Layer                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Rosetta API (rosetta-exs.yaml)                │  │
│  │         Exchange Integration & Compliance             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test the Miner
```bash
cd pkg/miner
python tetra_pow_miner.py
```

### Test the Foundry
```bash
cd pkg/foundry
python exs_foundry.py
```

### Build Treasury (Go)
```bash
cd pkg/economy
go build treasury.go
```

---

## 📚 Documentation

Each package contains inline documentation and usage examples. For full protocol documentation, see the main [README.md](../../README.md).

---

## 🔐 Security Notes

- **Miner**: Uses cryptographically secure hash functions
- **Foundry**: Quantum-resistant with 600,000 PBKDF2 iterations
- **Treasury**: Implements precise fee calculations with big number support
- **Rosetta**: Standards-compliant for institutional security requirements

---

*Built with precision and legendary craftsmanship*
