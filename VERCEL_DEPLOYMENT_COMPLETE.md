# ⚔️ Excalibur $EXS - Vercel Deployment Complete

## ✅ Status: DEPLOYMENT CONFIGURATIONS READY

The Excalibur $EXS repository now has properly configured Vercel deployment files for all services!

---

## 📋 What Was Fixed

### 1. Configuration Files Created/Updated

#### ✅ `vercel.json` (Root - Static Website)
- **Purpose**: Default deployment for the main static website
- **Target**: www.excaliburcrypto.com
- **Content**: Serves website/, web/, and admin/ directories
- **Routes**:
  - `/` → Main landing page (website/index.html)
  - `/web/knights-round-table/` → Knights' Portal
  - `/admin/merlins-portal/` → Merlin's Sanctum
  - `/assets/*` → Static assets (CSS, JS)

#### ✅ `vercel-website.json` (Explicit Website Config)
- **Purpose**: Alternative/explicit configuration for static website
- **Same as root vercel.json but with more detailed routing**
- **Use**: Can be used with `vercel --config vercel-website.json`

#### ✅ `vercel-oracle-api.json` (Oracle API Service)
- **Purpose**: Separate deployment for Oracle API serverless function
- **Target**: oracle.excaliburcrypto.com
- **Content**: Python serverless function (cmd/oracle-api/app.py)
- **Runtime**: @vercel/python
- **Includes**: pkg/** directory for dependencies

#### ✅ `web/forge-ui/vercel.json` (Next.js Forge UI)
- **Purpose**: Separate deployment for Next.js Forge UI application
- **Target**: forge.excaliburcrypto.com (or similar subdomain)
- **Framework**: Next.js 14
- **Environment Variables**: API endpoints pre-configured

### 2. `.vercelignore` Updated
- ✅ Excludes Go backend code (cmd/, pkg/, *.go)
- ✅ Excludes Python scripts (for website deployment)
- ✅ Excludes blockchain/ledger data
- ✅ Excludes Docker files
- ✅ Excludes mobile app source
- ✅ Excludes build artifacts (node_modules, .next, etc.)
- ✅ Keeps website/, web/, admin/ directories for deployment

### 3. Security Headers Configured
All deployments include proper security headers:
- `Strict-Transport-Security`: Forces HTTPS
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Browser XSS protection
- `Cache-Control`: Optimized caching for static assets

---

## 🚀 How to Deploy

### Deployment Strategy

The Excalibur $EXS project requires **THREE separate Vercel projects**:

#### 1. Main Website (Static)
**Domain**: www.excaliburcrypto.com  
**Config**: `vercel.json` or `vercel-website.json`  
**Content**: Landing page, Knights' Portal, Merlin's Sanctum

```bash
# From repository root
vercel --prod
```

Or use Vercel Dashboard:
1. Import repository: `Holedozer1229/Excalibur-EXS`
2. Vercel auto-detects `vercel.json`
3. Deploy to production
4. Add custom domain: `www.excaliburcrypto.com`

#### 2. Oracle API (Serverless Function)
**Domain**: oracle.excaliburcrypto.com  
**Config**: `vercel-oracle-api.json`  
**Content**: Python API for oracle services

```bash
# From repository root
vercel --config vercel-oracle-api.json --prod
```

Or create separate Vercel project:
1. Import same repository: `Holedozer1229/Excalibur-EXS`
2. Override settings:
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Root Directory: `./`
3. In project settings, specify `vercel-oracle-api.json` as config
4. Add custom domain: `oracle.excaliburcrypto.com`

#### 3. Forge UI (Next.js App) - Optional
**Domain**: forge.excaliburcrypto.com (or app.excaliburcrypto.com)  
**Config**: `web/forge-ui/vercel.json`  
**Content**: Next.js application for mining interface

```bash
# From repository root
cd web/forge-ui
vercel --prod
```

Or create separate Vercel project:
1. Import same repository: `Holedozer1229/Excalibur-EXS`
2. Set Root Directory: `web/forge-ui`
3. Vercel auto-detects Next.js
4. Add environment variables (see below)
5. Deploy to production

---

## 🔧 Environment Variables

### Main Website (vercel.json)
No environment variables required. Static files only.

### Oracle API (vercel-oracle-api.json)
Set in Vercel Dashboard → Settings → Environment Variables:
```
ORACLE_API_DOMAIN=oracle.excaliburcrypto.com
```

Add any additional API keys or secrets as needed.

### Forge UI (web/forge-ui/vercel.json)
Required environment variables:
```
NEXT_PUBLIC_TETRA_POW_URL=https://tetra-pow.excaliburcrypto.com
NEXT_PUBLIC_DICE_ROLL_URL=https://dice-roll.excaliburcrypto.com
NEXT_PUBLIC_TREASURY_URL=https://treasury.excaliburcrypto.com
NEXT_PUBLIC_ROSETTA_URL=https://rosetta.excaliburcrypto.com
NEXT_PUBLIC_GUARDIAN_URL=https://guardian.excaliburcrypto.com
```

---

## 🌐 Domain Configuration

### For Hostinger Domains

If using Hostinger for domain registration (excaliburcrypto.com):

1. **Deploy to Vercel first** to get your Vercel URL
2. **In Vercel Dashboard** → Project → Settings → Domains:
   - Add: `www.excaliburcrypto.com`
   - Add: `oracle.excaliburcrypto.com`
   - Add: `forge.excaliburcrypto.com` (if using Forge UI)
3. **In Hostinger hPanel** → Domains → DNS Zone Editor:
   - Add CNAME record:
     - Name: `www`
     - Points to: `cname.vercel-dns.com`
     - TTL: 14400
   - Add CNAME record:
     - Name: `oracle`
     - Points to: `cname.vercel-dns.com`
     - TTL: 14400
   - Add CNAME record:
     - Name: `forge`
     - Points to: `cname.vercel-dns.com`
     - TTL: 14400
4. **Wait for DNS propagation** (5-30 minutes)
5. **SSL is automatic** - Vercel provisions certificates

See [HOSTINGER_VERCEL_SETUP.md](HOSTINGER_VERCEL_SETUP.md) for detailed instructions.

---

## ✅ Verification Checklist

After deployment, verify:

### Main Website
- [ ] https://www.excaliburcrypto.com/ loads
- [ ] Landing page displays correctly
- [ ] CSS and JavaScript load properly
- [ ] Navigation works
- [ ] `/web/knights-round-table/` accessible
- [ ] `/admin/merlins-portal/` accessible
- [ ] HTTPS certificate valid
- [ ] Security headers present (check browser dev tools)

### Oracle API
- [ ] https://oracle.excaliburcrypto.com/ responds
- [ ] API endpoints return valid JSON
- [ ] CORS headers configured correctly
- [ ] Function executes without timeout
- [ ] HTTPS certificate valid

### Forge UI (if deployed)
- [ ] https://forge.excaliburcrypto.com/ loads
- [ ] Next.js app renders correctly
- [ ] API endpoints are reachable
- [ ] All tabs functional
- [ ] No console errors
- [ ] Mobile responsive

---

## 🐛 Troubleshooting

### Issue: "Build failed" or "No such file or directory"

**Solution**: Check that you're using the correct config file:
- Main website: `vercel.json` (default)
- Oracle API: `vercel --config vercel-oracle-api.json`
- Forge UI: Deploy from `web/forge-ui/` directory

### Issue: "404 Not Found" on assets

**Solution**: Verify routes in vercel.json:
- Assets should be at `/website/assets/`
- Routes correctly map `/assets/*` → `/website/assets/$1`

### Issue: Oracle API deployment includes website files

**Solution**: Create separate Vercel project for Oracle API using `vercel-oracle-api.json`

### Issue: Environment variables not loading

**Solution**: 
- Add in Vercel Dashboard → Settings → Environment Variables
- For Next.js client-side: Must start with `NEXT_PUBLIC_`
- Redeploy after adding variables

### Issue: CORS errors on Oracle API

**Solution**: Verify `vercel-oracle-api.json` includes CORS headers:
```json
"Access-Control-Allow-Origin": "*"
"Access-Control-Allow-Methods": "GET, POST, OPTIONS"
```

---

## 📊 Deployment Matrix

| Service | Config File | Domain | Type | Deployment |
|---------|------------|--------|------|------------|
| Main Website | `vercel.json` | www.excaliburcrypto.com | Static HTML | Separate Vercel Project #1 |
| Oracle API | `vercel-oracle-api.json` | oracle.excaliburcrypto.com | Python Serverless | Separate Vercel Project #2 |
| Forge UI | `web/forge-ui/vercel.json` | forge.excaliburcrypto.com | Next.js App | Separate Vercel Project #3 |

---

## 🔄 Continuous Deployment

Once connected to GitHub, Vercel automatically deploys:

- **Production**: Pushes to `main` branch
- **Preview**: Pushes to feature branches
- **Pull Requests**: Automatic preview deployments with unique URLs

Enable GitHub integration:
1. Vercel Dashboard → Project → Settings → Git
2. Connect repository
3. Select production branch (`main`)
4. Save settings

Every commit triggers automatic deployment!

---

## 📞 Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Repository Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Email Support**: holedozer@gmail.com

---

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Main website loads at www.excaliburcrypto.com
2. ✅ All pages accessible (home, Knights' Portal, Merlin's Sanctum)
3. ✅ Assets load correctly (CSS, JS, images)
4. ✅ Security headers present (check with curl or browser dev tools)
5. ✅ HTTPS enabled with valid certificate
6. ✅ No console errors
7. ✅ Mobile responsive design works
8. ✅ Oracle API responds at oracle.excaliburcrypto.com (if deployed)
9. ✅ Forge UI functional at forge.excaliburcrypto.com (if deployed)

---

**⚔️ "The sword is drawn. The forge is lit. The realm is deployed."**

---

**Last Updated**: January 2026  
**Status**: ✅ Ready for Production
