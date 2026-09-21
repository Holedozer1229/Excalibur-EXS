#!/usr/bin/env python3
"""
genesis_fork.py — a Bitcoin hard fork AT Satoshi's genesis block.

The new chain shares exactly one block with Bitcoin: the genesis block
(000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f),
verified here from first principles (recomputed from the 80-byte header).
Block 1 onward follows fork consensus -> the chains diverge at genesis.

Fork consensus ("Genesis Fork", ticker GSF):
  - PoW: SHA-256d, 600s target, 2016-block retarget (same algorithm as BTC)
  - Initial difficulty: 0x1f001000 (target 2^236) — a launch parameter,
    documented in FORK_SPEC.md; Bitcoin's 0x1d00ffff would be unmineable
    for a new chain, which is WHY this is a consensus change.
  - Subsidy: fresh 50 GSF, halving every 210,000 blocks (a second 21M)
  - Max block size: 1,000,000 bytes (no witness in v1)
  - Coinbase lineage rule: the coinbase scriptSig's FIRST data push must be
    the block's nBits serialized little-endian — the exact construction
    Satoshi used in blocks 0-32255 (the Flo marker: LE(nBits), e.g.
    ffff001d for 0x1d00ffff). Consensus-enforced lineage to genesis.
  - Network: new magic bytes, ports, bech32 HRP (see FORK_SPEC.md)

Testnet ("tGSF"): same genesis, separate identity (magic 0x47534674,
ports 28444/28445, HRP "tgsf"), easier initial difficulty (target 2^240),
and Bitcoin's testnet min-difficulty rule (2*spacing with no block ->
min difficulty allowed for one block).

Pure Python. No dependencies. Demo: verifies genesis, mines 6 fork
blocks with real PoW, validates the chain, and proves divergence from
Bitcoin (Bitcoin's real block-1 bits are rejected under fork rules).

Honest scope: this is a consensus spec + reference implementation.
A production fork ports these chainparams into Bitcoin Core; the chain
built here is real (valid PoW, valid linkage) but lives in this demo.
"""
import hashlib
import json
import struct
import time

# ---------------------------------------------------------------- primitives
def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


def bits_to_target(bits: int) -> int:
    exp = bits >> 24
    mant = bits & 0xFFFFFF
    if exp <= 3:
        return mant >> (8 * (3 - exp))
    return mant << (8 * (exp - 3))


def target_to_bits(target: int) -> int:
    # Bitcoin Core GetCompact
    nsize = (target.bit_length() + 7) // 8
    if nsize <= 3:
        ncompact = target << (8 * (3 - nsize))
    else:
        ncompact = target >> (8 * (nsize - 3))
    if ncompact & 0x00800000:
        ncompact >>= 8
        nsize += 1
    return (nsize << 24) | (ncompact & 0xFFFFFF)


def ser_header(v, prev, merkle, t, bits, nonce) -> bytes:
    return (struct.pack("<I", v) + prev + merkle +
            struct.pack("<III", t, bits, nonce))


def header_hash(header: bytes) -> bytes:
    return sha256d(header)[::-1]  # display order


def fmt(h: bytes) -> str:
    return h.hex()


# ---------------------------------------------------------------- chainparams
# Two networks share Satoshi's genesis; everything else diverges.
def _mkparams(name, ticker, magic, p2p, rpc, hrp, init_target, min_diff_rule):
    init_bits = target_to_bits(init_target)
    assert bits_to_target(init_bits) == init_target, "bits round-trip failed"
    return {
        "name": name, "ticker": ticker, "magic": magic,
        "p2p_port": p2p, "rpc_port": rpc, "hrp": hrp,
        "p2pkh": 0x32, "p2sh": 0x55,
        "spacing": 600, "retarget": 2016, "max_block": 1_000_000,
        "subsidy": 50 * 100_000_000, "halving": 210_000,
        "init_bits": init_bits, "init_target": init_target,
        # testnet rule (à la Bitcoin): if 2*spacing passes with no block,
        # min difficulty is allowed for one block
        "min_diff_rule": min_diff_rule,
    }


