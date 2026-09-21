# Sovereign Genesis — 13-word taproot hard fork ($EXS)

Built off the **Excalibur-EXS repo specs** (PROTOCOL_QUICK_REFERENCE.md,
TETRA_POW_ENHANCEMENT.md, ARCHITECTURE.md). Supersedes the earlier
genesis_fork/GSF-based draft — the sovereign chain is an **$EXS** chain.

## The taproot

The 13-word AXIOM, published in PROTOCOL_QUICK_REFERENCE.md:

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

Every EXS forge hash is already rooted in it
(`initial_state = f"{axiom}:{nonce}"` in
`pkg/mining/tetrapow_dice_universal.py`). The sovereign genesis makes that
root explicit, binds it into every block's proof-of-work, and anchors the
genesis block to a 256-bit seed anyone can recompute.

## The 256-bit anchor seed

```
seed = PBKDF2-HMAC-SHA512(password = axiom (UTF-8),
                           salt     = "EXCALIBUR-SOVEREIGN-GENESIS-v1",
                           iterations = 600_000,
                           dklen    = 32)
```

- The KDF is **HPP-1**, the repo's own quantum-hardening primitive
  (600,000 iterations per spec).
- Canonical seed (recomputable by anyone holding the thirteen words):
  `582946fd65d357fa6d73dbf071fe70f2a2698ec253a6bec584a86ef500bcfa2d`
  (measured: 1.2 s to derive).
- Honest strength statement: 256-bit classical / **128-bit quantum**
  (Grover halves preimage strength) preimage security. The 600k iterations
  raise *classical* brute-force cost; they do not stop Grover. The axiom is
  public by design — the seed is a **commitment**, not a secret.

## Seed-anchored proof-of-work

Block candidate preimage (genesis and every block after):

```
f"{axiom}:{seed_hex}:{nonce}"
```

fed through the **unmodified** Ω′ Δ18 kernel: 128 rounds, sha512/sha256/
blake2b fusion, final SHA-256. Same kernel, same rounds, same
`fused_hash_computation` code path — the seed only domain-separates the
chain. Difficulty per spec: **4 leading zero bytes**.

Consequence: a block is valid on the sovereign chain iff it verifies under
the thirteen words. No checkpoint server, no trusted setup.

## Genesis block (height 0)

```json
{ "height": 0, "prev": "00…00 (32 bytes)", "axiom": "<13 words>",
  "seed_hex": "<64 hex chars>", "difficulty_zero_bytes": 4,
  "nonce": "<ground>", "final_hash": "<ground>",
  "timestamp": "<ground>", "supply_note": "no premine" }
```

The genesis forge pays no one — supply begins with mined forges.

## Verification (anyone, from the thirteen words alone)

```
python3 pkg/genesis/sovereign_genesis.py --verify \
    --descriptor sovereign_genesis_exs.json
```

Checks: 13 words exactly · axiom equals the published taproot ·
seed == HPP-1(axiom) · final_hash recomputes from axiom+seed+nonce ·
difficulty met · prev is 32 zero bytes · height 0.

## Implementation

- `pkg/genesis/sovereign_genesis.py` — derive / grind / verify.
  `--selftest` proves the full pipeline at difficulty 2 (measured:
  seed 1.2 s, genesis nonce 12992 in ~13 s at ~1 kH/s single-lane).
- Single-lane Ω′ Δ18 measures ~1–2.6 kH/s on this box (the "10k H/s" in
  TETRA_POW_ENHANCEMENT.md did not reproduce here — filed as a
  measurement, not a claim). Difficulty 4 ⇒ ~2³² expected hashes ⇒
  multi-lane background grind; ETA sized at launch.

## Falsifiers

- Descriptor seed ≠ HPP-1(axiom, 600k) → genesis void.
- final_hash doesn't recompute through the unmodified kernel → void.
- Any block valid without the thirteen words → the anchor claim is void.
- Premine in the genesis forge → the no-premine claim is void.

## Tokenomics (on-chain policy)

Numbers below are the site-published policy (website/index.html).
`pkg/economy/sovereign_tokenomics.py` is the executable spec — integer
math in base units (1 EXS = 100,000,000 base units, satoshis-style);
this section is the plain-language record of the same rules.

