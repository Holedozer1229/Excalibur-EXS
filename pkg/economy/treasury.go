// Package economy implements the Excalibur $EXS treasury management and fee collection.
//
// This module handles:
// - 1% treasury fee collection from all forge rewards
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
	ForgeReward         = 50.0  // 50 $EXS per forge
	TreasuryFeePercent  = 0.01  // 1% treasury fee
	ForgeFeesBTC        = 0.0001 // 0.0001 BTC per forge
	TotalSupplyCap      = 21000000
)

// Treasury manages the protocol treasury and fee collection
type Treasury struct {
	mu                 sync.RWMutex
	balance            float64
	totalFeesCollected float64
	totalForges        int
	forgeFeePoolBTC    float64
	distributions      []Distribution
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
	ForgeID        int
	MinerAddress   string
	TotalReward    float64
	MinerReward    float64
	TreasuryFee    float64
	ForgeFeeInBTC  float64
	Timestamp      time.Time
}

// NewTreasury creates a new Treasury instance
func NewTreasury() *Treasury {
	return &Treasury{
		balance:            0,
		totalFeesCollected: 0,
		totalForges:        0,
		forgeFeePoolBTC:    0,
		distributions:      make([]Distribution, 0),
	}
}

// ProcessForge processes a successful forge and collects fees
func (t *Treasury) ProcessForge(minerAddress string) *ForgeResult {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.totalForges++

	// Calculate distribution
	treasuryFee := ForgeReward * TreasuryFeePercent
	minerReward := ForgeReward - treasuryFee

	// Update treasury balance
	t.balance += treasuryFee
	t.totalFeesCollected += treasuryFee
	t.forgeFeePoolBTC += ForgeFeesBTC

	result := &ForgeResult{
		ForgeID:       t.totalForges,
		MinerAddress:  minerAddress,
		TotalReward:   ForgeReward,
		MinerReward:   minerReward,
		TreasuryFee:   treasuryFee,
		ForgeFeeInBTC: ForgeFeesBTC,
		Timestamp:     time.Now(),
	}

	return result
}

// GetBalance returns the current treasury balance
func (t *Treasury) GetBalance() float64 {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.balance
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

	return map[string]interface{}{
		"treasury_balance":      t.balance,
		"total_fees_collected":  t.totalFeesCollected,
		"total_forges":          t.totalForges,
		"forge_fee_pool_btc":    t.forgeFeePoolBTC,
		"total_minted":          totalMinted,
		"percentage_minted":     percentageMinted,
		"supply_cap":            TotalSupplyCap,
		"forge_reward":          ForgeReward,
		"treasury_fee_percent":  TreasuryFeePercent * 100,
		"distributions_count":   len(t.distributions),
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
	fmt.Println("═══════════════════════════════════════════════════")
	fmt.Printf("Treasury Balance:       %.2f $EXS\n", stats["treasury_balance"])
	fmt.Printf("Total Fees Collected:   %.2f $EXS\n", stats["total_fees_collected"])
	fmt.Printf("Total Forges:           %d\n", stats["total_forges"])
	fmt.Printf("Forge Fee Pool:         %.8f BTC\n", stats["forge_fee_pool_btc"])
	fmt.Printf("Total Minted:           %.2f $EXS (%.2f%%)\n", 
		stats["total_minted"], stats["percentage_minted"])
	fmt.Println("───────────────────────────────────────────────────")
	fmt.Println("Distribution Breakdown:")
	fmt.Printf("  Proof-of-Forge:       %.2f $EXS (60%%)\n", distribution["proof_of_forge"])
	fmt.Printf("  Treasury:             %.2f $EXS (15%%)\n", distribution["treasury"])
	fmt.Printf("  Liquidity:            %.2f $EXS (20%%)\n", distribution["liquidity"])
	fmt.Printf("  Airdrop:              %.2f $EXS (5%%)\n", distribution["airdrop"])
	fmt.Println("═══════════════════════════════════════════════════")
}
