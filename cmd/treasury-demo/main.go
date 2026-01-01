// Simple test program for the treasury module
package main

import (
	"fmt"
	"path/filepath"
	"runtime"
	
	"github.com/Holedozer1229/Excalibur-EXS/pkg/economy"
)

func main() {
	_, filename, _, _ := runtime.Caller(0)
	fmt.Printf("Running from: %s\n\n", filepath.Dir(filename))
	
	fmt.Println("⚒️  Excalibur $EXS Treasury Test")
	fmt.Println("════════════════════════════════════════════════")
	fmt.Println()

	// Create treasury
	treasury := economy.NewTreasury()
	treasury.SetBlockHeight(1000) // Start at block 1000

	// Simulate 3 forges
	for i := 1; i <= 3; i++ {
		result := treasury.ProcessForge(fmt.Sprintf("bc1p_miner_%d", i))
		fmt.Printf("Forge #%d (Block %d):\n", result.ForgeID, result.BlockHeight)
		fmt.Printf("  Miner:       %s\n", result.MinerAddress)
		fmt.Printf("  Reward:      %.2f $EXS\n", result.MinerReward)
		fmt.Printf("  Treasury:    %.2f $EXS (split into %d mini-outputs)\n", 
			result.TreasuryAllocation, len(result.TreasuryMiniOutputs))
		fmt.Printf("  Mini-Outputs:\n")
		for j, output := range result.TreasuryMiniOutputs {
			status := "🔓 Unlocked"
			if !output.IsSpendable {
				status = "🔒 Locked"
			}
			fmt.Printf("    %d) %.1f $EXS - Unlock at block %d %s\n", 
				j+1, output.Amount, output.UnlockHeight, status)
		}
		fmt.Println()
	}

	// Print full report
	treasury.PrintReport()

	// Test distribution
	fmt.Println()
	fmt.Println("Testing treasury distribution...")
	dist, err := treasury.Distribute(0.5, "bc1p_dev_wallet", "Development grant")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Printf("✅ Distribution #%d successful\n", dist.ID)
		fmt.Printf("   Amount: %.2f $EXS\n", dist.Amount)
		fmt.Printf("   Recipient: %s\n", dist.Recipient)
		fmt.Printf("   Purpose: %s\n", dist.Purpose)
	}
	
	fmt.Println()
	fmt.Printf("Final Treasury Balance: %.2f $EXS\n", treasury.GetBalance())
	fmt.Printf("  Spendable: %.2f $EXS\n", treasury.GetSpendableBalance())
	fmt.Printf("  Locked:    %.2f $EXS\n", treasury.GetLockedBalance())
}
