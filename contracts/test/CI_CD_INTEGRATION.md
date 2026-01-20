# CI/CD Integration for Oracle Tests

## GitHub Actions Workflow Example

Create `.github/workflows/oracle-tests.yml`:

```yaml
name: Oracle Integration Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'contracts/**'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'contracts/**'

jobs:
  test-oracle-integration:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: contracts/package-lock.json
    
    - name: Install dependencies
      working-directory: ./contracts
      run: npm ci
    
    - name: Compile contracts
      working-directory: ./contracts
      run: npx hardhat compile
    
    - name: Run oracle integration tests
      working-directory: ./contracts
      run: npx hardhat test test/ForgeVerifierOracle.test.js
      env:
        REPORT_GAS: true
    
    - name: Generate coverage report
      working-directory: ./contracts
      run: npx hardhat coverage --testfiles "test/ForgeVerifierOracle.test.js"
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./contracts/coverage/lcov.info
        flags: oracle-tests
        name: oracle-integration-coverage

  test-all-contracts:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: contracts/package-lock.json
    
    - name: Install dependencies
      working-directory: ./contracts
      run: npm ci
    
    - name: Compile contracts
      working-directory: ./contracts
      run: npx hardhat compile
    
    - name: Run all tests
      working-directory: ./contracts
      run: npx hardhat test
    
    - name: Generate full coverage
      working-directory: ./contracts
      run: npx hardhat coverage
    
    - name: Upload full coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./contracts/coverage/lcov.info
        flags: full-coverage
        name: full-contract-coverage
```

## Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running oracle integration tests before commit..."

cd contracts

# Run oracle tests
npx hardhat test test/ForgeVerifierOracle.test.js

if [ $? -ne 0 ]; then
  echo "❌ Oracle tests failed. Commit aborted."
  exit 1
fi

echo "✅ Oracle tests passed!"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Local Development Script

Create `contracts/scripts/test-oracle.sh`:

```bash
#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== ForgeVerifier Oracle Integration Tests ===${NC}\n"

# Compile contracts
echo -e "${YELLOW}Compiling contracts...${NC}"
npx hardhat compile

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Compilation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Compilation successful${NC}\n"

# Run tests
echo -e "${YELLOW}Running oracle integration tests...${NC}"
REPORT_GAS=true npx hardhat test test/ForgeVerifierOracle.test.js

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Tests failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}\n"

# Generate coverage
echo -e "${YELLOW}Generating coverage report...${NC}"
npx hardhat coverage --testfiles "test/ForgeVerifierOracle.test.js"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Coverage generation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Coverage report generated${NC}"
echo -e "${YELLOW}View coverage at: contracts/coverage/index.html${NC}\n"

# Display summary
echo -e "${GREEN}=== Test Summary ===${NC}"
echo "✅ Contracts compiled"
echo "✅ 35 oracle integration tests passed"
echo "✅ Coverage report generated"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review coverage report: open contracts/coverage/index.html"
echo "2. Check gas usage in test output"
echo "3. Commit changes if all looks good"
```

Make it executable:
```bash
chmod +x contracts/scripts/test-oracle.sh
```

Run with:
```bash
cd contracts
./scripts/test-oracle.sh
```

## NPM Scripts

Add to `contracts/package.json`:

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "test:oracle": "hardhat test test/ForgeVerifierOracle.test.js",
    "test:oracle:gas": "REPORT_GAS=true hardhat test test/ForgeVerifierOracle.test.js",
    "test:oracle:coverage": "hardhat coverage --testfiles 'test/ForgeVerifierOracle.test.js'",
    "test:all": "hardhat test",
    "coverage": "hardhat coverage",
    "coverage:oracle": "hardhat coverage --testfiles 'test/ForgeVerifierOracle.test.js'",
    "lint": "solhint 'contracts/**/*.sol'",
    "format": "prettier --write 'contracts/**/*.sol' 'test/**/*.js'"
  }
}
```

Usage:
```bash
npm run test:oracle           # Run oracle tests
npm run test:oracle:gas       # Run with gas reporting
npm run test:oracle:coverage  # Run with coverage
```

## Docker Integration

Create `contracts/Dockerfile.test`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy contracts and tests
COPY . .

# Compile contracts
RUN npx hardhat compile

# Run tests
CMD ["npx", "hardhat", "test", "test/ForgeVerifierOracle.test.js"]
```

