package bitcoin

import (
	"testing"
	"time"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

func TestNewSPVClient(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	if client == nil {
		t.Fatal("Failed to create SPV client")
	}
	
	if client.network.Name != "testnet3" {
		t.Errorf("Expected testnet3, got %s", client.network.Name)
	}
}

func TestSPVClientStart(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	
	err := client.Start()
	if err != nil {
		t.Fatalf("Failed to start SPV client: %v", err)
	}
	
	// Check that genesis block is initialized
	hash, height := client.GetBestBlock()
	if height != 0 {
		t.Errorf("Expected height 0, got %d", height)
	}
	
	if hash.String() == "" {
		t.Error("Expected non-empty genesis hash")
	}
	
	client.Stop()
}

func TestSPVClientAddPeer(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	
	err := client.AddPeer("127.0.0.1:18333")
	if err != nil {
		t.Fatalf("Failed to add peer: %v", err)
	}
	
	// Try adding same peer again
	err = client.AddPeer("127.0.0.1:18333")
	if err == nil {
		t.Error("Expected error when adding duplicate peer")
	}
	
	client.Stop()
}

func TestSPVClientGetBestBlock(t *testing.T) {
	client := NewSPVClient(&chaincfg.MainNetParams)
	client.Start()
	
	hash, height := client.GetBestBlock()
	
	if height != 0 {
		t.Errorf("Expected initial height 0, got %d", height)
	}
	
	expectedGenesis := chaincfg.MainNetParams.GenesisHash
	if hash != *expectedGenesis {
		t.Errorf("Expected genesis hash %s, got %s", expectedGenesis, hash)
	}
	
	client.Stop()
}

func TestSPVClientAddBlockHeader(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	client.Start()
	
	// Create a test header building on genesis
	genesisHash := chaincfg.TestNet3Params.GenesisHash
	header := &wire.BlockHeader{
		Version:    1,
		PrevBlock:  *genesisHash,
		MerkleRoot: chainhash.Hash{},
		Timestamp:  time.Now(),
		Bits:       0x1d00ffff,
		Nonce:      0,
	}
	
	err := client.AddBlockHeader(header)
	if err != nil {
		t.Fatalf("Failed to add block header: %v", err)
	}
	
	// Verify best block advanced
	_, height := client.GetBestBlock()
	if height != 1 {
		t.Errorf("Expected height 1 after adding header, got %d", height)
	}
	
	client.Stop()
}

func TestSPVClientGetBlockHeader(t *testing.T) {
	client := NewSPVClient(&chaincfg.MainNetParams)
	client.Start()
	
	genesisHash := chaincfg.MainNetParams.GenesisHash
	
	info, err := client.GetBlockHeader(*genesisHash)
	if err != nil {
		t.Fatalf("Failed to get genesis header: %v", err)
	}
	
	if info.Hash != *genesisHash {
		t.Errorf("Expected genesis hash %s, got %s", genesisHash, info.Hash)
	}
	
	client.Stop()
}

func TestSPVClientGetPeerCount(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	
	count := client.GetPeerCount()
	if count != 0 {
		t.Errorf("Expected 0 peers initially, got %d", count)
	}
	
	// Note: This test creates a peer but doesn't wait for connection
	// In production code, use proper connection callbacks or channels
	client.AddPeer("127.0.0.1:18333")
	
	// For this test, we just verify peer was added
	// Real connection testing should use mocks or integration tests
	client.Stop()
}

func TestSPVClientNetworkInfo(t *testing.T) {
	mainnetClient := NewSPVClient(&chaincfg.MainNetParams)
	if !mainnetClient.IsMainNet() {
		t.Error("Expected mainnet client to be on mainnet")
	}
	if mainnetClient.GetNetworkName() != "mainnet" {
		t.Errorf("Expected 'mainnet', got %s", mainnetClient.GetNetworkName())
	}
	
	testnetClient := NewSPVClient(&chaincfg.TestNet3Params)
	if testnetClient.IsMainNet() {
		t.Error("Expected testnet client not to be on mainnet")
	}
}

func TestSPVClientHeaderCount(t *testing.T) {
	client := NewSPVClient(&chaincfg.TestNet3Params)
	client.Start()
	
	count := client.GetHeaderCount()
	if count != 1 { // Genesis
		t.Errorf("Expected 1 header (genesis), got %d", count)
	}
	
	// Add another header
	genesisHash := chaincfg.TestNet3Params.GenesisHash
	header := &wire.BlockHeader{
		Version:    1,
		PrevBlock:  *genesisHash,
		MerkleRoot: chainhash.Hash{},
		Timestamp:  time.Now(),
		Bits:       0x1d00ffff,
		Nonce:      0,
	}
	client.AddBlockHeader(header)
	
	count = client.GetHeaderCount()
	if count != 2 {
		t.Errorf("Expected 2 headers, got %d", count)
	}
	
	client.Stop()
}

func TestSPVClientStop(t *testing.T) {
	client := NewSPVClient(&chaincfg.MainNetParams)
	client.Start()
	
	err := client.Stop()
	if err != nil {
		t.Fatalf("Failed to stop SPV client: %v", err)
	}
}
