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
   carrying the `source_release_txid` and the `burn_ref`.
3. `BridgeLedger.peg_out_release()` verifies:
   - a quorum (M-of-N, distinct operators) signed the attestation,
   - `burn_ref` names a real, previously unmatched burn for the same
     symbol, with the amount matching exactly,
   - the attestation was never recorded before (replay protection).
   On success `locked` is decremented — the source coins left custody.

**Supply invariant** (enforced on every mutation, asserted in code):

```
outstanding(asset) == minted(asset) - burned(asset)
locked(asset)      >= outstanding(asset)
```

## Trust model (explicit)

- **Federated, not trustless — but quorum-gated.** Operator keys are
  trusted to verify source-chain locks before signing MINT and to release
  before signing RELEASE. A MINT or RELEASE is valid only with signatures
  from at least `threshold` DISTINCT operators (configurable M-of-N,
  persisted with the ledger; one operator signing twice counts once).
  The ledger is append-only so any mis-issue is permanently auditable.
- **Release integrity is machine-checked.** A RELEASE cannot reference a
  nonexistent or already-released burn, cannot change the amount, and
  cannot be replayed. `unreleased_burns()` gives operators the pending
  work queue.
- **Off-chain ledger, not consensus.** Genesis Fork v1 has no token script;
  wrapped balances live in this ledger (JSON-persisted), not in UTXOs.
- **No live custody.** This module performs no real locks/releases; it is
  the accounting + attestation layer. Amounts are integers in the source
  coin's base units.

## Bridge toll (fees)

- Optional fee in basis points on peg-in mints and peg-out burns
  (`fee_bps`, default 0; per-asset overrides via `set_fee`). 30 bps = 0.30%.
- Fees accrue to the `fee_collector` address in the wrapped asset and are
  fully auditable: every `peg_in`/`peg_out_burn` log entry records the fee,
  and `fee_schedule()` / `fees_collected()` expose the live schedule and
  totals. Schedule changes are themselves logged (`fee_schedule` entries).
- On burns the fee is taken from the gross: the holder's balance drops by
  the full amount, the fee goes to the collector, and the RELEASE
  attestation must match the *net* burn amount exactly. A fee that would
  consume the entire transfer is rejected, never silently bricked.
- The supply invariant (`minted - burned == outstanding`,
  `locked >= outstanding`) is enforced on every fee-bearing op.

## Rosetta / Mesh

`rosetta_currency(symbol)` emits a Mesh-ready `Currency` object per wrapped
asset (symbol, decimals, `asset_id`, source chain/contract metadata) —
`all_currencies()` returns all seven for the adapter to advertise.

## Files

- `aetherion_tokens.json` — canonical coin registry (v1)
- `aetherion_bridge.py` — registry, asset derivation, attestations
  (secp256k1), `BridgeLedger` with M-of-N quorum, release integrity checks,
  and supply-invariant enforcement
- `test_aetherion_bridge.py` — 61 checks (29 v1 + 13 v2 adversarial
  + 19 fee-schedule), all passing
- `AETHERION_CONNECT.md` — this spec

## Future work (not in v2)

- On-chain wrapped UTXOs (requires a token consensus upgrade on the fork).
- Automated source-chain lock verification (per-chain light clients) to
  shrink operator trust.
- Operator key ceremony + rotation procedures.
