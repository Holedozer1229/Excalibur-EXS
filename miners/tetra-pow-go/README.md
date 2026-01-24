# Tetra-PoW Miner (Go)

High-performance production miner for Excalibur-EXS ($EXS) implementing the **Ω′ Δ18 Tetra-PoW** algorithm with 128-round nonlinear hash computations and HPP-1 quantum hardening.

## Features

- ⚡ **High Performance:** Optimized Go implementation with SIMD and multi-threading
- 🔧 **Hardware Acceleration:** Automatic detection and utilization of CPU features
- 🎛️ **Optimization Modes:** Power save, balanced, performance, and extreme modes
- 🌐 **HTTP API Server:** RESTful API for web integration
- 📊 **Statistics:** Real-time mining statistics and hardware monitoring
- 🔐 **Quantum Hardened:** 600,000 PBKDF2-HMAC-SHA512 iterations (HPP-1)

## Installation

### Prerequisites
- Go 1.19 or higher
- 2GB+ RAM
- Multi-core CPU (4+ cores recommended)

### Build from Source

```bash
cd miners/tetra-pow-go
go build -o tetra-pow-miner
```

For optimized build:
```bash
go build -ldflags="-s -w" -o tetra-pow-miner
```

## Usage

### CLI Mining

Basic mining:
```bash
./tetra-pow-miner mine --data "Excalibur-EXS" --difficulty 4
```

With the canonical axiom:
```bash
./tetra-pow-miner mine \
  --data "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4
```

Advanced options:
```bash
./tetra-pow-miner mine \
  --data "Excalibur-EXS" \
  --difficulty 4 \
  --workers 8 \
  --optimization extreme
```

### HPP-1 Key Derivation

Run quantum-hardened key derivation:
```bash
./tetra-pow-miner hpp1 --data "test-data"
```

### Benchmarking

Test mining performance:
```bash
./tetra-pow-miner benchmark --rounds 1000
```

### Hardware Information

Display detailed hardware info and optimization recommendations:
```bash
./tetra-pow-miner hwinfo
```

### HTTP API Server

The `main.go` in this directory can also run as an HTTP API server:

```bash
go run main.go \
  --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
  --difficulty 4 \
  --port 8082
```

API endpoints:
- `GET /health` - Health check
- `POST /mine` - Submit mining request
- `GET /stats` - Get mining statistics
- `GET /config` - Get current configuration

Example mining request:
```bash
curl -X POST http://localhost:8082/mine \
  -H "Content-Type: application/json" \
  -d '{"nonce": 0, "timestamp": 1234567890}'
```

## Configuration

### Command-Line Options

#### `mine` command
- `--data, -i` - Input data to mine (default: "Excalibur-EXS")
- `--difficulty, -d` - Mining difficulty target (default: 0x00FFFFFFFFFFFFFF)
- `--workers, -w` - Number of worker threads (0 = auto)
- `--optimization, -o` - Optimization mode: power_save, balanced, performance, extreme

#### `hpp1` command
- `--data, -i` - Input data for key derivation

#### `benchmark` command
- `--rounds, -r` - Number of benchmark rounds (default: 1000)

