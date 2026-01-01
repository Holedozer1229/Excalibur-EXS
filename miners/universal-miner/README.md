# Universal Miner

Unified mining interface combining multiple mining strategies for Excalibur-EXS ($EXS).

## Features

- ⚡ **Solo Mining:** Pure EXS Tetra-PoW mining
- 🔗 **Merge Mining:** Simultaneous mining on BTC, LTC, DOGE chains
- ⚡ **Lightning Network:** Route optimization and fee routing
- 🎲 **Dice Roll Mining:** Probabilistic mining with batched processing
- 🔧 **Unified Interface:** Single API for all mining operations
- 📊 **Statistics:** Comprehensive mining statistics across all modes

## Installation

### Prerequisites
- Python 3.7 or higher
- Standard library only (optional: requests for API calls)

### Setup

```bash
cd miners/universal-miner
# No installation needed!
```

## Usage

### Solo Mining (EXS Only)

Mine EXS using Tetra-PoW:
```bash
python3 unified_miner.py solo \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4
```

### Merge Mining

Mine EXS + Bitcoin simultaneously:
```bash
python3 unified_miner.py merge \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --chains BTC,LTC \
  --difficulty 4
```

Mine all supported chains:
```bash
python3 unified_miner.py merge \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --chains BTC,LTC,DOGE \
  --difficulty 4
```

### Lightning Network Integration

Optimize Lightning Network routes:
```bash
python3 unified_miner.py lightning \
  --source node1 \
  --destination node2 \
  --amount 1000000
```

### Dice Roll Mining

Probabilistic mining with dice:
```bash
python3 unified_miner.py dice \
  --server-seed "server123" \
  --client-seed "client456" \
  --target 90 \
  --rounds 100
```

### Combined Mining

Run all mining modes simultaneously:
```bash
python3 unified_miner.py all \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --chains BTC,LTC \
  --difficulty 4
```

## Configuration

### Command-Line Options

#### `solo` command
- `--axiom` - 13-word Arthurian axiom (required)
- `--difficulty` - Mining difficulty (default: 4)
- `--batch-size` - Batch size for processing (default: 32)
- `--max-attempts` - Maximum mining attempts (default: 1,000,000)

#### `merge` command
- `--axiom` - 13-word Arthurian axiom (required)
- `--chains` - Comma-separated chain list: BTC,LTC,DOGE (required)
- `--difficulty` - Mining difficulty (default: 4)
- `--batch-size` - Batch size (default: 32)

#### `lightning` command
- `--source` - Source Lightning node
- `--destination` - Destination node
- `--amount` - Amount in millisatoshis
- `--max-fee` - Maximum fee in millisatoshis

#### `dice` command
- `--server-seed` - Server seed for provably fair rolls
- `--client-seed` - Client seed
- `--target` - Target roll value (0-99)
- `--rounds` - Number of rolls to attempt

#### `all` command
Combines options from all modes above.

## Mining Modes

### Solo Mining

Pure Excalibur-EXS mining:
- Uses Tetra-PoW algorithm
- 128 nonlinear rounds
- HPP-1 quantum hardening
- Batched processing for performance

**Best for:** Maximum EXS rewards, simplicity

### Merge Mining

Simultaneous mining on multiple chains:
- Mine EXS + auxiliary chains (BTC, LTC, DOGE)
- Share computational work across chains
- Increased total rewards
- No performance penalty

**How it works:**
1. Compute Tetra-PoW hash for EXS
2. Use same work for auxiliary chain hashes
3. Submit valid blocks to all chains
4. Collect rewards from multiple chains

**Best for:** Maximizing total cryptocurrency rewards

### Lightning Network Routing

Optimize Lightning Network operations:
- Find optimal payment routes
- Minimize fees
- Maximize successful routing
- Earn routing fees

**Integration with mining:**
- Route mining rewards through Lightning
- Collect routing fees as additional income
- Support network decentralization

**Best for:** Fast transactions, low fees, routing income

### Dice Roll Mining

Probabilistic mining with fairness guarantees:
- HMAC-based provably fair system
- Batched dice roll computation
- Configurable target values
- Cryptographic verification

