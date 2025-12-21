# ✅ Excalibur $EXS - Deployment Verification Checklist

Use this checklist to verify your deployment to **www.excaliburcrypto.com** is complete and working correctly.

---

## 🔧 Pre-Deployment Checklist

- [ ] Digital Ocean droplet created
- [ ] Domain **www.excaliburcrypto.com** registered
- [ ] DNS A records pointing to server IP
- [ ] SSH access to server working
- [ ] Server updated: `sudo apt update && sudo apt upgrade -y`

---

## 🚀 Deployment Verification

### Server Configuration

- [ ] Nginx installed: `nginx -v`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] Nginx starts on boot: `sudo systemctl is-enabled nginx`
- [ ] Certbot installed: `certbot --version`
- [ ] Repository cloned: `ls /root/Excalibur-EXS`

### File Structure

- [ ] Web root exists: `ls /var/www/excaliburcrypto.com`
- [ ] Main site files: `ls /var/www/excaliburcrypto.com/index.html`
- [ ] Knights portal: `ls /var/www/excaliburcrypto.com/web/knights-round-table/index.html`
- [ ] Merlin portal: `ls /var/www/excaliburcrypto.com/admin/merlins-portal/index.html`
- [ ] Assets folder: `ls /var/www/excaliburcrypto.com/assets/`
- [ ] Correct permissions: `ls -la /var/www/excaliburcrypto.com`

### Nginx Configuration

- [ ] Site config exists: `cat /etc/nginx/sites-available/excaliburcrypto.com`
- [ ] Site enabled: `ls -la /etc/nginx/sites-enabled/excaliburcrypto.com`
- [ ] Default site disabled: `ls /etc/nginx/sites-enabled/default` (should not exist)
- [ ] Config test passes: `sudo nginx -t`

### DNS & Network

- [ ] DNS resolves correctly: `dig www.excaliburcrypto.com`
- [ ] DNS points to server: Compare `dig +short www.excaliburcrypto.com` with `curl ifconfig.me`
- [ ] Port 80 open: `sudo ufw status | grep 80`
- [ ] Port 443 open: `sudo ufw status | grep 443`
- [ ] Firewall enabled: `sudo ufw status`

### SSL Certificate

- [ ] Certificate installed: `sudo ls /etc/letsencrypt/live/www.excaliburcrypto.com/`
- [ ] Certificate valid: `sudo certbot certificates`
- [ ] HTTPS redirect working: `curl -I http://www.excaliburcrypto.com` (should return 301)
- [ ] Auto-renewal scheduled: `crontab -l | grep certbot`

### Security

- [ ] Admin auth file exists: `sudo ls /etc/nginx/.htpasswd_merlin`
- [ ] Admin auth configured in Nginx: `grep "auth_basic" /etc/nginx/sites-available/excaliburcrypto.com`
- [ ] Firewall active: `sudo ufw status | grep active`
- [ ] SSH port secure: `sudo ufw status | grep 22`

---

## 🌐 Website Functionality Tests

### Main Website (Landing Page)

Access: https://www.excaliburcrypto.com

