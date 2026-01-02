# Excalibur-EXS Console Node - Deployment Guide

## Quick Start

### 1. Install Binary

#### Linux
```bash
wget https://github.com/Holedozer1229/Excalibur-EXS/releases/latest/download/excalibur-exs-linux-amd64.tar.gz
tar -xzf excalibur-exs-linux-amd64.tar.gz
sudo mv exs-node /usr/local/bin/
sudo chmod +x /usr/local/bin/exs-node
```

#### macOS
```bash
curl -L https://github.com/Holedozer1229/Excalibur-EXS/releases/latest/download/excalibur-exs-darwin-amd64.tar.gz -o excalibur-exs.tar.gz
tar -xzf excalibur-exs.tar.gz
sudo mv exs-node /usr/local/bin/
sudo chmod +x /usr/local/bin/exs-node
```

#### Windows
1. Download `excalibur-exs-windows-amd64.zip`
2. Extract to `C:\Program Files\Excalibur-EXS\`
3. Add to PATH environment variable

### 2. Initialize

```bash
exs-node config init
```

### 3. Create Wallet

```bash
exs-node wallet create my-wallet --passphrase "secure-password"
```

### 4. Start Mining

```bash
exs-node mine start --address bc1p... --threads 4
```

## AWS Production Deployment

### Prerequisites
- AWS Account
- EC2 instance (t3.xlarge or better)
- Elastic IP
- Route 53 domain
- SSL certificate

### Step 1: Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 LTS
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.xlarge \
  --key-name excalibur-key \
  --security-group-ids sg-xxxx \
  --subnet-id subnet-xxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Excalibur-EXS-Node}]'
```

### Step 2: Configure Security Groups

```bash
# Allow HTTPS, HTTP, P2P, SSH
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxx \
  --ip-permissions \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=8333,ToPort=8333,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=YOUR_IP/32}]'
```

### Step 3: Install Dependencies

```bash
ssh -i excalibur-key.pem ubuntu@<instance-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Apache
sudo apt install apache2 -y

# Install Let's Encrypt
sudo apt install certbot python3-certbot-apache -y

# Install Python
sudo apt install python3 python3-pip -y
```

### Step 4: Deploy Application

```bash
# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Build binaries
./scripts/build/build-all.sh

# Install binary
sudo cp build/linux/exs-node /usr/local/bin/
sudo chmod +x /usr/local/bin/exs-node

# Install Python wallet
sudo cp cmd/exs-wallet/wallet_cli.py /usr/local/bin/exs-wallet
sudo chmod +x /usr/local/bin/exs-wallet
```

### Step 5: Configure Apache

```bash
# Copy Apache configuration
sudo cp config/apache/excalibur-exs.conf /etc/apache2/sites-available/

# Enable required modules
sudo a2enmod proxy proxy_http proxy_wstunnel ssl rewrite headers

# Enable site
sudo a2ensite excalibur-exs

# Disable default site
sudo a2dissite 000-default

# Create web root
sudo mkdir -p /var/www/excaliburcrypto.com
sudo cp -r web/* /var/www/excaliburcrypto.com/
sudo cp -r admin /var/www/excaliburcrypto.com/
sudo cp -r website/* /var/www/excaliburcrypto.com/

# Set permissions
sudo chown -R www-data:www-data /var/www/excaliburcrypto.com
```

### Step 6: SSL Certificate

```bash
# Get SSL certificate
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 7: Create Systemd Service

```bash
sudo tee /etc/systemd/system/excalibur-exs.service << EOF
[Unit]
Description=Excalibur-EXS Console Node
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/usr/local/bin/exs-node node start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable excalibur-exs
sudo systemctl start excalibur-exs
```

### Step 8: Configure RPC Authentication

```bash
# Create RPC password file
sudo htpasswd -c /etc/apache2/.htpasswd-rpc excalibur
sudo chmod 640 /etc/apache2/.htpasswd-rpc
sudo chown www-data:www-data /etc/apache2/.htpasswd-rpc

# Create admin password file
sudo htpasswd -c /etc/apache2/.htpasswd-merlin admin
sudo chmod 640 /etc/apache2/.htpasswd-merlin
sudo chown www-data:www-data /etc/apache2/.htpasswd-merlin

