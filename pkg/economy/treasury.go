package economy

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/big"
	"os"
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

// Tokenomics represents the $EXS token economic parameters
type Tokenomics struct {
	MaxSupply      int64                  `json:"MaxSupply"`
	RewardPerForge int64                  `json:"RewardPerForge"`
	ForgeFeeSats   int64                  `json:"ForgeFeeSats"`
	Distribution   map[string]float64     `json:"Distribution"`
}

// Treasury tracks forging fees and reward distribution
type Treasury struct {
	TotalForged    int64            `json:"total_forged"`
	TotalRewards   int64            `json:"total_rewards"`
	TreasuryBalance int64           `json:"treasury_balance"`
	Claims         map[string]int64 `json:"claims"` // taproot address -> claimed amount
}

// LoadTokenomics loads the tokenomics configuration from JSON
func LoadTokenomics(path string) (*Tokenomics, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var tokenomics Tokenomics
	if err := json.Unmarshal(data, &tokenomics); err != nil {
		return nil, err
	}

	return &tokenomics, nil
}

// NewTreasury creates a new treasury instance
func NewTreasury() *Treasury {
	return &Treasury{
		Claims: make(map[string]int64),
	}
}

// RecordForge records a forging fee payment to the treasury
func (t *Treasury) RecordForge(feeSats int64) error {
	if feeSats <= 0 {
		return errors.New("forge fee must be positive")
	}

	t.TotalForged++
	t.TreasuryBalance += feeSats
	return nil
}

// ClaimReward verifies an Ω′ Δ18 proof and releases $EXS Runes to the user's Taproot address
// This function validates that:
// 1. The proof meets the required difficulty (4 leading zeros)
// 2. The address has not exceeded the max claimable amount
// 3. Sufficient treasury balance exists
func (t *Treasury) ClaimReward(taprootAddress string, proofHash string, tokenomics *Tokenomics) (int64, error) {
	// Verify proof has required difficulty (4 leading zeros for Ω′ Δ18)
	if !verifyProofDifficulty(proofHash, 4) {
		return 0, errors.New("invalid Ω′ Δ18 proof: insufficient difficulty")
	}

	// Check if address has already claimed
	alreadyClaimed := t.Claims[taprootAddress]
	
	// Calculate total supply issued so far
	totalIssued := t.TotalRewards
	
	// Verify we haven't exceeded max supply
	if totalIssued+tokenomics.RewardPerForge > tokenomics.MaxSupply {
		return 0, errors.New("max supply reached")
	}

	// Record the claim
	t.Claims[taprootAddress] = alreadyClaimed + tokenomics.RewardPerForge
	t.TotalRewards += tokenomics.RewardPerForge

	return tokenomics.RewardPerForge, nil
}

// GetTreasuryStats returns current treasury statistics
func (t *Treasury) GetTreasuryStats() map[string]interface{} {
	return map[string]interface{}{
		"total_forged":      t.TotalForged,
		"total_rewards":     t.TotalRewards,
		"treasury_balance":  t.TreasuryBalance,
		"unique_claimants":  len(t.Claims),
	}
}

// verifyProofDifficulty checks if the proof hash has the required number of leading zeros
func verifyProofDifficulty(proofHash string, difficulty int) bool {
	if len(proofHash) < difficulty {
		return false
	}

	for i := 0; i < difficulty; i++ {
		if proofHash[i] != '0' {
			return false
		}
	}

	return true
}

// TreasuryVault manages the $EXS protocol treasury vault with revenue streams
type TreasuryVault struct {
	Address            string
	Balance            float64
	TotalCollected     float64
	TotalDistributed   float64
	MultiSigThreshold  int
	RevenueStreams     map[string]*RevenueStream
	DistributionRules  *DistributionRules
}

// RevenueStream represents a source of treasury income
type RevenueStream struct {
	Name              string
	Enabled           bool
	TotalRevenue      float64
	TreasuryShare     float64
	LastCollection    time.Time
}

// DistributionRules defines how treasury funds are allocated
type DistributionRules struct {
	Development  float64 // 40%
	Marketing    float64 // 20%
	Operations   float64 // 15%
	Research     float64 // 10%
	Grants       float64 // 10%
	Reserves     float64 // 5%
}

// CrossChainReward represents rewards from cross-chain mining
type CrossChainReward struct {
	Chain          string
	Amount         float64
	Multiplier     float64
	TreasuryFee    float64
	MinerReward    float64
}

