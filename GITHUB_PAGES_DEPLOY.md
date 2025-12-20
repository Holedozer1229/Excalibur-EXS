# Excalibur $EXS - GitHub Pages Deployment Guide

Deploy the Excalibur $EXS website to GitHub Pages for free static hosting.

## Quick Deploy

### Option 1: Automatic Deployment (Recommended)

Already configured! Just enable GitHub Pages:

1. Go to Repository → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: Select `gh-pages` (will be created automatically)
4. Click Save

The `.github/workflows/deploy-pages.yml` will automatically deploy on every push.

### Option 2: Manual Deployment

```bash
# Install gh-pages package
npm install -g gh-pages

# Deploy
gh-pages -d . -b gh-pages
```

## Custom Domain Setup

### Step 1: Configure GitHub Pages Domain

1. Go to Repository → Settings → Pages
2. Custom domain: Enter `www.excaliburcrypto.com`
3. Click Save
4. Wait for DNS check

### Step 2: Configure DNS

At your domain registrar, add these DNS records:

**For Apex Domain (excaliburcrypto.com):**
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**For WWW Subdomain (www.excaliburcrypto.com):**
```
Type: CNAME
Name: www
Value: Holedozer1229.github.io
```

### Step 3: Verify

Wait 5-30 minutes for DNS propagation, then visit:
- https://www.excaliburcrypto.com
- https://excaliburcrypto.com

## HTTPS/SSL

GitHub Pages automatically provisions SSL certificates for custom domains.

## Site Structure

The deployment will serve:
- `/` → Main website (website/index.html)
- `/web/knights-round-table/` → Knights' Portal
- `/admin/merlins-portal/` → Merlin's Sanctum

## GitHub Actions Workflow

The workflow `.github/workflows/deploy-pages.yml` automatically:

1. Triggers on push to `main` branch
2. Builds the site (if needed)
3. Deploys to `gh-pages` branch
4. Updates live site

### Workflow File

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Limitations

### Static Files Only

GitHub Pages serves static files only. No server-side processing.

For backend services (Treasury API, Forge Processor):
- Deploy separately (see `DOCKER_DEPLOY.md`)
- Use external APIs
- Consider Vercel or Netlify for serverless functions

### Admin Portal Authentication

GitHub Pages doesn't support Basic Auth natively. Options:

1. **Client-side protection** (not secure for production):
   ```javascript
   const password = prompt('Enter password:');
   if (password !== 'your-secret-password') {
     window.location.href = '/';
   }
   ```

2. **Use separate service**: Deploy admin portal to password-protected service

3. **Netlify/Vercel**: Use these for server-side auth

### File Size Limits

- Repository size: < 1 GB recommended
- Individual files: < 100 MB
- Bandwidth: Soft limit ~100 GB/month

## Monitoring

### GitHub Pages Status

Check deployment status:
- Repository → Actions → Deploy to GitHub Pages workflow
- Repository → Settings → Pages

### Analytics

Add Google Analytics or similar to track visitors:

```html
<!-- Add to website/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Rollback

To roll back to a previous version:

```bash
# View commit history
git log

# Revert to previous commit
git revert <commit-hash>
git push origin main
```

The workflow will automatically deploy the reverted version.

## Custom 404 Page

Create `404.html` in root:

```html
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <meta http-equiv="refresh" content="0; url=/">
</head>
<body>
    <p>Redirecting to home...</p>
</body>
</html>
```

## Updating the Site

Any push to `main` branch automatically triggers deployment:

```bash
# Make changes
git add .
git commit -m "Update website"
git push origin main

# Wait 1-2 minutes for deployment
```

## Cost

**Completely FREE** with GitHub Pages:
- Unlimited bandwidth (fair use)
- Free SSL certificate
- Free custom domain
- Free hosting

## Troubleshooting

### Site Not Loading

1. Check GitHub Actions: Repository → Actions
2. Verify DNS: Use `dig www.excaliburcrypto.com`
3. Clear browser cache
4. Wait for DNS propagation (up to 48 hours)

### Custom Domain Not Working

1. Repository → Settings → Pages → Check "Enforce HTTPS"
2. Remove and re-add custom domain
3. Verify CNAME file exists in `gh-pages` branch

### Build Failures

View logs in Actions tab, check for:
- Syntax errors in HTML/CSS/JS
- Missing files
- Invalid workflow configuration

## Support

- GitHub Pages Docs: https://docs.github.com/pages
- Email: holedozer@gmail.com
- Repository: https://github.com/Holedozer1229/Excalibur-EXS

## Alternative Deployments

- **Docker**: See `DOCKER_DEPLOY.md` for full-stack deployment
- **Vercel**: See `VERCEL_DEPLOY.md` for instant deployment with serverless
- **Traditional Server**: See `DEPLOY.md` for VPS deployment
