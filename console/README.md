# Excalibur-EXS Console Application

⚔️ **Unified Node.js console interface for the Excalibur Anomaly Protocol**

A comprehensive command-line application that integrates all advanced features and income-generating methods from the Excalibur-EXS protocol.

## Features

### 🔐 Enhanced Wallet Functionality
- **Taproot (P2TR) Vaults**: Un-linkable quantum-hardened transactions
- **HPP-1 Quantum Resistance**: 600,000 rounds of PBKDF2-HMAC-SHA512
- **13-Word Prophecy Axiom**: Unique deterministic vault generation
- **Multisig Support**: Enterprise-grade multi-party transaction capabilities
- **Bech32m Encoding**: Native Taproot address format

### ⛏️ Mining Operations
- **Tetra-PoW Integration**: 128-round nonlinear state shifts
- **Multiple Optimization Modes**: power_save, balanced, performance, extreme
- **Hardware Acceleration**: Auto-detection and configuration
- **Real-time Analytics**: Hash rate, difficulty, and performance monitoring
- **Continuous Mining**: Auto-restart and persistent operation support

### 💰 Income Generation
- **9 Revenue Streams**: Cross-chain mining, futures, Lightning routing, DeFi, MEV, staking, NFTs, lending
- **Reward Multipliers**: Long-term holding bonuses, active forger rewards, LP provider benefits
- **Income Estimation**: Project potential earnings based on stake and activity
- **Real-time Analytics**: Track earnings across all revenue streams
- **UTXO Monitoring**: Track unspent outputs and wallet performance

### 🎯 User Experience
- **Interactive Mode**: Guided menu-driven experience for beginners
- **Comprehensive CLI**: Full command-line interface for power users
- **Extensive Help**: Built-in documentation for all features
- **Configuration Management**: Persistent settings and wallet storage
- **Cross-Platform**: Windows, MacOS, and Linux support

## Installation

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Install Dependencies

```bash
cd console
npm install
```

## Usage

### Build the Application

```bash
npm run build
```

### Run the Console Application

```bash
# Run directly
npm start

# Or use the built version
node dist/index.js

# Or if globally installed
exs
```

### Interactive Mode (Recommended for Beginners)

```bash
exs interactive
```

This launches a guided menu system for all operations.

### Command-Line Interface

#### Wallet Commands

```bash
# Create a new quantum-hardened Taproot vault
exs wallet create

# Import wallet from 13-word prophecy axiom
exs wallet import

# Show wallet information
exs wallet info

# Validate a Taproot address
exs wallet validate <address>

# List UTXOs
exs wallet utxos

# Generate new receiving address
exs wallet new-address
```

#### Mining Commands

```bash
# Start mining
exs mine start --axiom "your 13 words here" --difficulty 4

# Benchmark performance
exs mine benchmark --rounds 100

# Show mining statistics
exs mine stats

# Display hardware information
exs mine hwinfo

# Stop active mining
exs mine stop
```

#### Revenue Commands

```bash
# Show comprehensive revenue statistics
exs revenue stats

# List all revenue streams
exs revenue streams

# Calculate user rewards
exs revenue calculate --stake 1000 --total-stake 100000 --forges 50 --months 12 --lp

# Estimate potential income
exs revenue estimate --stake 1000 --hashrate 100 --days 30

# Show income summary
exs revenue summary
```

#### Configuration Commands

```bash
# Show current configuration
exs config show

# Set configuration value
exs config set network mainnet

# Get configuration value
exs config get network

# Clear all configuration
exs config clear

# Export configuration
exs config export -o config.json

# Import configuration
exs config import config.json

# Show config file path
exs config path
```

## Revenue Streams

The console application integrates with 9 income-generating revenue streams:

1. **Cross-Chain Mining** (8-15% APR) - BTC, ETH, LTC, XMR, DOGE
2. **Smart Contract Futures** (12-25% APR) - GMX, dYdX, Synthetix
3. **Lightning Fee Routing** (10-20% APR) - P2TR Lightning channels
4. **Taproot Processing** (5-12% APR) - Transaction batching
5. **DeFi Yield Farming** (6-18% APR) - Aave, Compound, Curve, Convex
6. **MEV Extraction** (15-40% APR) - Flashbots, MEV-boost
7. **Multi-Chain Staking** (4-12% APR) - ETH, ADA, DOT, ATOM, SOL
8. **NFT Royalty Pools** (8-25% APR) - Curated collections
9. **$EXS Lending Protocol** (5-15% APR) - Over-collateralized lending

## Reward Multipliers

Users can earn bonus multipliers:

- **Long-term Holding**: 1.1x (6+ months), 1.25x (12+ months), 1.5x (24+ months)
- **Active Forging**: 1.05x (10+ forges), 1.15x (50+ forges), 1.3x (100+ forges)
- **Liquidity Provider**: 1.2x bonus

## Cross-Platform Packaging

