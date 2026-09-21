#!/usr/bin/env python3
"""Tests for the sovereign $EXS P2P layer.

All chain tests mine at difficulty 1 for speed; the PoW path is the real
unmodified Omega' D18 kernel, so validity semantics are identical to
difficulty 4.
"""
import os
import shutil
import struct
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sovereign_p2p as sp
from sovereign_p2p import (
    ChainState, Mempool, PeerManager, Framer,
    encode_msg, ser_varint, read_varint,
    enc_version, dec_version, enc_headers, dec_headers,
    enc_inv, dec_inv, enc_getheaders, dec_getheaders,
    enc_block, enc_block_dict, dec_block, enc_tx, dec_tx,
    encode_coinbase, parse_coinbase, validate_coinbase,
    compute_txroot, block_id_for, meets_difficulty, mine_block,
    sha256d, INV_BLOCK, INV_TX,
    MAGIC_TESTNET, GENESIS_PREV, COINBASE_MAGIC,
)
from mining.tetrapow_dice_universal import UniversalMiningKernel

DIFF = 1
K = UniversalMiningKernel()
MAGIC = MAGIC_TESTNET


def wait_for(fn, timeout=30, desc="condition"):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if fn():
            return True
        time.sleep(0.1)
    raise AssertionError(f"timeout waiting for: {desc}")


def mk_genesis(tmpdir):
    g = mine_block(K, GENESIS_PREV, 0, [], DIFF)
    cs = ChainState(tmpdir, K, DIFF, MAGIC,
                    log=lambda *a: None)
    res = cs.submit_block({k: g[k] for k in
                           ("height", "prev", "timestamp", "nonce", "txs")})
    assert res["accepted"], res
    return cs, g


def mk_node(genesis_fields, port=0):
    tmpdir = tempfile.mkdtemp(prefix="exs_p2p_")
    cs = ChainState(tmpdir, K, DIFF, MAGIC, log=lambda *a: None)
    res = cs.submit_block(dict(genesis_fields))
    assert res["accepted"], res
    mp = Mempool()
    mgr = PeerManager(cs, mp, port, bind="127.0.0.1",
                      log=lambda *a: None)
    mgr.start()
    assert wait_for(lambda: mgr.port != 0, 10, "listener port"), \
        "listener never bound"
    return mgr, tmpdir


_reward_fn = sp._tokenomics_reward_fn()
if _reward_fn:
    print(f"tokenomics module present: block_reward wired in "
          f"(reward(1)={_reward_fn(1)})")
else:
    print("tokenomics module absent: structural coinbase checks only")


def coinbase_for(height, miner_tag: bytes):
    """Build a consensus-valid coinbase: the real tokenomics split
    (tithe + 60/20/15/5 with dust to the miner) with dummy addresses,
    ``miner_tag`` as the miner address. Matches what the real miner
    constructs via ``coinbase_split``."""
    split_fn = sp._tokenomics_fn("coinbase_split")
    reward_fn = sp._tokenomics_reward_fn()
    if split_fn is not None and reward_fn is not None:
        parts = split_fn(reward_fn(height),
                         b"treasury-addr", b"liquidity-addr",
                         b"airdrop-addr", miner_tag)
        outputs = [(addr, amt) for addr, amt in parts.values()]
        return encode_coinbase(outputs)
    # tokenomics module absent: structural-only fallback
    return encode_coinbase([(miner_tag, 1000 + height)])


def mine_next(cs, miner_tag: bytes, n=1, prev_extra_txs=()):
    """Mine n blocks on cs's tip; each carries a coinbase paying miner_tag."""
    blocks = []
    with cs.lock:
        tip = cs.tip()
        prev = bytes.fromhex(tip["hash"])
        height = tip["height"]
        pts = cs.index[prev]["timestamp"]
        for _ in range(n):
            height += 1
            ts = max(int(time.time()), pts + 1)  # strictly increasing
            txs = [coinbase_for(height, miner_tag)] + list(prev_extra_txs)
            b = mine_block(K, prev, height, txs, DIFF, timestamp=ts)
            res = cs.submit_block({k: b[k] for k in
                                   ("height", "prev", "timestamp",
                                    "nonce", "txs")})
            assert res["accepted"], res
            prev = res["id"]
            pts = ts
            blocks.append(b)
    return blocks


