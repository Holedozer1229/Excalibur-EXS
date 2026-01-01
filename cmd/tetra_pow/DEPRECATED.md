# DEPRECATED

This directory has been moved to `miners/tetra-pow-go/` for better organization.

## New Location

The HTTP API server version of Tetra-PoW miner has been consolidated with the CLI version in:

**New Location:** `miners/tetra-pow-go/`

The CLI version (from `cmd/miner/`) is the production-ready implementation. The HTTP server functionality should be integrated into `cmd/forge-api/` for web-based mining operations.

## Recommended Approach

For production mining, use the CLI miner:
```bash
cd miners/tetra-pow-go
go build -o tetra-pow-miner
./tetra-pow-miner mine --data "Excalibur-EXS"
```

For web/API integration, use the Forge API:
```bash
cd cmd/forge-api
python3 app.py
```

The Forge API (`cmd/forge-api/app.py`) now imports from `miners/tetra-pow-python/` and provides HTTP endpoints for web-based mining.

## Backward Compatibility

This directory is kept for backward compatibility but may be removed in a future release. Please update your scripts and workflows to use the new `miners/` directory structure.

See [`miners/README.md`](../../miners/README.md) for complete documentation.
