# Excalibur $EXS Protocol - Quick Start Guide

Welcome to the Excalibur $EXS Protocol! This guide will help you get up and running quickly.

## 🚀 For Users (Knights)

### Accessing the Forge

1. **Visit the Website**
   - Go to: `https://www.excaliburcrypto.com` (or your deployed URL)
   - Navigate to the Knights' Round Table

2. **Enter the Axiom**
   - The 13-word prophecy: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`
   - Click "Verify Axiom" or "Draw the Sword"

3. **Watch the Mining Process**
   - Observe the 128 nonlinear rounds
   - Watch your hash rate and progress
   - Receive your 50 $EXS reward upon success

### Mobile App (iOS/Android)

1. **Install the App**
   - iOS: Download from App Store (coming soon)
   - Android: Download from Google Play (coming soon)

2. **Complete the Axiom Gate**
   - Enter the 13 words to unlock the app
   - Access all features from your mobile device

## 🔧 For Developers

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Install Go dependencies
go mod download

# Build the miner
cd cmd/miner
go build
./miner --help

# Build Rosetta API
cd ../rosetta
go build
./rosetta --help

# Run the website locally
cd ../../website
python3 -m http.server 8000
# Visit: http://localhost:8000

# Run Knights' Round Table
cd ../web/knights-round-table
npm run serve
# Visit: http://localhost:3000

# Run mobile app (requires React Native setup)
cd ../../mobile-app
npm install
npm run ios    # or npm run android
```

### Running Tests

```bash
# Run Go tests
go test ./pkg/... -v

# Run integration tests
./test.sh

# Validate deployment readiness
./scripts/validate-deployment.sh
```

## 🏗️ For Administrators

### Setting Up the Admin Portal

1. **Configure Authentication**
   - In production, implement proper server-side authentication
   - Currently uses client-side demo auth (first word of axiom: "sword")

2. **Access Merlin's Portal**
   - Navigate to `/admin/merlins-portal/`
   - Enter authentication key
   - Monitor treasury, adjust difficulty, view anomaly map

3. **Key Features**
   - Treasury balance monitoring
   - Forge difficulty adjustment
   - Global anomaly map (active forges)
   - Access logs and analytics

## 📦 Deployment Options

### 1. Docker (Recommended for Production)

```bash
# Copy environment template
cp .env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Vercel (Easiest for Web Hosting)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configure custom domain in dashboard
```

### 3. GitHub Pages (Free Static Hosting)

```bash
# Enable GitHub Pages in repository settings
# Select source: gh-pages branch
# Configure custom domain if needed

# GitHub Actions will auto-deploy on push
```

### 4. Traditional VPS

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Run deployment script
sudo ./scripts/deploy.sh

# Set up SSL
sudo ./scripts/setup-ssl.sh
```

## 🔑 The 13-Word Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

**Important:** This axiom is required to:
- Access the Knights' Round Table
- Start the mining process
- Unlock the mobile app
- Access admin features

## 📱 Key Features

### For Users
- **Public Forge UI**: Mine $EXS tokens through the web interface
- **Mobile App**: Access the forge from iOS/Android devices
- **128-Round Visualization**: Watch the Tetra-PoW algorithm in action
- **P2TR Addresses**: Receive rewards to Taproot addresses

### For Developers
- **Go Miner**: Command-line Ω′ Δ18 Tetra-PoW miner
- **Rosetta API**: Exchange integration (Coinbase compatible)
- **Python Miners**: Alternative mining implementations
- **Open Source**: Full transparency and community contributions

### For Administrators
- **Treasury Monitoring**: Real-time balance tracking
- **Difficulty Control**: Adjust mining difficulty
- **Analytics Dashboard**: Forge success rates, user activity
- **Security**: Multi-layer authentication and logging

## 🔐 Security Notes

⚠️ **Current Implementation**: Demonstration/prototype only

**Before Production:**
1. Implement server-side axiom validation
2. Add proper authentication for admin portal
3. Set up rate limiting and DDoS protection
4. Integrate with real blockchain node
5. Complete security audit
6. Test on Bitcoin testnet for 30+ days

See `PRODUCTION_TODO.md` for complete checklist.

## 📚 Documentation

- **README.md**: Full protocol overview
- **SETUP.md**: Detailed setup instructions
- **DEPLOY.md**: Deployment guide
- **DEPLOYMENT_CHECKLIST.md**: Pre-deployment checklist
- **PRODUCTION_TODO.md**: Production readiness items
- **CONTRIBUTING.md**: How to contribute

## 🆘 Troubleshooting

### Common Issues

**Issue: Can't access the website**
- Check if server is running
- Verify firewall rules allow ports 80/443
- Check DNS configuration

**Issue: Axiom not accepted**
- Ensure exact 13-word sequence (lowercase)
- Check for typos or extra spaces
- Use: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`

**Issue: Mining visualization doesn't start**
- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page

**Issue: Mobile app won't build**
- Ensure Node.js 18+ is installed
- Run `npm install` in mobile-app directory
- For iOS: `cd ios && pod install`
- Check React Native documentation for platform-specific issues

## 💬 Support

- **Lead Architect**: Travis D Jones
- **Email**: holedozer@gmail.com
- **GitHub Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS

## 📜 License

BSD 3-Clause License - See [LICENSE](LICENSE) for details

---

**Ready to forge?** Head to the Knights' Round Table and speak the XIII words! ⚔️

*"In ambiguity, we find certainty. In chaos, we forge order."*
