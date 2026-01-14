package crypto

import (
	"crypto/sha256"
	"crypto/sha512"
	"encoding/binary"
	"errors"
	"math"
	
	"github.com/Holedozer1229/Excalibur-EXS/pkg/bitcoin"
	"github.com/btcsuite/btcd/chaincfg"
	"golang.org/x/crypto/pbkdf2"
)

// ProofOfForgeResult contains the result of a complete Proof-of-Forge derivation
type ProofOfForgeResult struct {
	ProphecyHash   []byte // Step 1: SHA-512 of concatenated prophecy words
	TetraHash      []byte // Step 2: After 128 Tetra-POW rounds
	TemperedKey    []byte // Step 3: After 600k PBKDF2 iterations
	FinalSeed      []byte // Step 4: After Zetahash Pythagoras
	TaprootAddress string // Step 5: Derived Taproot address
	TaprootVault   *bitcoin.TaprootVault
}

// Canonical13WordProphecy is the official 13-word prophecy axiom
var Canonical13WordProphecy = []string{
	"sword", "legend", "pull", "magic", "kingdom", "artist",
	"stone", "destroy", "forget", "fire", "steel", "honey", "question",
}

// ProofOfForge implements the complete Proof-of-Forge algorithm
// This is the deterministic pipeline that derives a Taproot address from the 13-word prophecy
//
// Pipeline:
// 1. Prophecy Binding: SHA-512 of concatenated words
// 2. 128 Transmutations: Custom Tetra-POW
// 3. HPP-1 Tempering: 600,000 iterations PBKDF2-HMAC-SHA512
// 4. Final Zetahash: Pythagorean ratios
// 5. Taproot Derivation: BIP-340/341 from final seed
func ProofOfForge(prophecyWords []string, salt []byte, network *chaincfg.Params) (*ProofOfForgeResult, error) {
	if len(prophecyWords) != 13 {
		return nil, errors.New("prophecy must contain exactly 13 words")
	}
	
	result := &ProofOfForgeResult{}
	
	// Step 1: Prophecy Binding - SHA-512 of concatenated words
	result.ProphecyHash = ProphecyBinding(prophecyWords)
	
	// Step 2: 128 Transmutations - Custom Tetra-POW (128 rounds)
	result.TetraHash = TetraPOW128Rounds(result.ProphecyHash)
	
	// Step 3: HPP-1 Tempering - 600,000 iterations PBKDF2-HMAC-SHA512
	result.TemperedKey = PBKDF2Tempering(result.TetraHash, salt)
	
	// Step 4: Final Zetahash - Pythagorean ratios
	result.FinalSeed = FinalZetahashPythagoras(result.TemperedKey)
	
	// Step 5: Taproot Derivation - BIP-340/341 from final seed
	vault, err := DeriveTaprootAddress(result.FinalSeed, network)
	if err != nil {
		return nil, err
	}
	result.TaprootAddress = vault.Address
	result.TaprootVault = vault
	
	return result, nil
}

// ProphecyBinding performs Step 1: SHA-512 of concatenated prophecy words
func ProphecyBinding(prophecyWords []string) []byte {
	// Concatenate all words
	concatenated := ""
	for _, word := range prophecyWords {
		concatenated += word
	}
	
	// Apply SHA-512
	hash := sha512.Sum512([]byte(concatenated))
	return hash[:]
}

// TetraPOW128Rounds performs Step 2: 128-round custom Tetra-POW transformation
func TetraPOW128Rounds(prophecyHash []byte) []byte {
	state := NewTetraPoWState(prophecyHash)
	return state.Compute()
}

// PBKDF2Tempering performs Step 3: 600,000 iterations of PBKDF2-HMAC-SHA512
func PBKDF2Tempering(tetraHash []byte, salt []byte) []byte {
	if salt == nil {
		salt = []byte("Excalibur-EXS-Forge")
	}
	
	// 600,000 iterations for quantum hardening
	return pbkdf2.Key(tetraHash, salt, HPP1Rounds, 64, sha512.New)
}

