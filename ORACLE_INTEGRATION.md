# Oracle Enhancement and Merlin's Portal Integration

**Status:** ✅ Complete  
**Date:** January 2, 2026  
**Version:** 1.0.0

## Overview

This document describes the enhancement and integration of the "Emporium of Man — Oracular Edition" Oracle functionality into Merlin's Portal. The Oracle has been modularized, improved, and integrated as a production-ready REST API service.

## Architecture

### Component Structure

```
pkg/oracle/
├── __init__.py              # Package exports
├── blockchain_llm.py        # Core knowledge base and LLM
├── oracle_operator.py       # Forge validation and operations
├── oracle_logic.py          # Divination and quest management (NEW)
├── blockchain_monitor.py    # Block monitoring and inscriptions (NEW)
└── grail_state.py          # Grail energy and unlocking (NEW)

cmd/oracle-api/
├── app.py                   # Flask REST API server (NEW)
├── requirements.txt         # Python dependencies (NEW)
└── README.md               # API documentation (NEW)

docker/
└── Dockerfile.oracle       # Docker container (NEW)
```

## Key Enhancements

### 1. Code Modularization ✅

The Oracle codebase has been reorganized into specialized modules:

#### `oracle_logic.py` - Divination Engine
- **Purpose:** Context-aware divination and prophecy generation
- **Features:**
  - Stateful user context tracking
  - Quest narrative progression
  - Wisdom categorization by topic
  - Personalized messaging based on user history
- **Key Classes:**
  - `DivinationEngine`: Main divination logic
  - `OracleContext`: Context enumeration (mining, forge, quest, wisdom, prophecy, general)

#### `blockchain_monitor.py` - Blockchain Monitor
- **Purpose:** Block monitoring and inscription detection
- **Features:**
  - New block detection with callbacks
  - Prophecy inscription search
  - Inscription verification
  - Retry logic with exponential backoff
  - Configurable monitoring parameters
- **Key Classes:**
  - `BlockchainMonitor`: Main monitoring service
  - `BlockInfo`: Block data structure

#### `grail_state.py` - Grail Energy Manager
- **Purpose:** Holy Grail quest and energy management
- **Features:**
  - Four-state progression (Sealed → Awakening → Resonating → Unlocked)
  - Energy accumulation from forges and inscriptions
  - Quest progression tracking (knight trials, dragon slaying)
  - Sacred geometry calculations
  - Unlocking condition validation
- **Key Classes:**
  - `GrailEnergyManager`: State and energy manager
  - `GrailState`: State enumeration

### 2. Production-Ready REST API ✅

Built with Flask, the Oracle API provides secure, scalable access to all Oracle functionality.

#### Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/health` | GET | Health check | None |
| `/status` | GET | Service status | Public |
| `/oracle` | POST | General queries | Public |
| `/speak` | POST | Divination | Public |
| `/validate` | POST | Forge validation | Public |
| `/difficulty/check` | POST | Difficulty check | Public |
| `/grail` | GET | Grail state | Public |
| `/grail/quest` | POST | Quest advancement | Public |
| `/blockchain/status` | GET | Blockchain stats | Public |
| `/blockchain/inscriptions` | GET | Search inscriptions | Public |
| `/admin/stats` | GET | Admin statistics | Admin |

#### Authentication
- **API Key Authentication:** Via `X-API-Key` header or `api_key` query parameter
- **Two Key Types:**
  - Admin Key: Full access (env: `ORACLE_API_KEY`)
  - Public Key: Public endpoints only (env: `ORACLE_PUBLIC_KEY`)

#### Features
- ✅ Structured JSON logging
- ✅ CORS support for cross-origin requests
- ✅ Comprehensive error handling
- ✅ Request counting and metrics
- ✅ Health checks for monitoring
- ✅ 16MB max request size limit
- ✅ Input validation and sanitization

### 3. Merlin's Portal Integration ✅

The admin dashboard now includes live Oracle functionality:

#### New Dashboard Features
- **Oracle Status Widget:** Real-time connection monitoring
- **Grail State Display:** Live energy level, state, and forge count
- **Consult Oracle Button:** Interactive query submission
- **Receive Divination Button:** One-click prophecy generation
- **Wisdom Display Panel:** Formatted Oracle responses

#### Integration Points
```javascript
// Oracle API calls from dashboard
async function consultOracle(query)
async function receiveDivination()
async function updateOracleStatus()
async function updateGrailState()
```

