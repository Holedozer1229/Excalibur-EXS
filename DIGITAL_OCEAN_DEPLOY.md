# 🌊 Excalibur $EXS - Digital Ocean Deployment Guide

Complete guide for deploying Excalibur-EXS to your Digital Ocean server at **www.excaliburcrypto.com**

---

## 📋 Prerequisites

- [ ] Digital Ocean Droplet (Ubuntu 22.04 LTS recommended)
- [ ] Domain name: **www.excaliburcrypto.com** registered
- [ ] SSH access to your server
- [ ] Root or sudo privileges

**Recommended Droplet Specs:**
- **Basic:** $12/month - 2GB RAM, 1 vCPU, 50GB SSD (Good for testing)
- **Production:** $24/month - 4GB RAM, 2 vCPU, 80GB SSD (Recommended)
- **High Traffic:** $48/month - 8GB RAM, 4 vCPU, 160GB SSD

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Create Your Digital Ocean Droplet

1. Log into Digital Ocean: https://cloud.digitalocean.com
2. Click **Create** → **Droplets**
3. Select **Ubuntu 22.04 LTS**
4. Choose your plan (recommended: $24/month)
5. Select datacenter region (closest to your users)
6. Add SSH key or use password
7. Click **Create Droplet**
8. Note your droplet's IP address

### Step 2: Point Your Domain to Digital Ocean

In your domain registrar (where you bought excaliburcrypto.com):

1. Go to DNS settings
2. Add these records:

```
Type    Name    Value               TTL
A       @       YOUR_DROPLET_IP     3600
A       www     YOUR_DROPLET_IP     3600
```

**Wait 5-15 minutes for DNS propagation**

Verify DNS with:
```bash
dig www.excaliburcrypto.com
```

### Step 3: SSH Into Your Server

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 4: Deploy Excalibur

Run this one-command installer:

```bash
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/quick-deploy-digitalocean.sh | sudo bash
```

**Or manual deployment:**

```bash
# Clone repository
cd /root
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Make scripts executable
chmod +x scripts/*.sh

# Run deployment
sudo ./scripts/deploy.sh

# Setup SSL (wait for DNS first!)
sudo ./scripts/setup-ssl.sh

# Setup admin authentication
sudo ./scripts/setup-auth.sh
```

---

## 🌐 Your Live Sites

After deployment, your sites will be available at:

- **Main Website**: https://www.excaliburcrypto.com
- **Knights' Round Table**: https://www.excaliburcrypto.com/web/knights-round-table/
- **Merlin's Sanctum**: https://www.excaliburcrypto.com/admin/merlins-portal/

---

## ✅ Verification Checklist

Run these commands to verify deployment:

```bash
# Check Nginx status
sudo systemctl status nginx

# Test main site
curl -I https://www.excaliburcrypto.com

# Test Knights' Portal
curl -I https://www.excaliburcrypto.com/web/knights-round-table/

# Test Merlin's Portal (should return 401 Unauthorized)
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/

# Check SSL certificate
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com < /dev/null

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Docker Deployment (Alternative)

If you prefer Docker:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt install docker-compose -y

# Start services
cd /root/Excalibur-EXS
docker-compose up -d

# Check status
docker-compose ps
```

---

## 🔧 Configuration Files

All configuration is ready for www.excaliburcrypto.com:

- **Nginx**: `/etc/nginx/sites-available/excaliburcrypto.com`
- **Web Root**: `/var/www/excaliburcrypto.com/`
- **SSL Certs**: `/etc/letsencrypt/live/www.excaliburcrypto.com/`
- **Admin Auth**: `/etc/nginx/.htpasswd_merlin`

---

## 🛠️ Common Tasks

### Update Website Content

```bash
cd /root/Excalibur-EXS
git pull origin main
sudo cp -r website/* /var/www/excaliburcrypto.com/
sudo cp -r web /var/www/excaliburcrypto.com/
sudo cp -r admin /var/www/excaliburcrypto.com/
sudo systemctl reload nginx
```

### Change Admin Password

```bash
sudo htpasswd /etc/nginx/.htpasswd_merlin admin
sudo systemctl restart nginx
```

### View Access Logs

```bash
sudo tail -f /var/log/nginx/access.log
```

### Backup Website

```bash
sudo tar -czf /root/excalibur-backup-$(date +%Y%m%d).tar.gz /var/www/excaliburcrypto.com/
```

### Renew SSL Certificate (Auto-renews, but manual if needed)

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting

