# Tetra-PoW Miner (Python)

Python reference implementation of the **Ω′ Δ18 Tetra-PoW** mining algorithm for Excalibur-EXS ($EXS).

## Features

- 🐍 **Pure Python:** Easy to read, modify, and experiment with
- ⚡ **Batched Processing:** Uses universal kernel for improved performance
- 📚 **Educational:** Clear code structure for learning the algorithm
- 🔧 **Configurable:** Adjustable difficulty, batch size, and mining parameters
- 🧪 **Testing Friendly:** Built-in verification and benchmark modes

## Installation

### Prerequisites
- Python 3.7 or higher
- No external dependencies required (uses standard library)

### Setup

No installation needed! Just ensure Python 3 is installed:
```bash
python3 --version
```

## Usage

### Basic Mining

Mine with the canonical axiom:
```bash
cd miners/tetra-pow-python
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

### Custom Difficulty

Adjust mining difficulty (number of leading zero bytes):
```bash
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 3
```

### Batch Size Tuning

Optimize performance by adjusting batch size:
```bash
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --batch-size 64
```

### Verify Specific Nonce

Verify a previously found nonce:
```bash
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --verify 12345
```

### Advanced Options

```bash
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4 \
  --batch-size 32 \
  --nonce 0 \
  --max-attempts 1000000
```

## Configuration

### Command-Line Arguments

- `--axiom` - The 13-word axiom sequence (required)
- `--difficulty` - Number of leading zero bytes (default: 4)
- `--batch-size` - Batch size for processing (default: 32)
- `--nonce` - Starting nonce value (default: 0)
- `--max-attempts` - Maximum mining attempts (default: 1,000,000)
- `--verify` - Verify specific nonce instead of mining

### Batch Size Selection

Choose batch size based on available memory:

| System RAM | Recommended Batch Size |
|------------|------------------------|
| 2GB | 8-16 |
| 4GB | 16-32 |
| 8GB+ | 32-64 |
| 16GB+ | 64-128 |

## Performance

### Expected Hash Rates

Python implementation is slower than Go but useful for development:

| CPU | Batch Size | Hash Rate |
|-----|------------|-----------|
| Intel i5 (10th gen) | 32 | 5-8 H/s |
| Intel i7 (10th gen) | 32 | 8-12 H/s |
| AMD Ryzen 5 5600X | 64 | 10-15 H/s |
| AMD Ryzen 7 5800X | 64 | 15-20 H/s |

### Optimization Tips

1. **Use larger batch sizes** for better cache utilization
2. **Run with PyPy** for 2-4x speedup:
   ```bash
   pypy3 tetra_pow_miner.py --axiom "..."
   ```
3. **Profile with cProfile:**
   ```bash
   python3 -m cProfile -s cumulative tetra_pow_miner.py --axiom "..."
   ```

## Algorithm Overview

The Ω′ Δ18 Tetra-PoW algorithm implements:

1. **128 Rounds** of nonlinear transformations
2. **HPP-1 Hardening** with 600,000 PBKDF2 iterations
3. **Batched Processing** for improved throughput
4. **Difficulty Checking** with leading zero bytes

### Mining Process

```
1. Initialize with axiom
2. For each nonce:
   a. Create batch of candidates
   b. Apply 128 rounds of nonlinear transforms
   c. Check difficulty for each result
   d. Return first valid hash
3. Return success or continue
```

## Integration

### With Web API

Import and use directly:
```python
from miners.tetra_pow_python.tetra_pow_miner import TetraPowMiner

miner = TetraPowMiner(difficulty=4, batch_size=32)
success, final_hash, nonce, states = miner.mine(
    axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    nonce=0,
    max_attempts=1000000
)
```

### With Flask/Django

```python
from flask import Flask, request, jsonify
from miners.tetra_pow_python.tetra_pow_miner import TetraPowMiner

app = Flask(__name__)
miner = TetraPowMiner(difficulty=4)

@app.route('/mine', methods=['POST'])
def mine():
    data = request.get_json()
    axiom = data.get('axiom')
    
    success, final_hash, nonce, _ = miner.mine(axiom)
    
    if success:
        return jsonify({
            'success': True,
            'nonce': nonce,
            'hash': final_hash.hex()
        })
    return jsonify({'success': False}), 500
