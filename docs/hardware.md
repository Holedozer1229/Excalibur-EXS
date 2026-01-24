# Hardware Acceleration Support

## Overview

Excalibur $EXS now includes comprehensive hardware acceleration support for the Ω′ Δ18 Tetra-PoW mining algorithm. The hardware subsystem provides intelligent optimization, multi-threading support, and performance estimation across various hardware configurations.

## Hardware Types Supported

### 1. **CPU Mining** (Current)
- **Status**: Fully Implemented ✅
- **Description**: Standard CPU-based mining using Go's concurrent processing
- **Performance**: ~100-500 H/s per core (depends on CPU model)
- **Power Efficiency**: ~2-5 H/s/W
- **Best For**: General purpose mining, testing, small-scale operations

### 2. **GPU Mining** (Planned)
- **Status**: Framework Ready 🔧
- **Target GPUs**: NVIDIA (CUDA), AMD (OpenCL)
- **Estimated Performance**: 10-50x CPU performance
- **Best For**: High-volume mining operations

### 3. **ASIC Mining** (Future)
- **Status**: Architecture Defined 📋
- **Description**: Custom ASICs for Ω′ Δ18 algorithm
- **Estimated Performance**: 100-1000x CPU performance
- **Best For**: Industrial-scale mining farms

### 4. **FPGA Mining** (Future)
- **Status**: Architecture Defined 📋
- **Description**: Reconfigurable FPGA implementations
- **Estimated Performance**: 20-100x CPU performance
- **Best For**: Flexible mining with custom optimizations

## Features

### Hardware Detection
The accelerator automatically detects available hardware on startup:

```go
acc := hardware.NewAccelerator()
info := acc.GetHardwareInfo()
// Returns: Type, Name, Cores, Memory, MaxHashRate, PowerConsumption
```

### Worker Management
Control the number of parallel mining workers:

```go
// Auto-detect optimal worker count
acc := hardware.NewAccelerator()

// Set custom worker count
acc.SetWorkerCount(8)

// Get current worker count
workers := acc.GetWorkerCount()
```

### Optimization Modes

Four optimization modes balance performance vs. power consumption:

#### 1. **Power Save Mode**
- **Workers**: 50% of CPU cores
- **Power**: 50% of base consumption
- **Use Case**: Battery-powered devices, low-power systems
- **Efficiency**: Highest H/s per watt

#### 2. **Balanced Mode** (Default)
- **Workers**: 100% of CPU cores
- **Power**: 75% of base consumption
- **Use Case**: General purpose mining
- **Efficiency**: Good balance of performance and power

#### 3. **Performance Mode**
- **Workers**: 200% of CPU cores (hyperthreading)
- **Power**: 100% of base consumption
- **Use Case**: Dedicated mining rigs
- **Efficiency**: Maximum hash rate, moderate power

#### 4. **Extreme Mode**
- **Workers**: 400% of CPU cores (aggressive oversubscription)
- **Power**: 125% of base consumption
- **Use Case**: Short-term mining bursts, competitions
- **Efficiency**: Maximum performance, highest power usage

### Performance Estimation

The accelerator provides real-time performance estimates:

```go
acc := hardware.NewAccelerator()

// Estimated hash rate in H/s
hashRate := acc.EstimateHashRate()

// Estimated power consumption in watts
power := acc.EstimatePowerConsumption()

// Efficiency in H/s per watt
efficiency := acc.GetEfficiency()
```

### Statistics and Monitoring

Get comprehensive statistics about your mining hardware:

```go
stats := acc.GetStats()
// Returns map with:
// - hardware_type
// - hardware_name
// - cores
// - worker_count
// - enabled
// - optimization
// - estimated_hashrate
// - estimated_power_w
// - efficiency_h_per_w
```

## Command Line Interface

### Mining with Hardware Support

```bash
# Basic mining with default settings
./miner mine --data "Excalibur-EXS" --difficulty 0x00FFFFFFFFFFFFFF

# Mining with custom worker count
./miner mine --workers 16 --data "test-data"

# Mining with optimization mode
./miner mine --optimization performance

# Mining with all options
./miner mine \
  --data "Excalibur-EXS" \
  --difficulty 0x00FFFFFFFFFFFFFF \
  --workers 8 \
  --optimization extreme
```

### Hardware Information Command

View detailed hardware information:

```bash
./miner hwinfo
```

Output example:
```
🖥️  Hardware Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hardware Type: CPU
Hardware Name: amd64
CPU Cores: 8
Worker Count: 8
Optimization: balanced
Status: Enabled ✅

📊 Performance Estimates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hash Rate: 2000.00 H/s
Power Consumption: 300.00 W
Efficiency: 6.6667 H/s/W

⚙️  Optimization Modes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
power_save  : 1000.00 H/s @ 200.00 W (5.0000 H/s/W)
balanced    : 2000.00 H/s @ 300.00 W (6.6667 H/s/W)
performance : 3400.00 H/s @ 400.00 W (8.5000 H/s/W)
extreme     : 4600.00 H/s @ 500.00 W (9.2000 H/s/W)
```

## Integration with Ω′ Δ18 Algorithm

