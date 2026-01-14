//! Excalibur EXS Blockchain Library

pub mod crypto;
pub mod consensus;
pub mod network;
pub mod chain;
pub mod mempool;
pub mod rpc;

pub use crypto::{proof_of_forge, ProofOfForgeResult, CANONICAL_PROPHECY};
