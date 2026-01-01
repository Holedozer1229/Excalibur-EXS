# Excalibur-EXS Miners

This directory contains all mining implementations for the Excalibur-EXS ($EXS) cryptocurrency protocol.

## Overview

The Excalibur-EXS protocol uses the **Ω′ Δ18 Tetra-PoW** consensus mechanism with 128-round nonlinear hash computations and HPP-1 quantum hardening (600,000 PBKDF2-HMAC-SHA512 rounds).

## Available Miners

### 🔨 Tetra-PoW Miner (Go)
**Location:** `tetra-pow-go/`

The primary production miner implementation in Go, offering:
- High-performance CLI mining tool
- HTTP API server for web integration
- Hardware acceleration support
- Multiple optimization modes (power_save, balanced, performance, extreme)

**Quick Start:**
```bash
cd miners/tetra-pow-go
go build -o tetra-pow-miner
./tetra-pow-miner mine --data "Excalibur-EXS" --difficulty 4
```

See [tetra-pow-go/README.md](tetra-pow-go/README.md) for detailed documentation.

### 🐍 Tetra-PoW Miner (Python)
**Location:** `tetra-pow-python/`

Python implementation of the Tetra-PoW algorithm, featuring:
- Batched/fused mining kernel for improved performance
- Educational reference implementation
- Easy to modify and experiment with
- Integration with universal mining library

**Quick Start:**
```bash
cd miners/tetra-pow-python
python3 tetra_pow_miner.py --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

See [tetra-pow-python/README.md](tetra-pow-python/README.md) for detailed documentation.

### 🎲 Dice Miner
**Location:** `dice-miner/`

Probabilistic dice-roll mining with provably fair cryptography:
- HMAC-SHA512 based dice rolls
- Server seed + Client seed + Nonce system
- Provably fair verification
- Taproot address integration

**Quick Start:**
```bash
cd miners/dice-miner
python3 dice_roll_miner.py mine --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

See [dice-miner/README.md](dice-miner/README.md) for detailed documentation.

### 🌐 Universal Miner
**Location:** `universal-miner/`

Unified mining interface combining multiple mining strategies:
- Solo mining on Excalibur $EXS
- Merge mining with Bitcoin/Litecoin/Dogecoin
- Lightning Network routing integration
- Dice roll probabilistic mining
- CPU-optimized algorithms

**Quick Start:**
```bash
cd miners/universal-miner
python3 unified_miner.py solo --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
```

See [universal-miner/README.md](universal-miner/README.md) for detailed documentation.

### 📚 Shared Mining Library
**Location:** `lib/`

Common mining utilities and kernels used across all miners:
- Universal batched/fused mining kernel (`tetrapow_dice_universal.py`)
- Stratum mining architecture (`stratum_miner.py`)
- High-performance batch processing
- SIMD-friendly operations

See [lib/README.md](lib/README.md) for API reference.

## Mining Modes Comparison

| Feature | Tetra-PoW Go | Tetra-PoW Python | Dice Miner | Universal Miner |
|---------|--------------|------------------|------------|-----------------|
| **Performance** | ⚡⚡⚡ Highest | ⚡⚡ High | ⚡ Medium | ⚡⚡ High |
| **Ease of Use** | ⭐⭐⭐ Easy | ⭐⭐⭐⭐ Very Easy | ⭐⭐⭐⭐ Very Easy | ⭐⭐⭐ Easy |
| **Hardware Accel** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Production Ready** | ✅ Yes | ⚠️ Reference | ⚠️ Experimental | ⚠️ Experimental |
| **Web Integration** | ✅ HTTP API | ✅ Direct Import | ✅ Direct Import | ✅ Direct Import |
| **Merge Mining** | ❌ No | ❌ No | ❌ No | ✅ Yes |

## Choosing a Miner

- **For production mining:** Use **Tetra-PoW Go** for maximum performance
- **For development/testing:** Use **Tetra-PoW Python** for easy modification
- **For gaming/lottery:** Use **Dice Miner** for provably fair rolls
- **For multi-chain mining:** Use **Universal Miner** for merge mining support

