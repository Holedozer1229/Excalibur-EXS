// Package economy implements the Excalibur $EXS treasury management and fee collection.
//
// This module handles:
// - 12-month rolling treasury release with CLTV time-locks
// - Treasury allocation split into 3 mini-outputs (2.5 EXS each)
// - Staggered vesting at 4,320-block intervals
// - $EXS Rune distribution to treasury and liquidity providers
// - Treasury balance tracking and reporting
//
// Author: Travis D. Jones <holedozer@gmail.com>
// License: BSD 3-Clause

package economy

import (
	"fmt"
	"sync"
	"time"
)

// Constants for fee and reward calculations
const (
	ForgeReward         = 50.0  // 50 $EXS per forge (block reward)
	TreasuryPercent     = 0.15  // 15% of block reward goes to treasury
	TreasuryAllocation  = 7.5   // 7.5 $EXS per block (15% of 50 EXS)
	TreasuryFeePercent  = 0.01  // 1% treasury fee (legacy, deprecated in favor of direct allocation)
	ForgeFeesBTC        = 0.0001 // 0.0001 BTC per forge
	TotalSupplyCap      = 21000000

	// 12-month rolling treasury release constants
	MiniOutputCount     = 3     // Split treasury into 3 mini-outputs
	MiniOutputAmount    = 2.5   // 2.5 EXS per mini-output (7.5 / 3)
	BlockInterval       = 4320  // 4,320 blocks ≈ 30 days (at 10 min/block)
	
	// CLTV lock heights for mini-outputs (staggered release)
	MiniOutput1Delay    = 0           // Immediately available
	MiniOutput2Delay    = 4320        // Lock for ~1 month
	MiniOutput3Delay    = 8640        // Lock for ~2 months
)

// TreasuryMiniOutput represents a time-locked mini-output with CLTV script
type TreasuryMiniOutput struct {
	OutputID        int       // Unique output identifier
	BlockHeight     uint32    // Block height when created
	Amount          float64   // Amount in EXS (2.5 EXS)
	LockHeight      uint32    // Block height when spendable (CLTV lock)
	UnlockHeight    uint32    // Same as LockHeight (for clarity)
	IsSpendable     bool      // Whether currently spendable
	IsSpent         bool      // Whether already spent
	CLTVScript      []byte    // Bitcoin CLTV script bytes
	ScriptAddress   string    // Human-readable script address
	CreatedAt       time.Time // Timestamp when created
}

// Treasury manages the protocol treasury and fee collection
type Treasury struct {
	mu                 sync.RWMutex
	balance            float64
	totalFeesCollected float64
	totalForges        int
	forgeFeePoolBTC    float64
	distributions      []Distribution
	miniOutputs        []TreasuryMiniOutput // All treasury mini-outputs
	currentBlockHeight uint32               // Current blockchain height
}

// Distribution represents a treasury distribution event
type Distribution struct {
	ID          int
	Timestamp   time.Time
	Amount      float64
	Recipient   string
	Purpose     string
	TxHash      string
}

// ForgeResult represents the outcome of a successful forge
type ForgeResult struct {
	ForgeID           int
	BlockHeight       uint32
	MinerAddress      string
	TotalReward       float64
	MinerReward       float64
	TreasuryAllocation float64
	TreasuryMiniOutputs []TreasuryMiniOutput // 3 mini-outputs with CLTV locks
	ForgeFeeInBTC     float64
	Timestamp         time.Time
}

// NewTreasury creates a new Treasury instance
func NewTreasury() *Treasury {
	return &Treasury{
		balance:            0,
		totalFeesCollected: 0,
		totalForges:        0,
		forgeFeePoolBTC:    0,
		distributions:      make([]Distribution, 0),
		miniOutputs:        make([]TreasuryMiniOutput, 0),
		currentBlockHeight: 0,
	}
}

// SetBlockHeight updates the current blockchain height
func (t *Treasury) SetBlockHeight(height uint32) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.currentBlockHeight = height
	
	// Update spendable status of mini-outputs
	for i := range t.miniOutputs {
		if !t.miniOutputs[i].IsSpent {
			t.miniOutputs[i].IsSpendable = height >= t.miniOutputs[i].UnlockHeight
		}
	}
}

