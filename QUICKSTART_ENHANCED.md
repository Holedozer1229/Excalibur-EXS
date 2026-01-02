# Enhanced Quickstart Guide

## 🚀 Get Started with Excalibur-EXS in 10 Minutes

This enhanced guide will get you up and running with all the new modular components of Excalibur-EXS, including **custom seed vault generation**.

## Prerequisites

- Python 3.11+
- Go 1.21+ (optional, for Go miners)
- Docker & Docker Compose (for containerized deployment)
- Git

## 🔑 Custom Seed Vault Generation

**NEW**: You can now use your own 13-word seed to generate unique Taproot vaults! The custom ergotropic tweak ensures each seed produces a unique 256-bit entropy Taproot address.

### Quick Examples

#### Using Go CLI (Rosetta)
```bash
# Use canonical prophecy axiom (default)
./rosetta generate-vault

# Use your own 13-word seed
./rosetta generate-vault --seed "your thirteen custom words go here for unique vault address generation test seed"

# Generate for testnet
./rosetta generate-vault --network testnet --seed "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu"
```

#### Using Python Wallet CLI
```bash
# Create wallet with canonical prophecy axiom
python3 cmd/exs-wallet/wallet_cli.py create my-wallet

# Create wallet with your own 13-word seed
python3 cmd/exs-wallet/wallet_cli.py create my-custom-wallet --seed "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu"

# Create with encryption
python3 cmd/exs-wallet/wallet_cli.py create secure-wallet --seed "your 13 words here" --passphrase "your-password"
```

#### Using API Endpoint
```bash
# Generate vault with canonical axiom
curl -X POST http://localhost:5000/vault/generate

# Generate vault with custom seed
curl -X POST http://localhost:5000/vault/generate \
  -H "Content-Type: application/json" \
  -d '{
    "seed": "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu"
  }'
```

### How It Works

The custom ergotropic tweak process:
1. **Your 13 words** → SHA256 hash → `prophecy_hash` (256-bit)
2. HPP-1 key derivation (600,000 PBKDF2 rounds) → `internal_key`
3. Taproot tweak: `SHA256(internal_key || prophecy_hash)` → `tweak` (256-bit)
4. Output key: `internal_key ⊕ tweak` → unique Taproot address

Each unique 13-word seed produces a completely different vault address, secured by 256-bit entropy.

## Quick Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Local Development

```bash
# Clone and enter directory
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Install Python dependencies (optional)
pip install aiohttp  # For async blockchain watcher

# No other dependencies required - stdlib only!
```

## 🎯 Quick Examples

### 1. Validate a Prophecy Rune

```python
from pkg.prophecy import RuneValidator

# Initialize validator
validator = RuneValidator(difficulty=4)

# Validate canonical axiom
axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
result = validator.validate_axiom(axiom)
print(f"Valid: {result['valid']}")

# Validate a proof
nonce = 12345
signature = validator.compute_rune_signature(axiom, nonce)
proof = validator.validate_rune_proof(axiom, nonce, signature)
print(f"Verdict: {proof['verdict']}")
```

### 2. Generate Möbius Trajectories

```python
from pkg.mathematics import MobiusTrajectory

# Initialize generator
generator = MobiusTrajectory(strips=1, radius=1.0)

# Generate trajectory from a hash
hash_seed = "00000000abcd1234567890ef"
trajectory = generator.generate_trajectory(hash_seed, steps=128)

# Analyze it
analysis = generator.analyze_trajectory(hash_seed)
print(f"Winding Number: {analysis['winding_number']}")
print(f"Topology: {analysis['topology']}")
```

### 3. Compute Berry Phases

```python
from pkg.mathematics import BerryPhaseCalculator

# Initialize calculator
calculator = BerryPhaseCalculator()

# Compute phase from hash sequence
hashes = [
    "00000000abcd1234567890ef",
    "0000001234567890abcdef00",
    "00000056789abcdef0123400"
]

phase = calculator.compute_berry_phase(hashes)
print(f"Berry Phase: {phase:.6f} radians")

# Analyze distribution
distribution = calculator.analyze_phase_distribution(hashes)
print(f"Entropy: {distribution['entropy']:.4f}")
```

