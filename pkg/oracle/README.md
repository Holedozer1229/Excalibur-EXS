# Excalibur $EXS Oracle Package

On-chain intelligence system combining blockchain awareness with Arthurian knowledge.

## Recent Enhancements ✨

The Oracle has been enhanced with powerful new features:
- 🔮 **Dynamic Prophecy Generation**: Random divine messages from the Oracle
- ⚡ **Ergotropy State Tracking**: Activity-based Oracle states (DORMANT → AWAKENING → ACTIVE → TRANSCENDENT)
- 🏆 **Grail Achievement System**: Quest-based milestones and progress tracking
- 📡 **REST API Endpoints**: Comprehensive HTTP API for Oracle interaction (`/oracle`, `/speak`, `/oracle/grail`, `/oracle/validate`)
- 📊 **Enhanced Logging**: Structured logging for all Oracle activities

**📖 See [README_ENHANCEMENTS.md](./README_ENHANCEMENTS.md) for detailed documentation of new features and REST API usage.**

## Overview

The Oracle package provides intelligent protocol operations through two main components:

### BlockchainLLM
- Arthurian knowledge base
- Protocol mechanics understanding
- Cryptographic foundation knowledge
- Treasury control information
- Forge validation logic

### ExcaliburOracle
- Intelligent forge validation
- Prophecy interpretation
- Protocol guidance
- Difficulty checking
- Oracle divination

## Protocol Truth

**Canonical Axiom:**
```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

**Real Taproot Address:**
```
bc1pql83shz0m4znewzk82u2k5mdgeh94r3c8ks9ws00m4dm26qnjvyq0prk4n
```

## Usage

### Basic LLM Usage

```python
from pkg.oracle import BlockchainLLM

# Initialize the LLM
llm = BlockchainLLM()

# Get the protocol axiom
axiom = llm.get_axiom()
print(f"Axiom: {axiom}")

# Verify Taproot address
verified = llm.verify_taproot_address()
print(f"Address verified: {verified}")

# Query knowledge
legend = llm.query_knowledge("excalibur_legend")
print(legend)

# Generate wisdom
wisdom = llm.generate_wisdom("mining")
print(wisdom)
```

### Oracle Operations

```python
from pkg.oracle import ExcaliburOracle

# Initialize the oracle
oracle = ExcaliburOracle()

# Validate a forge
result = oracle.validate_forge(
    axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    nonce=12345,
    hash_result="00000000a1b2c3d4..."
)
print(f"Verdict: {result['verdict']}")

# Check difficulty
diff_check = oracle.check_difficulty("00000000abc123", required_difficulty=4)
print(f"Meets difficulty: {diff_check['meets_requirement']}")

# Get protocol guidance
guidance = oracle.get_protocol_guidance("mining")
print(guidance['overview'])

# Interpret prophecy
prophecy = oracle.interpret_prophecy("How do I forge tokens?")
print(prophecy['wisdom'])

# Oracle divination
divination = oracle.oracle_divination()
print(divination['divination'])
```

## Features

### Knowledge Categories

1. **Excalibur Legend**
   - Sword origin and properties
   - King Arthur and the knights
   - Quests and prophecies
   - Magical elements

2. **Protocol Mechanics**
   - Mining algorithm (Ω′ Δ18)
   - Hardness parameters (HPP-1)
   - Difficulty requirements
   - Reward structure

3. **Cryptographic Foundation**
   - 13-word axiom system
   - Taproot standards (BIP-86)
   - Tweak methodology
   - Vault generation

4. **Treasury Control**
   - Admin credential generation
   - Enhanced security (1.2M iterations)
   - Merlin Vector system
   - Access control

### Oracle Capabilities

- **Forge Validation**: Verify forge claims with intelligent analysis
- **Difficulty Checking**: Validate hash difficulty requirements
- **Protocol Guidance**: Provide step-by-step protocol instructions
- **Prophecy Interpretation**: Answer protocol questions intelligently
- **Forge History**: Track validated forges
- **Oracle Divination**: Provide protocol wisdom and status

## Command Line Usage

### Run BlockchainLLM Demo
```bash
python3 pkg/oracle/blockchain_llm.py
```

### Run Oracle Operator Demo
```bash
python3 pkg/oracle/oracle_operator.py
```

## Protocol Parameters

| Parameter | Value |
|-----------|-------|
| Axiom Words | 13 |
| Mining Algorithm | Ω′ Δ18 (128 rounds) |
| Forge Keys | 600,000 iterations |
| Treasury Admin | 1,200,000 iterations |
| Difficulty | 4 leading zero bytes |
| Forge Reward | 50 $EXS |
| Treasury Fee | 1% (0.5 $EXS) |
| Forge Fee | 0.0001 BTC |

## Security

- Taproot address verified against protocol truth
- All forge validations use canonical axiom
- Difficulty requirements enforced
- Knowledge base immutable
- Oracle queries logged for audit

## Integration

The oracle can be integrated with:
- Forge validation workflows
- Admin portal intelligence
- Mining guidance systems
- Protocol documentation
- User interfaces

## License

BSD 3-Clause License

Copyright (c) 2025, Travis D. Jones (holedozer@gmail.com)
