# Warchest Vault - Excalibur $EXS Premining System

## Overview

The Warchest Vault is a Python-based implementation for managing the premined rewards of the $EXS blockchain. This script automates the premining process and securely deposits mined EXS coins into a deterministic vault prior to the network launch.

## Features

### 🔐 Security

- **Deterministic Vault Generation**: Uses predefined cryptographic seed for reproducible vault creation
- **Quantum-Resistant**: HPP-1 protocol with 600,000 PBKDF2-HMAC-SHA512 iterations
- **13-Word Axiom Integration**: Leverages the Excalibur prophecy axiom for additional entropy
- **Secure Credential Display**: Clear security warnings and best practices

### ⛏️ Premining

- **Configurable Block Count**: Mine any number of blocks (default: 100)
- **Adjustable Rewards**: Customize reward per block (default: 50 EXS)
- **Real-time Logging**: Progress updates every 10 blocks
- **Comprehensive Tracking**: Each block includes hash, timestamp, and cumulative totals

### 📊 Reporting

- **Detailed Summary**: Complete statistics on premined rewards
- **JSON Export**: Export full report with all block details
- **Supply Tracking**: Shows percentage of total supply premined
- **Audit Trail**: Timestamp and block hash for every mined block

## Installation

### Requirements

- Python 3.7+
- Standard library only (no external dependencies)

### Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Make the script executable
chmod +x warchest_vault.py
```

## Usage

### Basic Usage

```bash
# Premine 100 blocks (default)
python3 warchest_vault.py

# View help and all options
python3 warchest_vault.py --help
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--blocks N` | Number of blocks to premine | 100 |
| `--reward X` | Reward per block in EXS | 50.0 |
| `--export FILE` | Export report to JSON file | None |
| `--show-credentials` | Display vault credentials | Hidden |

### Examples

#### 1. Standard Premining (100 blocks)

```bash
python3 warchest_vault.py
```

Output:
```
================================================================================
⚔️  EXCALIBUR $EXS - WARCHEST VAULT
================================================================================

Securing premined rewards for the $EXS blockchain
Quantum-hardened with HPP-1 protocol (600,000 PBKDF2 iterations)

⚒️  Generating Warchest Vault credentials...
   Using HPP-1 protocol (600,000 PBKDF2 iterations)
✅ Warchest Vault credentials generated successfully!

⛏️  Starting premining simulation...
   Blocks to mine: 100
   Reward per block: 50.0 EXS
   Vault address: bc1p1b5db816c424dde3725bc5c113536d876c43f62c

   Block   10 mined | Reward: 50.0 EXS | Cumulative: 500.0 EXS
   Block   20 mined | Reward: 50.0 EXS | Cumulative: 1000.0 EXS
   ...
```

#### 2. Custom Block Count and Export

```bash
python3 warchest_vault.py --blocks 250 --export production_premine.json
```

This will:
- Premine 250 blocks
- Export detailed report to `production_premine.json`
- Total rewards: 12,500 EXS (250 × 50 EXS)

#### 3. Display Vault Credentials

⚠️ **Use with caution in production!**

```bash
python3 warchest_vault.py --show-credentials
```

This displays:
- Vault address (public)
- Private key (SENSITIVE - keep secure!)
- Security warnings and best practices

#### 4. Full Production Run

```bash
python3 warchest_vault.py \
  --blocks 100 \
  --reward 50 \
  --show-credentials \
  --export warchest_production_2026.json
```

## Security Considerations

### 🔒 Vault Credentials

The vault credentials are deterministically generated using:

1. **Predefined Seed**: `EXCALIBUR_WARCHEST_VAULT_2026`
2. **13-Word Axiom**: The canonical Excalibur axiom
3. **HPP-1 Protocol**: 600,000 PBKDF2-HMAC-SHA512 iterations

**Private Key Storage:**
- ✅ Store in encrypted password manager
- ✅ Use hardware security module (HSM) for production
- ✅ Create offline backups in multiple secure locations
- ✅ Implement multi-signature requirements
- ❌ Never commit to version control
- ❌ Never share via insecure channels
- ❌ Never store in plain text

### 🛡️ Best Practices

1. **Encryption**: Encrypt the private key with AES-256 before storage
2. **Access Control**: Limit vault access to authorized personnel only
3. **Multi-Signature**: Require multiple signatures for spending
4. **Time-Locks**: Implement time-locks for large withdrawals
5. **Audit Logging**: Maintain detailed logs of all vault activities
6. **Regular Rotation**: Update access credentials periodically
7. **Backup Strategy**: Maintain 3-2-1 backup rule (3 copies, 2 media types, 1 offsite)

### ⚠️ Production Deployment

For production deployment:

```bash
# 1. Generate vault and premine
python3 warchest_vault.py --blocks 100 --export production.json

