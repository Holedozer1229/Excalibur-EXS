# Genesis Fork (GSF) — Specification

A Bitcoin hard fork **at Satoshi's genesis block**: the new chain shares
exactly one block with Bitcoin — the genesis block
`000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f`
(recomputed from the 80-byte header in `genesis_fork.py`, not trusted) —
and diverges from block 1 onward under new consensus rules.

## The statement of the fork

Bitcoin's history, restarted. Same genesis, same proof-of-work algorithm,
fresh 21M issuance. What Satoshi's chain would look like if the subsidy
schedule began again at genesis under new network identity.

## Network identity

| Parameter | Mainnet | Testnet |
|---|---|---|
| Name | Genesis Fork | Genesis Fork Testnet |
| Ticker | GSF | tGSF |
| Network magic | `0x4753466B` (`GSFk`) | `0x47534674` (`GSFt`) |
| P2P port | 18444 | 28444 |
| RPC port | 18445 | 28445 |
| Bech32 HRP | `gsf` | `tgsf` |
| P2PKH version | `0x32` | `0x32` |
| P2SH version | `0x55` | `0x55` |
| Initial difficulty | `0x1e100000` (target 2²³⁶) | `0x1f010000` (target 2²⁴⁰) |
| Min-difficulty rule | no | yes (see below) |

Both networks share Satoshi's genesis block. The testnet is a second
fork at the same genesis — same anchor, separate identity, separate
history. A mainnet block is invalid on testnet and vice versa
(different required bits at every height; demonstrated in the demo
steps [6] and [7]).

### Testnet min-difficulty rule (à la Bitcoin)

If `2 * TARGET_SPACING` (1200s) passes with no block, a testnet block may
use minimum difficulty (`init_bits`) regardless of the retarget schedule.
As in Bitcoin, min-difficulty blocks do not move the retarget anchor:
the adjustment walks back past them to the last real-difficulty block.

## Consensus rules (differ from Bitcoin)

1. **Genesis**: byte-identical to Bitcoin's genesis block (verified in code).
2. **PoW**: SHA-256d, 600s target, 2016-block retarget window, same 4x
   clamp — the adjustment *math* is Bitcoin's, but the window *slides*:
   every height above 2016 retargets from the trailing 2016 blocks
   (see GF-03), not at fixed 2016-block boundaries.
3. **Initial difficulty**: `0x1e100000` (target 2²³⁶). Bitcoin's
   `0x1d00ffff` would make a new chain unmineable; the initial difficulty
   is a launch parameter and the reason this is a hard fork, not a
   re-run. Heights 1–2016 use the initial bits; the first retarget is
   computed at height 2017 from blocks 1–2016.
4. **Subsidy**: 50 GSF per block, halving every 210,000 blocks —
   a second 21,000,000. `subsidy = 50 >> (height // 210000)`.
5. **Block size**: 1,000,000 bytes max (v1: no witness program).
6. **Coinbase lineage rule** (new, consensus-critical): the coinbase
   scriptSig's **first data push must be the block's nBits serialized
   little-endian** — the exact construction Satoshi used for blocks
   0–32255 (first push `ffff001d` = LE(`0x1d00ffff`), the Flo marker).
   Every fork block carries cryptographic lineage to the genesis
   construction. Violations are invalid blocks, not warnings.
7. **Time**: block time must exceed the previous block's time and not
   exceed network time + 2h (simplified; no median-time-past in v1).
8. **GF-11 post-quantum authorization** (activation height 10,000):
   at/after activation, all new outputs must be ML-DSA-65 PQ outputs
   (`00 11 || 1952-byte pubkey`); new P2PK/`OP_TRUE` outputs are rejected;
   PQ spends use version-2 transactions with `11 || 3309-byte signature`
   verified against `sha256d("EXCAL-GF11-PQ-SIGHASH\x00" || LE32(in_idx) ||
   sighash_all)`; coinbase must pay to PQ; max 64 PQ verifications per
   block. Legacy UTXOs stay spendable indefinitely. See `bips/GF-11.md`.

Unchanged from Bitcoin: tx format, script system, merkle trees,
difficulty-adjustment math, halving cadence, 21M cap.
Pre-activation rules are byte-for-byte unchanged by GF-11.

## Replay protection

Not required: the only shared block is the genesis block, whose coinbase
is unspendable on both chains. No spendable history is shared, so no
transaction can replay.

## Divergence proof (measured)

Bitcoin's real block 1 used `nBits = 0x1d00ffff`. The fork requires
`0x1e100000` at height 1 → a fork node **rejects** Bitcoin's block 1.
Same parent (genesis), different child, different rules: hard fork at
genesis, demonstrated in `genesis_fork.py` step [4].

## Reference implementation

`genesis_fork.py` — pure Python, no dependencies:
- `verify_genesis()` — recomputes the genesis hash from header fields
- `required_bits()` / `validate_block()` — fork consensus
- `check_coinbase_lineage()` — the Flo-marker rule
- `mine_block()` — real SHA-256d mining loop
- demo: verifies genesis, mines 6 blocks (~11s at target 2²³⁶),
  validates the chain, proves divergence

## Production path (not done here)

A live network needs: these chainparams ported into Bitcoin Core
(`chainparams.cpp` new network), DNS seeds or fixed seeds, a launch
difficulty chosen for real miners (not the demo's 2²³⁶), and a
genesis-mining ceremony for block 1. The Python reference defines
consensus; Core would enforce it at scale.

## Transactions, mempool, RPC (v2, live on the EXCAL testnet)

The testnet miner (`excal.py`) now runs a full transaction layer:

- **Script**: data pushes, OP_0–OP_16, OP_CHECKSIG. Output types: P2PK
  (`0x21 <33-byte compressed pubkey> 0xAC`) and OP_TRUE (the
  anyone-can-spend coinbases). Input scripts: `<64-byte sig><0x01>` for
  P2PK, empty for OP_TRUE. Unknown opcodes fail closed.
- **Signatures**: pure-Python secp256k1 (`secp256k1.py`, RFC 6979
  deterministic nonces, low-S enforced), legacy SIGHASH_ALL.
- **Consensus tx rules**: inputs exist and are unspent, no double-spend
  within a block, coinbase maturity 100, fee ≥ 0, scripts execute,
  coinbase value = subsidy + fees. Duplicate coinbase txids from the
  pre-v2 era are disambiguated oldest-first in the UTXO set.
- **Coinbase v2**: scriptSig is now
  `push(LE(bits)) + push(tag) + push(LE(height))` — the first push is
  still LE(bits) so the lineage rule holds, and the height push gives
  every new coinbase a unique txid (BIP34 lesson).
- **Mempool** (`mempool.py`): fee-ordered, validated admission against
  UTXO + pending txs, no RBF, persisted to `mempool.json`.
- **RPC** (localhost only, default `127.0.0.1:28445`): `/tip`, `/mempool`,
  `/tx` (submit), `/balance`, `/utxo`, `/keygen`, `/wallet`,
  `/send` (build+sign+submit), `/faucet` (spends a mature anyone-UTXO).
  Pure stdlib HTTP, no dependencies. Testnet coins are valueless.

## Tunables (one-line changes)

- `FORK_INITIAL_BITS` — launch difficulty
- `SUBSIDY_SATS` / `HALVING_INTERVAL` — issuance
- `MAX_BLOCK_SIZE` — capacity
- `make_coinbase(tag=...)` — coinbase tag push after the marker
