package bitcoin

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

// SPVClient implements a Bitcoin Simplified Payment Verification client
type SPVClient struct {
	network       *chaincfg.Params
	headers       map[chainhash.Hash]*wire.BlockHeader
	headersMu     sync.RWMutex
	bestHeight    int32
	bestHash      *chainhash.Hash
	filterHeaders map[chainhash.Hash][]byte
	peers         []*Peer
	peersMu       sync.RWMutex
	ctx           context.Context
	cancel        context.CancelFunc
}

// Peer represents a connection to a Bitcoin node
type Peer struct {
	Address    string
	Connected  bool
	LastSeen   time.Time
	Height     int32
	UserAgent  string
	Services   wire.ServiceFlag
}

// BlockHeaderInfo contains information about a block header
type BlockHeaderInfo struct {
	Hash       chainhash.Hash
	Height     int32
	PrevBlock  chainhash.Hash
	MerkleRoot chainhash.Hash
	Timestamp  time.Time
	Bits       uint32
	Nonce      uint32
}

// TransactionProof represents a proof of transaction inclusion
type TransactionProof struct {
	BlockHash   chainhash.Hash
	BlockHeight int32
	TxHash      chainhash.Hash
	MerkleProof []chainhash.Hash
	Position    int
}

// NewSPVClient creates a new SPV client
func NewSPVClient(network *chaincfg.Params) *SPVClient {
	ctx, cancel := context.WithCancel(context.Background())
	return &SPVClient{
		network:       network,
		headers:       make(map[chainhash.Hash]*wire.BlockHeader),
		filterHeaders: make(map[chainhash.Hash][]byte),
		peers:         make([]*Peer, 0),
		ctx:           ctx,
		cancel:        cancel,
	}
}

// Start initializes the SPV client and begins syncing
func (s *SPVClient) Start() error {
	// Initialize with genesis block
	genesisHeader := &s.network.GenesisBlock.Header
	genesisHash := s.network.GenesisHash
	
	s.headersMu.Lock()
	s.headers[*genesisHash] = genesisHeader
	s.bestHash = genesisHash
	s.bestHeight = 0
	s.headersMu.Unlock()

	// Start background sync
	go s.syncLoop()

	return nil
}

// Stop gracefully shuts down the SPV client
func (s *SPVClient) Stop() error {
	s.cancel()
	
	// Disconnect all peers
	s.peersMu.Lock()
	for _, peer := range s.peers {
		peer.Connected = false
	}
	s.peersMu.Unlock()
	
	return nil
}

// AddPeer adds a new peer to the client
func (s *SPVClient) AddPeer(address string) error {
	s.peersMu.Lock()
	defer s.peersMu.Unlock()

	// Check if peer already exists
	for _, peer := range s.peers {
		if peer.Address == address {
			return errors.New("peer already exists")
		}
	}

	peer := &Peer{
		Address:   address,
		Connected: false,
		LastSeen:  time.Now(),
	}

	s.peers = append(s.peers, peer)
	
	// Attempt to connect in background
	go s.connectPeer(peer)
	
	return nil
}

// GetBestBlock returns the current best block
func (s *SPVClient) GetBestBlock() (chainhash.Hash, int32) {
	s.headersMu.RLock()
	defer s.headersMu.RUnlock()
	
	if s.bestHash == nil {
		return chainhash.Hash{}, 0
	}
	
	return *s.bestHash, s.bestHeight
}

// GetBlockHeader retrieves a block header by hash
func (s *SPVClient) GetBlockHeader(hash chainhash.Hash) (*BlockHeaderInfo, error) {
	s.headersMu.RLock()
	defer s.headersMu.RUnlock()

	header, exists := s.headers[hash]
	if !exists {
		return nil, fmt.Errorf("block header not found: %s", hash.String())
	}

	info := &BlockHeaderInfo{
		Hash:       hash,
		PrevBlock:  header.PrevBlock,
		MerkleRoot: header.MerkleRoot,
		Timestamp:  header.Timestamp,
		Bits:       header.Bits,
		Nonce:      header.Nonce,
	}

	return info, nil
}

