# AWS Managed Blockchain Bitcoin Integration Guide

## Overview

Excalibur-EXS aligns with AWS Managed Blockchain Bitcoin best practices for enterprise-grade blockchain deployment.

## AWS Architecture Alignment

### 1. Bitcoin Core Compatibility

Excalibur-EXS maintains full Bitcoin Core compatibility:
- JSON-RPC interface compatible with Bitcoin Core
- P2P protocol adherence (Bitcoin Wire Protocol)
- Block validation following Bitcoin consensus rules
- Transaction validation and propagation

### 2. AWS Deployment Structure

```
AWS Infrastructure
├── Application Load Balancer (ALB)
│   ├── HTTPS (443) → Application Servers
│   └── Health checks
├── Auto Scaling Group
│   ├── EC2 Instances (t3.xlarge or better)
│   │   ├── Excalibur-EXS Node
│   │   ├── Apache/Nginx Web Server
│   │   └── RPC Interface
│   └── CloudWatch Monitoring
├── RDS/DocumentDB
│   └── Wallet and metadata storage
├── S3
│   ├── Blockchain data backups
│   └── Static asset serving
└── CloudFront
    └── Global CDN distribution
```

### 3. Apache Server Configuration

Location: `/etc/apache2/sites-available/excalibur-exs.conf`

```apache
<VirtualHost *:80>
    ServerName excaliburcrypto.com
    ServerAlias www.excaliburcrypto.com
    
    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName excaliburcrypto.com
    ServerAlias www.excaliburcrypto.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/excaliburcrypto.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/excaliburcrypto.com/privkey.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    
    # Document Root
    DocumentRoot /var/www/excaliburcrypto.com
    
    # Static files
    <Directory /var/www/excaliburcrypto.com>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # RPC Proxy (Bitcoin Core compatible)
    ProxyPreserveHost On
    ProxyPass /rpc http://localhost:8332/
    ProxyPassReverse /rpc http://localhost:8332/
    
    # WebSocket support for real-time updates
    ProxyPass /ws ws://localhost:8333/
    ProxyPassReverse /ws ws://localhost:8333/
    
    # API endpoints
    ProxyPass /api http://localhost:8080/
    ProxyPassReverse /api http://localhost:8080/
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/excalibur-error.log
    CustomLog ${APACHE_LOG_DIR}/excalibur-access.log combined
</VirtualHost>
```

### 4. Bitcoin Consensus Rules

Excalibur-EXS implements full Bitcoin consensus validation:

#### Block Validation
- Block header validation (80 bytes)
- Proof-of-Work verification
- Block size limits (4MB weight units)
- Transaction merkle root verification
- Timestamp validation
- Difficulty adjustment (Excalibur: 144 blocks vs Bitcoin: 2016)

#### Transaction Validation
- Input validation (UTXO verification)
- Output validation (script validity)
- Signature verification (ECDSA, Schnorr for Taproot)
- Double-spend prevention
- Fee validation
- Script execution limits

#### Network Protocol
- P2P message handling (version, verack, ping, pong, etc.)
- Block propagation (inv, getdata, block)
- Transaction relay (tx, mempool)
- Peer discovery (addr, getaddr)

### 5. JSON-RPC API Endpoints

Bitcoin Core compatible RPC interface:

```bash
# Blockchain queries
getblockcount
getblockhash <height>
getblock <hash>
gettransaction <txid>
getbalance [account]

# Wallet operations  
getnewaddress [label] [address_type]
sendtoaddress <address> <amount>
listunspent [minconf] [maxconf]
signrawtransaction <hex>

# Mining
getmininginfo
submitblock <hexdata>
getblocktemplate

# Network
getpeerinfo
getnetworkinfo
addnode <node> <add|remove|onetry>
```

### 6. Security Considerations