Build binaries for all platforms:

```bash
# Build for all platforms
npm run package

# Build for specific platform
npm run package:linux   # Linux x64
npm run package:macos   # MacOS x64
npm run package:windows # Windows x64
```

Binaries are output to `../bin/` directory:
- `exs-linux` - Linux executable
- `exs-macos` - MacOS executable
- `exs-windows.exe` - Windows executable

## Configuration

Configuration is stored in:
- Linux: `~/.config/excalibur-exs/config.json`
- MacOS: `~/Library/Preferences/excalibur-exs/config.json`
- Windows: `%APPDATA%\excalibur-exs\Config\config.json`

Example configuration:

```json
{
  "network": "mainnet",
  "apiEndpoint": "http://localhost:5000",
  "wallet": {
    "address": "bc1p...",
    "publicKey": "...",
    "network": "mainnet",
    "type": "taproot",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "mining": {
    "difficulty": 4,
    "workers": 0,
    "optimization": "balanced",
    "autoRestart": true
  }
}
```

## Architecture

```
console/
├── src/
│   ├── index.ts              # Main entry point
│   ├── commands/             # CLI command implementations
│   │   ├── wallet.ts         # Wallet management
│   │   ├── mining.ts         # Mining operations
│   │   ├── revenue.ts        # Income tracking
│   │   ├── config.ts         # Configuration
│   │   └── interactive.ts    # Interactive mode
│   ├── services/             # Core business logic
│   │   ├── wallet.ts         # Wallet service
│   │   ├── mining.ts         # Mining service
│   │   ├── revenue.ts        # Revenue service
│   │   └── config.ts         # Config service
│   ├── types/                # TypeScript definitions
│   │   └── index.ts          # Type definitions
│   └── utils/                # Utility functions
├── dist/                     # Compiled JavaScript
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Integration with Excalibur-EXS

The console application integrates with:

- **Go Miner** (`cmd/miner/main.go`) - High-performance Tetra-PoW mining
- **Forge API** (`cmd/forge-api/app.py`) - Python Flask API for mining and treasury
- **Revenue Manager** (`pkg/revenue/revenue_manager.py`) - Multi-stream revenue processing
- **Taproot Implementation** (`pkg/bitcoin/taproot.go`) - Quantum-hardened vault generation
- **Treasury System** (`pkg/economy/treasury.go`) - Reward distribution

## Security Features

- **HPP-1 Quantum Hardening**: 600,000 rounds of PBKDF2-HMAC-SHA512
- **Taproot Privacy**: P2TR conceals spending conditions
- **13-Word Prophecy Axiom**: Unique deterministic generation
- **Secure Storage**: Encrypted configuration storage
- **No Private Key Storage**: Axiom-based recovery only

## Performance

- **Mining Hash Rate**: 10-1000+ H/s depending on hardware
- **Wallet Generation**: < 2 seconds with HPP-1
- **API Response Time**: < 100ms for most operations
- **Memory Usage**: ~50-100 MB
- **CPU Usage**: Configurable (power_save to extreme)

## Troubleshooting

### Import Errors

If you see module import errors:

```bash
# Ensure dependencies are installed
npm install

# Rebuild
npm run clean
npm run build
```

### API Connection Issues

If the console can't connect to the Forge API:

```bash
# Check if API is running
curl http://localhost:5000/health

# Start the API
cd ../cmd/forge-api
python3 app.py
```

### Mining Performance

For optimal mining performance:

```bash
# Check hardware capabilities
exs mine hwinfo

# Use appropriate optimization mode
exs mine start --optimization performance
```

## Development

### TypeScript Development

```bash
# Watch mode (auto-rebuild on changes)
npm run watch

# Run with ts-node
npm run dev -- wallet create
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

BSD 3-Clause License - see [LICENSE](../LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email**: holedozer@gmail.com
- **Documentation**: [Main README](../README.md)

## Author

**Travis D Jones**  
Email: holedozer@gmail.com

---

⚔️ **"In ambiguity, we find certainty. In chaos, we forge order."**

---

## Quick Reference

### Most Common Commands

```bash
# First-time setup
exs wallet create                    # Create quantum-hardened wallet
exs mine start                       # Start mining with defaults
exs revenue stats                    # View income statistics

# Daily operations
exs wallet info                      # Check wallet balance
exs mine benchmark                   # Test mining performance
exs revenue summary                  # View your earnings

# Interactive mode (easiest)
exs interactive                      # Launch guided experience
```

### Example Workflow

```bash
# 1. Create wallet
exs wallet create
# Save your 13-word axiom!

# 2. Start mining
exs mine start --difficulty 4 --optimization balanced

# 3. Check earnings
exs revenue summary

# 4. Estimate future income
exs revenue estimate --stake 1000 --hashrate 100 --days 30

# 5. Calculate rewards with multipliers
exs revenue calculate --stake 1000 --forges 50 --months 12 --lp
```