- [ ] **Homepage loads** without errors
- [ ] **CSS styling** displays correctly
- [ ] **Background animations** working (runes, sword)
- [ ] **Navigation menu** links work (#prophecy, #forge, #portals, #axiom)
- [ ] **"Enter The Round Table" button** links to `/web/knights-round-table/`
- [ ] **Portal cards** display correctly
- [ ] **Footer links** work
- [ ] **No console errors** (check browser DevTools)

**Test Command:**
```bash
curl -I https://www.excaliburcrypto.com
# Should return: HTTP/2 200
```

### Knights' Round Table (Public Portal)

Access: https://www.excaliburcrypto.com/web/knights-round-table/

- [ ] **Portal page loads** correctly
- [ ] **Axiom input field** visible and functional
- [ ] **"Draw the Sword" button** works
- [ ] **13-word axiom** pre-filled correctly
- [ ] **Axiom validation** works (try wrong words)
- [ ] **128 round visualization** displays
- [ ] **Mining simulation** runs when button clicked
- [ ] **Result panel** shows after completion
- [ ] **Footer link to GitHub** works
- [ ] **Styling matches** the theme

**Test Command:**
```bash
curl -I https://www.excaliburcrypto.com/web/knights-round-table/
# Should return: HTTP/2 200
```

**Test Functionality:**
1. Enter axiom: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`
2. Click "Draw the Sword"
3. Verify 128 rounds animate
4. Verify result displays (success or failure)

### Merlin's Sanctum (Admin Portal)

Access: https://www.excaliburcrypto.com/admin/merlins-portal/

- [ ] **Authentication prompt** appears
- [ ] **Correct credentials** grant access
- [ ] **Wrong credentials** denied (401 error)
- [ ] **Dashboard loads** after authentication
- [ ] **Treasury metrics** display
- [ ] **Difficulty controls** visible
- [ ] **Anomaly map** placeholder shows
- [ ] **Access log** visible
- [ ] **Increase/Decrease difficulty buttons** work
- [ ] **Console shows no errors**

**Test Commands:**
```bash
# Test auth required
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/
# Should return: HTTP/2 401 Unauthorized

# Test with auth (replace user:pass)
curl -I -u admin:yourpassword https://www.excaliburcrypto.com/admin/merlins-portal/
# Should return: HTTP/2 200
```

**Test Credentials:**
- Username: `admin` (or whatever you set)
- Password: (password you created)

### Mobile App Integration

- [ ] **Mobile app installed** (React Native)
- [ ] **Knights Portal WebView** loads www.excaliburcrypto.com/web/knights-round-table/
- [ ] **Merlin Portal WebView** loads www.excaliburcrypto.com/admin/merlins-portal/
- [ ] **WebView shows auth prompt** for admin portal
- [ ] **All functionality works** in mobile WebView

---

## 🔍 Technical Verification

### HTTP Response Tests

Run these curl commands:

```bash
# Main site - should return 200
curl -I https://www.excaliburcrypto.com

# Knights portal - should return 200
curl -I https://www.excaliburcrypto.com/web/knights-round-table/

# Admin portal - should return 401 (auth required)
curl -I https://www.excaliburcrypto.com/admin/merlins-portal/

# Static assets - should return 200
curl -I https://www.excaliburcrypto.com/assets/css/main.css
curl -I https://www.excaliburcrypto.com/assets/js/main.js

# HTTP redirect - should return 301
curl -I http://www.excaliburcrypto.com
```

### SSL Certificate Tests

```bash
# Check certificate details
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com < /dev/null

# Verify expiration
sudo certbot certificates

# Test auto-renewal (dry run)
sudo certbot renew --dry-run
```

### Nginx Log Tests

```bash
# Check access logs
sudo tail -f /var/log/nginx/access.log

# Check error logs (should be minimal)
sudo tail -f /var/log/nginx/error.log

# Check for 404s
sudo grep "404" /var/log/nginx/access.log

# Check for 500s (should be none)
sudo grep "500" /var/log/nginx/error.log
```

### Performance Tests

```bash
# Test page load time
time curl -s https://www.excaliburcrypto.com > /dev/null

# Test concurrent requests
ab -n 100 -c 10 https://www.excaliburcrypto.com/

# Check server resources
htop
df -h
free -h
```

---

## 🧪 Browser Testing

### Desktop Browsers

Test in multiple browsers:

- [ ] **Chrome/Chromium** - All features working
- [ ] **Firefox** - All features working
- [ ] **Safari** (Mac) - All features working
- [ ] **Edge** - All features working

### Mobile Browsers

- [ ] **Mobile Chrome** - Responsive design works
- [ ] **Mobile Safari** - Touch interactions work
- [ ] **Mobile Firefox** - All features accessible

### Browser DevTools Checks

For each page, check:
- [ ] No JavaScript errors in console
- [ ] No CSS errors
- [ ] No 404 errors for resources
- [ ] All images load
- [ ] All fonts load
- [ ] Page load time < 3 seconds

---

## 🔐 Security Verification

### Security Headers

```bash
# Check security headers
curl -I https://www.excaliburcrypto.com | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options\|x-xss-protection"
```

Expected headers:
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`

### SSL Security

```bash
# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 www.excaliburcrypto.com

# Check SSL rating (online)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=www.excaliburcrypto.com
```

- [ ] SSL Labs rating: A or higher
- [ ] TLS 1.2+ enabled
- [ ] Strong ciphers only

### Admin Portal Security

- [ ] Basic auth working
- [ ] Auth prompt on every access
- [ ] Failed auth attempts logged
- [ ] No public access without credentials

---

## 📊 Monitoring Setup

### Server Monitoring

- [ ] **htop installed**: `sudo apt install htop`
- [ ] **nethogs installed**: `sudo apt install nethogs`
- [ ] CPU usage normal: `top`
- [ ] Memory usage acceptable: `free -h`
- [ ] Disk space available: `df -h`

### Log Monitoring

```bash
# Setup log monitoring
sudo tail -f /var/log/nginx/access.log &
sudo tail -f /var/log/nginx/error.log &
```

### Digital Ocean Monitoring

In Digital Ocean dashboard:
- [ ] Monitoring agent enabled
- [ ] CPU graphs showing
- [ ] Memory graphs showing
- [ ] Disk I/O graphs showing
- [ ] Network traffic graphs showing

---

## 🔄 Backup Verification

- [ ] Backup script created: `/root/backup-excalibur.sh`
- [ ] Backup script executable: `chmod +x /root/backup-excalibur.sh`
- [ ] Test backup: `sudo /root/backup-excalibur.sh`
- [ ] Backup directory exists: `ls /root/backups/`
- [ ] Cron job scheduled: `crontab -l | grep backup`
- [ ] Digital Ocean snapshots enabled

---

## 📱 Mobile App Update

After deployment:

- [ ] Verify URLs in mobile app:
  - `mobile-app/src/screens/KnightsPortalScreen.js`: https://www.excaliburcrypto.com/web/knights-round-table/
  - `mobile-app/src/screens/MerlinsPortalScreen.js`: https://www.excaliburcrypto.com/admin/merlins-portal/
- [ ] Rebuild mobile apps: `npm run ios` / `npm run android`
- [ ] Test mobile apps connect to live site
- [ ] Test WebView authentication for admin portal

---

## 🎯 Final Checklist

Before announcing your launch:

- [ ] All pages load successfully
- [ ] All internal links work
- [ ] All external links work
- [ ] SSL certificate valid and auto-renewing
- [ ] Admin portal secure with authentication
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] Mobile responsive design works
- [ ] Performance acceptable (< 3s load time)
- [ ] Backups configured and tested
- [ ] Monitoring active
- [ ] Security headers present
- [ ] Firewall configured correctly
- [ ] Documentation updated with live URLs

---

## 🚨 Troubleshooting Reference

If any checks fail, refer to:
- [DIGITAL_OCEAN_DEPLOY.md](DIGITAL_OCEAN_DEPLOY.md) - Full deployment guide
- [DEPLOY.md](DEPLOY.md) - General deployment guide
- `/var/log/nginx/error.log` - Nginx error logs
- `sudo nginx -t` - Test Nginx config

---

## 🎉 Launch Announcement

Once all checks pass:

```
🎊 EXCALIBUR $EXS IS NOW LIVE! 🎊

🌐 Website: https://www.excaliburcrypto.com
⚔️ Knights' Portal: https://www.excaliburcrypto.com/web/knights-round-table/
🔮 Merlin's Sanctum: https://www.excaliburcrypto.com/admin/merlins-portal/

The prophecy unfolds. The realm is open. The sword awaits.

⚔️ EXCALIBUR $EXS ⚔️
```

---

**Last Updated:** December 2025  
**Deployment Target:** www.excaliburcrypto.com (Digital Ocean)  
**Repository:** https://github.com/Holedozer1229/Excalibur-EXS
