package economy

import (
	"testing"
)

func TestTreasuryRecordForge(t *testing.T) {
	treasury := NewTreasury()

	// Test recording a valid forge
	err := treasury.RecordForge(10000)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if treasury.TotalForged != 1 {
		t.Errorf("Expected TotalForged to be 1, got %d", treasury.TotalForged)
	}

	if treasury.TreasuryBalance != 10000 {
		t.Errorf("Expected TreasuryBalance to be 10000, got %d", treasury.TreasuryBalance)
	}

	// Test recording invalid forge (negative fee)
	err = treasury.RecordForge(-100)
	if err == nil {
		t.Error("Expected error for negative fee, got nil")
	}

	// Test recording invalid forge (zero fee)
	err = treasury.RecordForge(0)
	if err == nil {
		t.Error("Expected error for zero fee, got nil")
	}
}

func TestVerifyProofDifficulty(t *testing.T) {
	tests := []struct {
		proof      string
		difficulty int
		expected   bool
	}{
		{"0000abc123def456", 4, true},
		{"000abc123def456", 4, false},
		{"0000000000000000", 4, true},
		{"1000abc123def456", 4, false},
		{"", 4, false},
		{"000", 4, false},
	}

	for _, tt := range tests {
		result := verifyProofDifficulty(tt.proof, tt.difficulty)
		if result != tt.expected {
			t.Errorf("verifyProofDifficulty(%q, %d) = %v, want %v",
				tt.proof, tt.difficulty, result, tt.expected)
		}
	}
}

func TestClaimReward(t *testing.T) {
	treasury := NewTreasury()
	tokenomics := &Tokenomics{
		MaxSupply:      21000000,
		RewardPerForge: 100,
		ForgeFeeSats:   10000,
	}

	// Test valid claim
	address := "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr"
	validProof := "0000abc123def456789012345678901234567890123456789012345678901234"

	reward, err := treasury.ClaimReward(address, validProof, tokenomics)
	if err != nil {
		t.Errorf("Expected no error for valid claim, got %v", err)
	}

	if reward != 100 {
		t.Errorf("Expected reward to be 100, got %d", reward)
	}

	if treasury.TotalRewards != 100 {
		t.Errorf("Expected TotalRewards to be 100, got %d", treasury.TotalRewards)
	}

	// Test invalid proof (insufficient difficulty)
	invalidProof := "000abc123def456789012345678901234567890123456789012345678901234"
	_, err = treasury.ClaimReward(address, invalidProof, tokenomics)
	if err == nil {
		t.Error("Expected error for invalid proof, got nil")
	}

	// Test max supply enforcement
	treasury.TotalRewards = 20999950 // Close to max supply
	_, err = treasury.ClaimReward(address, validProof, tokenomics)
	if err == nil {
		t.Error("Expected error when max supply is reached, got nil")
	}
}

func TestLoadTokenomics(t *testing.T) {
	// Test loading valid tokenomics file
	tokenomics, err := LoadTokenomics("tokenomics.json")
	if err != nil {
		t.Errorf("Expected no error loading tokenomics, got %v", err)
	}

	if tokenomics.MaxSupply != 21000000 {
		t.Errorf("Expected MaxSupply to be 21000000, got %d", tokenomics.MaxSupply)
	}

	if tokenomics.RewardPerForge != 100 {
		t.Errorf("Expected RewardPerForge to be 100, got %d", tokenomics.RewardPerForge)
	}

	if tokenomics.ForgeFeeSats != 10000 {
		t.Errorf("Expected ForgeFeeSats to be 10000, got %d", tokenomics.ForgeFeeSats)
	}

	// Verify distribution percentages
	if tokenomics.Distribution["PoF"] != 0.6 {
		t.Errorf("Expected PoF distribution to be 0.6, got %f", tokenomics.Distribution["PoF"])
	}

	if tokenomics.Distribution["Treasury"] != 0.15 {
		t.Errorf("Expected Treasury distribution to be 0.15, got %f", tokenomics.Distribution["Treasury"])
	}
}

func TestGetTreasuryStats(t *testing.T) {
	treasury := NewTreasury()
	treasury.TotalForged = 10
	treasury.TotalRewards = 1000
	treasury.TreasuryBalance = 100000
	treasury.Claims["addr1"] = 100
	treasury.Claims["addr2"] = 200

	stats := treasury.GetTreasuryStats()

	if stats["total_forged"] != int64(10) {
		t.Errorf("Expected total_forged to be 10, got %v", stats["total_forged"])
	}

	if stats["total_rewards"] != int64(1000) {
		t.Errorf("Expected total_rewards to be 1000, got %v", stats["total_rewards"])
	}

	if stats["treasury_balance"] != int64(100000) {
		t.Errorf("Expected treasury_balance to be 100000, got %v", stats["treasury_balance"])
	}

	if stats["unique_claimants"] != 2 {
		t.Errorf("Expected unique_claimants to be 2, got %v", stats["unique_claimants"])
	}
}
