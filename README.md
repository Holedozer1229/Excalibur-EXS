# Excalibur-EXS

> Refactored to use TreasuryVault API and updated Foundry/Miner interfaces as of Dec 2025

## Overview
- All former `Treasury` references are now `TreasuryVault` (struct, method, construction, usage).
- All Go code, CLI tools, demos, and tests updated to use `NewTreasuryVault` and new receiver signatures.
- All Python scripts/tests updated for current `ExsFoundry` and `TetraPowMiner` APIs with updated imports and `process_forge(miner_address=..., ...)` usage.

## Go Example
```go
import "excalibur-exs/pkg/economy"

vault := economy.NewTreasuryVault(params...)  // use updated parameters/signature
vault.Deposit(address, amount)
vault.Withdraw(address, amount)
... // other TreasuryVault methods
```

## Python Example Usage
```python
from exsfoundry.core import ExsFoundry
from tetrapow.miner import TetraPowMiner

miner = TetraPowMiner(...)
foundry = ExsFoundry(...)
result = foundry.process_forge(miner_address=miner.address, input1, input2)
```

## CLI tools
All `treasury-demo` and `treasury` tools/commands have been updated to `TreasuryVault` naming and method patterns. Run with `--help` for usage.

## For developers
- Update any remaining module/class/function usage to match the above patterns.
- Remove all references to legacy `Treasury` or old foundry/miner signatures.
