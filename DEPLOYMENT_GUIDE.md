# Excalibur $EXS - Multi-Platform Deployment Guide

Complete guide for deploying Excalibur $EXS on **Nginx**, **Apache**, or **Vercel**.

---

## 🎯 Choose Your Deployment Platform

### Quick Comparison

| Platform | Best For | Setup Time | Cost | Performance | Difficulty |
|----------|----------|------------|------|-------------|-----------|
| **Vercel** | Quick deployment, CDN | 5 min | Free/Pro | Excellent | Easy ⭐ |
| **Nginx** | Production servers | 15 min | Server cost | Excellent | Medium ⭐⭐ |
| **Apache** | Traditional hosting | 15 min | Server cost | Good | Medium ⭐⭐ |

### Choose Vercel if:
- ✓ You want the fastest deployment (5 minutes)
- ✓ You need global CDN out of the box
- ✓ You want automatic deployments from Git
- ✓ You're deploying a static site only
- ✓ You want zero server maintenance

### Choose Nginx if:
- ✓ You need maximum performance
- ✓ You're running backend services (Treasury, Forge)
- ✓ You want fine-grained control
- ✓ You have a VPS/dedicated server
- ✓ You're comfortable with Linux

### Choose Apache if:
- ✓ You're using shared hosting
- ✓ You need .htaccess flexibility
- ✓ You're familiar with Apache
- ✓ You want per-directory configuration
- ✓ You need extensive module support

---

## 🚀 Deployment Instructions

### 📱 Option 1: Vercel (Recommended for Quick Start)

**Time: 5 minutes | Cost: Free | CDN: Global**

#### Quick Deploy (1-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)

#### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /path/to/Excalibur-EXS
vercel --prod
```

#### Setup Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `www.excaliburcrypto.com`
3. Configure DNS at your registrar:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`

**✓ Done!** SSL is automatic. Your site is live globally on CDN.

**Full Guide**: [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)

---

### 🔷 Option 2: Nginx (Recommended for Production)

**Time: 15 minutes | Cost: $5-20/month | Performance: Excellent**

#### Quick Deploy

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Run automated deployment
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/deploy.sh | sudo bash
```

#### Manual Deployment

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Deploy files
sudo mkdir -p /var/www/excaliburcrypto.com
sudo cp -r website web admin index.html /var/www/excaliburcrypto.com/

# Configure Nginx
sudo cp docker/nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d excaliburcrypto.com -d www.excaliburcrypto.com
```

#### Configure DNS

Add these records at your domain registrar:

```
Type    Name    Value
A       @       YOUR_SERVER_IP
A       www     YOUR_SERVER_IP
```

**✓ Done!** Your site is live with HTTPS.

**Full Guide**: [DEPLOY.md](DEPLOY.md)

---

### 🟧 Option 3: Apache

**Time: 15 minutes | Cost: $5-20/month | Performance: Good**

#### Quick Deploy

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Run automated deployment
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/deploy-apache.sh | sudo bash
```

#### Manual Deployment

```bash
# Install Apache
sudo apt update
sudo apt install -y apache2 certbot python3-certbot-apache

# Enable modules
sudo a2enmod rewrite ssl headers expires proxy proxy_http deflate

# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Deploy files
sudo mkdir -p /var/www/excalibur-exs
sudo cp -r website web admin index.html .htaccess /var/www/excalibur-exs/

# Configure Apache
sudo cp apache/excalibur-exs.conf /etc/apache2/sites-available/
sudo a2dissite 000-default.conf
sudo a2ensite excalibur-exs.conf
sudo apache2ctl configtest
sudo systemctl restart apache2

# Setup SSL
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com

# Setup admin auth
sudo htpasswd -c /etc/apache2/.htpasswd admin
```

#### Configure DNS

Add these records at your domain registrar:

```
Type    Name    Value
A       @       YOUR_SERVER_IP
A       www     YOUR_SERVER_IP
```

**✓ Done!** Your site is live with HTTPS.

**Full Guide**: [APACHE_DEPLOY.md](APACHE_DEPLOY.md)

---

## 🌐 Your Live Sites

After deployment, you'll have:

- **Main Site**: `https://www.excaliburcrypto.com`
- **Knights' Portal**: `https://www.excaliburcrypto.com/web/knights-round-table/`
- **Merlin's Sanctum**: `https://www.excaliburcrypto.com/admin/merlins-portal/`

---

## 🔐 Security Features

All deployment methods include:

- ✓ HTTPS/SSL encryption
- ✓ Security headers (HSTS, X-Frame-Options, etc.)
- ✓ Admin portal authentication
- ✓ Rate limiting (Nginx/Apache)
- ✓ Firewall configuration
- ✓ No directory listing

---

## 📊 Platform Comparison Details

### Vercel

**Pros:**
- Instant global CDN
- Automatic HTTPS
- Git integration (auto-deploy)
- Zero server management
- Excellent performance
- Free tier available

**Cons:**
- Static sites only (use serverless functions for backend)
- Less control over server
- Vendor lock-in

**Best Use Cases:**
- Static websites
- Frontend apps
- Rapid prototyping
- Low-maintenance sites

### Nginx

**Pros:**
- Excellent performance
- Low memory usage
- Great for high traffic
- Full backend support
- Flexible configuration
- Industry standard

**Cons:**
- Requires server management
- Configuration can be complex
- Manual SSL renewal setup
- Server costs

**Best Use Cases:**
- High-traffic sites
- Full-stack applications
- Backend services
- Production deployments
- Custom requirements

### Apache

**Pros:**
- Widely supported
- .htaccess flexibility
- Per-directory config
- Extensive documentation
- Shared hosting compatible
- Many modules available

