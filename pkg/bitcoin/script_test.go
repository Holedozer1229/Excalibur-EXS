package bitcoin

import (
	"bytes"
	"testing"

	"github.com/btcsuite/btcd/txscript"
)

func TestBuildCLTVScript(t *testing.T) {
	pubKeyHash := make([]byte, 20)
	for i := range pubKeyHash {
		pubKeyHash[i] = byte(i)
	}

	tests := []struct {
		name       string
		lockHeight uint32
		pubKeyHash []byte
		wantErr    bool
	}{
		{
			name:       "valid script with height 4320",
			lockHeight: 4320,
			pubKeyHash: pubKeyHash,
			wantErr:    false,
		},
		{
			name:       "valid script with height 8640",
			lockHeight: 8640,
			pubKeyHash: pubKeyHash,
			wantErr:    false,
		},
		{
			name:       "invalid pubKeyHash length",
			lockHeight: 1000,
			pubKeyHash: make([]byte, 15),
			wantErr:    true,
		},
		{
			name:       "zero lock height",
			lockHeight: 0,
			pubKeyHash: pubKeyHash,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cltv, err := BuildCLTVScript(tt.lockHeight, tt.pubKeyHash)
			if (err != nil) != tt.wantErr {
				t.Errorf("BuildCLTVScript() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if cltv.LockHeight != tt.lockHeight {
					t.Errorf("LockHeight = %d, want %d", cltv.LockHeight, tt.lockHeight)
				}

				if !bytes.Equal(cltv.PubKeyHash, tt.pubKeyHash) {
					t.Errorf("PubKeyHash mismatch")
				}

				if len(cltv.Script) == 0 {
					t.Errorf("Script is empty")
				}
			}
		})
	}
}

func TestValidateCLTVScript(t *testing.T) {
	pubKeyHash := make([]byte, 20)
	for i := range pubKeyHash {
		pubKeyHash[i] = byte(i)
	}

	// Build a valid CLTV script
	cltv, err := BuildCLTVScript(4320, pubKeyHash)
	if err != nil {
		t.Fatalf("Failed to build CLTV script: %v", err)
	}

	// Validate it
	lockHeight, err := ValidateCLTVScript(cltv.Script)
	if err != nil {
		t.Errorf("ValidateCLTVScript() error = %v", err)
	}

	if lockHeight != 4320 {
		t.Errorf("ValidateCLTVScript() lockHeight = %d, want 4320", lockHeight)
	}

	// Test invalid script
	invalidScript := []byte{txscript.OP_TRUE}
	_, err = ValidateCLTVScript(invalidScript)
	if err == nil {
		t.Error("ValidateCLTVScript() expected error for invalid script")
	}
}

func TestIsSpendable(t *testing.T) {
	pubKeyHash := make([]byte, 20)
	cltv, err := BuildCLTVScript(4320, pubKeyHash)
	if err != nil {
		t.Fatalf("Failed to build CLTV script: %v", err)
	}

	tests := []struct {
		name          string
		currentHeight uint32
		want          bool
	}{
		{
			name:          "before lock height",
			currentHeight: 4319,
			want:          false,
		},
		{
			name:          "at lock height",
			currentHeight: 4320,
			want:          true,
		},
		{
			name:          "after lock height",
			currentHeight: 5000,
			want:          true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := cltv.IsSpendable(tt.currentHeight)
			if got != tt.want {
				t.Errorf("IsSpendable(%d) = %v, want %v", tt.currentHeight, got, tt.want)
			}
		})
	}
}

func TestTrimTrailingZeros(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
		want  []byte
	}{
		{
			name:  "no trailing zeros",
			input: []byte{0x01, 0x02, 0x03},
			want:  []byte{0x01, 0x02, 0x03},
		},
		{
			name:  "one trailing zero",
			input: []byte{0x01, 0x02, 0x00},
			want:  []byte{0x01, 0x02},
		},
		{
			name:  "multiple trailing zeros",
			input: []byte{0x01, 0x00, 0x00, 0x00},
			want:  []byte{0x01},
		},
		{
			name:  "all zeros",
			input: []byte{0x00, 0x00, 0x00},
			want:  []byte{0x00},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := trimTrailingZeros(tt.input)
			if !bytes.Equal(got, tt.want) {
				t.Errorf("trimTrailingZeros() = %v, want %v", got, tt.want)
			}
		})
	}
}
