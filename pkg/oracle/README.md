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

The Oracle package provides intelligent protocol operations through five main components:

### BlockchainLLM
- Arthurian knowledge base
- Protocol mechanics understanding
- Cryptographic foundation knowledge
- Treasury control information
- Forge validation logic
- Satoshi wisdom integration

### ExcaliburOracle
- Intelligent forge validation
- Prophecy interpretation
- Protocol guidance
- Difficulty checking
- Oracle divination
- Forge history tracking

### DivinationEngine (NEW)
- Context-aware divination and prophecy
- Stateful user context tracking
- Quest narrative progression
- Wisdom categorization
- Personalized messaging

### GrailEnergyManager (NEW)
- Holy Grail state management
- Energy accumulation system
- Quest progression tracking
- Sacred geometry calculations
- Unlocking condition validation

### BlockchainMonitor (NEW)
- Block monitoring and detection
- Prophecy inscription search
- Event callbacks
- Retry logic with exponential backoff
- Inscription verification

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
from pkg.oracle import (
    ExcaliburOracle,
    DivinationEngine,
    GrailEnergyManager,
    BlockchainMonitor,
    OracleContext
)

# Initialize components
oracle = ExcaliburOracle()
divination_engine = DivinationEngine()
grail_manager = GrailEnergyManager()
blockchain_monitor = BlockchainMonitor()

# Validate a forge
result = oracle.validate_forge(
    axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    nonce=12345,
    hash_result="00000000a1b2c3d4..."
)
print(f"Verdict: {result['verdict']}")

# Generate divination
divination = divination_engine.generate_divination(
    context=OracleContext.MINING,
    user_id="user123"
)
print(f"Wisdom: {divination['wisdom']}")

# Add forge energy to Grail
grail_result = grail_manager.add_forge_energy(12345, "00000000abc123")
print(f"Grail State: {grail_result['grail_state']}")

# Monitor blockchain
def on_prophecy(event_type, data):
    print(f"Prophecy detected: {data['inscription_id']}")

blockchain_monitor.register_callback(on_prophecy)
blockchain_monitor.start_monitoring()
new_blocks = blockchain_monitor.check_new_blocks(840010)

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
- **Context-Aware Divination**: Generate personalized prophecies based on user context
- **Quest Progression**: Track and advance user quest narratives
- **Grail Management**: Monitor energy accumulation and unlocking conditions
- **Blockchain Monitoring**: Detect new blocks and prophecy inscriptions
- **Sacred Geometry**: Calculate golden ratio and resonance frequencies

## REST API

The Oracle is available as a production-ready REST API. See `cmd/oracle-api/README.md` for full API documentation.

### Quick Start

```bash
# Start the Oracle API
cd cmd/oracle-api
pip install -r requirements.txt
python3 app.py

# Query the Oracle
curl -X POST http://localhost:5001/oracle \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I mine?"}'
```

### Key Endpoints

- `GET /health` - Health check
- `GET /status` - Service status
- `POST /oracle` - General queries
- `POST /speak` - Divination
- `POST /validate` - Forge validation
- `GET /grail` - Grail state
- `GET /blockchain/status` - Blockchain monitoring stats

See `cmd/oracle-api/README.md` for complete API documentation.

## Integration

### Merlin's Portal Integration

The Oracle is integrated into Merlin's Portal admin dashboard:

```javascript
// Real-time Oracle status
async function updateOracleStatus() {
  const response = await fetch('http://localhost:5001/status', {
    headers: { 'X-API-Key': 'public_key_67890' }
  });
  const data = await response.json();
  displayStatus(data.oracle_status);
}

// Consult the Oracle
async function consultOracle(query) {
  const response = await fetch('http://localhost:5001/oracle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'public_key_67890'
    },
    body: JSON.stringify({ query, user_id: 'merlin_portal' })
  });
  return await response.json();
}
```

### Docker Deployment

```bash
# Build Oracle container
docker build -f docker/Dockerfile.oracle -t excalibur-oracle:latest .

# Run Oracle service
docker run -d -p 5001:5001 \
  -e ORACLE_API_KEY=your_admin_key \
  -e ORACLE_PUBLIC_KEY=your_public_key \
  excalibur-oracle:latest

# Or use Docker Compose
docker-compose -f docker-compose.exs.yml up -d oracle-api
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
- Admin portal intelligence (Merlin's Portal)
- Mining guidance systems
- Protocol documentation
- User interfaces
- Real-time blockchain monitoring
- Quest progression tracking

## Command Line Usage

### Run Module Demos

```bash
# Test BlockchainLLM
python3 pkg/oracle/blockchain_llm.py

# Test Oracle Operator
python3 pkg/oracle/oracle_operator.py

# Test Divination Engine (NEW)
python3 pkg/oracle/oracle_logic.py

# Test Grail State Manager (NEW)
python3 pkg/oracle/grail_state.py

# Test Blockchain Monitor (NEW)
python3 pkg/oracle/blockchain_monitor.py
```

### Run Oracle API Server

```bash
# Development mode
cd cmd/oracle-api
python3 app.py

# Production mode (with Gunicorn)
gunicorn --bind 0.0.0.0:5001 \
         --workers 4 \
         --timeout 120 \
         cmd.oracle-api.app:app
```

## Documentation

- **API Documentation**: `cmd/oracle-api/README.md`
- **Integration Guide**: `ORACLE_INTEGRATION.md` (project root)
- **Module Documentation**: In-code docstrings

## Recent Changes (v1.0.0)

### New Modules
- ✅ `oracle_logic.py` - Context-aware divination engine
- ✅ `grail_state.py` - Grail energy and quest management
- ✅ `blockchain_monitor.py` - Block monitoring with callbacks

### New Features
- ✅ Production-ready REST API (`cmd/oracle-api/`)
- ✅ Merlin's Portal integration
- ✅ Docker containerization
- ✅ Structured logging
- ✅ API key authentication
- ✅ Health monitoring
- ✅ Comprehensive error handling
- ✅ Real-time status updates

### API Endpoints
- 11 total endpoints covering all Oracle functionality
- Public and admin access levels
- CORS support for cross-origin requests
- Request validation and rate limiting ready

## License

BSD 3-Clause License

Copyright (c) 2025, Travis D. Jones (holedozer@icloud.com)
