# EXCAL P2P + Reorg — Specification (v1)

Built 2026-09-20. Pure Python, stdlib only, matching the rest of the stack.

## Goals

1. Real peer-to-peer transport: nodes discover each other's tips, sync
   headers, download blocks, and relay transactions.
2. Correct reorg handling: when a heavier valid branch appears, the node
   switches to it — UTXO rolled back and replayed, mempool resurrected,
   crash-safe at every step.
3. Never silently rewrite history: the append-only block log keeps every
   validated block on every branch; only the *active tip pointer* moves.

## Non-goals / frozen decisions

- **Consensus is frozen.** The known audit items (PoW byte orientation,
  first-retarget off-by-one, neutralized genesis assertion) are NOT
  changed here. P2P transports and enforces the existing
  `validate_block` exactly as the miner does. A v1/v2 consensus decision
  is Travis's call and would be a separate, explicitly attested change.
- No DNS seeds, no UPnP, no Tor. Peers are configured (`--peer`) or
  localhost by default.
- No compact blocks, no SegWit, no bloom filters. Full blocks only.

## Wire protocol

Bitcoin-style framing, EXCAL network magic:

```
magic    : 4 bytes LE  (testnet 0x47534674 'GSFt', mainnet 0x4753466B 'GSFk')
command  : 12 bytes, ASCII, NUL-padded
length   : 4 bytes LE, payload length (max 4 MB)
checksum : 4 bytes, sha256d(payload)[:4]
payload  : length bytes
```

All hashes on the wire are in **internal byte order** (sha256d output
order, NOT display order). Integers are little-endian unless noted.

Messages:

| command    | payload |
|------------|---------|
| `version`  | proto_ver u32 (=1) + services u64 + time i64 + tip_height u32 + tip_hash 32B + nonce u64 |
| `verack`   | empty |
| `ping`     | nonce u64 |
| `pong`     | nonce u64 (echo) |
| `getheaders` | n_locators varint + locator hashes (32B each, newest-first) + stop_hash 32B (zero = "give me up to 2000 past the locator") |
| `headers`  | varint count + count × 80-byte headers |
| `inv`      | varint count + entries: type u32 (1=block, 2=tx) + hash 32B |
| `getdata`  | same as `inv` |
| `block`    | 80-byte header + varint ntx + txs (each: varint len + raw bytes) |
| `tx`       | varint len + raw tx bytes |

Handshake: dialer sends `version`, listener replies `version`+`verack`,
dialer replies `verack`. A peer that doesn't complete the handshake in
15s is dropped. Self-connection (matching nonce) is dropped.

## Sync protocol

1. After handshake, each side knows the other's tip (height + hash).
2. If peer tip has more chainwork: send `getheaders` with a locator
   (our tip, then exponential step-back: 1,2,4,8… back to genesis).
3. Peer replies `headers` (up to 2000). Validate each header fully
   (PoW, linkage, bits via ancestor walk) before requesting blocks.
4. For headers we don't have blocks for: `getdata` (batches of 32),
   receive `block`, full-validate (header + all txs against the UTXO
   view at the block's parent), store.
5. Repeat until our best tip has >= peer's advertised chainwork.

Header validation of a side-branch block needs `required_bits`, which
needs the 2016-block ancestor context: walk parent pointers through
the block index (all headers stored, so this always terminates at
genesis). For height <= 2016 the answer is `init_bits` (plus the
testnet min-difficulty time rule, evaluated against the parent).

## Chain selection: most chainwork wins

`work(bits) = 2^256 // (target(bits) + 1)` per block; chainwork is the
sum over the branch. Ties (astronomically unlikely) break toward the
first-seen tip. The active chain is the tip with maximum chainwork.

## Reorg algorithm

State kept in memory:
- `index`: block_hash -> record {height, parent, bits, work_cum, header fields, txs}
- `tips`: hash -> height for all branch tips
- `best`: active tip hash
- `utxo`: UTXO set for the ACTIVE chain only
- `undo`: block_hash -> undo record for every ACTIVE chain block
  (genesis has empty undo)

An undo record is the exact inverse of `apply_block_txs`, as an ordered
op list so multi-entry keys (colliding pre-v2 coinbase txids) restore
bit-exact:
- for each tx in application order: `spent: [(key, entry, pos)...]`,
  `created: [key...]` with per-key appended counts
- disconnect replays the ops in reverse: truncate created entries,
  re-insert spent entries at their original positions.

Reorg to a heavier fully-validated tip T':
1. Find fork point F = common ancestor of best and T' (walk parent
   pointers; both chains terminate at genesis).
