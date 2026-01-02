#!/bin/bash
set -e

# Excalibur-EXS Docker Entry Point

echo "🔮 Starting Excalibur-EXS..."
echo "================================"

# Set environment
export PYTHONPATH=/app/pkg:$PYTHONPATH

# Check if data directories exist
mkdir -p /app/data /app/logs

# Print system info
echo "Environment: ${EXCALIBUR_ENV}"
echo "Difficulty: ${DIFFICULTY}"
echo "Port: ${PORT}"
echo ""

# Check if Rosetta binary exists
if [ -f /usr/local/bin/rosetta ]; then
    echo "✓ Rosetta API: Ready"
else
    echo "⚠ Rosetta API: Not found"
fi

# Check if Python modules exist
if [ -d /app/pkg ]; then
    echo "✓ Python modules: Ready"
else
    echo "⚠ Python modules: Not found"
fi

# Check if web assets exist
if [ -d /app/web ]; then
    echo "✓ Web assets: Ready"
else
    echo "⚠ Web assets: Not found"
fi

echo ""
echo "🚀 Starting services..."
echo ""

# Execute command
exec "$@"