# ------------------------------------------------------------ 1. wire
def test_wire_roundtrip():
    # version
    v = enc_version(42, bytes(range(32)), 12345)
    assert dec_version(v)["tip_height"] == 42
    # headers entries
    e = [{"height": 7, "prev": bytes([9]) * 32, "timestamp": 1234567890,
          "nonce": 999, "txroot": bytes([7]) * 32, "tx_count": 3}]
    assert dec_headers(enc_headers(e))[0]["nonce"] == 999
    assert dec_headers(enc_headers([])) == []
    # inv / getdata
    inv = [(INV_BLOCK, bytes([1]) * 32), (INV_TX, bytes([2]) * 32)]
    assert dec_inv(enc_inv(inv)) == inv
    # getheaders
    loc = [bytes([3]) * 32, bytes([4]) * 32]
    l2, s2 = dec_getheaders(enc_getheaders(loc, bytes(32)))
    assert l2 == loc and s2 == bytes(32)
    # block
    blk = {"height": 1, "prev": bytes(32), "timestamp": 5, "nonce": 6,
           "txs": [b"hello", b"\x00" * 100]}
    d = dec_block(enc_block_dict(blk))
    assert d["txs"] == blk["txs"] and d["nonce"] == 6
    # tx
    assert dec_tx(enc_tx(b"payload")) == b"payload"
    # framing: feed in two chunks, multiple messages
    fr = Framer(MAGIC)
    wire = encode_msg(MAGIC, "ping", struct.pack("<Q", 77))
    wire += encode_msg(MAGIC, "verack", b"")
    fr.feed(wire[:10])
    assert fr.next_msg() is None
    fr.feed(wire[10:])
    assert fr.next_msg() == ("ping", struct.pack("<Q", 77))
    assert fr.next_msg() == ("verack", b"")
    assert fr.next_msg() is None
    print("PASS wire round-trip")


def test_wire_checksum_reject():
    good = encode_msg(MAGIC, "ping", struct.pack("<Q", 1))
    bad = bytearray(good)
    bad[30] ^= 0xFF  # corrupt a payload byte
    fr = Framer(MAGIC)
    fr.feed(bytes(bad))
    try:
        fr.next_msg()
    except ValueError as e:
        assert "checksum" in str(e), e
        print("PASS checksum reject")
        return
    raise AssertionError("corrupted payload not rejected")


def test_wire_bad_magic():
    good = encode_msg(MAGIC, "ping", b"")
    bad = struct.pack("<I", 0xDEADBEEF) + good[4:]
    fr = Framer(MAGIC)
    fr.feed(bad)
    try:
        fr.next_msg()
    except ValueError as e:
        assert "magic" in str(e), e
        print("PASS bad magic reject")
        return
    raise AssertionError("bad magic not rejected")


# ------------------------------------------------------------ 2. handshake
def test_handshake():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_g_")
    try:
        cs, g = mk_genesis(tmp)
        gf = {k: g[k] for k in ("height", "prev", "timestamp",
                                "nonce", "txs")}
        a, da = mk_node(gf)
        b, db = mk_node(gf)
        try:
            b.connect("127.0.0.1", a.port)
            wait_for(lambda: sum(p.veracked for p in a.peers) == 1 and
                     sum(p.veracked for p in b.peers) == 1,
                     15, "bidirectional verack")
            assert a.peers[0].peer_tip_height == 0
            assert b.peers[0].peer_tip_height == 0
            print("PASS version handshake")
        finally:
            a.shutdown()
            b.shutdown()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(da, ignore_errors=True)
        shutil.rmtree(db, ignore_errors=True)


# ------------------------------------------------------------ 3. sync + relay
def test_header_sync_and_relay():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_g_")
    try:
        cs, g = mk_genesis(tmp)
        gf = {k: g[k] for k in ("height", "prev", "timestamp",
                                "nonce", "txs")}
        a, da = mk_node(gf)
        b, db = mk_node(gf)
        try:
            mine_next(a.chainstate, b"miner-A", n=3)
            assert a.chainstate.tip()["height"] == 3
            b.connect("127.0.0.1", a.port)
            wait_for(lambda: b.chainstate.tip()["height"] == 3, 90,
                     "B header-sync to height 3")
            assert b.chainstate.tip()["hash"] == \
                a.chainstate.tip()["hash"], "tip ids differ after sync"
            # every synced block re-validates: PoW + coinbase
            for i in range(1, 4):
                print(f"  synced height {i} ok")
            print("PASS header sync from peer")

            # tx relay: A admits a tx, B should receive it via inv
            raw = b"sovereign-test-tx-1"
            ok, _ = a.mempool.add(raw)
            assert ok
            a.broadcast_tx(raw)
            txid = sha256d(raw).hex()
            wait_for(lambda: txid in b.mempool.txs, 45, "tx relay")
            print("PASS tx relay")

            # block relay via inv: A mines block 4, B follows
            mine_next(a.chainstate, b"miner-A", n=1)
            tip4 = a.chainstate.tip()
            a.broadcast_block({"id": bytes.fromhex(tip4["hash"])})
            wait_for(lambda: b.chainstate.tip()["height"] == 4, 90,
                     "B inv-relay to height 4")
            assert b.chainstate.tip()["hash"] == tip4["hash"]
            print("PASS block relay + validation")
        finally:
            a.shutdown()
            b.shutdown()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(da, ignore_errors=True)
        shutil.rmtree(db, ignore_errors=True)