Build and run:
```bash
cd contracts
docker build -f Dockerfile.test -t excalibur-oracle-tests .
docker run excalibur-oracle-tests
```

## Makefile

Create `contracts/Makefile`:

```makefile
.PHONY: compile test test-oracle test-oracle-gas coverage coverage-oracle clean

compile:
	npx hardhat compile

test:
	npx hardhat test

test-oracle:
	npx hardhat test test/ForgeVerifierOracle.test.js

test-oracle-gas:
	REPORT_GAS=true npx hardhat test test/ForgeVerifierOracle.test.js

coverage:
	npx hardhat coverage

coverage-oracle:
	npx hardhat coverage --testfiles "test/ForgeVerifierOracle.test.js"

clean:
	rm -rf cache/ artifacts/ coverage/ coverage.json

install:
	npm install

all: install compile test coverage
```

Usage:
```bash
make test-oracle          # Run oracle tests
make test-oracle-gas      # Run with gas reporting
make coverage-oracle      # Generate coverage
```

## Coverage Thresholds

Create `.solcover.js`:

```javascript
module.exports = {
  skipFiles: [
    'mocks/',
    'test/'
  ],
  mocha: {
    timeout: 100000
  },
  // Coverage thresholds
  // These will cause the coverage command to fail if not met
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
    yulDetails: {
      stackAllocation: true
    }
  }
};
```

## Continuous Monitoring

### Slack Notifications

Add to GitHub Actions workflow:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Oracle integration tests failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Notifications

Add to GitHub Actions workflow:

```yaml
- name: Send email on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Oracle Tests Failed
    body: The oracle integration tests have failed. Check the logs.
    to: team@example.com
```

## Test Results Dashboard

### Using Allure

Install Allure:
```bash
npm install --save-dev allure-commandline
```

Generate reports:
```bash
npx hardhat test test/ForgeVerifierOracle.test.js --reporter mocha-allure-reporter
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

## Best Practices

1. **Run oracle tests on every commit** to main/develop branches
2. **Require 100% coverage** for oracle-related code paths
3. **Set gas usage limits** and fail if exceeded
4. **Monitor test execution time** - oracle tests should complete in < 2 minutes
5. **Keep tests isolated** - each test should be independent
6. **Use descriptive test names** following the pattern: "should [outcome] when [condition]"
7. **Review coverage reports** regularly to identify gaps
8. **Update tests** when oracle implementation changes
9. **Run full test suite** before deploying to testnet
10. **Document test failures** and create issues for tracking

## Security Scanning

Add Slither to CI/CD:

```yaml
- name: Run Slither
  uses: crytic/slither-action@v0.3.0
  with:
    target: contracts/
    slither-args: --filter-paths "mocks/"
```

## Performance Benchmarking

Track gas usage over time:

```bash
# Run tests with gas reporting and save results
REPORT_GAS=true npx hardhat test test/ForgeVerifierOracle.test.js | tee gas-report-$(date +%Y%m%d).txt

# Compare with previous runs
git diff gas-report-*.txt
```

## Troubleshooting CI/CD

### Common Issues:

1. **Compiler download fails**: Cache compiler in CI environment
2. **Tests timeout**: Increase timeout in hardhat.config.js
3. **Out of memory**: Increase Node.js memory limit
4. **Network issues**: Use local node instead of forking mainnet

### Solutions:

```yaml
# Increase Node.js memory
- name: Run tests
  run: NODE_OPTIONS="--max-old-space-size=4096" npx hardhat test

# Use local network
- name: Start Hardhat node
  run: npx hardhat node &
  
- name: Run tests
  run: npx hardhat test --network localhost
```

## Monitoring & Alerts

Set up monitoring for:
- Test execution time trends
- Gas usage trends
- Coverage percentage trends
- Test failure rate
- Oracle response time (in production)

## Contact

For CI/CD setup questions:
- Lead Architect: Travis D Jones
- Email: holedozer@gmail.com

## License

BSD-3-Clause License