**Cons:**
- Higher memory usage than Nginx
- Slower under high load
- Requires server management
- Server costs

**Best Use Cases:**
- Shared hosting
- .htaccess requirements
- Traditional hosting
- Familiar Apache users
- Complex rewrite rules

---

## 🔄 Migration Between Platforms

### From Vercel to Nginx/Apache

1. Deploy to new server using guides above
2. Test with server IP
3. Update DNS to point to new server
4. Wait for DNS propagation
5. Disable Vercel deployment

### From Nginx to Apache (or vice versa)

1. Install new web server
2. Copy files from `/var/www/`
3. Configure new web server
4. Test with server IP
5. Stop old web server
6. Start new web server

### From Server to Vercel

1. Ensure code is in Git
2. Deploy to Vercel
3. Configure custom domain in Vercel
4. Update DNS to Vercel
5. Shut down old server

---

## 📱 Update Mobile Apps

After deployment, update mobile app URLs:

```bash
cd mobile-app/src/screens

# The apps already point to:
# - https://www.excaliburcrypto.com/web/knights-round-table/
# - https://www.excaliburcrypto.com/admin/merlins-portal/

# Just rebuild:
npm install
npm run ios      # For iOS
npm run android  # For Android
```

---

## ✅ Verify Deployment

### Test Main Site

```bash
curl -I https://www.excaliburcrypto.com
# Expected: HTTP/2 200
```

### Test Knights' Portal

```bash
curl -I https://www.excaliburcrypto.com/web/knights-round-table/
# Expected: HTTP/2 200
```

### Test Admin Portal

```bash
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/
# Expected: HTTP/2 401 (authentication required)
```

### Test SSL

```bash
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com
# Should show valid certificate
```

### Browser Tests

1. Visit main site - should load with HTTPS
2. Check browser console - no errors
3. Try admin portal - should prompt for password
4. Test Knights' Portal - should load properly
5. Test mobile responsiveness

---

## 🆘 Troubleshooting

### DNS Issues

**Problem**: Site not accessible after DNS update

**Solution**: Wait 5-30 minutes for DNS propagation

```bash
# Check DNS status
dig www.excaliburcrypto.com

# Check from different location
nslookup www.excaliburcrypto.com 8.8.8.8
```

### SSL Issues

**Problem**: SSL certificate fails

**Solution**: Ensure DNS is pointing correctly first

```bash
# Verify DNS
dig www.excaliburcrypto.com

# Retry SSL
sudo certbot --nginx -d excaliburcrypto.com -d www.excaliburcrypto.com
# or
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com
```

### 403 Forbidden

**Problem**: Getting 403 errors

**Solution**: Check file permissions

```bash
# For Nginx
sudo chown -R www-data:www-data /var/www/excaliburcrypto.com
sudo chmod -R 755 /var/www/excaliburcrypto.com

# For Apache
sudo chown -R www-data:www-data /var/www/excalibur-exs
sudo chmod -R 755 /var/www/excalibur-exs
```

### Admin Portal Not Password Protected

**Problem**: Admin portal accessible without password

**Solution**: Recreate password file

```bash
# For Nginx
sudo htpasswd -c /etc/nginx/.htpasswd admin
sudo systemctl restart nginx

# For Apache
sudo htpasswd -c /etc/apache2/.htpasswd admin
sudo systemctl restart apache2
```

---

## 📚 Detailed Documentation

- **[VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)** - Complete Vercel guide
- **[DEPLOY.md](DEPLOY.md)** - Complete Nginx guide
- **[APACHE_DEPLOY.md](APACHE_DEPLOY.md)** - Complete Apache guide
- **[DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md)** - Verification checklist

---

## 💰 Cost Breakdown

### Vercel
- **Free Tier**: 100GB bandwidth, unlimited deployments
- **Pro**: $20/month (1TB bandwidth)

### Nginx/Apache (VPS)
- **DigitalOcean**: $5-20/month (1-4GB RAM)
- **Linode**: $5-20/month
- **AWS Lightsail**: $3.50-20/month
- **Vultr**: $5-20/month

### Domain Name
- **Annual**: $10-15/year (.com)

---

## 🔧 Maintenance

### Update Website (All Platforms)

#### Vercel
```bash
git push origin main  # Automatic deployment
```

#### Nginx
```bash
cd /path/to/repo
git pull origin main
sudo cp -r website web admin /var/www/excaliburcrypto.com/
sudo systemctl reload nginx
```

#### Apache
```bash
cd /path/to/repo
git pull origin main
sudo cp -r website web admin /var/www/excalibur-exs/
sudo systemctl reload apache2
```

### Monitor Performance

- **Vercel**: Built-in analytics dashboard
- **Nginx/Apache**: Check logs and install monitoring tools

```bash
# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/apache2/excalibur-exs-access.log

# Monitor resources
htop
```

---

## 🎉 Success!

After deployment, share your success:

```
🎊 Excalibur $EXS is now LIVE!

🌐 Main Site: https://www.excaliburcrypto.com
⚔️ Knights' Portal: https://www.excaliburcrypto.com/web/knights-round-table/
🔮 Merlin's Sanctum: https://www.excaliburcrypto.com/admin/merlins-portal/

The prophecy unfolds. The realm is open. The sword awaits.

⚔️ EXCALIBUR $EXS ⚔️
```

---

## 📞 Support

- **GitHub Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Email**: holedozer@gmail.com
- **Documentation**: Repository README

---

*"Three paths to the realm. One destiny. Choose your forge."*

⚔️ **EXCALIBUR $EXS** ⚔️
