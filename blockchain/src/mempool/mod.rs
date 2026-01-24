//! Mempool for pending forge transactions

use crate::consensus::{ForgeTransaction, Block};
use std::collections::{HashMap, BTreeSet};
use std::sync::{Arc, RwLock};
use anyhow::{Result, anyhow};

/// Priority ordering for forge transactions
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct ForgePriority {
    timestamp: u64,
    fee: u64,
}

/// Mempool entry
#[derive(Debug, Clone)]
struct MempoolEntry {
    forge: Arc<ForgeTransaction>,
    priority: ForgePriority,
    added_at: u64,
}

/// Forge transaction mempool
pub struct ForgePool {
    /// Pending forges by proof hash
    pending: Arc<RwLock<HashMap<[u8; 32], MempoolEntry>>>,
    /// Ordered set of forges by priority
    priority_queue: Arc<RwLock<BTreeSet<([u8; 32], ForgePriority)>>>,
    /// Maximum mempool size
    max_size: usize,
    /// Minimum fee required
    min_fee: u64,
}

impl ForgePool {
    /// Create a new forge pool
    pub fn new(max_size: usize, min_fee: u64) -> Self {
        Self {
            pending: Arc::new(RwLock::new(HashMap::new())),
            priority_queue: Arc::new(RwLock::new(BTreeSet::new())),
            max_size,
            min_fee,
        }
    }

    /// Add a forge transaction to the mempool
    pub fn add_forge(&self, forge: ForgeTransaction) -> Result<()> {
        let mut pending = self.pending.write().unwrap();
        let mut priority_queue = self.priority_queue.write().unwrap();

        // Check if already in mempool
        if pending.contains_key(&forge.proof_hash) {
            return Err(anyhow!("Forge already in mempool"));
        }

        // Check mempool size limit
        if pending.len() >= self.max_size {
            return Err(anyhow!("Mempool is full"));
        }

        // Calculate priority (earlier timestamp = higher priority)
        let priority = ForgePriority {
            timestamp: forge.timestamp,
            fee: self.min_fee,
        };

        // Create entry
        let entry = MempoolEntry {
            forge: Arc::new(forge.clone()),
            priority,
            added_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        // Add to mempool
        pending.insert(forge.proof_hash, entry);
        priority_queue.insert((forge.proof_hash, priority));

        tracing::info!("Added forge to mempool: {:?}", hex::encode(&forge.proof_hash));

        Ok(())
    }

    /// Remove a forge from the mempool
    pub fn remove_forge(&self, proof_hash: &[u8; 32]) -> Result<Arc<ForgeTransaction>> {
        let mut pending = self.pending.write().unwrap();
        let mut priority_queue = self.priority_queue.write().unwrap();

        let entry = pending
            .remove(proof_hash)
            .ok_or_else(|| anyhow!("Forge not found in mempool"))?;

        priority_queue.remove(&(*proof_hash, entry.priority));

        Ok(entry.forge)
    }

    /// Get a forge from the mempool
    pub fn get_forge(&self, proof_hash: &[u8; 32]) -> Option<Arc<ForgeTransaction>> {
        let pending = self.pending.read().unwrap();
        pending.get(proof_hash).map(|entry| Arc::clone(&entry.forge))
    }

    /// Check if a forge is in the mempool
    pub fn contains(&self, proof_hash: &[u8; 32]) -> bool {
        let pending = self.pending.read().unwrap();
        pending.contains_key(proof_hash)
    }

    /// Get the number of forges in the mempool
    pub fn size(&self) -> usize {
        let pending = self.pending.read().unwrap();
        pending.len()
    }

    /// Get forges for inclusion in a new block
    pub fn get_forges_for_block(&self, max_forges: usize) -> Vec<Arc<ForgeTransaction>> {
        let pending = self.pending.read().unwrap();
        let priority_queue = self.priority_queue.read().unwrap();

        priority_queue
            .iter()
            .rev() // Highest priority first
            .take(max_forges)
            .filter_map(|(hash, _)| pending.get(hash).map(|entry| Arc::clone(&entry.forge)))
            .collect()
    }

    /// Remove forges that are included in a block
    pub fn remove_block_forges(&self, block: &Block) -> Result<()> {
        for forge in &block.forges {
            if self.contains(&forge.proof_hash) {
                self.remove_forge(&forge.proof_hash)?;
            }
        }
        Ok(())
    }

    /// Get all forge proof hashes in the mempool
    pub fn get_all_hashes(&self) -> Vec<[u8; 32]> {
        let pending = self.pending.read().unwrap();
        pending.keys().cloned().collect()
    }

    /// Clear the mempool
    pub fn clear(&self) {
        let mut pending = self.pending.write().unwrap();
        let mut priority_queue = self.priority_queue.write().unwrap();
        pending.clear();
        priority_queue.clear();
    }

    /// Remove expired forges (older than timeout)
    pub fn remove_expired(&self, timeout_secs: u64) -> usize {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut pending = self.pending.write().unwrap();
        let mut priority_queue = self.priority_queue.write().unwrap();

        let expired: Vec<[u8; 32]> = pending
            .iter()
            .filter(|(_, entry)| now - entry.added_at > timeout_secs)
            .map(|(hash, _)| *hash)
            .collect();

        let count = expired.len();

        for hash in expired {
            if let Some(entry) = pending.remove(&hash) {
                priority_queue.remove(&(hash, entry.priority));
            }
        }

        if count > 0 {
            tracing::info!("Removed {} expired forges from mempool", count);
        }

        count
    }

    /// Get mempool statistics
    pub fn get_stats(&self) -> MempoolStats {
        let pending = self.pending.read().unwrap();

        MempoolStats {
            size: pending.len(),
            max_size: self.max_size,
            min_fee: self.min_fee,
        }
    }
}

/// Mempool statistics
#[derive(Debug, Clone)]
pub struct MempoolStats {
    pub size: usize,
    pub max_size: usize,
    pub min_fee: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_forge(timestamp: u64, proof_hash: [u8; 32]) -> ForgeTransaction {
        ForgeTransaction {
            prophecy: "sword legend pull magic kingdom artist stone destroy forget fire steel honey question".to_string(),
            derived_key: vec![1, 2, 3],
            taproot_address: "bc1p...".to_string(),
            proof_hash,
            timestamp,
            signature: vec![],
        }
    }