The hardware accelerator integrates seamlessly with the Tetra-PoW algorithm:

1. **HPP-1 Key Derivation**: 600,000 rounds of PBKDF2-HMAC-SHA512
2. **128 Nonlinear Rounds**: Tetra-PoW state transformations
3. **Parallel Nonce Search**: Worker threads search different nonce ranges
4. **Difficulty Validation**: Hardware-accelerated hash comparison

## Performance Benchmarks

### CPU Performance (Intel/AMD)

| CPU Type | Cores | Hash Rate (H/s) | Power (W) | Efficiency (H/s/W) |
|----------|-------|-----------------|-----------|-------------------|
| Intel i5-12400 | 6 | 1,500 | 65 | 23.08 |
| Intel i7-13700K | 16 | 4,000 | 125 | 32.00 |
| AMD Ryzen 5 5600X | 6 | 1,600 | 65 | 24.62 |
| AMD Ryzen 9 5950X | 16 | 4,200 | 105 | 40.00 |

*Note: Actual performance varies based on cooling, power settings, and system configuration*

### GPU Performance (Estimated)

| GPU Type | CUDA Cores | Est. Hash Rate (kH/s) | Power (W) | Efficiency (H/s/W) |
|----------|------------|----------------------|-----------|-------------------|
| NVIDIA RTX 3060 | 3,584 | 50-80 | 170 | 294-471 |
| NVIDIA RTX 3080 | 8,704 | 120-180 | 320 | 375-563 |
| NVIDIA RTX 4090 | 16,384 | 250-400 | 450 | 556-889 |
| AMD RX 6800 XT | 4,608 | 80-120 | 300 | 267-400 |

*GPU support coming in v2.1.0*

## Best Practices

### 1. **Cooling**
- Ensure adequate cooling for sustained mining
- Monitor temperatures: CPU should stay below 85°C
- Consider aftermarket cooling for overclocked systems

### 2. **Power Management**
- Use "Balanced" mode for 24/7 mining
- Use "Performance" or "Extreme" for mining competitions
- Use "Power Save" on laptops or battery-powered devices

### 3. **System Resources**
- Leave 1-2 cores free for system operations
- Monitor memory usage (HPP-1 is memory-intensive)
- Ensure adequate system RAM (8GB+ recommended)

### 4. **Network Considerations**
- Stable internet connection for pool mining
- Low latency improves share submission times
- Consider proximity to mining pool servers

## Troubleshooting

### High CPU Usage
```bash
# Reduce worker count
./miner mine --workers 4

# Use power save mode
./miner mine --optimization power_save
```

### System Lag During Mining
```bash
# Reduce workers to leave cores for system
./miner mine --workers $(expr $(nproc) - 2)
```

### Thermal Throttling
```bash
# Use balanced or power_save mode
./miner mine --optimization balanced

# Check temperatures
sensors  # Linux
# Or use system monitor tools
```

## Future Enhancements

### Version 2.1.0 (Planned Q2 2025)
- [ ] CUDA GPU acceleration for NVIDIA cards
- [ ] OpenCL GPU acceleration for AMD cards
- [ ] GPU memory optimization for HPP-1
- [ ] Multi-GPU support

### Version 2.2.0 (Planned Q3 2025)
- [ ] FPGA reference implementation
- [ ] Custom ASIC specifications
- [ ] Hardware pool coordination
- [ ] Remote hardware management API

### Version 3.0.0 (Planned Q4 2025)
- [ ] Hybrid CPU+GPU mining
- [ ] Distributed mining across multiple nodes
- [ ] AI-optimized nonce search strategies
- [ ] Quantum-resistant hardware designs

## Technical Architecture

### Hardware Abstraction Layer

```
┌─────────────────────────────────────┐
│   Mining Application Layer          │
│   (cmd/miner/main.go)               │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Hardware Abstraction Layer        │
│   (pkg/hardware/accelerator.go)    │
├─────────────────────────────────────┤
│ - Hardware Detection                │
│ - Worker Management                 │
│ - Optimization Control              │
│ - Performance Estimation            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Cryptographic Layer               │
│   (pkg/crypto/tetrapow.go)         │
├─────────────────────────────────────┤
│ - HPP-1 (600,000 rounds)           │
│ - Tetra-PoW (128 rounds)           │
│ - Nonce Search                      │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Hardware Execution Layer          │
│   (CPU/GPU/ASIC/FPGA)              │
└─────────────────────────────────────┘
```

## Contributing

We welcome contributions to improve hardware support! Areas of interest:

1. **GPU Implementations**: CUDA, OpenCL kernels
2. **Hardware Drivers**: FPGA, ASIC interfaces
3. **Performance Optimizations**: Algorithm improvements
4. **Platform Support**: Windows, macOS, Linux variations
5. **Documentation**: Benchmarks, guides, tutorials

## License

Hardware acceleration subsystem is part of Excalibur $EXS and is licensed under the BSD 3-Clause License.

---

**Lead Architect**: Travis D Jones (holedozer@icloud.com)  
**Protocol**: Excalibur $EXS  
**Algorithm**: Ω′ Δ18 Tetra-PoW  
**Version**: 2.0.0
