# Excalibur-EXS Console Application - Quick Start Guide

This guide will walk you through using the Excalibur-EXS Console Application to maximize your income potential.

## Table of Contents
1. [Installation](#installation)
2. [First-Time Setup](#first-time-setup)
3. [Mining Operations](#mining-operations)
4. [Income Generation](#income-generation)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn

### Install and Build

```bash
cd console
npm install
npm run build
```

### Add to PATH (Optional)

For easier access, add an alias to your shell:

```bash
# For Linux/MacOS - add to ~/.bashrc or ~/.zshrc
alias exs="node /path/to/Excalibur-EXS/console/dist/index.js"

# For Windows - add to PowerShell profile
Set-Alias -Name exs -Value "node C:\path\to\Excalibur-EXS\console\dist\index.js"
```

## First-Time Setup

### Step 1: Create Your Quantum-Hardened Wallet

The first step is to create a Taproot (P2TR) wallet with quantum resistance:

```bash
cd console
node dist/index.js wallet create
```

**Important:** You'll see your 13-word prophecy axiom. **Write it down immediately!**

Example output:
```
⚔️  Excalibur-EXS Taproot Vault
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 13-Word Prophecy Axiom (SAVE THIS SECURELY!):
sword legend pull magic kingdom artist stone destroy forget fire steel honey question

🔐 Vault Address:
bc1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt

🌐 Network: mainnet
🔑 Type: Taproot (P2TR) + HPP-1 Quantum-Hardened

⚠️  IMPORTANT: Write down your 13-word prophecy axiom!
   This is the ONLY way to recover your wallet.
```

### Step 2: Verify Your Wallet

Check your wallet information:

```bash
node dist/index.js wallet info
```

### Step 3: Review Revenue Streams

See all available income-generating streams:

```bash
node dist/index.js revenue streams
```

## Mining Operations

### Basic Mining

Start mining with default settings:

```bash
node dist/index.js mine start
```

You'll be prompted for your axiom. You can use the default for testing:
```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

### Advanced Mining

#### Adjust Difficulty

Higher difficulty = harder mining but more secure:

```bash
# Easy mining (testing)
node dist/index.js mine start --difficulty 1

# Production mining
node dist/index.js mine start --difficulty 4

# Expert level
node dist/index.js mine start --difficulty 8
```

#### Optimize Performance

Choose an optimization mode based on your hardware:

```bash
# Low power consumption (laptops)
node dist/index.js mine start --optimization power_save

# Balanced (recommended)
node dist/index.js mine start --optimization balanced

# High performance (dedicated rigs)
node dist/index.js mine start --optimization performance

# Maximum performance (high-end only)
node dist/index.js mine start --optimization extreme
```

#### Adjust Worker Threads

```bash
# Auto-detect optimal workers
node dist/index.js mine start --workers 0

# Manual worker count
node dist/index.js mine start --workers 4
```

### Complete Mining Command Example

```bash
node dist/index.js mine start \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4 \
  --workers 4 \
  --optimization performance
```

### Benchmark Your System

Test your mining performance:

```bash
node dist/index.js mine benchmark --rounds 100
```

Example output:
```
⚡ Tetra-PoW Performance Benchmark
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running 100 iterations...

📊 Results:
   Average Hash Rate: 156.42 H/s
   Average Time per Round: 6.39 ms

Performance Rating: ⚡ Good
```

### Check Hardware Capabilities

```bash
node dist/index.js mine hwinfo
```

## Income Generation

### Calculate Your Rewards

Calculate potential rewards based on your participation:

```bash
node dist/index.js revenue calculate \
  --stake 1000 \
  --total-stake 100000 \
  --forges 50 \
  --months 12 \
  --lp
```

This will show:
- Your base share (1% of total stake)
- Bonus multipliers:
  - Long-term holder (12+ months): 1.25x
  - Active forger (50+ forges): 1.15x
  - Liquidity provider: 1.2x
- Total multiplier: 1.725x
- Your weighted share of rewards

### Estimate Future Income

Project your income over time:

```bash
node dist/index.js revenue estimate \
  --stake 1000 \
  --hashrate 150 \
  --days 30
```

Example output:
```
📈 Income Estimation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Parameters:
   Stake: 1000 $EXS
   Mining Hash Rate: 150 H/s
   Days Active: 30
   Staking APY: 8.0%
   Revenue APY: 12.0%

💰 Daily Income:
   Mining: 0.75000000 $EXS
   Staking: 0.21917808 $EXS
   Revenue Share: 0.32876712 $EXS
   Total: 1.29794520 $EXS

📊 Projected Income:
   30 days: 38.93835600 $EXS
```

### View Revenue Statistics

See comprehensive statistics:

```bash
node dist/index.js revenue stats
```

### Check Your Income Summary

View earnings for your wallet:

```bash
node dist/index.js revenue summary
```

## Interactive Mode

For beginners, use the guided interactive mode:

```bash
node dist/index.js interactive
```

This provides a menu-driven interface for all operations:

```
⚔️  Welcome to Excalibur-EXS Interactive Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? What would you like to do?
  🔐 Wallet Management
  ⛏️  Mining Operations
  💰 Income & Revenue
  ⚙️  Configuration
❯ ❌ Exit
```

## Advanced Features

### Configuration Management

#### View Configuration

```bash
node dist/index.js config show
```

#### Set Configuration Values

```bash
node dist/index.js config set network mainnet
node dist/index.js config set apiEndpoint http://localhost:5000
```

#### Export Configuration

```bash
node dist/index.js config export -o my-config.json
```

#### Import Configuration

```bash
node dist/index.js config import my-config.json
```

#### Get Config Path

```bash
node dist/index.js config path
```

### Import Existing Wallet

If you already have a prophecy axiom:

```bash
node dist/index.js wallet import
```

Enter your 13-word axiom when prompted.

### Validate Addresses

Check if an address is a valid Taproot address:

```bash
node dist/index.js wallet validate bc1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt
```

## Complete Workflow Example

Here's a complete workflow from setup to earning:

```bash
# 1. Create wallet
node dist/index.js wallet create
# Save your 13-word axiom!

# 2. Check hardware capabilities
node dist/index.js mine hwinfo

# 3. Run a benchmark
node dist/index.js mine benchmark --rounds 100

# 4. Start mining with optimized settings
node dist/index.js mine start \
  --difficulty 4 \
  --optimization performance \
  --workers 4

# 5. Check revenue streams
node dist/index.js revenue streams

# 6. Estimate potential income
node dist/index.js revenue estimate \
  --stake 1000 \
  --hashrate 150 \
  --days 30

# 7. Calculate rewards with multipliers
node dist/index.js revenue calculate \
  --stake 1000 \
  --total-stake 100000 \
  --forges 50 \
  --months 12 \
  --lp

# 8. Check your earnings
node dist/index.js revenue summary
```

## Maximizing Income

### Strategy 1: Long-Term Holding

Hold $EXS for extended periods to earn multipliers:
- 6+ months: 1.1x multiplier
- 12+ months: 1.25x multiplier
- 24+ months: 1.5x multiplier

### Strategy 2: Active Forging

Complete more forges to earn bonuses:
- 10+ forges: 1.05x multiplier
- 50+ forges: 1.15x multiplier
- 100+ forges: 1.3x multiplier

### Strategy 3: Liquidity Provision

Become a liquidity provider for 1.2x multiplier on all rewards.

### Strategy 4: Diversified Revenue

Participate in multiple revenue streams:
1. Mine continuously for base rewards
2. Stake your $EXS for passive income
3. Provide liquidity for LP rewards
4. Participate in DeFi yield farming
5. Engage with Lightning Network routing

### Combined Strategy

With all multipliers active:
- Long-term holder (24 months): 1.5x
- Active forger (100+ forges): 1.3x
- Liquidity provider: 1.2x
- **Total multiplier: 2.34x**

On a 1% stake, this becomes 2.34% of reward pool!

## Troubleshooting

### Mining Not Working

If mining fails:

1. Check API connectivity:
```bash
curl http://localhost:5000/health
```

2. Start the Forge API:
```bash
cd cmd/forge-api
python3 app.py
```

3. Use lower difficulty for testing:
```bash
node dist/index.js mine start --difficulty 1
```

### Wallet Not Found

If commands say "No wallet configured":

```bash
# Create new wallet
node dist/index.js wallet create

# Or import existing
node dist/index.js wallet import
```

### Configuration Issues

Reset configuration:

```bash
node dist/index.js config clear
```

### Performance Issues

1. Check hardware:
```bash
node dist/index.js mine hwinfo
```

2. Run benchmark:
```bash
node dist/index.js mine benchmark --rounds 50
```

3. Try different optimization:
```bash
node dist/index.js mine start --optimization power_save
```

## Tips and Best Practices

1. **Always backup your 13-word axiom** - store it securely offline
2. **Start with low difficulty** when testing
3. **Run benchmarks** before production mining
4. **Monitor your hardware** temperature and usage
5. **Use interactive mode** if you're new to command-line tools
6. **Combine strategies** to maximize multipliers
7. **Check revenue stats** regularly to track earnings
8. **Keep the application updated** for new features

## Security Reminders

⚠️ **NEVER share your 13-word prophecy axiom**
⚠️ **NEVER enter your axiom on untrusted websites**
⚠️ **ALWAYS verify addresses** before sending funds
⚠️ **KEEP backups** of your configuration and axiom
⚠️ **USE quantum-hardened** Taproot addresses only

## Support

- Documentation: [README.md](README.md)
- Issues: [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- Email: holedozer@icloud.com

---

⚔️ **"In ambiguity, we find certainty. In chaos, we forge order."**