**Best for:** Gaming, experimental consensus, educational use

## Performance

### Hash Rates by Mode

| Mode | Hash Rate | Rewards |
|------|-----------|---------|
| Solo | 10-15 H/s | EXS only |
| Merge (BTC) | 10-15 H/s | EXS + BTC |
| Merge (BTC+LTC) | 10-15 H/s | EXS + BTC + LTC |
| Merge (All) | 10-15 H/s | EXS + BTC + LTC + DOGE |
| Dice | 5,000-10,000 H/s | EXS (probabilistic) |

Note: Merge mining maintains same hash rate while earning from multiple chains!

### Resource Usage

| Mode | CPU | Memory | Network |
|------|-----|--------|---------|
| Solo | Medium | 200MB | Low |
| Merge | Medium | 300MB | Medium |
| Lightning | Low | 100MB | High |
| Dice | High | 150MB | Low |
| All | High | 500MB | High |

## Integration

### Python API

```python
from unified_miner import UnifiedMiner, MiningMode

# Initialize miner
miner = UnifiedMiner(
    axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    difficulty=4
)

# Solo mining
result = miner.solo_mine(max_attempts=100000)
print(f"Success: {result.success}, Nonce: {result.nonce}")

# Merge mining
results = miner.merge_mine(
    chains=['BTC', 'LTC'],
    max_attempts=100000
)
for chain, result in results.items():
    print(f"{chain}: {result.success}")

# Lightning routing
route = miner.optimize_lightning_route(
    source="node1",
    destination="node2",
    amount_msat=1000000
)
print(f"Route: {route.hops}, Fee: {route.fee_msat}")

# Dice mining
dice_result = miner.dice_mine(
    server_seed="server123",
    client_seed="client456",
    target=90,
    rounds=100
)
print(f"Rolls: {dice_result.successful_rolls}")
```

### Flask API

```python
from flask import Flask, request, jsonify
from unified_miner import UnifiedMiner

app = Flask(__name__)

@app.route('/mine/solo', methods=['POST'])
def mine_solo():
    data = request.get_json()
    miner = UnifiedMiner(axiom=data['axiom'], difficulty=4)
    result = miner.solo_mine()
    return jsonify(asdict(result))

@app.route('/mine/merge', methods=['POST'])
def mine_merge():
    data = request.get_json()
    miner = UnifiedMiner(axiom=data['axiom'], difficulty=4)
    results = miner.merge_mine(chains=data.get('chains', ['BTC']))
    return jsonify({k: asdict(v) for k, v in results.items()})

@app.route('/lightning/route', methods=['POST'])
def optimize_route():
    data = request.get_json()
    miner = UnifiedMiner()
    route = miner.optimize_lightning_route(
        source=data['source'],
        destination=data['destination'],
        amount_msat=data['amount']
    )
    return jsonify(asdict(route))
```

### Web Dashboard

```javascript
// Mine across multiple chains
async function mineMultiChain(axiom, chains) {
  const response = await fetch('/mine/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ axiom, chains })
  });
  return await response.json();
}

// Optimize Lightning route
async function optimizeRoute(source, dest, amount) {
  const response = await fetch('/lightning/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      source, 
      destination: dest, 
      amount 
    })
  });
  return await response.json();
}
```

## Architecture

### Components

```
UnifiedMiner
├── TetraPowMiner      # Core EXS mining
├── BTCFaucet          # BTC integration
├── UniversalKernel    # Batched processing
├── LightningRouter    # Lightning Network
└── DiceEngine         # Dice roll mining
```

### Mining Workflow

```
1. Initialize UnifiedMiner with configuration
2. Select mining mode(s)
3. For each mode:
   a. Prepare mining context
   b. Execute mining algorithm
   c. Collect results
   d. Update statistics
4. Aggregate results across all modes
5. Return unified mining report
```

## BTC Faucet Integration

The universal miner includes BTC faucet functionality:

