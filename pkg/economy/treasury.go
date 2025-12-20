package economy

import (
	"fmt"
	"math/big"
	"sync"
	"time"
)

// TreasuryManager handles fee collection and $EXS Rune distribution
type TreasuryManager struct {
	mu                    sync.RWMutex
	totalCollectedSats    *big.Int
	totalCollectedEXS     *big.Float
	totalForgesProcessed  uint64
	feeRate               float64
	forgeFeeBaseSats      int64
	distributionHistory   []Distribution
}

// Distribution represents a single treasury distribution event
type Distribution struct {
	Timestamp     time.Time
	Amount        *big.Float
	Recipient     string
	Purpose       string
	TransactionID string
}

// ForgeResult represents the outcome of a forge operation
type ForgeResult struct {
	ForgeNumber      uint64
	MinerAddress     string
	TotalReward      *big.Float
	MinerReward      *big.Float
	TreasuryFee      *big.Float
	ForgeFeeInSats   int64
	Timestamp        time.Time
}

const (
	// BaseForgeReward is the initial reward per forge in $EXS
	BaseForgeReward = 50.0
	
	// TreasuryFeeRate is 1% of all rewards
	TreasuryFeeRate = 0.01
	
	// ForgeFeeInBTC is 0.0001 BTC per forge
	ForgeFeeInBTC = 0.0001
	
	// SatsPerBTC conversion
	SatsPerBTC = 100000000
)

// NewTreasuryManager creates a new treasury manager instance
func NewTreasuryManager() *TreasuryManager {
	return &TreasuryManager{
		totalCollectedSats:   big.NewInt(0),
		totalCollectedEXS:    big.NewFloat(0),
		totalForgesProcessed: 0,
		feeRate:              TreasuryFeeRate,
		forgeFeeBaseSats:     int64(ForgeFeeInBTC * SatsPerBTC),
		distributionHistory:  make([]Distribution, 0),
	}
}

// ProcessForge calculates and collects fees for a completed forge
func (tm *TreasuryManager) ProcessForge(minerAddress string) (*ForgeResult, error) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if minerAddress == "" {
		return nil, fmt.Errorf("invalid miner address")
	}

	tm.totalForgesProcessed++

	// Calculate rewards
	totalReward := big.NewFloat(BaseForgeReward)
	treasuryFee := new(big.Float).Mul(totalReward, big.NewFloat(tm.feeRate))
	minerReward := new(big.Float).Sub(totalReward, treasuryFee)

	// Collect treasury fee
	tm.totalCollectedEXS = new(big.Float).Add(tm.totalCollectedEXS, treasuryFee)
	
	// Collect forge fee in satoshis
	tm.totalCollectedSats = new(big.Int).Add(
		tm.totalCollectedSats,
		big.NewInt(tm.forgeFeeBaseSats),
	)

	result := &ForgeResult{
		ForgeNumber:    tm.totalForgesProcessed,
		MinerAddress:   minerAddress,
		TotalReward:    totalReward,
		MinerReward:    minerReward,
		TreasuryFee:    treasuryFee,
		ForgeFeeInSats: tm.forgeFeeBaseSats,
		Timestamp:      time.Now(),
	}

	return result, nil
}

// DistributeEXS distributes $EXS from treasury to a recipient
func (tm *TreasuryManager) DistributeEXS(amount *big.Float, recipient, purpose, txID string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Check if sufficient funds available
	if tm.totalCollectedEXS.Cmp(amount) < 0 {
		return fmt.Errorf("insufficient treasury balance")
	}

	// Record distribution
	distribution := Distribution{
		Timestamp:     time.Now(),
		Amount:        new(big.Float).Set(amount),
		Recipient:     recipient,
		Purpose:       purpose,
		TransactionID: txID,
	}

	tm.distributionHistory = append(tm.distributionHistory, distribution)

	// Deduct from treasury
	tm.totalCollectedEXS = new(big.Float).Sub(tm.totalCollectedEXS, amount)

	return nil
}

// GetTreasuryBalance returns current treasury balances
func (tm *TreasuryManager) GetTreasuryBalance() (exs *big.Float, sats *big.Int) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	return new(big.Float).Set(tm.totalCollectedEXS), 
	       new(big.Int).Set(tm.totalCollectedSats)
}

// GetTreasuryStats returns comprehensive treasury statistics
func (tm *TreasuryManager) GetTreasuryStats() map[string]interface{} {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	exsBalance := tm.totalCollectedEXS.Text('f', 8)
	satsBalance := tm.totalCollectedSats.String()
	btcBalance := new(big.Float).Quo(
		new(big.Float).SetInt(tm.totalCollectedSats),
		big.NewFloat(SatsPerBTC),
	).Text('f', 8)

	return map[string]interface{}{
		"total_forges_processed":    tm.totalForgesProcessed,
		"treasury_exs_balance":      exsBalance,
		"treasury_sats_balance":     satsBalance,
		"treasury_btc_balance":      btcBalance,
		"treasury_fee_rate":         tm.feeRate,
		"forge_fee_sats":            tm.forgeFeeBaseSats,
		"total_distributions":       len(tm.distributionHistory),
	}
}

// GetDistributionHistory returns the history of treasury distributions
func (tm *TreasuryManager) GetDistributionHistory(limit int) []Distribution {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	histLen := len(tm.distributionHistory)
	if limit <= 0 || limit > histLen {
		limit = histLen
	}

	// Return most recent distributions
	result := make([]Distribution, limit)
	copy(result, tm.distributionHistory[histLen-limit:])

	return result
}

// CalculateMinerReward calculates the miner's reward after treasury fee
func CalculateMinerReward(baseReward float64, feeRate float64) float64 {
	return baseReward * (1.0 - feeRate)
}

// CalculateTreasuryFee calculates the treasury fee for a given reward
func CalculateTreasuryFee(baseReward float64, feeRate float64) float64 {
	return baseReward * feeRate
}

// FormatEXSAmount formats an $EXS amount for display
func FormatEXSAmount(amount *big.Float) string {
	return amount.Text('f', 8) + " $EXS"
}

// FormatBTCAmount formats a satoshi amount as BTC for display
func FormatBTCAmount(sats *big.Int) string {
	btc := new(big.Float).Quo(
		new(big.Float).SetInt(sats),
		big.NewFloat(SatsPerBTC),
	)
	return btc.Text('f', 8) + " BTC"
}

// ValidateMinerAddress validates a P2TR address format
func ValidateMinerAddress(address string) bool {
	// P2TR addresses start with "bc1p" and are typically 62 characters
	if len(address) < 42 || len(address) > 62 {
		return false
	}
	
	if len(address) >= 4 && address[:4] == "bc1p" {
		return true
	}
	
	return false
}
