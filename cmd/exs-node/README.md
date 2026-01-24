# Excalibur-EXS Console Node

Bitcoin Core-like console application enhanced for the Excalibur Anomaly Protocol.

## Features

### Wallet Operations
- HD wallets with 13-word prophecy axiom
- Taproot (P2TR) address generation
- Multisig wallet support
- HPP-1 encryption (600,000 PBKDF2 rounds)
- Bitcoin Core compatible RPC interface

### Mining Node
- Tetra-PoW mining with 128-round nonlinear state shifts
- HPP-1 quantum-resistant hashing
- Hardware acceleration support
- Pool mining support
- Real-time statistics

### Blockchain Node
- Full node with Bitcoin consensus validation
- SPV (Simplified Payment Verification) mode
- P2P networking
- Transaction validation and relay
- Block propagation

### Knights' Round Table Features
- **Forge Operations**: Complete forge workflow with axiom verification
- **Oracle Consultation**: Protocol intelligence and guidance
- **Revenue Streams**: 9 income sources (mining, staking, DeFi, MEV, etc.)
- **Real-time Visualization**: 128-round mining visualization
- **Treasury Management**: Multi-stream revenue tracking

### AWS & Bitcoin Alignment
- Bitcoin Core RPC compatibility
- AWS Managed Blockchain integration
- Apache/Nginx configurations
- Full consensus validation
- Enterprise deployment patterns

## Installation

### Prerequisites
- Go 1.21 or later
- Python 3.8 or later
- Git

### Build from Source

```bash
# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Build for your platform
./scripts/build/build-all.sh

# Or build manually
cd cmd/exs-node
go build -o exs-node
sudo mv exs-node /usr/local/bin/
```

### Cross-Platform Binaries

Download pre-built binaries from releases:
- Linux (amd64, arm64)
- macOS (Intel, Apple Silicon)
- Windows (amd64)

## Quick Start

### Initialize Configuration

```bash
exs-node config init
```

### Create Wallet

```bash
# Go CLI
exs-node wallet create my-wallet --passphrase "secure-password"

# Python CLI
./cmd/exs-wallet/wallet_cli.py create my-wallet --passphrase "secure-password"
```

### Start Mining

```bash
exs-node mine start --address bc1p... --threads 4
```

### Start Forge (Knights' Round Table)

```bash
exs-node forge start --address bc1p... --visualize
```

### Start Blockchain Node

```bash
exs-node node start --mode full
```

### Consult Oracle

```bash
exs-node oracle ask "How do I mine effectively?"
exs-node oracle quick mining
```

### View Revenue Streams

```bash
exs-node revenue show
exs-node revenue details "Cross-Chain Mining"
```

### Dashboard

```bash
exs-node dashboard --refresh 5
```

## Commands Reference

### Wallet Commands

```bash
exs-node wallet create <name>       # Create new wallet
exs-node wallet list                # List all wallets
exs-node wallet balance <name>      # Show balance
exs-node wallet address <name>      # Generate new address
exs-node wallet send <name> <addr> <amount>  # Send transaction
exs-node wallet import <name>       # Import from seed
exs-node wallet export <name>       # Export seed phrase
exs-node wallet multisig create <name> <m> <n>  # Create multisig
```

### Mining Commands

```bash
exs-node mine start                 # Start mining
exs-node mine stop                  # Stop mining
exs-node mine stats                 # Show statistics
exs-node mine benchmark             # Run benchmark
```

### Node Commands

```bash
exs-node node start                 # Start blockchain node
exs-node node stop                  # Stop node
exs-node node status                # Show status
exs-node node sync                  # Synchronize blockchain
exs-node node peers                 # List connected peers
```

### Forge Commands (Knights' Round Table)

```bash
exs-node forge start --address <addr>  # Start forge with axiom
exs-node forge verify <axiom>          # Verify 13-word axiom
exs-node forge stats                   # Show forge statistics
```

### Oracle Commands

```bash
exs-node oracle ask <question>      # Ask oracle a question
exs-node oracle divine              # Get divination
exs-node oracle quick <topic>       # Quick query (mining/forge/treasury/rewards)
```

### Revenue Commands

