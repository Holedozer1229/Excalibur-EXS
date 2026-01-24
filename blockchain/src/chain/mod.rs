//! Blockchain storage and state management with RocksDB

use rocksdb::{DB, Options, IteratorMode, Direction};
use serde::{Deserialize, Serialize};
use std::path::Path;
use anyhow::{Result, anyhow};

/// RocksDB-based blockchain storage
pub struct ChainStore {
    db: DB,
}

/// Key prefixes for different data types
const BLOCK_PREFIX: &[u8] = b"blk:";
const BLOCK_HASH_PREFIX: &[u8] = b"bhash:";
const FORGE_PREFIX: &[u8] = b"forge:";
const META_PREFIX: &[u8] = b"meta:";
const HEIGHT_KEY: &[u8] = b"meta:height";
const BEST_BLOCK_KEY: &[u8] = b"meta:best_block";

impl ChainStore {
    /// Create a new chain store
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let mut opts = Options::default();
        opts.create_if_missing(true);
        opts.set_compression_type(rocksdb::DBCompressionType::Lz4);
        opts.set_max_open_files(1000);
        opts.set_keep_log_file_num(10);
        opts.set_max_background_jobs(4);
        
        let db = DB::open(&opts, path)?;
        
        Ok(ChainStore { db })
    }

    /// Store a block by height
    pub fn put_block(&self, height: u64, block_data: &[u8]) -> Result<()> {
        let key = Self::block_key(height);
        self.db.put(&key, block_data)?;
        Ok(())
    }

    /// Get a block by height
    pub fn get_block(&self, height: u64) -> Result<Option<Vec<u8>>> {
        let key = Self::block_key(height);
        Ok(self.db.get(&key)?)
    }

    /// Store a block hash mapping (hash -> height)
    pub fn put_block_hash(&self, block_hash: &[u8; 32], height: u64) -> Result<()> {
        let key = Self::block_hash_key(block_hash);
        self.db.put(&key, height.to_le_bytes())?;
        Ok(())
    }

    /// Get block height by hash
    pub fn get_block_height_by_hash(&self, block_hash: &[u8; 32]) -> Result<Option<u64>> {
        let key = Self::block_hash_key(block_hash);
        match self.db.get(&key)? {
            Some(bytes) => {
                let height_bytes: [u8; 8] = bytes.try_into()
                    .map_err(|_| anyhow!("Invalid height bytes"))?;
                Ok(Some(u64::from_le_bytes(height_bytes)))
            }
            None => Ok(None),
        }
    }

    /// Store a forge transaction
    pub fn put_forge(&self, proof_hash: &[u8; 32], forge_data: &[u8]) -> Result<()> {
        let key = Self::forge_key(proof_hash);
        self.db.put(&key, forge_data)?;
        Ok(())
    }

    /// Get a forge transaction by proof hash
    pub fn get_forge(&self, proof_hash: &[u8; 32]) -> Result<Option<Vec<u8>>> {
        let key = Self::forge_key(proof_hash);
        Ok(self.db.get(&key)?)
    }

    /// Check if a forge exists (for replay protection)
    pub fn forge_exists(&self, proof_hash: &[u8; 32]) -> Result<bool> {
        let key = Self::forge_key(proof_hash);
        Ok(self.db.get(&key)?.is_some())
    }

    /// Set the current chain height
    pub fn set_height(&self, height: u64) -> Result<()> {
        self.db.put(HEIGHT_KEY, height.to_le_bytes())?;
        Ok(())
    }

    /// Get the current chain height
    pub fn get_height(&self) -> Result<u64> {
        match self.db.get(HEIGHT_KEY)? {
            Some(bytes) => {
                let height_bytes: [u8; 8] = bytes.try_into()
                    .map_err(|_| anyhow!("Invalid height bytes"))?;
                Ok(u64::from_le_bytes(height_bytes))
            }
            None => Ok(0),
        }
    }

    /// Set the best block hash
    pub fn set_best_block(&self, block_hash: &[u8; 32]) -> Result<()> {
        self.db.put(BEST_BLOCK_KEY, block_hash)?;
        Ok(())
    }

    /// Get the best block hash
    pub fn get_best_block(&self) -> Result<Option<[u8; 32]>> {
        match self.db.get(BEST_BLOCK_KEY)? {
            Some(bytes) => {
                let hash: [u8; 32] = bytes.try_into()
                    .map_err(|_| anyhow!("Invalid block hash"))?;
                Ok(Some(hash))
            }
            None => Ok(None),
        }
    }

    /// Store arbitrary metadata
    pub fn put_meta(&self, key: &str, value: &[u8]) -> Result<()> {
        let full_key = [META_PREFIX, key.as_bytes()].concat();
        self.db.put(&full_key, value)?;
        Ok(())
    }

    /// Get metadata
    pub fn get_meta(&self, key: &str) -> Result<Option<Vec<u8>>> {
        let full_key = [META_PREFIX, key.as_bytes()].concat();
        Ok(self.db.get(&full_key)?)
    }

    /// Iterate over all blocks in order
    pub fn iter_blocks(&self) -> impl Iterator<Item = (u64, Vec<u8>)> + '_ {
        self.db
            .iterator(IteratorMode::From(BLOCK_PREFIX, Direction::Forward))
            .take_while(|(key, _)| key.starts_with(BLOCK_PREFIX))
            .filter_map(|(key, value)| {
                // Extract height from key
                let height_bytes = &key[BLOCK_PREFIX.len()..];
                if height_bytes.len() == 8 {
                    let height_array: [u8; 8] = height_bytes.try_into().ok()?;
                    let height = u64::from_le_bytes(height_array);
                    Some((height, value.to_vec()))
                } else {
                    None
                }
            })
    }

    /// Count total blocks
    pub fn count_blocks(&self) -> usize {
        self.iter_blocks().count()
    }

    /// Delete a block
    pub fn delete_block(&self, height: u64) -> Result<()> {
        let key = Self::block_key(height);
        self.db.delete(&key)?;
        Ok(())
    }

    /// Create a snapshot for consistent reads
    pub fn snapshot(&self) -> rocksdb::Snapshot {
        self.db.snapshot()
    }

    /// Compact the database
    pub fn compact(&self) {
        self.db.compact_range::<&[u8], &[u8]>(None, None);
    }

    // Helper functions for key generation
    fn block_key(height: u64) -> Vec<u8> {
        [BLOCK_PREFIX, &height.to_le_bytes()].concat()
    }

    fn block_hash_key(hash: &[u8; 32]) -> Vec<u8> {
        [BLOCK_HASH_KEY, hash].concat()
    }

    fn forge_key(proof_hash: &[u8; 32]) -> Vec<u8> {
        [FORGE_PREFIX, proof_hash].concat()
    }
}

