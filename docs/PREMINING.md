# Excalibur $EXS - Premining Module

## Overview

The premining module initializes the Genesis block and premined blocks for the Tetra-PoW blockchain before the official network launch of $EXS (The Excalibur Anomaly Protocol).

## Features

- **Genesis Block Setup**: Creates Block 0 with configurable reward
- **Premined Blocks**: Simulates mining of a configurable number of blocks
- **Block-by-block Progress**: Real-time mining progress with timestamps
- **Reward Calculation**: Automatic calculation and display of total rewards
- **Creator Address**: Aggregates all rewards to a dedicated creator address
- **Blockchain Export**: Exports the complete blockchain to JSON format
- **Chain Validation**: Validates the integrity of the blockchain

## Structure

```
pkg/blockchain/
├── __init__.py          # Package initialization
└── block.py             # Block and Blockchain data structures

scripts/
└── premine.py           # Premining script
```

## Usage

### Basic Premining (100 blocks)

```bash
python3 scripts/premine.py
```

### Custom Number of Blocks

```bash
python3 scripts/premine.py --blocks 500
```

### Custom Creator Address

```bash
python3 scripts/premine.py --blocks 200 --creator bc1p...your...address...
```

### Export to JSON

```bash
python3 scripts/premine.py --blocks 100 --output blockchain.json
```

### Full Custom Configuration

```bash
python3 scripts/premine.py \
  --blocks 1000 \
  --creator bc1p7hcq8x7h3jf2rg9p5v8w2n4k6m8a0d2e4f6g8h0 \
  --reward 50 \
  --treasury-percent 0.01 \
  --difficulty 4 \
  --output premined_blockchain.json
```

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--blocks` | Number of blocks to premine | 100 |
| `--creator` | Creator Taproot address for rewards | bc1p7hcq8x7h3jf2rg9p5v8w2n4k6m8a0d2e4f6g8h0 |
| `--axiom` | The 13-word axiom | Canonical axiom |
| `--reward` | Reward per block in $EXS | 50.0 |
| `--treasury-percent` | Treasury fee percentage | 1% (0.01) |
| `--difficulty` | Mining difficulty level | 4 |
| `--output` | Output file for blockchain JSON | None |

## Blockchain Structure

### Block Structure

Each block contains:
- **height**: Block number (0 for Genesis)
- **timestamp**: Unix timestamp of block creation
- **previous_hash**: Hash of the previous block (all zeros for Genesis)
- **hash**: SHA-256 hash of the block
- **nonce**: Mining nonce value
- **difficulty**: Mining difficulty level
- **miner_address**: Creator's Taproot address
- **reward**: Total block reward in $EXS
- **treasury_fee**: Fee allocated to treasury
- **axiom**: The 13-word axiom
- **merkle_root**: Merkle root identifier

### Genesis Block

The Genesis block (Block 0) is special:
- Previous hash: `0000000000000000000000000000000000000000000000000000000000000000`
- Nonce: 0
- Merkle root: "genesis"
- Contains the same reward structure as regular blocks

## Reward Distribution

For each block:
- **Total Reward**: 50 $EXS (configurable)
- **Treasury Fee**: 1% of reward (0.5 $EXS by default)
- **Creator Reward**: 99% of reward (49.5 $EXS by default)

Example for 100 blocks:
- Total Rewards: 5,000 $EXS
- Creator Rewards: 4,950 $EXS
- Treasury Fees: 50 $EXS

## Output Format

The exported JSON contains:

```json
{
  "metadata": {
    "protocol": "Excalibur $EXS",
    "version": "1.0.0",
    "total_blocks": 100,
    "creator_address": "bc1p...",
    "axiom": "sword legend pull...",
    "export_timestamp": "2026-01-02T08:23:28.399458Z"
  },
  "genesis_block": { ... },
  "blocks": [ ... ],
  "statistics": {
    "total_blocks": 100,
    "total_rewards": 5000.0,
    "total_miner_rewards": 4950.0,
    "total_treasury_fees": 50.0
  }
}
```

## Integration

The premining module integrates with:
- **pkg/foundry/exs_foundry.py**: Uses ExsFoundry for reward calculations
- **pkg/economy/tokenomics_v2.json**: Follows tokenomics specifications
- **miners/**: Compatible with all mining implementations

## Testing

Run the premining script with a small number of blocks to test:

```bash
# Quick test with 10 blocks
python3 scripts/premine.py --blocks 10

# Test with JSON export
python3 scripts/premine.py --blocks 20 --output /tmp/test_blockchain.json

# Verify the exported JSON
cat /tmp/test_blockchain.json | python3 -m json.tool
```

## Production Deployment

For the actual network launch:

1. Generate a secure creator address:
   ```bash
   # Use the Rosetta API or exs-node to generate a secure P2TR address
   ./cmd/rosetta/rosetta generate-vault --network mainnet
   ```

2. Run premining with production parameters:
   ```bash
   python3 scripts/premine.py \
     --blocks 100 \
     --creator <your-secure-address> \
     --output genesis_blockchain.json
   ```

3. Verify the blockchain:
   ```bash
   # Check the JSON output
   cat genesis_blockchain.json | python3 -m json.tool | less
   ```

4. Store the blockchain securely and use it to initialize the network

## Security Considerations

- The creator address should be a secure Taproot (P2TR) address
- Store the private keys for the creator address in secure cold storage
- The Genesis block hash serves as the network identifier
- All blocks are cryptographically linked via SHA-256 hashes
- Blockchain validation ensures integrity of the premined chain

## Author

Travis D. Jones  
Email: holedozer@gmail.com  
License: BSD 3-Clause