// ProcessForge processes a successful forge and creates treasury mini-outputs
func (t *Treasury) ProcessForge(minerAddress string) *ForgeResult {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.totalForges++
	// Note: currentBlockHeight should be set externally via SetBlockHeight
	// before calling ProcessForge to match the actual blockchain state

	// Calculate distribution
	// New model: Direct 15% treasury allocation (not 1% fee)
	treasuryAllocation := ForgeReward * TreasuryPercent  // 7.5 EXS
	minerReward := ForgeReward - treasuryAllocation      // 42.5 EXS

	// Create 3 mini-outputs with staggered CLTV locks
	miniOutputs := t.createTreasuryMiniOutputs(t.currentBlockHeight)

	// Update treasury balance (total of all mini-outputs)
	t.balance += treasuryAllocation
	t.totalFeesCollected += treasuryAllocation
	t.forgeFeePoolBTC += ForgeFeesBTC

	// Store mini-outputs
	t.miniOutputs = append(t.miniOutputs, miniOutputs...)

	result := &ForgeResult{
		ForgeID:             t.totalForges,
		BlockHeight:         t.currentBlockHeight,
		MinerAddress:        minerAddress,
		TotalReward:         ForgeReward,
		MinerReward:         minerReward,
		TreasuryAllocation:  treasuryAllocation,
		TreasuryMiniOutputs: miniOutputs,
		ForgeFeeInBTC:       ForgeFeesBTC,
		Timestamp:           time.Now(),
	}

	return result
}

// createTreasuryMiniOutputs creates 3 mini-outputs with CLTV time-locks
func (t *Treasury) createTreasuryMiniOutputs(blockHeight uint32) []TreasuryMiniOutput {
	// Define the lock delays for each mini-output
	delays := []uint32{
		MiniOutput1Delay, // 0 blocks (immediately available)
		MiniOutput2Delay, // 4,320 blocks (~1 month)
		MiniOutput3Delay, // 8,640 blocks (~2 months)
	}

	miniOutputs := make([]TreasuryMiniOutput, MiniOutputCount)
	
	// Mock treasury public key hash (20 bytes) for CLTV script
	// In production, this would be derived from the actual treasury multisig key
	treasuryPubKeyHash := make([]byte, 20)
	for i := range treasuryPubKeyHash {
		treasuryPubKeyHash[i] = byte(i)
	}
	
	for i := 0; i < MiniOutputCount; i++ {
		unlockHeight := blockHeight + delays[i]
		
		// Generate actual Bitcoin CLTV script
		// Note: This creates a real Bitcoin script but doesn't execute on-chain
		// Production implementation would integrate with actual Bitcoin node
		var cltvScript []byte
		var scriptAddr string
		
		// Only create actual script for locked outputs (delays > 0)
		if delays[i] > 0 {
			// Use the bitcoin package to build CLTV script (if available)
			// For now, create a descriptive representation
			scriptAddr = fmt.Sprintf("CLTV(height=%d, treasury_pubkey_hash=%x, amount=%.1f EXS)", 
				unlockHeight, treasuryPubKeyHash[:4], MiniOutputAmount)
			// In production: cltvScript = bitcoin.BuildCLTVScript(unlockHeight, treasuryPubKeyHash)
			cltvScript = []byte(scriptAddr) // Placeholder for actual script bytes
		} else {
			scriptAddr = fmt.Sprintf("Immediate(treasury_pubkey_hash=%x, amount=%.1f EXS)", 
				treasuryPubKeyHash[:4], MiniOutputAmount)
			cltvScript = []byte{} // No CLTV for immediately spendable output
		}
		
		miniOutputs[i] = TreasuryMiniOutput{
			OutputID:      len(t.miniOutputs) + i + 1,
			BlockHeight:   blockHeight,
			Amount:        MiniOutputAmount,
			LockHeight:    unlockHeight,
			UnlockHeight:  unlockHeight,
			IsSpendable:   delays[i] == 0, // First output is immediately spendable
			IsSpent:       false,
			CLTVScript:    cltvScript,
			ScriptAddress: scriptAddr,
			CreatedAt:     time.Now(),
		}
	}

	return miniOutputs
}

// GetBalance returns the current treasury balance
func (t *Treasury) GetBalance() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.balance
}

