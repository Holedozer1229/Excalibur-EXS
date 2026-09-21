#!/bin/bash
# ============================================================
#  EXCALcore macOS build script
#  Run this ON a Mac (Intel or Apple Silicon, macOS 11+).
#  Produces: dist/EXCALcore  (single-file universal-ish binary)
#  Optional: dist/EXCALcore.app bundle with --app-bundle below.
# ============================================================
set -e

if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] python3 not found. Install from https://www.python.org/downloads/"
    exit 1
fi

echo "[*] Installing PyInstaller..."
python3 -m pip install --upgrade pyinstaller

echo "[*] Building EXCALcore (one-file)..."
python3 -m PyInstaller --onefile --console --name EXCALcore excalcore.py

echo ""
echo "[OK] Built: dist/EXCALcore"
ls -la dist/EXCALcore
echo ""
echo "Run it:  ./dist/EXCALcore --network testnet"
echo "Console commands inside: help, status, start, stop, peers, quit"
echo ""
echo "NOTE: macOS Gatekeeper will warn on first run of an unsigned binary."
echo "Right-click -> Open, or run:  xattr -d com.apple.quarantine dist/EXCALcore"