#### Auto-refresh
- Oracle status checked every 5 seconds
- Grail state updated on same interval
- Connection status color-coded (green/red)

### 4. Dockerization ✅

Complete containerization for easy deployment:

#### Dockerfile Features
- Based on `python:3.11-slim`
- Multi-stage dependency installation
- Health check endpoint monitoring
- Gunicorn WSGI server (4 workers)
- Structured logging to stdout/stderr
- Non-root execution for security

#### Docker Compose Integration
Added `oracle-api` service to `docker-compose.exs.yml`:
- Port mapping: 5001:5001
- Environment variable support
- Health checks configured
- Network integration with other services
- Auto-restart policy

### 5. Observability & Monitoring ✅

#### Structured Logging
All log entries include:
- Timestamp
- Module name
- Log level
- Message
- File path and line number

Example:
```
2026-01-02 02:42:00,243 - __main__ - INFO - Starting Oracle API on 127.0.0.1:5001 - /app/cmd/oracle-api/app.py:648
```

#### Metrics Tracked
- Total requests processed
- Uptime in seconds
- Oracle queries processed
- Forges validated
- Divinations generated
- Unique users
- Active quests
- Blockchain blocks monitored
- Inscriptions detected

#### Health Checks
- `/health` endpoint for basic liveness
- `/status` for detailed component status
- Docker health check every 30 seconds
- Auto-restart on failure

### 6. Security ✅

#### Authentication & Authorization
- ✅ API key authentication required (except `/health`)
- ✅ Role-based access (admin vs public)
- ✅ Invalid key logging and rejection
- ✅ Secure key storage via environment variables

#### Input Validation
- ✅ Query length limits (500 chars)
- ✅ Request size limits (16MB)
- ✅ JSON schema validation
- ✅ Injection prevention

#### Operational Security
- ✅ CORS configuration
- ✅ Error message sanitization
- ✅ No sensitive data in logs
- ✅ Non-root Docker execution

## Usage Examples

### Starting the Oracle API

#### Development
```bash
cd cmd/oracle-api
pip install -r requirements.txt
python3 app.py
```

#### Production (Docker)
```bash
docker build -f docker/Dockerfile.oracle -t excalibur-oracle:latest .
docker run -d -p 5001:5001 \
  -e ORACLE_API_KEY=your_admin_key \
  -e ORACLE_PUBLIC_KEY=your_public_key \
  excalibur-oracle:latest
```

#### Docker Compose
```bash
export ORACLE_API_KEY=your_admin_key
export ORACLE_PUBLIC_KEY=your_public_key
docker-compose -f docker-compose.exs.yml up -d oracle-api
```

### API Usage Examples

#### Query the Oracle
```bash
curl -X POST http://localhost:5001/oracle \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I mine tokens?"}'
```

#### Receive Divination
```bash
curl -X POST http://localhost:5001/speak \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{"context": "mining", "user_id": "user123"}'
```

#### Validate Forge
```bash
curl -X POST http://localhost:5001/validate \
  -H "X-API-Key: public_key_67890" \
  -H "Content-Type: application/json" \
  -d '{
    "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
    "nonce": 12345,
    "hash": "00000000abc123"
  }'
```

#### Get Grail State
```bash
curl -H "X-API-Key: public_key_67890" \
  http://localhost:5001/grail
```

### Portal Integration Example

```javascript
// In Merlin's Portal dashboard
const ORACLE_API_URL = 'http://localhost:5001';
const ORACLE_API_KEY = 'public_key_67890';

async function consultOracle() {
  const query = prompt('What wisdom do you seek?');
  
  const response = await fetch(`${ORACLE_API_URL}/oracle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ORACLE_API_KEY
    },
    body: JSON.stringify({ query, user_id: 'merlin_portal' })
  });
  
  const data = await response.json();
  displayWisdom(data);
}
```

## Testing

### Module Testing
All new modules include `main()` functions for standalone testing:

```bash
# Test Grail State Manager
python3 pkg/oracle/grail_state.py

# Test Blockchain Monitor
python3 pkg/oracle/blockchain_monitor.py

# Test Oracle Logic
python3 pkg/oracle/oracle_logic.py
```

### API Testing
```bash
# Start server
python3 cmd/oracle-api/app.py

