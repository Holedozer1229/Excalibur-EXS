# Excalibur $EXS Protocol - Deployment Checklist

Use this checklist when deploying to production.

## Pre-Deployment

### Security
- [ ] Review `PRODUCTION_TODO.md` for security items
- [ ] Change default admin password
- [ ] Review and update CORS allowed origins
- [ ] Configure rate limiting for your traffic expectations
- [ ] Enable firewall rules
- [ ] Obtain SSL certificate (Let's Encrypt or commercial)
- [ ] Set up log monitoring
- [ ] Configure backup strategy

### Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Update `DOMAIN` in `.env`
- [ ] Set `ENV=production` in `.env`
- [ ] Configure `ALLOWED_ORIGINS` with your actual domains
- [ ] Adjust rate limits if needed

### DNS
- [ ] Domain registered (www.excaliburcrypto.com)
- [ ] DNS records configured
  - A record for apex domain → server IP
  - CNAME for www → domain or server
- [ ] DNS propagation verified

## Docker Deployment

### Prerequisites
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Server has adequate resources (2GB+ RAM recommended)
- [ ] Ports 80/443 available

### Setup
- [ ] Clone repository
- [ ] Create `.env` from `.env.example`
- [ ] Create SSL certificates
  ```bash
  # Self-signed (testing)
  mkdir -p docker/nginx/ssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/nginx/ssl/privkey.pem \
    -out docker/nginx/ssl/fullchain.pem
  
  # OR Let's Encrypt (production)
  sudo certbot certonly --standalone -d www.excaliburcrypto.com
  sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/*.pem docker/nginx/ssl/
  ```
- [ ] Create admin password file
  ```bash
  sudo apt-get install apache2-utils
  mkdir -p docker/nginx
  htpasswd -c docker/nginx/.htpasswd merlin
  ```
- [ ] Start services
  ```bash
  docker-compose up -d
  ```
- [ ] Verify all containers running
  ```bash
  docker-compose ps
  ```

### Validation
- [ ] Website loads: `https://www.excaliburcrypto.com/`
- [ ] Knights' Portal accessible: `/web/knights-round-table/`
- [ ] Merlin's Sanctum protected: `/admin/merlins-portal/` (prompts for password)
- [ ] Treasury API responds: `curl https://www.excaliburcrypto.com/api/treasury/health`
- [ ] Forge API responds: `curl https://www.excaliburcrypto.com/api/forge/health`
- [ ] HTTPS redirect works (HTTP → HTTPS)
- [ ] SSL certificate valid

## Vercel Deployment

### Prerequisites
- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm install -g vercel`)

### Setup
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] Configure custom domain in Vercel dashboard
- [ ] Update DNS at registrar (CNAME to Vercel)
- [ ] Set environment variables in Vercel dashboard

### Validation
- [ ] Website loads: `https://www.excaliburcrypto.com/`
- [ ] All pages accessible
- [ ] SSL certificate auto-provisioned
- [ ] Custom domain working

## GitHub Pages Deployment

### Prerequisites
- [ ] GitHub account
- [ ] Repository on GitHub

### Setup
- [ ] Enable GitHub Pages in Settings
- [ ] Select `gh-pages` branch as source
- [ ] Configure custom domain: `www.excaliburcrypto.com`
- [ ] Update DNS at registrar (CNAME to `username.github.io`)
- [ ] Wait for DNS propagation (5-30 minutes)

### Validation
- [ ] Website loads: `https://www.excaliburcrypto.com/`
- [ ] GitHub Pages deployment successful (Actions tab)
- [ ] SSL certificate provisioned
- [ ] Custom domain working

## Traditional VPS Deployment

### Prerequisites
- [ ] VPS with Ubuntu/Debian
- [ ] Root or sudo access
- [ ] Server IP address
- [ ] Ports 80/443 available

### Setup
- [ ] SSH into server
- [ ] Clone repository
- [ ] Run deployment script
  ```bash
  sudo ./scripts/deploy.sh
  ```
- [ ] Configure SSL
  ```bash
  sudo ./scripts/setup-ssl.sh
  ```
- [ ] Set up admin authentication
  ```bash
  sudo ./scripts/setup-auth.sh
  ```
- [ ] Configure firewall
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

### Validation
- [ ] Website loads: `https://www.excaliburcrypto.com/`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] SSL certificate valid
- [ ] Admin portal password-protected

