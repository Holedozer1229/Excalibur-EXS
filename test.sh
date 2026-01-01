#!/bin/bash
# Integration test script for Excalibur-ESX

set -e

echo "======================================"
echo "Excalibur-ESX Integration Tests"
echo "======================================"
echo ""

# Test 1: Build all components
echo "Test 1: Building all components..."
cd miners/tetra-pow-go && go build -o tetra-pow-miner && cd ../..
cd cmd/rosetta && go build && cd ../..
echo "✅ All binaries built successfully"
echo ""

# Test 2: Run unit tests
echo "Test 2: Running unit tests..."
go test ./pkg/... -v
echo "✅ All unit tests passed"
echo ""

# Test 3: Test miner commands
echo "Test 3: Testing miner CLI..."
cd miners/tetra-pow-go
./tetra-pow-miner --help > /dev/null
./tetra-pow-miner hpp1 --data "test" > /dev/null
./tetra-pow-miner benchmark --rounds 10 > /dev/null
cd ../..
echo "✅ Miner CLI works correctly"
echo ""

# Test 4: Test Rosetta commands
echo "Test 4: Testing Rosetta CLI..."
cd cmd/rosetta
./rosetta --help > /dev/null
./rosetta generate-vault --network testnet > /dev/null
./rosetta validate-address tb1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt > /dev/null
cd ../..
echo "✅ Rosetta CLI works correctly"
echo ""

# Test 5: Test Rosetta API server
echo "Test 5: Testing Rosetta API server..."
cd cmd/rosetta
nohup ./rosetta serve --port 8081 --network mainnet > /tmp/rosetta-test.log 2>&1 &
SERVER_PID=$!
sleep 2

# Test health endpoint
curl -s http://localhost:8081/health > /dev/null
echo "  ✓ Health endpoint working"

# Test network list
curl -s -X POST http://localhost:8081/network/list -d '{}' > /dev/null
echo "  ✓ Network list endpoint working"

# Test network options
curl -s -X POST http://localhost:8081/network/options -H "Content-Type: application/json" \
  -d '{"network_identifier":{"blockchain":"Excalibur-ESX","network":"mainnet"}}' > /dev/null
echo "  ✓ Network options endpoint working"

# Cleanup
kill $SERVER_PID 2>/dev/null || true
cd ../..
echo "✅ Rosetta API server works correctly"
echo ""

echo "======================================"
echo "All integration tests passed! ✅"
echo "======================================"