PARAMS = {
    "mainnet": _mkparams("Genesis Fork", "GSF", 0x4753466B,
                         18444, 18445, "gsf", 2 ** 236, False),
    "testnet": _mkparams("Genesis Fork Testnet", "tGSF", 0x47534674,
                         28444, 28445, "tgsf", 2 ** 240, True),
}
_P = PARAMS["mainnet"]


def use_network(name: str):
    global _P
    _P = PARAMS[name]
    return _P

# ---------------------------------------------------------------- Satoshi's genesis (verified below, not trusted)
GENESIS = {
    "version": 1,
    "prev": bytes(32),
    # coinbase txid 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b
    "merkle": bytes.fromhex(
        "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b")[::-1],
    "time": 1231006505,
    "bits": 0x1d00ffff,
    "nonce": 2083236893,
    "hash_display": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
}


def verify_genesis() -> bytes:
    """Recompute Satoshi's genesis hash from the 80-byte header. Loud."""
    g = GENESIS
    hdr = ser_header(g["version"], g["prev"], g["merkle"],
                     g["time"], g["bits"], g["nonce"])
    assert len(hdr) == 80
    h = header_hash(hdr)
    assert fmt(h) == g["hash_display"], \
        f"GENESIS MISMATCH: {fmt(h)} != {g['hash_display']}"
    # and the difficulty the header claims must match its hash
    assert int.from_bytes(h, "big") <= bits_to_target(g["bits"]), \
        "genesis hash does not meet its own bits"
    return h


# ---------------------------------------------------------------- transactions (minimal)
def ser_varint(n: int) -> bytes:
    if n < 0xfd:
        return struct.pack("B", n)
    if n <= 0xffff:
        return b"\xfd" + struct.pack("<H", n)
    if n <= 0xffffffff:
        return b"\xfe" + struct.pack("<I", n)
    return b"\xff" + struct.pack("<Q", n)


def push(data: bytes) -> bytes:
    assert len(data) <= 75
    return struct.pack("B", len(data)) + data


def make_coinbase(height: int, bits: int, tag: bytes = b"GSF/genesis-fork") -> bytes:
    """Coinbase whose scriptSig's FIRST push is LE(nBits) — Satoshi's own
    construction (Flo marker). Consensus rule: first push == LE(bits)."""
    scriptsig = push(struct.pack("<I", bits)) + push(tag)
    tx = struct.pack("<I", 1)                      # version
    tx += b"\x01"                                  # 1 input
    tx += bytes(32) + struct.pack("<I", 0xffffffff)  # prev out (null)
    tx += ser_varint(len(scriptsig)) + scriptsig
    tx += struct.pack("<I", 0xffffffff)            # sequence
    tx += b"\x01"                                  # 1 output
    tx += struct.pack("<Q", subsidy(height))       # value
    tx += ser_varint(1) + b"\x51"                  # OP_TRUE (demo: anyone-can-spend)
    tx += struct.pack("<I", 0)                     # locktime
    return tx


def txid(tx: bytes) -> bytes:
    return sha256d(tx)[::-1]  # display order


def merkle_root(txids):
    if not txids:
        return bytes(32)
    level = list(txids)
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [sha256d(level[i] + level[i + 1])[::-1]
                 for i in range(0, len(level), 2)]
    return level[0]


