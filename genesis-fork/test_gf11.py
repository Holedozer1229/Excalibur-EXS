#!/usr/bin/env python3
"""GF-11 adversarial tests: PQ activation boundary, formats, and migration.

Test-only key material. Never operational.
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mldsa
import secp256k1 as secp
from genesis_fork import (gf11_active, GF11_ACTIVATION_HEIGHT, subsidy,
                          sha256d)
from txscript import (
    parse_tx, ser_tx, txid_internal, p2pk_script, pq_script, pq_sign_input,
    pq_sighash, sign_input, validate_tx, validate_block_txs,
    make_coinbase_v2, make_coinbase_pq, PQ_VERSION_BYTE, PQ_SIG_LEN,
)

A = GF11_ACTIVATION_HEIGHT
PRE = A - 1

# Deterministic test key (never operational).
SEED = bytes(range(32))
PK, SK = mldsa.keygen(SEED)
RND = bytes([0xA5]) * 32
assert len(PK) == 1952

# Legacy test key.
LEGACY_PRIV = 0x1234
LEGACY_PUB = secp.compress(secp.priv_to_pub(LEGACY_PRIV))

PASS = []
FAIL = []


def check(name, cond, detail=""):
    if cond:
        PASS.append(name)
    else:
        FAIL.append((name, detail))
        print(f"FAIL: {name} {detail}")


def utxo_with(tid, vout, value, spk, is_cb=False, h=0):
    return {(tid, vout): [(value, spk, is_cb, h)]}


def test_pq_spend_ok():
    spk = pq_script(PK)
    tid = sha256d(b"pq-utxo-1")
    utxo = utxo_with(tid, 0, 100_000, spk, is_cb=False, h=PRE)
    t = {"version": 2,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": pq_script(PK)}],
         "locktime": 0}
    t["vin"][0]["script"] = pq_sign_input(t, 0, spk, SK, RND)
    raw = ser_tx(t)
    ok, reason, fee, pq = validate_tx(raw, utxo, A)
    check("pq-spend-ok", ok and fee == 1_000 and pq == 1,
          f"ok={ok} reason={reason} fee={fee} pq={pq}")


def test_pq_spend_bad_sig():
    spk = pq_script(PK)
    tid = sha256d(b"pq-utxo-2")
    utxo = utxo_with(tid, 0, 100_000, spk)
    t = {"version": 2,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": pq_script(PK)}],
         "locktime": 0}
    sig = pq_sign_input(t, 0, spk, SK, RND)
    bad = bytearray(sig)
    bad[100] ^= 0xFF
    t["vin"][0]["script"] = bytes(bad)
    raw = ser_tx(t)
    ok, reason, _, _ = validate_tx(raw, utxo, A)
    check("pq-spend-bad-sig-rejected", not ok, f"reason={reason}")


def test_pq_spend_version1_rejected():
    spk = pq_script(PK)
    tid = sha256d(b"pq-utxo-3")
    utxo = utxo_with(tid, 0, 100_000, spk)
    t = {"version": 1,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": pq_script(PK)}],
         "locktime": 0}
    t["vin"][0]["script"] = pq_sign_input(t, 0, spk, SK, RND)
    raw = ser_tx(t)
    ok, reason, _, _ = validate_tx(raw, utxo, A)
    check("pq-spend-version1-rejected", not ok, f"reason={reason}")


def test_pq_output_pre_activation_rejected():
    spk = pq_script(PK)
    tid = sha256d(b"legacy-utxo-1")
    lspk = p2pk_script(LEGACY_PUB)
    utxo = utxo_with(tid, 0, 100_000, lspk)
    t = {"version": 1,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": spk}],
         "locktime": 0}
    t["vin"][0]["script"] = sign_input(t, 0, lspk, LEGACY_PRIV)
    raw = ser_tx(t)
    ok, reason, _, _ = validate_tx(raw, utxo, PRE)
    check("pq-output-pre-activation-rejected", not ok, f"reason={reason}")


def test_new_p2pk_post_activation_rejected():
    tid = sha256d(b"legacy-utxo-2")
    lspk = p2pk_script(LEGACY_PUB)
    utxo = utxo_with(tid, 0, 100_000, lspk)
    t = {"version": 1,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": p2pk_script(LEGACY_PUB)}],
         "locktime": 0}
    t["vin"][0]["script"] = sign_input(t, 0, lspk, LEGACY_PRIV)
    raw = ser_tx(t)
    ok, reason, _, _ = validate_tx(raw, utxo, A)
    check("new-p2pk-post-activation-rejected", not ok, f"reason={reason}")


def test_legacy_migration_ok():
    # Post-activation: spend legacy P2PK in v1, create PQ output.
    tid = sha256d(b"legacy-utxo-3")
    lspk = p2pk_script(LEGACY_PUB)
    utxo = utxo_with(tid, 0, 100_000, lspk)
    t = {"version": 1,
         "vin": [{"prev": tid, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": pq_script(PK)}],
         "locktime": 0}
    t["vin"][0]["script"] = sign_input(t, 0, lspk, LEGACY_PRIV)
    raw = ser_tx(t)
    ok, reason, fee, pq = validate_tx(raw, utxo, A)
    check("legacy-migration-ok", ok and fee == 1_000 and pq == 0,
          f"ok={ok} reason={reason}")


def test_coinbase_pq_required():
    bits = 0x1e100000
    # Pre-activation: OP_TRUE coinbase is fine.
    cb_pre = make_coinbase_v2(PRE, bits, b"test", 0)
    ok, reason, _ = validate_block_txs([cb_pre], {}, PRE, subsidy(PRE))
    check("coinbase-pre-ok", ok, f"reason={reason}")
    # Post-activation: OP_TRUE coinbase rejected.
    cb_bad = make_coinbase_v2(A, bits, b"test", 0)
    ok, reason, _ = validate_block_txs([cb_bad], {}, A, subsidy(A))
    check("coinbase-op-true-post-rejected", not ok, f"reason={reason}")
    # Post-activation: PQ coinbase accepted.
    cb_pq = make_coinbase_pq(A, bits, b"test", PK, 0)
    ok, reason, _ = validate_block_txs([cb_pq], {}, A, subsidy(A))
    check("coinbase-pq-post-ok", ok, f"reason={reason}")


def test_pq_sigop_limit():
    # 65 PQ spends in one block must be rejected (limit 64).
    bits = 0x1e100000
    cb = make_coinbase_pq(A, bits, b"test", PK, 0)
    utxo = {}
    txs = [cb]
    for k in range(65):
        spk = pq_script(PK)
        tid = sha256d(b"pq-limit-%d" % k)
        utxo[(tid, 0)] = [(10_000, spk, False, PRE)]
        t = {"version": 2,
             "vin": [{"prev": tid, "idx": 0, "script": b"",
                      "seq": 0xFFFFFFFF}],
             "vout": [{"value": 9_000, "script": pq_script(PK)}],
             "locktime": 0}
        t["vin"][0]["script"] = pq_sign_input(t, 0, spk, SK, RND)
        txs.append(ser_tx(t))
    ok, reason, _ = validate_block_txs(txs, utxo, A, subsidy(A))
    check("pq-sigop-limit", not ok, f"reason={reason}")


def test_replay_across_inputs_rejected():
    # Signature for input 0 must not validate on input 1.
    spk = pq_script(PK)
    tid0 = sha256d(b"pq-replay-0")
    tid1 = sha256d(b"pq-replay-1")
    utxo = {(tid0, 0): [(50_000, spk, False, PRE)],
            (tid1, 0): [(50_000, spk, False, PRE)]}
    t = {"version": 2,
         "vin": [{"prev": tid0, "idx": 0, "script": b"", "seq": 0xFFFFFFFF},
                 {"prev": tid1, "idx": 0, "script": b"", "seq": 0xFFFFFFFF}],
         "vout": [{"value": 99_000, "script": pq_script(PK)}],
         "locktime": 0}
    sig0 = pq_sign_input(t, 0, spk, SK, RND)
    t["vin"][0]["script"] = sig0
    t["vin"][1]["script"] = sig0  # replay!
    raw = ser_tx(t)
    ok, reason, _, _ = validate_tx(raw, utxo, A)
    check("replay-across-inputs-rejected", not ok, f"reason={reason}")


if __name__ == "__main__":
    test_pq_spend_ok()
    test_pq_spend_bad_sig()
    test_pq_spend_version1_rejected()
    test_pq_output_pre_activation_rejected()
    test_new_p2pk_post_activation_rejected()
    test_legacy_migration_ok()
    test_coinbase_pq_required()
    test_pq_sigop_limit()
    test_replay_across_inputs_rejected()
    print(f"\nGF-11: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        sys.exit(1)
    print("ALL GF-11 TESTS PASS")
