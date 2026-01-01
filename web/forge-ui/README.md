# Excalibur EXS Forge UI

The Arthurian Forge - A Next.js web interface for the Excalibur $EXS protocol.

## 🎯 Features

- **⚔️ Forge Initiation** - Visual 13-word Arthurian axiom display with dual miner control (Tetra-PoW + Dice-Roll)
- **🏛️ Treasury Visualization** - CLTV mini-output tracking with unlock timeline
- **🏰 Vault Generator** - P2TR Taproot vault creation
- **⛏️ Miner Dashboard** - Real-time mining statistics
- **🌐 Network Status** - Live network health monitoring

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_TETRA_POW_URL=http://localhost:8082
NEXT_PUBLIC_DICE_ROLL_URL=http://localhost:8083
NEXT_PUBLIC_TREASURY_URL=http://localhost:8080
NEXT_PUBLIC_ROSETTA_URL=http://localhost:8081
NEXT_PUBLIC_GUARDIAN_URL=http://localhost:8084
```

## 📦 Technology Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Deployment:** Vercel

## 🔧 Project Structure

```
forge-ui/
├── app/
│   ├── page.tsx          # Main page with navigation
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── VaultGenerator.tsx
│   ├── MinerDashboard.tsx
│   └── NetworkStatus.tsx
└── src/
    ├── components/
    │   ├── ForgeInitiation.tsx      # Arthurian axiom + mining
    │   └── TreasuryVisualization.tsx # CLTV timeline
    ├── hooks/
    │   ├── useMiningEngine.ts
    │   ├── useTreasury.ts
    │   └── useLancelotGuardian.ts
    └── services/
        ├── minerService.ts
        ├── rosettaService.ts
        └── lancelotService.ts
```

## 🎨 Components

### ForgeInitiation
Displays the Arthurian 13-word prophecy axiom and provides mining controls.

**Features:**
- Visual axiom grid (sword, legend, pull, magic, kingdom, artist, stone, destroy, forget, fire, steel, honey, question)
- Miner selection (Tetra-PoW vs Dice-Roll)
- Mining results with P2TR vault addresses
- Real-time statistics

### TreasuryVisualization
Shows treasury balance breakdown and CLTV unlock timeline.

**Features:**
- Balance breakdown (total, spendable, locked)
- Upcoming CLTV unlocks with countdown
- Mini-output grid (2.5 EXS each)
- Block height tracking

## 🔐 Security

- Arthurian axiom **displayed visually only** (never transmitted raw)
- All crypto operations use **SHA-256 hashed axiom**
- HTTPS-only in production
- Security headers enabled

## 📱 Responsive Design

Fully responsive across:
- Desktop (1920px+)
- Laptop (1366px)
- Tablet (768px)
- Mobile (375px)

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build test
npm run build
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

See [VERCEL_DEPLOYMENT.md](../../docs/VERCEL_DEPLOYMENT.md) for detailed instructions.

### Docker

```bash
docker build -t forge-ui .
docker run -p 3000:3000 forge-ui
```

## 🔗 API Integration

The Forge UI integrates with:

- **Tetra-PoW Miner** (`:8082`) - Go-based quantum-hardened miner
- **Dice-Roll Miner** (`:8083`) - Python-based probabilistic miner
- **Treasury API** (`:8080`) - CLTV mini-output management
- **Rosetta API** (`:8081`) - Blockchain state and transactions
- **Lancelot Guardian** (`:8084`) - Network monitoring and alerts

## 📄 License

BSD 3-Clause License

---

**⚔️ The Arthurian Forge - Quantum-Hardened | Tetra-PoW | CLTV Mini-Outputs**