2. Work on a COPY of the UTXO: `{k: list(v)}` (entries are immutable
   tuples, so a shallow list copy is a true snapshot).
3. Disconnect: for h from height(best) down to height(F)+1, apply
   undo[h] to the copy.
4. Connect: for h from height(F)+1 to height(T'), full-validate the
   block against the copy (header re-checked + `validate_block_txs`),
   apply to the copy, capture undo.
5. If every step succeeds: commit —
   a. atomically rewrite `active.jsonl` (temp file + fsync + rename),
   b. atomically rewrite `state.json` (new best tip, tips, reorg log),
   c. swap in the new UTXO and undo map, update `best`.
6. Mempool fix-up (under the node lock):
   - non-coinbase txs from disconnected blocks → `mempool.add`
     (revalidated; failures dropped with a log line),
   - txs confirmed in the new branch → `mempool.remove_confirmed`,
   - any remaining mempool tx that no longer validates → dropped.
7. If any step fails: abort, keep the old state untouched, log the
   cause, penalize the peer that fed us the branch.

Crash safety: steps 5a/5b are the only disk mutations and both are
atomic renames. A crash before them leaves the old chain intact; a
crash after leaves the new chain intact. On startup the UTXO is
rebuilt by replaying the active chain from genesis (no UTXO snapshot
to corrupt), and the in-memory undo map is regenerated during the
same replay.

## Persistence layout (`chaindata/`)

- `blocks.jsonl` — append-only. Every validated block on every branch,
  one JSON line: full block + height + cumulative work. Never rewritten.
- `active.jsonl` — the active chain, one block per line in height order.
  Appended in the common case; atomically rewritten on reorg.
- `state.json` — atomic (temp + rename): `{best, tips: {hash: height},
  reorgs: [...], height}`.
- First run migrates from the legacy `testnet_live.jsonl` (byte-identical
  import; undo regenerated by replay).

`mempool.json` and `wallet.json` are unchanged.

## Peer behavior / DoS

- Per-peer misbehavior score; +10 for an invalid header/block/tx,
  +1 for protocol garbage. Score >= 50 → disconnect + ignore for 1h.
- `getheaders`/`getdata` responses capped (2000 headers / 32 blocks).
- A branch is only considered for reorg once it is fully connected to
  genesis AND every block is fully validated.
- Orphan blocks (parent unknown): kept in a bounded orphan pool (128);
  request the parent chain via `getheaders` once.

## RPC additions (localhost)

- `GET /peers` → connected peers with tip heights and scores
- `POST /addpeer` `{host, port}` → dial (also via `--peer`)
- `GET /tips` → all branch tips with height + chainwork
- `GET /reorgs` → reorg history (fork height, depth, old/new tip)

## Tests (`test_p2p_reorg.py`)

1. Two in-process nodes, shared genesis. A mines 3 blocks, B mines 5
   (heavier). Connect → A's node reorgs to B's tip; balances exact;
   mempool tx resurrected from A's orphaned block confirms on B's chain.
2. Invalid block from peer (bad PoW) → rejected, peer scored, no state
   change.
3. Crash during reorg: SIGKILL between disconnect and commit →
   restart → old chain intact, UTXO rebuilds clean.
4. Wire round-trip: every message type encodes/decodes byte-exact.
5. Three-way fork: two competing branches, heavier-later branch wins;
   reorg depth accounting correct.

## Scaling notes

UTXO replay from genesis on startup is O(chain length). Fine for a
testnet (thousands of blocks); a UTXO snapshot format would be needed
past ~1M blocks. Documented, not built.
