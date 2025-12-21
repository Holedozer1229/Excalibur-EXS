// Package bitcoin implements Bitcoin script building and validation
package bitcoin

import (
	"encoding/binary"
	"fmt"

	"github.com/btcsuite/btcd/txscript"
)

// CLTVScript represents a CheckLockTimeVerify (CLTV) script
type CLTVScript struct {
	LockHeight uint32
	PubKeyHash []byte
	Script     []byte
}

// BuildCLTVScript creates a Bitcoin script with OP_CHECKLOCKTIMEVERIFY
// that locks funds until the specified block height
//
// Script format:
// <lockHeight> OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
//
// This creates a standard P2PKH output that cannot be spent until lockHeight is reached
func BuildCLTVScript(lockHeight uint32, pubKeyHash []byte) (*CLTVScript, error) {
	if len(pubKeyHash) != 20 {
		return nil, fmt.Errorf("pubKeyHash must be 20 bytes, got %d", len(pubKeyHash))
	}

	if lockHeight == 0 {
		return nil, fmt.Errorf("lockHeight must be greater than 0")
	}

	// Build the script
	builder := txscript.NewScriptBuilder()

	// Push lockHeight as little-endian bytes
	lockHeightBytes := make([]byte, 4)
	binary.LittleEndian.PutUint32(lockHeightBytes, lockHeight)
	
	// Remove trailing zeros for minimal encoding
	trimmedHeight := trimTrailingZeros(lockHeightBytes)
	
	builder.AddData(trimmedHeight)
	builder.AddOp(txscript.OP_CHECKLOCKTIMEVERIFY)
	builder.AddOp(txscript.OP_DROP)
	
	// Standard P2PKH after CLTV
	builder.AddOp(txscript.OP_DUP)
	builder.AddOp(txscript.OP_HASH160)
	builder.AddData(pubKeyHash)
	builder.AddOp(txscript.OP_EQUALVERIFY)
	builder.AddOp(txscript.OP_CHECKSIG)

	script, err := builder.Script()
	if err != nil {
		return nil, fmt.Errorf("failed to build CLTV script: %w", err)
	}

	return &CLTVScript{
		LockHeight: lockHeight,
		PubKeyHash: pubKeyHash,
		Script:     script,
	}, nil
}

// trimTrailingZeros removes trailing zero bytes for minimal encoding
func trimTrailingZeros(b []byte) []byte {
	// Find the last non-zero byte
	lastNonZero := len(b) - 1
	for lastNonZero >= 0 && b[lastNonZero] == 0 {
		lastNonZero--
	}
	
	// If all zeros, return single zero byte
	if lastNonZero < 0 {
		return []byte{0}
	}
	
	return b[:lastNonZero+1]
}

// ValidateCLTVScript validates a CLTV script structure
func ValidateCLTVScript(script []byte) (lockHeight uint32, err error) {
	if len(script) < 8 {
		return 0, fmt.Errorf("script too short to be valid CLTV script")
	}

	// Parse the script to extract lock height
	tokenizer := txscript.MakeScriptTokenizer(0, script)
	
	// First element should be the lock height
	if !tokenizer.Next() {
		return 0, fmt.Errorf("failed to read lock height from script")
	}
	
	heightData := tokenizer.Data()
	if len(heightData) == 0 || len(heightData) > 4 {
		return 0, fmt.Errorf("invalid lock height data length: %d", len(heightData))
	}

	// Convert to uint32 (handle variable-length encoding)
	heightBytes := make([]byte, 4)
	copy(heightBytes, heightData)
	lockHeight = binary.LittleEndian.Uint32(heightBytes)

	// Next should be OP_CHECKLOCKTIMEVERIFY
	if !tokenizer.Next() {
		return 0, fmt.Errorf("expected OP_CHECKLOCKTIMEVERIFY")
	}
	
	if tokenizer.Opcode() != txscript.OP_CHECKLOCKTIMEVERIFY {
		return 0, fmt.Errorf("expected OP_CHECKLOCKTIMEVERIFY, got %v", tokenizer.Opcode())
	}

	return lockHeight, nil
}

// GetScriptAddress returns a human-readable representation of the script address
func (c *CLTVScript) GetScriptAddress() string {
	return fmt.Sprintf("CLTV(height=%d, pubKeyHash=%x)", c.LockHeight, c.PubKeyHash)
}

// IsSpendable checks if the CLTV output can be spent at the given block height
func (c *CLTVScript) IsSpendable(currentHeight uint32) bool {
	return currentHeight >= c.LockHeight
}