# 2. Display credentials in secure environment only
python3 warchest_vault.py --show-credentials > credentials.txt

# 3. Immediately encrypt the credentials
gpg --symmetric --cipher-algo AES256 credentials.txt

# 4. Securely delete the plain text file
shred -vfz -n 10 credentials.txt

# 5. Store the encrypted file offline
# 6. Keep decryption passphrase separately and securely
```

## Output Format

### Console Output

The script provides real-time progress updates:

- Vault generation confirmation
- Mining progress (every 10 blocks)
- Summary statistics
- Security warnings (if credentials displayed)

### JSON Export Structure

```json
{
  "warchest_vault": {
    "address": "bc1p...",
    "private_key_hash": "1107...",
    "security_protocol": "HPP-1 (600,000 PBKDF2 iterations)"
  },
  "premining_summary": {
    "total_blocks_mined": 100,
    "total_rewards_deposited": "5000.0",
    "reward_per_block": "50.0",
    "first_block": { "number": 1, "timestamp": "...", "hash": "..." },
    "last_block": { "number": 100, "timestamp": "...", "hash": "..." }
  },
  "distribution": {
    "total_supply_cap": "21,000,000 EXS",
    "premined_percentage": "0.0238%",
    "remaining_supply": "20995000.0"
  },
  "blocks": [
    {
      "block_number": 1,
      "block_hash": "fc04...",
      "timestamp": "2026-01-02T08:29:59.236934+00:00",
      "reward": "50.0",
      "vault_address": "bc1p...",
      "total_premined": "50.0"
    }
    // ... additional blocks
  ]
}
```

## Technical Details

### Cryptographic Implementation

#### HPP-1 Protocol

```python
master_key = hashlib.pbkdf2_hmac(
    'sha512',           # Algorithm
    password,           # Seed + Axiom
    salt,               # SHA-256 of seed
    600000,             # 600,000 iterations
    dklen=64            # 512-bit output
)
```

#### Key Derivation

- **Private Key**: First 32 bytes of master key (hex encoded)
- **Vault Address**: Second 32 bytes → SHA-256 → SHA-256 → Bech32m format

### Block Hashing

Each block is hashed using SHA-256:

```python
block_data = f"{block_num}:{timestamp}:{reward}:{vault_address}"
block_hash = hashlib.sha256(block_data.encode()).hexdigest()
```

### Determinism

The vault credentials are **deterministic** - running the script multiple times with the same seed will produce:
- ✅ Identical vault address
- ✅ Identical private key
- ✅ Reproducible results

This is by design to ensure vault recovery if needed.

## Integration with Excalibur Ecosystem

### Treasury Alignment

The Warchest Vault integrates with the Excalibur treasury system:

- **Treasury Allocation**: 15% of block rewards (7.5 EXS per block)
- **Mini-Outputs**: Compatible with 3-output CLTV time-lock system
- **Vesting Schedule**: Supports 12-month rolling release
- **CLTV Scripts**: Ready for Bitcoin CHECKLOCKTIMEVERIFY integration

### Tokenomics Compatibility

- **Total Supply**: 21,000,000 EXS
- **Block Reward**: 50 EXS per block
- **Halving Schedule**: Every 210,000 blocks
- **Forge Fee**: 0.0001 BTC per forge

## Troubleshooting

### Common Issues

**Issue**: Script runs too slow
```bash
# The 600,000 PBKDF2 iterations are intentional for security
# Expected runtime: 5-15 seconds for vault generation
```

**Issue**: Credentials not displayed
```bash
# Use the --show-credentials flag
python3 warchest_vault.py --show-credentials
```

**Issue**: Export file already exists
```bash
# The script will overwrite existing files
# Back up important reports before re-running
```

## Development

### Testing

```bash
# Quick test with minimal blocks
python3 warchest_vault.py --blocks 10

# Full integration test
python3 warchest_vault.py --blocks 100 --show-credentials --export test.json
```

### Code Structure

```
warchest_vault.py
├── WarchestVault (class)
│   ├── _generate_vault_credentials()  # HPP-1 key derivation
│   ├── simulate_premine()             # Block mining simulation
│   ├── _mine_block()                  # Individual block processing
│   ├── display_credentials()          # Secure credential display
│   ├── generate_summary_report()      # Statistics generation
│   └── export_to_file()               # JSON export
└── main()                              # CLI interface
```

## License

BSD 3-Clause License

## Author

Travis D. Jones <holedozer@gmail.com>

## Support

For issues or questions:
- GitHub Issues: https://github.com/Holedozer1229/Excalibur-EXS/issues
- Email: holedozer@gmail.com

---

**⚔️ Excalibur $EXS - The Quantum-Hardened Blockchain**

*"In ambiguity, we find certainty. In chaos, we forge order."*
