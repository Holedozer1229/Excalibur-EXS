package hardware

import (
	"runtime"
	"testing"
)

func TestNewAccelerator(t *testing.T) {
	acc := NewAccelerator()
	
	if acc == nil {
		t.Fatal("NewAccelerator returned nil")
	}
	
	if !acc.IsEnabled() {
		t.Error("Accelerator should be enabled by default")
	}
	
	if acc.GetOptimization() != "balanced" {
		t.Errorf("Expected default optimization 'balanced', got '%s'", acc.GetOptimization())
	}
	
	if acc.GetWorkerCount() != runtime.NumCPU() {
		t.Errorf("Expected worker count %d, got %d", runtime.NumCPU(), acc.GetWorkerCount())
	}
}

func TestDetectHardware(t *testing.T) {
	info := DetectHardware()
	
	if info.Type != CPU {
		t.Errorf("Expected hardware type CPU, got %s", info.Type.String())
	}
	
	if info.Cores != runtime.NumCPU() {
		t.Errorf("Expected %d cores, got %d", runtime.NumCPU(), info.Cores)
	}
	
	if !info.Supported {
		t.Error("Hardware should be supported")
	}
	
	if info.MaxHashRate <= 0 {
		t.Error("MaxHashRate should be positive")
	}
	
	if info.PowerConsumption <= 0 {
		t.Error("PowerConsumption should be positive")
	}
}

func TestHardwareTypeString(t *testing.T) {
	tests := []struct {
		hwType   HardwareType
		expected string
	}{
		{CPU, "CPU"},
		{GPU, "GPU"},
		{ASIC, "ASIC"},
		{FPGA, "FPGA"},
		{HardwareType(999), "Unknown"},
	}
	
	for _, tt := range tests {
		result := tt.hwType.String()
		if result != tt.expected {
			t.Errorf("Expected %s, got %s", tt.expected, result)
		}
	}
}

func TestSetWorkerCount(t *testing.T) {
	acc := NewAccelerator()
	
	// Test setting valid worker count
	err := acc.SetWorkerCount(4)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	
	if acc.GetWorkerCount() != 4 {
		t.Errorf("Expected worker count 4, got %d", acc.GetWorkerCount())
	}
	
	// Test invalid worker count (< 1)
	err = acc.SetWorkerCount(0)
	if err == nil {
		t.Error("Expected error for worker count 0")
	}
	
	// Test capping at max workers
	maxWorkers := acc.hardwareInfo.Cores * 2
	err = acc.SetWorkerCount(maxWorkers + 100)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	
	if acc.GetWorkerCount() != maxWorkers {
		t.Errorf("Expected worker count capped at %d, got %d", maxWorkers, acc.GetWorkerCount())
	}
}

func TestEnableDisable(t *testing.T) {
	acc := NewAccelerator()
	
	// Should be enabled by default
	if !acc.IsEnabled() {
		t.Error("Accelerator should be enabled by default")
	}
	
	// Disable
	acc.Disable()
	if acc.IsEnabled() {
		t.Error("Accelerator should be disabled")
	}
	
	// Enable
	acc.Enable()
	if !acc.IsEnabled() {
		t.Error("Accelerator should be enabled")
	}
}

func TestSetOptimization(t *testing.T) {
	acc := NewAccelerator()
	
	tests := []struct {
		mode          string
		expectError   bool
		checkWorkers  bool
		expectedRatio float64
	}{
		{"power_save", false, true, 0.5},
		{"balanced", false, true, 1.0},
		{"performance", false, true, 2.0},
		{"extreme", false, true, 4.0},
		{"invalid", true, false, 0},
	}
	
	cores := acc.hardwareInfo.Cores
	
	for _, tt := range tests {
		err := acc.SetOptimization(tt.mode)
		
		if tt.expectError {
			if err == nil {
				t.Errorf("Expected error for mode '%s'", tt.mode)
			}
			continue
		}
		
		if err != nil {
			t.Errorf("Unexpected error for mode '%s': %v", tt.mode, err)
			continue
		}
		
		if acc.GetOptimization() != tt.mode {
			t.Errorf("Expected optimization '%s', got '%s'", tt.mode, acc.GetOptimization())
		}
		
		if tt.checkWorkers {
			expectedWorkers := int(float64(cores) * tt.expectedRatio)
			if expectedWorkers < 1 {
				expectedWorkers = 1
			}
			if acc.GetWorkerCount() != expectedWorkers {
				t.Errorf("For mode '%s', expected %d workers, got %d", 
					tt.mode, expectedWorkers, acc.GetWorkerCount())
			}
		}
	}
}

