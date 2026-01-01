# Excalibur EXS - Complete Deployment Checklist

## 🎯 Pre-Deployment Checklist

### Repository Preparation
- [x] All code committed to repository
- [x] Branch: `copilot/update-tokenomics-and-treasury-logic`
- [x] Latest commit: 7d38fb7
- [x] PR created and reviewed
- [ ] Merge to `main` branch (ready when approved)

### Components Status
- [x] Tetra-PoW Go Miner (cmd/tetra_pow/)
- [x] Dice-Roll Python Miner (cmd/diceminer/)
- [x] Lancelot Guardian (cmd/lancelot_guardian/)
- [x] Treasury API with CLTV (cmd/treasury/)
- [x] Rosetta API integration (cmd/rosetta/)
- [x] Forge UI (web/forge-ui/)
- [x] Admin Portal (admin/merlins-portal/)
- [x] Mobile App structure (mobile-app/)

## 🚀 Deployment Steps

### Phase 1: Vercel Deployment (Web UI)

#### Step 1: Connect Repository to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New Project"
   - Select "Import Git Repository"

2. **Import from GitHub**
   - Search for: `Holedozer1229/Excalibur-EXS`
   - Click "Import"
   - Select branch: `main` (after PR merge)

3. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: web/forge-ui
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

#### Step 2: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

**Production Variables:**
```
NEXT_PUBLIC_TETRA_POW_URL=https://tetra-pow.excaliburcrypto.com
NEXT_PUBLIC_DICE_ROLL_URL=https://dice-roll.excaliburcrypto.com
NEXT_PUBLIC_TREASURY_URL=https://treasury.excaliburcrypto.com
NEXT_PUBLIC_ROSETTA_URL=https://rosetta.excaliburcrypto.com
NEXT_PUBLIC_GUARDIAN_URL=https://guardian.excaliburcrypto.com
```

**Preview/Development Variables:**
```
NEXT_PUBLIC_TETRA_POW_URL=http://localhost:8082
NEXT_PUBLIC_DICE_ROLL_URL=http://localhost:8083
NEXT_PUBLIC_TREASURY_URL=http://localhost:8080
NEXT_PUBLIC_ROSETTA_URL=http://localhost:8081
NEXT_PUBLIC_GUARDIAN_URL=http://localhost:8084
```

#### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Verify deployment URL: `https://excalibur-exs.vercel.app`

#### Step 4: Configure Custom Domain

1. **In Vercel Dashboard → Settings → Domains**
2. Add domain: `www.excaliburcrypto.com`
3. **Configure DNS Records** (in your domain registrar):
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```
4. Wait for DNS propagation (5-60 minutes)
5. Verify: https://www.excaliburcrypto.com

### Phase 2: Backend Services Deployment

#### Option A: Docker Compose (Recommended for Development)

```bash
# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Checkout main branch
git checkout main

# Deploy all services
./scripts/deploy-exs.sh
```

**Services will be available at:**
- Treasury API: http://localhost:8080
- Rosetta API: http://localhost:8081
- Tetra-PoW Miner: http://localhost:8082
- Dice-Roll Miner: http://localhost:8083
- Lancelot Guardian: http://localhost:8084
- Forge UI: http://localhost:3000

#### Option B: Cloud Deployment (Production)

**AWS ECS / Kubernetes / Digital Ocean:**

1. **Build and Push Docker Images**
   ```bash
   # Tetra-PoW
   docker build -t exs-tetra-pow ./cmd/tetra_pow
   docker tag exs-tetra-pow registry.example.com/exs-tetra-pow:latest
   docker push registry.example.com/exs-tetra-pow:latest

   # Dice-Roll
   docker build -t exs-diceminer ./cmd/diceminer
   docker tag exs-diceminer registry.example.com/exs-diceminer:latest
   docker push registry.example.com/exs-diceminer:latest

   # Guardian
   docker build -t exs-guardian ./cmd/lancelot_guardian
   docker tag exs-guardian registry.example.com/exs-guardian:latest
   docker push registry.example.com/exs-guardian:latest
   ```

2. **Deploy to Cloud**
   - Configure load balancers
   - Set up auto-scaling
   - Configure health checks
   - Enable monitoring

3. **Update DNS**
   ```
   tetra-pow.excaliburcrypto.com → Load Balancer IP
   dice-roll.excaliburcrypto.com → Load Balancer IP
   treasury.excaliburcrypto.com  → Load Balancer IP
   rosetta.excaliburcrypto.com   → Load Balancer IP
   guardian.excaliburcrypto.com  → Load Balancer IP
   ```

### Phase 3: Admin Portal Setup

1. **Access Admin Portal**
   - URL: https://www.excaliburcrypto.com/admin/merlins-portal/
   
2. **Login Credentials**
   - Password: `sword`
   - (See `docs/ADMIN_CREDENTIALS.md` for full details)

3. **Configure Admin Settings**
   - Set up alert channels (Slack/Discord)
   - Configure difficulty parameters
   - Set up treasury monitoring thresholds

## 🔒 Security Configuration

### SSL/TLS Certificates

**Vercel (Automatic):**
- Vercel provides automatic SSL certificates
- HTTPS enforced by default
- Certificate auto-renewal

**Custom Domains:**
```bash
# Using Let's Encrypt
certbot certonly --nginx -d excaliburcrypto.com -d www.excaliburcrypto.com
```

### Firewall Rules

**Configure IP Whitelist for Admin Portal:**
```nginx
location /admin/ {
    allow 1.2.3.4;      # Your IP
    allow 5.6.7.8;      # Team IP
    deny all;
    
    # Other configuration
}
```

### Rate Limiting

```nginx
# Configure in nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
}
```

## 🧪 Post-Deployment Testing

### Automated Tests

```bash
# Run full test suite
cd web/forge-ui
npm run test

