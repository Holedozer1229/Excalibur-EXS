# Excalibur $EXS - Docker Deployment Guide

Complete containerized deployment with Docker Compose for production environments.

## Quick Start (3 Commands)

```bash
# 1. Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# 2. Configure SSL certificates (create self-signed for testing)
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem \
  -out docker/nginx/ssl/fullchain.pem \
  -subj "/CN=www.excaliburcrypto.com"

# 3. Launch all services
docker-compose up -d
```

## Services Overview

The Docker Compose stack includes:

- **Website (Nginx)** - Main portal on ports 80/443
- **Treasury API (Go)** - Fee collection backend on port 8080
- **Forge Processor (Python)** - Mining API on port 5000
- **Redis** - Caching and rate limiting on port 6379

## Configuration

### Environment Variables

Create `.env` file in root directory:

```bash
# Treasury Configuration
TREASURY_PORT=8080
TREASURY_ENV=production

# Forge Configuration
FORGE_PORT=5000
FORGE_DIFFICULTY=4
FLASK_ENV=production

# Redis Configuration
REDIS_PORT=6379

# Domain Configuration
DOMAIN=www.excaliburcrypto.com
```

### SSL Certificates

For production with Let's Encrypt:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d www.excaliburcrypto.com

# Copy to Docker volume
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/privkey.pem docker/nginx/ssl/
```

### Admin Portal Authentication

Create password file for Merlin's Sanctum:

```bash
# Install htpasswd
sudo apt-get install apache2-utils

# Create password
htpasswd -c docker/nginx/.htpasswd merlin

# Add to docker-compose.yml volumes:
volumes:
  - ./docker/nginx/.htpasswd:/etc/nginx/.htpasswd:ro
```

## Service Management

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service
docker-compose logs -f website
docker-compose logs -f treasury
docker-compose logs -f forge-processor
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart treasury
```

### Update Services

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

## Health Checks

### Website
```bash
curl https://www.excaliburcrypto.com/
```

### Treasury API
```bash
curl http://localhost:8080/health
curl http://localhost:8080/stats
```

### Forge API
```bash
curl http://localhost:5000/health
curl http://localhost:5000/treasury/stats
```

### Redis
```bash
docker-compose exec redis redis-cli ping
```

## API Endpoints

### Treasury API (Port 8080)

```bash
# Health check
GET /health

# Get treasury statistics
GET /stats

# Get treasury balance
GET /balance

# Process forge (requires miner address)
POST /forge
Content-Type: application/json
{"miner_address": "bc1p..."}

# Get distribution history
GET /distributions
```

### Forge API (Port 5000)

```bash
# Health check
GET /health

# Execute mining
POST /mine
Content-Type: application/json
{"axiom": "sword legend...", "difficulty": 4}

# Process forge
POST /forge
Content-Type: application/json
{"axiom": "...", "nonce": 42, "hash": "0000..."}

# Get treasury stats
GET /treasury/stats

# Get revenue stats
GET /revenue/stats

# Calculate user rewards
POST /revenue/calculate
Content-Type: application/json
{
  "user_stake": "1000",
  "total_staked": "100000",
  "forge_count": 50,
  "holding_months": 12,
  "is_lp": true
}

# Process revenue from stream
POST /revenue/process
Content-Type: application/json
{
  "stream": "cross_chain_mining",
  "amount": "100.5",
  "currency": "BTC"
}
```

## Monitoring

### Container Status
```bash
docker-compose ps
```

### Resource Usage
```bash
docker stats
```

### Service Logs
```bash
# Follow all logs
docker-compose logs -f

# Last 100 lines from treasury
docker-compose logs --tail=100 treasury

# Logs since timestamp
docker-compose logs --since="2025-01-01T00:00:00"
```

## Backup and Restore

### Backup Data Volumes

```bash
# Create backup directory
mkdir -p backups

# Backup treasury data
docker run --rm -v excalibur_treasury-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/treasury-$(date +%Y%m%d).tar.gz -C /data .

# Backup forge data
docker run --rm -v excalibur_forge-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/forge-$(date +%Y%m%d).tar.gz -C /data .

# Backup Redis data
docker run --rm -v excalibur_redis-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Data Volumes

```bash
# Stop services
docker-compose down

# Restore treasury data
docker run --rm -v excalibur_treasury-data:/data -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/treasury-20250101.tar.gz"

# Restart services
docker-compose up -d
```

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Rate Limiting

Already configured in `nginx.conf`:
- API endpoints: 10 requests/second
- Forge endpoints: 1 request/minute

### 3. Network Isolation

Services communicate via internal Docker network `excalibur-net`.
Only Nginx exposes ports 80/443 to the public.

### 4. Regular Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y
```

## Troubleshooting

### Website Not Loading

```bash
# Check Nginx status
docker-compose logs website

# Verify certificate
openssl x509 -in docker/nginx/ssl/fullchain.pem -text -noout

# Test Nginx config
docker-compose exec website nginx -t
```

### API Not Responding

```bash
# Check service logs
docker-compose logs treasury
docker-compose logs forge-processor

# Check network connectivity
docker-compose exec website ping treasury
docker-compose exec website ping forge-processor
```

### High Memory Usage

```bash
# View resource usage
docker stats

# Restart specific service
docker-compose restart treasury

# Limit resources in docker-compose.yml:
services:
  treasury:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Redis Connection Issues

```bash
# Check Redis
docker-compose exec redis redis-cli ping

# View Redis info
docker-compose exec redis redis-cli info

# Flush Redis if needed
docker-compose exec redis redis-cli FLUSHALL
```

## Production Checklist

- [ ] SSL certificates configured (Let's Encrypt)
- [ ] Admin portal password set
- [ ] Firewall rules configured
- [ ] Domain DNS pointing to server
- [ ] Regular backups scheduled
- [ ] Monitoring alerts configured
- [ ] Resource limits set
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Health checks passing

## Support

For issues or questions:
- Email: holedozer@gmail.com
- Repository: https://github.com/Holedozer1229/Excalibur-EXS
- Documentation: See `README.md` and `PRODUCTION_TODO.md`

## License

BSD 3-Clause License - See LICENSE file for details
