# Excalibur EXS - Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel
- Node.js 18+ for local development

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS)

### Manual Deployment Steps

#### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

#### 2. Link Your Project

```bash
cd /path/to/Excalibur-EXS
vercel
```

Follow the prompts to link your project to Vercel.

#### 3. Configure Environment Variables

In your Vercel Dashboard, go to **Settings > Environment Variables** and add:

**Production Environment Variables:**

```
NEXT_PUBLIC_TETRA_POW_URL=https://tetra-pow.excaliburcrypto.com
NEXT_PUBLIC_DICE_ROLL_URL=https://dice-roll.excaliburcrypto.com
NEXT_PUBLIC_TREASURY_URL=https://treasury.excaliburcrypto.com
NEXT_PUBLIC_ROSETTA_URL=https://rosetta.excaliburcrypto.com
NEXT_PUBLIC_GUARDIAN_URL=https://guardian.excaliburcrypto.com
```

**Development Environment Variables:**

```
NEXT_PUBLIC_TETRA_POW_URL=http://localhost:8082
NEXT_PUBLIC_DICE_ROLL_URL=http://localhost:8083
NEXT_PUBLIC_TREASURY_URL=http://localhost:8080
NEXT_PUBLIC_ROSETTA_URL=http://localhost:8081
NEXT_PUBLIC_GUARDIAN_URL=http://localhost:8084
```

#### 4. Deploy

```bash
vercel --prod
```

## 📁 Project Structure for Vercel

```
Excalibur-EXS/
├── vercel.json                  # Root Vercel configuration
├── web/
│   └── forge-ui/
│       ├── vercel.json          # Forge UI Vercel config
│       ├── package.json         # Dependencies with axios
│       ├── next.config.js       # Next.js configuration
│       ├── .env.example         # Environment variable template
│       ├── app/
│       │   ├── page.tsx         # Main page with all tabs
│       │   ├── layout.tsx       # Root layout
│       │   └── globals.css      # Global styles
│       ├── components/
│       │   ├── VaultGenerator.tsx
│       │   ├── MinerDashboard.tsx
│       │   └── NetworkStatus.tsx
│       └── src/
│           ├── components/
│           │   ├── ForgeInitiation.tsx      # Arthurian axiom display
│           │   └── TreasuryVisualization.tsx # CLTV timeline
│           ├── hooks/
│           │   ├── useMiningEngine.ts
│           │   ├── useTreasury.ts
│           │   └── useLancelotGuardian.ts
│           └── services/
│               ├── minerService.ts
│               ├── rosettaService.ts
│               └── lancelotService.ts
├── website/                     # Static landing page
└── admin/                       # Admin portal
```

## 🔧 Build Configuration

### Next.js App (Forge UI)

The Forge UI is built with Next.js 14 and includes:

- ✅ **ForgeInitiation** - Visual 13-word Arthurian axiom display
- ✅ **TreasuryVisualization** - CLTV mini-output tracking
- ✅ **VaultGenerator** - P2TR vault creation
- ✅ **MinerDashboard** - Mining statistics
- ✅ **NetworkStatus** - Network health

**Build Command:**
```bash
cd web/forge-ui && npm install && npm run build
```

**Output Directory:**
```
web/forge-ui/.next
```

**Framework:**
```
nextjs
```

## 🌐 Domain Configuration

### Custom Domain Setup

1. Go to Vercel Dashboard > Your Project > Settings > Domains
2. Add your custom domain: `www.excaliburcrypto.com`
3. Configure DNS records as shown by Vercel
4. Enable HTTPS (automatic with Vercel)

### Recommended Domains

- **Main App:** `www.excaliburcrypto.com` or `app.excaliburcrypto.com`
- **API Endpoints:** 
  - `treasury.excaliburcrypto.com`
  - `rosetta.excaliburcrypto.com`
  - `tetra-pow.excaliburcrypto.com`
  - `dice-roll.excaliburcrypto.com`
  - `guardian.excaliburcrypto.com`

## 🔒 Security Headers

The following security headers are automatically applied:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

## 🧪 Testing the Deployment

### Local Testing

```bash
cd web/forge-ui
npm install
npm run dev
```

Visit: http://localhost:3000

### Preview Deployments

Every push to a branch creates a preview deployment:
```
https://excalibur-exs-[branch]-holedozer1229.vercel.app
```

### Production Testing

After deployment, test these pages:

- ✅ Main Page: https://www.excaliburcrypto.com
- ✅ Forge Initiation: Click "⚔️ Forge Initiation" tab
- ✅ Treasury: Click "🏛️ Treasury" tab
- ✅ Vault Generator: Click "🏰 Vault Generator" tab
- ✅ Miner: Click "⛏️ Miner" tab
- ✅ Network: Click "🌐 Network" tab

## 📊 Features Deployed

### ⚔️ Forge Initiation
- Visual display of Arthurian 13-word axiom
- Miner selection (Tetra-PoW vs Dice-Roll)
- Real-time mining execution
- P2TR vault address display

### 🏛️ Treasury Visualization
- Total, spendable, and locked balances
- CLTV unlock timeline with countdown
- Mini-output grid (2.5 EXS each)
- Block height tracking

### 🏰 Vault Generator
- P2TR Taproot vault creation
- 13-word prophecy integration
- Bech32m address generation

### ⛏️ Miner Dashboard
- Mining statistics
- Hashrate monitoring
- Block discovery tracking

### 🌐 Network Status
- Network health monitoring
- Guardian alerts
- Service status indicators

## 🐛 Troubleshooting

### Build Failures

**Issue:** Missing dependencies
```bash
cd web/forge-ui
npm install
```

**Issue:** TypeScript errors
```bash
npm run type-check
```

**Issue:** Environment variables not loading
- Check Vercel Dashboard > Settings > Environment Variables
- Ensure variables start with `NEXT_PUBLIC_` for client-side access

### API Connection Issues

**Issue:** CORS errors
- Ensure API endpoints support CORS
- Add API domains to CORS whitelist

**Issue:** 404 on API calls
- Verify environment variables are set correctly
- Check API endpoints are deployed and accessible

### Runtime Errors

**Issue:** Hydration errors
- Ensure all components use `'use client'` directive when needed
- Check for server/client mismatches

## 📝 Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel Dashboard
- [ ] Custom domain configured and DNS propagated
- [ ] API endpoints deployed and accessible
- [ ] Security headers verified
- [ ] SSL certificate active (automatic with Vercel)
- [ ] All tabs tested (Forge, Treasury, Vault, Miner, Network)
- [ ] Mobile responsiveness verified
- [ ] Performance optimized (Lighthouse score >90)

## 🔄 Continuous Deployment

Vercel automatically deploys:

- **Production:** Pushes to `main` branch
- **Preview:** Pushes to any other branch
- **Pull Requests:** Automatic preview deployments

### GitHub Integration

1. Connect repository to Vercel
2. Configure build settings (already in `vercel.json`)
3. Push to `main` for production deployment

## 📞 Support

- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **EXS Repository:** https://github.com/Holedozer1229/Excalibur-EXS

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Website loads at custom domain
2. ✅ All 5 tabs functional (Forge, Treasury, Vault, Miner, Network)
3. ✅ Arthurian 13-word axiom displays correctly
4. ✅ Treasury CLTV timeline shows mini-outputs
5. ✅ No console errors
6. ✅ Mobile responsive
7. ✅ HTTPS enabled
8. ✅ Security headers active

---

**⚔️ "Whosoever pulls this sword from this stone shall be rightwise king born of all England."**

Deploy the Arthurian Forge! 🗡️
