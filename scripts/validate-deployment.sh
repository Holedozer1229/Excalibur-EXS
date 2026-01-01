#!/bin/bash
# Deployment Validation Script for Excalibur $EXS Protocol
# This script validates that all necessary files and configurations are in place

set -e

echo "======================================"
echo "Excalibur $EXS Deployment Validation"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

# Check function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ((ERRORS++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "=== Checking Core Files ==="
check_file "README.md"
check_file "LICENSE"
check_file ".gitignore"
check_file "go.mod"
check_file "go.sum"
echo ""

echo "=== Checking Website Files ==="
check_dir "website"
check_file "website/index.html"
check_file "website/assets/css/main.css"
check_file "website/assets/js/main.js"
echo ""

echo "=== Checking Knights' Round Table ==="
check_dir "web/knights-round-table"
check_file "web/knights-round-table/index.html"
check_file "web/knights-round-table/forge.js"
check_file "web/knights-round-table/styles.css"
echo ""

echo "=== Checking Merlin's Portal ==="
check_dir "admin/merlins-portal"
check_file "admin/merlins-portal/index.html"
check_file "admin/merlins-portal/dashboard.js"
check_file "admin/merlins-portal/styles.css"
echo ""

echo "=== Checking Mobile App ==="
check_dir "mobile-app"
check_file "mobile-app/package.json"
check_file "mobile-app/app.json"
check_file "mobile-app/index.js"
check_file "mobile-app/src/App.js"
echo ""

echo "=== Checking Go Packages ==="
check_dir "pkg/bitcoin"
check_dir "pkg/crypto"
check_dir "pkg/economy"
check_dir "miners/tetra-pow-go"
check_dir "cmd/rosetta"
echo ""

echo "=== Checking Documentation ==="
check_file "DEPLOY.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "PRODUCTION_TODO.md"
check_file "SETUP.md"
echo ""

echo "=== Checking Deployment Configs ==="
check_file "docker-compose.yml"
check_file "vercel.json"
check_file ".env.example"
echo ""

echo "=== Running Go Build Tests ==="
if go build ./miners/tetra-pow-go > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Miner builds successfully"
else
    echo -e "${RED}✗${NC} Miner build failed"
    ((ERRORS++))
fi

if go build ./cmd/rosetta > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Rosetta builds successfully"
else
    echo -e "${RED}✗${NC} Rosetta build failed"
    ((ERRORS++))
fi
echo ""

echo "=== Checking for Common Issues ==="

# Check for console.log in production files
if grep -r "console\.log" web/knights-round-table/forge.js > /dev/null 2>&1; then
    warn "console.log found in forge.js (should be removed for production)"
fi

if grep -r "console\.log" admin/merlins-portal/dashboard.js > /dev/null 2>&1; then
    warn "console.log found in dashboard.js (should be removed for production)"
fi

# Check for hardcoded passwords
if grep -ri "password.*=.*\"" . --include="*.js" --include="*.html" --exclude-dir=node_modules > /dev/null 2>&1; then
    warn "Potential hardcoded passwords found - review before production"
fi

echo ""
echo "======================================"
echo "Validation Summary"
echo "======================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "The deployment looks good."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Review warnings before deploying to production."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo "Fix errors before deploying."
    exit 1
fi
