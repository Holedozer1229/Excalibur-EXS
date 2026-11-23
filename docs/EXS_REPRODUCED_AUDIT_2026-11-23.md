# EXS Repository Reproduction Notes — 2026-11-23

**Scope:** Read-only inspection of public repository `Holedozer1229/Excalibur-EXS`, default branch `main`. No repository code was executed. No local checkout was modified. Findings below are source inspection, not runtime exploit demonstrations or an independent cryptographic audit.

**Pinned source revision inspected:** `06a4071ad631374d92752a6d71ba1cf586631d01` (the revision returned by GitHub code-search links during this inspection). File blob SHAs are listed with findings so the review can be repeated. The repository may move; reproduce against this exact revision.

## Executive result

The critical wallet/vault and Rosetta concerns are supported by source. The broad statement that the entire repository contains no Trifold or HTLC code is **too broad**: the separate legacy `genesis-fork/` tree contains a structural HTLC lock and Trifold-related hooks. Those are not evidence that ExcalOmega has a reviewed, BIP-341-compatible three-branch Taproot policy or production FROST. No KNOT implementation was found in the repository code search performed here.

## Reproduced source findings

### Critical — public deterministic material used as wallet/vault key input

1. **Warchest vault** — `warchest_vault.py`, blob `92be0bcdf237bc6adf4e03a778e4024c25f373fb`, lines 27–28 and 64–80. The file defines a fixed seed constant and combines it with the public axiom, derives a PBKDF2-HMAC-SHA512 value, then labels the first 32 bytes a private key. The second half is turned into a demonstration `exs1p...` address. This is deterministic public-recipe material, not safe wallet key generation. The file itself calls the address format simplified/demo.
2. **Prophecy wallet mode** — `cmd/exs-wallet/wallet_cli.py`, blob `e60b590f1ed76b29de24a63e12f4c3e3dfc91acc`, lines 43–72 and 115–172. The default prophecy mode feeds the fixed public 13-word axiom into PBKDF2 with an empty/default passphrase-derived salt, and returns the derived seed words. Without a passphrase it writes the seed words in plaintext. Its address routine constructs `bc1p` plus hex rather than performing Bech32m encoding and secp256k1 Taproot derivation. `generate_address` also fabricates the same prefix + random hex form.
3. **Foundry vault** — `pkg/foundry/exs_foundry.py`, blob `08ba719fb501b6303563d460d5718a660169db1d`, lines 47–75, 97–126, 135–168. It derives a key from public axiom + nonce and a public/stored salt, includes the derived key in the forge result, uses XOR instead of elliptic-curve point addition, and explicitly describes its Bech32m address as simplified.
4. **Treasury credential script** — `forge_treasury_key.py`, blob `23b118c4cc9be4f692d016afa0d68bdad150c472`, lines 3–18. The public axiom is used as the PBKDF2 password while a user-entered `kings_secret` is placed in the salt string along with identity fields. Therefore it is not accurate to say an outside party can recompute this output from the public axiom alone if `kings_secret` remains secret; however, this is a nonstandard and unsafe custody design, and it prints the resulting access key. It must not be used for treasury custody.
5. **Genesis documentation** — `docs/GENESIS.md`, blob `49d22f3cddb3b2410dd6e099f341fbfd4218853b`, lines 390–430. The example sets `private_key = SHA256(entropy)` and `public_key = private_key` as a placeholder, explicitly says proper secp256k1 is not implemented, and must not be treated as a wallet construction.

**Disposition:** Do not fund, reuse, or advertise spendability for outputs from these paths. If any funds were sent to an address produced by them, assume the key may be exposed or the output may be unspendable until an independent spend test proves otherwise.

### High — Taproot implementation is not a conforming wallet/vault path

- `pkg/bitcoin/taproot.go`, blob `ea11d6e21681891a3d1a49202f34617fe0aa7717`, lines 24–57. The implementation hashes concatenated prophecy words without separators, creates a fresh random private key but returns only public keys/address, and computes `SHA256(xonly_pubkey || prophecy_hash)` before passing that digest as the Merkle-root argument to `ComputeTaprootOutputKey`. This is not the BIP-341 TapTweak construction for a specified script tree. The corresponding private key is discarded.
- Repository code search for `schnorr.Sign`, `schnorr.Verify`, and `TapTweak` returned no matches. This is a bounded search result, not proof that no equivalent operation exists under every possible name.
- `cmd/exs-wallet/wallet_cli.py` and `pkg/foundry/exs_foundry.py` independently construct fake `bc1p` strings; those are not valid Bech32m P2TR addresses.

### High — Rosetta service is mock data, not node-backed