// Add missing constant
const BLOCK_HASH_KEY: &[u8] = b"bhash:";

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_chain_store_creation() {
        let tmp = TempDir::new().unwrap();
        let store = ChainStore::new(tmp.path()).unwrap();
        assert_eq!(store.get_height().unwrap(), 0);
    }

    #[test]
    fn test_block_storage() {
        let tmp = TempDir::new().unwrap();
        let store = ChainStore::new(tmp.path()).unwrap();
        
        let block_data = b"test block data";
        store.put_block(1, block_data).unwrap();
        
        let retrieved = store.get_block(1).unwrap().unwrap();
        assert_eq!(retrieved, block_data);
    }

    #[test]
    fn test_height_management() {
        let tmp = TempDir::new().unwrap();
        let store = ChainStore::new(tmp.path()).unwrap();
        
        store.set_height(42).unwrap();
        assert_eq!(store.get_height().unwrap(), 42);
    }

    #[test]
    fn test_forge_existence() {
        let tmp = TempDir::new().unwrap();
        let store = ChainStore::new(tmp.path()).unwrap();
        
        let proof_hash = [1u8; 32];
        assert!(!store.forge_exists(&proof_hash).unwrap());
        
        store.put_forge(&proof_hash, b"forge data").unwrap();
        assert!(store.forge_exists(&proof_hash).unwrap());
    }

    #[test]
    fn test_block_iteration() {
        let tmp = TempDir::new().unwrap();
        let store = ChainStore::new(tmp.path()).unwrap();
        
        // Store multiple blocks
        for i in 0..5 {
            store.put_block(i, format!("block {}", i).as_bytes()).unwrap();
        }
        
        let blocks: Vec<_> = store.iter_blocks().collect();
        assert_eq!(blocks.len(), 5);
        assert_eq!(blocks[0].0, 0);
        assert_eq!(blocks[4].0, 4);
    }
}
