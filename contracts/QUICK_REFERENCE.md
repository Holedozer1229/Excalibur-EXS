# Dynamic Difficulty Adjustment System - Quick Reference

## 🎯 The "Sword in the Stone" Mechanics

A three-layer difficulty system that makes early forges valuable and later forges prestigious.

## 📊 Visual Fee Progression

```
Starting Point: 0.1 BTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge #1-100 (Genesis Era)
├─ Fee: 0.100 BTC fixed
├─ Cap: 0.11 BTC
└─ Psychology: "Stable entry for true believers"

Forge #101-1,000 (Founder Era)  
├─ Fee: 0.100 - 0.103 BTC
├─ Cap: 0.11 BTC
├─ Founder Discount: 25% (first 10), 10% (forever)
└─ Psychology: "Get in while it's accessible"

Forge #1,001-10,000 (Knighting Era)
├─ Fee: 0.110 - 0.250 BTC
├─ Cap: 0.25 BTC
├─ Base: +10% every 2,016 forges
├─ Demand: Up to 2.0x multiplier
└─ Psychology: "Early adopters rewarded"

Forge #10,001-50,000 (Royal Era)
├─ Fee: 0.250 - 1.0 BTC
├─ Cap: 1.0 BTC
├─ All layers active
└─ Psychology: "You made it, now prove it"

Forge #50,001+ (Legendary Era)
├─ Fee: 1.0 - 21.0 BTC
├─ Cap: 21 BTC (Bitcoin homage)
└─ Psychology: "True legends only"
```

## 🔧 Three-Layer Calculation

### Layer 1: Base Difficulty (Block-based)
```
Every 2,016 forges (Bitcoin's difficulty adjustment period)
Base Fee = 0.1 BTC × (1.1 ^ (forgeCount / 2,016))

Examples:
Forge 0:      0.100 BTC
Forge 2,016:  0.110 BTC (+10%)
Forge 4,032:  0.121 BTC (+10%)
Forge 10,080: 0.161 BTC (5 eras)
```

### Layer 2: Demand Multiplier
```
Target: 500 forges/week
Formula: 
- At or below target: 1.0x
- Above target: 1.0x + ((excess / 10) × 0.02)
- Maximum: 2.0x

Examples:
400/week: 1.00x (below target)
500/week: 1.00x (at target)
600/week: 1.04x (20% over)
750/week: 1.10x (50% over)
1000/week: 1.20x (100% over, capped at 2.0x)
```

### Layer 3: Time Appreciation
```
Compounds 1% per month
Formula: (1.01 ^ months)

Examples:
Month 0:  1.00x
Month 1:  1.01x
Month 6:  1.0615x
Month 12: 1.1268x (≈12.68% annual)
Month 24: 1.2697x
```

### Layer 4: BTC Price Normalization (Optional)
```
Target: $50,000 BTC
Formula: ($50,000 / current_price) × fee
Range: 0.5x - 2.0x

Examples:
BTC at $50k:  1.0x (no change)
BTC at $100k: 0.5x (fee halves)
BTC at $25k:  2.0x (fee doubles)
```

## 🏆 Founder Advantages

### Discount Schedule
```
First 10 Forges:  25% discount
├─ 0.1 BTC becomes 0.075 BTC
└─ Maximum savings: 0.25 BTC total

After 10 Forges:  10% permanent discount
├─ 0.1 BTC becomes 0.09 BTC
└─ Lifetime benefit!

Example:
Non-founder pays: 0.150 BTC
Founder pays:     0.135 BTC (10% off)
Lifetime savings: ~0.015 BTC per forge
```

### Demand Shield
```
First 100 Forges: Immune to demand multiplier
├─ During high demand (1.5x):
│  ├─ Non-founder: 0.15 BTC
│  └─ Founder: 0.09 BTC (shield + discount)
└─ Saves up to 50% during spikes!

After 100 Forges: Full system applies
└─ But you still keep 10% discount
```

## 📈 Real-World Examples

### Example 1: Early Founder (Your First Forge)
```
🎯 Forge #100, Day 15, 400 forges/week, BTC=$50k

Layer 1 (Base):      0.100 BTC
Layer 2 (Demand):    × 1.00 (below target)
Layer 3 (Time):      × 1.00 (first month)
Layer 4 (BTC):       × 1.00 (at target price)
──────────────────────────────────────────
Subtotal:            0.100 BTC
Founder Discount:    -25% (-0.025 BTC)
──────────────────────────────────────────
FINAL FEE:           0.075 BTC 💰
```

### Example 2: Regular User (Mid-Game)
```
🎯 Forge #5,000, Day 180, 600 forges/week, BTC=$60k

Layer 1 (Base):      0.121 BTC (2 eras)
Layer 2 (Demand):    × 1.04 (20% over target)
Layer 3 (Time):      × 1.0615 (6 months)
Layer 4 (BTC):       × 0.83 (BTC expensive)
──────────────────────────────────────────
Calculation:         0.121 × 1.04 × 1.0615 × 0.83
Subtotal:            0.111 BTC
Knighting Cap:       min(0.111, 0.25) = 0.111 BTC
──────────────────────────────────────────
FINAL FEE:           0.111 BTC
```

