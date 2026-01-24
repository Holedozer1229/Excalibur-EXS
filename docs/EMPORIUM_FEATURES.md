# 🏛️ Emporium of Man - Feature Documentation

## Overview

The **Emporium of Man** is a comprehensive system embedded within Merlin's Portal that provides advanced vault management, achievement tracking, and blockchain monitoring capabilities for the Excalibur-EXS ecosystem.

## Key Features

### 1. Sovereign Vault (SOVEREIGN_RUNE)

The Sovereign Vault is the cornerstone of the Emporium system, providing secure storage and management for $EXS tokens.

**Features:**
- Secure $EXS token storage with quantum-hardened encryption
- Multi-level access controls
- Automatic reward distribution
- Time-locked withdrawals for enhanced security
- Integration with Grail achievement system

**Vault Operations:**
- Create vault with Taproot address
- Deposit/withdraw $EXS tokens
- Track balance and transaction history
- Lock/unlock vault for security

### 2. Grail Ergotropy System

A progressive achievement and power system that rewards active participation in the Excalibur ecosystem.

**Grail Levels:**

| Level | Ergotropy Required | Benefits |
|-------|-------------------|----------|
| Novice | 0 | Basic vault access |
| Apprentice | 100 | Enhanced rewards |
| Adept | 500 | Advanced features |
| Master | 2,000 | Premium benefits |
| Grandmaster | 10,000 | Elite status |
| Sovereign | 50,000 | Maximum privileges |

**Ergotropy Mechanics:**
- **Forge Completion:** +10 ergotropy per forge
- **Prophecy Inscription:** +25 ergotropy per prophecy
- **Achievement Unlocks:** Bonus ergotropy rewards
- **Daily Decay:** 1% per day (encourages active participation)

### 3. Blockchain Monitoring

Real-time monitoring of blockchain activity related to prophecy inscriptions and transactions.

**Capabilities:**
- Live block processing
- Prophecy inscription tracking
- Transaction validation
- Event streaming for real-time updates
- Historical data access

**Event Types:**
- Block confirmations
- Prophecy inscriptions
- Vault transactions
- Achievement unlocks

### 4. Achievement System

Automated achievement tracking with ergotropy rewards.

**Available Achievements:**

| Achievement | Requirement | Ergotropy Reward |
|-------------|-------------|------------------|
| First Forge | Complete 1 forge | +50 |
| Forge Master | Complete 10 forges | +200 |
| Prophet Awakened | Inscribe 1 prophecy | +100 |
| Grail Adept | Reach Adept level | +500 |
| Sovereign Rune | Reach Sovereign level | +5,000 |

### 5. Quest System

Structured challenges that provide goals and rewards for users.

**Active Quests:**

1. **Daily Forge Challenge**
   - Requirement: Complete 3 forges
   - Rewards: +50 ergotropy, 10 $EXS

2. **Prophecy Chain**
   - Requirement: Inscribe 5 prophecies
   - Rewards: +150 ergotropy, 25 $EXS

3. **Vault Builder**
   - Requirement: Accumulate 1,000 $EXS in vault
   - Rewards: +500 ergotropy

### 6. Leaderboards

Competitive rankings across multiple metrics:

- **Ergotropy Leaderboard:** Highest Grail power levels
- **Balance Leaderboard:** Largest vault balances
- **Forge Leaderboard:** Most forges completed
- **Prophecy Leaderboard:** Most prophecies inscribed

## User Interface

### Emporium Dashboard

The main interface for interacting with the Emporium system, accessible from Merlin's Portal.

**Sections:**
1. **Overview:** Vault status, Grail level, ergotropy, and activity stats
2. **Quests:** Active challenges and progress tracking
3. **Leaderboard:** Competitive rankings

**Components:**
- Vault balance display with real-time updates
- Grail level indicator with progress bar
- Achievement showcase
- Quest progress trackers
- Activity statistics

### Blockchain Events Feed

Real-time display of blockchain events.

**Features:**
- Live event streaming
- Event type filtering
- Search and pagination
- Auto-refresh capability
- Detailed event information