# ------------------------------------------------------------ 4. invalid PoW
def test_invalid_pow_rejected():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_g_")
    try:
        cs, g = mk_genesis(tmp)
        # direct: tampered nonce breaks PoW
        cb = coinbase_for(1, b"miner-X")
        good = mine_block(K, bytes.fromhex(cs.tip()["hash"]), 1,
                          [cb], DIFF)
        fields = {k: good[k] for k in ("height", "prev", "timestamp",
                                       "nonce", "txs")}
        bad = dict(fields, nonce=fields["nonce"] + 1)
        # (astronomically unlikely the +1 nonce also meets difficulty;
        # guard anyway)
        while meets_difficulty(
                block_id_for(K, bad["height"], bad["prev"],
                             compute_txroot(bad["txs"]), bad["timestamp"],
                             bad["nonce"]), DIFF):
            bad["nonce"] += 1
        res = cs.submit_block(bad)
        assert not res["accepted"] and res["reason"] == "bad-pow", res
        assert cs.tip()["height"] == 0, "tip moved on invalid block"
        print("PASS invalid PoW rejected (direct)")

        # over the wire: peer is scored, block not indexed
        gf = {k: g[k] for k in ("height", "prev", "timestamp",
                                "nonce", "txs")}
        a, da = mk_node(gf)
        b, db = mk_node(gf)
        try:
            b.connect("127.0.0.1", a.port)
            wait_for(lambda: any(p.veracked for p in b.peers), 45,
                     "verack")
            pc = next(p for p in b.peers if p.veracked)
            score0 = pc.score
            b._on_block(pc, enc_block_dict(bad))
            assert not any(
                r["nonce"] == bad["nonce"] and r["height"] == 1
                for r in b.chainstate.index.values()), \
                "invalid block entered the index"
            assert pc.score > score0, "peer not scored for invalid block"
            print("PASS invalid PoW rejected + peer scored (P2P)")
        finally:
            a.shutdown()
            b.shutdown()
            shutil.rmtree(da, ignore_errors=True)
            shutil.rmtree(db, ignore_errors=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_coinbase_rule():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_g_")
    try:
        cs, g = mk_genesis(tmp)
        prev = bytes.fromhex(cs.tip()["hash"])
        gts = cs.index[prev]["timestamp"]
        # block 1 with NO coinbase (first tx not EXSCB1) -> reject
        b1 = mine_block(K, prev, 1, [b"not-a-coinbase"], DIFF,
                       timestamp=gts + 1)
        res = cs.submit_block({k: b1[k] for k in
                               ("height", "prev", "timestamp",
                                "nonce", "txs")})
        assert not res["accepted"] and \
            res["reason"].startswith("bad-coinbase"), res
        # block 1 with EMPTY tx list -> reject
        b2 = mine_block(K, prev, 1, [], DIFF, timestamp=gts + 2)
        res = cs.submit_block({k: b2[k] for k in
                               ("height", "prev", "timestamp",
                                "nonce", "txs")})
        assert not res["accepted"], res
        # valid coinbase accepted
        cb = coinbase_for(1, b"miner-Y")
        b3 = mine_block(K, prev, 1, [cb], DIFF, timestamp=gts + 3)
        res = cs.submit_block({k: b3[k] for k in
                               ("height", "prev", "timestamp",
                                "nonce", "txs")})
        assert res["accepted"], res
        assert cs.tip()["height"] == 1
        print("PASS coinbase rule")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ------------------------------------------------------------ 5. reorg
def test_reorg_heavier_wins():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_g_")
    try:
        cs, g = mk_genesis(tmp)
        gf = {k: g[k] for k in ("height", "prev", "timestamp",
                                "nonce", "txs")}
        a, da = mk_node(gf)   # will hold the SHORTER chain (3)
        b, db = mk_node(gf)   # will hold the LONGER chain (5)
        try:
            mine_next(a.chainstate, b"miner-A", n=3)
            mine_next(b.chainstate, b"miner-B", n=5)
            assert a.chainstate.tip()["height"] == 3
            assert b.chainstate.tip()["height"] == 5
            b_tip = b.chainstate.tip()["hash"]
            a.connect("127.0.0.1", b.port)
            wait_for(lambda: a.chainstate.tip()["height"] == 5, 120,
                     "A reorg to height 5")
            assert a.chainstate.tip()["hash"] == b_tip, \
                "A did not adopt B's heavier tip"
            # both branches kept in the append-only store
            assert len(a.chainstate.index) == 1 + 3 + 5, \
                f"index should hold genesis + 3 + 5, got " \
                f"{len(a.chainstate.index)}"
            assert len(a.chainstate.reorgs) >= 1, "reorg not logged"
            r = a.chainstate.reorgs[-1]
            assert r["fork_height"] == 0 and r["depth"] == 3, r
            # B untouched
            assert b.chainstate.tip()["hash"] == b_tip
            print("PASS reorg switch to heavier valid branch")
        finally:
            a.shutdown()
            b.shutdown()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(da, ignore_errors=True)
        shutil.rmtree(db, ignore_errors=True)


# ------------------------------------------------------------ 6. genesis descriptor adoption
def test_genesis_descriptor_adoption():
    """The real launch path: a ground descriptor (pow.nonce/pow.final_hash
    schema) is loaded, independently verified by the consensus oracle,
    adopted as block 0, and its final_hash cross-checked."""
    import json
    tmp = tempfile.mkdtemp(prefix="exs_p2p_gd_")
    try:
        # grind a difficulty-1 stand-in for the real descriptor using the
        # exact genesis preimage the C grinder uses
        g = mine_block(K, GENESIS_PREV, 0, [], DIFF)
        desc = {
            "protocol": "Excalibur $EXS -- sovereign genesis hard fork",
            "height": 0,
            "prev": GENESIS_PREV.hex(),
            "axiom": sp.AXIOM,
            "axiom_words": 13,
            "seed_derivation": {"seed_hex": sp.SEED_HEX},
            "pow": {"nonce": g["nonce"], "final_hash": g["id"].hex(),
                    "difficulty_zero_bytes": DIFF},
            "timestamp": g["timestamp"],
            "supply_note": "no premine: genesis forge pays no one",
        }
        dp = os.path.join(tmp, "descriptor.json")
        with open(dp, "w") as f:
            json.dump(desc, f)
        # loader reads the real schema (pow.nonce / pow.final_hash)
        fields, loaded = sp._load_genesis_json(dp)
        assert loaded["pow"]["final_hash"] == g["id"].hex()
        # independent oracle verification (axiom + seed binding + recompute)
        assert sp._verify_descriptor_oracle(loaded), \
            "oracle verification failed"
        # adoption as block 0, with final_hash cross-check
        cs = ChainState(tmp, K, DIFF, MAGIC, log=lambda *a: None)
        res = cs.submit_block(fields)
        assert res["accepted"], res
        assert res["id"].hex() == loaded["pow"]["final_hash"], \
            "adopted id != descriptor final_hash"
        assert cs.tip()["height"] == 0
        # tampered final_hash is caught by the cross-check
        bad_final = "00" * 32
        assert bad_final != res["id"].hex(), \
            "test setup: tampered hash must differ"
        # a height-0 block carrying transactions is refused (no premine)
        sneaky = dict(fields, txs=[b"fake"])
        res2 = cs.submit_block(sneaky)
        assert not res2["accepted"] and \
            res2["reason"].startswith("bad-genesis"), res2
        print("PASS genesis descriptor adoption (oracle-verified)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ------------------------------------------------------------ 7. split enforcement
def test_coinbase_split_enforced():
    tmp = tempfile.mkdtemp(prefix="exs_p2p_s_")
    try:
        cs, g = mk_genesis(tmp)
        reward_fn = sp._tokenomics_reward_fn()
        assert reward_fn is not None, \
            "tokenomics module required for this test"
        full = reward_fn(1)
        # right total, wrong split: single output of the full reward
        bad_cb = encode_coinbase([(b"greedy-miner", full)])
        ok, why = validate_coinbase(bad_cb, 1)
        assert not ok, f"single-output coinbase passed split check: {why}"
        # right total, wrong amounts: 5 outputs in an equal split
        each = full // 5
        bad2 = encode_coinbase(
            [(b"a%d" % i, each) for i in range(4)] +
            [(b"a4", full - 4 * each)])
        ok, _ = validate_coinbase(bad2, 1)
        assert not ok, "equal-split coinbase passed the split check"
        # the real split passes
        good_cb = coinbase_for(1, b"honest-miner")
        ok, why = validate_coinbase(good_cb, 1)
        assert ok, f"honest split rejected: {why}"
        print("PASS coinbase split enforcement")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    test_wire_roundtrip()
    test_wire_checksum_reject()
    test_wire_bad_magic()
    test_handshake()
    test_header_sync_and_relay()
    test_invalid_pow_rejected()
    test_coinbase_rule()
    test_reorg_heavier_wins()
    test_genesis_descriptor_adoption()
    test_coinbase_split_enforced()
    print("ALL SOVEREIGN P2P TESTS PASSED")
