# Dynamic Difficulty Adjustment System

## Overview

The Excalibur EXS Dynamic Difficulty Adjustment System implements a sophisticated three-layer difficulty mechanism that creates a fair, predictable, and economically sound progression for forge fees. Starting at **0.1 BTC**, the system progressively increases fees based on multiple factors while rewarding early adopters.

## Core Contracts

### 1. ForgeDifficulty.sol

The main difficulty calculation engine implementing three layers:

**Layer 1: Base Difficulty (Forge Count)**
- Increases 10% every 2,016 forges (Bitcoin difficulty adjustment homage)
- Starts at 0.1 BTC (10,000,000 satoshis)
- Compounds over time

**Layer 2: Demand Multiplier (Velocity-Based)**
- Target: 500 forges per week
- No multiplier at or below target (1.0x)
- Scales up to 2.0x for excessive demand
- For every 10% over target, adds 2% to multiplier

**Layer 3: Time Appreciation**
- 1% compounded monthly appreciation
- Approximately 12.68% per year
- Continuous growth regardless of forge velocity

**Layer 4: BTC Price Normalization (Optional)**
- Adjusts fees relative to $50,000 BTC baseline
- Keeps USD value relatively stable
- Capped between 0.5x and 2.0x

#### Era-Based Caps

The system enforces maximum fees based on forge count:

```
Founder Era (0-1,000):        Max 0.11 BTC
Knighting Era (1,001-10,000): Max 0.25 BTC
Royal Era (10,001-50,000):    Max 1.0 BTC
Legendary Era (50,001+):      Max 21.0 BTC
```

Minimum fee: **Never below 0.1 BTC**

### 2. ForgingVelocity.sol

Tracks forging rate and calculates velocity-based multipliers.

**Key Features:**
- Records timestamp of each forge
- Automatically trims data older than 14 days
- Calculates forges per day vs. target rate
- Computes velocity multiplier (1.0x - 2.0x)
- Detects sustained high velocity periods

**Target Rate:** 500 forges per week (~71.4 per day)

**Velocity Calculation:**
```
velocity = (actual_forges_per_day / target_forges_per_day) * 100
```

**Multiplier Calculation:**
```
if velocity ≤ 100%: multiplier = 1.0x
if velocity > 100%: multiplier = 1.0x + (excess * 0.25)
Maximum: 2.0x
```

### 3. FounderAdvantage.sol

Provides benefits to early forgers (founders).

**Founder Definition:**
- First X forgers (configurable, default: 1,000)
- Or forgers within first Y blocks
- Permanent status once registered

**Advantages:**

1. **Early Forge Discount**
   - 25% discount on first 10 forges
   - 10% permanent discount on all subsequent forges

2. **Demand Shield**
   - Protected from demand multipliers for first 100 forges
   - Pays only base fee + time appreciation (no velocity penalty)

3. **Priority Access** (future feature)
   - Special event access
   - Festival discounts

**Example Savings:**
```
Non-founder at 0.15 BTC:     0.15 BTC
Founder (first 10 forges):   0.1125 BTC (25% off)
Founder (after 10 forges):   0.135 BTC (10% off)
```

### 4. DifficultyTriggers.sol

Manages automatic difficulty adjustment triggers.

**Four Trigger Types:**

1. **Forge Count Milestones**
   - Every 2,016 forges
   - Triggers base difficulty increase

2. **Time Milestones**
   - Every 30 days (monthly)
   - Triggers time appreciation update

3. **Velocity Triggers**
   - When velocity >150% for 3+ consecutive days
   - Emergency adjustment for extreme demand

4. **Treasury Milestones**
   - Every 100 BTC added to treasury
   - Reflects project success in fees

**Event Emission:**
All triggers emit events for transparency and off-chain monitoring.

### 5. ForgeVerifierV2.sol

Integrates all difficulty components into the forging process.

