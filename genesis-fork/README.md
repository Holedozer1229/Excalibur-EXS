# EXCAL — Genesis Fork

**EXCAL** is the reference node for **Genesis Fork** (`GSF`), a UTXO-based
blockchain with a Bitcoin-derived transaction format. Pure Python,
standard library only, no dependencies.

This is the `genesis-fork/` subtree of
[Excalibur-EXS](https://github.com/Holedozer1229/Excalibur-EXS). Note:
Genesis Fork / `GSF` is a **separate chain and asset** from the `$EXS`
protocol that is the main subject of this repository — they share a
repository, not a consensus.

This subtree also ships the chain's **Rosetta (Mesh) API implementation**
under `rosetta/` — the adapter listed in the
[Mesh ecosystem](https://github.com/coinbase/mesh-ecosystem).

- **Ticker:** `GSF`, 8 decimals
- **Consensus:** SHA-256d proof-of-work, 600s target spacing, 2016-block
  retarget, 100-block coinbase maturity
- **P2P:** custom wire protocol, localhost-only by default
- **Network identifier (Rosetta):** `{"blockchain": "Genesis Fork", "network": "mainnet"}`
- **Addresses (Rosetta):** compressed-secp256k1-pubkey hex for P2PK outputs;
  `"anyone"` for OP_TRUE (anyone-can-spend) outputs

## Layout

| Path | Contents |
|---|---|
| `excal.py` | Node entrypoint: miner, P2P, RPC (`--network mainnet --tag EXCAL`) |
| `p2p.py` | P2P networking (peer manager, sync, reorg handling) |
| `node_rpc.py` | Localhost RPC: `/tip`, `/mempool`, `/tx`, `/balance`, `/utxo`, `/keygen`, `/wallet`, `/send`, `/faucet`, `/submitrawtx`, … |
| `chainstate.py` | Chain state, UTXO set, block validation |
| `mempool.py` | Fee-ordered validated mempool (no RBF) |
| `txscript.py` | Transaction parsing/serialization, sighash, script evaluation, consensus validation |
| `secp256k1.py` | Pure-Python secp256k1 (sign/verify, RFC 6979) |
| `genesis_fork.py` | Chain primitives (hashing, varints, script pushes, subsidy) |
| `genesis_fork_chain.json` | Known-good chain anchors (height → hash/bits) |
| `bip322.py` | BIP-322 generic signed-message format (simple variant, P2WPKH) |
| `payout.py` | Coinbase payout simulation to worker addresses (no keys) |
| `zero_sign.py` | Symbolic "double-zero" ECDSA ceremony (public by construction) |
| `FORK_SPEC.md` / `P2P_SPEC.md` | Fork and P2P specifications |
| `test_*.py`, `smoke_mainnet.py` | Integration tests (two-node sync/reorg, tx consensus, mainnet smoke) |
| `rosetta/` | The Rosetta (Mesh) Data + Construction API implementation |
| `chain/` | Chain modules used by the Rosetta adapter |
| `sample_chaindata/` | The real mainnet's first blocks (genesis + blocks 1–3) so the Rosetta server runs out of the box |

## Run a node

```bash
# Mainnet node (P2P 127.0.0.1:18444, RPC 127.0.0.1:18445):
python3 excal.py --network mainnet --tag EXCAL

# Faster block pacing on a disposable node (miner policy, not consensus):
python3 excal.py --network mainnet --tag TEST --spacing 2
```

Chaindata lands in `chaindata_mainnet/` next to the node (created at
runtime — not committed). The node mines on a 600s pace by default.

## Run the Rosetta adapter

```bash
# Data API + Construction API against the sample chain (no node needed):
python3 rosetta/rosetta_server.py --port 8070 --node-rpc ""

# Point at a live node to enable /construction/submit:
python3 rosetta/rosetta_server.py --port 8070 \
  --node-rpc http://127.0.0.1:18445 \
  --datadir /path/to/node/datadir
```

Implements the full **Data API** and **Construction API**. The server reads
the node's `chaindata/` directory **read-only**, reloads it automatically
when a new block lands on disk (mtime-checked per request), and forwards
`/construction/submit` to the node's `/submitrawtx` endpoint when a node
RPC URL is configured.

```bash
python3 rosetta/validate_rosetta.py
# -> ROSETTA VALIDATION PASS (26/26)
```

Part A exercises every Data API endpoint over HTTP against the bundled
chain. Part B runs the complete construction flow
(derive → preprocess → metadata → payloads → local ECDSA sign → combine →
parse → hash) on a synthetic funded UTXO and finishes with full
`txscript.validate_tx` consensus validation of the signed transaction.

With `rosetta-cli` v0.10.4 (`check:data` against a live server instance):
synced blocks 0–2 with **0 orphaned blocks, 0 validation errors, 2/2
reconciliations successful, 0 failed**. The run was bounded by an external
~120s timeout while the CLI sat in its tip-delay loop
(`context canceled`); a follow-up `--end-block 2` invocation panicked
*inside rosetta-cli itself* (nil dereference in `cmd/root.go`), a CLI bug,
not an implementation bug.

## Honest status

- The chain is currently a **single local node** (localhost-only P2P, no
  independent public peers). GSF has no established value.
- Genesis block shares Bitcoin's genesis block hash as an anchor.
- Sample chain: genesis (empty) + 3 blocks, each with a single 50 GSF
  coinbase to `"anyone"`.
- All coinbases in the sample chain are **immature** (100-block maturity),
  so the construction flow is proven on a synthetic mature P2PK UTXO,
  exactly as `validate_rosetta.py` does — mainnet-style, no shortcuts.
- Block 1's OP_TRUE coinbase becomes anyone-spendable after maturity;
  that is the chain's documented semantics, not a bug in the adapter.
- Historical balances are unsupported (`/account/balance` serves the tip
  only) — declared in `/network/options`, not silently faked.
- v1 consensus quirks (documented, not hidden): PoW compares
  `int.from_bytes(sha256d(header), "big")`; hash display orientation
  differs from Bitcoin convention; the first retarget may be off by one.
- A two-node P2P sync/reorg integration test passes; one transient
  failure was observed under load and did not reproduce on re-run.
- The node's `/submitrawtx` endpoint (which backs
  `/construction/submit`) is acceptance-tested: malformed input → 400,
  consensus-invalid → 409 with the validation reason, a real anyone-spend
  of a matured coinbase → 200 + mempool admission, double-spend → 409.

## What this is not

Implementing Rosetta does **not** imply a Coinbase listing or endorsement.
Coinbase's own words: *"Implementing the Rosetta tools and/or guidance
found on the Rosetta website does not guarantee an asset to be listed on
Coinbase."* The `rosetta/` adapter is an integrator-facing implementation
for the Mesh ecosystem; a Coinbase asset listing is a separate,
owner-filed process (legal, compliance, and technical-security review).

## License

MIT — see `LICENSE`.
