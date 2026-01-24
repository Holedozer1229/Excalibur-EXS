# Vercel Deployment Guide - Excalibur EXS

## Overview

This guide provides comprehensive instructions for deploying the Excalibur-EXS project to Vercel. The project consists of multiple components that can be deployed separately or together.

---

## Deployment Options

### Option 1: Main Website (Recommended for Landing Page)

Deploy the static marketing website with automatic redirects.

**Configuration File:** `vercel-website.json`

#### Features:
- Static HTML/CSS/JS website
- Optimized asset caching
- Security headers
- Clean URLs
- Professional landing page

#### Deploy Command:
```bash
# Using Vercel CLI
vercel --prod --config vercel-website.json

# Or via Vercel Dashboard
# 1. Import repository
# 2. Select vercel-website.json as config
# 3. Deploy
```

#### Domain Setup:
- **Production:** www.excaliburcrypto.com
- **Preview:** excalibur-exs-*.vercel.app

---

### Option 2: Oracle API Service

Deploy the Python-based Oracle API for backend services.

**Configuration File:** `vercel.json` (root)

#### Features:
- Python Flask/FastAPI backend
- Oracle query endpoint
- CORS enabled
- API key authentication
- 50MB Lambda size limit

#### Deploy Command:
```bash
vercel --prod
```

#### Endpoints:
- `POST /api/oracle/query` - Query the oracle
- `GET /api/oracle/status` - Check service status
- `POST /api/oracle/prophecy` - Validate prophecy

---

### Option 3: Forge UI (Next.js Application)

Deploy the React/Next.js forge interface.

**Configuration File:** `web/forge-ui/vercel.json`

#### Features:
- Next.js 13+ with App Router
- TypeScript support
- Tailwind CSS
- Real-time forge monitoring
- Wallet integration

#### Deploy Command:
```bash
cd web/forge-ui
vercel --prod
```

#### Environment Variables Required:
```
NEXT_PUBLIC_TETRA_POW_URL=https://tetrapow.excaliburcrypto.com
NEXT_PUBLIC_DICE_ROLL_URL=https://diceroll.excaliburcrypto.com
NEXT_PUBLIC_TREASURY_URL=https://treasury.excaliburcrypto.com
NEXT_PUBLIC_ROSETTA_URL=https://rosetta.excaliburcrypto.com
NEXT_PUBLIC_GUARDIAN_URL=https://guardian.excaliburcrypto.com
NEXT_PUBLIC_NETWORK=mainnet
```

---

## Step-by-Step Deployment

### Prerequisites

1. **Vercel Account**
   - Sign up at https://vercel.com
   - Install Vercel CLI: `npm i -g vercel`

2. **GitHub Integration**
   - Connect your GitHub account to Vercel
   - Enable automatic deployments

3. **Domain Configuration** (Optional)
   - Add custom domain in Vercel dashboard
   - Update DNS records at your registrar

---

### Deploying Main Website

#### Step 1: Prepare Environment
```bash
cd /path/to/Excalibur-EXS
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy
```bash
# Preview deployment
vercel --config vercel-website.json

# Production deployment
vercel --prod --config vercel-website.json
```

#### Step 4: Verify Deployment
1. Visit the provided URL
2. Check all pages load correctly
3. Verify asset loading (CSS, JS, images)
4. Test navigation and links

---

### Deploying Oracle API

#### Step 1: Check Dependencies
```bash
# Ensure requirements.txt is up to date
cat requirements.txt

# Should include:
# Flask==2.3.0
# flask-cors==4.0.0
# Or your API framework
```

#### Step 2: Test Locally
```bash
# Test the Oracle API
cd cmd/oracle-api
python3 app.py

# Should start on http://localhost:5000
```

#### Step 3: Deploy to Vercel
```bash
cd /path/to/Excalibur-EXS
vercel --prod
```

#### Step 4: Set Environment Variables
```bash
# Via CLI
vercel env add DOMAIN production

# Or via Vercel Dashboard
# Project Settings > Environment Variables
```

---

### Deploying Forge UI

#### Step 1: Install Dependencies
```bash
cd web/forge-ui
npm install
```

#### Step 2: Build Locally (Test)
```bash
npm run build
npm start
```

#### Step 3: Configure Environment
Create `.env.production`:
```
NEXT_PUBLIC_TETRA_POW_URL=https://tetrapow.excaliburcrypto.com
NEXT_PUBLIC_DICE_ROLL_URL=https://diceroll.excaliburcrypto.com
NEXT_PUBLIC_TREASURY_URL=https://treasury.excaliburcrypto.com
NEXT_PUBLIC_ROSETTA_URL=https://rosetta.excaliburcrypto.com
NEXT_PUBLIC_GUARDIAN_URL=https://guardian.excaliburcrypto.com
NEXT_PUBLIC_NETWORK=mainnet
```

#### Step 4: Deploy
```bash
vercel --prod
```

---

## Domain Configuration

### Using Custom Domain

#### Step 1: Add Domain in Vercel
1. Go to Project Settings
2. Click "Domains"
3. Add your domain (e.g., www.excaliburcrypto.com)

#### Step 2: Configure DNS
Add these records at your DNS provider (e.g., Hostinger):

```
# Main website
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# Root domain redirect
Type: A
Name: @
Value: 76.76.21.21

# Oracle API subdomain
Type: CNAME
Name: oracle
Value: cname.vercel-dns.com

