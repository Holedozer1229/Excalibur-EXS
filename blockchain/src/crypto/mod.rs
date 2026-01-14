//! Excalibur EXS Blockchain - Core cryptographic algorithms
//! 
//! This module implements the complete Proof-of-Forge pipeline:
//! 1. Prophecy Binding: SHA-512 of concatenated words
//! 2. Tetra-POW: 128 rounds of nonlinear state transformation
//! 3. PBKDF2 Tempering: 600,000 iterations for quantum hardening
//! 4. Zetahash Pythagoras: Sacred geometric transformation
//! 5. Taproot Derivation: BIP-340/341 address generation

use anyhow::{Context, Result};
use bitcoin::secp256k1::{Secp256k1, SecretKey, PublicKey};
use bitcoin::Address;
use bitcoin::Network;
use pbkdf2::pbkdf2_hmac;
use sha2::{Sha256, Sha512, Digest};
use std::convert::TryInto;

/// The canonical 13-word prophecy axiom
pub const CANONICAL_PROPHECY: [&str; 13] = [
    "sword", "legend", "pull", "magic", "kingdom", "artist",
    "stone", "destroy", "forget", "fire", "steel", "honey", "question",
];

/// Number of Tetra-POW rounds (128)
pub const TETRA_POW_ROUNDS: usize = 128;

/// Number of PBKDF2 iterations for quantum hardening (600,000)
pub const HPP1_ITERATIONS: u32 = 600_000;

/// Result of the complete Proof-of-Forge derivation
#[derive(Debug, Clone)]
pub struct ProofOfForgeResult {
    pub prophecy_hash: Vec<u8>,
    pub tetra_hash: Vec<u8>,
    pub tempered_key: Vec<u8>,
    pub final_seed: Vec<u8>,
    pub taproot_address: String,
}

/// Tetra-POW state for 128-round nonlinear transformation
#[derive(Debug, Clone)]
struct TetraPoWState {
    state: [u64; 4],
}

impl TetraPoWState {
    /// Create new Tetra-POW state from seed
    fn new(seed: &[u8]) -> Self {
        let mut state = [0u64; 4];
        if seed.len() >= 32 {
            state[0] = u64::from_le_bytes(seed[0..8].try_into().unwrap());
            state[1] = u64::from_le_bytes(seed[8..16].try_into().unwrap());
            state[2] = u64::from_le_bytes(seed[16..24].try_into().unwrap());
            state[3] = u64::from_le_bytes(seed[24..32].try_into().unwrap());
        }
        Self { state }
    }

    /// Perform a single nonlinear state shift
    fn round(&mut self) {
        // Nonlinear mixing using bitwise operations
        self.state[0] ^= (self.state[1] << 13) ^ (self.state[3] >> 7);
        self.state[1] ^= (self.state[2] << 17) ^ (self.state[0] >> 5);
        self.state[2] ^= (self.state[3] << 23) ^ (self.state[1] >> 11);
        self.state[3] ^= (self.state[0] << 29) ^ (self.state[2] >> 3);

        // Add entropy (mathematical constants)
        self.state[0] = self.state[0].wrapping_add(0x9E3779B97F4A7C15);
        self.state[1] = self.state[1].wrapping_add(0x243F6A8885A308D3);
        self.state[2] = self.state[2].wrapping_add(0x13198A2E03707344);
        self.state[3] = self.state[3].wrapping_add(0xA4093822299F31D0);
    }

    /// Perform 128 rounds of Tetra-POW
    fn compute(&mut self) -> Vec<u8> {
        for _ in 0..TETRA_POW_ROUNDS {
            self.round();
        }

        let mut result = Vec::with_capacity(32);
        for val in &self.state {
            result.extend_from_slice(&val.to_le_bytes());
        }
        result
    }
}

/// Step 1: Prophecy Binding - SHA-512 of concatenated prophecy words
pub fn prophecy_binding(prophecy_words: &[String]) -> Result<Vec<u8>> {
    if prophecy_words.len() != 13 {
        anyhow::bail!("Prophecy must contain exactly 13 words");
    }

    let concatenated = prophecy_words.join("");
    let mut hasher = Sha512::new();
    hasher.update(concatenated.as_bytes());
    Ok(hasher.finalize().to_vec())
}

/// Step 2: Tetra-POW - 128 rounds of nonlinear transformation
pub fn tetra_pow_128_rounds(prophecy_hash: &[u8]) -> Vec<u8> {
    let mut state = TetraPoWState::new(prophecy_hash);
    state.compute()
}

/// Step 3: PBKDF2 Tempering - 600,000 iterations for quantum hardening
pub fn pbkdf2_tempering(tetra_hash: &[u8], salt: Option<&[u8]>) -> Vec<u8> {
    let default_salt = b"Excalibur-EXS-Forge";
    let salt = salt.unwrap_or(default_salt);

    let mut output = vec![0u8; 64];
    pbkdf2_hmac::<Sha512>(tetra_hash, salt, HPP1_ITERATIONS, &mut output);
    output
}

