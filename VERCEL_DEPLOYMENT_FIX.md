# Vercel Deployment Fix - Quick Guide

## Issue Resolution

The Vercel deployment was failing because the root `vercel.json` was configured to deploy the Oracle API (Python backend) instead of the static website.

### What Was Fixed

1. **Updated `vercel.json`**: Changed from Oracle API deployment to static website deployment
2. **Updated `.vercelignore`**: Excluded all backend code, Python files, and build artifacts
3. **Created `vercel-oracle-api.json`**: Saved the original Oracle API configuration for future separate deployment

---

## Quick Deployment Guide

### Main Website Deployment (Default)

The root `vercel.json` now deploys the static website by default.

**To Deploy:**

1. **Via Vercel Dashboard:**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect `vercel.json`
   - Click "Deploy"
   - No build command needed (static files)

2. **Via Vercel CLI:**
   ```bash
   vercel --prod
   ```

**What Gets Deployed:**
- Root `index.html` (redirects to `/website/`)
- `/website/` directory (main landing page)
- `/web/knights-round-table/` (forge interface)
- All static assets (CSS, JS, images)

---

## Configuration Details

### Root `vercel.json` (Static Website)

```json
{
  "version": 2,
  "name": "excalibur-exs",
  "routes": [
    {"src": "^/$", "dest": "/index.html"},
    {"src": "^/website/(.*)", "dest": "/website/$1"},
    {"src": "^/web/knights-round-table/(.*)", "dest": "/web/knights-round-table/$1"}
  ]
}
```

### What's Excluded (`.vercelignore`)

- All backend code (`/cmd`, `/pkg`)
- Python files (`*.py`)
- Go files (`*.go`)
- Build artifacts (`node_modules`, `.next`)
- Large binaries (`treasury`, `treasury-demo`)
- Documentation files (except `README.md`)

---

## Deployment for Other Components

### Oracle API (Separate Deployment)

If you need to deploy the Oracle API separately:

```bash
vercel --prod --config vercel-oracle-api.json
```

This creates a separate deployment for `oracle.excaliburcrypto.com`

### Forge UI (Next.js)

For the Next.js application:

```bash
cd web/forge-ui
vercel --prod
```

---

## Troubleshooting

### If Deployment Still Fails

1. **Clear Vercel Cache:**
   - Go to Project Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Cache"

2. **Check Ignored Files:**
   - Review `.vercelignore` to ensure no critical files are excluded
   - Verify `website/` directory exists with `index.html`

3. **Check Build Logs:**
   - Look for "Error" or "Failed" messages
   - Common issues: missing files, wrong paths in routes

### Common Issues

**Issue:** "No Output Directory"
- **Solution:** Static sites don't need a build step. Vercel serves files directly.

**Issue:** "Module not found" or "Import error"
- **Solution:** Backend code is now excluded. This is intentional for static site deployment.

**Issue:** 404 on routes
- **Solution:** Check `routes` configuration in `vercel.json` matches your file structure

---

## Verification

After deployment, verify these URLs work:

1. `https://your-domain.vercel.app/` → Redirects to website
2. `https://your-domain.vercel.app/website/` → Main landing page
3. `https://your-domain.vercel.app/web/knights-round-table/` → Forge interface

---

## Summary

- ✅ `vercel.json` now deploys static website (not Python API)
- ✅ All backend code excluded via `.vercelignore`
- ✅ Oracle API config preserved in `vercel-oracle-api.json`
- ✅ No build step required (static files only)
- ✅ Deployment should succeed immediately

**Status:** Ready for deployment! 🚀