**Key Features:**
- Calculates dynamic fee per user
- Applies founder advantages automatically
- Enforces cooldown penalties for rapid forging
- Rate limits: 3 forges per address per day
- Records metrics in all tracking contracts

**Cooldown Penalties:**
```
< 1 hour since last forge:  +50% penalty
< 1 day since last forge:   +10% penalty
≥ 1 day:                    No penalty
```

## Fee Calculation Examples

### Example 1: Early Founder (Forge #100)
```
Base Fee (Forge 100):           0.1 BTC
Demand (400/week, below target): 1.0x
Time (15 days):                  1.0x
BTC Price ($50k):                1.0x
Raw Fee:                         0.1 BTC
Founder Discount (25%):          -0.025 BTC
Final Fee:                       0.075 BTC
```

### Example 2: Regular User (Forge #5,000)
```
Base Fee (5,000 / 2,016 = 2 eras): 0.1 * 1.1² = 0.121 BTC
Demand (750/week, 150% target):     1.1x = 0.1331 BTC
Time (180 days = 6 months):         1.01⁶ = 1.0615x = 0.1413 BTC
BTC Price ($50k):                   1.0x = 0.1413 BTC
Knighting Era Cap:                  Min(0.1413, 0.25) = 0.1413 BTC
Final Fee:                          0.1413 BTC
```

### Example 3: Late Adopter (Forge #25,000)
```
Base Fee (25,000 / 2,016 = 12 eras): 0.1 * 1.1¹² ≈ 0.314 BTC
Demand (600/week, 120% target):       1.04x = 0.327 BTC
Time (365 days = 12 months):          1.01¹² = 1.1268x = 0.368 BTC
BTC Price ($75k high):                0.67x = 0.247 BTC
Royal Era Cap:                        Min(0.247, 1.0) = 0.247 BTC
Final Fee:                            0.247 BTC
```

## Projected Fee Schedule

### First Year Projection
(Assuming 400 forges/week, $50k BTC)

```
Week 1:   0.100 BTC
Month 1:  0.101 BTC (time appreciation)
Month 3:  0.103 BTC
Month 6:  0.106 BTC
Month 9:  0.109 BTC
Year 1:   0.113 BTC (capped at 0.11 for first 1,000 in Founder Era)
```

### Long-Term Projection

```
Forge 1,000:   ~0.11 BTC   (Founder Era cap)
Forge 5,000:   ~0.15 BTC   (Early Knighting Era)
Forge 10,000:  ~0.25 BTC   (Knighting Era cap)
Forge 25,000:  ~0.50 BTC   (Mid Royal Era)
Forge 50,000:  ~1.00 BTC   (Royal Era cap)
Forge 100,000: ~5.00 BTC   (Legendary Era, pre-cap)
```

## Integration Guide

### Deploying the System

1. Deploy core contracts:
```javascript
const forgeDifficulty = await ForgeDifficulty.deploy();
const forgingVelocity = await ForgingVelocity.deploy();
const founderAdvantage = await FounderAdvantage.deploy();
const difficultyTriggers = await DifficultyTriggers.deploy(10_000_000);
```

2. Deploy ForgeVerifierV2:
```javascript
const forgeVerifierV2 = await ForgeVerifierV2.deploy(
  exsTokenAddress,
  founderSwordsNFTAddress,
  forgeDifficulty.address,
  forgingVelocity.address,
  founderAdvantage.address,
  difficultyTriggers.address
);
```

3. Grant necessary roles:
```javascript
// Allow ForgeVerifierV2 to record forges
await forgingVelocity.grantRole(FORGE_RECORDER_ROLE, forgeVerifierV2.address);
await founderAdvantage.grantRole(FORGE_MANAGER_ROLE, forgeVerifierV2.address);
await difficultyTriggers.grantRole(TRIGGER_MANAGER_ROLE, forgeVerifierV2.address);
```