- `cmd/rosetta/main.go`, blob `74445c669a92ff8d64865512a1e2c2e5435e492e`, lines 146–151 exposes only six handlers: network/list, network/options, network/status, account/balance, block, and health.
- Lines 208–210 and 250–275 return a hard-coded block height/hash and fixed `100000000` EXS balance. The source labels the balance response as a mock.
- No Construction API endpoints are registered in the server's handler list. This service is not suitable for exchange integration as written.

### High — conflicting genesis specifications

- `SOVEREIGN_GENESIS.md` describes a no-premine genesis forge and a public PBKDF2 seed commitment.
- `docs/GENESIS.md`, blob `49d22f3cddb3b2410dd6e099f341fbfd4218853b`, lines 58–76 and 164–184, describes a 50 EXS genesis output to a P2TR vault. The two documents are inconsistent.
- `docs/GENESIS.md` lines 230–260 also describes deriving “entropy” and a vault seed from public axiom, salt, timestamp, and nonce; these are not secret entropy sources.

### Medium — prophecy hash/signature semantics are inconsistent

- `pkg/genesis/sovereign_genesis.py`, blob `cb7bd3705c70745ce349ebe6de6dbaa08f4df49f`, lines 65–88 uses the exact 13-word axiom and PBKDF2 seed derivation, then forms the PoW root as a formatted string.
- `docs/GENESIS.md`, lines 130–160 defines a normalized SHA-256 axiom digest.
- `pkg/prophecy/prophecy_engine.py`, blob `4edb2ec14368b2dbc6888249a52ebf7afedaac85`, lines 75–78 labels a timestamp-dependent SHA-256 value a `prophet_signature`; this is not a digital signature.
- `pkg/prophecy/rune_validation.py`, blob `ce38e6f27539fcac47873302eeb2d13b889b361e`, lines 69–82 computes a plain SHA-256 of a formatted axiom/nonce/salt message; this is not a signature and has no cryptographic key.
- This inspection confirms multiple incompatible semantics. The exact count of every hash/KDF variant across the entire repository requires a broader inventory and is not asserted here.

## Important scope correction: legacy Trifold / HTLC code exists

The `genesis-fork/` tree is distinct from the sovereign-genesis implementation under `pkg/genesis/`.

- `genesis-fork/txscript.py`, blob `30b5712f2c063a7afe75943680e463b5845d542e`, lines 261–271 defines a PQH hash lock described as spent by a Trifold witness.
- The same file, lines 274–337 defines a structural HTLC descriptor/lock, and lines 398–430 provide claim/refund signing helpers.
- `genesis-fork/excalibur.py`, blob `3da7b56017feed5048c8a54e1d196a030a8e17f6`, lines 478–489 contains best-effort Trifold countersignature hooks.
- Code search did not locate the imported `txpq` module implementation or any `KNOT` implementation. These legacy hooks do not establish an independently reviewed three-branch Taproot construction, a FROST DKG/signing protocol, or compatibility with ExcalOmega.

**Correct conclusion:** ExcalOmega still needs its own explicit, tested Trifold authorization/recovery specification. Reuse of the legacy experimental hooks is not approved. Structural HTLC code exists in the legacy fork, but it is not thereby a production-ready or Taproot-native HTLC.

## Prophecy vector independently recomputed

Using Python standard-library `hashlib` against the exact published axiom bytes (UTF-8, no trailing newline):

- SHA-256 exact text: `87da299f5969e0e38e85840ff13b9aef2044dbfcfed1295a6d042a3bcc6b9181`.
- SHA-256 with spaces removed: `bae594495c21f9ba2a0707f56e31f92f763d4570da174e8f28b629c72b5a6e79`.
- PBKDF2-HMAC-SHA512 seed (salt `EXCALIBUR-SOVEREIGN-GENESIS-v1`, 600,000 iterations, 32 bytes): `582946fd65d357fa6d73dbf071fe70f2a2698ec253a6bec584a86ef500bcfa2d`.

The exact-text SHA-256 matches the genesis document's normalized construction because the published axiom is already lowercase and single-spaced. The seed is public and must not be used as key entropy.

## Not performed

- No repository code or tests were executed.
- No local clone was available to inspect unindexed paths or submodules.
- No full-repository exhaustive proof of absence for a function name is claimed.
- No exploit was run against a live wallet, vault, node, or network.
- No cryptographic implementation has been certified.

## Release block

Keep ExcalOmega genesis mining, treasury creation, wallet funding, and exchange-readiness claims blocked until the findings are resolved in a clean implementation and independently tested. Preserve the existing EXCAL chain and its consensus/signature behavior.
