# Excalibur EXS Blockchain

Rust-based blockchain implementation for the Excalibur EXS cryptocurrency with Proof-of-Forge consensus.

## Features

- ✅ **Complete Proof-of-Forge Pipeline**
  - Prophecy Binding (SHA-512)
  - Tetra-POW (128 rounds)
  - PBKDF2 Tempering (600,000 iterations)
  - Zetahash Pythagoras transformation
  - Taproot address derivation

- 🚧 **In Progress**
  - P2P networking with libp2p
  - Proof-of-Forge consensus engine
  - Bitcoin SPV client integration
  - RocksDB storage layer
  - JSON-RPC API server

## Building

```bash
cargo build --release
```

## Running

### Start a node

```bash
cargo run --release -- start --network mainnet --port 8333
```

### Perform a Proof-of-Forge derivation

```bash
# Using canonical 13-word prophecy
cargo run --release -- forge --network mainnet

# Using custom prophecy
cargo run --release -- forge --prophecy "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

## Testing

```bash
cargo test
```

## Architecture

```
blockchain/
├── src/
│   ├── crypto/        # Proof-of-Forge cryptographic pipeline
│   ├── consensus/     # Proof-of-Forge consensus engine
│   ├── network/       # libp2p P2P networking
│   ├── chain/         # Blockchain storage (RocksDB)
│   ├── mempool/       # Forge transaction pool
│   ├── rpc/           # JSON-RPC API
│   ├── lib.rs         # Library interface
│   └── main.rs        # Node binary
└── Cargo.toml
```

## Proof-of-Forge Algorithm

The complete pipeline for deriving a Taproot address from the 13-word prophecy:

1. **Prophecy Binding**: SHA-512 hash of concatenated prophecy words
2. **Tetra-POW**: 128 rounds of nonlinear state transformation
3. **PBKDF2 Tempering**: 600,000 iterations for quantum hardening
4. **Zetahash Pythagoras**: Sacred geometric transformation using Pythagorean ratios
5. **Taproot Derivation**: BIP-340/341 compliant address generation

## Integration with Smart Contracts

This blockchain layer integrates with the Ethereum smart contracts:

- **ExcaliburToken** (ERC-20): Receives forge rewards
- **FounderSwordsNFT** (ERC-721): Receives forge fees
- **ForgeVerifier**: Validates Bitcoin payments and mints rewards

## Security Notes

- ⚠️ **Not production-ready**: This is a foundation implementation
- 🔐 **Audit required**: Professional security audit needed before mainnet
- 🧪 **Testnet first**: Deploy to testnet for extensive testing

## License

BSD-3-Clause License - See LICENSE file

## Author

Travis D Jones <holedozer@icloud.com>