// VerifyTransaction verifies if a transaction is included in a block
func (s *SPVClient) VerifyTransaction(txHash chainhash.Hash, blockHash chainhash.Hash, merkleProof []chainhash.Hash) (bool, error) {
	// Get block header
	header, err := s.GetBlockHeader(blockHash)
	if err != nil {
		return false, err
	}

	// Verify merkle proof
	computedRoot := s.computeMerkleRoot(txHash, merkleProof)
	
	return computedRoot == header.MerkleRoot, nil
}

// GetTransactionProof retrieves a merkle proof for a transaction
func (s *SPVClient) GetTransactionProof(txHash chainhash.Hash, blockHash chainhash.Hash) (*TransactionProof, error) {
	// This would normally query a peer for the merkle proof
	// For now, return a placeholder structure
	
	header, err := s.GetBlockHeader(blockHash)
	if err != nil {
		return nil, err
	}

	proof := &TransactionProof{
		BlockHash:   blockHash,
		BlockHeight: header.Height,
		TxHash:      txHash,
		MerkleProof: make([]chainhash.Hash, 0),
		Position:    0,
	}

	return proof, nil
}

// WatchAddress watches for transactions to/from an address
func (s *SPVClient) WatchAddress(address btcutil.Address) error {
	// This would set up a BIP 157/158 compact block filter
	// to watch for transactions involving this address
	
	// For now, just validate the address
	if address.String() == "" {
		return errors.New("invalid address")
	}

	return nil
}

// GetPeerCount returns the number of connected peers
func (s *SPVClient) GetPeerCount() int {
	s.peersMu.RLock()
	defer s.peersMu.RUnlock()

	count := 0
	for _, peer := range s.peers {
		if peer.Connected {
			count++
		}
	}
	
	return count
}

// syncLoop continuously syncs block headers
func (s *SPVClient) syncLoop() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.syncHeaders()
		}
	}
}

// syncHeaders syncs block headers from peers
func (s *SPVClient) syncHeaders() {
	s.peersMu.RLock()
	connectedPeers := 0
	for _, peer := range s.peers {
		if peer.Connected {
			connectedPeers++
		}
	}
	s.peersMu.RUnlock()

	if connectedPeers == 0 {
		return
	}

	// Request headers from peers
	// This would send a 'getheaders' message to connected peers
	// and process the response
}

// connectPeer attempts to connect to a peer
func (s *SPVClient) connectPeer(peer *Peer) {
	// This would establish a TCP connection to the peer
	// and perform the Bitcoin protocol handshake
	
	// For now, mark as connected after a delay using context-aware timer
	select {
	case <-s.ctx.Done():
		return
	case <-time.After(2 * time.Second):
		s.peersMu.Lock()
		peer.Connected = true
		peer.LastSeen = time.Now()
		s.peersMu.Unlock()
	}
}

// computeMerkleRoot computes the merkle root from a tx hash and proof
func (s *SPVClient) computeMerkleRoot(txHash chainhash.Hash, proof []chainhash.Hash) chainhash.Hash {
	current := txHash
	
	for _, proofHash := range proof {
		// Concatenate and hash
		combined := append(current[:], proofHash[:]...)
		current = chainhash.DoubleHashH(combined)
	}
	
	return current
}

// AddBlockHeader adds a new block header to the SPV client
func (s *SPVClient) AddBlockHeader(header *wire.BlockHeader) error {
	s.headersMu.Lock()
	defer s.headersMu.Unlock()

	// Calculate block hash
	blockHash := header.BlockHash()

	// Check if we already have this header
	if _, exists := s.headers[blockHash]; exists {
		return errors.New("header already exists")
	}

	// Verify it connects to our chain
	if _, exists := s.headers[header.PrevBlock]; !exists && s.bestHeight > 0 {
		return errors.New("header does not connect to known chain")
	}

	// Store the header
	s.headers[blockHash] = header

	// Update best block if this extends the chain
	if header.PrevBlock == *s.bestHash {
		s.bestHash = &blockHash
		s.bestHeight++
	}

	return nil
}

// GetNetworkName returns the network name
func (s *SPVClient) GetNetworkName() string {
	return s.network.Name
}

// IsMainNet returns true if connected to mainnet
func (s *SPVClient) IsMainNet() bool {
	return s.network.Name == chaincfg.MainNetParams.Name
}

// GetHeaderCount returns the number of headers stored
func (s *SPVClient) GetHeaderCount() int {
	s.headersMu.RLock()
	defer s.headersMu.RUnlock()
	return len(s.headers)
}