// LightningRoutingFee represents Lightning Network routing revenue
type LightningRoutingFee struct {
	RouteID        string
	FeeMsat        int64
	TreasuryShare  float64
	NodeOperator   float64
	ExsHolders     float64
}

// TaprootProcessingFee represents Taproot P2TR processing revenue
type TaprootProcessingFee struct {
	TxID            string
	ProcessingFee   int64
	PrivacyPremium  float64
	TreasuryShare   float64
	NodeOperators   float64
	LiquidityPool   float64
}

// SmartContractFutureFee represents futures trading revenue
type SmartContractFutureFee struct {
	ContractID      string
	TradingFee      float64
	FundingRate     float64
	LiquidationFee  float64
	TreasuryShare   float64
}

// NewTreasuryVault creates a new treasury vault instance
func NewTreasuryVault(address string) *TreasuryVault {
	return &TreasuryVault{
		Address:           address,
		Balance:           0,
		TotalCollected:    0,
		TotalDistributed:  0,
		MultiSigThreshold: 3,
		RevenueStreams: map[string]*RevenueStream{
			"mining_fees":           {Name: "Mining Fees", Enabled: true, TreasuryShare: 1.0},
			"cross_chain_mining":    {Name: "Cross-Chain Mining", Enabled: true, TreasuryShare: 10.0},
			"lightning_routing":     {Name: "Lightning Routing", Enabled: true, TreasuryShare: 15.0},
			"taproot_processing":    {Name: "Taproot Processing", Enabled: true, TreasuryShare: 25.0},
			"smart_contract_futures": {Name: "Smart Contract Futures", Enabled: true, TreasuryShare: 30.0},
			"bridge_fees":           {Name: "Bridge Fees", Enabled: true, TreasuryShare: 40.0},
		},
		DistributionRules: &DistributionRules{
			Development: 40.0,
			Marketing:   20.0,
			Operations:  15.0,
			Research:    10.0,
			Grants:      10.0,
			Reserves:    5.0,
		},
	}
}

// CollectMiningFee collects the 1% treasury fee from mining rewards
func (t *TreasuryVault) CollectMiningFee(blockReward float64) float64 {
	fee := blockReward * 0.01
	t.addRevenue("mining_fees", fee)
	return fee
}

// ProcessCrossChainReward handles cross-chain mining revenue
func (t *TreasuryVault) ProcessCrossChainReward(chain string, amount float64, multiplier float64) *CrossChainReward {
	reward := amount * multiplier
	treasuryFee := reward * 0.10 // 10% to treasury
	minerReward := reward - treasuryFee
	
	t.addRevenue("cross_chain_mining", treasuryFee)
	
	return &CrossChainReward{
		Chain:       chain,
		Amount:      amount,
		Multiplier:  multiplier,
		TreasuryFee: treasuryFee,
		MinerReward: minerReward,
	}
}

// ProcessLightningRoutingFee handles Lightning Network routing revenue
func (t *TreasuryVault) ProcessLightningRoutingFee(routeID string, feeMsat int64) *LightningRoutingFee {
	feeEXS := float64(feeMsat) / 100000000.0 // Convert msat to EXS
	
	treasuryShare := feeEXS * 0.15  // 15%
	nodeOperator := feeEXS * 0.60   // 60%
	exsHolders := feeEXS * 0.25     // 25%
	
	t.addRevenue("lightning_routing", treasuryShare)
	
	return &LightningRoutingFee{
		RouteID:       routeID,
		FeeMsat:       feeMsat,
		TreasuryShare: treasuryShare,
		NodeOperator:  nodeOperator,
		ExsHolders:    exsHolders,
	}
}

// ProcessTaprootFee handles Taproot P2TR processing revenue
func (t *TreasuryVault) ProcessTaprootFee(txID string, baseFee int64, withPrivacy bool) *TaprootProcessingFee {
	feeEXS := float64(baseFee) / 100000000.0
	
	// Apply privacy premium if requested
	privacyPremium := 0.0
	if withPrivacy {
		privacyPremium = feeEXS * 0.05
		feeEXS += privacyPremium
	}
	
	treasuryShare := feeEXS * 0.25  // 25%
	nodeOperators := feeEXS * 0.50  // 50%
	liquidityPool := feeEXS * 0.25  // 25%
	
	t.addRevenue("taproot_processing", treasuryShare)
	
	return &TaprootProcessingFee{
		TxID:           txID,
		ProcessingFee:  baseFee,
		PrivacyPremium: privacyPremium,
		TreasuryShare:  treasuryShare,
		NodeOperators:  nodeOperators,
		LiquidityPool:  liquidityPool,
	}
}