4. Configure founder cutoff:
```javascript
await founderAdvantage.setFounderCutoff(
  futureBlockNumber,
  1000 // First 1,000 forgers
);
```

### Using the System

**Getting Current Fee:**
```javascript
const userAddress = "0x...";
const currentFee = await forgeVerifierV2.getCurrentForgeFee(userAddress);
console.log(`Current fee: ${currentFee} satoshis`);
```

**Checking Founder Status:**
```javascript
const advantages = await founderAdvantage.getFounderAdvantages(userAddress);
console.log(`Is Founder: ${advantages.isFounder_}`);
console.log(`Discount: ${advantages.currentDiscount}%`);
console.log(`Demand Shield: ${advantages.isDemandShielded_}`);
```

**Submitting a Forge:**
```javascript
await forgeVerifierV2.submitForgeProof(
  taprootAddressHash,
  btcTxHash,
  amountInSatoshis
);
```

## Dashboard Integration

### Real-Time Metrics

Display these key metrics on your forge dashboard:

```javascript
// Current fee for user
const fee = await forgeVerifierV2.getCurrentForgeFee(userAddress);

// Forge statistics
const totalForges = await difficultyTriggers.totalForgesCompleted();
const forgesLastWeek = await forgingVelocity.getForgesLastWeek();

// Next milestones
const forgesUntilNext = await difficultyTriggers.getForgesUntilNextMilestone();
const timeUntilNext = await difficultyTriggers.getTimeUntilNextMilestone();

// Velocity info
const velocity = await forgingVelocity.getVelocity();
const velocityMultiplier = await forgingVelocity.getVelocityMultiplier();

// User advantages
const advantages = await founderAdvantage.getFounderAdvantages(userAddress);
```

### Example Dashboard Display

```
╔════════════════════════════════════════════════════╗
║           CURRENT FORGE FEE                        ║
║                                                    ║
║                   0.127 BTC                        ║
║                  ($7,620 USD)                      ║
╚════════════════════════════════════════════════════╝

Fee Breakdown:
├── Base Fee:           0.110 BTC (Era 2)
├── Time Factor:        +2% (2 months)
├── Demand Tax:         +15% (high velocity)
└── Founder Discount:   -10% (you're a founder!)

Next Adjustments:
• In 483 forges:  +10% (Era milestone)
• In 3 days:      +1% (monthly appreciation)
• Velocity:       High (reduce in 2 days)

Your Founder Advantages:
✓ 10% permanent discount
✓ Demand shield expired (100+ forges)
✓ Priority festival access
```

## Security Considerations

1. **Oracle Security**: BTC price updates require ORACLE_ROLE
2. **Role Management**: Strictly control admin roles
3. **Rate Limiting**: Enforced per-address limits prevent abuse
4. **Cooldown System**: Prevents rapid-fire forging attacks
5. **Cap Enforcement**: Maximum fees prevent extreme scenarios
6. **Reentrancy Protection**: All state-changing functions protected

## Testing

Run comprehensive tests:
```bash
npx hardhat test test/ForgeDifficulty.test.js
npx hardhat test test/ForgingVelocity.test.js
npx hardhat test test/FounderAdvantage.test.js
```

## Future Enhancements

- **Monthly Festivals**: 20% discount first weekend of each month
- **Full Moon Forge**: Special 24-hour 0.05 BTC events
- **Dutch Auctions**: For forge slots beyond 10,000
- **Governance Integration**: DAO voting on difficulty parameters
- **Cross-chain Support**: Expand beyond Bitcoin

## Contact

For questions or issues:
- Developer: Travis D Jones
- Email: holedozer@icloud.com
- GitHub: Holedozer1229/Excalibur-EXS

---

**⚠️ IMPORTANT**: This system handles real Bitcoin value. Always:
- Audit smart contracts professionally
- Test extensively on testnet
- Use multi-sig for admin functions
- Monitor metrics continuously
- Have emergency pause procedures ready