### Example 3: Late Adopter (End Game)
```
🎯 Forge #25,000, Day 365, 750 forges/week, BTC=$50k

Layer 1 (Base):      0.314 BTC (12 eras)
Layer 2 (Demand):    × 1.10 (50% over target)
Layer 3 (Time):      × 1.1268 (12 months)
Layer 4 (BTC):       × 1.00 (at target)
──────────────────────────────────────────
Calculation:         0.314 × 1.10 × 1.1268 × 1.00
Subtotal:            0.389 BTC
Royal Era Cap:       min(0.389, 1.0) = 0.389 BTC
──────────────────────────────────────────
FINAL FEE:           0.389 BTC
```

## 🚨 Anti-Abuse Mechanisms

### Rate Limiting
```
Maximum: 3 forges per address per 24 hours
├─ Prevents address spam
└─ Encourages organic growth
```

### Cooldown Penalties
```
< 1 hour since last forge:   +50% penalty
< 1 day since last forge:    +10% penalty
≥ 1 day since last forge:    No penalty

Example:
Base fee: 0.1 BTC
Forge within 1 hour: 0.15 BTC
Forge within 1 day:  0.11 BTC
Forge after 1 day:   0.1 BTC
```

## 🎮 Dashboard Display Example

```
╔══════════════════════════════════════════════════╗
║         CURRENT FORGE FEE                        ║
║                                                  ║
║                 0.127 BTC                        ║
║                ($7,620 USD)                      ║
╚══════════════════════════════════════════════════╝

📊 Fee Breakdown:
├── Base Fee:          0.110 BTC (Era 2)
├── Time Factor:       +2% (2 months)
├── Demand Tax:        +15% (high velocity)
└── Founder Discount:  -10% (you're a founder!)

📈 Next Adjustments:
• In 483 forges:  +10% (Era milestone)
• In 3 days:      +1% (monthly appreciation)
• Velocity:       High (normalize in 2 days)

🏆 Your Founder Advantages:
✓ 10% permanent discount
✓ Demand shield expired (100+ forges)
✓ Priority festival access
✓ Total saved: 2.45 BTC lifetime

📊 System Statistics:
• Total Forges:        2,533
• This Week:           568 (above target!)
• Velocity:            114% (1.14x)
• Next Milestone:      2,016 → 4,032 (1,499 to go)
```

## 🎯 Strategic Implications

### For Early Forgers (Forge #1-1,000)
```
✅ Maximum discounts (up to 25%)
✅ Demand shield protection
✅ Permanent 10% discount
✅ Low base fees (0.1-0.11 BTC)
💰 Best ROI period
```

### For Mid-Game (Forge #1,000-10,000)
```
📈 Rising but predictable fees
📊 Base increases every 2,016 forges
⚡ Demand multipliers active
🎯 Still accessible (< 0.25 BTC)
```

### For Late Game (Forge #10,000+)
```
🏆 Premium positioning
💎 High prestige value
📈 Fees 1.0 - 21 BTC
🎪 Special events may offer opportunities
```

## 🔮 Projections

### First Year (Assuming 400 forges/week)
```
Month 1:   0.100 BTC
Month 3:   0.103 BTC
Month 6:   0.106 BTC  
Month 9:   0.109 BTC
Month 12:  0.113 BTC (capped at 0.11 in Founder Era)

Average:   ~0.106 BTC
```

### Five Year Outlook
```
Year 1:    0.11 BTC   (Founder cap)
Year 2:    0.18 BTC   (Early Knighting)
Year 3:    0.25 BTC   (Knighting cap)
Year 4:    0.45 BTC   (Early Royal)
Year 5:    0.75 BTC   (Mid Royal)

Note: Assumes steady 400/week velocity
```

## 🚀 Launch Strategy

### Day 1: "Genesis Forge"
```
First 100 forges: 0.099 BTC (1% "Founder's Blessing")
Psychology: "Be part of history"
```

### Week 1: "Founder Lock"
```
Forge 101-500: 0.100 BTC fixed
Strategy: Build initial community
```

### Month 1: "Rising Tide"
```
All systems active
Founders getting discounts
Demand multiplier if >500/week
```

---

## 📚 Quick Links

- Full Documentation: [DIFFICULTY_SYSTEM.md](./DIFFICULTY_SYSTEM.md)
- Contracts: [contracts/contracts/](./contracts/)
- Tests: [test/](./test/)
- Deployment: [scripts/deploy-difficulty-system.js](./scripts/deploy-difficulty-system.js)

## 🔐 Security

✅ Code Review: Passed
✅ CodeQL Scan: 0 vulnerabilities  
✅ Manual Audit: No dangerous patterns
✅ Access Control: Role-based (OpenZeppelin)
✅ Reentrancy: Protected (ReentrancyGuard)
⚠️ Mainnet: Professional audit recommended

---

*"Pull the sword from the stone. The earlier you try, the easier it is."* ⚔️