# Restart Apache
sudo systemctl restart apache2
```

### Step 9: Configure Monitoring

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json << EOF
{
  "metrics": {
    "namespace": "Excalibur-EXS",
    "metrics_collected": {
      "cpu": {
        "measurement": [{"name": "cpu_usage_idle"}],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [{"name": "used_percent"}],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [{"name": "mem_used_percent"}],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/apache2/excalibur-*.log",
            "log_group_name": "/aws/excalibur-exs/apache",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json
```

### Step 10: Setup Backup

```bash
# Create S3 bucket for backups
aws s3 mb s3://excalibur-exs-backups

# Create backup script
sudo tee /usr/local/bin/backup-excalibur.sh << 'EOF'
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
DATADIR="/home/ubuntu/.excalibur-exs"
S3_BUCKET="s3://excalibur-exs-backups"

# Backup data
tar -czf /tmp/excalibur_$BACKUP_DATE.tar.gz $DATADIR
aws s3 cp /tmp/excalibur_$BACKUP_DATE.tar.gz $S3_BUCKET/backups/ --sse AES256

# Cleanup
find /tmp -name "excalibur_*.tar.gz" -mtime +7 -delete

# Rotate S3 backups (keep 30 days)
aws s3 ls $S3_BUCKET/backups/ | awk '{print $4}' | head -n -30 | \
  xargs -I {} aws s3 rm $S3_BUCKET/backups/{}
EOF

sudo chmod +x /usr/local/bin/backup-excalibur.sh

# Add to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-excalibur.sh") | crontab -
```

### Step 11: Verify Deployment

```bash
# Check service status
sudo systemctl status excalibur-exs

# Check Apache status
sudo systemctl status apache2

# Check logs
sudo journalctl -u excalibur-exs -f

# Test endpoints
curl https://excaliburcrypto.com
curl https://excaliburcrypto.com/api/health

# Test RPC (with authentication)
curl -u excalibur:password \
  -H "Content-Type: application/json" \
  -X POST \
  --data '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}' \
  https://excaliburcrypto.com/rpc
```

## Docker Deployment

```bash
# Build Docker image
docker build -t excalibur-exs:latest .

# Run container
docker run -d \
  --name excalibur-node \
  -p 8332:8332 \
  -p 8333:8333 \
  -v ~/.excalibur-exs:/root/.excalibur-exs \
  excalibur-exs:latest \
  exs-node node start

# Or use docker-compose
docker-compose up -d
```

## Monitoring & Maintenance

### Health Checks

```bash
# Node status
exs-node node status

# Mining stats
exs-node mine stats

# Revenue streams
exs-node revenue show

# Dashboard
exs-node dashboard
```

### Log Files

- Node logs: `journalctl -u excalibur-exs`
- Apache logs: `/var/log/apache2/excalibur-*.log`
- System logs: `/var/log/syslog`

### Updates

```bash
# Update binary
wget https://github.com/Holedozer1229/Excalibur-EXS/releases/latest/download/excalibur-exs-linux-amd64.tar.gz
tar -xzf excalibur-exs-linux-amd64.tar.gz
sudo systemctl stop excalibur-exs
sudo mv exs-node /usr/local/bin/
sudo systemctl start excalibur-exs
```

## Troubleshooting

### Node Won't Start

```bash
# Check configuration
exs-node config show

# Check permissions
ls -la ~/.excalibur-exs

# Check logs
sudo journalctl -u excalibur-exs -n 100
```

### Apache Issues

```bash
# Test configuration
sudo apache2ctl configtest

# Check error log
sudo tail -f /var/log/apache2/excalibur-error.log

# Restart Apache
sudo systemctl restart apache2
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

## Performance Tuning

### Database Cache

```yaml
# config.yaml
performance:
  db_cache: 2048  # Increase for more RAM
```

### Connection Limits

```yaml
p2p:
  max_peers: 250  # Increase for better connectivity
```

### Thread Count

```bash
# Set optimal thread count for mining
exs-node mine start --threads $(nproc)
```

## Security Hardening

### Firewall

```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 8333/tcp  # P2P
sudo ufw enable
```

### Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Updates

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

---

**Support:** holedozer@gmail.com  
**Documentation:** https://github.com/Holedozer1229/Excalibur-EXS
