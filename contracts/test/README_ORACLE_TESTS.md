# ForgeVerifier Oracle Integration Tests

## Overview

Comprehensive test suite for ForgeVerifier Bitcoin oracle integration covering security, reliability, and edge cases.

## Test Structure

The test suite is organized into 8 major categories:

### 1. Happy Path - Successful Oracle Response
- ✅ Valid proof submission and verification
- ✅ Correct reward minting
- ✅ Forge fee updates
- ✅ Parameter extraction and validation

### 2. Oracle Failure & Negative Cases
- ✅ Explicit oracle failures with reasons
- ✅ Invalid/malformed responses
- ✅ Stale data rejection
- ✅ Manipulated data detection
- ✅ No token minting on failure

### 3. Oracle Availability & Timeout Scenarios
- ✅ Oracle timeout handling
- ✅ Invalid proof IDs
- ✅ Multiple consecutive failures
- ✅ Graceful degradation

### 4. Security & Attack Vectors
- ✅ Replay attack prevention (same tx hash)
- ✅ Double verification prevention
- ✅ Unauthorized verification attempts
- ✅ ProofId uniqueness and collision prevention
- ✅ Minimum fee validation
- ✅ Invalid input rejection
- ✅ Reentrancy protection

### 5. Access Control & Governance
- ✅ ORACLE_ROLE verification
- ✅ Role granting and revocation
- ✅ PAUSER_ROLE enforcement
- ✅ FEE_MANAGER_ROLE enforcement
- ✅ ETH receive restrictions

### 6. Pause Functionality
- ✅ Proof submission blocked when paused
- ✅ Verification allowed when paused
- ✅ Unpause restores functionality

### 7. Gas Usage Measurements
- ✅ Proof submission gas usage (< 200k)
- ✅ Successful verification gas usage (< 300k)
- ✅ Failed verification gas usage (< 150k)

### 8. Integration Tests
- ✅ Multiple user workflows
- ✅ Mixed success/failure scenarios
- ✅ State consistency

## Running the Tests

### Run all tests
```bash
cd contracts
npx hardhat test
```

### Run only oracle integration tests
```bash
npx hardhat test test/ForgeVerifierOracle.test.js
```

### Run with gas reporting
```bash
REPORT_GAS=true npx hardhat test test/ForgeVerifierOracle.test.js
```

### Run with coverage
```bash
npx hardhat coverage --testfiles "test/ForgeVerifierOracle.test.js"
```

### Run specific test suite
```bash
npx hardhat test test/ForgeVerifierOracle.test.js --grep "Happy Path"
npx hardhat test test/ForgeVerifierOracle.test.js --grep "Security"
npx hardhat test test/ForgeVerifierOracle.test.js --grep "Access Control"
```

## Mock Contracts

### MockBitcoinOracle
Located at: `contracts/contracts/mocks/MockBitcoinOracle.sol`

**Features:**
- Configurable response types (SUCCESS, FAILURE, TIMEOUT, etc.)
- Transaction data simulation
- Circuit breaker simulation
- Time manipulation for testing
- Request tracking

**Response Types:**
- `SUCCESS`: Valid verification response
- `FAILURE`: Explicit failure with reason
- `INVALID_FORMAT`: Malformed response
- `STALE_DATA`: Data too old
- `TIMEOUT`: Reverts to simulate timeout
- `MANIPULATED`: Data appears manipulated

### MockExcaliburToken
Located at: `contracts/contracts/mocks/MockExcaliburToken.sol`

**Features:**
- Tracks minted rewards
- Role-based minting
- Simple implementation for testing

### MockFounderSwordsNFT
Located at: `contracts/contracts/mocks/MockFounderSwordsNFT.sol`

**Features:**
- Tracks deposited fees
- Simple payable implementation

## Test Coverage Goals

Target coverage for oracle-related code paths:
- ✅ Line Coverage: 100%
- ✅ Branch Coverage: 100%
- ✅ Function Coverage: 100%
- ✅ Statement Coverage: 100%

## Key Security Tests

### Replay Protection
- Transaction hashes are marked as used after successful verification
- Attempting to reuse a transaction hash reverts with "Transaction already used"

### Double Verification Prevention
- Proofs can only be verified once
- Subsequent attempts revert with "Proof already verified"

### Access Control
- Only accounts with ORACLE_ROLE can verify proofs
- Only accounts with PAUSER_ROLE can pause/unpause
- Only accounts with FEE_MANAGER_ROLE can distribute fees

### Input Validation
- Taproot address cannot be zero
- Transaction hash cannot be zero
- Amount must meet minimum forge fee
- ProofId must exist before verification

## Gas Usage Benchmarks

Expected gas usage (with optimizer enabled, 200 runs):

| Function | Gas Used | Threshold |
|----------|----------|-----------|
| submitForgeProof | ~120k-150k | < 200k |
| verifyForgeProof (success) | ~180k-250k | < 300k |
| verifyForgeProof (failure) | ~80k-120k | < 150k |

## Next Steps

1. **Run test suite**: Verify all tests pass
2. **Check coverage**: Ensure oracle paths have 100% coverage
3. **Review gas usage**: Ensure gas costs are acceptable
4. **Security audit preparation**: Use these tests as part of audit documentation
5. **Continuous integration**: Add to CI/CD pipeline

## Troubleshooting

### Compiler Download Issues
If you encounter network issues downloading the Solidity compiler:
```bash
# Clear cache and retry
rm -rf cache/ artifacts/
npx hardhat clean
npx hardhat compile
```

### Test Failures
- Ensure all dependencies are installed: `npm install`
- Check Hardhat network is running if using localhost
- Verify mock contracts are deployed correctly

## Security Considerations

⚠️ **Important**: These tests use mock oracles. In production:

1. **Real Oracle Integration**: Replace mock with actual Bitcoin oracle
2. **Multiple Oracle Sources**: Consider using multiple oracles for redundancy
3. **Oracle Monitoring**: Implement monitoring and alerting for oracle failures
4. **Circuit Breaker**: Implement production circuit breaker for consecutive failures
5. **Stale Data Detection**: Implement timestamp validation in production
6. **Rate Limiting**: Consider rate limiting oracle calls
7. **Emergency Pause**: Ensure pause functionality works with production oracle

## Contact

For questions about oracle integration tests:
- Lead Architect: Travis D Jones
- Email: holedozer@icloud.com

## License

BSD-3-Clause License
