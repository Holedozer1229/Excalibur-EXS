//! Consensus engine for Proof-of-Forge

use crate::crypto::{proof_of_forge, ProofOfForgeResult, CANONICAL_PROPHECY};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use anyhow::{Result, anyhow};

/// Block header for the Excalibur blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    pub version: u32,
    pub height: u64,
    pub prev_block_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub timestamp: u64,
    pub difficulty: u32,
    pub nonce: u64,
}

/// Forge transaction representing a successful proof-of-forge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForgeTransaction {
    pub prophecy: String,
    pub derived_key: Vec<u8>,
    pub taproot_address: String,
    pub proof_hash: [u8; 32],
    pub timestamp: u64,
    pub signature: Vec<u8>,
}

/// Block in the Excalibur blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub header: BlockHeader,
    pub forges: Vec<ForgeTransaction>,
}

/// Proof-of-Forge consensus engine
pub struct ConsensusEngine {
    /// Current difficulty target (number of leading zeros required)
    difficulty: Arc<RwLock<u32>>,
    /// Minimum time between blocks (in seconds)
    min_block_time: u64,
    /// Maximum forges per block
    max_forges_per_block: usize,
    /// Total forges processed
    total_forges: Arc<RwLock<u64>>,
    /// Chain state
    chain_state: Arc<RwLock<ChainState>>,
}

#[derive(Debug, Clone)]
struct ChainState {
    /// Latest block height
    height: u64,
    /// Latest block hash
    latest_hash: [u8; 32],
    /// Used prophecy hashes to prevent replay
    used_prophecies: HashMap<[u8; 32], u64>,
}

impl ConsensusEngine {
    /// Create a new consensus engine
    pub fn new(initial_difficulty: u32, min_block_time: u64) -> Self {
        Self {
            difficulty: Arc::new(RwLock::new(initial_difficulty)),
            min_block_time,
            max_forges_per_block: 100,
            total_forges: Arc::new(RwLock::new(0)),
            chain_state: Arc::new(RwLock::new(ChainState {
                height: 0,
                latest_hash: [0u8; 32],
                used_prophecies: HashMap::new(),
            })),
        }
    }

    /// Validate a forge transaction
    pub fn validate_forge(&self, forge: &ForgeTransaction) -> Result<bool> {
        // 1. Verify the prophecy is the canonical one
        if forge.prophecy != CANONICAL_PROPHECY {
            return Err(anyhow!("Invalid prophecy - must use canonical 13-word axiom"));
        }

        // 2. Verify the proof-of-forge derivation
        let pof_result = proof_of_forge(&forge.prophecy, forge.timestamp)?;
        
        // 3. Check that derived key matches
        if pof_result.derived_key != forge.derived_key {
            return Err(anyhow!("Derived key mismatch"));
        }

        // 4. Check that taproot address matches
        if pof_result.taproot_address != forge.taproot_address {
            return Err(anyhow!("Taproot address mismatch"));
        }

        // 5. Verify proof hash meets difficulty requirement
        let difficulty = *self.difficulty.read().unwrap();
        if !self.check_difficulty(&pof_result.proof_hash, difficulty) {
            return Err(anyhow!("Proof hash does not meet difficulty requirement"));
        }

        // 6. Check for replay attacks - ensure this proof hasn't been used
        let state = self.chain_state.read().unwrap();
        if state.used_prophecies.contains_key(&pof_result.proof_hash) {
            return Err(anyhow!("Proof already used (replay attack)"));
        }

        Ok(true)
    }

    /// Validate a block
    pub fn validate_block(&self, block: &Block, parent_hash: &[u8; 32]) -> Result<bool> {
        // 1. Check parent hash matches
        if &block.header.prev_block_hash != parent_hash {
            return Err(anyhow!("Parent hash mismatch"));
        }

        // 2. Check block isn't empty
        if block.forges.is_empty() {
            return Err(anyhow!("Block must contain at least one forge"));
        }

        // 3. Check max forges limit
        if block.forges.len() > self.max_forges_per_block {
            return Err(anyhow!(
                "Too many forges in block (max: {})",
                self.max_forges_per_block
            ));
        }

        // 4. Validate each forge transaction
        for forge in &block.forges {
            self.validate_forge(forge)?;
        }

        // 5. Verify merkle root
        let computed_merkle = self.compute_merkle_root(&block.forges);
        if computed_merkle != block.header.merkle_root {
            return Err(anyhow!("Merkle root mismatch"));
        }

        // 6. Check timestamp is reasonable (not too far in past or future)
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if block.header.timestamp > now + 7200 {
            return Err(anyhow!("Block timestamp too far in future"));
        }

        Ok(true)
    }