#### Server mode
- `--axiom` - 13-word Arthurian axiom
- `--difficulty` - Mining difficulty (default: 4)
- `--treasury` - Treasury API URL (default: http://localhost:8080)
- `--rosetta` - Rosetta API URL (default: http://localhost:8081)
- `--port` - HTTP API port (default: 8082)

### Optimization Modes

| Mode | Hash Rate | Power Consumption | Best For |
|------|-----------|-------------------|----------|
| `power_save` | Low | 50-70W | Battery-powered, quiet operation |
| `balanced` | Medium | 80-120W | Daily mining, efficiency focus |
| `performance` | High | 150-200W | Maximum mining, AC power |
| `extreme` | Very High | 250W+ | Competition mining, cooling required |

## Performance

### Expected Hash Rates

| CPU | Cores | Mode | Hash Rate |
|-----|-------|------|-----------|
| Intel i5 (10th gen) | 6 | balanced | 45-55 H/s |
| Intel i7 (10th gen) | 8 | balanced | 70-85 H/s |
| Intel i9 (10th gen) | 10 | performance | 110-130 H/s |
| AMD Ryzen 5 5600X | 6 | balanced | 60-75 H/s |
| AMD Ryzen 7 5800X | 8 | balanced | 90-110 H/s |
| AMD Ryzen 9 5950X | 16 | performance | 180-220 H/s |

### Optimization Tips

1. **Worker Count:** Set to number of physical cores for best results
   ```bash
   ./tetra-pow-miner mine --workers 8
   ```

2. **CPU Affinity:** Pin to specific cores to reduce cache thrashing
   ```bash
   taskset -c 0-7 ./tetra-pow-miner mine
   ```

3. **Priority:** Run with higher priority (requires sudo)
   ```bash
   sudo nice -n -10 ./tetra-pow-miner mine
   ```

4. **Cooling:** Ensure adequate cooling for sustained high performance

## Integration

### With Web UI

The Knights' Round Table web interface uses this miner via the HTTP API:

```javascript
// In web/knights-round-table/forge.js
const response = await fetch('http://localhost:8082/mine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nonce: startNonce,
    timestamp: Date.now()
  })
});
```

### With Forge API

The Forge API (`cmd/forge-api/app.py`) can integrate with this miner for backend mining operations.

### With Treasury System

Mining rewards are automatically split:
- 85% to miner (42.5 $EXS)
- 15% to treasury (7.5 $EXS)

## Architecture

### Files

- `main.go` - CLI entry point with Cobra commands (or HTTP server mode)
- `miner.go` - Core mining engine with Tetra-PoW implementation
- `config.go` - Configuration structures and defaults

### Dependencies

- `github.com/Holedozer1229/Excalibur-EXS/pkg/crypto` - Cryptographic primitives
- `github.com/Holedozer1229/Excalibur-EXS/pkg/hardware` - Hardware acceleration
- `github.com/spf13/cobra` - CLI framework
- `github.com/gorilla/mux` - HTTP routing (for server mode)

## Testing

Run Go tests:
```bash
go test -v
```

Run benchmark suite:
```bash
go test -bench=. -benchmem
```

## Troubleshooting

### Build Issues

**Error:** `cannot find package`
```bash
# Ensure Go modules are initialized
go mod download
go mod verify
```

**Error:** `undefined: crypto.TetraPoW`
```bash
# Build from repository root
cd /path/to/Excalibur-EXS
go build -o miners/tetra-pow-go/tetra-pow-miner ./miners/tetra-pow-go
```

### Performance Issues

**Low hash rate:**
- Check CPU thermal throttling: `sensors` or Task Manager
- Verify optimization mode: `./tetra-pow-miner hwinfo`
- Increase worker count: `--workers 16`

**High power consumption:**
- Use lower optimization mode: `--optimization balanced`
- Reduce worker count: `--workers 4`

### Mining Failures

**No valid blocks found:**
- Lower difficulty: `--difficulty 3`
- Verify axiom is correct
- Check logs for errors

## Development

### Adding New Features

1. Modify source files in this directory
2. Rebuild: `go build`
3. Test changes: `go test -v`
4. Submit pull request

### Code Style

Follow standard Go conventions:
- `gofmt` formatting
- `golint` for style checks
- Comments for exported functions

## License

BSD 3-Clause License - See [LICENSE](../../LICENSE)

## Support

- **Issues:** [GitHub Issues](https://github.com/Holedozer1229/Excalibur-EXS/issues)
- **Email:** holedozer@icloud.com
- **Main Documentation:** [Miners README](../README.md)

---

⚔️ **"Whosoever pulls this sword from this stone shall be rightwise king."**