### 4. Validate Zero-Torsion

```python
from pkg.engine import ZeroTorsionEngine

# Initialize engine
engine = ZeroTorsionEngine(strictness=0.01)

# Validate a hash
hash_val = "00000000abcd1234567890ef1234567890abcdef"
result = engine.validate_zero_torsion(hash_val)
print(f"Torsion: {result['torsion']:.6f}")
print(f"Quality: {result['quality']}")
```

### 5. Create a Cryptographic Quest

```python
from pkg.quest import QuestEngine

# Initialize engine
engine = QuestEngine()

# Create a quest
quest = engine.create_quest(
    title="The Sword in the Stone",
    description="Mine 40 valid hashes",
    quest_type="mining",
    difficulty=4,
    reward=50.0
)

# Register a knight
registration = engine.register_participant(quest["id"], "SIR-LANCELOT")

# Submit progress
submission = engine.submit_quest_progress(
    quest["id"],
    "SIR-LANCELOT",
    {"hash": "00000000abcd1234", "nonce": 12345}
)
print(f"Progress: {submission['progress']}%")
```

### 6. Use the Enhanced Oracle

```python
import sys
sys.path.append('pkg')
from oracle.enhanced_oracle import EnhancedExcaliburOracle

# Initialize enhanced oracle
oracle = EnhancedExcaliburOracle()

# Perform enhanced forge validation
axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
result = oracle.validate_forge_enhanced(axiom, 12345, "00000000abcd1234")

print(f"Verdict: {result['verdict']}")
print(f"Rune Valid: {result['rune_validation']['valid']}")
print(f"Torsion Quality: {result['zero_torsion']['quality']}")
print(f"Möbius Topology: {result['mobius_analysis']['topology']}")
```

### 7. Monitor Blockchain with Async Watcher

```python
import asyncio
import sys
sys.path.append('pkg')
from oracle.blockchain_watcher import ForgeWatcher

async def monitor():
    # Create watcher
    watcher = ForgeWatcher(check_interval=5)
    
    # Add address to watch
    watcher.add_watch_address("bc1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt")
    
    # Start monitoring
    task = asyncio.create_task(watcher.start_watching())
    
    # Monitor for 30 seconds
    await asyncio.sleep(30)
    watcher.stop()
    
    # Get status
    status = watcher.get_status()
    print(f"Valid Forges: {status['valid_forges']}")

# Run
asyncio.run(monitor())
```

## 🎮 Complete Workflow Example

Here's a complete example that uses multiple modules together:

```python
#!/usr/bin/env python3
import sys
sys.path.append('pkg')

from prophecy import RuneValidator, ProphecyEngine
from mathematics import MobiusTrajectory, BerryPhaseCalculator
from engine import ZeroTorsionEngine
from quest import QuestEngine

def complete_workflow():
    print("🔮 Excalibur Complete Workflow Demo")
    print("=" * 60)
    
    # 1. Initialize all components
    rune_validator = RuneValidator(difficulty=4)
    prophecy_engine = ProphecyEngine()
    mobius_generator = MobiusTrajectory()
    berry_calculator = BerryPhaseCalculator()
    torsion_engine = ZeroTorsionEngine()
    quest_engine = QuestEngine()
    
    # 2. Create a prophecy
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    prophecy = prophecy_engine.create_prophecy(axiom, expiry_hours=24)
    print(f"\n📜 Created Prophecy: {prophecy['id']}")
    
    # 3. Validate a rune proof
    nonce = 12345
    hash_result = rune_validator.compute_rune_signature(axiom, nonce)
    rune_proof = rune_validator.validate_rune_proof(axiom, nonce, hash_result)
    print(f"⚔️ Rune Verdict: {rune_proof['verdict']}")
    
    # 4. Generate Möbius trajectory
    trajectory = mobius_generator.generate_trajectory(hash_result, steps=128)
    analysis = mobius_generator.analyze_trajectory(hash_result)
    print(f"∞ Möbius Topology: {analysis['topology']}")
    
    # 5. Compute Berry phase
    hashes = [hash_result]
    berry_phase = berry_calculator.compute_berry_phase(hashes)
    print(f"🌊 Berry Phase: {berry_phase:.6f} radians")
    
    # 6. Validate zero-torsion
    torsion_result = torsion_engine.validate_zero_torsion(hash_result)
    print(f"🌀 Torsion Quality: {torsion_result['quality']}")
    
    # 7. Create and register for quest
    quest = quest_engine.create_quest(
        "Prophecy Challenge",
        "Complete the prophecy validation",
        "validation",
        difficulty=4,
        reward=100.0
    )
    print(f"\n🏰 Quest Created: {quest['id']}")
    
    print("\n✅ Complete workflow executed successfully!")

if __name__ == "__main__":
    complete_workflow()
```

