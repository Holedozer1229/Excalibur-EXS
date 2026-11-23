# EXS Protocol Domain Registry — v0.1 (Draft)

**Status:** Draft, for review. Not consensus.  
**Scope:** ExcalOmega (EXS) only. Nothing in this registry changes
the existing EXCAL chain.

## 1. Why a registry

The reproduced audit found the same bytes hashed under four
different prophecy encodings, three salts and two KDF hashes, and a
non-standard tweak (`SHA256(internal_pubkey || prophecy_hash)`)
used in three places. Untagged hashing is how a commitment made in
one context gets replayed as a key, a signature, or a tweak in
another. This registry is the fix at the specification level: every
hash, signature message, KDF context and commitment in new EXS code
MUST name its domain explicitly, and domains are never reused
across purposes.

Rules:

1. Every new hash computation uses a domain tag from this registry
   (or a standard BIP tag listed in section 3). Untagged `SHA256(x)`
   of structured data is forbidden in new code.
2. A domain tag is a literal byte string. Tags are not
   interchangeable, not abbreviated, and not parameterised by
   user-controlled text.
3. Adding a domain requires a registry version bump and a test
   vector. Removing a domain is forbidden; domains are deprecated,
   never deleted, so historical interpretation never changes.
4. The prophecy digest is a commitment to public bytes only. It is
   never a key, a password, a signature, or KDF input.

## 2. EXS-specific domains

| Domain tag | Purpose | Construction | Version |
|---|---|---|---|
| `EXS_PROPHECY_SHA256_V1` (informational label; see note) | Prophecy commitment candidate | `SHA256(exact axiom UTF-8 bytes)` — untagged legacy form, retained ONLY as the frozen candidate vector in `docs/PROPHECY_COMMITMENT_V1_CANDIDATE.md`. New protocol hashes MUST NOT reuse this form. | v1 candidate, not consensus |
| `EXS/HTLC-V1` | HTLC v1 leaf domain separation in off-chain descriptors | Descriptor field only; the on-chain leaf uses BIP-341 tagged hashes (`TapLeaf` etc.), not this tag. | v1 draft |
| `EXS/GENESIS` | Reserved for the future genesis commitment | Unassigned. No genesis hash may be computed under this tag until the genesis specification (rebuild spec section 7) is approved. | reserved |

Note on the prophecy candidate: the frozen vector
`87da299f…b9181` is the plain SHA-256 of the axiom bytes, as
specified by the genesis document's normalized construction. It is
kept exactly as-is for reproducibility of the historical claim; it
is NOT presented as a tagged hash, and no new construction may
claim the same digest for a different purpose. If a tagged
prophecy commitment is ever adopted, it gets a new registry entry
and a new version — the candidate digest does not change meaning.

## 3. Adopted standard domains (BIP-340 / BIP-341 / BIP-342)

These tags are defined by the BIPs and are used verbatim. The
reference implementation is `omega/`; the vectors are in
`tests/test_omega_bip340_vectors.py` and
`tests/test_omega_bip341_vectors.py`.

| Domain tag | Purpose | Defined by |
|---|---|---|
| `BIP0340/aux` | Schnorr auxiliary randomness | BIP-340 |
| `BIP0340/nonce` | Schnorr nonce derivation | BIP-340 |
| `BIP0340/challenge` | Schnorr challenge hash | BIP-340 |
| `TapLeaf` | Tapscript leaf hash | BIP-341 |
| `TapBranch` | Taproot Merkle branch hash | BIP-341 |
| `TapTweak` | Taproot output-key tweak | BIP-341 |
| `TapSighash` | Taproot signature hash | BIP-341 |

The non-standard tweak `SHA256(internal_pubkey || prophecy_hash)`
found in `pkg/bitcoin/taproot.go:45`,
`docs/GENESIS.md:418-426` and `pkg/foundry/exs_foundry.py:151-158`
has NO registry entry and MUST NOT be used. The correct
construction is the BIP-341 `TapTweak` tagged hash, implemented in
`omega/bip341.py` and verified against all 7 official BIP-341
wallet vectors.

## 4. Forbidden constructions

The following are prohibited in new EXS code, without exception:

- Deriving a private key, seed, or signing scalar from the public
  axiom, public genesis data, timestamps, nonces, block hashes, or
  public salts. (`omega/wallet.py` exposes no such API by design;
  `tests/test_omega_wallet.py` fails if one is added.)
- Using the PBKDF2 sovereign seed
  (`582946fd…bcfa2d`, public and deterministic) as key material.
- XOR-based key tweaks (`internal_key XOR tweak` in
  `pkg/foundry/exs_foundry.py:163`). Tweaks are elliptic-curve
  point additions under BIP-341.
- Fabricated addresses (`"bc1p" + hex`, `"exs1p" + hex`). An
  address is valid only if produced by Bech32m encoding of a real
  witness program (BIP-350), verified by `omega/bech32.py`.
- Timestamp-dependent "signatures" (`prophet_signature`,
  `compute_rune_signature`). A SHA-256 of formatted text is not a
  signature.
- Floating-point arithmetic in any consensus-relevant computation
  (see the Zetahash `float64` defect in the reproduced audit).
  Consensus arithmetic is exact integer arithmetic only.

## 5. Versioning

- Registry version: **0.1** (this document).
- Changes are append-only: new domains are added with a new
  version; existing entries are never edited in place. A change to
  a domain's construction retires the old entry and creates a new
  versioned entry.
- This registry is a specification document. Code that claims
  conformance MUST cite the registry version it implements.