### Issue: DNS not resolving

**Solution:**
```bash
# Check DNS propagation
dig www.excaliburcrypto.com
nslookup www.excaliburcrypto.com

# Wait 15-30 minutes for full propagation
```

### Issue: Nginx won't start

**Solution:**
```bash
# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: SSL certificate fails

**Solution:**
```bash
# Ensure DNS is pointing correctly first
dig www.excaliburcrypto.com

# Stop Nginx temporarily
sudo systemctl stop nginx

# Try certbot standalone mode
sudo certbot certonly --standalone -d www.excaliburcrypto.com -d excaliburcrypto.com

# Start Nginx
sudo systemctl start nginx
```

### Issue: Can't access admin portal

**Solution:**
```bash
# Reset admin password
sudo htpasswd -c /etc/nginx/.htpasswd_merlin admin

# Verify auth is configured
grep -A2 "location /admin" /etc/nginx/sites-available/excaliburcrypto.com

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: 404 errors on sub-pages

**Solution:**
```bash
# Verify files are in place
ls -la /var/www/excaliburcrypto.com/web/knights-round-table/
ls -la /var/www/excaliburcrypto.com/admin/merlins-portal/

# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📱 Update Mobile Apps

After deployment, rebuild mobile apps to point to your live domain:

```bash
cd mobile-app

# Already configured for www.excaliburcrypto.com
# Just rebuild:
npm install
npm run ios      # For iOS
npm run android  # For Android
```

The mobile apps already point to:
- Knights Portal: `https://www.excaliburcrypto.com/web/knights-round-table/`
- Merlin's Portal: `https://www.excaliburcrypto.com/admin/merlins-portal/`

---

## 🔐 Security Best Practices

```bash
# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root SSH (after creating user)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Setup fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📊 Monitoring

### Setup basic monitoring:

```bash
# Install monitoring tools
sudo apt install htop nethogs iotop

# Check system resources
htop

# Monitor network traffic
sudo nethogs

# Check disk usage
df -h
```

### Digital Ocean Monitoring:

Enable in Digital Ocean dashboard:
1. Go to your Droplet
2. Click **Graphs** tab
3. Enable **Monitoring Agent**

---

## 💾 Backup Strategy

### Automated Backups:

```bash
# Create backup script
sudo nano /root/backup-excalibur.sh
```

Add this content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup website
tar -czf $BACKUP_DIR/website-$DATE.tar.gz /var/www/excaliburcrypto.com/

# Backup nginx config
tar -czf $BACKUP_DIR/nginx-$DATE.tar.gz /etc/nginx/

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:
```bash
chmod +x /root/backup-excalibur.sh
crontab -e
# Add: 0 2 * * * /root/backup-excalibur.sh
```

### Digital Ocean Snapshots:

1. Go to your Droplet in Digital Ocean
2. Click **Snapshots** tab
3. Create manual snapshot or enable automatic weekly snapshots

---

## 📈 Performance Optimization

```bash
# Enable Nginx caching
sudo nano /etc/nginx/sites-available/excaliburcrypto.com

# Add in server block:
# location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
#     expires 1y;
#     add_header Cache-Control "public, immutable";
# }

# Enable Gzip compression (already in nginx.conf)
# Restart Nginx
sudo systemctl restart nginx

# Setup CloudFlare (optional)
# Point DNS to CloudFlare for CDN and DDoS protection
```

---

## 🎯 Next Steps

1. ✅ Deploy website to Digital Ocean
2. ✅ Setup SSL certificate
3. ✅ Secure admin portal
4. [ ] Setup monitoring and alerts
5. [ ] Configure automated backups
6. [ ] Test all functionality
7. [ ] Launch and announce! 🎉

---

## 📞 Support

**Issues?**
- GitHub: https://github.com/Holedozer1229/Excalibur-EXS/issues
- Email: holedozer@gmail.com

**Documentation:**
- Main README: [README.md](README.md)
- Deploy Guide: [DEPLOY.md](DEPLOY.md)
- Docker Guide: [DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)

---

## 🎉 Success!

Once deployed, share your success:

```
🎊 Excalibur $EXS is now live at https://www.excaliburcrypto.com

The realm is open. The portals are active. The prophecy unfolds.

⚔️ EXCALIBUR $EXS ⚔️
```

---

*"The digital realm now mirrors the legend. The sword is drawn, and the kingdom awaits."*

Lead Architect: Travis D Jones  
Email: holedozer@gmail.com  
License: BSD 3-Clause
