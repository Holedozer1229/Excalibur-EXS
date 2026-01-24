# Excalibur $EXS Oracle API

Production-ready REST API for the Excalibur Protocol Oracle functionality.

## Overview

The Oracle API provides intelligent protocol operations, divination services, forge validation, and blockchain monitoring through a secure REST interface.

## Features

- 🔮 **Oracle Queries**: Context-aware responses to protocol questions
- 📜 **Divination**: Mystical prophecy and wisdom generation
- ⚒️ **Forge Validation**: Cryptographic proof verification
- 🏆 **Grail Management**: Sacred quest progression and energy tracking
- ⛓️ **Blockchain Monitoring**: Block and inscription detection

## Quick Start

### Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional)
export ORACLE_API_KEY=your_admin_key
export ORACLE_PUBLIC_KEY=your_public_key

# Run development server
python3 app.py
```

The API will start on `http://127.0.0.1:5001`

### Production (Docker)

```bash
# Build Docker image
docker build -f ../../docker/Dockerfile.oracle -t excalibur-oracle:latest ../..

# Run container
docker run -d \
  -p 5001:5001 \
  -e ORACLE_API_KEY=your_admin_key \
  -e ORACLE_PUBLIC_KEY=your_public_key \
  --name oracle-api \
  excalibur-oracle:latest
```

### Production (Gunicorn)

```bash
gunicorn --bind 0.0.0.0:5001 \
         --workers 4 \
         --timeout 120 \
         --access-logfile - \
         --error-logfile - \
         cmd.oracle-api.app:app
```

## API Endpoints

### Health & Status

