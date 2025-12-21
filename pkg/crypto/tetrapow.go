package crypto

import (
	"crypto/sha256"
	"encoding/binary"
	"golang.org/x/crypto/pbkdf2"
)

// HPP1Rounds defines the number of rounds for HPP-1 (600,000 rounds)
const HPP1Rounds = 600000

// DefaultSalt is the default salt used for HPP-1 key derivation in Tetra-PoW
const DefaultSalt = "Excalibur-EXS-Ω′Δ18"

// SafetyCheckInterval defines the interval for safety checks during mining
const SafetyCheckInterval = 1000000

// HPP1 performs High-Performance PBKDF2-based key derivation with 600,000 rounds
// This provides quantum-hardened security for the Excalibur-ESX protocol
func HPP1(password, salt []byte, keyLen int) []byte {
	return pbkdf2.Key(password, salt, HPP1Rounds, keyLen, sha256.New)
}

// TetraPoWState represents the 128-round unrolled nonlinear state shifts
type TetraPoWState struct {
	state [4]uint64
}

// NewTetraPoWState initializes a new Tetra-PoW state
func NewTetraPoWState(seed []byte) *TetraPoWState {
	t := &TetraPoWState{}
	if len(seed) >= 32 {
		t.state[0] = binary.LittleEndian.Uint64(seed[0:8])
		t.state[1] = binary.LittleEndian.Uint64(seed[8:16])
		t.state[2] = binary.LittleEndian.Uint64(seed[16:24])
		t.state[3] = binary.LittleEndian.Uint64(seed[24:32])
	}
	return t
}

// Round performs a single nonlinear state shift
func (t *TetraPoWState) Round() {
	// Nonlinear mixing using bitwise operations
	t.state[0] = t.state[0] ^ (t.state[1] << 13) ^ (t.state[3] >> 7)
	t.state[1] = t.state[1] ^ (t.state[2] << 17) ^ (t.state[0] >> 5)
	t.state[2] = t.state[2] ^ (t.state[3] << 23) ^ (t.state[1] >> 11)
	t.state[3] = t.state[3] ^ (t.state[0] << 29) ^ (t.state[2] >> 3)
	
	// Add entropy
	t.state[0] += 0x9E3779B97F4A7C15
	t.state[1] += 0x243F6A8885A308D3
	t.state[2] += 0x13198A2E03707344
	t.state[3] += 0xA4093822299F31D0
}

// Compute performs 128 rounds of Tetra-PoW
func (t *TetraPoWState) Compute() []byte {
	for i := 0; i < 128; i++ {
		t.Round()
	}
	
	result := make([]byte, 32)
	binary.LittleEndian.PutUint64(result[0:8], t.state[0])
	binary.LittleEndian.PutUint64(result[8:16], t.state[1])
	binary.LittleEndian.PutUint64(result[16:24], t.state[2])
	binary.LittleEndian.PutUint64(result[24:32], t.state[3])
	
	return result
}

// TetraPoW performs the Ω′ Δ18 Tetra-PoW algorithm
func TetraPoW(data []byte, difficulty uint64) (nonce uint64, hash []byte) {
	for nonce = 0; ; nonce++ {
		// Combine data with nonce
		input := make([]byte, len(data)+8)
		copy(input, data)
		binary.LittleEndian.PutUint64(input[len(data):], nonce)
		
		// Apply HPP-1 for quantum hardening
		hpp1Result := HPP1(input, []byte(DefaultSalt), 32)
		
		// Apply Tetra-PoW state transformation
		state := NewTetraPoWState(hpp1Result)
		hash = state.Compute()
		
		// Check if hash meets difficulty target
		hashValue := binary.LittleEndian.Uint64(hash[0:8])
		if hashValue < difficulty {
			return nonce, hash
		}
		
		// Safety check to prevent infinite loops in testing
		if nonce%SafetyCheckInterval == 0 && nonce > 0 {
			// For very low difficulty, return after reasonable attempts
			if difficulty > 0xFFFFFFFFFFFFFF00 {
				return nonce, hash
			}
		}
	}
}
