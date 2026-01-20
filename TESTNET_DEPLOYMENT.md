# Testnet Deployment Guide - Excalibur $EXS

## Overview

This guide provides step-by-step instructions for deploying the Excalibur $EXS website to testnet using Vercel.

## Prerequisites

- GitHub repository access: https://github.com/Holedozer1229/Excalibur-EXS
- Vercel account (free tier works)
- Domain (optional): excaliburcrypto.com or custom domain

## Deployment Steps

### Option 1: Deploy with Vercel (Recommended)

#### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import the Excalibur-EXS repository
4. Select the repository: `Holedozer1229/Excalibur-EXS`

#### Step 2: Configure Project Settings

**Framework Preset:** Other (Static Site)

**Build Settings:**
- Build Command: (leave empty - it's a static site)
- Output Directory: (leave empty)
- Install Command: (leave empty)

**Root Directory:** `.` (use repository root)

#### Step 3: Configure Environment Variables

Add the following environment variables in Vercel project settings:

```
# Required Variables
ENV=staging
BITCOIN_NETWORK=testnet
DOMAIN=your-project.vercel.app

# Oracle API (if deploying separately)
ORACLE_API_URL=https://oracle-staging.excaliburcrypto.com
ORACLE_API_KEY=your-secure-api-key-here

# Optional Variables
LOG_LEVEL=info
ENABLE_ADMIN_PORTAL=true
ENABLE_PUBLIC_FORGE=true
```

#### Step 4: Deploy

1. Click "Deploy"
2. Wait for deployment to complete (usually 1-2 minutes)
3. Your site will be available at: `https://your-project.vercel.app`

#### Step 5: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain: `www.excaliburcrypto.com`
3. Follow DNS configuration instructions
4. Update domain in environment variables

#### Step 6: Test Deployment

Visit your deployed site and verify:

✅ Homepage loads correctly
✅ Knights' Round Table portal accessible
✅ Merlin's Portal (admin) accessible
✅ Oracle page works
✅ All navigation links function
✅ External links (GitHub) work
✅ Mobile app store links present (placeholders)

---

### Option 2: Deploy with GitHub Pages

#### Step 1: Enable GitHub Pages

1. Go to repository settings
2. Navigate to "Pages"
3. Source: Deploy from branch
4. Branch: `main` or create `gh-pages` branch
5. Folder: `/` (root)

#### Step 2: Configure

Update the following in your repository:

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
          cname: www.excaliburcrypto.com  # optional: if using custom domain
```

#### Step 3: Access Your Site

- Default URL: `https://holedozer1229.github.io/Excalibur-EXS/`
- Custom domain: `https://www.excaliburcrypto.com` (after DNS setup)

---

### Option 3: Deploy with Docker

#### Prerequisites
- Docker installed
- Container registry access (Docker Hub, GCR, etc.)

#### Build Docker Image

```bash
cd /home/runner/work/Excalibur-EXS/Excalibur-EXS

# Build for web hosting
docker build -t excalibur-exs-web:latest -f Dockerfile .

# Run locally for testing
docker run -p 8080:80 excalibur-exs-web:latest
```

#### Deploy to Cloud Platform

**Google Cloud Run:**
```bash
# Tag and push
docker tag excalibur-exs-web:latest gcr.io/YOUR_PROJECT/excalibur-exs:latest
docker push gcr.io/YOUR_PROJECT/excalibur-exs:latest

# Deploy
gcloud run deploy excalibur-exs \
  --image gcr.io/YOUR_PROJECT/excalibur-exs:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

**AWS ECS/Fargate:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name excalibur-exs

# Push image
docker tag excalibur-exs-web:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/excalibur-exs:latest
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/excalibur-exs:latest

# Deploy using ECS service/task definition
```

---

## Post-Deployment Configuration

### 1. Oracle API Setup

If you haven't deployed the Oracle API yet, follow the **[ORACLE_DEPLOYMENT.md](ORACLE_DEPLOYMENT.md)** guide.

Once deployed, update the Oracle API URL:

**In Vercel:**
- Go to Project Settings → Environment Variables
- Update `ORACLE_API_URL` to your deployed Oracle endpoint
- Redeploy the project

**In Code:**
The website automatically detects the environment:
- `localhost` → Uses `http://localhost:5001` (development)
- Production domain → Uses `https://oracle.excaliburcrypto.com`

### 2. Bitcoin Network Configuration

For testnet deployment, ensure the following:

```env
BITCOIN_NETWORK=testnet
```

This ensures:
- All Bitcoin addresses generated are testnet (tb1p... instead of bc1p...)
- Forge transactions use testnet
- No real Bitcoin is at risk

### 3. Security Configuration

**Admin Portal Access:**
- Currently the admin portal is demonstration-only
- For production, implement proper authentication
- Consider using Vercel/Auth0/Firebase Authentication

**API Keys:**
- Generate secure API keys for Oracle
- Never commit keys to version control
- Use environment variables only

**CORS:**
- Configure allowed origins in Oracle API
- Update security headers in `vercel.json`

### 4. Analytics Setup (Optional)

Add Google Analytics:
```env
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

### 5. Monitoring

Set up monitoring for:
- Uptime (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance (Vercel Analytics)

---

## Testing Checklist

After deployment, test the following:

### Homepage (`/`)
- [ ] Redirects to `/website/index.html`
- [ ] All sections render correctly
- [ ] Animation and effects work
- [ ] Responsive design on mobile

### Knights' Round Table (`/web/knights-round-table/`)
- [ ] Page loads correctly
- [ ] Axiom input field present
- [ ] "Draw the Sword" button works
- [ ] Link to Oracle works
- [ ] Link to Merlin's Portal works

### Oracle Page (`/web/knights-round-table/oracle.html`)
- [ ] Oracle query interface works
- [ ] Quick action buttons present
- [ ] Divination feature accessible
- [ ] Protocol status displayed

### Merlin's Portal (`/admin/merlins-portal/`)
- [ ] Admin dashboard loads
- [ ] Treasury monitoring displayed
- [ ] Difficulty adjustment controls present
- [ ] Oracle integration functional
- [ ] Configuration loads correctly

### Configuration System
- [ ] Environment detected correctly
- [ ] Oracle API URL set appropriately
- [ ] Config logged in browser console (dev mode)

### External Links
- [ ] GitHub repository links work
- [ ] External documentation accessible
- [ ] Mobile app store links present (placeholders)

### Assets
- [ ] CSS loads and styles apply
- [ ] JavaScript functions properly
- [ ] Fonts load (Google Fonts)
- [ ] No console errors (except expected Oracle connection in dev)

---

## Verification Commands

### Check Deployment

```bash
# Test homepage
curl -I https://your-deployment.vercel.app

# Test Knights Portal
curl -I https://your-deployment.vercel.app/web/knights-round-table/

# Test Admin Portal
curl -I https://your-deployment.vercel.app/admin/merlins-portal/

# Check configuration
curl https://your-deployment.vercel.app/website/assets/js/config.js
```

### DNS Verification

```bash
# Check DNS records
dig www.excaliburcrypto.com

# Verify SSL certificate
openssl s_client -connect www.excaliburcrypto.com:443 -servername www.excaliburcrypto.com
```

---

## Troubleshooting

### Issue: "404 - Page Not Found"

**Solution:**
- Verify `vercel.json` rewrites are correctly configured
- Check file paths are case-sensitive
- Ensure all HTML files are in correct directories

### Issue: "Oracle API Connection Refused"

**Solution:**
- Deploy Oracle API separately (see ORACLE_DEPLOYMENT.md)
- Update `ORACLE_API_URL` environment variable
- Verify CORS is configured correctly in Oracle API
- Check Oracle API is running and accessible

### Issue: "CSS/JS Not Loading"

**Solution:**
- Check `vercel.json` asset rewrites
- Verify paths in HTML files
- Clear browser cache
- Check browser console for errors

### Issue: "Links Not Working"

**Solution:**
- All internal links use absolute paths (`/web/...`, `/admin/...`)
- Verify `vercel.json` routing configuration
- Test in incognito mode to rule out caching

### Issue: "Configuration Not Loading"

**Solution:**
- Check `config.js` is accessible at `/website/assets/js/config.js`
- Verify script tag is in HTML `<head>`
- Check browser console for JavaScript errors
- Ensure proper file permissions

---

## Rollback Procedure

If deployment has issues:

**Vercel:**
1. Go to Project → Deployments
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"

**GitHub Pages:**
1. Revert commit in repository
2. Wait for automatic redeployment

**Docker:**
1. Pull previous image tag
2. Redeploy previous version

---

## Maintenance

### Update Website

```bash
# Make changes locally
git add .
git commit -m "Update website"
git push origin main

# Vercel will automatically deploy
# Or trigger manual deployment in Vercel dashboard
```

### Update Oracle API URL

1. Deploy new Oracle API endpoint
2. Update environment variable in Vercel
3. Redeploy project (or it redeploys automatically)

### Monitor Performance

- Vercel Analytics: Project → Analytics
- Google Analytics: analytics.google.com
- Error tracking: Sentry dashboard

---

## Production Deployment

When ready for production:

1. Update environment:
   ```env
   ENV=production
   BITCOIN_NETWORK=mainnet
   ORACLE_API_URL=https://oracle.excaliburcrypto.com
   ```

2. Deploy Oracle API to production

3. Update DNS to point to production

4. Enable monitoring and alerts

5. Test thoroughly before announcing

---

## Cost Estimates

| Platform | Testnet Cost | Production Cost | Notes |
|----------|--------------|-----------------|-------|
| Vercel | $0 | $0 - $20/mo | Free tier sufficient for most use |
| GitHub Pages | $0 | $0 | Free for public repos |
| Cloud Run | $0 - $5 | $5 - $20/mo | Pay per request |
| DigitalOcean | $6/mo | $12/mo | Fixed VPS pricing |

---

## Support & Resources

- **Documentation:** Repository `/docs` folder
- **Oracle Deployment:** [ORACLE_DEPLOYMENT.md](ORACLE_DEPLOYMENT.md)
- **GitHub Issues:** https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Email:** holedozer@gmail.com

---

## Next Steps

1. ✅ Deploy website to Vercel testnet
2. ✅ Deploy Oracle API (see ORACLE_DEPLOYMENT.md)
3. ✅ Configure custom domain
4. ✅ Set up monitoring
5. ✅ Test all features
6. ✅ Run security audit
7. ✅ Prepare for production launch

---

**Last Updated:** 2026-01-20
**Version:** 1.0.0
**Status:** Ready for Testnet Deployment