#### `GET /health`
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "service": "excalibur-oracle",
  "version": "1.0.0",
  "timestamp": "2026-01-02T00:00:00Z"
}
```

#### `GET /status`
Get Oracle service status (requires API key).

**Headers:**
```
X-API-Key: your_public_key
```

**Response:**
```json
{
  "oracle_status": "OPERATIONAL",
  "components": {
    "blockchain_llm": "active",
    "oracle_operator": "active",
    "divination_engine": "active",
    "grail_manager": "active",
    "blockchain_monitor": "active"
  },
  "uptime_seconds": 3600,
  "requests_processed": 142,
  "taproot_address": "bc1pql83shz0m4znewzk82u2k5mdgeh94r3c8ks9ws00m4dm26qnjvyq0prk4n",
  "protocol_version": "1.0.0"
}
```

### Oracle Queries

#### `POST /oracle`
General oracle query endpoint.

**Headers:**
```
X-API-Key: your_public_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "How do I mine tokens?",
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "query": "How do I mine tokens?",
  "context": "mining",
  "response": "The path of mining requires the Ω′ Δ18 Tetra-PoW algorithm...",
  "wisdom": "Four leading zeros mark the worthy - prove your computational devotion.",
  "guidance": {
    "overview": "Use the Ω′ Δ18 Tetra-PoW miner with 128 rounds",
    "command": "python3 pkg/miner/tetra_pow_miner.py --axiom '[13 words]' --difficulty 4"
  }
}
```

#### `POST /speak`
Oracle divination endpoint - receive prophecy and wisdom.

**Headers:**
```
X-API-Key: your_public_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "context": "mining",
  "user_id": "optional_user_id"
}
```

**Contexts:** `mining`, `forge`, `quest`, `wisdom`, `prophecy`, `general`

**Response:**
```json
{
  "divination": {
    "wisdom": "The sword remains in the stone until cryptographic proof is shown.",
    "context": "mining",
    "cosmic_alignment": 42,
    "prophecy_id": "abc123def456",
    "personal_message": "You are new to the oracle's wisdom. Welcome, seeker."
  },
  "oracle_status": "OPERATIONAL",
  "message": "The oracle has spoken"
}
```

### Forge Validation

#### `POST /validate`
Validate a forge attempt.

**Headers:**
```
X-API-Key: your_public_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
  "nonce": 12345,
  "hash": "00000000a1b2c3d4e5f6"
}
```

**Response:**
```json
{
  "axiom_valid": true,
  "difficulty_met": true,
  "nonce": 12345,
  "hash": "00000000a1b2c3d4e5f6",
  "verdict": "VALID",
  "oracle_wisdom": "The sword has been drawn! The prophecy is fulfilled.",
  "grail_energy": {
    "energy_gained": 40,
    "total_energy": 140,
    "grail_state": "awakening"
  }
}
```

#### `POST /difficulty/check`
Check if a hash meets difficulty requirements.

**Headers:**
```
X-API-Key: your_public_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "hash": "00000000abcd1234",
  "difficulty": 4
}
```

**Response:**
```json
{
  "hash": "00000000abcd1234",
  "required_difficulty": 4,
  "actual_difficulty": 4,
  "meets_requirement": true,
  "verdict": "PASS",
  "oracle_note": "The dragon's gate is open"
}
```

### Grail Management

#### `GET /grail`
Get current Holy Grail state.

**Headers:**
```
X-API-Key: your_public_key
```

**Response:**
```json
{
  "grail_state": {
    "state": "awakening",
    "energy_level": 140,
    "forges_witnessed": 3,
    "inscriptions_detected": 1,
    "quest_progress": {
      "knight_trials": 2,
      "dragon_slain": false
    },
    "prophecy": "The Grail stirs, sensing the approach of destiny."
  },
  "sacred_geometry": {
    "golden_ratio": 1.618,
    "resonance_frequency": 98.45,
    "geometry_signature": 247
  },
  "unlocking_conditions": {
    "energy_sufficient": false,
    "knight_trials_passed": false,
    "can_unlock": false
  }
}
```

#### `POST /grail/quest`
Advance grail quest progression.

**Headers:**
```
X-API-Key: your_public_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "quest_type": "knight_trial",
  "user_id": "user123"
}
```

**Quest Types:** `knight_trial`, `dragon_slain`

**Response:**
```json
{
  "grail_quest": {
    "quest": "knight_trial",
    "trials_completed": 3,
    "energy_bonus": 25,
    "message": "Knight's trial 3 completed!"
  },
  "narrative": {
    "current_state": "journey_continues",
    "narrative": "The path winds through shadow and light. Press onward."
  }
}
```

### Blockchain Monitoring

#### `GET /blockchain/status`
Get blockchain monitoring status.

**Headers:**
```
X-API-Key: your_public_key
```

**Response:**
```json
{
  "monitoring_stats": {
    "current_height": 840010,
    "blocks_monitored": 10,
    "inscriptions_detected": 1,
    "prophecy_count": 0,
    "monitoring_active": false
  },
  "recent_blocks": [
    {
      "height": 840010,
      "hash": "abc123...",
      "inscriptions": 0,
      "prophecy": false
    }
  ]
}
```

#### `GET /blockchain/inscriptions`
Search for inscriptions in a block range.

**Headers:**
```
X-API-Key: your_public_key
```

**Query Parameters:**
- `start_height` (required): Starting block height
- `end_height` (required): Ending block height (max range: 1000)

**Example:**
```bash
GET /blockchain/inscriptions?start_height=840001&end_height=840100
```

**Response:**
```json
{
  "start_height": 840001,
  "end_height": 840100,
  "inscriptions_found": 5,
  "inscriptions": [
    {
      "block_height": 840005,
      "block_hash": "abc123...",
      "prophecy": true
    }
  ]
}
```

### Admin Endpoints

#### `GET /admin/stats`
Get comprehensive admin statistics (requires admin API key).

**Headers:**
```
X-API-Key: your_admin_key
```

**Response:**
```json
{
  "service": {
    "uptime_seconds": 3600,
    "requests_processed": 142,
    "start_time": "2026-01-02T00:00:00Z"
  },
  "oracle": {
    "queries_processed": 45,
    "forges_validated": 12
  },
  "divination": {
    "total_divinations": 23,
    "unique_users": 8,
    "active_quests": 5
  },
  "grail": {
    "state": "awakening",
    "energy_level": 340
  },
  "blockchain": {
    "blocks_monitored": 100,
    "inscriptions_detected": 7
  }
}
```

## Authentication

The API uses API key authentication via the `X-API-Key` header or `api_key` query parameter.

### API Key Types

1. **Admin Key**: Full access to all endpoints including `/admin/*`
   - Environment variable: `ORACLE_API_KEY`
   - Default (dev): `dev_key_12345`

2. **Public Key**: Access to public endpoints
   - Environment variable: `ORACLE_PUBLIC_KEY`
   - Default (dev): `public_key_67890`

### Example

```bash
# Using header
curl -H "X-API-Key: public_key_67890" http://localhost:5001/status

# Using query parameter
curl http://localhost:5001/status?api_key=public_key_67890
```

## Error Handling

All errors return JSON responses with appropriate HTTP status codes:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing API key)
- `403`: Forbidden (invalid or insufficient API key)
- `404`: Not Found (endpoint doesn't exist)
- `405`: Method Not Allowed (wrong HTTP method)
- `413`: Request Too Large
- `500`: Internal Server Error

## Logging

The API uses structured logging with the following format:

```
%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d
```

All requests are logged with:
- Request count
- HTTP method and path
- Remote address
- Processing results

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `5001` |
| `HOST` | API host | `127.0.0.1` |
| `ENV` | Environment (`production` or `development`) | `development` |
| `DEBUG` | Enable debug mode | `False` |
| `ORACLE_API_KEY` | Admin API key | `dev_key_12345` |
| `ORACLE_PUBLIC_KEY` | Public API key | `public_key_67890` |

## Integration with Merlin's Portal

The Oracle API is designed to integrate seamlessly with Merlin's Portal:

1. **Real-time Oracle Invocations**: Portal can query `/oracle` for protocol guidance
2. **Dashboard Widgets**: Display grail state and divinations
3. **Forge Validation**: Validate forges before submission
4. **Blockchain Monitoring**: Track inscriptions and prophecies

### Example Integration

```javascript
// In Merlin's Portal dashboard.js
async function consultOracle(query) {
  const response = await fetch('http://localhost:5001/oracle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your_api_key'
    },
    body: JSON.stringify({ query })
  });
  return await response.json();
}
```

## Docker Compose

Add to your `docker-compose.yml`:

```yaml
oracle-api:
  build:
    context: .
    dockerfile: docker/Dockerfile.oracle
  ports:
    - "5001:5001"
  environment:
    - ENV=production
    - ORACLE_API_KEY=${ORACLE_API_KEY}
    - ORACLE_PUBLIC_KEY=${ORACLE_PUBLIC_KEY}
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## Development

### Running Tests

```bash
# Test health endpoint
curl http://localhost:5001/health

# Test oracle query
curl -X POST \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I mine?"}' \
  http://localhost:5001/oracle

# Test divination
curl -X POST \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{"context": "mining"}' \
  http://localhost:5001/speak
```

## License

BSD 3-Clause License

Copyright (c) 2025, Travis D. Jones (holedozer@icloud.com)