    #[test]
    fn test_forge_pool_creation() {
        let pool = ForgePool::new(100, 1000);
        assert_eq!(pool.size(), 0);
    }

    #[test]
    fn test_add_forge() {
        let pool = ForgePool::new(100, 1000);
        let forge = create_test_forge(1000, [1u8; 32]);
        
        assert!(pool.add_forge(forge).is_ok());
        assert_eq!(pool.size(), 1);
    }

    #[test]
    fn test_add_duplicate_forge() {
        let pool = ForgePool::new(100, 1000);
        let forge = create_test_forge(1000, [1u8; 32]);
        
        pool.add_forge(forge.clone()).unwrap();
        
        let result = pool.add_forge(forge);
        assert!(result.is_err());
    }

    #[test]
    fn test_remove_forge() {
        let pool = ForgePool::new(100, 1000);
        let proof_hash = [1u8; 32];
        let forge = create_test_forge(1000, proof_hash);
        
        pool.add_forge(forge).unwrap();
        assert_eq!(pool.size(), 1);
        
        pool.remove_forge(&proof_hash).unwrap();
        assert_eq!(pool.size(), 0);
    }

    #[test]
    fn test_contains() {
        let pool = ForgePool::new(100, 1000);
        let proof_hash = [1u8; 32];
        let forge = create_test_forge(1000, proof_hash);
        
        assert!(!pool.contains(&proof_hash));
        pool.add_forge(forge).unwrap();
        assert!(pool.contains(&proof_hash));
    }

    #[test]
    fn test_get_forges_for_block() {
        let pool = ForgePool::new(100, 1000);
        
        // Add multiple forges with different timestamps
        for i in 0..5 {
            let forge = create_test_forge(1000 + i, [i as u8; 32]);
            pool.add_forge(forge).unwrap();
        }
        
        let forges = pool.get_forges_for_block(3);
        assert_eq!(forges.len(), 3);
    }

    #[test]
    fn test_mempool_size_limit() {
        let pool = ForgePool::new(2, 1000);
        
        pool.add_forge(create_test_forge(1000, [1u8; 32])).unwrap();
        pool.add_forge(create_test_forge(1001, [2u8; 32])).unwrap();
        
        let result = pool.add_forge(create_test_forge(1002, [3u8; 32]));
        assert!(result.is_err());
    }

    #[test]
    fn test_clear() {
        let pool = ForgePool::new(100, 1000);
        
        pool.add_forge(create_test_forge(1000, [1u8; 32])).unwrap();
        pool.add_forge(create_test_forge(1001, [2u8; 32])).unwrap();
        
        assert_eq!(pool.size(), 2);
        pool.clear();
        assert_eq!(pool.size(), 0);
    }
}
