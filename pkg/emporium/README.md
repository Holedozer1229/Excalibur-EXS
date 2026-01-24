# Emporium of Man - Sovereign Vault & Grail Management System

The **Emporium of Man** is a comprehensive system embedded into Merlin's Portal for managing Sovereign Vaults, tracking Grail achievements, monitoring blockchain activity, and handling prophecy inscriptions.

## Overview

The Emporium of Man provides:

- **Sovereign Vault Management**: Secure storage for $EXS tokens with the SOVEREIGN_RUNE system
- **Grail Ergotropy Mechanics**: Progressive achievement system with power levels
- **Blockchain Monitoring**: Real-time tracking of prophecy inscriptions and transactions
- **Quest System**: Challenges and rewards to engage users
- **Leaderboards**: Competitive rankings across multiple metrics

## Architecture

### Components

1. **`blockchain_monitor.py`**: Monitors blockchain for prophecy inscriptions and transactions
2. **`grail_logic.py`**: Business logic for Sovereign Vault and Grail ergotropy mechanics
3. **`emporium_endpoints.py`**: REST API endpoints for all Emporium functionality

### Integration

The Emporium is integrated into the existing Forge API at `cmd/forge-api/app.py` and provides a Flask Blueprint that can be registered with any Flask application.

## API Endpoints

### System Status

#### `GET /emporium/status`
Get overall system status including blockchain monitoring, vault statistics, and available achievements.

**Response:**
```json
{
  "success": true,
  "status": "operational",
  "blockchain": {
    "is_monitoring": true,
    "network": "mainnet",
    "current_block": 12345,
    "total_inscriptions": 100
  },
  "vaults": {
    "total": 50,
    "total_balance": "10000.0",
    "total_ergotropy": "5000.0"
  }
}
```

### Vault Management

#### `POST /emporium/vault/create`
Create a new Sovereign Vault.

**Request:**
```json
{
  "owner_address": "bc1p..."
}
```

**Response:**
```json
{
  "success": true,
  "vault": {
    "vault_id": "abc123...",
    "owner_address": "bc1p...",
    "balance": "0",
    "grail_level": "novice",
    "ergotropy": "0"
  }
}
```

#### `GET /emporium/vault/<vault_id>`
Get detailed vault information including status, achievements, and active quests.

#### `POST /emporium/vault/<vault_id>/deposit`
Deposit $EXS into a vault.

**Request:**
```json
{
  "amount": "100.0"
}
```

#### `POST /emporium/vault/<vault_id>/withdraw`
Withdraw $EXS from a vault.

**Request:**
```json
{
  "amount": "50.0"
}
```

#### `POST /emporium/vault/<vault_id>/forge`
Record a forge completion and award ergotropy.

**Response:**
```json
{
  "success": true,
  "operation": "forge",
  "ergotropy_gained": "10"
}
```

#### `POST /emporium/vault/<vault_id>/prophecy`
Record a prophecy inscription and award ergotropy.

**Response:**
```json
{
  "success": true,
  "operation": "prophecy",
  "ergotropy_gained": "25"
}
```

### Blockchain Monitoring

#### `GET /emporium/inscriptions?limit=100&confirmed_only=false`
Get prophecy inscriptions with optional filtering.

**Response:**
```json
{
  "success": true,
  "inscriptions": [
    {
      "inscription_id": "abc123",
      "block_height": 12345,
      "axiom": "sword legend...",
      "vault_address": "bc1p...",
      "confirmed": true
    }
  ],
  "count": 100
}
```

#### `POST /emporium/inscriptions/record`
Record a new prophecy inscription.

**Request:**
```json
{
  "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
  "vault_address": "bc1p...",
  "txid": "abcd1234...",
  "block_height": 12345
}
```

#### `GET /emporium/events?limit=50`
Get recent blockchain events.

### Leaderboards

#### `GET /emporium/leaderboard?metric=ergotropy&limit=10`
Get Grail leaderboard ranked by specified metric.

**Metrics:**
- `ergotropy`: Grail power level
- `balance`: Vault balance
- `forges`: Total forge count
- `prophecies`: Total prophecy count

### Execute Operations

#### `POST /emporium/execute`
Execute various Emporium operations in a unified endpoint.

**Request:**
```json
{
  "operation": "forge",
  "vault_id": "abc123",
  "params": {}
}
```

**Supported operations:** `forge`, `prophecy`, `deposit`, `withdraw`

## Grail System

### Grail Levels

The Grail system has six progressive levels based on ergotropy:

| Level | Ergotropy Required |
|-------|-------------------|
| Novice | 0 |
| Apprentice | 100 |
| Adept | 500 |
| Master | 2,000 |
| Grandmaster | 10,000 |
| Sovereign | 50,000 |

### Ergotropy Mechanics

- **Forge Completion**: +10 ergotropy
- **Prophecy Inscription**: +25 ergotropy
- **Daily Decay**: 1% per day (encourages active participation)
- **Achievement Bonuses**: Varies by achievement

### Achievements

Achievements unlock automatically when conditions are met and provide ergotropy bonuses:

- **First Forge**: +50 ergotropy
- **Forge Master** (10 forges): +200 ergotropy
- **Prophet Awakened** (first prophecy): +100 ergotropy
- **Grail Adept** (reach Adept level): +500 ergotropy
- **Sovereign Rune Unlocked** (reach Sovereign level): +5,000 ergotropy

### Quest System

Active quests provide structured goals with rewards:

- **Daily Forge Challenge**: Complete 3 forges for +50 ergotropy and 10 $EXS
- **Prophecy Chain**: Inscribe 5 prophecies for +150 ergotropy and 25 $EXS
- **Vault Builder**: Accumulate 1,000 $EXS for +500 ergotropy

## Usage Example

```python
from flask import Flask
from pkg.emporium.emporium_endpoints import create_emporium_api

app = Flask(__name__)

# Register Emporium API
emporium_api = create_emporium_api(app)

if __name__ == '__main__':
    app.run()
```

## Security Considerations

1. **Authentication**: Integrate with Merlin's Portal authentication (JWT/OAuth2)
2. **Input Validation**: All inputs are validated before processing
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Transaction Verification**: Validate blockchain transactions before recording
5. **Access Control**: Ensure users can only access their own vaults

## Future Enhancements

- [ ] AWS Lambda integration for event-driven monitoring
- [ ] WebSocket support for real-time event streaming
- [ ] Advanced quest system with time-limited challenges
- [ ] Social features (guilds, cooperative quests)
- [ ] Cross-chain prophecy inscriptions
- [ ] NFT achievements for significant milestones

## License

BSD 3-Clause License  
Copyright (c) 2025, Travis D. Jones

## Author

Travis D. Jones <holedozer@icloud.com>