func TestEstimateHashRate(t *testing.T) {
	acc := NewAccelerator()
	
	// Should have positive hash rate when enabled
	hashRate := acc.EstimateHashRate()
	if hashRate <= 0 {
		t.Error("Hash rate should be positive when enabled")
	}
	
	// Should be zero when disabled
	acc.Disable()
	hashRate = acc.EstimateHashRate()
	if hashRate != 0 {
		t.Error("Hash rate should be zero when disabled")
	}
	
	// Re-enable and test different optimizations
	acc.Enable()
	optimizations := []string{"power_save", "balanced", "performance", "extreme"}
	var prevRate float64 = 0
	
	for _, opt := range optimizations {
		acc.SetOptimization(opt)
		rate := acc.EstimateHashRate()
		
		if rate <= 0 {
			t.Errorf("Hash rate should be positive for optimization '%s'", opt)
		}
		
		// Each optimization level should generally increase hash rate
		// (though this may not be strictly true due to diminishing returns)
		if opt != "power_save" && rate < prevRate {
			t.Logf("Warning: Hash rate decreased from %f to %f for %s", prevRate, rate, opt)
		}
		
		prevRate = rate
	}
}

func TestEstimatePowerConsumption(t *testing.T) {
	acc := NewAccelerator()
	
	// Should have positive power consumption when enabled
	power := acc.EstimatePowerConsumption()
	if power <= 0 {
		t.Error("Power consumption should be positive when enabled")
	}
	
	// Should be zero when disabled
	acc.Disable()
	power = acc.EstimatePowerConsumption()
	if power != 0 {
		t.Error("Power consumption should be zero when disabled")
	}
	
	// Re-enable and test different optimizations
	acc.Enable()
	acc.SetOptimization("power_save")
	powerSave := acc.EstimatePowerConsumption()
	
	acc.SetOptimization("extreme")
	powerExtreme := acc.EstimatePowerConsumption()
	
	if powerExtreme <= powerSave {
		t.Error("Extreme mode should consume more power than power_save")
	}
}

func TestGetEfficiency(t *testing.T) {
	acc := NewAccelerator()
	
	// Should have positive efficiency when enabled
	efficiency := acc.GetEfficiency()
	if efficiency <= 0 {
		t.Error("Efficiency should be positive when enabled")
	}
	
	// Should be zero when disabled
	acc.Disable()
	efficiency = acc.GetEfficiency()
	if efficiency != 0 {
		t.Error("Efficiency should be zero when disabled")
	}
	
	// Power save mode should have better efficiency than extreme
	acc.Enable()
	acc.SetOptimization("power_save")
	efficiencySave := acc.GetEfficiency()
	
	acc.SetOptimization("extreme")
	efficiencyExtreme := acc.GetEfficiency()
	
	// Efficiency should decrease or stay similar with higher power modes
	// Allow for small margin of error due to diminishing returns calculation
	if efficiencyExtreme > efficiencySave*1.1 {
		t.Errorf("Extreme mode efficiency (%.4f) should not be significantly higher than power_save (%.4f)",
			efficiencyExtreme, efficiencySave)
	}
}

func TestGetStats(t *testing.T) {
	acc := NewAccelerator()
	
	stats := acc.GetStats()
	
	requiredFields := []string{
		"hardware_type",
		"hardware_name",
		"cores",
		"worker_count",
		"enabled",
		"optimization",
		"estimated_hashrate",
		"estimated_power_w",
		"efficiency_h_per_w",
	}
	
	for _, field := range requiredFields {
		if _, ok := stats[field]; !ok {
			t.Errorf("Stats missing required field: %s", field)
		}
	}
	
	// Verify types and values
	if stats["hardware_type"] != "CPU" {
		t.Errorf("Expected hardware_type 'CPU', got '%v'", stats["hardware_type"])
	}
	
	if stats["cores"] != runtime.NumCPU() {
		t.Errorf("Expected cores %d, got %v", runtime.NumCPU(), stats["cores"])
	}
	
	if stats["enabled"] != true {
		t.Error("Expected enabled to be true")
	}
}

func BenchmarkEstimateHashRate(b *testing.B) {
	acc := NewAccelerator()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		acc.EstimateHashRate()
	}
}

func BenchmarkGetStats(b *testing.B) {
	acc := NewAccelerator()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		acc.GetStats()
	}
}
