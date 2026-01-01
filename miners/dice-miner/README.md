# Dice Miner

Probabilistic dice-roll mining with provably fair cryptography for Excalibur-EXS ($EXS).

## Features

- 🎲 **Probabilistic Mining:** Dice roll mechanism affects mining success
- 🔒 **Provably Fair:** HMAC-SHA512 based verification
- 🎯 **Deterministic:** Server seed + Client seed + Nonce system
- 🏦 **Taproot Integration:** P2TR vault address generation
- ✅ **Cryptographic Proof:** Complete audit trail for fairness

## Implementations

This directory contains two dice miner implementations:

### 1. Simple Dice Miner (`dice_roll_miner.py`)
Basic probabilistic mining with dice rolls affecting hash difficulty.

### 2. Provably Fair Dice Miner (`provably_fair_dice_miner.py`)
Advanced implementation with cryptographic fairness guarantees and Taproot integration.

## Installation

### Prerequisites
- Python 3.7 or higher
- Standard library only (no external dependencies)

### Setup

```bash
cd miners/dice-miner
# No installation needed!
```

## Usage

### Simple Dice Miner

Basic mining with dice probability:
```bash
python3 dice_roll_miner.py mine \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

Benchmark performance:
```bash
python3 dice_roll_miner.py benchmark --rounds 1000
```

Get mining statistics:
```bash
python3 dice_roll_miner.py stats
```

Custom configuration:
```bash
python3 dice_roll_miner.py mine \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 3 \
  --nonce 0 \
  --treasury http://localhost:8080 \
  --rosetta http://localhost:8081
```

### Provably Fair Dice Miner

Generate provably fair roll:
```bash
python3 provably_fair_dice_miner.py roll \
  --server-seed "server_secret_12345" \
  --client-seed "client_public_abc" \
  --nonce 0
```

Verify a roll:
```bash
python3 provably_fair_dice_miner.py verify \
  --server-seed "server_secret_12345" \
  --client-seed "client_public_abc" \
  --nonce 0 \
  --expected-roll 42
```

Batch roll generation:
```bash
python3 provably_fair_dice_miner.py batch \
  --server-seed "server_secret" \
  --client-seeds "seed1,seed2,seed3" \
  --nonces "0,1,2" \
  --count 10
```

## Configuration

### Simple Dice Miner Options

- `--axiom` - 13-word Arthurian axiom
- `--difficulty` - Mining difficulty (default: 4)
- `--nonce` - Starting nonce (default: 0)
- `--rounds` - Benchmark rounds (default: 1000)
- `--treasury` - Treasury API URL
- `--rosetta` - Rosetta API URL

### Provably Fair Miner Options

- `--server-seed` - Server's secret seed
- `--client-seed` - Client's public seed
- `--nonce` - Nonce value for this roll
- `--expected-roll` - Expected roll value for verification
- `--client-seeds` - Comma-separated client seeds for batch
- `--nonces` - Comma-separated nonces for batch
- `--count` - Number of rolls to generate

## How It Works

### Simple Dice Roll Mining

1. **Initialize** with hashed axiom as entropy seed
2. **Roll dice** (d100, 0-99) using deterministic RNG
3. **Apply boost** if roll is high (≥95)
   - High rolls reduce effective difficulty
   - Makes finding valid blocks easier
4. **Check hash** against difficulty target
5. **Generate vault** if successful

### Provably Fair System

1. **Server generates** secret seed (kept private until reveal)
2. **Client provides** public seed
3. **Combine** server seed + client seed + nonce
4. **Compute HMAC-SHA512** of combination
5. **Convert** HMAC to roll value (0-99 or 0-9999)
6. **Later verify** by revealing server seed

This ensures:
- Server cannot manipulate rolls (committed to seed before client seed)
- Client cannot manipulate rolls (server seed unknown)
- Anyone can verify fairness (reveal server seed after)

## Integration

### With Web Application

```javascript
// Frontend: Generate client seed
const clientSeed = generateRandomSeed();

// Backend: Dice miner provides server seed hash
const serverSeedHash = diceMiner.getServerSeedHash();

// Show hash to client BEFORE roll
console.log('Server Seed Hash:', serverSeedHash);

// Perform roll
const result = diceMiner.roll(clientSeed, nonce);

// After roll: reveal server seed for verification
const serverSeed = diceMiner.revealServerSeed();
```

### With Flask API

```python
from flask import Flask, request, jsonify
from dice_roll_miner import DiceRollMiner

app = Flask(__name__)
miner = DiceRollMiner(axiom="...", difficulty=4)

@app.route('/mine', methods=['POST'])
def mine():
    data = request.get_json()
    nonce = data.get('nonce', 0)
    
    result = miner.mine(nonce)
    return jsonify(result)

@app.route('/stats', methods=['GET'])
def stats():
    return jsonify(miner.get_stats())
```

### With Provably Fair System

```python
from provably_fair_dice_miner import ProvablyFairDiceMiner

miner = ProvablyFairDiceMiner()

