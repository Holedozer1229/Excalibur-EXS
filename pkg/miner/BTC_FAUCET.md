# Excalibur $EXS Bitcoin Faucet

A Bitcoin faucet system inspired by freebitco.in that helps users fund transaction fees for forge operations.

## Overview

The BTC Faucet allows users to claim small amounts of Bitcoin every hour to cover the 0.0001 BTC forge fee required for each mining operation. This ensures that users can participate in the Excalibur $EXS Protocol even without initial BTC holdings.

## Features

### 💧 Hourly Claims
Claim BTC every hour (3600 seconds) with increasing rewards based on loyalty.

### 🎯 Reward Tiers

| Tier | Claims Required | Reward Range | Average |
|------|----------------|--------------|---------|
| Newbie | 0-9 | 50-100 sat | 75 sat |
| Regular | 10-49 | 100-200 sat | 150 sat |
| Veteran | 50-99 | 200-500 sat | 350 sat |
| Legend | 100+ | 500-1000 sat | 750 sat |
| **Jackpot** | Any | 10,000-50,000 sat | 30,000 sat (0.01% chance) |

### 🔐 Captcha Protection
Simple math captcha prevents bot abuse (e.g., "5+3").

### 👥 Referral System
Earn 25% of what your referrals claim. Share your referral link to maximize earnings!

### 🔄 Auto-Funding
Integrated with unified miner to automatically fund forge fees when needed.

## Quick Start

### Standalone Usage

```bash
cd /home/runner/work/Excalibur-EXS/Excalibur-EXS/pkg/miner

# Register
python3 btc_faucet.py register --address bc1q...

# Claim (every hour)
python3 btc_faucet.py claim --address bc1q... --captcha "5+3" --answer 8

# Check balance
python3 btc_faucet.py balance --address bc1q...

# View statistics
python3 btc_faucet.py stats
```

### Integrated with Unified Miner

```bash
# Check faucet balance
python3 unified_miner.py faucet --btc-address bc1q... --faucet-action balance

# Claim from faucet
python3 unified_miner.py faucet --btc-address bc1q... --faucet-action claim

# Mine with auto-funding enabled
python3 unified_miner.py solo --difficulty 1 --enable-faucet --btc-address bc1q...
```

## How It Works

### 1. Registration
Register your BTC address to start claiming:
```bash
python3 btc_faucet.py register --address bc1qyouraddress...
```

**Output:**
```
✅ Registered address: bc1qyouraddress...
📎 Your referral link:
   https://exs-faucet.io/claim?ref=a72345f8
💡 Earn 25% of what your referrals claim!
```

### 2. Claiming
Claim every hour by solving a simple captcha:
```bash
python3 btc_faucet.py claim --address bc1qyouraddress... --captcha "5+3" --answer 8
```

**Output:**
```
✅ Claim successful!
   Reward: 62 satoshis (0.00000062 BTC)
   Tier: newbie
   Claims: 1
💰 New Balance: 0.00000062 BTC
⏰ Next claim in 60 minutes
```

### 3. Checking Balance
```bash
python3 btc_faucet.py balance --address bc1qyouraddress...
```

**Output:**
```
════════════════════════════════════════════════════════════
  EXCALIBUR $EXS FAUCET BALANCE
════════════════════════════════════════════════════════════
Address:         bc1qyouraddress...
Balance:         0.00010234 BTC (10234 sat)
Total Claimed:   0.00012000 BTC
Claim Count:     87
Referral Bonus:  0.00001766 BTC
Next Claim:      Available now! ✅

Forge Fees Available: 1
════════════════════════════════════════════════════════════
```

## Integration with Mining

### Auto-Funding Forge Fees

When mining with faucet enabled, the system automatically:
1. Checks if you have sufficient balance for forge fee (0.0001 BTC)
2. If insufficient, checks if you can claim from faucet
3. Automatically claims if interval has passed
4. Deducts forge fee before mining

```python
from unified_miner import UnifiedMiner

# Initialize with faucet enabled
miner = UnifiedMiner(
    difficulty=1,
    faucet_enabled=True,
    btc_address="bc1qyouraddress..."
)

# Mine - forge fee automatically handled
result = miner.solo_mine(max_attempts=50000)
```

### Example Output
```
💧 Insufficient forge fee. Attempting faucet claim...
✅ Claim successful!
   Reward: 158 satoshis (0.00000158 BTC)
   Tier: regular
   Claims: 12
✅ Forge fee deducted: 0.0001 BTC
🎯 Solo Mining $EXS...
```

## Reward Progression

Track your progress through reward tiers:

| Claims | Tier | Avg Reward | Time to Forge Fee* |
|--------|------|------------|-------------------|
| 1-9 | Newbie | 75 sat | ~134 hours |
| 10-49 | Regular | 150 sat | ~67 hours |
| 50-99 | Veteran | 350 sat | ~29 hours |
| 100+ | Legend | 750 sat | ~14 hours |