### Prophecy History

Historical view of all prophecy inscriptions.

**Features:**
- Comprehensive inscription list
- Status filtering (confirmed/pending)
- Search functionality
- Pagination support
- Detailed inscription metadata

## API Endpoints

The Emporium provides a comprehensive REST API for programmatic access.

### Vault Management

- `POST /emporium/vault/create` - Create new vault
- `GET /emporium/vault/{vault_id}` - Get vault details
- `POST /emporium/vault/{vault_id}/deposit` - Deposit tokens
- `POST /emporium/vault/{vault_id}/withdraw` - Withdraw tokens
- `POST /emporium/vault/{vault_id}/forge` - Record forge
- `POST /emporium/vault/{vault_id}/prophecy` - Record prophecy

### Blockchain Monitoring

- `GET /emporium/inscriptions` - Get prophecy inscriptions
- `POST /emporium/inscriptions/record` - Record inscription
- `GET /emporium/events` - Get blockchain events

### System Status

- `GET /emporium/status` - Overall system status
- `POST /emporium/execute` - Execute operations
- `GET /emporium/leaderboard` - Get leaderboards

See [pkg/emporium/README.md](../pkg/emporium/README.md) for complete API documentation.

## Security Features

### Authentication & Authorization

- HPP-1 hardened authentication (600,000 PBKDF2-HMAC-SHA512 iterations)
- JWT token-based session management
- Role-based access control (RBAC)
- Multi-factor authentication support

### Data Protection

- Quantum-resistant encryption for vault data
- Secure key derivation (HPP-1 protocol)
- Encrypted API communications (HTTPS/TLS)
- Regular security audits

### Rate Limiting

- API rate limiting per user/IP
- Brute force protection
- DDoS mitigation

## Integration

### Frontend Integration

The Emporium components are built with React/TypeScript and can be easily integrated into any Next.js or React application.

```tsx
import EmporiumDashboard from '@/portals/components/EmporiumDashboard';

export default function MyPage() {
  return <EmporiumDashboard />;
}
```

### Backend Integration

The Emporium API is implemented as a Flask Blueprint and can be registered with any Flask application.

```python
from pkg.emporium.emporium_endpoints import create_emporium_api

app = Flask(__name__)
emporium_api = create_emporium_api(app)
```

See [EMPORIUM_INTEGRATION.md](../EMPORIUM_INTEGRATION.md) for detailed integration guide.

## Deployment

### Docker Deployment

The Emporium is containerized and can be deployed using Docker Compose.

```bash
docker-compose up -d emporium
```

### Production Deployment

For production deployments, see:
- [EMPORIUM_INTEGRATION.md](../EMPORIUM_INTEGRATION.md) - Integration guide
- [docker/Dockerfile.emporium](../docker/Dockerfile.emporium) - Docker configuration
- [.github/workflows/emporium-ci.yml](../.github/workflows/emporium-ci.yml) - CI/CD pipeline

## Future Enhancements

### Planned Features

- [ ] AWS Lambda integration for serverless event processing
- [ ] WebSocket support for real-time event streaming
- [ ] Advanced quest system with time-limited challenges
- [ ] Social features (guilds, cooperative quests)
- [ ] Cross-chain prophecy inscriptions
- [ ] NFT achievements for significant milestones
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Automated trading integration
- [ ] Multi-signature vault support

### Scaling Enhancements

- AWS Managed Blockchain integration
- AWS ELB for load balancing
- CloudWatch for centralized logging
- AWS Lambda for event-driven processing
- Horizontal scaling with Kubernetes

## Support & Documentation

- **Main Documentation:** [pkg/emporium/README.md](../pkg/emporium/README.md)
- **Integration Guide:** [EMPORIUM_INTEGRATION.md](../EMPORIUM_INTEGRATION.md)
- **API Reference:** See endpoint documentation in README
- **GitHub Issues:** https://github.com/Holedozer1229/Excalibur-EXS/issues

## License

BSD 3-Clause License  
Copyright (c) 2025, Travis D. Jones

## Author

Travis D. Jones  
Email: holedozer@icloud.com
