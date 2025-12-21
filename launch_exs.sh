#!/bin/bash
# ======================================================
# EXS Genesis Taproot Blockchain Full Launch Script
# Author: Travis D. Jones
# Description: Bootstraps node, miners, treasury, dashboards,
# Rosetta API, Lancelot Guardian, and mobile apps
# ======================================================

set -e
echo "🚀 Starting EXS Genesis Taproot blockchain launch..."

# ---------------------------
# 1️⃣ Clone / Update Repo
# ---------------------------
if [ ! -d "Excalibur-EXS" ]; then
  echo "Cloning EXS repo..."
  git clone https://github.com/holedozer1229/Excalibur-EXS.git
fi
cd Excalibur-EXS
git pull origin main

# ---------------------------
# 2️⃣ Install Dependencies
# ---------------------------
echo "Installing dependencies..."
# Go
if ! command -v go &> /dev/null; then
  echo "Go not found, please install Go 1.20+"
  exit 1
fi

# Python
if ! command -v python3 &> /dev/null; then
  echo "Python3 not found, please install Python 3.11+"
  exit 1
fi
pip3 install -r cmd/miner/diceminer/requirements.txt

# Node.js for web & mobile
if ! command -v npm &> /dev/null; then
  echo "Node.js not found, please install Node.js 18+"
  exit 1
fi

# ---------------------------
# 3️⃣ Generate / Verify Genesis Block
# ---------------------------
echo "Generating Genesis block..."
go run cmd/rosetta/genesis.go --init

echo "Validating Genesis block..."
go run cmd/rosetta/validate_genesis.go

# ---------------------------
# 4️⃣ Start EXS Node
# ---------------------------
echo "Launching EXS full node..."
gnome-terminal -- bash -c "go run cmd/rosetta/node.go --network=mainnet; exec bash"

# ---------------------------
# 5️⃣ Start Tetra-PoW Miner
# ---------------------------
echo "Starting Tetra-PoW miner..."
gnome-terminal -- bash -c "go run cmd/miner/main.go mine --axiom='sword legend pull magic kingdom artist stone destroy forget fire steel honey question'; exec bash"

# ---------------------------
# 6️⃣ Start Dice-Roll Miner
# ---------------------------
echo "Starting Dice-Roll miner..."
gnome-terminal -- bash -c "cd cmd/miner/diceminer; python3 mine.py --axiom='sword legend pull magic kingdom artist stone destroy forget fire steel honey question'; exec bash"

# ---------------------------
# 7️⃣ Treasury Scheduler
# ---------------------------
echo "Configuring treasury..."
go run pkg/economy/treasury.go --setup

# ---------------------------
# 8️⃣ Start Rosetta API
# ---------------------------
echo "Launching Rosetta API server..."
gnome-terminal -- bash -c "cd cmd/rosetta; go run server.go; exec bash"

# ---------------------------
# 9️⃣ Launch Web Dashboard
# ---------------------------
echo "Starting Forge Web Dashboard..."
gnome-terminal -- bash -c "cd web/forge-ui; npm install; npm run dev; exec bash"

# ---------------------------
# 🔟 Launch Mobile App (Optional)
# ---------------------------
echo "Launching Mobile App (React Native)..."
gnome-terminal -- bash -c "cd mobile-app; npm install; npm run ios; exec bash"

# ---------------------------
# 1️⃣1️⃣ Start Lancelot Guardian
# ---------------------------
echo "Starting Lancelot Guardian..."
gnome-terminal -- bash -c "go run cmd/lancelot/guardian.go; exec bash"

# ---------------------------
# ✅ Launch Complete
# ---------------------------
echo "🎉 EXS Blockchain, Miners, Treasury, Dashboards, Rosetta, and Lancelot Guardian are now live!"
echo "Visit http://localhost:3000/knights-round-table for the web dashboard."