# ---------------------------------------------------------------- consensus
def subsidy(height: int) -> int:
    return _P["subsidy"] >> (height // _P["halving"])


def required_bits(height: int, chain, new_time=None) -> int:
    """chain: list of block dicts, chain[0] = genesis header-only."""
    P = _P
    # testnet min-difficulty rule: 2*spacing with no block -> min diff allowed
    if P["min_diff_rule"] and height >= 1 and new_time is not None:
        if new_time > chain[height - 1]["time"] + 2 * P["spacing"]:
            return P["init_bits"]
    if height <= P["retarget"]:
        return P["init_bits"]
    first = chain[height - P["retarget"]]
    last = chain[height - 1]
    span = last["time"] - first["time"]
    lo = P["spacing"] * P["retarget"] // 4
    hi = P["spacing"] * P["retarget"] * 4
    span = max(lo, min(hi, span))
    # anchor: walk back past testnet min-difficulty blocks (Bitcoin rule)
    anchor, i = last, height - 1
    while (P["min_diff_rule"] and i > height - P["retarget"]
           and anchor["bits"] == P["init_bits"]):
        i -= 1
        anchor = chain[i]
    prev_target = bits_to_target(anchor["bits"])
    return target_to_bits(prev_target * span // (P["spacing"] * P["retarget"]))


def check_coinbase_lineage(tx: bytes, bits: int) -> bool:
    """First push of coinbase scriptSig must be LE(bits)."""
    # parse: version(4) + in-count(1) + prev(36) + script len(varint) + script
    p = 4 + 1 + 36
    slen, p = tx[p], p + 1
    script = tx[p:p + slen]
    if len(script) < 5 or script[0] != 4:
        return False
    return script[1:5] == struct.pack("<I", bits)


def validate_block(blk: dict, prev: dict, height: int, chain,
                   utxo=None) -> list:
    """Return list of violations (empty = valid).

    When utxo (a txscript UTXO dict) is provided and the block carries
    non-coinbase txs, every tx is fully validated (scripts, double-spends,
    maturity, fees) and the coinbase must equal subsidy + fees. Without
    utxo, only the coinbase-only v1 checks run.
    """
    bad = []
    if blk["prev"] != prev["hash"]:
        bad.append("prev mismatch")
    if blk["time"] <= prev["time"]:
        bad.append("time not increasing")
    if blk["time"] > int(time.time()) + 7200:
        bad.append("time too far in future")
    want_bits = required_bits(height, chain, blk["time"])
    if blk["bits"] != want_bits:
        bad.append(f"bits {blk['bits']:#x} != required {want_bits:#x}")
    target = bits_to_target(blk["bits"])
    hdr = ser_header(blk["version"], blk["prev"], blk["merkle"],
                     blk["time"], blk["bits"], blk["nonce"])
    hh = sha256d(hdr)
    if int.from_bytes(hh, "big") > target:
        bad.append("insufficient PoW")
    txs = blk["txs"]
    if not txs:
        bad.append("empty block")
    if sum(len(t) for t in txs) > _P["max_block"]:
        bad.append("oversize")
    if merkle_root([txid(t) for t in txs]) != blk["merkle"]:
        bad.append("merkle mismatch")
    cb = txs[0]
    if not check_coinbase_lineage(cb, blk["bits"]):
        bad.append("coinbase lineage rule violated (first push != LE(bits))")
    if utxo is not None and len(txs) > 1:
        from txscript import validate_block_txs  # lazy: avoids import cycle
        ok, reason, _fees = validate_block_txs(txs, utxo, height,
                                               subsidy(height))
        if not ok:
            bad.append(f"tx invalid: {reason}")
    elif coinbase_value(cb) != subsidy(height):
        bad.append("coinbase value != subsidy")
    return bad


def coinbase_value(cb: bytes) -> int:
    p = 4 + 1 + 36
    slen = cb[p]
    p += 1 + slen + 4 + 1
    return struct.unpack("<Q", cb[p:p + 8])[0]


# ---------------------------------------------------------------- miner
def mine_block(prev: dict, height: int, chain, tag: bytes = None,
               time_gap: int = None):
    if tag is None:
        tag = b"GSF/genesis-fork"
    t = prev["time"] + (time_gap if time_gap is not None else _P["spacing"])
    bits = required_bits(height, chain, t)
    cb = make_coinbase(height, bits, tag)
    assert coinbase_value(cb) == subsidy(height), "coinbase value wrong"
    assert check_coinbase_lineage(cb, bits), "lineage self-check failed"
    txs = [cb]
    mr = merkle_root([txid(cb)])
    target = bits_to_target(bits)
    ver = 1
    pre = struct.pack("<I", ver) + prev["hash"] + mr + struct.pack("<III", t, bits, 0)
    assert len(pre) == 80
    nonce = 0
    while True:
        hdr = pre[:76] + struct.pack("<I", nonce)
        if int.from_bytes(sha256d(hdr), "big") <= target:
            return {"version": ver, "prev": prev["hash"], "merkle": mr,
                    "time": t, "bits": bits, "nonce": nonce,
                    "hash": sha256d(hdr)[::-1], "txs": txs}
        nonce += 1
        if nonce == 0x100000000:
            raise RuntimeError("nonce space exhausted (demo difficulty bug?)")


# ---------------------------------------------------------------- demo
def demo_network(net: str, n_blocks: int):
    use_network(net)
    P = _P
    print(f"=== {P['name']} ({P['ticker']}) "
          f"[magic={P['magic']:#x} p2p={P['p2p_port']} hrp={P['hrp']}] ===\n")

    gh = verify_genesis()
    print(f"[1] genesis verified: {fmt(gh)}")
    genesis_blk = {"version": GENESIS["version"], "prev": GENESIS["prev"],
                   "merkle": GENESIS["merkle"], "time": GENESIS["time"],
                   "bits": GENESIS["bits"], "nonce": GENESIS["nonce"],
                   "hash": gh, "txs": []}

    chain = [genesis_blk]
    t0 = time.time()
    for h in range(1, n_blocks + 1):
        blk = mine_block(chain[-1], h, chain)
        chain.append(blk)
        print(f"[2] block {h}: {fmt(blk['hash'])} "
              f"(nonce={blk['nonce']}, {subsidy(h)/1e8:.0f} {P['ticker']})")
    print(f"    mined {n_blocks} blocks in {time.time()-t0:.1f}s")

    for h in range(1, n_blocks + 1):
        bad = validate_block(chain[h], chain[h - 1], h, chain)
        assert not bad, f"block {h} invalid: {bad}"
    print(f"[3] chain valid: {n_blocks} blocks on Satoshi's genesis")

    for h in range(1, n_blocks + 1):
        assert check_coinbase_lineage(chain[h]["txs"][0], chain[h]["bits"])
    print(f"[4] coinbase lineage rule holds on all {n_blocks} blocks")
    return chain


def main():
    chains = {}
    # ---- mainnet: the fork ------------------------------------------------
    chains["mainnet"] = demo_network("mainnet", 6)

    # divergence: Bitcoin's real block 1 rejected under fork consensus
    use_network("mainnet")
    btc_block1_bits = 0x1d00ffff
    want = required_bits(1, chains["mainnet"])
    print(f"\n[D] Bitcoin block 1 bits {btc_block1_bits:#x} vs "
          f"fork-required {want:#x} -> "
          f"{'REJECTED' if btc_block1_bits != want else 'accepted?!'}")
    assert btc_block1_bits != want

    # ---- testnet ----------------------------------------------------------
    print()
    tchain = demo_network("testnet", 4)
    chains["testnet"] = tchain
    P = _P

    # testnet min-difficulty rule: 25 min with no block -> min diff allowed
    gap = 2 * P["spacing"] + 300
    blk = mine_block(tchain[-1], 5, tchain, time_gap=gap,
                     tag=b"GSF/testnet-min-diff")
    assert blk["bits"] == P["init_bits"], "min-diff rule did not trigger"
    bad = validate_block(blk, tchain[-1], 5, tchain)
    assert not bad, f"min-diff block invalid: {bad}"
    tchain.append(blk)
    print(f"[5] testnet min-difficulty rule: {gap}s gap -> "
          f"bits {blk['bits']:#x} accepted")

    # cross-network rejection: mainnet block 1 is invalid on testnet
    use_network("testnet")
    m1 = chains["mainnet"][1]
    bad = validate_block(m1, tchain[0], 1, tchain)
    print(f"[6] mainnet block 1 on testnet -> "
          f"{'REJECTED: ' + '; '.join(bad) if bad else 'accepted?!'}")
    assert bad

    # same check the other way
    use_network("mainnet")
    bad = validate_block(tchain[1], chains["mainnet"][0], 1,
                         chains["mainnet"])
    print(f"[7] testnet block 1 on mainnet -> "
          f"{'REJECTED: ' + '; '.join(bad) if bad else 'accepted?!'}")
    assert bad

    out = {}
    for net, ch in chains.items():
        out[net] = [{"height": h, "hash": fmt(b["hash"]),
                     "bits": hex(b["bits"]), "nonce": b["nonce"]}
                    for h, b in enumerate(ch)]
    with open("genesis_fork_chain.json", "w") as f:
        json.dump(out, f, indent=2)
    print("\nchain summaries -> genesis_fork_chain.json")
    print("DONE")


if __name__ == "__main__":
    main()
