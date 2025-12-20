package economy

import (
	"encoding/json"
	"fmt"
	"math"
	"time"
)

// Treasury manages the $EXS protocol treasury vault
type Treasury struct {
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

// NewTreasury creates a new treasury instance
func NewTreasury(address string) *Treasury {
	return &Treasury{
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
func (t *Treasury) CollectMiningFee(blockReward float64) float64 {
	fee := blockReward * 0.01
	t.addRevenue("mining_fees", fee)
	return fee
}

// ProcessCrossChainReward handles cross-chain mining revenue
func (t *Treasury) ProcessCrossChainReward(chain string, amount float64, multiplier float64) *CrossChainReward {
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
func (t *Treasury) ProcessLightningRoutingFee(routeID string, feeMsat int64) *LightningRoutingFee {
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
func (t *Treasury) ProcessTaprootFee(txID string, baseFee int64, withPrivacy bool) *TaprootProcessingFee {
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
func (t *Treasury) ProcessSmartContractFutureFee(contractID string, volume float64, feeRate float64) *SmartContractFutureFee {
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
func (t *Treasury) ProcessBridgeFee(amount float64) map[string]float64 {
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
func (t *Treasury) addRevenue(streamName string, amount float64) {
	if stream, exists := t.RevenueStreams[streamName]; exists && stream.Enabled {
		stream.TotalRevenue += amount
		stream.LastCollection = time.Now()
		t.Balance += amount
		t.TotalCollected += amount
	}
}

// DistributeFunds distributes treasury funds according to allocation rules
func (t *Treasury) DistributeFunds(amount float64) map[string]float64 {
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
func (t *Treasury) CalculateUserReward(baseReward float64, hodlMonths int, govVotes int, lpProvided bool, nodeOperator bool) float64 {
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
func (t *Treasury) ExecuteBuyback() (float64, error) {
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
func (t *Treasury) CalculateTransactionBurn(txAmount float64) float64 {
	return txAmount * 0.0001 // 0.01% burn
}

// GetTreasuryStats returns current treasury statistics
func (t *Treasury) GetTreasuryStats() map[string]interface{} {
	return map[string]interface{}{
		"address":           t.Address,
		"balance":           t.Balance,
		"total_collected":   t.TotalCollected,
		"total_distributed": t.TotalDistributed,
		"revenue_streams":   t.RevenueStreams,
		"distribution_rules": t.DistributionRules,
	}
}

// ExportJSON exports treasury state to JSON
func (t *Treasury) ExportJSON() (string, error) {
	stats := t.GetTreasuryStats()
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
func (t *Treasury) ValidateMultiSig(signatures []string) bool {
	return len(signatures) >= t.MultiSigThreshold
}
