# Emporium of Man - Integration Guide

This guide provides step-by-step instructions for integrating and deploying the Emporium of Man functionality within the Excalibur-EXS ecosystem.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Locally](#running-locally)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment](#production-deployment)
7. [API Integration](#api-integration)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher (for frontend)
- Docker and Docker Compose (for containerized deployment)
- Redis (for caching and rate limiting)
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd web/forge-ui
npm install
cd ../..
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# Emporium Configuration
EMPORIUM_NETWORK=mainnet  # or testnet, regtest
START_BLOCK=0  # Optional: starting block for monitoring

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Logging
LOG_LEVEL=INFO
```

### Configuration Files

No additional configuration files are required for basic operation. The Emporium uses sensible defaults.

## Running Locally

### Backend (Flask API)

```bash
# Run the Flask development server
python cmd/forge-api/app.py
```

The API will be available at `http://localhost:5000`

### Frontend (Next.js)

```bash
# In a separate terminal
cd web/forge-ui
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Access Merlin's Portal

1. Navigate to `http://localhost:3000/merlins-portal`
2. Authenticate with the King's Vector
3. Click on the "🏛️ Emporium" tab

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f emporium

# Stop services
docker-compose down
```

### Individual Service Management

```bash
# Start only the Emporium service
docker-compose up -d emporium

# Restart the service
docker-compose restart emporium

# View service status
docker-compose ps
```

## Production Deployment

### Using Docker Compose (Recommended)

1. **Configure Environment Variables**

Create a `.env.production` file:

```bash
FLASK_ENV=production
ENV=production
EMPORIUM_NETWORK=mainnet
SECRET_KEY=<generate-secure-key>
REDIS_HOST=redis
```

2. **Build Production Images**

```bash
docker-compose -f docker-compose.yml build
```

3. **Deploy Services**

```bash
docker-compose -f docker-compose.yml up -d
```

4. **Configure Nginx Reverse Proxy**

Add to your Nginx configuration:

```nginx
# Emporium API
location /emporium/ {
    proxy_pass http://localhost:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### AWS Deployment (Advanced)

For production AWS deployment:

1. **Use AWS ECS/EKS** for container orchestration
2. **Use AWS RDS** or ElastiCache for Redis
3. **Configure AWS ALB** for load balancing
4. **Set up CloudWatch** for logging and monitoring
5. **Use AWS Secrets Manager** for sensitive configuration

See `docs/AWS_DEPLOYMENT.md` for detailed instructions (to be created).

## API Integration

### Python Client Example

```python
import requests

# Create a vault
response = requests.post('http://localhost:5000/emporium/vault/create', json={
    'owner_address': 'bc1p...'
})
vault = response.json()

# Get vault status
vault_id = vault['vault']['vault_id']
response = requests.get(f'http://localhost:5000/emporium/vault/{vault_id}')
status = response.json()

# Record a forge
response = requests.post(f'http://localhost:5000/emporium/vault/{vault_id}/forge')
result = response.json()
print(f"Gained {result['ergotropy_gained']} ergotropy!")
```

### JavaScript/TypeScript Client Example

```typescript
// Create a vault
const createVault = async (ownerAddress: string) => {
  const response = await fetch('/emporium/vault/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner_address: ownerAddress }),
  });
  return await response.json();
};

// Get vault status
const getVaultStatus = async (vaultId: string) => {
  const response = await fetch(`/emporium/vault/${vaultId}`);
  return await response.json();
};
```

## Frontend Integration

### Using the Emporium Components

The Emporium components are designed to be easily integrated into any React/Next.js application.

#### EmporiumDashboard Component

```tsx
import EmporiumDashboard from '@/portals/components/EmporiumDashboard';

export default function MyPage() {
  return (
    <div>
      <EmporiumDashboard />
    </div>
  );
}
```

#### BlockchainEvents Component

```tsx
import BlockchainEvents from '@/portals/components/BlockchainEvents';

export default function EventsPage() {
  return (
    <BlockchainEvents 
      limit={50} 
      autoRefresh={true} 
      refreshInterval={30000} 
    />
  );
}
```

#### ProphecyHistory Component

```tsx
import ProphecyHistory from '@/portals/components/ProphecyHistory';

export default function HistoryPage() {
  return (
    <ProphecyHistory 
      limit={100} 
      confirmedOnly={false} 
    />
  );
}
```

## Testing

### Backend Tests

```bash
# Test imports
python -c "from pkg.emporium import BlockchainMonitor, GrailLogic, EmporiumAPI"

# Run linting
flake8 pkg/emporium
```

### Frontend Tests

```bash
cd web/forge-ui
npm run lint
npm run type-check
```

### Integration Tests

```bash
# Start services
docker-compose up -d

# Run integration tests
python -m pytest tests/integration/

# Stop services
docker-compose down
```

## Troubleshooting

### Common Issues

#### 1. Import Error: Cannot find module 'pkg.emporium'

**Solution:** Ensure you're running from the repository root and Python path is set correctly:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python cmd/forge-api/app.py
```

#### 2. Redis Connection Error

**Solution:** Ensure Redis is running:

```bash
# Check if Redis is running
docker-compose ps redis

# Start Redis
docker-compose up -d redis
```

#### 3. Port Already in Use

**Solution:** Change the port in docker-compose.yml or stop the conflicting service:

```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

#### 4. Frontend Cannot Connect to API

**Solution:** Configure Next.js API proxy in `next.config.js`:

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/emporium/:path*',
        destination: 'http://localhost:5000/emporium/:path*',
      },
    ];
  },
};
```

#### 5. Authentication Errors

**Solution:** Ensure proper JWT token configuration:

```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Set in .env file
SECRET_KEY=<generated-key>
```

### Debugging

Enable debug mode for detailed logging:

```bash
# Backend
export FLASK_DEBUG=True
export LOG_LEVEL=DEBUG

# Frontend
npm run dev
```

View logs:

```bash
# Docker logs
docker-compose logs -f emporium

# Application logs
tail -f logs/emporium.log
```

## Support

For issues and questions:

- **GitHub Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Documentation**: See `pkg/emporium/README.md`
- **Email**: holedozer@icloud.com

## Next Steps

After successful integration:

1. Configure authentication and access controls
2. Set up monitoring and alerting
3. Configure backups for vault data
4. Implement rate limiting
5. Set up SSL/TLS certificates
6. Configure AWS services for production

See individual documentation files for detailed guides on each topic.

## License

BSD 3-Clause License  
Copyright (c) 2025, Travis D. Jones
