# ExcalOmega HTLC v1 — Consensus Feature Specification (Draft)

**Status:** Proposed consensus feature for ExcalOmega only. Not activated, not deployed, and not Bitcoin-mainnet compatible by assertion.  
**Scope:** Native hash-time-locked contract (HTLC) using a Taproot script-path spend.  
**Compatibility boundary:** This proposal does not alter the existing EXCAL chain, its signature rules, or the legacy `genesis-fork/` implementation.

## 1. Why this is a core feature

An HTLC lets a payer lock an asset so that:
- a designated claimant can spend it by revealing a secret whose SHA-256 hash matches a committed digest and signing with the claim key; or
- a designated refund key can recover it after a specified absolute block-height timeout.

This is useful for atomic-swap protocols, conditional settlement, escrow, payment channels, cross-network exchange, and game/business settlement. An HTLC alone does **not** guarantee an atomic cross-chain swap: both chains need compatible hash/preimage semantics, safe timeout ordering, adequate confirmations, and a protocol for handling reorgs and chain halts.

## 2. Cryptographic and script requirements

The production implementation MUST use reviewed, standard primitives:
- SHA-256 for the 32-byte secret preimage commitment.
- BIP-340 Schnorr signatures over x-only secp256k1 public keys.
- BIP-341 Taproot output-key and script-tree construction.
- BIP-342 tapscript execution and signature validation.
- Bech32m encoding for the resulting witness-v1 address.

No custom signature, XOR tweak, fabricated address, public-axiom-derived private key, or custom "Trifold signature" may substitute for these primitives.

### 2.1 HTLC tapscript leaf

The v1 claim/refund leaf is the following exact logical script, encoded using minimal pushes and minimal script-number encoding:

```text
OP_IF
    OP_SIZE 32 OP_EQUALVERIFY
    OP_SHA256 <secret_hash32> OP_EQUALVERIFY
    <claim_xonly_pubkey32> OP_CHECKSIG
OP_ELSE
    <refund_locktime_height> OP_CHECKLOCKTIMEVERIFY OP_DROP
    <refund_xonly_pubkey32> OP_CHECKSIG
OP_ENDIF
```

- `secret_hash32 = SHA256(preimage32)`.
- Both public keys are 32-byte x-only secp256k1 keys that must lift to valid curve points under BIP-340 rules.
- `refund_locktime_height` is a minimally encoded, non-negative Script number and MUST be below the consensus maximum block-height locktime.
- The claim branch requires exactly 32 bytes of preimage.
- The refund branch requires transaction `nLockTime >= refund_locktime_height`, the input sequence not equal to `0xffffffff`, and ordinary transaction finality. With Bitcoin-style absolute locktime semantics, a transaction whose locktime equals H is first eligible for inclusion in a block at height H+1. Implementations MUST preserve this boundary exactly; no local wall clock is used.
- Both branches require a valid BIP-340 signature under the relevant key, with BIP-342 sighash semantics. V1 accepts only 64-byte SIGHASH_DEFAULT signatures; other sighash modes are rejected for this leaf.

### 2.2 Witness stack

Witness elements are listed in serialization order (bottom to top before script execution):

- Claim: `[signature64, preimage32, 0x01, tapscript, control_block]`
- Refund: `[signature64, empty_vector, tapscript, control_block]`

The selector is exactly `0x01` for claim and the empty vector for refund. Other truthy/falsy encodings are rejected by the v1 standardness/consensus profile to avoid alternate witness encodings.

### 2.3 Taproot commitment

The output MUST be a witness-v1 32-byte P2TR program derived using BIP-341:
- TapLeaf version `0xc0` and the exact tapscript above.
- The BIP-341 tagged `TapLeaf` hash and canonical CompactSize script length.
- A protocol-fixed NUMS internal key whose discrete logarithm is not known, so the key path cannot bypass the HTLC branches. The NUMS point is PINNED: `H = lift_x(0x50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0)` (BIP-341, the SHA-256 of the standard uncompressed encoding of G as X coordinate; re-derived from first principles in `tests/test_omega_htlc_v1.py`). A key-path bypass is a consensus failure. The implementation MUST prove that HTLC outputs cannot be spent through an alternate key-path signature.
- BIP-341 tagged `TapTweak` construction and the standard output-key parity/control-block rules.
- Bech32m address encoding with the ExcalOmega network HRP. The HRP is DRAFT-assigned as `exs` (mainnet) / `texs` (testnet) in `docs/EXS_NETWORK_PARAMETERS_DRAFT_0_1.md` — provisional and unregistered, for test vectors only.

The full Taproot commitment for the pinned vector (tweak, output key, control block, scriptPubKey, draft-HRP address) is computed by the reference implementation in `omega/htlc.py` and recorded in `spec/vectors/htlc_v1_script.json` (tweak `753e24e0…d4bf3f`, output key `47f5c0f0…ba8037`, control block `c050929b74…803ac0`, scriptPubKey `512047f5c0f0…ba8037`, address `exs1pgl6upuxe8kz6jlv93fwrky2qgyw6tgll4pcdyazd978zsf46sqms7fhvnh`). The control block is verified to reconstruct exactly this output key (`tests/test_omega_htlc_v1.py`). Network magic and activation height remain unassigned; no consensus implementation or activation is included.

