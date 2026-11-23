# omega/ — ExcalOmega rebuild reference implementation

**Status: experimental reference code, not production cryptography.**

This package is the clean-room replacement for the unsafe
wallet/vault/Taproot paths documented in
`docs/EXS_REPRODUCED_AUDIT_2026-11-23.md`. It is standard-library-only
Python (`hashlib`, `secrets`, `unittest`), with no third-party
dependencies and no network access.

## Contents

| Module | What it does |
|---|---|
| `secp256k1.py` | Field/group arithmetic, `lift_x`, BIP-340/341 tagged hashes, NUMS point constant |
| `bip340.py` | BIP-340 Schnorr `pubkey_gen` / `sign` / `verify` |
| `bip341.py` | BIP-341 TapLeaf/TapBranch/TapTweak, Merkle trees, output keys, control blocks, tweaked private keys |
| `bech32.py` | Bech32 (BIP-173) / Bech32m (BIP-350) and SegWit address encode/decode |
| `wallet.py` | CSPRNG-only key generation; no derivation from public data |
| `htlc.py` | HTLC v1 leaf construction and NUMS-internal-key Taproot commitment |

## What it proves, and what it does not

Proven by the test suite (`tests/test_omega_*.py`):

- All 19 official BIP-340 test vectors: byte-exact signatures for
  the 8 signable rows, correct TRUE/FALSE verification for all rows.
- All 7 official BIP-341 wallet `scriptPubKey` vectors (Merkle root,
  tweak, tweaked pubkey, scriptPubKey, Bech32m address, control
  blocks) and all 7 key-path spending vectors (tweaked private key,
  TapSighash, deterministic signature with zero aux randomness).
- Official BIP-350 Bech32m valid/invalid vectors, plus SegWit
  address round-trips.
- HTLC v1: the pinned script/TapLeaf vector from
  `spec/vectors/htlc_v1_script.json` is reproduced byte-for-byte,
  and the full Taproot commitment (output key, control block,
  scriptPubKey, Bech32m address under draft HRP `exs`) is computed
  with the BIP-341 NUMS internal key, so no key-path bypass exists.

Not proven: constant-time behaviour (this code is **not**
constant-time), side-channel resistance, production wallet custody,
backup/encryption, consensus activation, or cross-language
agreement. An independent cryptographic review is still required
before any mainnet or funds-carrying use.

## Hard rules

- Keys come only from the OS CSPRNG (`secrets`). The public
  13-word prophecy, genesis data, timestamps, nonces and public
  salts are never key material. There is deliberately no API in
  this package that derives a key from public data.
- No secret is printed or logged anywhere in this package.
- No floating-point arithmetic in any consensus-relevant path.
- No mock signatures, synthetic guardian approvals, or simulated
  FROST anywhere.
- The legacy `warchest_vault.py`, `forge_treasury_key.py`,
  `cmd/exs-wallet/wallet_cli.py` and `pkg/foundry/exs_foundry.py`
  paths are **not** fixed by this package and must not be used;
  they remain blocked in the rebuild spec until replaced.

## Running the tests

```sh
python3 -m unittest discover -s tests -v
```

Only tests in `tests/` that import the standard library and this
package may be run. Pre-existing repository code and its tests
must not be executed (see the rebuild spec, section 10).
