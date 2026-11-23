# EXS Network Parameters — Draft 0.1

**Status:** Draft, for review. Not consensus, not activated, not
registered anywhere. No genesis block exists under these
parameters; no funds may be sent to addresses derived from them.

**Compatibility:** ExcalOmega is a separate possible network. These
parameters do not change the existing EXCAL chain, its network
identifiers, its genesis, or its addresses.

## 1. Draft identity

| Parameter | Value | Status |
|---|---|---|
| Network name | ExcalOmega | draft |
| Token symbol | EXS | draft |
| Chain ID | **unassigned** | Must be chosen before any genesis; must not collide with an existing chain's ID. |
| Network magic (p2p) | **unassigned** | 4 bytes, to be chosen; must not collide with Bitcoin (`f9beb4d9`), EXCAL fork, or other known networks. |
| Mainnet HRP | `exs` | **DRAFT, provisional, unregistered.** Used only for test vectors (e.g. the HTLC v1 vector in `spec/vectors/htlc_v1_script.json`). |
| Testnet HRP | `texs` | **DRAFT, provisional, unregistered.** Used only for test vectors. |
| Address encoding | Bech32m (BIP-350) for witness v1+; Bech32 (BIP-173) for v0 | Adopted standard; implemented in `omega/bech32.py`, verified against official BIP-350 vectors. |
| Signature scheme | BIP-340 Schnorr, x-only keys | Adopted standard; implemented in `omega/bip340.py`, all 19 official vectors pass. |
| Taproot | BIP-341 construction, BIP-342 tapscript | Adopted standard; implemented in `omega/bip341.py`, all 7 official wallet vectors pass. |
| HTLC internal key | BIP-341 NUMS point `H = lift_x(0x50929b74…803ac0)` | Pinned; re-derived from first principles in `tests/test_omega_htlc_v1.py`. |
| Genesis timestamp / hash | **none** | Genesis is BLOCKED (see section 3). |

The HRPs `exs` / `texs` are chosen to be distinct from Bitcoin's
`bc` / `tb` so EXS P2TR addresses can never be confused with
Bitcoin addresses (the old code used Bitcoin HRPs, which made EXS
addresses indistinguishable from Bitcoin's — reproduced audit
section 5(b)). They are provisional until registered in the
canonical network-parameters specification; a collision check
against live networks is still open.

## 2. What is decided here

- The cryptographic primitives (BIP-340/341/350) and their
  reference implementation (`omega/`).
- The HTLC v1 leaf and its Taproot commitment, including the NUMS
  internal key and the draft-HRP test address.
- The domain registry (`docs/EXS_DOMAIN_REGISTRY_V0_1.md`).
- The prophecy commitment candidate vector (frozen, not consensus):
  SHA-256 of the exact axiom bytes =
  `87da299f5969e0e38e85840ff13b9aef2044dbfcfed1295a6d042a3bcc6b9181`.

## 3. What is NOT decided here (blocking)

Genesis remains blocked until a single approved document defines
all of the following (rebuild spec section 7). This draft records
the contradictions; it does not resolve them:

| Item | Contradiction on record |
|---|---|
| Total / maximum supply | 21,000,000 EXS cap is stated in both `SOVEREIGN_GENESIS.md` and `README.md` (agreed). The allocation split is not: `SOVEREIGN_GENESIS.md` (60/20/15/5 of post-tithe remainder, 1% tithe, 50 EXS forge reward halving every 210,000 forges) vs `README.md` tokenomics table (50% PoF rewards / 15% dev / 10% founders / 10% treasury / 10% community / 5% liquidity, 4-year vesting). |
| Premine | `SOVEREIGN_GENESIS.md` says "no premine: the genesis forge pays no one"; `docs/GENESIS.md` pays a 50 EXS genesis output to a "P2TR Genesis Vault"; `warchest_vault.py` is an explicit premining implementation. A "no premine" statement and a funded genesis vault cannot both describe the same genesis. |
| Genesis payout | 0 EXS (sovereign genesis) vs 50 EXS (GENESIS.md). Unresolved. |
| Treasury / warchest | Existence, ownership, spend policy and recovery are undefined; the existing treasury scripts are unsafe custody (public-axiom-derived keys, printed secrets) and must not be used. |
| Issuance / rewards | Forge reward schedule, halving, tithe, and fee/dust policy are stated differently in different documents and are not reconciled. |
| PoW / consensus | Three incompatible PoW kernels on record plus a floating-point defect in Zetahash and a dice-adjusted difficulty path. No consensus algorithm is selected. |
| Chain ID / magic / genesis hash | Unassigned (see section 1). No genesis block may be mined or funded until these are assigned in an approved specification. |

## 4. Test-vector addresses are not spendable addresses

The `exs1p…` address in `spec/vectors/htlc_v1_script.json` is a
commitment test vector. Its internal key is the NUMS point (unknown
discrete logarithm), so it has no key path by construction, and its
script path is the HTLC leaf. Do not send funds to it. No EXS
exists yet; there is nothing to send.