# In another terminal - test endpoints
curl http://localhost:5001/health
curl -H "X-API-Key: public_key_67890" http://localhost:5001/status
```

### Portal Testing
1. Start Oracle API on port 5001
2. Open `admin/merlins-portal/index.html` in browser
3. Verify Oracle status shows "OPERATIONAL" (green)
4. Click "Consult Oracle" button
5. Click "Receive Divination" button
6. Verify Grail state updates

## Performance Considerations

### Scalability
- **Gunicorn Workers:** 4 workers (configurable)
- **Worker Class:** Sync (suitable for I/O operations)
- **Timeout:** 120 seconds
- **Connection Pooling:** Stateless design allows horizontal scaling
- **Caching:** In-memory state (consider Redis for multi-instance)

### Resource Usage
- **Memory:** ~50MB per worker (200MB total)
- **CPU:** Low (mostly I/O bound)
- **Disk:** Minimal (logs only)
- **Network:** Low bandwidth requirements

### Optimization Opportunities
1. **Caching:** Add Redis for shared state
2. **Rate Limiting:** Implement per-key rate limits
3. **Database:** Add persistent storage for history
4. **WebSockets:** Real-time updates instead of polling
5. **Load Balancing:** Add nginx reverse proxy

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `5001` |
| `HOST` | API host | `127.0.0.1` |
| `ENV` | Environment mode | `development` |
| `DEBUG` | Debug mode | `False` |
| `ORACLE_API_KEY` | Admin API key | `dev_key_12345` |
| `ORACLE_PUBLIC_KEY` | Public API key | `public_key_67890` |

### Production Recommendations
- Set `ENV=production`
- Use strong random API keys
- Enable HTTPS (reverse proxy)
- Configure log aggregation
- Set up monitoring alerts
- Use secrets management (Vault, AWS Secrets Manager)

## Monitoring & Operations

### Health Monitoring
```bash
# Basic health check
curl http://localhost:5001/health

# Detailed status
curl -H "X-API-Key: public_key_67890" \
  http://localhost:5001/status

# Admin stats (requires admin key)
curl -H "X-API-Key: dev_key_12345" \
  http://localhost:5001/admin/stats
```

### Log Monitoring
```bash
# Docker logs
docker logs -f exs-oracle

# Docker Compose logs
docker-compose -f docker-compose.exs.yml logs -f oracle-api
```

### Metrics to Monitor
- Request rate (requests/second)
- Error rate (4xx, 5xx responses)
- Response time (p50, p95, p99)
- Uptime percentage
- Active connections
- Memory usage
- CPU usage

## Future Enhancements

### Short-term
- [ ] Rate limiting per API key
- [ ] Redis cache for multi-instance support
- [ ] Prometheus metrics endpoint
- [ ] OpenAPI/Swagger documentation
- [ ] Unit test suite
- [ ] Integration test suite

### Medium-term
- [ ] WebSocket support for real-time updates
- [ ] OAuth2 authentication option
- [ ] Database persistence (PostgreSQL)
- [ ] Grafana dashboards
- [ ] Alert configuration (PagerDuty, Slack)
- [ ] API versioning (v1, v2)

### Long-term
- [ ] Machine learning for smarter prophecies
- [ ] Natural language processing
- [ ] Multi-language support
- [ ] GraphQL API option
- [ ] Mobile app integration
- [ ] Advanced analytics

## Troubleshooting

### Oracle API Won't Start
1. Check port 5001 is not in use: `lsof -i :5001`
2. Verify dependencies installed: `pip install -r requirements.txt`
3. Check logs for errors
4. Verify Python version ≥ 3.11

### Portal Shows "OFFLINE"
1. Verify Oracle API is running
2. Check CORS configuration
3. Verify API key is correct
4. Check browser console for errors
5. Verify network connectivity

### Slow Response Times
1. Check worker count (increase if needed)
2. Monitor CPU/memory usage
3. Check for blocking operations
4. Consider caching frequently accessed data
5. Profile with `cProfile`

### Docker Build Failures
1. Verify Dockerfile paths are correct
2. Check context directory
3. Ensure all source files exist
4. Verify base image availability
5. Check Docker daemon status

## License

BSD 3-Clause License

Copyright (c) 2025, Travis D. Jones (holedozer@gmail.com)

## Contact

- **Author:** Travis D. Jones
- **Email:** holedozer@gmail.com
- **Project:** Excalibur $EXS Protocol

---

**Document Version:** 1.0.0  
**Last Updated:** January 2, 2026  
**Status:** ✅ Implementation Complete
