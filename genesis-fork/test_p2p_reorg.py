#!/usr/bin/env python3
"""Tests for EXCAL P2P + reorg handling.

All block production uses REAL proof-of-work at testnet init difficulty
(target 2^240, ~0.3s/block in pure Python). Forks are real competing
branches; reorgs move real UTXO sets. Nothing is mocked except the
network socket in the scoring test.
"""
import json
import os
import shutil
import socket
import struct
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from genesis_fork import (sha256d, ser_header, bits_to_target, merkle_root,
                          txid, subsidy, required_bits, use_network)
from txscript import (make_coinbase_v2, validate_block_txs, txid_internal,
                      txid_display, parse_tx, ser_tx, p2pk_script,
                      find_spendable, is_anyone, utxo_stats)
from chainstate import ChainState, block_work, enc_block, dec_block
from mempool import Mempool
import secp256k1 as secp

use_network("testnet")
TAG = b"TEST"


# ------------------------------------------------------------------ mining
def mine_on(cs: ChainState, prev_hash: bytes, txs: list, tag: bytes = TAG):
    """Mine one real-PoW block on prev_hash with the given extra txs."""
    from txscript import validate_tx
    parent = cs.index[prev_hash]
    height = parent["height"] + 1
    t = parent["time"] + 600
    bits = required_bits(height, cs._bits_context(prev_hash, height), t)
    view = {k: list(v) for k, v in cs.utxo.items()}
    fees = 0
    for tx in txs:
        ok, reason, fee = validate_tx(tx, cs.utxo, height, view=view)
        assert ok, f"template tx invalid: {reason}"
        fees += fee
    cb = make_coinbase_v2(height, bits, tag, fees)
    full = [cb] + txs
    mr = merkle_root([txid(x) for x in full])
    target = bits_to_target(bits)
    nonce = 0
    while True:
        hdr = ser_header(1, prev_hash, mr, t, bits, nonce)
        dh = sha256d(hdr)
        if int.from_bytes(dh, "big") <= target:
            return {"version": 1, "prev": prev_hash, "merkle": mr,
                    "time": t, "bits": bits, "nonce": nonce,
                    "hash": dh[::-1], "txs": full}
        nonce += 1


def mine_n(cs: ChainState, n: int, tag: bytes = TAG, txs_at: dict = None):
    """Mine n blocks on the best tip, submitting each. txs_at: {height: [txs]}."""
    txs_at = txs_at or {}
    for _ in range(n):
        tip = cs.tip()
        h = tip["height"] + 1
        blk = mine_on(cs, bytes.fromhex(tip["hash"]),
                      txs_at.get(h, []), tag)
        res = cs.submit_block(blk)
        assert res["accepted"], f"block {h} rejected: {res['reason']}"
    return cs.tip()


def balance_of(cs: ChainState, pubkey: bytes) -> int:
    from txscript import spk_pubkey
    sats = 0
    for entries in cs.utxo.values():
        for (v, spk, _cb, _h) in entries:
            if spk_pubkey(spk) == pubkey:
                sats += v
    return sats


# ------------------------------------------------------------------ tests
def t_wire_roundtrip():
    from p2p import (encode_msg, Framer, enc_version, dec_version,
                     enc_headers, dec_headers, enc_inv, dec_inv,
                     enc_getheaders, dec_getheaders, enc_block as wenc,
                     dec_block_wire, enc_tx, dec_tx, INV_BLOCK)
    magic = 0x47534674
    # version
    p = enc_version(123, bytes(range(32)), 999)
    v = dec_version(p)
    assert v["tip_height"] == 123 and v["nonce"] == 999
    assert v["tip_hash"] == bytes(range(32))
    # headers
    hs = [{"version": 1, "prev": bytes([1]) * 32, "merkle": bytes([2]) * 32,
           "time": 5, "bits": 0x1f010000, "nonce": 7}]
    assert dec_headers(enc_headers(hs))[0]["nonce"] == 7
    # inv
    e = [(INV_BLOCK, bytes([3]) * 32)]
    assert dec_inv(enc_inv(e)) == e
    # getheaders
    loc, stop = dec_getheaders(enc_getheaders([bytes([4]) * 32],
                                              bytes(32)))
    assert loc == [bytes([4]) * 32] and stop == bytes(32)
    # block
    blk = {"version": 1, "prev": bytes([5]) * 32, "merkle": bytes([6]) * 32,
           "time": 9, "bits": 0x1f010000, "nonce": 11, "txs": [b"tx1", b"tx2"]}
    b2 = dec_block_wire(wenc(blk))
    assert b2["txs"] == [b"tx1", b"tx2"] and b2["nonce"] == 11
    assert b2["hash"] == sha256d(
        ser_header(1, bytes([5]) * 32, bytes([6]) * 32,
                   9, 0x1f010000, 11))[::-1]
    # tx
    assert dec_tx(enc_tx(b"rawtx")) == b"rawtx"
    # framing incl. checksum rejection
    data = encode_msg(magic, "ping", struct.pack("<Q", 42))
    fr = Framer(magic)
    fr.feed(data[:10])
    assert fr.next_msg() is None
    fr.feed(data[10:])
    cmd, pay = fr.next_msg()
    assert cmd == "ping" and struct.unpack("<Q", pay)[0] == 42
    bad = bytearray(data)
    bad[-1] ^= 1
    fr2 = Framer(magic)
    fr2.feed(bytes(bad))
    try:
        fr2.next_msg()
        assert False, "bad checksum accepted"
    except ValueError:
        pass
    print("PASS wire round-trip (all message types + framing)")


