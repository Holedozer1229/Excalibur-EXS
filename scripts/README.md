# Excalibur $EXS Scripts

This directory contains various scripts for managing, deploying, and initializing the Excalibur $EXS Protocol.

## 🏗️ Blockchain Initialization

### premine.py
**Premining Script** - Initialize the Genesis block and premined blocks for the blockchain.

```bash
# Mine 100 blocks (default)
python3 premine.py

# Custom configuration
python3 premine.py --blocks 500 --creator bc1p... --output blockchain.json
```

**Features:**
- Genesis block creation (Block 0)
- Configurable number of premined blocks
- Block-by-block mining progress with timestamps
- Total rewards calculation
- JSON export for blockchain initialization

**Documentation:** See [docs/PREMINING.md](../docs/PREMINING.md) for complete guide.

## 🚀 Deployment Scripts

### quick-deploy-digitalocean.sh
One-command deployment to Digital Ocean droplet.

```bash
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/quick-deploy-digitalocean.sh | sudo bash
```

### deploy.sh
General deployment script for VPS/server environments.

```bash
sudo ./deploy.sh
```

### deploy-exs.sh
Specific deployment for Excalibur EXS components.

```bash
sudo ./deploy-exs.sh
```

### deploy-apache.sh
Apache web server deployment configuration.

```bash
sudo ./deploy-apache.sh
```

## 🔐 Security & Configuration

### setup-auth.sh
Configure authentication for admin portals and APIs.

```bash
sudo ./setup-auth.sh
```

### setup-ssl.sh
Set up SSL/TLS certificates for secure connections.

```bash
sudo ./setup-ssl.sh
```

## ✅ Validation

### validate-deployment.sh
Validate that deployment is working correctly.

```bash
./validate-deployment.sh
```

## 📂 Directory Structure

```
scripts/
├── premine.py                      # Blockchain premining
├── quick-deploy-digitalocean.sh    # Digital Ocean deployment
├── deploy.sh                       # General deployment
├── deploy-exs.sh                   # EXS-specific deployment
├── deploy-apache.sh                # Apache deployment
├── setup-auth.sh                   # Authentication setup
├── setup-ssl.sh                    # SSL/TLS setup
├── validate-deployment.sh          # Deployment validation
└── systemd/                        # Systemd service files
```

## 🔗 Related Documentation

- [Deployment Guide](../DEPLOY.md)
- [Digital Ocean Deployment](../DIGITAL_OCEAN_DEPLOY.md)
- [Docker Deployment](../DOCKER_DEPLOY.md)
- [Premining Guide](../docs/PREMINING.md)
- [Quick Start](../QUICKSTART.md)

## 📝 Notes

- Most deployment scripts require root/sudo access
- Always review scripts before running with elevated privileges
- For production deployments, ensure proper security configurations
- Back up important data before running deployment scripts

## 👨‍💻 Author

Travis D. Jones  
Email: holedozer@icloud.com  
License: BSD 3-Clause
