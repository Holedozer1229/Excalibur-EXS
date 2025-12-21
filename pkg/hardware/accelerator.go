package hardware

import (
	"fmt"
	"runtime"
	"sync"
)

// HardwareType represents the type of mining hardware
type HardwareType int

const (
	// CPU represents standard CPU mining
	CPU HardwareType = iota
	// GPU represents GPU-accelerated mining
	GPU
	// ASIC represents ASIC hardware mining
	ASIC
	// FPGA represents FPGA hardware mining
	FPGA
)

// String returns the string representation of HardwareType
func (h HardwareType) String() string {
	switch h {
	case CPU:
		return "CPU"
	case GPU:
		return "GPU"
	case ASIC:
		return "ASIC"
	case FPGA:
		return "FPGA"
	default:
		return "Unknown"
	}
}

// HardwareInfo contains information about the mining hardware
type HardwareInfo struct {
	Type             HardwareType
	Name             string
	Cores            int
	Memory           uint64 // In bytes
	ComputeUnits     int
	MaxHashRate      float64 // Estimated H/s
	PowerConsumption float64 // Estimated watts
	Supported        bool
}

// Accelerator manages hardware acceleration for mining
type Accelerator struct {
	mu            sync.RWMutex
	hardwareInfo  HardwareInfo
	workerCount   int
	enabled       bool
	optimization  string
}

// NewAccelerator creates a new hardware accelerator
func NewAccelerator() *Accelerator {
	return &Accelerator{
		hardwareInfo: DetectHardware(),
		workerCount:  runtime.NumCPU(),
		enabled:      true,
		optimization: "balanced",
	}
}

// DetectHardware detects available mining hardware
func DetectHardware() HardwareInfo {
	info := HardwareInfo{
		Type:        CPU,
		Name:        runtime.GOARCH,
		Cores:       runtime.NumCPU(),
		Memory:      0, // Would need platform-specific code
		Supported:   true,
	}

	// Estimate hash rate based on CPU cores
	// Ω′ Δ18 is compute-intensive: ~100-500 H/s per core typical
	info.MaxHashRate = float64(info.Cores) * 250.0
	
	// Estimate power: ~50W per core at full load
	info.PowerConsumption = float64(info.Cores) * 50.0

	return info
}

// GetHardwareInfo returns information about the detected hardware
func (a *Accelerator) GetHardwareInfo() HardwareInfo {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.hardwareInfo
}

// SetWorkerCount sets the number of parallel workers
func (a *Accelerator) SetWorkerCount(count int) error {
	if count < 1 {
		return fmt.Errorf("worker count must be at least 1")
	}
	
	a.mu.Lock()
	defer a.mu.Unlock()
	
	maxWorkers := a.hardwareInfo.Cores * 2
	if count > maxWorkers {
		count = maxWorkers
	}
	
	a.workerCount = count
	return nil
}

// GetWorkerCount returns the current number of workers
func (a *Accelerator) GetWorkerCount() int {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.workerCount
}

// Enable enables hardware acceleration
func (a *Accelerator) Enable() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.enabled = true
}

// Disable disables hardware acceleration
func (a *Accelerator) Disable() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.enabled = false
}

// IsEnabled returns whether hardware acceleration is enabled
func (a *Accelerator) IsEnabled() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.enabled
}

// SetOptimization sets the optimization mode
// Modes: "power_save", "balanced", "performance", "extreme"
func (a *Accelerator) SetOptimization(mode string) error {
	validModes := map[string]bool{
		"power_save":  true,
		"balanced":    true,
		"performance": true,
		"extreme":     true,
	}
	
	if !validModes[mode] {
		return fmt.Errorf("invalid optimization mode: %s", mode)
	}
	
	a.mu.Lock()
	defer a.mu.Unlock()
	a.optimization = mode
	
	// Adjust worker count based on optimization
	switch mode {
	case "power_save":
		a.workerCount = a.hardwareInfo.Cores / 2
		if a.workerCount < 1 {
			a.workerCount = 1
		}
	case "balanced":
		a.workerCount = a.hardwareInfo.Cores
	case "performance":
		a.workerCount = a.hardwareInfo.Cores * 2
	case "extreme":
		a.workerCount = a.hardwareInfo.Cores * 4
	}
	
	return nil
}

// GetOptimization returns the current optimization mode
func (a *Accelerator) GetOptimization() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.optimization
}

// EstimateHashRate estimates the hash rate for the current configuration
func (a *Accelerator) EstimateHashRate() float64 {
	a.mu.RLock()
	defer a.mu.RUnlock()
	
	if !a.enabled {
		return 0
	}
	
	baseRate := a.hardwareInfo.MaxHashRate
	workerRatio := float64(a.workerCount) / float64(a.hardwareInfo.Cores)
	
	// Apply diminishing returns for oversubscription
	var efficiency float64
	if workerRatio <= 1.0 {
		efficiency = workerRatio
	} else if workerRatio <= 2.0 {
		efficiency = 1.0 + (workerRatio-1.0)*0.7
	} else {
		efficiency = 1.7 + (workerRatio-2.0)*0.3
	}
	
	return baseRate * efficiency
}

// EstimatePowerConsumption estimates power consumption in watts
func (a *Accelerator) EstimatePowerConsumption() float64 {
	a.mu.RLock()
	defer a.mu.RUnlock()
	
	if !a.enabled {
		return 0
	}
	
	basePower := a.hardwareInfo.PowerConsumption
	workerRatio := float64(a.workerCount) / float64(a.hardwareInfo.Cores)
	
	// Power scales with worker utilization
	powerMultiplier := workerRatio
	
	// Add optimization-based power adjustments
	switch a.optimization {
	case "power_save":
		powerMultiplier *= 0.8 // More efficient power usage
	case "balanced":
		powerMultiplier *= 0.9 // Slightly more efficient
	case "performance":
		powerMultiplier *= 1.0 // Standard efficiency
	case "extreme":
		powerMultiplier *= 1.15 // Less efficient due to thermal/voltage overhead
	}
	
	return basePower * powerMultiplier
}

// GetEfficiency returns the estimated efficiency (H/s per watt)
func (a *Accelerator) GetEfficiency() float64 {
	hashRate := a.EstimateHashRate()
	power := a.EstimatePowerConsumption()
	
	if power == 0 {
		return 0
	}
	
	return hashRate / power
}

// GetStats returns comprehensive statistics about the accelerator
func (a *Accelerator) GetStats() map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()
	
	return map[string]interface{}{
		"hardware_type":       a.hardwareInfo.Type.String(),
		"hardware_name":       a.hardwareInfo.Name,
		"cores":               a.hardwareInfo.Cores,
		"worker_count":        a.workerCount,
		"enabled":             a.enabled,
		"optimization":        a.optimization,
		"estimated_hashrate":  a.EstimateHashRate(),
		"estimated_power_w":   a.EstimatePowerConsumption(),
		"efficiency_h_per_w":  a.GetEfficiency(),
	}
}
