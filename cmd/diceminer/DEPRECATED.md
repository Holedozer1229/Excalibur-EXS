# DEPRECATED

This directory has been moved to `miners/dice-miner/` for better organization.

## New Location

All mining implementations are now consolidated in the `miners/` directory:

**This miner:** `miners/dice-miner/`

## Migration Guide

### Old Command
```bash
cd cmd/diceminer
python3 dice_roll_miner.py mine --axiom "..."
```

### New Command
```bash
cd miners/dice-miner
python3 dice_roll_miner.py mine --axiom "..."
```

Or with PYTHONPATH from repository root:
```bash
PYTHONPATH=. python3 miners/dice-miner/dice_roll_miner.py mine --axiom "..."
```

## Why This Change?

The mining code refactoring provides:

1. **Better Organization:** All miners in one place (`miners/`)
2. **Clear Separation:** Each miner type has its own directory with documentation
3. **Easy Discovery:** New contributors can easily find and understand mining options
4. **Improved Documentation:** Each miner directory has comprehensive README
5. **Consistent Structure:** Standard layout for contributing new consensus engines

## Backward Compatibility

This directory is kept for backward compatibility but may be removed in a future release. Please update your scripts and workflows to use the new `miners/` directory structure.

See [`miners/dice-miner/README.md`](../../miners/dice-miner/README.md) for detailed documentation on the dice miner, including the provably fair implementation.