## 3. Contract identifier and metadata

The on-chain P2TR output is authoritative. An optional off-chain descriptor may contain:
- protocol version;
- network identifier;
- secret hash;
- claim x-only key;
- refund x-only key;
- refund locktime height;
- TapLeaf script bytes;
- output scriptPubKey;
- amount and outpoint once funded.

The descriptor is informational and MUST be recomputed from its fields. Consensus MUST NOT trust an off-chain descriptor, a JSON object, an indexer, or an API response instead of validating the actual output script, control block, witness, transaction, and UTXO amount.

## 4. Consensus validation

For every HTLC spend, validators MUST:
1. Parse and validate the P2TR witness-v1 program and control block.
2. Recompute the TapLeaf hash and Taproot tweak using BIP-341 exact tagged hashes and serialization.
3. Verify the control block commits the executed script to the spent output key.
4. Execute the tapscript under BIP-342 rules.
5. Enforce the exact claim or refund witness shape.
6. Enforce the 32-byte SHA-256 preimage on claim, or absolute height locktime and non-final sequence on refund.
7. Verify the applicable BIP-340 signature with the BIP-342 sighash message.
8. Validate amount conservation, fees, UTXO existence, maturity, and ordinary transaction rules.
9. Reject unknown leaf versions or unsupported sighash behavior unless separately activated by a versioned consensus change.

All implementations MUST use integer-only consensus arithmetic and identical byte serialization. Mempool policy may be stricter than consensus but MUST NOT make a consensus-invalid transaction valid.

## 5. Atomic-swap safety profile

A cross-chain swap profile MUST define:
- one agreed cryptographic hash function and preimage length on both networks;
- distinct claimant/refund keys and domain-separated contract metadata;
- staggered absolute timeouts with a documented safety margin;
- confirmation depth and reorg assumptions for each network;
- chain-halting and fee-spike recovery procedures;
- secret exposure monitoring and a deadline for the counterparty to claim;
- an explicit statement that a chain reorganization or outage can still cause loss.

A suggested timeout ordering is: the party that reveals the secret on the less reliable / slower-to-finalize chain receives the longer refund window, while the counterparty's claim window on the other chain closes earlier. Exact ordering must be derived for the two chains' finality and block intervals; never copy a fixed number of blocks across networks without analysis.

HTLCs are not a replacement for independent custody controls, wallet recovery, or exchange settlement review.

## 6. Trifold / FROST relationship

HTLC v1 is deliberately a two-key, two-branch contract. It does not depend on Trifold or FROST. A future policy may place a threshold-controlled key in either branch, but that requires a separate reviewed specification for DKG, participant identity, nonce generation, share refresh, abort/retry, slashing or accountability, and recovery. Do not silently substitute the current experimental Trifold hooks.

## 7. Test and activation gates

Before activation, implement and pass:
- official BIP-340, BIP-341, and BIP-342 vectors applicable to the selected features;
- exact script serialization and TapLeaf known-answer tests;
- TapTweak/output-key/control-block known-answer tests;
- claim success with correct preimage and claim key;
- claim rejection for wrong/missing/31-byte/33-byte preimage;
- claim rejection for wrong key, malformed signature, wrong sighash, wrong leaf, wrong control block, or modified amount/outpoint;
- refund rejection at H and acceptance at H+1 for locktime H, with non-final sequence;
- refund rejection for final sequence, locktime below H, wrong refund key, and malformed witness;
- key-path bypass rejection tests;
- cross-language identical vectors in at least two independent implementations;
- fuzzing of witness parsing, script numbers, control blocks, and boundary heights;
- independent cryptographic review and a consensus activation proposal.

Status 2026-11-23 (PR #67): the serialization, TapLeaf,
TapTweak/output-key/control-block and Bech32m gates now have
evidence — `omega/` passes all 19 official BIP-340 vectors, all 7
official BIP-341 wallet vectors (including control blocks and
key-path spending), the official BIP-350 Bech32m vectors, and the
pinned HTLC v1 script/TapLeaf vector, extended to the full Taproot
commitment (`spec/vectors/htlc_v1_script.json`). Still open:
BIP-342 tapscript execution and the TapSighash construction for
this leaf, claim/refund spend tests, cross-language vectors,
fuzzing, independent review, and activation. No genesis mining,
treasury funding, or production HTLC funds are permitted until all
gates pass.

## 8. Scope of this draft

This document specifies the intended behavior. It is not yet an implementation, a security audit, or a claim that the existing experimental HTLC code is safe. The legacy `genesis-fork/` structural HTLC is retained as historical research only and is not the normative ExcalOmega v1 design.