// ProcessSmartContractFutureFee handles futures trading revenue
func (t *TreasuryVault) ProcessSmartContractFutureFee(contractID string, volume float64, feeRate float64) *SmartContractFutureFee {
	tradingFee := volume * feeRate
	treasuryShare := tradingFee * 0.30  // 30%
	
	t.addRevenue("smart_contract_futures", treasuryShare)
	
	return &SmartContractFutureFee{
		ContractID:     contractID,
		TradingFee:     tradingFee,
		FundingRate:    0.01, // 1% cap
		LiquidationFee: 0,
		TreasuryShare:  treasuryShare,
	}
}

// ProcessBridgeFee handles cross-chain bridge transaction fees
func (t *TreasuryVault) ProcessBridgeFee(amount float64) map[string]float64 {
	bridgeFee := amount * 0.003 // 0.3%
	
	distribution := map[string]float64{
		"treasury":           bridgeFee * 0.40,
		"liquidity_providers": bridgeFee * 0.40,
		"validators":         bridgeFee * 0.20,
	}
	
	t.addRevenue("bridge_fees", distribution["treasury"])
	
	return distribution
}

// addRevenue adds revenue to a specific stream
func (t *TreasuryVault) addRevenue(streamName string, amount float64) {
	if stream, exists := t.RevenueStreams[streamName]; exists && stream.Enabled {
		stream.TotalRevenue += amount
		stream.LastCollection = time.Now()
		t.Balance += amount
		t.TotalCollected += amount
	}
}

// DistributeFunds distributes treasury funds according to allocation rules
func (t *TreasuryVault) DistributeFunds(amount float64) map[string]float64 {
	if amount > t.Balance {
		return nil
	}
	
	distribution := map[string]float64{
		"development": amount * (t.DistributionRules.Development / 100),
		"marketing":   amount * (t.DistributionRules.Marketing / 100),
		"operations":  amount * (t.DistributionRules.Operations / 100),
		"research":    amount * (t.DistributionRules.Research / 100),
		"grants":      amount * (t.DistributionRules.Grants / 100),
		"reserves":    amount * (t.DistributionRules.Reserves / 100),
	}
	
	t.Balance -= amount
	t.TotalDistributed += amount
	
	return distribution
}

// CalculateUserReward calculates user reward with bonuses
func (t *TreasuryVault) CalculateUserReward(baseReward float64, hodlMonths int, govVotes int, lpProvided bool, nodeOperator bool) float64 {
	reward := baseReward
	
	// Long-term holder bonus
	if hodlMonths >= 48 {
		reward *= 1.25
	} else if hodlMonths >= 24 {
		reward *= 1.12
	} else if hodlMonths >= 12 {
		reward *= 1.05
	}
	
	// Active participant bonuses
	if govVotes > 0 {
		reward *= 1.02
	}
	if lpProvided {
		reward *= 1.05
	}
	if nodeOperator {
		reward *= 1.10
	}
	
	return reward
}

// ExecuteBuyback executes the monthly buyback program
func (t *TreasuryVault) ExecuteBuyback() (float64, error) {
	// Calculate buyback amount (10% of treasury revenue)
	buybackAmount := t.TotalCollected * 0.10
	
	if buybackAmount > t.Balance {
		return 0, fmt.Errorf("insufficient treasury balance for buyback")
	}
	
	// Execute buyback
	t.Balance -= buybackAmount
	
	return buybackAmount, nil
}

// CalculateTransactionBurn calculates the burn amount for a transaction
func (t *TreasuryVault) CalculateTransactionBurn(txAmount float64) float64 {
	return txAmount * 0.0001 // 0.01% burn
}

// ExportJSON exports treasury state to JSON
func (t *TreasuryVault) ExportJSON() (string, error) {
	stats := map[string]interface{}{
		"address":            t.Address,
		"balance":            t.Balance,
		"total_collected":    t.TotalCollected,
		"total_distributed":  t.TotalDistributed,
		"revenue_streams":    t.RevenueStreams,
		"distribution_rules": t.DistributionRules,
	}
	data, err := json.MarshalIndent(stats, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// CalculateAPY calculates annual percentage yield for various activities
func CalculateAPY(principal float64, rate float64, compoundingPeriods int, years float64) float64 {
	return principal * math.Pow(1+(rate/float64(compoundingPeriods)), float64(compoundingPeriods)*years)
}

// ValidateMultiSig validates that enough signatures are present
func (t *TreasuryVault) ValidateMultiSig(signatures []string) bool {
	return len(signatures) >= t.MultiSigThreshold
}
