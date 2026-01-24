# Excalibur $EXS - Vercel Deployment Guide

Deploy the Excalibur $EXS website to Vercel for instant global CDN hosting.

## Quick Deploy (1 Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)

## Manual Deployment

### Prerequisites

- Vercel account (free): https://vercel.com/signup
- Vercel CLI: `npm install -g vercel`

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

```bash
# From repository root
cd /path/to/Excalibur-EXS

# Deploy to production
vercel --prod
```

### Step 4: Configure Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `www.excaliburcrypto.com`
3. Configure DNS at your registrar:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (5-30 minutes)

## Configuration

### Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

```
DOMAIN=www.excaliburcrypto.com
```

### Custom Routes

Already configured in `vercel.json`:
- `/` → Main website
- `/web/knights-round-table/` → Knights' Portal
- `/admin/merlins-portal/` → Merlin's Sanctum

### Security Headers

Pre-configured in `vercel.json`:
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

## Continuous Deployment

Vercel automatically deploys on every push to GitHub:

1. Connect repository in Vercel Dashboard
2. Select branch (main)
3. Every commit triggers new deployment

### Branch Previews

- `main` branch → Production (www.excaliburcrypto.com)
- Other branches → Preview URLs automatically

## API Integration

For backend services (Treasury, Forge), use Vercel Serverless Functions:

### Create API Functions

```javascript
// api/treasury.js
export default async function handler(req, res) {
  // Call external Treasury API or implement logic
  res.status(200).json({ status: 'active' });
}

// api/forge.js
export default async function handler(req, res) {
  // Call external Forge API or implement logic
  res.status(200).json({ status: 'ready' });
}
```

Add to `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/treasury/(.*)", "destination": "/api/treasury" },
    { "source": "/api/forge/(.*)", "destination": "/api/forge" }
  ]
}
```

## Monitoring

### Analytics

Enable in Vercel Dashboard → Analytics (free):
- Page views
- Unique visitors
- Performance metrics
- Web Vitals

### Logs

View deployment logs:

```bash
vercel logs
```

Or in Dashboard → Deployments → Select deployment → Logs

## Limitations

### Static Site Only

Vercel deployment serves static files. For full backend:

1. **Option A**: Use Vercel Serverless Functions
2. **Option B**: Deploy backend separately (Docker, AWS, etc.)
3. **Option C**: Use Vercel + external API endpoints

### Admin Portal Authentication

For Basic Auth on `/admin/`, use middleware:

```javascript
// middleware.js
export function middleware(request) {
  const authHeader = request.headers.get('authorization');
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!authHeader || !isValidAuth(authHeader)) {
      return new Response('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Merlin\'s Sanctum"'
        }
      });
    }
  }
}
```

## Cost

- **Free Tier**:
  - 100 GB bandwidth/month
  - Unlimited deployments
  - SSL included
  - 1 concurrent build

- **Pro Tier** ($20/month):
  - 1 TB bandwidth
  - 24 concurrent builds
  - Advanced analytics
  - Team collaboration

## Custom Domain SSL

SSL certificates are automatically provisioned and renewed by Vercel.

## Rollback

Roll back to previous deployment:

```bash
# List deployments
vercel ls

# Promote deployment to production
vercel promote <deployment-url>
```

Or use Dashboard → Deployments → Select → Promote to Production

## Support

- Vercel Documentation: https://vercel.com/docs
- Email: holedozer@icloud.com
- Repository: https://github.com/Holedozer1229/Excalibur-EXS

## Alternative: GitHub Pages

For a completely free option, see `GITHUB_PAGES_DEPLOY.md`.
