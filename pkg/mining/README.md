# Excalibur $EXS Mining Kernel

This directory contains the optimized batched/fused mining kernels for Tetra-PoW and dice roll mining operations, plus a research-grade Stratum-compliant mining architecture.

## Overview

### Universal Batched/Fused Kernel (`tetrapow_dice_universal.py`)

The universal batched/fused kernel provides high-performance mining operations through:

- **Batched Processing**: Process multiple mining attempts simultaneously
- **Fused Operations**: Combine multiple hash functions efficiently
- **Bit-Sliced Operations**: Optimize bitwise operations across batches
- **Universal Fusion**: Easy composition of different hash algorithms
- **Modular Design**: Reusable components for all mining workflows

### Stratum Mining Architecture (`stratum_miner.py`)

A production-ready, Stratum-compliant mining control plane that provides:

- **Stratum-Correct Extranonce Handling**: Thread-safe partitioning with no locks
- **Deterministic Nonce Scheduling**: Difficulty-weighted priority scoring
- **SIMD-Friendly Ordering**: Optimized nonce lattice for batch processing
- **Kernel-Agnostic Design**: Integrates with existing Ω′ Δ18 Tetra-PoW kernel
- **Full Taproot Support**: SegWit + Taproot commitment handling

## Performance Benefits

- Reduced function call overhead through batching
- Better CPU cache utilization with contiguous data
- Vectorization opportunities for SIMD operations
- Shared computation across multiple hashes

## Usage

### Stratum Mining (Production)

```python
from pkg.mining.stratum_miner import StratumClient

# Create Stratum client
client = StratumClient(
    host='pool.example.com',
    port=3333,
    user='your_wallet_address',
    num_lanes=4,        # Number of mining threads
    batch_size=256,     # Nonce batch size
    rounds=128          # Tetra-PoW rounds
)

# Start mining
client.start_mining()

# Mine for 60 seconds
import time
time.sleep(60)

# Stop and get stats
client.stop_mining()
stats = client.get_stats()
print(f"Hash rate: {stats['hash_rate']:.2f} H/s")
```

### Direct Kernel Usage

```python
from pkg.mining.tetrapow_dice_universal import UniversalMiningKernel

# Create kernel with batch size
kernel = UniversalMiningKernel(batch_size=32)

# Batch mining
success, nonce, final_hash, round_states = kernel.batch_mine(
    axiom="your axiom here",
    nonce_start=0,
    max_attempts=10000,
    difficulty=4,
    rounds=128
)

# Batched dice rolls
results = kernel.batch_dice_roll_mine(
    server_seed="server_seed",
    client_seeds=["client_1", "client_2", ...],
    nonces=[0, 1, 2, ...]
)
```

### Standalone Functions

```python
from pkg.mining.tetrapow_dice_universal import (
    batch_nonlinear_transform,
    fused_hash_computation,
    batch_verify_difficulty
)

# Use standalone functions without instantiating the class
data_batch = [b'data1', b'data2', b'data3']
results = batch_nonlinear_transform(data_batch, round_num=1)
```

## Integration with Existing Miners

All Python miners have been updated to use this batched/fused kernel:

### TetraPowMiner (`pkg/miner/tetra_pow_miner.py`)
- Uses `UniversalMiningKernel` for batched mining operations
- Configurable batch size via `--batch-size` parameter
- Maintains backward compatibility with existing APIs

### UnifiedMiner (`pkg/miner/unified_miner.py`)
- Integrates batched kernel for all mining workflows
- Enhanced dice roll mining with batch processing
- Configurable batch size for optimal performance

### ProvablyFairDiceMiner (`pkg/miner/provably_fair_dice_miner.py`)
- Uses batched dice roll computation
- Improved performance for large roll counts
- Maintains provable fairness guarantees

## Configuration

### Batch Size Selection

The optimal batch size depends on:
- Available CPU cache size
- Number of CPU cores
- Memory bandwidth

Recommended values:
- **Small systems**: 8-16
- **Medium systems**: 32-64 (default)
- **Large systems**: 64-128

### Fusion Sequences

Customize hash algorithm fusion:

```python
# Default fusion sequence
fusion_sequence = ['sha512', 'sha256', 'blake2b']

# Custom fusion
custom_sequence = ['blake2s', 'sha256', 'sha512']
results = kernel.fused_hash_computation(
    axiom=axiom,
    nonce_start=0,
    count=10,
    fusion_sequence=custom_sequence
)
```

## Migration Notes

### From Single-Hash to Batched

Previous single-hash implementations have been replaced with batched equivalents:

**Before:**
```python
for nonce in range(max_attempts):
    state = transform(state, nonce)
    final_hash = hash_final(state)
    if check_difficulty(final_hash):
        return success
```

**After (Batched):**
```python
success, nonce, hash, states = kernel.batch_mine(
    axiom=axiom,
    nonce_start=0,
    max_attempts=max_attempts,
    difficulty=difficulty
)
```

## Testing

### Test Stratum Miner

```bash
# Quick test with 2 lanes
python3 pkg/mining/stratum_miner.py --lanes 2 --duration 10

# High performance test
python3 pkg/mining/stratum_miner.py --lanes 8 --batch-size 512 --duration 60

# Reduced rounds for faster testing
python3 pkg/mining/stratum_miner.py --lanes 4 --rounds 16 --duration 30
```

### Test Universal Kernel

Run the kernel demo:
```bash
python3 pkg/mining/tetrapow_dice_universal.py
```

Run comprehensive tests:
```bash
python3 -c "from pkg.mining.tetrapow_dice_universal import UniversalMiningKernel; \
kernel = UniversalMiningKernel(batch_size=32); \
print(kernel.get_statistics())"
```

## Stratum Architecture

### Core Components

1. **Nonce Lattice**: Deterministic, mining-aware nonce ordering
2. **Extranonce Allocator**: Thread-safe partitioning with no locks
3. **Batch Generator**: SIMD-friendly nonce batch creation
4. **Coinbase Builder**: Taproot + SegWit support
5. **Header Builder**: Stratum-compatible block headers
6. **Tetra-PoW Integration**: Ω′ Δ18 kernel wire-in point
7. **Target Checker**: Mask-based difficulty verification
8. **Stratum Miner**: Full control plane with thread management
9. **Share Submitter**: JSON-RPC ready (placeholder)

## API Reference

### UniversalMiningKernel

#### `__init__(batch_size: int = 32)`
Initialize the kernel with specified batch size.

#### `batch_mine(...) -> Tuple[bool, Optional[int], Optional[bytes], Optional[List[bytes]]]`
Main batched mining operation.

#### `batch_dice_roll_mine(...) -> List[Tuple[str, int, float, int]]`
Batched dice roll mining using HMAC.

#### `fused_hash_computation(...) -> List[Tuple[int, bytes, List[bytes]]]`
Compute multiple hashes with fused operations.

#### `batch_nonlinear_transform(...) -> List[bytes]`
Apply nonlinear transformation to batch of data.

#### `batch_verify_difficulty(...) -> List[bool]`
Verify difficulty for batch of hashes.

#### `get_statistics() -> dict`
Get kernel performance statistics.

## License

BSD 3-Clause

## Author

Travis D. Jones <holedozer@gmail.com>
