# Excalibur $EXS - Apache Deployment Guide

Deploy the Excalibur $EXS website on Apache web server for production hosting on AWS Ubuntu Server.

## Quick Deploy (AWS Ubuntu Server)

### Prerequisites

- AWS EC2 instance with Ubuntu 20.04+ or Ubuntu 22.04 LTS
- Root or sudo access (ubuntu user has sudo by default)
- Domain name pointing to your server's Elastic IP
- Apache 2.4+
- Security Group configured to allow HTTP (80) and HTTPS (443)

### AWS EC2 Setup

If you haven't created an EC2 instance yet:

1. **Launch EC2 Instance**:
   - Go to AWS Console → EC2 → Launch Instance
   - Choose **Ubuntu Server 22.04 LTS** AMI
   - Instance type: **t2.micro** (free tier) or **t3.small** (recommended for production)
   - Configure Security Group:
     - SSH (22) - Your IP
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
   - Create or select an existing key pair
   - Launch instance

2. **Allocate Elastic IP** (optional but recommended):
   - Go to EC2 → Elastic IPs → Allocate Elastic IP
   - Associate with your instance
   - Use this IP for DNS configuration

3. **Connect to Instance**:
   ```bash
   ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP
   ```

### Step 1: Install Apache and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Apache
sudo apt install -y apache2

# Enable required modules
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod deflate

# Restart Apache to load modules
sudo systemctl restart apache2
```

### Step 2: Deploy Website Files

```bash
# Clone repository
cd /tmp
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Create web directory
sudo mkdir -p /var/www/excalibur-exs

# Copy website files
sudo cp -r website /var/www/excalibur-exs/
sudo cp -r web /var/www/excalibur-exs/
sudo cp -r admin /var/www/excalibur-exs/
sudo cp index.html /var/www/excalibur-exs/

# Copy .htaccess for URL rewriting
sudo cp .htaccess /var/www/excalibur-exs/

# Set permissions
sudo chown -R www-data:www-data /var/www/excalibur-exs
sudo chmod -R 755 /var/www/excalibur-exs
```

### Step 3: Configure Apache Virtual Host

```bash
# Copy Apache configuration
sudo cp apache/excalibur-exs.conf /etc/apache2/sites-available/

# Disable default site
sudo a2dissite 000-default.conf

# Enable Excalibur site
sudo a2ensite excalibur-exs.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### Step 4: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Apache Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

### Step 5: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-apache