def t_simple_extension():
    d = tempfile.mkdtemp()
    cs = ChainState(d).load()
    mine_n(cs, 5)
    assert cs.tip()["height"] == 5
    n, val = utxo_stats(cs.utxo)
    assert n == 5, f"utxo entries {n}"
    assert val == 5 * 50 * 100_000_000
    # restart: identical state rebuilt from disk
    cs2 = ChainState(d).load()
    assert cs2.tip()["hash"] == cs.tip()["hash"]
    n2, v2 = utxo_stats(cs2.utxo)
    assert (n2, v2) == (n, val)
    print("PASS simple extension + restart rebuild")
    shutil.rmtree(d, ignore_errors=True)


def t_reorg_heavier_wins():
    da, db = tempfile.mkdtemp(), tempfile.mkdtemp()
    a, b = ChainState(da).load(), ChainState(db).load()
    mine_n(a, 3, tag=b"A")   # A: 3 blocks
    mine_n(b, 5, tag=b"B")   # B: 5 blocks (heavier)
    assert a.tip()["hash"] != b.tip()["hash"]
    # feed B's branch into A, block by block from genesis
    bh = b.best
    branch = []
    while bh != b.genesis_hash:
        branch.append(bh)
        bh = b.index[bh]["prev"]
    for bh in reversed(branch):
        r = b.index[bh]
        blk = {k: r[k] for k in ("version", "prev", "merkle", "time",
                                 "bits", "nonce", "hash", "txs")}
        res = a.submit_block(blk)
        assert res["accepted"], res["reason"]
    assert a.tip()["height"] == 5
    assert a.tip()["hash"] == b.tip()["hash"]
    # the first (and only) reorg is the fork switch: fork at genesis,
    # depth 3; b5's arrival is a plain extension, not a reorg
    assert len(a.reorgs) == 1, a.reorgs
    ev = a.reorgs[0]
    assert ev["type"] == "reorg"
    assert ev["fork_height"] == 0 and ev["depth"] == 3, ev
    assert ev["new_depth"] == 4
    # UTXO identical to B's
    na, va = utxo_stats(a.utxo)
    nb, vb = utxo_stats(b.utxo)
    assert (na, va) == (nb, vb) == (5, 5 * 50 * 100_000_000)
    # undo map consistent: can disconnect the whole active chain
    ucopy = {k: list(v) for k, v in a.utxo.items()}
    h = a.best
    while h != a.genesis_hash:
        a._disconnect_utxo(ucopy, a.undo[h])
        h = a.index[h]["prev"]
    assert ucopy == {}, "disconnect-all did not empty UTXO"
    print("PASS reorg: heavier branch wins, UTXO exact, undo reversible")
    shutil.rmtree(da, ignore_errors=True)
    shutil.rmtree(db, ignore_errors=True)


