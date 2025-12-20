package crypto

import (
	"bytes"
	"testing"
)

func TestHPP1(t *testing.T) {
	password := []byte("test-password")
	salt := []byte("test-salt")
	keyLen := 32

	// Test basic functionality
	key := HPP1(password, salt, keyLen)
	
	if len(key) != keyLen {
		t.Errorf("Expected key length %d, got %d", keyLen, len(key))
	}

	// Test determinism - same input should produce same output
	key2 := HPP1(password, salt, keyLen)
	if !bytes.Equal(key, key2) {
		t.Error("HPP1 should be deterministic")
	}

	// Test different passwords produce different keys
	key3 := HPP1([]byte("different-password"), salt, keyLen)
	if bytes.Equal(key, key3) {
		t.Error("Different passwords should produce different keys")
	}
}

func TestTetraPoWState(t *testing.T) {
	seed := make([]byte, 32)
	for i := range seed {
		seed[i] = byte(i)
	}

	state := NewTetraPoWState(seed)
	
	// Test state initialization
	if state.state[0] == 0 && state.state[1] == 0 && state.state[2] == 0 && state.state[3] == 0 {
		t.Error("State should be initialized from seed")
	}

	// Test round execution
	initialState := state.state
	state.Round()
	if state.state == initialState {
		t.Error("Round should modify state")
	}

	// Test compute
	hash := state.Compute()
	if len(hash) != 32 {
		t.Errorf("Expected hash length 32, got %d", len(hash))
	}
}

func TestTetraPoWDeterminism(t *testing.T) {
	data := []byte("test-data")
	difficulty := uint64(0xFFFFFFFFFFFFFF00) // Very low difficulty for fast test

	nonce1, hash1 := TetraPoW(data, difficulty)
	nonce2, hash2 := TetraPoW(data, difficulty)

	// Same input should produce same output
	if nonce1 != nonce2 {
		t.Error("TetraPoW should be deterministic for same input")
	}
	if !bytes.Equal(hash1, hash2) {
		t.Error("TetraPoW should produce same hash for same input")
	}
}

func BenchmarkHPP1(b *testing.B) {
	password := []byte("benchmark-password")
	salt := []byte("benchmark-salt")
	keyLen := 32

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		HPP1(password, salt, keyLen)
	}
}

func BenchmarkTetraPoWRound(b *testing.B) {
	seed := make([]byte, 32)
	state := NewTetraPoWState(seed)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		state.Round()
	}
}

func BenchmarkTetraPoWCompute(b *testing.B) {
	seed := make([]byte, 32)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		state := NewTetraPoWState(seed)
		state.Compute()
	}
}
