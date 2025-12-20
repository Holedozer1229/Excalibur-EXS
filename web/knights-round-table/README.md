# The Knights' Round Table - Public Forge UI

The public interface where Knights prove their worth by forging $EXS through the Ω′ Δ18 Tetra-PoW algorithm.

## 🎯 Purpose

The Knights' Round Table is where anyone can participate in the Excalibur $EXS Protocol by submitting the sacred 13-word Axiom and attempting to draw the sword from the stone.

## 📂 Files

- **index.html** - Main forge interface HTML structure
- **styles.css** - Arthurian-themed styling with sword and stone imagery
- **forge.js** - Mining visualization and forge logic

## 🔑 Features

### 🔮 Axiomatic Entry
- Input field for the 13-word Prophecy Axiom
- Real-time validation of the axiom
- Visual feedback on correct/incorrect entry
- Axiom: `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`

### ⚔️ Draw the Sword
- Interactive sword-in-stone visual element
- "Draw the Sword" button to initiate mining
- Sword animation when mining begins
- Disabled until axiom is verified

### ⚡ Real-Time Mining Visualization
- Progress bar showing completion (0/128 to 128/128 rounds)
- 128-cell grid visualizing each nonlinear round
- Active round highlighting with fire effect
- Completed rounds marked in green
- Mining statistics:
  - Current round counter
  - Hash rate display
  - Difficulty level
  - HPP-1 iteration count

### 🏆 Forge Results
- Success celebration with checkmark
- P2TR (Taproot) address generation
- Reward breakdown:
  - Total reward: 50 $EXS
  - Miner receives: 49.5 $EXS
  - Treasury fee: 0.5 $EXS (1%)
  - Forge fee: 0.0001 BTC
- Block height information
- "Forge Again" button to restart

## 🚀 Usage

### Local Testing
```bash
# Navigate to the Knights' Round Table
cd web/knights-round-table

# Open in browser
python -m http.server 8000

# Access at http://localhost:8000
```

### Production Integration
In production, this UI would connect to:
- Backend mining API (`pkg/miner/tetra_pow_miner.py`)
- Foundry service (`pkg/foundry/exs_foundry.py`)
- Blockchain node for transaction submission
- WebSocket for real-time mining updates

## 📝 How to Forge

1. **Enter the Axiom**: Type or paste the 13-word prophecy
2. **Verify**: Click "Verify Axiom" button
3. **Draw the Sword**: Once verified, click "Draw the Sword"
4. **Watch**: Observe the 128 rounds of Ω′ Δ18 mining
5. **Celebrate**: Receive your $EXS reward to a Taproot address!

## 🎨 Design Philosophy

The interface captures the legendary nature of King Arthur pulling Excalibur from the stone:
- Medieval theme with modern functionality
- Interactive sword-in-stone visual metaphor
- Fire and steel color palette (orange and gold)
- Mystical blue accents for the prophecy elements
- Dramatic animations for key moments

## ⚙️ Technical Details

### Axiom Validation
The axiom is validated client-side for immediate feedback, but should also be validated server-side for security.

### Mining Simulation
The current implementation simulates the mining process for demonstration. In production:
- Mining would run server-side or via WebAssembly
- Real cryptographic operations would be performed
- Valid proofs would be submitted to the blockchain
- Transactions would be broadcast to the network

### Address Generation
P2TR addresses are generated using simplified logic. Production should use:
- Proper Bitcoin cryptographic libraries (e.g., bitcoinjs-lib)
- Secure key derivation
- Hardware wallet integration options

## 🔐 Security Considerations

- Axiom validation should happen server-side
- Never store private keys in the browser
- Use HTTPS in production
- Implement rate limiting to prevent abuse
- Validate all forge submissions on the backend

## 🌐 Browser Compatibility

Tested and working in:
- Chrome/Edge (Chromium) 90+
- Firefox 88+
- Safari 14+

---

*"Whosoever pulls this sword from this stone and anvil shall be rightwise king born of all England"*
