#!/usr/bin/env python3
"""Adversarial tests for txscript.validate_tx / validate_block_txs.

Builds a synthetic UTXO view (no chain needed) and tries to break it.
Exit non-zero on any failure.
"""
import os
import random
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import secp256k1 as secp
from genesis_fork import sha256d
from txscript import (parse_tx, ser_tx, p2pk_script, sign_input, sighash_all,
                      txid_internal, validate_tx, validate_block_txs,
                      COINBASE_MATURITY)

SAT = 100_000_000
H = 500  # chain height for tests (coinbases below H-100 are mature)

def keypair():
    d = int.from_bytes(os.urandom(32), "big") % (secp.N - 1) + 1
    return d, secp.compress(secp.priv_to_pub(d))

da, pa = keypair()
db, pb = keypair()

def make_utxo(entries):
    """entries: list of (txid_hex_or_bytes, vout, value, spk, is_cb, h)."""
    u = {}
    for tid, vout, val, spk, is_cb, h in entries:
        if isinstance(tid, str):
            tid = bytes.fromhex(tid)[::-1]  # display -> internal
        u.setdefault((tid, vout), []).append((val, spk, is_cb, h))
    return u

CB_TID = sha256d(b"fake-coinbase")
# mature anyone-can-spend coinbase: 50 tGSF at height 100
utxo0 = make_utxo([(CB_TID, 0, 50 * SAT, b"\x51", True, 100)])

def build_spend(prev_tid, prev_idx, prev_spk, priv, outputs):
    t = {"version": 1,
         "vin": [{"prev": prev_tid, "idx": prev_idx, "script": b"",
                  "seq": 0xFFFFFFFF}],
         "vout": [{"value": v, "script": s} for v, s in outputs],
         "locktime": 0}
    if priv is not None:
        t["vin"][0]["script"] = sign_input(t, 0, prev_spk, priv)
    return ser_tx(t)

passed = failed = 0
def check(name, cond):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ok: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")

print("== valid flows ==")
# 1. anyone-spend coinbase -> P2PK(A) + change to anyone
tx1 = build_spend(CB_TID, 0, b"\x51", None,
                  [(40 * SAT, p2pk_script(pa)), (10 * SAT - 1000, b"\x51")])
ok, reason, fee = validate_tx(tx1, utxo0, H)
check("anyone->P2PK valid", ok and fee == 1000)
T1 = txid_internal(tx1)

# 2. P2PK(A) -> P2PK(B), chained on tx1's view
view = {k: list(v) for k, v in utxo0.items()}
ok, _, _ = validate_tx(tx1, utxo0, H, view=view)
tx2 = build_spend(T1, 0, p2pk_script(pa), da,
                  [(40 * SAT - 1000, p2pk_script(pb))])
ok2, r2, fee2 = validate_tx(tx2, utxo0, H, view=view)
check("P2PK->P2PK chained valid", ok2 and fee2 == 1000)

# 3. block-level: coinbase value = subsidy + fees
from genesis_fork import use_network, subsidy
use_network("testnet")
from txscript import make_coinbase_v2
cb = make_coinbase_v2(H, 0x1f010000, b"EXCAL", fees=2000)
okb, rb, fees = validate_block_txs([cb, tx1, tx2], utxo0, H, subsidy(H))
check("block txs valid, fees=2000", okb and fees == 2000)

print("== adversarial ==")
# 4. wrong key
tx_bad = build_spend(T1, 0, p2pk_script(pa), db,
                     [(40 * SAT - 1000, p2pk_script(pb))])
v = {k: list(vv) for k, vv in utxo0.items()}
validate_tx(tx1, utxo0, H, view=v)
ok, r, _ = validate_tx(tx_bad, utxo0, H, view=v)
check("wrong-key sig rejected", not ok)

# 5. tampered signature byte
t = parse_tx(tx2)
ss = bytearray(t["vin"][0]["script"])
ss[10] ^= 0x01
t["vin"][0]["script"] = bytes(ss)
tx_tam = ser_tx(t)
v = {k: list(vv) for k, vv in utxo0.items()}
validate_tx(tx1, utxo0, H, view=v)
ok, r, _ = validate_tx(tx_tam, utxo0, H, view=v)
check("tampered sig rejected", not ok)

# 6. double-spend within one block
cb2 = make_coinbase_v2(H, 0x1f010000, b"EXCAL", fees=1000)
okb, rb, _ = validate_block_txs([cb2, tx1, tx1], utxo0, H, subsidy(H))
check("same tx twice in block rejected", not okb)

# 7. two txs, same input, one block
tx2b = build_spend(T1, 0, p2pk_script(pa), da,
                   [(40 * SAT - 2000, p2pk_script(pb))])
cb3 = make_coinbase_v2(H, 0x1f010000, b"EXCAL", fees=3000)
okb, rb, _ = validate_block_txs([cb3, tx1, tx2, tx2b], utxo0, H, subsidy(H))
check("double-spend across txs rejected", not okb)

# 8. immature coinbase (height H-5)
utxo_im = make_utxo([(sha256d(b"young"), 0, 50 * SAT, b"\x51", True, H - 5)])
tx_im = build_spend(sha256d(b"young"), 0, b"\x51", None,
                    [(50 * SAT - 1000, p2pk_script(pa))])
ok, r, _ = validate_tx(tx_im, utxo_im, H)
check("immature coinbase rejected", not ok and "immature" in r)

# 9. outputs exceed inputs
tx_neg = build_spend(CB_TID, 0, b"\x51", None, [(60 * SAT, p2pk_script(pa))])
ok, r, _ = validate_tx(tx_neg, utxo0, H)
check("overspend rejected", not ok)

# 10. missing UTXO
tx_miss = build_spend(sha256d(b"nope"), 0, b"\x51", None,
                      [(1 * SAT, p2pk_script(pa))])
ok, r, _ = validate_tx(tx_miss, utxo0, H)
check("missing UTXO rejected", not ok)

# 11. non-standard output
tx_ns = build_spend(CB_TID, 0, b"\x51", None, [(1 * SAT, b"\x6a\x04dead")])
ok, r, _ = validate_tx(tx_ns, utxo0, H)
check("non-standard output rejected", not ok)

# 12. non-empty scriptSig on anyone-spend
tx_any = build_spend(CB_TID, 0, b"\x51", None, [(1 * SAT, b"\x51")])
t = parse_tx(tx_any)
t["vin"][0]["script"] = b"\x01\x02"
ok, r, _ = validate_tx(ser_tx(t), utxo0, H)
check("non-empty scriptSig on anyone-spend rejected", not ok)

# 13. duplicate inputs in one tx
t = parse_tx(tx1)
t["vin"] = [dict(t["vin"][0]), dict(t["vin"][0])]
ok, r, _ = validate_tx(ser_tx(t), utxo0, H)
check("duplicate inputs rejected", not ok)

# 14. garbage bytes
ok, r, _ = validate_tx(b"\x00" * 100, utxo0, H)
check("garbage rejected", not ok)

# 15. sighash commits to outputs (bump output value -> sig invalid)
v = {k: list(vv) for k, vv in utxo0.items()}
validate_tx(tx1, utxo0, H, view=v)
t = parse_tx(tx2)
t["vout"][0]["value"] += 1
ok, r, _ = validate_tx(ser_tx(t), utxo0, H, view=v)
check("output-tampering invalidates sig", not ok)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
