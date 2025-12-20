# Excalibur $EXS Website - Deployment Guide

## 🌐 Deploying to www.excaliburcrypto.com

This guide covers deploying the Excalibur $EXS website and portals to your domain.

## 📁 Directory Structure

```
/var/www/excaliburcrypto.com/
├── index.html                      # Main landing page
├── assets/
│   ├── css/main.css
│   └── js/main.js
├── web/
│   └── knights-round-table/       # Public forge portal
│       ├── index.html
│       ├── styles.css
│       └── forge.js
└── admin/
    └── merlins-portal/            # Admin dashboard
        ├── index.html
        ├── styles.css
        └── dashboard.js
```

## 🚀 Deployment Options

### Option 1: Traditional Web Server (Nginx)

#### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 2. Configure Nginx

Create `/etc/nginx/sites-available/excaliburcrypto.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name excaliburcrypto.com www.excaliburcrypto.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name excaliburcrypto.com www.excaliburcrypto.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/excaliburcrypto.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/excaliburcrypto.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory
    root /var/www/excaliburcrypto.com;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" always;

    # Main site
    location / {
        try_files $uri $uri/ =404;
    }

    # Knights' Round Table (Public)
    location /web/knights-round-table/ {
        try_files $uri $uri/ /web/knights-round-table/index.html;
    }

    # Merlin's Portal (Admin) - Add authentication
    location /admin/merlins-portal/ {
        # Basic auth
        auth_basic "Merlin's Sanctum - Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd_merlin;
        
        try_files $uri $uri/ /admin/merlins-portal/index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

#### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d excaliburcrypto.com -d www.excaliburcrypto.com

# Auto-renewal (crontab)
sudo certbot renew --dry-run
```

#### 4. Create htpasswd for Admin Access

```bash
# Install apache2-utils
sudo apt install apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd_merlin admin

# Enter password when prompted (use something secure!)
```

#### 5. Deploy Files

```bash
# Create directory
sudo mkdir -p /var/www/excaliburcrypto.com

# Copy files from repository
sudo cp -r website/* /var/www/excaliburcrypto.com/
sudo cp -r web /var/www/excaliburcrypto.com/
sudo cp -r admin /var/www/excaliburcrypto.com/

# Set permissions
sudo chown -R www-data:www-data /var/www/excaliburcrypto.com
sudo chmod -R 755 /var/www/excaliburcrypto.com
```

#### 6. Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/excaliburcrypto.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Option 2: Apache Web Server

Create `/etc/apache2/sites-available/excaliburcrypto.com.conf`:

```apache
<VirtualHost *:80>
    ServerName excaliburcrypto.com
    ServerAlias www.excaliburcrypto.com
    Redirect permanent / https://excaliburcrypto.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName excaliburcrypto.com
    ServerAlias www.excaliburcrypto.com
    
    DocumentRoot /var/www/excaliburcrypto.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/excaliburcrypto.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/excaliburcrypto.com/privkey.pem
    
    <Directory /var/www/excaliburcrypto.com>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    <Location /admin/merlins-portal>
        AuthType Basic
        AuthName "Merlin's Sanctum"
        AuthUserFile /etc/apache2/.htpasswd_merlin
        Require valid-user
    </Location>
    
    ErrorLog ${APACHE_LOG_DIR}/excalibur-error.log
    CustomLog ${APACHE_LOG_DIR}/excalibur-access.log combined
</VirtualHost>
```

```bash
# Enable modules
sudo a2enmod ssl rewrite headers

# Enable site
sudo a2ensite excaliburcrypto.com

# Restart Apache
sudo systemctl restart apache2
```

### Option 3: Static Hosting (GitHub Pages, Netlify, Vercel)

#### GitHub Pages

```bash
# Create gh-pages branch
git checkout -b gh-pages

# Copy website files to root
cp -r website/* .
cp -r web .
cp -r admin .

# Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

Then configure custom domain in GitHub repository settings.

#### Netlify

1. Connect repository to Netlify
2. Build command: (leave empty for static site)
3. Publish directory: `website`
4. Add domain: excaliburcrypto.com
5. Configure redirects in `netlify.toml`:

```toml
[[redirects]]
  from = "/admin/merlins-portal/*"
  to = "/admin/merlins-portal/index.html"
  status = 200

[[redirects]]
  from = "/web/knights-round-table/*"
  to = "/web/knights-round-table/index.html"
  status = 200

[[headers]]
  for = "/admin/merlins-portal/*"
  [headers.values]
    Basic-Auth = "admin:$ADMIN_PASSWORD"
```

## 🔐 Security Recommendations

### For Production Deployment:

1. **Enable HTTPS**: Always use SSL/TLS certificates
2. **Admin Protection**: 
   - Use strong authentication (OAuth2, JWT)
   - Consider IP whitelisting
   - Implement rate limiting
3. **Content Security Policy**: Configure proper CSP headers
4. **Regular Updates**: Keep server software updated
5. **Firewall**: Configure UFW or similar
6. **Monitoring**: Set up server monitoring (e.g., Prometheus)

### Additional Security:

```bash
# Firewall (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2Ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## 📱 Mobile App URLs

Update mobile app configuration to point to your domain:

```javascript
// mobile-app/src/screens/KnightsPortalScreen.js
source={{ uri: 'https://www.excaliburcrypto.com/web/knights-round-table/' }}

// mobile-app/src/screens/MerlinsPortalScreen.js
source={{ uri: 'https://www.excaliburcrypto.com/admin/merlins-portal/' }}
```

## 🧪 Testing

```bash
# Test website
curl -I https://www.excaliburcrypto.com

# Test Knights' Portal
curl -I https://www.excaliburcrypto.com/web/knights-round-table/

# Test Merlin's Portal (should require auth)
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/

# SSL check
openssl s_client -connect www.excaliburcrypto.com:443
```

## 📊 Monitoring

Setup monitoring with:
- **Uptime**: UptimeRobot, Pingdom
- **Analytics**: Google Analytics, Plausible
- **Errors**: Sentry
- **Logs**: Papertrail, Loggly

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "website/*,web/*,admin/*"
          target: "/var/www/excaliburcrypto.com"
```

## 📝 DNS Configuration

Point your domain to your server:

```
A     @                  YOUR_SERVER_IP
A     www                YOUR_SERVER_IP
AAAA  @                  YOUR_IPv6 (if available)
AAAA  www                YOUR_IPv6 (if available)
```

## ✅ Checklist

- [ ] Domain registered
- [ ] Server configured
- [ ] SSL certificate installed
- [ ] Files deployed
- [ ] Admin authentication enabled
- [ ] Security headers configured
- [ ] Firewall rules set
- [ ] Monitoring enabled
- [ ] DNS configured
- [ ] Mobile app URLs updated
- [ ] Backup strategy implemented

---

*"The realm now exists in the digital aether. The portals are open."*

⚔️ EXCALIBUR $EXS ⚔️