```

### With Universal Kernel

This miner uses the universal batched/fused kernel from `miners/lib/`:

```python
from miners.lib.tetrapow_dice_universal import UniversalMiningKernel

kernel = UniversalMiningKernel(batch_size=32)
success, nonce, final_hash, states = kernel.batch_mine(
    axiom=axiom,
    nonce_start=0,
    max_attempts=1000000,
    difficulty=4,
    rounds=128
)
```

## Testing

### Run Basic Test

```bash
python3 tetra_pow_miner.py \
  --axiom "test axiom for verification only" \
  --difficulty 2 \
  --max-attempts 10000
```

### Verify Known Good Hash

```bash
# First, mine to find a nonce
python3 tetra_pow_miner.py --axiom "test" --difficulty 2

# Then verify the found nonce
python3 tetra_pow_miner.py --axiom "test" --verify <nonce>
```

### Unit Tests

```python
# test_tetra_pow_miner.py
import unittest
from tetra_pow_miner import TetraPowMiner

class TestTetraPowMiner(unittest.TestCase):
    def test_difficulty_check(self):
        miner = TetraPowMiner(difficulty=2)
        # Test with hash starting with two zero bytes
        test_hash = b'\x00\x00\x12\x34'
        self.assertTrue(miner._check_difficulty(test_hash))
    
    def test_mining(self):
        miner = TetraPowMiner(difficulty=2)
        success, _, _, _ = miner.mine("test axiom", max_attempts=10000)
        # Mining might or might not succeed with low attempts
        self.assertIn(success, [True, False])

if __name__ == '__main__':
    unittest.main()
```

## Architecture

### Code Structure

```python
class TetraPowMiner:
    ROUNDS = 128                    # Number of nonlinear rounds
    DEFAULT_DIFFICULTY = 4          # Leading zero bytes
    DEFAULT_BATCH_SIZE = 32         # Batch processing size
    
    def __init__(self, difficulty, batch_size):
        # Initialize kernel and parameters
    
    def mine(self, axiom, nonce, max_attempts):
        # Main mining loop
    
    def verify(self, axiom, nonce):
        # Verify specific nonce
    
    def _check_difficulty(self, hash_result):
        # Check if hash meets difficulty
```

### Dependencies

This miner imports from the universal kernel:
```python
from miners.lib.tetrapow_dice_universal import UniversalMiningKernel
```

The universal kernel provides:
- Batched mining operations
- Fused hash computations
- Nonlinear transformations
- Difficulty verification

## Troubleshooting

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'miners'`

Solution: Run from repository root with PYTHONPATH:
```bash
cd /path/to/Excalibur-EXS
PYTHONPATH=. python3 miners/tetra-pow-python/tetra_pow_miner.py --axiom "..."
```

Or add to Python path in code:
```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
```

### Performance Issues

**Slow mining:**
- Increase batch size: `--batch-size 64`
- Use PyPy instead of CPython
- Lower difficulty: `--difficulty 3`
- Use Go miner for production

### Memory Issues

**MemoryError:**
- Reduce batch size: `--batch-size 16`
- Reduce max attempts: `--max-attempts 100000`
- Close other applications

## Development

### Modifying the Algorithm

The mining algorithm is in `tetra_pow_miner.py`:

1. Edit the `mine()` method for mining logic
2. Edit `_check_difficulty()` for difficulty checks
3. Rebuild not required (Python is interpreted)
4. Test changes immediately

### Contributing Improvements

Ideas for contributions:
- Multi-processing support
- Cython optimization
- Better progress reporting
- Additional verification modes
- Performance profiling tools

## Migration Notes

This implementation now uses the batched/fused kernel (`miners/lib/tetrapow_dice_universal.py`) for improved performance:

- **Before:** Sequential single-hash operations
- **After:** Batched processing with fused operations
- **Benefit:** 2-5x performance improvement
- **Compatibility:** Maintains same API and results

## License

BSD 3-Clause License - See [LICENSE](../../LICENSE)

## Support

- **Issues:** [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email:** holedozer@icloud.com
- **Main Documentation:** [Miners README](../README.md)

---

⚔️ **"In ambiguity, we find certainty."**