Save this as `demo_workflow.py` and run:
```bash
python3 demo_workflow.py
```

## 🔧 Testing Your Installation

Run the built-in tests for each module:

```bash
# Test prophecy module
python3 pkg/prophecy/rune_validation.py
python3 pkg/prophecy/prophecy_engine.py

# Test mathematics module
python3 pkg/mathematics/mobius_trajectory.py
python3 pkg/mathematics/berry_phase.py
python3 pkg/mathematics/visualization.py

# Test engine module
python3 pkg/engine/zero_torsion_engine.py

# Test quest module
python3 pkg/quest/quest_engine.py
python3 pkg/quest/grail_quest.py

# Test oracle integration
cd pkg && python3 oracle/enhanced_oracle.py
```

## 🏃 Running the Miners

### Python Tetra-PoW Miner
```bash
cd miners/tetra-pow-python
python3 tetra_pow_miner.py \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4 \
  --max-attempts 100000
```

### Go Tetra-PoW Miner (Fastest)
```bash
cd miners/tetra-pow-go
go build -o tetra-pow-miner
./tetra-pow-miner mine --data "Excalibur-EXS"
```

## 🌐 Accessing the Web Interfaces

### Knights' Round Table (Public UI)
```
http://localhost/web/knights-round-table
```

### Merlin's Portal (Admin Dashboard)
```
http://localhost/admin/merlins-portal
```

Default admin credentials (change in production):
- Username: `MERLIN-MASTER`
- Generate password with: `python3 forge_treasury_key.py`

## 📊 API Endpoints

Once the system is running, access these endpoints:

```bash
# Health check
curl http://localhost:8080/health

# Validate forge (example)
curl -X POST http://localhost:5000/api/v1/oracle/validate-forge \
  -H "Content-Type: application/json" \
  -d '{
    "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    "nonce": 12345,
    "hash": "00000000abcd1234567890ef"
  }'
```

## 🐛 Troubleshooting

### Import Errors
If you get module import errors, make sure you're in the correct directory:
```bash
# Run from project root
cd /path/to/Excalibur-EXS

# Or add to Python path
export PYTHONPATH=/path/to/Excalibur-EXS/pkg:$PYTHONPATH
```

### Docker Issues
```bash
# Reset containers
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs -f
```

### Permission Errors
```bash
# Fix permissions
chmod +x launch_exe.sh
chmod +x scripts/*.sh
```

## 📚 Next Steps

1. Read the [ARCHITECTURE.md](ARCHITECTURE.md) for system details
2. Explore the [API Documentation](docs/api/)
3. Try the [Jupyter notebooks](notebooks/) for mathematical proofs
4. Join the community on [GitHub Discussions](https://github.com/Holedozer1229/Excalibur-EXS/discussions)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

BSD 3-Clause License - See [LICENSE](LICENSE)

---

**Happy Forging! ⚔️**

*"In ambiguity, we find certainty. In chaos, we forge order."*
