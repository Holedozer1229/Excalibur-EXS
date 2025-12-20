# Excalibur $EXS Core Packages

This directory contains the core cryptographic, economic, and integration packages for the Excalibur $EXS Protocol.

## Packages

### `/miner` - Ω′ Δ18 Tetra-PoW Miner
The 128-round unrolled nonlinear hash algorithm implementation. This is the heart of the Proof-of-Forge consensus mechanism.

**Key File:** `tetra_pow_miner.py`

### `/foundry` - HPP-1 Protocol & Vault Creation
Quantum-hardened key derivation using 600,000 PBKDF2-HMAC-SHA512 rounds. Creates unique, un-linkable Taproot (P2TR) vaults.

**Key File:** `exs_foundry.py`

### `/economy` - Treasury & Tokenomics
Treasury management, fee collection (1% treasury fee), and tokenomics implementation (21M supply cap, 50 $EXS per forge).

**Key Files:**
- `treasury.go` - Go-based treasury backend
- `tokenomics.json` - Economic parameters and distribution

### `/rosetta` - Rosetta Construction API
Implementation of the Rosetta Construction API v1.4.10 for institutional exchange compatibility (Coinbase, Kraken, etc.).

**Key File:** `rosetta-exs.yaml`

## Architecture

```
pkg/
├── miner/          # Ω′ Δ18 mining algorithm
├── foundry/        # HPP-1 key derivation & vault creation
├── economy/        # Treasury & tokenomics
└── rosetta/        # Exchange integration API
```

## Usage

### Mining
```bash
python pkg/miner/tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4
```

### Foundry
```bash
python pkg/foundry/exs_foundry.py
```

### Treasury (Go)
```bash
go run cmd/treasury-demo/main.go
```

## Technical Specifications

- **Mining Algorithm:** Ω′ Δ18 (128-Round Unrolled)
- **Hardness:** 600,000 PBKDF2-HMAC-SHA512 iterations
- **Difficulty:** 4 leading zero bytes (configurable)
- **Supply Cap:** 21,000,000 $EXS
- **Forge Reward:** 50 $EXS
- **Treasury Fee:** 1%
- **Forge Fee:** 0.0001 BTC

---

*Lead Architect: Travis D. Jones <holedozer@gmail.com>*