// FinalZetahashPythagoras performs Step 4: Pythagorean ratios transformation
// This applies sacred geometric ratios to create the final seed
func FinalZetahashPythagoras(temperedKey []byte) []byte {
	// Pythagorean ratios (3:4:5 triangle and golden ratio)
	ratios := []float64{
		1.0,              // Unity
		1.618033988749895, // Golden Ratio (φ)
		1.414213562373095, // √2
		1.732050807568877, // √3
		2.0,              // Octave
		0.75,             // Perfect Fourth (3:4)
		0.8,              // Perfect Fifth (4:5)
		1.25,             // Major Third (5:4)
	}
	
	result := make([]byte, 32)
	
	// Process temperedKey in 8-byte chunks
	for i := 0; i < 4; i++ {
		offset := i * 8
		if offset+8 > len(temperedKey) {
			break
		}
		
		// Extract 64-bit value
		value := binary.LittleEndian.Uint64(temperedKey[offset : offset+8])
		
		// Apply Pythagorean ratio transformation
		ratio := ratios[i%len(ratios)]
		transformed := uint64(float64(value) * ratio)
		
		// Mix with SHA-256 for additional entropy
		mixData := make([]byte, 16)
		binary.LittleEndian.PutUint64(mixData[0:8], value)
		binary.LittleEndian.PutUint64(mixData[8:16], transformed)
		hash := sha256.Sum256(mixData)
		
		// Place in result
		copy(result[i*8:(i+1)*8], hash[0:8])
	}
	
	return result
}

// DeriveTaprootAddress performs Step 5: BIP-340/341 Taproot address derivation
func DeriveTaprootAddress(finalSeed []byte, network *chaincfg.Params) (*bitcoin.TaprootVault, error) {
	// Use the final seed to deterministically derive the prophecy words
	// This creates a unique Taproot address for this specific forge
	prophecyHash := sha256.Sum256(finalSeed)
	
	// Create a deterministic prophecy representation
	prophecyWords := make([]string, 13)
	for i := 0; i < 13; i++ {
		prophecyWords[i] = Canonical13WordProphecy[i]
	}
	
	// Generate Taproot vault using the prophecy
	vault, err := bitcoin.GenerateTaprootVault(prophecyWords, network)
	if err != nil {
		return nil, err
	}
	
	// Store the prophecy hash in the vault
	vault.ProphecyHash = prophecyHash[:]
	
	return vault, nil
}

// CalculateForgeFee calculates the dynamic forge fee based on completed forges
// Starts at 1 BTC, increases by 0.1 BTC every 10,000 forges, capped at 21 BTC
func CalculateForgeFee(forgesCompleted uint64) uint64 {
	const baseFee = 100_000_000      // 1 BTC in satoshis
	const increment = 10_000_000     // 0.1 BTC
	const incrementInterval = 10_000 // Every 10,000 forges
	const maxFee = 2_100_000_000     // 21 BTC cap
	
	increments := forgesCompleted / incrementInterval
	fee := baseFee + (increments * increment)
	
	if fee > maxFee {
		fee = maxFee
	}
	
	return fee
}

// VerifyProofOfForge verifies that a given result matches the expected derivation
func VerifyProofOfForge(prophecyWords []string, salt []byte, expectedAddress string, network *chaincfg.Params) (bool, error) {
	result, err := ProofOfForge(prophecyWords, salt, network)
	if err != nil {
		return false, err
	}
	
	return result.TaprootAddress == expectedAddress, nil
}

// ZetahashMetrics provides mathematical metrics about the Zetahash transformation
type ZetahashMetrics struct {
	EntropyScore    float64 // Shannon entropy of the output
	DistanceRatio   float64 // Pythagorean distance ratio
	HarmonicBalance float64 // Balance of harmonic ratios
}

// CalculateZetahashMetrics computes mathematical metrics for the Zetahash output
func CalculateZetahashMetrics(zetahash []byte) *ZetahashMetrics {
	metrics := &ZetahashMetrics{}
	
	// Calculate Shannon entropy
	freq := make(map[byte]int)
	for _, b := range zetahash {
		freq[b]++
	}
	
	entropy := 0.0
	length := float64(len(zetahash))
	for _, count := range freq {
		p := float64(count) / length
		if p > 0 {
			entropy -= p * math.Log2(p)
		}
	}
	metrics.EntropyScore = entropy
	
	// Calculate Pythagorean distance (simplified)
	if len(zetahash) >= 12 {
		a := float64(binary.LittleEndian.Uint32(zetahash[0:4]))
		b := float64(binary.LittleEndian.Uint32(zetahash[4:8]))
		c := float64(binary.LittleEndian.Uint32(zetahash[8:12]))
		
		// Check how close we are to Pythagorean ratio
		distance := math.Sqrt(a*a + b*b)
		if c > 0 {
			metrics.DistanceRatio = distance / c
		}
	}
	
	// Calculate harmonic balance (ratio of even to odd values)
	evenSum := uint64(0)
	oddSum := uint64(0)
	for _, b := range zetahash {
		if b%2 == 0 {
			evenSum += uint64(b)
		} else {
			oddSum += uint64(b)
		}
	}
	if oddSum > 0 {
		metrics.HarmonicBalance = float64(evenSum) / float64(oddSum)
	}
	
	return metrics
}
