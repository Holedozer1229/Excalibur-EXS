# Excalibur Smart Contracts

Production-ready Solidity smart contracts for the Excalibur EXS cryptocurrency ecosystem.

## Contracts

### 1. ExcaliburToken.sol (ERC-20)
- **Total Supply**: 21,000,000 EXS
- **Features**:
  - Vesting schedules for founders and development fund (4 years)
  - Liquidity lock (2 years)
  - Pausable for emergency situations
  - Mintable forge rewards (up to 10.5M EXS)
  - Role-based access control

### 2. FounderSwordsNFT.sol (ERC-721)
- **Supply**: 13 unique Founder Sword NFTs
- **Features**:
  - Perpetual revenue sharing (1-2% of forge fees)
  - Automatic revenue distribution
  - Governance veto power for select swords
  - Revenue claiming for NFT holders
  - Metadata for each sword (name, revenue share, etc.)

### 3. ForgeVerifier.sol / ForgeVerifierV2.sol
- **Purpose**: Verifies Bitcoin payments and mints EXS rewards
- **Features**:
  - Oracle-based BTC payment verification
  - Dynamic forge fee calculation with three-layer difficulty system
  - Proof submission and verification
  - Integration with ExcaliburToken for minting
  - Fee distribution to Founder Sword holders
  - **NEW**: ForgeVerifierV2 includes advanced difficulty adjustment (see below)

### 4. Dynamic Difficulty Adjustment System (NEW)
A sophisticated three-layer difficulty mechanism for fair, predictable forge fee progression.

**Contracts**:
- **ForgeDifficulty.sol**: Three-layer fee calculation (base, demand, time)
- **ForgingVelocity.sol**: Tracks forging rate and calculates velocity multipliers
- **FounderAdvantage.sol**: Provides discounts and shields for early forgers
- **DifficultyTriggers.sol**: Manages automatic difficulty adjustments

**Key Features**:
- Starting fee: 0.1 BTC, progressively increasing
- Era-based caps (Founder: 0.11 BTC → Legendary: 21 BTC)
- Founder advantages: 25% discount first 10 forges, 10% permanent
- Demand multiplier based on forging velocity (target: 500/week)
- 1% monthly time appreciation (compounded)
- BTC price normalization for stable USD value

📖 **[Full Documentation](./DIFFICULTY_SYSTEM.md)**

### 5. TreasuryDAO.sol
- **Purpose**: Multi-sig treasury management
- **Features**:
  - Multi-signature transactions
  - Configurable confirmation threshold
  - Transaction submission and approval workflow
  - Signer management
  - Transparent transaction history

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- RPC URLs for networks
- Private keys (use hardware wallet or secure key management)
- Etherscan API key for verification
- Deployment addresses

## Compilation

```bash
npx hardhat compile
```

## Testing

```bash
npx hardhat test
```

## Deployment

### Local/Testnet
```bash
# Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### Mainnet

**WARNING**: Deploying to mainnet requires:
1. Professional security audit
2. Extensive testing on testnet
3. Secure key management (hardware wallet)
4. Multi-sig setup for admin functions

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Verification

After deployment, verify contracts on Etherscan:

```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

See deployment output for specific verification commands.

## Security Considerations

### Critical Actions Required Before Mainnet:

1. **Professional Audit**: Contract must be audited by reputable firm (Trail of Bits, Quantstamp, etc.)

2. **Key Management**:
   - Use hardware wallets for admin keys
   - Set up multi-sig for all critical functions
   - Never commit private keys to version control

3. **Multi-sig Setup**:
   - Development Fund: 3/5 signers
   - Treasury DAO: 4/7 signers
   - Emergency Pause: 2/3 signers

4. **Testing**:
   - Comprehensive unit tests
   - Integration tests
   - Gas optimization tests
   - Security penetration tests
   - Testnet deployment (minimum 30 days)

5. **Oracle Setup**:
   - Deploy reliable BTC payment verification oracle
   - Set up monitoring and alerting
   - Implement fallback mechanisms

6. **Emergency Procedures**:
   - Document pause procedures
   - Set up emergency communication channels
   - Create incident response plan

## Gas Optimization

Contracts are optimized with:
- Optimizer enabled (200 runs)
- Efficient storage patterns
- Batch operations where possible
- Event emission for off-chain indexing

## License

BSD-3-Clause License

## Contact

For security concerns or questions:
- Lead Architect: Travis D Jones
- Email: holedozer@gmail.com

---

**⚠️ DISCLAIMER**: These contracts handle real value. Do not deploy to mainnet without professional security audit and comprehensive testing.