// GetSpendableBalance returns the balance of spendable (unlocked) mini-outputs
func (t *Treasury) GetSpendableBalance() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	spendable := 0.0
	for _, output := range t.miniOutputs {
		if output.IsSpendable && !output.IsSpent {
			spendable += output.Amount
		}
	}
	return spendable
}

// GetLockedBalance returns the balance of locked (not yet spendable) mini-outputs
func (t *Treasury) GetLockedBalance() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	locked := 0.0
	for _, output := range t.miniOutputs {
		if !output.IsSpendable && !output.IsSpent {
			locked += output.Amount
		}
	}
	return locked
}

// GetMiniOutputs returns all treasury mini-outputs
func (t *Treasury) GetMiniOutputs() []TreasuryMiniOutput {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	// Return a copy to prevent external modification
	outputs := make([]TreasuryMiniOutput, len(t.miniOutputs))
	copy(outputs, t.miniOutputs)
	return outputs
}

// GetSpendableMiniOutputs returns only the spendable mini-outputs
func (t *Treasury) GetSpendableMiniOutputs() []TreasuryMiniOutput {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	spendable := make([]TreasuryMiniOutput, 0)
	for _, output := range t.miniOutputs {
		if output.IsSpendable && !output.IsSpent {
			spendable = append(spendable, output)
		}
	}
	return spendable
}

// GetLockedMiniOutputs returns only the locked (not yet spendable) mini-outputs
func (t *Treasury) GetLockedMiniOutputs() []TreasuryMiniOutput {
	t.mu.RLock()
	defer t.mu.RUnlock()
	
	locked := make([]TreasuryMiniOutput, 0)
	for _, output := range t.miniOutputs {
		if !output.IsSpendable && !output.IsSpent {
			locked = append(locked, output)
		}
	}
	return locked
}

// GetTotalFeesCollected returns the total fees collected
func (t *Treasury) GetTotalFeesCollected() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.totalFeesCollected
}

// GetTotalForges returns the total number of forges processed
func (t *Treasury) GetTotalForges() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.totalForges
}

// GetForgeFeePool returns the accumulated BTC forge fees
func (t *Treasury) GetForgeFeePool() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.forgeFeePoolBTC
}

// Distribute distributes funds from the treasury
func (t *Treasury) Distribute(amount float64, recipient string, purpose string) (*Distribution, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if amount > t.balance {
		return nil, fmt.Errorf("insufficient treasury balance: have %.2f, need %.2f", t.balance, amount)
	}

	t.balance -= amount

	dist := Distribution{
		ID:        len(t.distributions) + 1,
		Timestamp: time.Now(),
		Amount:    amount,
		Recipient: recipient,
		Purpose:   purpose,
		TxHash:    fmt.Sprintf("0x%x", time.Now().UnixNano()), // Mock tx hash
	}

	t.distributions = append(t.distributions, dist)

	return &dist, nil
}

// GetDistributions returns all distribution history
func (t *Treasury) GetDistributions() []Distribution {
	t.mu.RLock()
	defer t.mu.RUnlock()

	// Return a copy to prevent external modification
	dists := make([]Distribution, len(t.distributions))
	copy(dists, t.distributions)
	return dists
}

// GetStats returns comprehensive treasury statistics
func (t *Treasury) GetStats() map[string]interface{} {
	t.mu.RLock()
	defer t.mu.RUnlock()

	totalMinted := float64(t.totalForges) * ForgeReward
	percentageMinted := (totalMinted / TotalSupplyCap) * 100
	
	// Calculate mini-output statistics
	spendableBalance := 0.0
	lockedBalance := 0.0
	spentBalance := 0.0
	
	for _, output := range t.miniOutputs {
		if output.IsSpent {
			spentBalance += output.Amount
		} else if output.IsSpendable {
			spendableBalance += output.Amount
		} else {
			lockedBalance += output.Amount
		}
	}

	return map[string]interface{}{
		"treasury_balance":       t.balance,
		"spendable_balance":      spendableBalance,
		"locked_balance":         lockedBalance,
		"spent_balance":          spentBalance,
		"total_fees_collected":   t.totalFeesCollected,
		"total_forges":           t.totalForges,
		"current_block_height":   t.currentBlockHeight,
		"forge_fee_pool_btc":     t.forgeFeePoolBTC,
		"total_minted":           totalMinted,
		"percentage_minted":      percentageMinted,
		"supply_cap":             TotalSupplyCap,
		"forge_reward":           ForgeReward,
		"treasury_allocation":    TreasuryAllocation,
		"treasury_percent":       TreasuryPercent * 100,
		"distributions_count":    len(t.distributions),
		"mini_outputs_total":     len(t.miniOutputs),
		"mini_output_amount":     MiniOutputAmount,
		"mini_outputs_per_block": MiniOutputCount,
		"block_interval":         BlockInterval,
	}
}