# Obtain SSL certificate
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect (option 2 recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 6: Setup Admin Authentication

```bash
# Create password file for admin portal
sudo htpasswd -c /etc/apache2/.htpasswd admin

# Enter password when prompted
# Restart Apache
sudo systemctl restart apache2
```

### Step 7: Verify Deployment

```bash
# Check Apache status
sudo systemctl status apache2

# Test main site
curl -I https://www.excaliburcrypto.com

# Test Knights' Portal
curl -I https://www.excaliburcrypto.com/web/knights-round-table/

# Test Merlin's Portal (should return 401)
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/

# Check SSL
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com
```

---

## Configuration Details

### Directory Structure

```
/var/www/excalibur-exs/
├── website/           # Main landing page
│   ├── index.html
│   └── assets/
├── web/              # Knights' Portal (public)
│   └── knights-round-table/
├── admin/            # Merlin's Sanctum (protected)
│   └── merlins-portal/
├── index.html        # Root redirect
└── .htaccess         # Apache rewrite rules
```

### Security Configuration

The Apache configuration includes:

- **HTTPS Enforcement**: All HTTP traffic redirected to HTTPS
- **Security Headers**:
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
- **Basic Authentication**: Admin portal protected
- **SSL/TLS**: TLS 1.2+ only, strong cipher suites
- **Directory Protection**: No directory listing
- **Rate Limiting**: API endpoints throttled

### URL Structure

- `/` → Main website (`/website/index.html`)
- `/web/knights-round-table/` → Public forge portal
- `/admin/merlins-portal/` → Admin dashboard (requires auth)
- `/api/treasury/` → Treasury API proxy
- `/api/forge/` → Forge API proxy
- `/assets/*` → Static assets

---

## Advanced Configuration

### Custom Error Pages

Edit `/var/www/excalibur-exs/.htaccess`:

```apache
ErrorDocument 404 /website/404.html
ErrorDocument 403 /website/403.html
ErrorDocument 500 /website/500.html
```

### Backend API Integration

If running Treasury and Forge services:

```bash
# Treasury on port 8080
# Forge on port 5000
# Apache will proxy /api/* requests automatically
```

Verify proxy configuration in `/etc/apache2/sites-available/excalibur-exs.conf`

### Additional Security

#### Disable Server Signature

Edit `/etc/apache2/conf-available/security.conf`:

```apache
ServerTokens Prod
ServerSignature Off
```

#### Enable ModSecurity (Web Application Firewall)

```bash
sudo apt install -y libapache2-mod-security2
sudo a2enmod security2
sudo systemctl restart apache2
```

#### IP Whitelist for Admin Portal

Edit `/etc/apache2/sites-available/excalibur-exs.conf`:

```apache
<Directory /var/www/excalibur-exs/admin>
    # ... existing config ...
    
    # IP whitelist
    Require ip 192.168.1.0/24
    Require ip 10.0.0.0/8
</Directory>
```

---

## Performance Optimization

### Enable HTTP/2

HTTP/2 is automatically enabled with SSL in Apache 2.4.17+. Verify:

```bash
apache2 -v  # Check version
sudo a2enmod http2
```

Add to virtual host:

```apache
Protocols h2 http/1.1
```

### Increase Cache Duration

Edit `.htaccess` or virtual host config:

```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

### Enable Gzip Compression

Already enabled in configuration. Verify:

```bash
curl -I -H "Accept-Encoding: gzip" https://www.excaliburcrypto.com
# Should see: Content-Encoding: gzip
```

---

## AWS-Specific Configuration

### Security Group Configuration

Ensure your EC2 Security Group allows:

```
Inbound Rules:
- SSH (22): Your IP address or VPN IP range
- HTTP (80): 0.0.0.0/0 (all traffic)
- HTTPS (443): 0.0.0.0/0 (all traffic)

Outbound Rules:
- All traffic: 0.0.0.0/0 (default)
```

To modify Security Group:
1. Go to EC2 Console → Security Groups
2. Select your instance's security group
3. Edit Inbound Rules
4. Add/modify rules as needed

### Elastic IP Best Practices

Using an Elastic IP ensures your server IP doesn't change on reboot:

```bash
# After allocating Elastic IP in AWS Console
# Associate it with your instance
# Update your DNS records to point to the Elastic IP
```

**Important**: Elastic IPs are free when associated with a running instance, but cost $0.005/hour when not associated.

### AWS Instance Sizing

Recommended EC2 instance types for Apache deployment:

| Instance Type | vCPU | RAM | Cost/Month | Use Case |
|--------------|------|-----|------------|----------|
| t2.micro | 1 | 1GB | Free tier | Development/Testing |
| t3.small | 2 | 2GB | ~$15 | Small production sites |
| t3.medium | 2 | 4GB | ~$30 | Medium traffic sites |
| t3.large | 2 | 8GB | ~$60 | High traffic sites |

**Recommended**: t3.small for production deployment

### AWS Backup Strategy

Create an AMI (Amazon Machine Image) after successful deployment:

```bash
# In AWS Console:
# EC2 → Instances → Select your instance → Actions → Image → Create Image

# Or via AWS CLI:
aws ec2 create-image \
  --instance-id i-1234567890abcdef0 \
  --name "Excalibur-EXS-Apache-$(date +%Y%m%d)" \
  --description "Excalibur EXS Apache deployment backup"
```

### CloudWatch Monitoring (Optional)

Enable detailed monitoring for your EC2 instance:

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure CloudWatch (requires IAM role with CloudWatch permissions)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

Monitor Apache logs in CloudWatch:
- CPU utilization
- Network traffic
- Disk usage
- Apache access/error logs

### AWS Cost Optimization

Tips to reduce AWS costs:

1. **Use t3 instances** instead of t2 (better performance per dollar)
2. **Stop instance when not needed** (development only)
3. **Use Reserved Instances** for long-term deployments (up to 72% savings)
4. **Enable AWS Free Tier** (t2.micro free for 12 months)
5. **Set up billing alerts** in AWS Console → Billing → Budgets

---

## Monitoring & Maintenance

### Check Logs

```bash
# Error logs
sudo tail -f /var/log/apache2/excalibur-exs-error.log

# Access logs
sudo tail -f /var/log/apache2/excalibur-exs-access.log

# All Apache errors
sudo tail -f /var/log/apache2/error.log
```

### Restart Apache

```bash
# Graceful restart (no downtime)
sudo systemctl reload apache2

# Full restart
sudo systemctl restart apache2

# Check status
sudo systemctl status apache2
```

### Update Website

```bash
cd /tmp/Excalibur-EXS
git pull origin main

sudo cp -r website/* /var/www/excalibur-exs/website/
sudo cp -r web/* /var/www/excalibur-exs/web/
sudo cp -r admin/* /var/www/excalibur-exs/admin/

sudo systemctl reload apache2
```

### SSL Certificate Renewal

Certbot auto-renews certificates. Check status:

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## Troubleshooting

### AWS-Specific Issues

#### Issue: Cannot connect to server via HTTP/HTTPS

**Solution**: Check Security Group settings

```bash
# Verify Security Group in AWS Console
# EC2 → Security Groups → Select your SG → Inbound Rules
# Ensure these rules exist:
# - HTTP (80) from 0.0.0.0/0
# - HTTPS (443) from 0.0.0.0/0

# Test from your EC2 instance
curl -I http://localhost
curl -I http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
```

#### Issue: DNS not resolving to Elastic IP

**Solution**: Verify Elastic IP association and DNS records

```bash
# Check instance's public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4

# Verify DNS resolution
dig www.excaliburcrypto.com
nslookup www.excaliburcrypto.com

# Ensure DNS A records point to your Elastic IP
```

#### Issue: UFW firewall blocking connections

**Solution**: AWS uses Security Groups, UFW may conflict

```bash
# Disable UFW on AWS (Security Groups handle firewall)
sudo ufw disable

# Or configure UFW to allow Apache
sudo ufw allow 'Apache Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

#### Issue: Certbot fails with connection timeout

**Solution**: Verify port 80 is accessible from internet

```bash
# Test from external machine or use online tools
# https://www.yougetsignal.com/tools/open-ports/
# Check port 80 and 443

# Ensure Apache is listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### General Issues

### Issue: 403 Forbidden

**Solution**: Check file permissions

```bash
sudo chown -R www-data:www-data /var/www/excalibur-exs
sudo chmod -R 755 /var/www/excalibur-exs
```

### Issue: Apache won't start

**Solution**: Check configuration syntax

```bash
sudo apache2ctl configtest
sudo tail -f /var/log/apache2/error.log
```

### Issue: .htaccess not working

**Solution**: Ensure `AllowOverride All` is set

```bash
sudo nano /etc/apache2/sites-available/excalibur-exs.conf
# Verify: AllowOverride All
sudo systemctl restart apache2
```

### Issue: SSL certificate fails

**Solution**: Verify DNS first

```bash
dig www.excaliburcrypto.com
# Should point to your server IP
```

Then retry:

```bash
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com
```

### Issue: Admin portal accessible without password

**Solution**: Check .htpasswd file exists

```bash
ls -la /etc/apache2/.htpasswd
# If missing, recreate:
sudo htpasswd -c /etc/apache2/.htpasswd admin
sudo systemctl restart apache2
```

---

## Migration from Nginx

If migrating from Nginx:

1. Stop Nginx: `sudo systemctl stop nginx`
2. Disable Nginx: `sudo systemctl disable nginx`
3. Follow Apache installation steps above
4. Update DNS if using different server
5. Test thoroughly before removing Nginx

---

## Automated Deployment Script (AWS Ubuntu)

### Quick One-Command Deployment

For AWS Ubuntu instances, use the provided deployment script:

```bash
# SSH into your AWS EC2 Ubuntu instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Run the automated deployment script
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/deploy-apache.sh | sudo bash
```

This script will:
- ✓ Install Apache and all dependencies
- ✓ Enable required Apache modules
- ✓ Clone the repository
- ✓ Deploy website files
- ✓ Configure Apache virtual host
- ✓ Set up firewall rules
- ✓ Prompt for admin credentials

**Note for AWS**: After running the script, make sure your Security Group allows HTTP (80) and HTTPS (443) traffic.

### Manual Deployment Script

If you prefer to create and review the script first:

```bash
#!/bin/bash

# Excalibur $EXS - Automated Apache Deployment for AWS Ubuntu

set -e

echo "Installing Apache and dependencies..."
sudo apt update
sudo apt install -y apache2 apache2-utils certbot python3-certbot-apache

echo "Enabling Apache modules..."
sudo a2enmod rewrite ssl headers expires proxy proxy_http deflate

echo "Cloning repository..."
cd /tmp
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

echo "Deploying files..."
sudo mkdir -p /var/www/excalibur-exs
sudo cp -r website web admin index.html /var/www/excalibur-exs/
sudo cp .htaccess /var/www/excalibur-exs/
sudo cp apache/excalibur-exs.conf /etc/apache2/sites-available/

echo "Setting permissions..."
sudo chown -R www-data:www-data /var/www/excalibur-exs
sudo chmod -R 755 /var/www/excalibur-exs

echo "Configuring Apache..."
sudo a2dissite 000-default.conf
sudo a2ensite excalibur-exs.conf
sudo apache2ctl configtest

echo "Restarting Apache..."
sudo systemctl restart apache2

echo "Setting up admin authentication..."
echo "Please enter a username for the admin portal (or press Enter for 'admin'):"
read -p "Username: " admin_username
admin_username=${admin_username:-admin}
sudo htpasswd -c /etc/apache2/.htpasswd "$admin_username"

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps for AWS:"
echo "1. Verify Security Group allows HTTP (80) and HTTPS (443)"
echo "2. Configure DNS to point to your Elastic IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "3. Run: sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com"
echo "4. Visit: https://www.excaliburcrypto.com"
```

Save as `/tmp/deploy-apache-aws.sh` and run:

```bash
chmod +x /tmp/deploy-apache-aws.sh
sudo /tmp/deploy-apache-aws.sh
```

---

## Comparison: Apache vs Nginx vs Vercel

| Feature | Apache | Nginx | Vercel |
|---------|--------|-------|--------|
| Setup Complexity | Medium | Medium | Easy |
| Performance | Good | Excellent | Excellent |
| Static Files | ✓ | ✓ | ✓ |
| SSL/HTTPS | ✓ (Let's Encrypt) | ✓ (Let's Encrypt) | ✓ (Automatic) |
| Basic Auth | ✓ (.htaccess) | ✓ (nginx.conf) | ✓ (Middleware) |
| Backend Proxy | ✓ | ✓ | ✓ (Functions) |
| Cost | Server cost | Server cost | Free tier |
| CDN | Manual | Manual | Built-in |
| Auto Deploy | Manual | Manual | Git push |

**Apache Advantages**:
- Widely supported
- .htaccess flexibility
- Extensive documentation
- Works with shared hosting

**Choose Apache if**:
- You need .htaccess configuration
- Using shared hosting
- Familiar with Apache
- Need per-directory config

---

## Support

- **Apache Documentation**: https://httpd.apache.org/docs/
- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS
- **Email**: holedozer@icloud.com
- **Apache Forums**: https://www.apachelounge.com/

---

*"The realm now stands on foundations of steel and stone. Apache serves the legend."*

⚔️ EXCALIBUR $EXS ⚔️
