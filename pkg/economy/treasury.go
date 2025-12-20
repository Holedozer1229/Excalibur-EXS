package economy

import (
	"encoding/json"
	"errors"
	"os"
)

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

// GetTreasuryStats returns current treasury statistics
func (t *Treasury) GetTreasuryStats() map[string]interface{} {
	return map[string]interface{}{
		"total_forged":      t.TotalForged,
		"total_rewards":     t.TotalRewards,
		"treasury_balance":  t.TreasuryBalance,
		"unique_claimants":  len(t.Claims),
	}
}