def t_reorg_with_tx_and_mempool():
    """A confirms a tx on shared history; B's heavier branch (forked at
    105) reorgs block 106 out; the tx must be resurrected into the
    mempool and confirm on the new chain."""
    from p2p import PeerManager
    da, db = tempfile.mkdtemp(), tempfile.mkdtemp()
    a, b = ChainState(da).load(), ChainState(db).load()
    mine_n(a, 105, tag=b"SHARED")  # coinbases mature (100 deep) at h>=101
    # B shares the first 105 blocks, then forks
    bh = a.best
    shared = []
    while bh != a.genesis_hash:
        shared.append(bh)
        bh = a.index[bh]["prev"]
    for bh in reversed(shared):
        r = a.index[bh]
        blk = {k: r[k] for k in ("version", "prev", "merkle", "time",
                                 "bits", "nonce", "hash", "txs")}
        res = b.submit_block(blk)
        assert res["accepted"], res["reason"]
    assert b.tip()["height"] == 105
    # build a spend of block-1 coinbase (anyone-can-spend, mature)
    cands = find_spendable(a.utxo, 105,
                           lambda v, spk, is_cb, cb_h: is_cb and is_anyone(spk))
    assert cands, "no mature anyone UTXO"
    (key, (value, spk, is_cb, cb_h)) = cands[0]
    assert cb_h == 1, f"expected oldest coinbase, got h={cb_h}"
    priv = 12345
    pub = secp.compress(secp.priv_to_pub(priv))
    t = {"version": 1,
         "vin": [{"prev": key[0], "idx": key[1], "script": b"",
                  "seq": 0xFFFFFFFF}],
         "vout": [{"value": value - 1000, "script": p2pk_script(pub)}],
         "locktime": 0}
    raw = ser_tx(t)
    txid_hex = txid_internal(raw).hex()
    # A's mempool + block 106 confirms it
    ma = Mempool(os.path.join(da, "mempool.json"))
    ok, _ = ma.add(raw, a.utxo, 105)
    assert ok
    mine_n(a, 1, tag=b"A", txs_at={106: [raw]})
    assert a.tip()["height"] == 106
    assert balance_of(a, pub) == value - 1000
    # B mines 5 tx-free blocks on the shared tip (heavier branch)
    mine_n(b, 5, tag=b"B")
    assert b.tip()["height"] == 110
    # feed B's fork (106..110) into A
    bh = b.best
    branch = []
    while bh != b.genesis_hash:
        branch.append(bh)
        bh = b.index[bh]["prev"]
        if b.index[bh]["height"] == 105:
            break
    lock = threading.Lock()
    mgr = PeerManager(a, ma, lock, port=0, log=lambda *x: None)
    for bh in reversed(branch):
        r = b.index[bh]
        blk = {k: r[k] for k in ("version", "prev", "merkle", "time",
                                 "bits", "nonce", "hash", "txs")}
        with lock:
            res = a.submit_block(blk)
            if res.get("event"):
                mgr._apply_reorg_side_effects(res["event"])
    assert a.tip()["height"] == 110, a.tip()
    assert a.tip()["hash"] == b.tip()["hash"]
    ev = a.reorgs[0]
    assert ev["type"] == "reorg"
    assert ev["fork_height"] == 105 and ev["depth"] == 1, ev
    assert ev["new_depth"] == 2
    # the orphaned tx is back in the mempool, valid on the new chain
    assert txid_hex in ma.txs, "orphaned tx not resurrected"
    assert balance_of(a, pub) == 0  # no longer confirmed
    # and it confirms on the new chain
    mine_n(a, 1, tag=b"A", txs_at={111: [ma.txs[txid_hex]["raw"]]})
    assert balance_of(a, pub) == value - 1000
    print("PASS reorg with tx: orphaned tx resurrected, confirms on new chain")
    shutil.rmtree(da, ignore_errors=True)
    shutil.rmtree(db, ignore_errors=True)


def t_invalid_block_rejected_and_scored():
    from p2p import PeerManager, enc_block as wenc
    d = tempfile.mkdtemp()
    cs = ChainState(d).load()
    mine_n(cs, 2)
    mp = Mempool(os.path.join(d, "mempool.json"))
    lock = threading.Lock()
    mgr = PeerManager(cs, mp, lock, port=0, log=lambda *x: None)

    class FakePeer:
        def __init__(self):
            self.addr = ("127.0.0.1", 9999)
            self.score = 0
            self.veracked = True
        def misbehave(self, pts, why):
            self.score += pts

    # bad PoW block: claim a much harder target than mined for
    tip = cs.tip()
    blk2 = mine_on(cs, bytes.fromhex(tip["hash"]), [])
    blk2["bits"] = 0x1f00ffff  # much harder target than mined for
    fp = FakePeer()
    mgr.on_message(fp, "block", wenc(blk2))
    assert fp.score >= 10, f"peer not scored: {fp.score}"
    assert cs.tip()["height"] == 2, "invalid block moved the tip!"
    # bad tx block: double-spend within the block
    print("PASS invalid block rejected, peer scored, tip unmoved")
    shutil.rmtree(d, ignore_errors=True)