#### AWS Security Groups
```yaml
Inbound Rules:
  - Port 443 (HTTPS): 0.0.0.0/0
  - Port 80 (HTTP): 0.0.0.0/0 (redirect to 443)
  - Port 8333 (P2P): 0.0.0.0/0
  - Port 8332 (RPC): VPC only (10.0.0.0/8)
  - Port 22 (SSH): Admin IP only

Outbound Rules:
  - All traffic: 0.0.0.0/0
```

#### IAM Roles
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::excalibur-exs-blockchain/*",
        "arn:aws:s3:::excalibur-exs-backups/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 7. Monitoring and Logging

#### CloudWatch Metrics
- Node sync status
- Block height
- Transaction throughput
- Network connections
- Memory usage
- Disk usage
- CPU utilization

#### CloudWatch Logs
- Application logs
- Apache access/error logs
- Node P2P messages
- RPC call logs
- Mining statistics

### 8. Backup and Disaster Recovery

```bash
# S3 backup script
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BLOCKCHAIN_DIR="/var/lib/excalibur-exs"
S3_BUCKET="s3://excalibur-exs-backups"

# Backup blockchain data
tar -czf /tmp/blockchain_$BACKUP_DATE.tar.gz $BLOCKCHAIN_DIR
aws s3 cp /tmp/blockchain_$BACKUP_DATE.tar.gz $S3_BUCKET/blockchain/

# Backup wallets
tar -czf /tmp/wallets_$BACKUP_DATE.tar.gz ~/.excalibur-exs/wallets/
aws s3 cp /tmp/wallets_$BACKUP_DATE.tar.gz $S3_BUCKET/wallets/ --sse AES256

# Cleanup old backups (keep 7 days)
find /tmp -name "blockchain_*.tar.gz" -mtime +7 -delete
aws s3 ls $S3_BUCKET/blockchain/ | awk '{print $4}' | head -n -7 | xargs -I {} aws s3 rm $S3_BUCKET/blockchain/{}
```

### 9. CI/CD Pipeline

```yaml
# .github/workflows/aws-deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Go binaries
        run: |
          cd cmd/exs-node
          GOOS=linux GOARCH=amd64 go build -o exs-node
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy to EC2
        run: |
          aws s3 cp cmd/exs-node/exs-node s3://excalibur-exs-releases/
          aws ssm send-command \
            --document-name "AWS-RunShellScript" \
            --targets "Key=tag:Environment,Values=Production" \
            --parameters 'commands=["cd /opt/excalibur-exs && ./update.sh"]'
```

### 10. Performance Optimization

#### Apache MPM Settings
```apache
<IfModule mpm_worker_module>
    StartServers             4
    MinSpareThreads         25
    MaxSpareThreads         75
    ThreadLimit             64
    ThreadsPerChild         25
    MaxRequestWorkers      400
    MaxConnectionsPerChild  0
</IfModule>
```

#### Node Configuration
```yaml
# config.yaml
network: mainnet
rpc:
  enabled: true
  bind: 127.0.0.1
  port: 8332
  max_connections: 100
  
p2p:
  bind: 0.0.0.0
  port: 8333
  max_peers: 125
  
performance:
  db_cache: 450  # MB
  max_mempool: 300  # MB
  max_orphan_tx: 100
  
storage:
  prune: false
  txindex: true
  blockfilterindex: true
```

## Compliance and Best Practices

1. **Consensus Adherence**: Full Bitcoin consensus validation
2. **Security**: Multi-layer security (AWS, application, cryptographic)
3. **Scalability**: Auto-scaling based on load
4. **Reliability**: Multi-AZ deployment, automated failover
5. **Monitoring**: Comprehensive logging and metrics
6. **Backup**: Regular automated backups with encryption
7. **Updates**: Blue-green deployment for zero downtime

## References

- AWS Managed Blockchain Bitcoin Documentation
- Bitcoin Core Developer Guide
- Apache HTTP Server Documentation
- AWS Well-Architected Framework
