#!/usr/bin/env python3
"""Tests for aetherion_bridge.py — run: python3 test_aetherion_bridge.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aetherion_bridge import (
    load_registry, get_coin, asset_id, wrapped_symbol, wrapped_decimals,
    rosetta_currency, all_currencies, make_mint_attestation,
    make_release_attestation, sign_attestation, verify_attestation,
    BridgeLedger,
)
from secp256k1 import priv_to_pub, compress
import random

PASS = []
FAIL = []


def check(name, cond):
    (PASS if cond else FAIL).append(name)
    print(("PASS " if cond else "FAIL ") + name)


# deterministic operator key for tests
random.seed(20260921)
PRIV = random.getrandbits(256)
OP = compress(priv_to_pub(PRIV)).hex()

# 1. registry: 7 coins, unique symbols
reg = load_registry()
check("registry loads 7 coins", len(reg["coins"]) == 7)
syms = [c["symbol"] for c in reg["coins"]]
check("symbols unique", len(set(syms)) == 7)
check("expected symbols present",
      set(syms) == {"ATART", "AETX", "EXCALIBUR", "URUU", "SKYNT", "wURUU", "EXS"})

# 2. asset ids: deterministic, 32 bytes, unique
ids = [asset_id(s) for s in syms]
check("asset ids 32 bytes", all(len(i) == 32 for i in ids))
check("asset ids unique", len(set(ids)) == 7)
check("asset id deterministic", asset_id("URUU") == asset_id("URUU"))
try:
    asset_id("NOPE")
    check("unknown symbol raises KeyError", False)
except KeyError:
    check("unknown symbol raises KeyError", True)

# 3. wrapped symbols / decimals
check("wrapped symbol", wrapped_symbol("URUU") == "aURUU")
check("uruu decimals 18", wrapped_decimals("URUU") == 18)
check("aetx decimals 18", wrapped_decimals("AETX") == 18)
check("unknown decimals fall back to 8", wrapped_decimals("SKYNT") == 8)

# 4. rosetta currencies
curs = all_currencies()
check("7 rosetta currencies", len(curs) == 7)
check("currency shape",
      all(set(c) == {"symbol", "decimals", "metadata"} for c in curs))
check("currency metadata has asset_id",
      all(len(c["metadata"]["asset_id"]) == 64 for c in curs))

# 5. attestation sign/verify round trip
att = make_mint_attestation("URUU", 1000, "ztx1", "gsf1abc")
sig = sign_attestation(PRIV, att)
check("valid attestation verifies", verify_attestation(OP, att, sig))
bad = dict(att)
bad["amount"] = 9999
check("tampered attestation fails", not verify_attestation(OP, bad, sig))

# 6. ledger: peg-in happy path
L = BridgeLedger([OP])
r = L.peg_in(att, sig)
check("peg_in credits", r["credited"] == 1000 and r["balance"] == 1000)
check("balance_of", L.balance_of("gsf1abc", "URUU") == 1000)
s = L.supply("URUU")
check("supply after peg_in",
      s["locked"] == 1000 and s["minted"] == 1000 and s["outstanding"] == 1000)

# 7. replay protection
try:
    L.peg_in(att, sig)
    check("replay of source_txid rejected", False)
except ValueError:
    check("replay of source_txid rejected", True)

# 8. bad signature rejected
att2 = make_mint_attestation("URUU", 500, "ztx2", "gsf1abc")
try:
    L.peg_in(att2, "00" * 64)
    check("bad signature rejected", False)
except ValueError:
    check("bad signature rejected", True)

# 9. unknown asset rejected
att3 = {"op": "MINT", "symbol": "NOPE", "amount": 1,
        "source_txid": "x", "recipient": "y"}
try:
    L.peg_in(att3, sign_attestation(PRIV, att3))
    check("unknown asset rejected", False)
except KeyError:
    check("unknown asset rejected", True)

# 10. peg-out burn
b = L.peg_out_burn("gsf1abc", "URUU", 400, "0xdest")
check("burn debits", b["burned"] == 400 and b["balance"] == 600)
s = L.supply("URUU")
check("supply after burn",
      s["burned"] == 400 and s["outstanding"] == 600 and s["locked"] == 1000)

# 11. overspend rejected
try:
    L.peg_out_burn("gsf1abc", "URUU", 999999, "0xdest")
    check("overspend rejected", False)
except ValueError:
    check("overspend rejected", True)

# 12. release attestation recorded
rel = make_release_attestation("URUU", 400, "zrel1", "0xdest", b["burn_ref"])
rr = L.peg_out_release(rel, sign_attestation(PRIV, rel))
check("release recorded",
      rr["released"] == 400 and rr["source_release_txid"] == "zrel1")
s = L.supply("URUU")
check("invariant holds end-to-end",
      s["minted"] - s["burned"] == s["outstanding"] and
      s["locked"] >= s["outstanding"])

# 13. second coin independent
att4 = make_mint_attestation("AETX", 21_000_000, "btx1", "gsf1abc")
L.peg_in(att4, sign_attestation(PRIV, att4))
check("AETX independent supply",
      L.supply("AETX")["outstanding"] == 21_000_000 and
      L.supply("URUU")["outstanding"] == 600)

# 14. persistence round trip
p = "/tmp/test_aetherion_ledger.json"
L2 = BridgeLedger([OP], path=p)
L2.peg_in(make_mint_attestation("SKYNT", 7, "etx1", "gsf9"),
          sign_attestation(PRIV, make_mint_attestation("SKYNT", 7, "etx1", "gsf9")))
L2.save()
L3 = BridgeLedger([OP], path=p)
check("ledger persists",
      L3.balance_of("gsf9", "SKYNT") == 7 and
      L3.supply("SKYNT")["locked"] == 7)
os.remove(p)

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("FAILURES:", FAIL)
    sys.exit(1)
print("ALL AETHERION BRIDGE TESTS PASS")
