# AETHERION ↔ EXCAL Connection

All seven Aetherion coins connected to the EXCAL Genesis Fork chain.

## The coins

| # | Coin | Home chain | Standard | Status |
|---|------|-----------|----------|--------|
| 1 | ATART | Bitcoin | BRC-20 | Live claim |
| 2 | AETX | Bitcoin | BRC-20 | Mainnet BRC-20 |
| 3 | EXCALIBUR | Arbitrum One | attestation receipt | Live ritual |
| 4 | URUU | zkSync Era | ERC-20 | Mainnet live |
| 5 | SKYNT | Ethereum | ERC-20 | Mainnet pair |
| 6 | wURUU | Solana | SPL | Staged wrap |
| 7 | EXS | EXS Tetra-PoW | native | Lattice host |

Canonical facts live in `aetherion_tokens.json` (grounded in
`Holedozer1229/aetherion-oracle-arcane`). Fields the repo never published
are `null`, not guessed.

## The connection: federated attested bridge (v1)

Each coin maps to a deterministic EXCAL wrapped asset:

```
asset_id(symbol) = sha256d("AETHERION-EXCAL-ASSET:" + SYMBOL)   # 32 bytes
wrapped symbol   = "a" + SYMBOL                                # aURUU, aAETX, …
decimals         = source decimals, or 8 (GSF convention) when unknown
```

**Peg-in** (source chain → EXCAL):
1. Holder locks coins on the home chain (real tx, `source_txid`).
2. Federation operator verifies the lock off-chain and signs a `MINT`
   attestation: `{symbol, amount, source_txid, recipient}`.
3. `BridgeLedger.peg_in()` verifies the operator signature, rejects reused
   `source_txid` (replay protection), and credits the recipient's wrapped
   balance. `locked` and `minted` increase together.

**Peg-out** (EXCAL → source chain):
1. Holder calls `peg_out_burn()` — wrapped balance debited immediately,
   `burned` increases, a `burn_ref` is issued.
2. Operator releases the source coins and signs a `RELEASE` attestation
   carrying the `source_release_txid`; the ledger records it as audit trail.

**Supply invariant** (enforced on every mutation, asserted in code):

```
outstanding(asset) == minted(asset) - burned(asset)
locked(asset)      >= outstanding(asset)
```

## Trust model (explicit)

- **Federated, not trustless.** Operator key(s) are trusted to verify
  source-chain locks before signing MINT. Default is 1-of-1; the ledger is
  append-only so any mis-issue is permanently auditable.
- **Off-chain ledger, not consensus.** Genesis Fork v1 has no token script;
  wrapped balances live in this ledger (JSON-persisted), not in UTXOs.
- **No live custody.** This module performs no real locks/releases; it is
  the accounting + attestation layer. Amounts are integers in the source
  coin's base units.

## Rosetta / Mesh

`rosetta_currency(symbol)` emits a Mesh-ready `Currency` object per wrapped
asset (symbol, decimals, `asset_id`, source chain/contract metadata) —
`all_currencies()` returns all seven for the adapter to advertise.

## Files

- `aetherion_tokens.json` — canonical coin registry (v1)
- `aetherion_bridge.py` — registry, asset derivation, attestations
  (secp256k1), `BridgeLedger` with supply-invariant enforcement
- `test_aetherion_bridge.py` — 29 checks, all passing
- `AETHERION_CONNECT.md` — this spec

## Future work (not in v1)

- On-chain wrapped UTXOs (requires a token consensus upgrade on the fork).
- N-of-M federation / threshold signatures instead of 1-of-N.
- Automated source-chain lock verification (per-chain light clients) to
  shrink operator trust.
