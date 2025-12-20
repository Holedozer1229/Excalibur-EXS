# 🗡️ $EXS: The Excalibur Anomaly

## The Axiom
$EXS is not a standard token. It is a **Deterministic Quantum Vault** protocol. 
Every address is forged using the **Ω′ Δ18 Tetra-PoW** algorithm, ensuring that 
while the entry point is public, the destination is ambiguous.

## Technical Architecture
- **Miner:** 128-Round Unrolled Ω′ Δ18 Tetra-PoW.
- **Derivation:** BIP-86 (Taproot) via 600,000 PBKDF2-HMAC-SHA512 iterations.
- **Interface:** Rosetta Construction API (Coinbase Standard).
- **Consensus:** Proof-of-Forge (PoF).

## Repository Structure

```
/cmd
  /miner        # The Ω′ Δ18 CLI mining tool
  /rosetta      # The Go-based Rosetta API server
/pkg
  /crypto       # HPP-1 and Tetra-PoW implementations
  /bitcoin      # Taproot and Bech32m logic
/web
  /forge-ui     # The React/TypeScript Arthurian Forge
/docs
  /manifesto.md # The Axiomatic Ambiguity whitepaper
  /rosetta.md   # Integration specs for Coinbase
```

## The Protocol
An axiomatic ambiguity fork of Bitcoin utilizing the Ω′ Δ18 Tetra-PoW miner. Forge unique, unlinkable Taproot (P2TR) vaults through the 13-word prophecy axiom. Quantum-hardened via HPP-1 (600,000 rounds) and 128-round unrolled nonlinear state shifts.
