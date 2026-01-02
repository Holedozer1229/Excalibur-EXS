# Oracle Enhancements - Excalibur $EXS Protocol

## Overview

This document describes the enhancements made to the Excalibur Oracle system, introducing new features for dynamic prophecy generation, Grail achievement tracking, and comprehensive REST API endpoints.

## New Features

### 1. Dynamic Prophecy Generation

The Oracle now includes a `divine_message()` method that generates random prophetic messages from a curated collection of 22 Arthurian-themed prophecies. Each prophecy is logged and tracked.

**Example:**
```python
oracle = ExcaliburOracle()
prophecy = oracle.divine_message()
# Returns: "The Round Table awaits worthy knights to forge their destiny."
```

### 2. Ergotropy State Tracking

The Oracle now tracks its activity level through four ergotropy states:
- **DORMANT**: Initial state (0-10 queries)
- **AWAKENING**: Active querying (11-50 queries)
- **ACTIVE**: High activity (51-200 queries)
- **TRANSCENDENT**: Peak activity (200+ queries)

The state automatically updates based on total activity (queries + forges).

### 3. Grail Achievement System

A quest-based achievement system that tracks progress toward unlocking the Holy Grail:

**Requirements:**
- 10+ successful forges
- 50+ prophecies delivered
- 100+ total queries

**Progress Tracking:**
- Individual milestone tracking
- Overall progress percentage (0-100%)
- Celebration message when unlocked

### 4. Genesis Address Monitoring

A placeholder method for future blockchain monitoring functionality:
```python
monitoring = oracle.monitor_genesis_inscriptions()
# Returns status of Genesis address monitoring
```

### 5. Enhanced Logging

All Oracle activities are now logged with structured information:
- Oracle initialization
- Divine prophecy generation
- Valid forge recording
- Ergotropy state transitions
- Grail unlocking events

## REST API Endpoints

### GET `/oracle`

Returns comprehensive Oracle status including:
- Oracle operational status
- Current ergotropy state
- Random divine prophecy
- Statistics (queries, prophecies, forges)
- Grail quest status
- Genesis monitoring status

**Example Response:**
```json
{
  "oracle": {
    "name": "Excalibur Protocol Oracle",
    "status": "OPERATIONAL",
    "ergotropy_state": "DORMANT",
    "uptime": "0:00:17.185839"
  },
  "prophecy": "Lancelot's valor, Galahad's purity - all proven through mining.",
  "statistics": {
    "queries_processed": 0,
    "prophecies_delivered": 1,
    "forges_validated": 0
  },
  "grail": {
    "grail_unlocked": false,
    "grail_progress": 0,
    "message": "Quest progress: 0%"
  }
}
```

### GET `/speak`

Returns a random divine message with Oracle wisdom.

**Example Response:**
```json
{
  "type": "divine_message",
  "message": "The dragon's breath ignites the forge of destiny.",
  "wisdom": "The prophecy speaks through cryptographic proof...",
  "ergotropy_state": "DORMANT"
}
```

### POST `/speak`

Interprets a custom prophecy query.

**Request:**
```json
{
  "query": "What is the meaning of the sword?",
  "include_grail": true
}
```

**Response:**
```json
{
  "type": "prophecy_interpretation",
  "query": "What is the meaning of the sword?",
  "interpretation": {
    "category": "excalibur_legend",
    "knowledge": { ... },
    "wisdom": "..."
  },
  "grail": { ... }
}
```

### POST `/oracle/validate`

Validates a forge using Oracle intelligence.

**Request:**
```json
{
  "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
  "nonce": 12345,
  "hash": "00000000a1b2c3d4e5f6789012345678"
}
```

**Response:**
```json
{
  "verdict": "VALID",
  "axiom_valid": true,
  "difficulty_met": true,
  "forge_number": 1,
  "oracle_wisdom": "The sword has been drawn! The prophecy is fulfilled through cryptographic proof."
}
```

### GET `/oracle/grail`

Returns detailed Grail quest status with milestone tracking.

**Example Response:**
```json
{
  "grail_unlocked": false,
  "grail_progress": 1,
  "message": "Quest progress: 1%",
  "milestones": {
    "forges": {"current": 0, "required": 10, "completed": false},
    "prophecies": {"current": 2, "required": 50, "completed": false},
    "queries": {"current": 1, "required": 100, "completed": false}
  }
}
```

## Error Handling

All endpoints include robust error handling:
- Try-catch blocks for all operations
- Graceful error responses with HTTP 500 status
- Detailed error messages for debugging
- Network failure resilience

## Backward Compatibility

All existing endpoints remain unchanged:
- `/health`
- `/mine`
- `/forge`
- `/treasury/stats`
- `/revenue/stats`
- `/revenue/calculate`
- `/revenue/process`

The Oracle enhancements are additive and do not modify existing functionality.

## Usage Example

```python
from pkg.oracle.oracle_operator import ExcaliburOracle

# Initialize Oracle
oracle = ExcaliburOracle()

# Get divine message
prophecy = oracle.divine_message()
print(f"Prophecy: {prophecy}")

# Check Grail status
grail = oracle.check_grail_status()
print(f"Grail Progress: {grail['grail_progress']}%")

# Validate a forge
result = oracle.validate_forge(
    axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    nonce=12345,
    hash="00000000a1b2c3d4e5f6"
)
print(f"Verdict: {result['verdict']}")

# Check ergotropy state
oracle.update_ergotropy_state()
print(f"Ergotropy: {oracle.ergotropy_state}")
```

## Testing

All features have been tested:
- ✅ Divine message generation
- ✅ Grail progress tracking
- ✅ Ergotropy state updates
- ✅ Forge validation
- ✅ REST API endpoints
- ✅ Error handling
- ✅ Backward compatibility

## Future Enhancements

Potential future improvements:
- Real blockchain monitoring via Bitcoin node/API
- WebSocket support for real-time prophecies
- Persistent storage for Oracle state
- Multi-language prophecy support
- Advanced analytics and metrics