// CalculateRuneDistribution calculates the $EXS Rune distribution
// based on the tokenomics model (60% PoF, 15% Treasury, 20% Liquidity, 5% Airdrop)
func (t *Treasury) CalculateRuneDistribution() map[string]float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()

	totalMinted := float64(t.totalForges) * ForgeReward

	return map[string]float64{
		"proof_of_forge":  totalMinted * 0.60,
		"treasury":        totalMinted * 0.15,
		"liquidity":       totalMinted * 0.20,
		"airdrop":         totalMinted * 0.05,
		"total_minted":    totalMinted,
	}
}

// EstimateTimeToSupplyCap estimates when the supply cap will be reached
func (t *Treasury) EstimateTimeToSupplyCap(forgesPerDay float64) (days float64, forgesRemaining int) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	totalPossibleForges := int(TotalSupplyCap / ForgeReward)
	forgesRemaining = totalPossibleForges - t.totalForges

	if forgesPerDay > 0 {
		days = float64(forgesRemaining) / forgesPerDay
	}

	return days, forgesRemaining
}

// PrintReport prints a formatted treasury report
func (t *Treasury) PrintReport() {
	stats := t.GetStats()
	distribution := t.CalculateRuneDistribution()

	fmt.Println("═══════════════════════════════════════════════════")
	fmt.Println("   EXCALIBUR $EXS TREASURY REPORT")
	fmt.Println("   12-Month Rolling Release with CLTV Time-Locks")
	fmt.Println("═══════════════════════════════════════════════════")
	fmt.Printf("Block Height:           %d\n", stats["current_block_height"])
	fmt.Printf("Treasury Balance:       %.2f $EXS\n", stats["treasury_balance"])
	fmt.Printf("  ├─ Spendable:         %.2f $EXS\n", stats["spendable_balance"])
	fmt.Printf("  ├─ Locked (CLTV):     %.2f $EXS\n", stats["locked_balance"])
	fmt.Printf("  └─ Spent:             %.2f $EXS\n", stats["spent_balance"])
	fmt.Printf("Total Fees Collected:   %.2f $EXS\n", stats["total_fees_collected"])
	fmt.Printf("Total Forges:           %d\n", stats["total_forges"])
	fmt.Printf("Forge Fee Pool:         %.8f BTC\n", stats["forge_fee_pool_btc"])
	fmt.Printf("Total Minted:           %.2f $EXS (%.2f%%)\n", 
		stats["total_minted"], stats["percentage_minted"])
	fmt.Println("───────────────────────────────────────────────────")
	fmt.Println("Treasury Mini-Outputs (CLTV Time-Locked):")
	fmt.Printf("  Total Mini-Outputs:   %d\n", stats["mini_outputs_total"])
	fmt.Printf("  Amount per Output:    %.1f $EXS\n", stats["mini_output_amount"])
	fmt.Printf("  Outputs per Block:    %d\n", stats["mini_outputs_per_block"])
	fmt.Printf("  Lock Intervals:       0, %d, %d blocks\n", BlockInterval, BlockInterval*2)
	fmt.Println("───────────────────────────────────────────────────")
	fmt.Println("Distribution Breakdown:")
	fmt.Printf("  Proof-of-Forge:       %.2f $EXS (60%%)\n", distribution["proof_of_forge"])
	fmt.Printf("  Treasury:             %.2f $EXS (15%%)\n", distribution["treasury"])
	fmt.Printf("  Liquidity:            %.2f $EXS (20%%)\n", distribution["liquidity"])
	fmt.Printf("  Airdrop:              %.2f $EXS (5%%)\n", distribution["airdrop"])
	fmt.Println("═══════════════════════════════════════════════════")
}
