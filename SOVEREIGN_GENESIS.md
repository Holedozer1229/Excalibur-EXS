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