## Architecture

```
miners/
├── tetra-pow-go/          # Go production miner
│   ├── main.go            # CLI entry point
│   ├── miner.go           # Core mining engine
│   └── config.go          # Configuration
├── tetra-pow-python/      # Python reference miner
│   └── tetra_pow_miner.py # Main implementation
├── dice-miner/            # Dice roll miner
│   ├── dice_roll_miner.py # Simple dice miner
│   └── provably_fair_dice_miner.py # Provably fair implementation
├── universal-miner/       # Multi-strategy miner
│   ├── unified_miner.py   # Main unified interface
│   └── btc_faucet.py      # BTC faucet integration
└── lib/                   # Shared libraries
    ├── tetrapow_dice_universal.py # Universal kernel
    ├── stratum_miner.py   # Stratum protocol
    └── __init__.py        # Package initialization
```

## Contributing New Miners

We welcome contributions of new consensus engines and mining implementations! To contribute:

1. **Create a new directory** under `miners/` with a descriptive name
2. **Add a README.md** explaining:
   - Purpose and use case
   - Algorithm description
   - Installation instructions
   - Usage examples
   - Performance characteristics
3. **Follow the existing structure:**
   - Entry point script or main file
   - Configuration handling
   - CLI interface (if applicable)
   - API interface (if applicable)
4. **Integration requirements:**
   - Must work with the canonical 13-word axiom
   - Must support configurable difficulty
   - Must output compatible vault addresses (P2TR)
   - Must integrate with treasury allocation (15% of rewards)
5. **Documentation:**
   - Code comments explaining algorithm
   - Usage examples
   - Performance benchmarks
6. **Testing:**
   - Include basic test/benchmark functionality
   - Verify against known good hashes

### Consensus Engine Guidelines

When implementing a new consensus mechanism:

- **Preserve the core principles:** Quantum hardening, Taproot compatibility
- **Maintain compatibility:** Work with existing treasury and vault systems
- **Document thoroughly:** Explain the algorithm, security properties, and trade-offs
- **Benchmark performance:** Provide hashrate estimates and optimization guidance
- **Consider hardware:** Document CPU, memory, and storage requirements

## Integration with Excalibur-EXS

All miners integrate with the core Excalibur-EXS infrastructure:

- **Treasury System:** `pkg/economy/treasury.go` - Automatic 15% allocation
- **Forge API:** `cmd/forge-api/app.py` - HTTP API for web integration
- **Web UI:** `web/knights-round-table/` - Browser-based mining interface
- **Admin Dashboard:** `admin/merlins-portal/` - Mining statistics and monitoring
- **Rosetta API:** `cmd/rosetta/` - Exchange integration support

## Performance Tuning

### Go Miner Optimization
```bash
# Adjust worker threads
./tetra-pow-miner mine --workers 8

# Set optimization mode
./tetra-pow-miner mine --optimization extreme
```

### Python Miner Optimization
```bash
# Adjust batch size
python3 tetra_pow_miner.py --batch-size 64

# Use Stratum miner for production
python3 lib/stratum_miner.py --lanes 8 --batch-size 512
```

## Troubleshooting

### Import Errors
If you encounter import errors when running Python miners, ensure you're in the repository root:
```bash
cd /path/to/Excalibur-EXS
PYTHONPATH=. python3 miners/tetra-pow-python/tetra_pow_miner.py --axiom "..."
```

### Performance Issues
- **Go Miner:** Try different optimization modes and worker counts
- **Python Miner:** Adjust batch size based on available memory
- **Hardware:** Check CPU usage and thermal throttling

### Difficulty Not Met
- Lower the difficulty: `--difficulty 3` (default is 4)
- Increase max attempts: `--max-attempts 10000000`
- Use hardware acceleration (Go miner only)

## License

All miners are licensed under the BSD 3-Clause License. See [LICENSE](../LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email:** holedozer@gmail.com
- **Documentation:** [Main README](../README.md)

---

⚔️ **"In ambiguity, we find certainty. In chaos, we forge order."**