*Approximate time to accumulate 0.0001 BTC (10,000 sat) at average reward rate

## Referral System

### How It Works
1. Get your unique referral link after registration
2. Share with friends
3. Earn 25% of all their claims automatically

### Example
- Your referral claims 100 sat → You earn 25 sat
- Your referral claims 200 sat → You earn 50 sat
- Your referral hits jackpot (30,000 sat) → You earn 7,500 sat!

### Command
```bash
python3 btc_faucet.py register --address bc1qnewuser... --referrer bc1qyouraddress...
```

## Python API

### Standalone Faucet

```python
from btc_faucet import BTCFaucet

# Initialize faucet
faucet = BTCFaucet()

# Register user
faucet.register_user("bc1qaddress...", referrer="bc1qreferrer...")

# Check if can claim
can_claim, reason = faucet.can_claim("bc1qaddress...")

# Claim
claim = faucet.claim("bc1qaddress...", "5+3", "8")

# Get balance
balance = faucet.get_balance("bc1qaddress...")
print(f"Balance: {balance.balance_btc} BTC")

# Check if has forge fee
has_fee = faucet.has_forge_fee("bc1qaddress...")

# Deduct forge fee
success = faucet.deduct_forge_fee("bc1qaddress...")

# Get statistics
stats = faucet.get_stats()
faucet.print_stats()
```

### With Unified Miner

```python
from unified_miner import UnifiedMiner

miner = UnifiedMiner(
    difficulty=1,
    faucet_enabled=True,
    btc_address="bc1qaddress..."
)

# Manual claim
miner.claim_faucet("5+3", "8")

# Check balance
miner.get_faucet_balance()

# Auto-funding is automatic during mining
result = miner.solo_mine()
```

## Data Storage

Faucet data is stored in `/tmp/exs_faucet/` by default:
- `faucet_users.json` - User accounts and balances
- `faucet_claims.json` - Claim history (last 1000 claims)

To use a custom directory:
```python
faucet = BTCFaucet(data_dir="/custom/path")
```

## Economics

### Faucet Sustainability
- Average claim: 300 sat
- Claims per day per user: 24
- Daily distribution per user: ~7,200 sat (0.000072 BTC)
- Forge fees funded per day: ~0.72 forges

### Treasury Funding
In production, the faucet would be funded by:
1. Treasury fees from successful forges (1%)
2. Forge fees collected (0.0001 BTC per forge)
3. Protocol revenue streams
4. Community donations

## Security

### Captcha Protection
- Simple math captcha prevents automated abuse
- In production: Integrate with reCAPTCHA or hCaptcha

### Rate Limiting
- 1 hour minimum between claims
- IP-based rate limiting (production)
- Address-based tracking

### Abuse Prevention
- Claim history tracking
- Suspicious pattern detection (future)
- Maximum daily claims (future)

## Troubleshooting

### Cannot Claim
```
❌ Cannot claim: Next claim in 45 minutes
```
**Solution**: Wait for the claim interval to pass (1 hour between claims)

### Captcha Failed
```
❌ Captcha verification failed
```
**Solution**: Check your math! Example: "5+3" = 8

### Address Not Registered
```
❌ Address not registered
```
**Solution**: Register first with `python3 btc_faucet.py register --address bc1q...`

### Insufficient Forge Fee
```
⚠️  Insufficient forge fee. Next claim in 30 minutes
```
**Solution**: Wait and claim more BTC, or use `--enable-faucet` for auto-claiming

## Comparison to freebitco.in

| Feature | Excalibur $EXS Faucet | freebitco.in |
|---------|----------------------|--------------|
| Claim Interval | 1 hour | 1 hour |
| Reward Tiers | ✅ 4 tiers + jackpot | ✅ Multiple tiers |
| Referral Bonus | ✅ 25% | ✅ 50% |
| Captcha | ✅ Math captcha | ✅ reCAPTCHA |
| Auto-Fund Fees | ✅ Built-in | ❌ Manual |
| Mining Integration | ✅ Seamless | ❌ Separate |
| Lottery | ❌ (planned) | ✅ |
| Betting | ❌ (planned) | ✅ |

## Future Enhancements

Planned features:
- [ ] Web interface
- [ ] reCAPTCHA integration
- [ ] Lottery system
- [ ] Multiply BTC game
- [ ] Interest on balances
- [ ] Mobile app
- [ ] Social media claim bonuses
- [ ] Achievement system

## License

BSD 3-Clause License

Copyright (c) 2025, Travis D. Jones (holedozer@gmail.com)

---

*"Never run out of satoshis for your forges"* 💧⚔️