```python
from btc_faucet import BTCFaucet

faucet = BTCFaucet()

# Claim from faucet
result = faucet.claim(address="bc1p...")
print(f"Claimed: {result['amount']} BTC")

# Check balance
balance = faucet.get_balance(address="bc1p...")
print(f"Balance: {balance}")
```

Features:
- Automatic BTC claiming from faucets
- Balance tracking
- Rate limiting
- Multiple faucet support

## Advanced Usage

### Custom Mining Strategy

```python
from unified_miner import UnifiedMiner, MiningMode

class CustomMiner(UnifiedMiner):
    def custom_strategy(self):
        # Start with merge mining
        merge_results = self.merge_mine(chains=['BTC', 'LTC'])
        
        # If successful, optimize Lightning route
        if merge_results['EXS'].success:
            route = self.optimize_lightning_route(
                source="self",
                destination="exchange",
                amount_msat=50_000_000
            )
            
        # Run dice mining in parallel
        dice_result = self.dice_mine(
            server_seed="seed",
            client_seed="client",
            target=95,
            rounds=1000
        )
        
        return {
            'merge': merge_results,
            'lightning': route,
            'dice': dice_result
        }

miner = CustomMiner(axiom="...", difficulty=4)
results = miner.custom_strategy()
```

### Multi-threaded Mining

```python
import threading
from unified_miner import UnifiedMiner

def mine_thread(axiom, mode, results):
    miner = UnifiedMiner(axiom=axiom, difficulty=4)
    if mode == 'solo':
        results[mode] = miner.solo_mine()
    elif mode == 'merge':
        results[mode] = miner.merge_mine(chains=['BTC', 'LTC'])

results = {}
threads = []

# Start parallel mining
for mode in ['solo', 'merge']:
    t = threading.Thread(target=mine_thread, args=(axiom, mode, results))
    threads.append(t)
    t.start()

# Wait for completion
for t in threads:
    t.join()

print(f"Results: {results}")
```

## Statistics and Monitoring

### Get Mining Statistics

```python
stats = miner.get_statistics()
print(f"Total hash rate: {stats['total_hashrate']} H/s")
print(f"EXS mined: {stats['exs_mined']}")
print(f"BTC mined: {stats['btc_mined']}")
print(f"Success rate: {stats['success_rate']}%")
```

### Track Performance

```python
import time

start = time.time()
result = miner.solo_mine(max_attempts=100000)
elapsed = time.time() - start

print(f"Time: {elapsed:.2f}s")
print(f"Hash rate: {result.attempts / elapsed:.2f} H/s")
print(f"Efficiency: {result.attempts / elapsed / 1000:.2f} KH/s")
```

## Troubleshooting

### Import Errors

Run from repository root:
```bash
cd /path/to/Excalibur-EXS
PYTHONPATH=. python3 miners/universal-miner/unified_miner.py solo --axiom "..."
```

### Merge Mining Not Working

Ensure auxiliary chain nodes are accessible:
- Bitcoin Core running on localhost:8332
- Litecoin Core running on localhost:9332
- Check firewall settings

### Lightning Routing Failures

Verify Lightning Network setup:
- LND or c-lightning running
- Sufficient channel capacity
- Network connectivity

### Low Hash Rate

Optimize performance:
- Increase batch size: `--batch-size 64`
- Reduce difficulty: `--difficulty 3`
- Use fewer chains for merge mining
- Close unnecessary applications

## Development

### Adding New Mining Modes

1. Create new mining class
2. Implement mining algorithm
3. Add to UnifiedMiner
4. Update CLI commands
5. Document usage

Example:
```python
class NewMiningMode:
    def mine(self, axiom, difficulty):
        # Implement algorithm
        pass

# Add to UnifiedMiner
class UnifiedMiner:
    def new_mode_mine(self):
        mode = NewMiningMode()
        return mode.mine(self.axiom, self.difficulty)
```

## License

BSD 3-Clause License - See [LICENSE](../../LICENSE)

## Support

- **Issues:** [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email:** holedozer@gmail.com
- **Main Documentation:** [Miners README](../README.md)

---

🌐 **"United in mining, diverse in strategy."**