    /// Apply a validated block to the chain state
    pub fn apply_block(&self, block: &Block) -> Result<()> {
        let mut state = self.chain_state.write().unwrap();
        
        // Update height
        state.height = block.header.height;
        
        // Compute and store block hash
        let block_hash = self.compute_block_hash(&block.header);
        state.latest_hash = block_hash;
        
        // Mark all forge proofs as used
        for forge in &block.forges {
            state.used_prophecies.insert(forge.proof_hash, block.header.height);
        }
        
        // Update total forges
        let mut total = self.total_forges.write().unwrap();
        *total += block.forges.len() as u64;
        
        // Adjust difficulty if needed
        self.adjust_difficulty(block.header.height);
        
        Ok(())
    }

    /// Check if a proof hash meets the difficulty requirement
    fn check_difficulty(&self, hash: &[u8; 32], difficulty: u32) -> bool {
        let leading_zeros = hash.iter()
            .take_while(|&&b| b == 0)
            .count() as u32;
        leading_zeros >= difficulty
    }

    /// Compute merkle root from forge transactions
    fn compute_merkle_root(&self, forges: &[ForgeTransaction]) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        
        if forges.is_empty() {
            return [0u8; 32];
        }
        
        let mut hashes: Vec<[u8; 32]> = forges
            .iter()
            .map(|f| {
                let serialized = bincode::serialize(f).unwrap();
                let mut hasher = Sha256::new();
                hasher.update(&serialized);
                hasher.finalize().into()
            })
            .collect();
        
        while hashes.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in hashes.chunks(2) {
                let mut hasher = Sha256::new();
                hasher.update(&chunk[0]);
                if chunk.len() > 1 {
                    hasher.update(&chunk[1]);
                } else {
                    hasher.update(&chunk[0]);
                }
                next_level.push(hasher.finalize().into());
            }
            hashes = next_level;
        }
        
        hashes[0]
    }

    /// Compute hash of a block header
    fn compute_block_hash(&self, header: &BlockHeader) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        let serialized = bincode::serialize(header).unwrap();
        let mut hasher = Sha256::new();
        hasher.update(&serialized);
        hasher.finalize().into()
    }

    /// Adjust difficulty based on block height (every 10,000 forges)
    fn adjust_difficulty(&self, height: u64) {
        let total_forges = *self.total_forges.read().unwrap();
        if total_forges % 10_000 == 0 && total_forges > 0 {
            let mut difficulty = self.difficulty.write().unwrap();
            *difficulty += 1;
            tracing::info!(
                "Difficulty adjusted to {} at height {} ({} forges)",
                *difficulty,
                height,
                total_forges
            );
        }
    }

    /// Get current difficulty
    pub fn get_difficulty(&self) -> u32 {
        *self.difficulty.read().unwrap()
    }

    /// Get current chain height
    pub fn get_height(&self) -> u64 {
        self.chain_state.read().unwrap().height
    }

    /// Get total forges processed
    pub fn get_total_forges(&self) -> u64 {
        *self.total_forges.read().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consensus_engine_creation() {
        let engine = ConsensusEngine::new(2, 600);
        assert_eq!(engine.get_difficulty(), 2);
        assert_eq!(engine.get_height(), 0);
        assert_eq!(engine.get_total_forges(), 0);
    }

    #[test]
    fn test_difficulty_check() {
        let engine = ConsensusEngine::new(2, 600);
        let hash_with_2_zeros = [0u8, 0u8, 1u8, 2u8, 3u8, 4u8, 5u8, 6u8, 7u8, 8u8, 9u8, 10u8, 11u8, 12u8, 13u8, 14u8, 15u8, 16u8, 17u8, 18u8, 19u8, 20u8, 21u8, 22u8, 23u8, 24u8, 25u8, 26u8, 27u8, 28u8, 29u8, 30u8];
        assert!(engine.check_difficulty(&hash_with_2_zeros, 2));
        assert!(!engine.check_difficulty(&hash_with_2_zeros, 3));
    }
}