# Generate server seed (keep secret)
server_seed = miner.generate_server_seed()
server_seed_hash = miner.hash_server_seed(server_seed)

# Show hash to client
print(f"Server Seed Hash: {server_seed_hash}")

# Client provides seed
client_seed = input("Enter your client seed: ")

# Perform roll
result = miner.roll(server_seed, client_seed, nonce=0)
print(f"Roll: {result.roll_number}")

# Reveal server seed for verification
print(f"Server Seed: {server_seed}")
```

## Probability Model

### Dice Roll Distribution

| Roll Range | Frequency | Effect |
|------------|-----------|--------|
| 0-89 | 90% | Normal difficulty |
| 90-94 | 5% | Same difficulty |
| 95-99 | 5% | Reduced difficulty (-1) |

### Mining Success Rates

With difficulty 4 and 10,000 attempts:

| Dice Roll Luck | Expected Success Rate |
|----------------|----------------------|
| Average (no boost) | ~1-5% |
| Good luck (90+) | ~3-8% |
| Excellent luck (95+) | ~8-15% |

## Performance

### Expected Hash Rates

| CPU | Hash Rate (Simple) | Hash Rate (Provably Fair) |
|-----|-------------------|---------------------------|
| Intel i5 | 8,000-10,000 H/s | 5,000-7,000 H/s |
| Intel i7 | 12,000-15,000 H/s | 8,000-10,000 H/s |
| AMD Ryzen 5 | 10,000-12,000 H/s | 7,000-9,000 H/s |
| AMD Ryzen 7 | 15,000-18,000 H/s | 10,000-12,000 H/s |

Note: Dice miners are faster than Tetra-PoW but have probabilistic success.

## Use Cases

### Gaming and Lottery

Perfect for blockchain-based games:
- Transparent dice rolls
- Provably fair loot boxes
- Verifiable random events
- Tamper-proof gambling

### Experimental Mining

Alternative consensus testing:
- Probability-based PoW
- Luck-based block selection
- Research into alternative consensus

### Educational

Learn about:
- Provably fair systems
- HMAC-based randomness
- Cryptographic commitments
- Deterministic RNG

## Testing

### Test Simple Miner

```bash
# Quick test with lower difficulty
python3 dice_roll_miner.py mine --axiom "test" --difficulty 2

# Benchmark
python3 dice_roll_miner.py benchmark --rounds 100
```

### Test Provably Fair Miner

```bash
# Generate a roll
python3 provably_fair_dice_miner.py roll \
  --server-seed "test123" \
  --client-seed "abc" \
  --nonce 0

# Verify the same roll
python3 provably_fair_dice_miner.py verify \
  --server-seed "test123" \
  --client-seed "abc" \
  --nonce 0 \
  --expected-roll 42
```

### Unit Tests

```python
import unittest
from provably_fair_dice_miner import ProvablyFairDiceMiner

class TestProvablyFair(unittest.TestCase):
    def test_deterministic(self):
        miner = ProvablyFairDiceMiner()
        
        # Same inputs = same outputs
        roll1 = miner.roll("server", "client", 0)
        roll2 = miner.roll("server", "client", 0)
        
        self.assertEqual(roll1.roll_number, roll2.roll_number)
    
    def test_different_nonces(self):
        miner = ProvablyFairDiceMiner()
        
        # Different nonces = different outputs
        roll1 = miner.roll("server", "client", 0)
        roll2 = miner.roll("server", "client", 1)
        
        self.assertNotEqual(roll1.roll_number, roll2.roll_number)
```

## Security Considerations

### Server Seed Management

- Generate cryptographically secure seeds
- Keep server seeds secret until reveal
- Rotate seeds regularly (daily/weekly)
- Store seeds securely (encrypted database)

### Preventing Manipulation

- Commit to server seed hash before client input
- Use nonces to prevent replay attacks
- Timestamp all rolls
- Log all operations for audit

### Best Practices

```python
import secrets

# Generate secure server seed
server_seed = secrets.token_hex(32)

# Hash before revealing to client
server_seed_hash = hashlib.sha256(server_seed.encode()).hexdigest()

# Only reveal after roll completes
```

## Troubleshooting

### Import Errors

Run from repository root:
```bash
cd /path/to/Excalibur-EXS
PYTHONPATH=. python3 miners/dice-miner/dice_roll_miner.py mine --axiom "..."
```

### Verification Failures

Ensure exact same inputs:
- Same server seed (character-for-character)
- Same client seed
- Same nonce value
- Check for extra spaces or newlines

### Low Success Rate

This is expected! Dice mining is probabilistic:
- Lower difficulty: `--difficulty 3`
- More attempts needed than Tetra-PoW
- Success depends on dice roll luck

## License

BSD 3-Clause License - See [LICENSE](../../LICENSE)

## Support

- **Issues:** [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email:** holedozer@gmail.com
- **Main Documentation:** [Miners README](../README.md)

---

🎲 **"Fortune favors the bold, and the verifiable."**