## Post-Deployment

### Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure log aggregation
- [ ] Set up alerts for errors
- [ ] Monitor disk space
- [ ] Monitor bandwidth usage

### Testing
- [ ] Test forge functionality
  - [ ] Enter XIII words axiom
  - [ ] Click "Draw the Sword"
  - [ ] Verify mining completes
  - [ ] Check P2TR address generation
- [ ] Test admin portal
  - [ ] Login with credentials
  - [ ] Verify treasury display
  - [ ] Test difficulty adjustment
  - [ ] Check anomaly map
- [ ] Test mobile compatibility
  - [ ] iOS browser
  - [ ] Android browser
  - [ ] Responsive layout

### API Testing
- [ ] Treasury API
  ```bash
  curl https://www.excaliburcrypto.com/api/treasury/health
  curl https://www.excaliburcrypto.com/api/treasury/stats
  ```
- [ ] Forge API
  ```bash
  curl https://www.excaliburcrypto.com/api/forge/health
  curl https://www.excaliburcrypto.com/api/forge/treasury/stats
  ```
- [ ] Rate limiting working (excessive requests blocked)

### Security Audit
- [ ] Run SSL test: https://www.ssllabs.com/ssltest/
- [ ] Check security headers: https://securityheaders.com/
- [ ] Verify CORS restrictions
- [ ] Test rate limiting
- [ ] Verify admin authentication
- [ ] Check for exposed sensitive data
- [ ] Review logs for errors

### Backups
- [ ] Database/volume backup configured
- [ ] Backup tested and verified
- [ ] Automated backup schedule set
- [ ] Off-site backup location

### Documentation
- [ ] Document deployment date
- [ ] Record admin credentials (secure location)
- [ ] Document any customizations
- [ ] Create runbook for common tasks
- [ ] Share access with team members

## Ongoing Maintenance

### Daily
- [ ] Check uptime status
- [ ] Review error logs
- [ ] Monitor traffic

### Weekly
- [ ] Review security logs
- [ ] Check disk space
- [ ] Verify backups
- [ ] Update dependencies if needed

### Monthly
- [ ] Renew SSL certificates (if manual)
- [ ] Review and update security policies
- [ ] Performance optimization
- [ ] Capacity planning review

### Quarterly
- [ ] Security audit
- [ ] Dependency updates
- [ ] Disaster recovery test
- [ ] Review and update documentation

## Rollback Plan

If issues arise after deployment:

### Docker
```bash
docker-compose down
git checkout <previous-commit>
docker-compose up -d
```

### Vercel
```bash
vercel rollback
# Or promote previous deployment in dashboard
```

### GitHub Pages
```bash
git revert <commit-hash>
git push origin main
```

### Traditional VPS
```bash
cd /var/www/excaliburcrypto.com
git checkout <previous-commit>
sudo systemctl restart nginx
```

## Support Contacts

- **Lead Architect**: Travis D Jones (holedozer@gmail.com)
- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS
- **Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues

## Emergency Procedures

### Site Down
1. Check DNS: `dig www.excaliburcrypto.com`
2. Check server: `ping <server-ip>`
3. Check services: `docker-compose ps` or `sudo systemctl status nginx`
4. Check logs: `docker-compose logs` or `sudo tail -f /var/log/nginx/error.log`
5. Restart services if needed

### Security Breach
1. Take site offline immediately
2. Review logs for unauthorized access
3. Change all credentials
4. Restore from backup
5. Apply security patches
6. Investigate root cause
7. Notify users if data compromised

### Database Corruption
1. Stop services
2. Restore from most recent backup
3. Verify data integrity
4. Restart services
5. Monitor closely

---

## Deployment Complete! 🎉

Once all items are checked, your Excalibur $EXS Protocol is live and ready to accept forges!

*"The Legend Lives"* ⚔️