# Forge UI subdomain
Type: CNAME
Name: forge
Value: cname.vercel-dns.com
```

#### Step 3: Verify SSL
- Vercel automatically provisions SSL certificates
- Wait 24-48 hours for DNS propagation
- Check HTTPS access

---

## Multi-Project Setup

Deploy multiple services under one domain:

### Project Structure:
```
www.excaliburcrypto.com         → Main Website
oracle.excaliburcrypto.com      → Oracle API
forge.excaliburcrypto.com       → Forge UI
api.excaliburcrypto.com         → General API
```

### Configuration:

#### Main Website
```json
{
  "name": "excalibur-website",
  "alias": ["www.excaliburcrypto.com", "excaliburcrypto.com"]
}
```

#### Oracle API
```json
{
  "name": "excalibur-oracle",
  "alias": ["oracle.excaliburcrypto.com"]
}
```

#### Forge UI
```json
{
  "name": "excalibur-forge",
  "alias": ["forge.excaliburcrypto.com"]
}
```

---

## CI/CD with GitHub

### Automatic Deployments

#### Step 1: Connect GitHub
1. Go to Vercel Dashboard
2. Import your GitHub repository
3. Select the branch (e.g., `main`)

#### Step 2: Configure Build Settings

**Website:**
- Build Command: (none, static files)
- Output Directory: `website`
- Install Command: (none)

**Forge UI:**
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Oracle API:**
- Build Command: (none)
- Output Directory: (auto-detected)
- Install Command: `pip install -r requirements.txt`

#### Step 3: Set Environment Variables
Go to Project Settings > Environment Variables and add:
- Production variables
- Preview variables
- Development variables

### Deployment Triggers:
- ✅ Push to `main` → Production deployment
- ✅ Push to any branch → Preview deployment
- ✅ Pull request → Preview deployment with URL

---

## Performance Optimization

### Caching Strategy

**Static Assets:**
```json
{
  "headers": [
    {
      "source": "/website/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**HTML Pages:**
```json
{
  "headers": [
    {
      "source": "/website/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, s-maxage=31536000"
        }
      ]
    }
  ]
}
```

### Edge Functions

For dynamic content, use Vercel Edge Functions:

```typescript
// api/hello.ts
export const config = {
  runtime: 'edge',
};

export default function handler(req: Request) {
  return new Response(JSON.stringify({ message: 'Hello from the Edge!' }), {
    headers: { 'content-type': 'application/json' },
  });
}
```

---

## Security Best Practices

### Headers Configuration

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Environment Variables
- Never commit secrets to Git
- Use Vercel's encrypted environment variables
- Rotate API keys regularly
- Use different keys for production and preview

### Rate Limiting
Implement rate limiting for API endpoints:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

@app.route("/api/oracle/query")
@limiter.limit("10 per minute")
def query():
    # Handle request
    pass
```

---

## Monitoring & Analytics

### Vercel Analytics
Enable in Project Settings:
- Real User Monitoring (RUM)
- Web Vitals tracking
- Performance insights

### Custom Monitoring
```typescript
// Send custom events
import { sendAnalytics } from '@vercel/analytics';

sendAnalytics({
  name: 'forge_initiated',
  data: {
    prophecy: '13-word-axiom',
    timestamp: Date.now()
  }
});
```

### Error Tracking
```typescript
// pages/_error.tsx
import * as Sentry from '@sentry/nextjs';

export default function Error({ statusCode }: { statusCode: number }) {
  Sentry.captureException(new Error(`Error ${statusCode}`));
  return <p>An error occurred: {statusCode}</p>;
}
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails
```
Error: Module not found
```
**Solution:** Check `package.json` dependencies and run `npm install`

#### 2. Environment Variables Not Working
```
Error: undefined is not an object
```
**Solution:** Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access

#### 3. 404 on Dynamic Routes
**Solution:** Add proper rewrites in `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/forge/:path*",
      "destination": "/forge"
    }
  ]
}
```

#### 4. CORS Errors
**Solution:** Add CORS headers in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

---

## Cost Estimation

### Vercel Pricing (as of 2024)

**Hobby Plan (Free):**
- 100 GB bandwidth/month
- 1000 serverless function invocations/day
- Unlimited preview deployments

**Pro Plan ($20/month):**
- 1 TB bandwidth/month
- 100,000 serverless function invocations/day
- Analytics included
- Custom domains

**Enterprise:**
- Custom pricing
- Dedicated support
- SLA guarantees

**Estimated Usage (Excalibur-EXS):**
- Website: ~50 GB/month bandwidth
- Oracle API: ~10,000 invocations/day
- Forge UI: ~30 GB/month bandwidth

**Recommendation:** Pro Plan for production

---

## Rollback Procedure

### Rollback to Previous Deployment

```bash
# List deployments
vercel ls

# Promote a specific deployment
vercel promote [deployment-url]

# Or via Dashboard
# Deployments > Select deployment > Promote to Production
```

### Instant Rollback
```bash
# Alias previous deployment
vercel alias set [old-deployment-url] www.excaliburcrypto.com
```

---

## Testing Checklist

Before deploying to production:

- [ ] All pages load correctly
- [ ] Assets (CSS, JS, images) load properly
- [ ] Navigation works on all pages
- [ ] Forms submit successfully
- [ ] API endpoints respond correctly
- [ ] Mobile responsive design works
- [ ] HTTPS enabled
- [ ] Custom domain configured
- [ ] Analytics tracking works
- [ ] Error pages display correctly
- [ ] Performance metrics are acceptable
- [ ] Security headers are set

---

## Support & Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vercel CLI:** https://vercel.com/docs/cli
- **Next.js Docs:** https://nextjs.org/docs
- **GitHub Repository:** https://github.com/Holedozer1229/Excalibur-EXS
- **Support Email:** holedozer@icloud.com

---

## Deployment Complete

Your Excalibur-EXS project is now live on Vercel! 🎉

**Next Steps:**
1. Monitor deployment performance
2. Set up custom domain
3. Configure analytics
4. Test all functionality
5. Share with users

For issues or questions, contact the development team or refer to the documentation.