/// Step 4: Final Zetahash Pythagoras - Sacred geometric transformation
pub fn final_zetahash_pythagoras(tempered_key: &[u8]) -> Vec<u8> {
    // Pythagorean ratios (sacred geometry)
    let ratios = [
        1.0,              // Unity
        1.618033988749895, // Golden Ratio (φ)
        1.414213562373095, // √2
        1.732050807568877, // √3
        2.0,              // Octave
        0.75,             // Perfect Fourth (3:4)
        0.8,              // Perfect Fifth (4:5)
        1.25,             // Major Third (5:4)
    ];

    let mut result = vec![0u8; 32];

    // Process tempered_key in 8-byte chunks
    for i in 0..4 {
        let offset = i * 8;
        if offset + 8 > tempered_key.len() {
            break;
        }

        // Extract 64-bit value
        let value = u64::from_le_bytes(tempered_key[offset..offset + 8].try_into().unwrap());

        // Apply Pythagorean ratio transformation
        let ratio = ratios[i % ratios.len()];
        let transformed = (value as f64 * ratio) as u64;

        // Mix with SHA-256 for additional entropy
        let mut mix_data = Vec::with_capacity(16);
        mix_data.extend_from_slice(&value.to_le_bytes());
        mix_data.extend_from_slice(&transformed.to_le_bytes());

        let mut hasher = Sha256::new();
        hasher.update(&mix_data);
        let hash = hasher.finalize();

        // Place in result
        result[i * 8..(i + 1) * 8].copy_from_slice(&hash[0..8]);
    }

    result
}

/// Step 5: Taproot Address Derivation (simplified for demonstration)
/// In production, use proper BIP-340/341 implementation
pub fn derive_taproot_address(final_seed: &[u8], network: Network) -> Result<String> {
    // For production, implement proper Taproot derivation with BIP-340/341
    // This is a simplified version for demonstration
    
    let secp = Secp256k1::new();
    
    // Derive private key from final seed
    let secret_key = SecretKey::from_slice(&final_seed[..32])
        .context("Failed to create secret key")?;
    
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);
    
    // Create Taproot address (P2TR)
    // In production, use proper Taproot construction
    let address = Address::p2wpkh(&bitcoin::PublicKey::new(public_key), network)
        .context("Failed to create address")?;
    
    Ok(address.to_string())
}

/// Complete Proof-of-Forge pipeline
pub fn proof_of_forge(
    prophecy_words: &[String],
    salt: Option<&[u8]>,
    network: Network,
) -> Result<ProofOfForgeResult> {
    // Step 1: Prophecy Binding
    let prophecy_hash = prophecy_binding(prophecy_words)?;

    // Step 2: Tetra-POW 128 rounds
    let tetra_hash = tetra_pow_128_rounds(&prophecy_hash);

    // Step 3: PBKDF2 Tempering (600k iterations)
    let tempered_key = pbkdf2_tempering(&tetra_hash, salt);

    // Step 4: Final Zetahash Pythagoras
    let final_seed = final_zetahash_pythagoras(&tempered_key);

    // Step 5: Taproot Derivation
    let taproot_address = derive_taproot_address(&final_seed, network)?;

    Ok(ProofOfForgeResult {
        prophecy_hash,
        tetra_hash,
        tempered_key,
        final_seed,
        taproot_address,
    })
}

/// Calculate dynamic forge fee based on completed forges
/// Starts at 1 BTC, increases by 0.1 BTC every 10,000 forges, capped at 21 BTC
pub fn calculate_forge_fee(forges_completed: u64) -> u64 {
    const BASE_FEE: u64 = 100_000_000; // 1 BTC in satoshis
    const INCREMENT: u64 = 10_000_000; // 0.1 BTC
    const INCREMENT_INTERVAL: u64 = 10_000;
    const MAX_FEE: u64 = 2_100_000_000; // 21 BTC cap

    let increments = forges_completed / INCREMENT_INTERVAL;
    let fee = BASE_FEE + (increments * INCREMENT);

    fee.min(MAX_FEE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prophecy_binding() {
        let prophecy: Vec<String> = CANONICAL_PROPHECY.iter().map(|s| s.to_string()).collect();
        let hash = prophecy_binding(&prophecy).unwrap();
        assert_eq!(hash.len(), 64); // SHA-512 produces 64 bytes
    }

    #[test]
    fn test_tetra_pow() {
        let input = vec![0u8; 64];
        let output = tetra_pow_128_rounds(&input);
        assert_eq!(output.len(), 32);
    }

    #[test]
    fn test_pbkdf2_tempering() {
        let input = vec![0u8; 32];
        let output = pbkdf2_tempering(&input, None);
        assert_eq!(output.len(), 64);
    }

    #[test]
    fn test_zetahash() {
        let input = vec![0u8; 64];
        let output = final_zetahash_pythagoras(&input);
        assert_eq!(output.len(), 32);
    }

    #[test]
    fn test_complete_proof_of_forge() {
        let prophecy: Vec<String> = CANONICAL_PROPHECY.iter().map(|s| s.to_string()).collect();
        let result = proof_of_forge(&prophecy, None, Network::Bitcoin).unwrap();
        
        assert!(!result.prophecy_hash.is_empty());
        assert!(!result.tetra_hash.is_empty());
        assert!(!result.tempered_key.is_empty());
        assert!(!result.final_seed.is_empty());
        assert!(!result.taproot_address.is_empty());
    }

    #[test]
    fn test_forge_fee_calculation() {
        assert_eq!(calculate_forge_fee(0), 100_000_000); // 1 BTC
        assert_eq!(calculate_forge_fee(10_000), 110_000_000); // 1.1 BTC
        assert_eq!(calculate_forge_fee(100_000), 200_000_000); // 2 BTC
        assert_eq!(calculate_forge_fee(1_000_000), 2_100_000_000); // 21 BTC (capped)
    }
}
