# Excalibur $EXS - Apache Deployment Guide

Deploy the Excalibur $EXS website on Apache web server for production hosting.

## Quick Deploy (Ubuntu/Debian)

### Prerequisites

- Ubuntu 20.04+ or Debian 10+ server
- Root or sudo access
- Domain name pointing to your server IP
- Apache 2.4+

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

## Automated Deployment Script

Create `/tmp/deploy-apache.sh`:

```bash
#!/bin/bash

# Excalibur $EXS - Automated Apache Deployment

set -e

echo "Installing Apache and dependencies..."
sudo apt update
sudo apt install -y apache2 certbot python3-certbot-apache

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

echo "Configuring firewall..."
sudo ufw allow 'Apache Full'
sudo ufw allow OpenSSH

echo "Restarting Apache..."
sudo systemctl restart apache2

echo "Setting up admin authentication..."
echo "Please enter a password for the admin user:"
sudo htpasswd -c /etc/apache2/.htpasswd admin

echo ""
echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure DNS to point to this server"
echo "2. Run: sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com"
echo "3. Visit: https://www.excaliburcrypto.com"
```

Run with:

```bash
chmod +x /tmp/deploy-apache.sh
sudo /tmp/deploy-apache.sh
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
- **Email**: holedozer@gmail.com
- **Apache Forums**: https://www.apachelounge.com/

---

*"The realm now stands on foundations of steel and stone. Apache serves the legend."*

⚔️ EXCALIBUR $EXS ⚔️