def t_branch_invalid_can_never_win():
    """A side branch with an invalid tx can out-work the active chain but
    must never become active."""
    d = tempfile.mkdtemp()
    cs = ChainState(d).load()
    mine_n(cs, 3, tag=b"MAIN")
    main_tip = cs.best
    # build a heavier branch whose tip block double-spends
    fork_parent = cs.index[cs.best]["prev"]  # height 2
    # mine 2 blocks on height-2 parent (heights 3,4 vs active 3)
    b3 = mine_on(cs, fork_parent, [], tag=b"EVIL")
    # hand-craft an invalid block at height 4 on b3: reuse b3's coinbase
    # twice (duplicate txid)
    evil = dict(b3)
    evil["prev"] = b3["hash"]
    evil["time"] = b3["time"] + 600
    evil["txs"] = [b3["txs"][0], b3["txs"][0]]
    from genesis_fork import merkle_root as _mr, txid as _txid
    evil["merkle"] = _mr([_txid(t) for t in evil["txs"]])
    # re-mine PoW for the tampered header
    target = bits_to_target(evil["bits"])
    nonce = 0
    while True:
        hdr = ser_header(evil["version"], evil["prev"], evil["merkle"],
                         evil["time"], evil["bits"], nonce)
        if int.from_bytes(sha256d(hdr), "big") <= target:
            evil["nonce"] = nonce
            evil["hash"] = sha256d(hdr)[::-1]
            break
        nonce += 1
    r1 = cs.submit_block(b3)
    assert r1["accepted"], r1["reason"]
    r2 = cs.submit_block(evil)
    # evil has more work (2 blocks on the fork vs 1 on active) but the
    # branch is invalid -> must not win
    assert not r2["accepted"], f"invalid branch accepted: {r2}"
    assert cs.best == main_tip, "invalid branch became active!"
    assert evil["hash"] in cs.invalid
    # children of the invalid block are poisoned too
    b5 = mine_on(cs, evil["hash"], [], tag=b"EVIL2")
    r3 = cs.submit_block(b5)
    assert not r3["accepted"] and r3["reason"] == "parent invalid", r3
    print("PASS invalid branch can never win; children poisoned")
    shutil.rmtree(d, ignore_errors=True)


def t_live_two_node_sync():
    """Two real PeerManagers over localhost TCP: B (5 blocks) syncs A
    (3 blocks) via headers->getdata; then B mines one more and A follows
    via inv relay."""
    from p2p import PeerManager
    da, db = tempfile.mkdtemp(), tempfile.mkdtemp()
    ca, cb = ChainState(da).load(), ChainState(db).load()
    mine_n(ca, 3, tag=b"A")
    mine_n(cb, 5, tag=b"B")
    ma = Mempool(os.path.join(da, "mempool.json"))
    mb = Mempool(os.path.join(db, "mempool.json"))
    la, lb = threading.Lock(), threading.Lock()
    pa = PeerManager(ca, ma, la, port=38444, log=lambda *x: None)
    pb = PeerManager(cb, mb, lb, port=38445, log=lambda *x: None)
    pa.start()
    pb.start()
    try:
        pa.connect("127.0.0.1", 38445)
        # wait for A to reach height 5
        deadline = time.time() + 60
        while time.time() < deadline:
            with la:
                h = ca.tip()["height"]
            if h >= 5:
                break
            time.sleep(0.5)
        with la:
            assert ca.tip()["height"] == 5, f"A stuck at {ca.tip()}"
            assert ca.tip()["hash"] == cb.tip()["hash"], "tips differ"
            assert len(ca.reorgs) == 1
            assert ca.reorgs[0]["depth"] == 3
        # block relay: B mines block 6, A should follow via inv
        mine_n(cb, 1, tag=b"B")
        with lb:
            pb.broadcast_block({k: cb.index[cb.best][k] for k in
                                ("version", "prev", "merkle", "time",
                                 "bits", "nonce", "hash", "txs")})
        deadline = time.time() + 60
        while time.time() < deadline:
            with la:
                if ca.tip()["height"] >= 6:
                    break
            time.sleep(0.5)
        with la:
            assert ca.tip()["height"] == 6, "inv relay failed"
            assert ca.tip()["hash"] == cb.tip()["hash"]
        print("PASS live two-node sync: headers->blocks, reorg, inv relay")
    finally:
        pa.shutdown()
        pb.shutdown()
        shutil.rmtree(da, ignore_errors=True)
        shutil.rmtree(db, ignore_errors=True)


def main():
    t0 = time.time()
    t_wire_roundtrip()
    t_simple_extension()
    t_reorg_heavier_wins()
    t_reorg_with_tx_and_mempool()
    t_invalid_block_rejected_and_scored()
    t_branch_invalid_can_never_win()
    t_live_two_node_sync()
    print(f"\nALL P2P/REORG TESTS PASS ({time.time()-t0:.1f}s)")


if __name__ == "__main__":
    main()
