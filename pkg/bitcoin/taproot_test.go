package bitcoin

import (
	"testing"

	"github.com/btcsuite/btcd/chaincfg"
)

func TestGenerateTaprootVault(t *testing.T) {
	prophecyWords := []string{
		"excalibur", "axiom", "quantum", "taproot", "omega",
		"delta", "tetra", "proof", "work", "ambiguity",
		"protocol", "vault", "prophecy",
	}

	vault, err := GenerateTaprootVault(prophecyWords, &chaincfg.TestNet3Params)
	if err != nil {
		t.Fatalf("Failed to generate vault: %v", err)
	}

	if vault.Address == "" {
		t.Error("Vault address should not be empty")
	}

	if len(vault.ProphecyHash) != 32 {
		t.Errorf("Expected prophecy hash length 32, got %d", len(vault.ProphecyHash))
	}

	if len(vault.TweakHash) != 32 {
		t.Errorf("Expected tweak hash length 32, got %d", len(vault.TweakHash))
	}

	// Address should start with tb1p for testnet
	if len(vault.Address) < 4 || vault.Address[:4] != "tb1p" {
		t.Errorf("Expected testnet address to start with tb1p, got %s", vault.Address[:4])
	}
}

func TestGenerateTaprootVault_InvalidProphecy(t *testing.T) {
	// Test with wrong number of words
	prophecyWords := []string{"word1", "word2"}

	_, err := GenerateTaprootVault(prophecyWords, &chaincfg.TestNet3Params)
	if err == nil {
		t.Error("Expected error with invalid prophecy word count")
	}
}

func TestGenerateTaprootVault_Determinism(t *testing.T) {
	prophecyWords := []string{
		"test", "one", "two", "three", "four",
		"five", "six", "seven", "eight", "nine",
		"ten", "eleven", "twelve",
	}

	vault1, err1 := GenerateTaprootVault(prophecyWords, &chaincfg.TestNet3Params)
	if err1 != nil {
		t.Fatalf("Failed to generate vault1: %v", err1)
	}

	vault2, err2 := GenerateTaprootVault(prophecyWords, &chaincfg.TestNet3Params)
	if err2 != nil {
		t.Fatalf("Failed to generate vault2: %v", err2)
	}

	// Prophecy hashes should be the same (deterministic)
	if string(vault1.ProphecyHash) != string(vault2.ProphecyHash) {
		t.Error("Prophecy hash should be deterministic")
	}

	// Addresses will be different because keys are randomly generated
	// This is intentional for security
}

func TestVerifyTaprootAddress(t *testing.T) {
	tests := []struct {
		name    string
		address string
		valid   bool
	}{
		{
			name:    "valid testnet address",
			address: "tb1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt",
			valid:   true,
		},
		{
			name:    "invalid witness version",
			address: "tb1q5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2s000000",
			valid:   false,
		},
		{
			name:    "invalid format",
			address: "not-an-address",
			valid:   false,
		},
		{
			name:    "empty address",
			address: "",
			valid:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := VerifyTaprootAddress(tt.address)
			if result != tt.valid {
				t.Errorf("VerifyTaprootAddress(%s) = %v, want %v", tt.address, result, tt.valid)
			}
		})
	}
}

func TestDecodeBech32m(t *testing.T) {
	// Generate a valid address first
	prophecyWords := []string{
		"test", "one", "two", "three", "four",
		"five", "six", "seven", "eight", "nine",
		"ten", "eleven", "twelve",
	}

	vault, err := GenerateTaprootVault(prophecyWords, &chaincfg.TestNet3Params)
	if err != nil {
		t.Fatalf("Failed to generate vault: %v", err)
	}

	// Decode it
	witnessVersion, program, err := DecodeBech32m(vault.Address)
	if err != nil {
		t.Fatalf("Failed to decode address: %v", err)
	}

	if witnessVersion != 1 {
		t.Errorf("Expected witness version 1, got %d", witnessVersion)
	}

	if len(program) != 32 {
		t.Errorf("Expected program length 32, got %d", len(program))
	}
}

func TestEncodeBech32m(t *testing.T) {
	// Create a dummy 32-byte pubkey
	pubkey := make([]byte, 32)
	for i := range pubkey {
		pubkey[i] = byte(i)
	}

	// Encode for testnet
	address, err := EncodeBech32m(pubkey, &chaincfg.TestNet3Params)
	if err != nil {
		t.Fatalf("Failed to encode address: %v", err)
	}

	// Should start with tb1p
	if len(address) < 4 || address[:4] != "tb1p" {
		t.Errorf("Expected address to start with tb1p, got %s", address[:4])
	}

	// Should be valid
	if !VerifyTaprootAddress(address) {
		t.Error("Generated address should be valid")
	}
}
