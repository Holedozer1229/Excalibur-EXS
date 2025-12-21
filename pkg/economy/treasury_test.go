package economy

import (
	"testing"
)

func TestProcessForge(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)

	// Test processing a valid forge
	result := treasury.ProcessForge("bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr")
	
	if result == nil {
		t.Fatal("Expected result, got nil")
	}

	if result.ForgeID != 1 {
		t.Errorf("Expected ForgeID to be 1, got %d", result.ForgeID)
	}

	if result.TotalReward != ForgeReward {
		t.Errorf("Expected TotalReward to be %.2f, got %.2f", ForgeReward, result.TotalReward)
	}

	if result.TreasuryAllocation != TreasuryAllocation {
		t.Errorf("Expected TreasuryAllocation to be %.2f, got %.2f", TreasuryAllocation, result.TreasuryAllocation)
	}

	if len(result.TreasuryMiniOutputs) != MiniOutputCount {
		t.Errorf("Expected %d mini-outputs, got %d", MiniOutputCount, len(result.TreasuryMiniOutputs))
	}

	// Verify mini-output amounts
	for i, output := range result.TreasuryMiniOutputs {
		if output.Amount != MiniOutputAmount {
			t.Errorf("Mini-output %d: expected amount %.2f, got %.2f", i, MiniOutputAmount, output.Amount)
		}
	}

	// Verify treasury balance
	if treasury.GetBalance() != TreasuryAllocation {
		t.Errorf("Expected treasury balance %.2f, got %.2f", TreasuryAllocation, treasury.GetBalance())
	}

	// Verify total forges
	if treasury.GetTotalForges() != 1 {
		t.Errorf("Expected 1 forge, got %d", treasury.GetTotalForges())
	}
}

func TestMiniOutputLocks(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)

	// Process a forge to create mini-outputs
	result := treasury.ProcessForge("bc1ptest")
	
	if len(result.TreasuryMiniOutputs) != 3 {
		t.Fatalf("Expected 3 mini-outputs, got %d", len(result.TreasuryMiniOutputs))
	}

	// Verify lock heights
	expectedDelays := []uint32{MiniOutput1Delay, MiniOutput2Delay, MiniOutput3Delay}
	for i, output := range result.TreasuryMiniOutputs {
		expectedUnlock := result.BlockHeight + expectedDelays[i]
		if output.UnlockHeight != expectedUnlock {
			t.Errorf("Output %d: expected unlock height %d, got %d", i, expectedUnlock, output.UnlockHeight)
		}
	}

	// Verify first output is immediately spendable
	if !result.TreasuryMiniOutputs[0].IsSpendable {
		t.Error("First mini-output should be immediately spendable")
	}

	// Verify second and third outputs are locked
	if result.TreasuryMiniOutputs[1].IsSpendable {
		t.Error("Second mini-output should be locked")
	}
	if result.TreasuryMiniOutputs[2].IsSpendable {
		t.Error("Third mini-output should be locked")
	}
}

func TestSetBlockHeight(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)

	// Process forge at height 1000
	treasury.ProcessForge("bc1ptest")

	// Check locked balance (outputs 2 and 3 are locked)
	lockedBalance := treasury.GetLockedBalance()
	if lockedBalance != MiniOutputAmount*2 { // 2 locked outputs
		t.Errorf("Expected locked balance %.2f, got %.2f", MiniOutputAmount*2, lockedBalance)
	}

	// Advance to height where second output unlocks (1000 + 1 + 4320 = 5321)
	treasury.SetBlockHeight(1001 + BlockInterval)

	// Check that second output is now spendable
	lockedBalance = treasury.GetLockedBalance()
	if lockedBalance != MiniOutputAmount { // Only 1 locked output remains
		t.Errorf("Expected locked balance %.2f after unlock, got %.2f", MiniOutputAmount, lockedBalance)
	}

	spendableBalance := treasury.GetSpendableBalance()
	if spendableBalance != MiniOutputAmount*2 { // 2 spendable outputs
		t.Errorf("Expected spendable balance %.2f, got %.2f", MiniOutputAmount*2, spendableBalance)
	}
}

func TestGetStats(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)
	
	// Process multiple forges
	treasury.ProcessForge("bc1ptest1")
	treasury.ProcessForge("bc1ptest2")

	stats := treasury.GetStats()

	if stats["total_forges"].(int) != 2 {
		t.Errorf("Expected total_forges to be 2, got %v", stats["total_forges"])
	}

	expectedBalance := TreasuryAllocation * 2
	if stats["treasury_balance"].(float64) != expectedBalance {
		t.Errorf("Expected treasury_balance to be %.2f, got %v", expectedBalance, stats["treasury_balance"])
	}

	if stats["mini_outputs_total"].(int) != 6 { // 2 forges × 3 outputs
		t.Errorf("Expected 6 mini-outputs, got %v", stats["mini_outputs_total"])
	}

	if stats["mini_output_amount"].(float64) != MiniOutputAmount {
		t.Errorf("Expected mini_output_amount to be %.2f, got %v", MiniOutputAmount, stats["mini_output_amount"])
	}

	if stats["block_interval"].(int) != BlockInterval {
		t.Errorf("Expected block_interval to be %d, got %v", BlockInterval, stats["block_interval"])
	}
}

func TestGetMiniOutputs(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)

	// Process forge
	treasury.ProcessForge("bc1ptest")

	// Get all mini-outputs
	outputs := treasury.GetMiniOutputs()
	if len(outputs) != 3 {
		t.Errorf("Expected 3 mini-outputs, got %d", len(outputs))
	}

	// Get spendable mini-outputs
	spendableOutputs := treasury.GetSpendableMiniOutputs()
	if len(spendableOutputs) != 1 { // Only first output is immediately spendable
		t.Errorf("Expected 1 spendable output, got %d", len(spendableOutputs))
	}

	// Get locked mini-outputs
	lockedOutputs := treasury.GetLockedMiniOutputs()
	if len(lockedOutputs) != 2 { // Second and third outputs are locked
		t.Errorf("Expected 2 locked outputs, got %d", len(lockedOutputs))
	}
}

func TestCalculateRuneDistribution(t *testing.T) {
	treasury := NewTreasury()
	treasury.SetBlockHeight(1000)
	
	// Process 10 forges
	for i := 0; i < 10; i++ {
		treasury.ProcessForge("bc1ptest")
	}

	distribution := treasury.CalculateRuneDistribution()

	expectedTotal := float64(10) * ForgeReward
	if distribution["total_minted"] != expectedTotal {
		t.Errorf("Expected total_minted %.2f, got %.2f", expectedTotal, distribution["total_minted"])
	}

	if distribution["treasury"] != expectedTotal*0.15 {
		t.Errorf("Expected treasury allocation %.2f, got %.2f", expectedTotal*0.15, distribution["treasury"])
	}
}