# Type checking
npm run type-check

# Build test
npm run build
```

### Manual Testing Checklist

**Forge UI:**
- [ ] Navigate to https://www.excaliburcrypto.com
- [ ] Verify all 5 tabs load:
  - [ ] ⚔️ Forge Initiation
  - [ ] 🏛️ Treasury
  - [ ] 🏰 Vault Generator
  - [ ] ⛏️ Miner
  - [ ] 🌐 Network
- [ ] Test Forge Initiation:
  - [ ] Arthurian axiom displays correctly
  - [ ] Can select Tetra-PoW miner
  - [ ] Can select Dice-Roll miner
  - [ ] Mining operation triggers
- [ ] Test Treasury:
  - [ ] Balance displays
  - [ ] CLTV timeline shows
  - [ ] Mini-outputs visible
  - [ ] Countdown timers work
- [ ] Test Vault Generator:
  - [ ] Can generate P2TR address
  - [ ] Address displays correctly
- [ ] Mobile responsive on all screen sizes

**Admin Portal:**
- [ ] Navigate to https://www.excaliburcrypto.com/admin/merlins-portal/
- [ ] Login with credentials
- [ ] Verify metrics display:
  - [ ] Treasury balance
  - [ ] Total forges
  - [ ] Network hashrate
- [ ] Test difficulty adjustment
- [ ] Verify access log updates

**API Endpoints:**
```bash
# Treasury API
curl https://treasury.excaliburcrypto.com/stats
curl https://treasury.excaliburcrypto.com/mini-outputs

# Rosetta API
curl https://rosetta.excaliburcrypto.com/network/status

# Tetra-PoW Miner
curl https://tetra-pow.excaliburcrypto.com/health

# Dice-Roll Miner
curl https://dice-roll.excaliburcrypto.com/health

# Guardian
curl https://guardian.excaliburcrypto.com/health
```

## 📊 Monitoring Setup

### Vercel Analytics

1. Enable in Vercel Dashboard
2. View real-time traffic
3. Monitor performance metrics

### Custom Monitoring

```javascript
// Add to web/forge-ui/app/layout.tsx
useEffect(() => {
  // Track page views
  analytics.track('page_view', {
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
}, []);
```

### Health Check Endpoints

Monitor these endpoints:
```
https://www.excaliburcrypto.com/api/health
https://treasury.excaliburcrypto.com/health
https://rosetta.excaliburcrypto.com/health
https://tetra-pow.excaliburcrypto.com/health
https://dice-roll.excaliburcrypto.com/health
https://guardian.excaliburcrypto.com/health
```

## 🎉 Go-Live Checklist

### Final Verification

- [ ] All services deployed and healthy
- [ ] SSL certificates active
- [ ] DNS propagated (check with `nslookup`)
- [ ] Monitoring active
- [ ] Backup systems configured
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready

### Announcement

1. **Update Website Banner**
   ```
   ⚔️ Excalibur EXS is now live!
   ```

2. **Social Media Posts**
   - Twitter announcement
   - Discord community update
   - GitHub README badge

3. **Documentation Links**
   - Link to `docs/VERCEL_DEPLOYMENT.md`
   - Link to `docs/ADMIN_CREDENTIALS.md`
   - Link to `docs/EXS_ECOSYSTEM_GUIDE.md`

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel will automatically deploy:
- **Production:** Pushes to `main` branch
- **Preview:** Pull requests and other branches

### Rollback Procedure

If issues occur:
```bash
# Revert to previous deployment in Vercel Dashboard
# Or use CLI:
vercel rollback
```

## 📞 Support & Monitoring

### Status Page
- Create status page: https://status.excaliburcrypto.com
- Monitor all services
- Display uptime statistics

### Alert Channels
- Email: admin@excaliburcrypto.com
- Slack: #exs-alerts
- Discord: #monitoring

### On-Call Rotation
- Set up PagerDuty or similar
- Configure escalation policies
- Document incident response

---

## ✅ Deployment Complete!

Your Excalibur EXS ecosystem is now live:

- **Website:** https://www.excaliburcrypto.com
- **Admin Portal:** https://www.excaliburcrypto.com/admin/merlins-portal/
- **GitHub:** https://github.com/Holedozer1229/Excalibur-EXS
- **Documentation:** Full guides in `docs/` directory

**⚔️ "Whosoever pulls this sword from this stone shall be rightwise king born of all England."**

**🔮 The Arthurian Forge is Live! Deploy with Honor!**
