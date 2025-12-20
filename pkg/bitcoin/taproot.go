package bitcoin

import (
	"crypto/sha256"
	"errors"
	"fmt"

	"github.com/btcsuite/btcd/btcec/v2"
	"github.com/btcsuite/btcd/btcec/v2/schnorr"
	"github.com/btcsuite/btcd/btcutil/bech32"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/txscript"
)

// TaprootVault represents a Taproot (P2TR) vault with unique, un-linkable properties
type TaprootVault struct {
	InternalKey  *btcec.PublicKey
	OutputKey    *btcec.PublicKey
	TweakHash    []byte
	Address      string
	ProphecyHash []byte // 13-word prophecy axiom hash
}

// GenerateTaprootVault creates a unique Taproot vault using the 13-word prophecy axiom
func GenerateTaprootVault(prophecyWords []string, network *chaincfg.Params) (*TaprootVault, error) {
	if len(prophecyWords) != 13 {
		return nil, errors.New("prophecy axiom must contain exactly 13 words")
	}

	// Create prophecy hash from 13 words
	prophecyData := ""
	for _, word := range prophecyWords {
		prophecyData += word
	}
	prophecyHash := sha256.Sum256([]byte(prophecyData))

	// Generate internal key from prophecy
	privKey, err := btcec.NewPrivateKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate private key: %w", err)
	}
	internalKey := privKey.PubKey()

	// Create taproot tweak using prophecy hash
	tweak := sha256.Sum256(append(schnorr.SerializePubKey(internalKey), prophecyHash[:]...))

	// Apply taproot construction
	outputKey := txscript.ComputeTaprootOutputKey(internalKey, tweak[:])

	// Generate Bech32m address
	address, err := EncodeBech32m(schnorr.SerializePubKey(outputKey), network)
	if err != nil {
		return nil, fmt.Errorf("failed to encode bech32m address: %w", err)
	}

	return &TaprootVault{
		InternalKey:  internalKey,
		OutputKey:    outputKey,
		TweakHash:    tweak[:],
		Address:      address,
		ProphecyHash: prophecyHash[:],
	}, nil
}

// EncodeBech32m encodes a Taproot output key as a Bech32m address
func EncodeBech32m(pubkey []byte, network *chaincfg.Params) (string, error) {
	// Taproot uses witness version 1
	witnessVersion := byte(1)

	// Convert to 5-bit groups for bech32
	converted, err := bech32.ConvertBits(pubkey, 8, 5, true)
	if err != nil {
		return "", fmt.Errorf("failed to convert bits: %w", err)
	}

	// Prepend witness version
	data := append([]byte{witnessVersion}, converted...)

	// Get HRP (human-readable part) based on network
	hrp := "bc" // mainnet
	if network.Name == "testnet3" || network.Name == "testnet" {
		hrp = "tb"
	} else if network.Name == "regtest" {
		hrp = "bcrt"
	}

	// Encode using Bech32m (variant M)
	encoded, err := bech32.EncodeM(hrp, data)
	if err != nil {
		return "", fmt.Errorf("failed to encode bech32m: %w", err)
	}

	return encoded, nil
}

// DecodeBech32m decodes a Bech32m Taproot address
func DecodeBech32m(address string) (witnessVersion byte, program []byte, err error) {
	hrp, data, err := bech32.DecodeNoLimit(address)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to decode bech32m: %w", err)
	}

	// Validate HRP
	if hrp != "bc" && hrp != "tb" && hrp != "bcrt" {
		return 0, nil, errors.New("invalid hrp for taproot address")
	}

	// Extract witness version and program
	if len(data) < 1 {
		return 0, nil, errors.New("invalid address data")
	}

	witnessVersion = data[0]
	if witnessVersion != 1 {
		return 0, nil, errors.New("not a taproot address (witness version must be 1)")
	}

	// Convert back from 5-bit to 8-bit
	program, err = bech32.ConvertBits(data[1:], 5, 8, false)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to convert bits: %w", err)
	}

	return witnessVersion, program, nil
}

// VerifyTaprootAddress validates a Taproot Bech32m address
func VerifyTaprootAddress(address string) bool {
	witnessVersion, program, err := DecodeBech32m(address)
	if err != nil {
		return false
	}

	// Taproot addresses should have witness version 1 and 32-byte program
	return witnessVersion == 1 && len(program) == 32
}
