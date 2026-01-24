# Excalibur $EXS - Quick Deployment Guide

## 🚀 Deploy in 3 Steps

### Prerequisites
- Ubuntu/Debian server with root access
- Domain name (excaliburcrypto.com) pointing to your server
- SSH access to server

---

## Step 1: Initial Deployment (5 minutes)

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Clone the repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Make scripts executable
chmod +x scripts/*.sh

# Run deployment script
sudo ./scripts/deploy.sh
```

**What this does:**
- ✓ Installs Nginx
- ✓ Copies website files
- ✓ Configures firewall
- ✓ Sets up basic web server

---

## Step 2: Configure DNS (15 minutes)

**Go to your domain registrar (GoDaddy, Namecheap, etc.) and add:**

```
Type    Name    Value
A       @       YOUR_SERVER_IP
A       www     YOUR_SERVER_IP
```

**Wait for DNS propagation** (5-15 minutes)

Check DNS status:
```bash
dig excaliburcrypto.com
dig www.excaliburcrypto.com
```

---

## Step 3: Enable HTTPS & Security (5 minutes)

```bash
# Setup SSL certificate (run AFTER DNS is configured)
sudo ./scripts/setup-ssl.sh

# Setup admin authentication
sudo ./scripts/setup-auth.sh
```

**Done!** 🎉

---

## 🌐 Your Live Sites

- **Main Site**: https://www.excaliburcrypto.com
- **Knights' Portal**: https://www.excaliburcrypto.com/web/knights-round-table/
- **Merlin's Sanctum**: https://www.excaliburcrypto.com/admin/merlins-portal/

---

## 📱 Update Mobile Apps

After deployment, update mobile app URLs:

```bash
cd mobile-app/src/screens

# Edit KnightsPortalScreen.js
# Change: source={{ uri: 'https://www.excaliburcrypto.com/web/knights-round-table/' }}

# Edit MerlinsPortalScreen.js  
# Change: source={{ uri: 'https://www.excaliburcrypto.com/admin/merlins-portal/' }}
```

Then rebuild apps:
```bash
npm run ios
npm run android
```

---

## 🔧 Troubleshooting

### Issue: DNS not propagating
**Solution**: Wait 15-30 minutes, check with `dig excaliburcrypto.com`

### Issue: Nginx won't start
**Solution**: Check logs with `sudo tail -f /var/log/nginx/error.log`

### Issue: SSL certificate fails
**Solution**: Ensure DNS is pointing correctly first, then retry `setup-ssl.sh`

### Issue: Can't access admin portal
**Solution**: Run `sudo ./scripts/setup-auth.sh` again

---

## 📊 Verify Deployment

```bash
# Check website
curl -I https://www.excaliburcrypto.com

# Check Knights' Portal
curl -I https://www.excaliburcrypto.com/web/knights-round-table/

# Check Merlin's Portal (should return 401 Unauthorized)
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/

# Check SSL
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com
```

---

## 🔄 Update Deployment

To update after code changes:

```bash
cd Excalibur-EXS
git pull origin main
sudo cp -r website/* /var/www/excaliburcrypto.com/
sudo cp -r web /var/www/excaliburcrypto.com/
sudo cp -r admin /var/www/excaliburcrypto.com/
sudo systemctl reload nginx
```

---

## 🎯 Alternative: One-Line Deploy

**Warning**: This will automatically deploy everything. Only use if you trust the scripts.

```bash
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/quick-deploy.sh | sudo bash
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `sudo tail -f /var/log/nginx/error.log`
2. Test config: `sudo nginx -t`
3. Contact: holedozer@icloud.com

---

*"The realm is now live. The portals are open to all."*

⚔️ EXCALIBUR $EXS ⚔️
