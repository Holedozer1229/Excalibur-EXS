# Excalibur $EXS Portal Architecture

This directory contains the dual-portal architecture for the Excalibur $EXS protocol, implementing the Arthurian-themed interface separation between public users (Knights) and administrative treasury management (Merlin).

## Architecture Overview

The EXS protocol implements a **Double-Portal Architecture** that separates concerns between:
1. **Public Forging Interface** (Knights of the Round Table)
2. **Administrative Treasury Management** (Merlin's Portal)

This separation ensures security, user experience optimization, and proper treasury governance.

---

## 🗡️ Knights of the Round Table

**File**: `knights_round_table.tsx`  
**Purpose**: Public-facing forge portal  
**Access Level**: Public (no authentication required)

### Features

#### 1. Sword in the Stone UI
- Interactive 13-word Arthurian Axiom input
- Real-time validation of the sacred prophecy
- Visual word-by-word display with numbered cells

#### 2. Ω′ Δ18 Tetra-PoW Mining
- 128-round quantum-hardened mining visualization
- Real-time progress tracking
- Round-by-round hash state display
- Mining statistics and performance metrics

#### 3. Claim Request System
- Webhook-triggered PR creation for successful forges
- Automated verification workflow
- Transparent claim submission process

### Canonical Axiom

The 13-word Arthurian prophecy that must be entered to forge:

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

### Mining Process

1. Knight enters the 13-word axiom
2. System validates the axiom matches canonical sequence
3. Ω′ Δ18 Tetra-PoW miner executes 128 rounds
4. Real-time visualization shows mining progress
5. On success, knight can submit a claim request
6. Claim triggers GitHub PR for verification

### API Endpoints Required

The portal expects the following backend endpoints:

```
POST /api/forge/mine
  - Body: { axiom, minerType, difficulty }
  - Returns: { success, nonce, block_hash, attempts }

POST /api/forge/claim
  - Body: { nonce, hash, axiom_hash, timestamp }
  - Returns: { success, pr_url }
```

---

## 🧙‍♂️ Merlin's Portal

**File**: `merlins_portal.tsx`  
**Purpose**: Administrative treasury management dashboard  
**Access Level**: Restricted (requires King's Vector)

### Security: HPP-1 Hardened Authentication

The portal implements the **HPP-1 Protocol** for authentication:

- **Algorithm**: PBKDF2-HMAC-SHA512
- **Iterations**: 600,000 (quantum-resistant hardness)
- **Salt**: `excalibur-exs-kings-vector-salt-v1`
- **Key Derivation**: AES-GCM 256-bit
- **Verification**: SHA-256 hash comparison

```typescript
// Authentication Flow
King's Vector (password)
  → PBKDF2(600k iterations, SHA-512)
  → AES-GCM(256-bit) key
  → SHA-256 hash
  → Backend verification
```

### Features

#### 1. Overview Dashboard
- **King's Tithe**: Total treasury balance visualization
  - Total Balance
  - Spendable (unlocked) balance
  - Locked (CLTV time-locked) balance
- **Foundry Reserve**: 5% of total supply monitoring
  - Supply cap tracking
  - Minting progress visualization
- **Forge Statistics**: Real-time metrics
  - Total forges processed
  - Current block height
  - BTC forge fee pool
  - Distribution count

#### 2. CLTV Mini-Outputs Management
- Displays all treasury mini-outputs
- Shows lock status (Locked, Spendable, Spent)
- Block height and unlock height tracking
- 3 outputs per forge with staggered locks:
  - Output 1: Immediate (0 blocks)
  - Output 2: ~1 month (4,320 blocks)
  - Output 3: ~2 months (8,640 blocks)

#### 3. Distribution History
- Complete treasury distribution log
- Transaction tracking
- Purpose and recipient details

#### 4. Settings & Controls
- **Forge Difficulty**: Adjust leading zero byte requirement (1-8)
- **Ω′ Δ18 Rounds**: Configure round count (64-256, step 64)
- System configuration management

### API Endpoints Required

The admin portal expects these backend endpoints:

```
POST /api/admin/authenticate
  - Body: { vector_hash }
  - Returns: { success, token }

GET /api/treasury/stats
  - Returns: TreasuryStats object

GET /api/treasury/mini-outputs
  - Returns: MiniOutput[] array

GET /api/treasury/distributions
  - Returns: Distribution[] array

POST /api/admin/forge-difficulty
  - Body: { difficulty, rounds }
  - Returns: { success }
```

---

## Treasury Fee Model

### Implementation: `ProcessForgeFee`

Located in: `pkg/economy/treasury.go`

#### King's Tithe (1% Fee)
```go
// For every 100 $EXS minted, route 1 $EXS to Treasury
func (t *Treasury) ProcessForgeFee(mintedAmount float64, requireDeposit bool) 
    (treasuryFee float64, forgeFeeInSats int64, err error)
```

#### Fee Structure
- **Minting Fee**: 1% of all minted $EXS goes to Treasury
- **Forge Deposit**: 10,000 satoshis (0.0001 BTC) per forge
- **Treasury Allocation**: 15% of block reward (7.5 $EXS per forge)

#### Combined Model: `ProcessForgeWithFee`
```go
// Applies both 15% allocation AND 1% King's Tithe
func (t *Treasury) ProcessForgeWithFee(minerAddress string, applyKingsTithe bool) 
    (*ForgeResult, float64, error)
```

**Example Calculation**:
- Block Reward: 50 $EXS
- Treasury Allocation (15%): 7.5 $EXS
- Miner Base Reward: 42.5 $EXS
- King's Tithe (1% of miner reward): 0.425 $EXS
- Final Miner Reward: 42.075 $EXS
- Final Treasury: 7.925 $EXS (7.5 + 0.425)

---

## Integration Guide

### For Next.js Applications

#### 1. Import the Portals

```typescript
import KnightsRoundTable from '@/src/portals/knights_round_table'
import MerlinsPortal from '@/src/portals/merlins_portal'
```

#### 2. Add Routes

```typescript
// pages/forge.tsx or app/forge/page.tsx
export default function ForgePage() {
  return <KnightsRoundTable />
}

// pages/admin.tsx or app/admin/page.tsx
export default function AdminPage() {
  return <MerlinsPortal />
}
```

#### 3. Configure API Routes

Create backend API routes that match the expected endpoints listed above.

### For Standalone Deployment

Both portals can be deployed as independent applications:

```bash
# Deploy Knights Portal (public)
vercel deploy --prod ./src/portals/knights_round_table.tsx

# Deploy Merlin's Portal (private subdomain)
vercel deploy --prod ./src/portals/merlins_portal.tsx
```

---

## Security Considerations

### Knights Portal (Public)
- ✅ No authentication required
- ✅ Axiom validation prevents unauthorized forging
- ✅ Rate limiting recommended on API endpoints
- ✅ PR-based claim verification ensures transparency

### Merlin's Portal (Admin)
- 🔐 HPP-1 hardened authentication required
- 🔐 600,000 iteration PBKDF2 prevents brute force
- 🔐 Recommend additional 2FA for production
- 🔐 Restrict network access via firewall rules
- 🔐 Audit all treasury operations
- 🔐 Multi-sig recommended for distributions

---

## Testing

### Unit Tests

Treasury fee logic tests are located in:
```
pkg/economy/treasury_test.go
```

Run tests:
```bash
go test ./pkg/economy/... -v
```

All tests passing (10/10):
- ✅ TestProcessForgeFee
- ✅ TestProcessForgeFeeWithoutDeposit
- ✅ TestProcessForgeWithFee
- ✅ TestProcessForgeWithFeeDisabled
- ✅ (+ 6 other treasury tests)

### Integration Testing

Test the portals locally:

```bash
# Start development server
npm run dev

# Navigate to:
# http://localhost:3000/forge (Knights Portal)
# http://localhost:3000/admin (Merlin's Portal)
```

---

## License & Copyright

**License**: BSD 3-Clause  
**Copyright**: (c) 2025, Travis D. Jones  
**Author**: Travis D. Jones <holedozer@icloud.com>

All code in this directory is subject to the BSD 3-Clause License as specified in the repository root LICENSE file.

---

## Support & Documentation

For more information about the Excalibur $EXS protocol:

- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS
- **Protocol Docs**: See `/docs` directory
- **Miner Implementation**: `pkg/miner/tetra_pow_miner.py`
- **Treasury Logic**: `pkg/economy/treasury.go`

---

## Changelog

### 2025-01-01 - Initial Implementation
- Created Knights of the Round Table portal
- Created Merlin's Portal with HPP-1 authentication
- Implemented ProcessForgeFee function
- Added comprehensive test coverage
- Documented architecture and integration