```bash
exs-node revenue show               # Show all revenue streams
exs-node revenue stats [stream]     # Show statistics
exs-node revenue details <stream>   # Detailed information
exs-node revenue enable <stream>    # Enable stream
exs-node revenue disable <stream>   # Disable stream
```

### Configuration Commands

```bash
exs-node config show                # Show configuration
exs-node config set <key> <value>   # Set value
exs-node config init                # Initialize configuration
```

### Dashboard

```bash
exs-node dashboard                  # Real-time dashboard
exs-node dashboard --refresh 10     # Custom refresh interval
```

## Configuration

Default configuration location: `~/.excalibur-exs/config.yaml`

```yaml
network: mainnet  # mainnet, testnet, regtest
datadir: ~/.excalibur-exs/data

rpc:
  enabled: true
  bind: 127.0.0.1
  port: 8332
  user: excalibur
  password: changeme

p2p:
  bind: 0.0.0.0
  port: 8333
  max_peers: 125

mining:
  enabled: false
  threads: 0  # 0 = auto
  address: ""

performance:
  db_cache: 450  # MB
  max_mempool: 300  # MB

storage:
  prune: false
  txindex: true

privacy:
  tor: false
  i2p: false
```

## AWS Deployment

### Apache Configuration

Copy the Apache configuration:

```bash
sudo cp config/apache/excalibur-exs.conf /etc/apache2/sites-available/
sudo a2ensite excalibur-exs
sudo systemctl reload apache2
```

### Nginx Alternative

```bash
sudo cp config/nginx/excalibur-exs.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/excalibur-exs.conf /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### Systemd Service

```bash
sudo cp scripts/systemd/excalibur-exs.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable excalibur-exs
sudo systemctl start excalibur-exs
```

## Bitcoin Core Compatibility

The RPC interface is compatible with Bitcoin Core:

```bash
# Use bitcoin-cli syntax
bitcoin-cli -rpcuser=excalibur -rpcpassword=changeme getblockcount
bitcoin-cli -rpcuser=excalibur -rpcpassword=changeme getnewaddress
bitcoin-cli -rpcuser=excalibur -rpcpassword=changeme getbalance
```

## Revenue Streams

The console includes full access to all 9 revenue streams:

1. **Cross-Chain Mining**: BTC, ETH, LTC, XMR, DOGE (8-15% APR)
2. **Smart Contract Futures**: GMX, dYdX, Synthetix (12-25% APR)
3. **Lightning Fee Routing**: P2TR channels (10-20% APR)
4. **Taproot Processing**: Transaction batching (5-12% APR)
5. **DeFi Yield Farming**: Aave, Compound, Curve, Convex (6-18% APR)
6. **MEV Extraction**: Flashbots, MEV-boost (15-40% APR)
7. **Staking Services**: ETH, ADA, DOT, ATOM, SOL (4-12% APR)
8. **NFT Royalty Pools**: Curated collections (8-25% APR)
9. **$EXS Lending Protocol**: Over-collateralized lending (5-15% APR)

## Security

- HPP-1 quantum-resistant key derivation (600,000 rounds)
- Taproot (P2TR) privacy
- Encrypted wallet storage
- Secure RPC authentication
- AWS security group integration
- Multi-layer security architecture

## Development

### Run Tests

```bash
go test ./...
```

### Build for Development

```bash
cd cmd/exs-node
go build -o exs-node
./exs-node --help
```

### Python Wallet Development

```bash
cd cmd/exs-wallet
python3 wallet_cli.py --help
```

## Documentation

- [AWS Bitcoin Integration](../docs/AWS_BITCOIN_INTEGRATION.md)
- [Enhanced Tokenomics](../pkg/economy/ENHANCED_TOKENOMICS.md)
- [Rosetta API](../docs/rosetta.md)
- [Mining Guide](../miners/README.md)

## Support

- Email: holedozer@icloud.com
- Repository: https://github.com/Holedozer1229/Excalibur-EXS
- Issues: https://github.com/Holedozer1229/Excalibur-EXS/issues

## License

BSD 3-Clause License - See LICENSE file for details.

---

**Lead Architect:** Travis D Jones  
**The Excalibur Anomaly Protocol ($EXS)**