- **Max supply:** 21,000,000 EXS (nominal; integer halvings truncate, so
  realized supply lands marginally below the cap — the schedule can never
  exceed it).
- **Forge reward:** 50 EXS at genesis, halving every 210,000 forges.
  The reward decays to exactly 0 at extreme heights — never negative.
- **Treasury tithe:** 1% of every forge reward is carved off first and
  routed to the treasury. Per 50-EXS forge: 0.5 EXS tithe, 49.5 EXS
  remainder — "50 $EXS per forge — 49.5 to you, 0.5 to the treasury."
- **Allocation of the post-tithe remainder:** 60% PoF miners (the forge
  winner), 20% liquidity, 15% treasury, 5% airdrop. Per 50-EXS forge that
  is 29.7 / 9.9 / 7.425 / 2.475 EXS, plus the 0.5 EXS tithe to the
  treasury (7.925 EXS treasury total). The split is asserted to sum
  exactly to the reward — any integer-division dust goes to the miner.
- **Forge fee:** 0.0001 BTC, settled on Bitcoin. Recorded as a constant;
  Bitcoin-side settlement is out of scope for the chain module.
- **Treasury release:** 12-month rolling release — treasury funds unlock
  linearly over the trailing 12 months of blocks from each deposit's
  height (default cadence assumption: 4,320 forges/month ≈ 10-minute
  forges; pass the real cadence when known).
- **No premine:** the genesis forge pays no one — supply begins with
  mined forges. Shares are fixed at genesis; none minted for founders.
  This is a consensus rule the chain enforces (genesis coinbase must be
  empty); the module exposes it as the `genesis_coinbase_is_valid` check
  for callers. Premine in the genesis forge → the no-premine claim is
  void.
- **Addresses are parameters, never hardcoded.** The module invents no
  treasury, liquidity, airdrop, or miner address; a `None` payee raises
  rather than forging a coinbase with an unassigned recipient.

## Post-genesis blocks (height ≥ 1)

Block id / PoW: the same unmodified Ω′ Δ18 kernel over the
domain-separated preimage

```
f"{axiom}:{seed_hex}:{height}:{prev_hex}:{txroot_hex}:{timestamp}:{nonce}"
```

(`prev_hex`/`txroot_hex` lowercase hex of the internal-order bytes,
integers as decimal strings; validity = `difficulty` leading zero
bytes, 4 on mainnet). `txroot = sha256d(concat(sha256d(tx)))`.

**Height 0 is special.** The genesis block's id is the ground
descriptor's `final_hash` — the kernel over `f"{axiom}:{seed_hex}:{nonce}"`
with no height/prev/txroot/timestamp fields, exactly as
`sovereign_genesis.py` grinds and `--verify` checks. The P2P layer
adopts the descriptor as block 0 verbatim (oracle-verified, final_hash
cross-checked); height-0 blocks must carry zero transactions.

## P2P network (`pkg/net/sovereign_p2p.py`)

Pure-Python, stdlib-only. Bitcoin-style framing; version/verack,
ping/pong, header-first sync (headers carry txroot so PoW validates at
header stage), inv/getdata, block+tx relay, mempool. Validation before
acceptance; append-only branch store; heaviest-valid-chain reorg.
Localhost-only bind by default; mainnet port **29444**
(testnet 39444); magic `0x4558536b` ("EXSk") mainnet, `0x45585374`
("EXSt") testnet. Coinbase consensus: the output *amount multiset* must
equal the `coinbase_split` schedule for that height — economics enforced
on-chain, address→role mapping is not consensus. 10/10 tests pass.

## Post-genesis miner (`pkg/mining/sovereign_miner.py`)

Adopts the verified descriptor, forges height ≥ 1 blocks with exact
`coinbase_split` coinbases, grinds the C port (Annunaki SHA-NI) after a
startup oracle cross-check (refuses to mine on mismatch), validates each
forge through `submit_block`, announces via P2P `inv`. All four payee
addresses are required CLI parameters — the miner never invents one.
Tested: 2 forged blocks verify end-to-end (PoW, linkage, split).
