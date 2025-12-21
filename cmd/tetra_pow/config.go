// File: cmd/tetra_pow/config.go
// Purpose: Configuration constants for Tetra-PoW miner
// Aligns with: Treasury (15% allocation), Tokenomics (50 EXS block reward)

package main

const (
	// Mining algorithm parameters
	QuantumRounds    = 128      // 128 nonlinear rounds per mining attempt
	PBKDF2Iterations = 600000   // HPP-1 quantum hardening iterations
	
	// Block rewards (aligns with treasury.go constants)
	BlockReward        = 50.0   // 50 EXS per block
	TreasuryPercent    = 0.15   // 15% to treasury
	TreasuryAllocation = 7.5    // 7.5 EXS per block (15% of 50)
	MinerReward        = 42.5   // 42.5 EXS per block (85% of 50)
	
	// Mini-output configuration (aligns with treasury rolling release)
	MiniOutputCount  = 3        // 3 mini-outputs per block
	MiniOutputAmount = 2.5      // 2.5 EXS per mini-output
	
	// CLTV time-lock intervals (in blocks, ~10 min per block)
	CLTVInterval1 = 0           // Immediate (0 blocks)
	CLTVInterval2 = 4320        // ~1 month (30 days × 144 blocks/day)
	CLTVInterval3 = 8640        // ~2 months (60 days × 144 blocks/day)
	
	// Network parameters
	TargetBlockTime = 600       // 10 minutes in seconds
	MaxSupply       = 21000000  // 21 million EXS
	
	// Difficulty adjustment
	DefaultDifficulty = 4       // Leading zero bytes in hash
	MaxDifficulty     = 8       // Maximum difficulty
	MinDifficulty     = 1       // Minimum difficulty
)

// Arthurian 13-word prophecy axiom (reference only - always use hashed)
// Actual value passed via command line or environment variable
// NEVER store raw axiom on-chain or in logs
const AxiomReference = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

// AxiomWordCount validates the axiom has exactly 13 words
const AxiomWordCount = 13
