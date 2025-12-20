# Arthurian Forge UI

The React/TypeScript web interface for Excalibur-ESX.

## Features

- 🏰 **Vault Generator**: Create Taproot vaults using the 13-word prophecy axiom
- ⛏️ **Miner Dashboard**: Monitor and control Tetra-PoW mining operations
- 🌐 **Network Status**: Real-time blockchain statistics and Rosetta API health

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React 18** - Latest React features

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
forge-ui/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/
│   ├── VaultGenerator.tsx
│   ├── MinerDashboard.tsx
│   └── NetworkStatus.tsx
├── lib/                # Utility functions
└── public/             # Static assets
```

## Features Detail

### Vault Generator

Generate unique Taproot addresses using:
- 13-word prophecy axiom input
- Network selection (mainnet/testnet)
- Bech32m address generation
- Privacy-preserving vault creation

### Miner Dashboard

Control mining operations:
- Configure mining data and difficulty
- Start/stop mining
- View mining results and hash rates
- Monitor Tetra-PoW performance

### Network Status

Monitor the blockchain:
- Current block height
- Network hash rate
- Connected peers
- Rosetta API health check
- Protocol information

## API Integration

The UI connects to:
- Rosetta API server (http://localhost:8080)
- Mining backend for Tetra-PoW operations

## Styling

Custom Tailwind utilities:
- `.glow` - Text glow effect
- `.card-glow` - Card shadow effect
- Gradient backgrounds
- Purple/slate color scheme

## License

MIT
