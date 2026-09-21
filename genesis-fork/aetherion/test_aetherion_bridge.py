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

print(f"\n{len(PASS)} passed, {len(FAIL)} failed (v1 baseline)")
if FAIL:
    print("FAILURES:", FAIL)
    sys.exit(1)

# ============================================================ v2: quorum + release hardening
random.seed(777)
P1, P2, P3 = (random.getrandbits(256) for _ in range(3))
OP1 = compress(priv_to_pub(P1)).hex()
OP2 = compress(priv_to_pub(P2)).hex()
OP3 = compress(priv_to_pub(P3)).hex()


def qsig(priv, att):
    return sign_attestation(priv, att)


# 15. 2-of-3 quorum: single sig rejected
Q = BridgeLedger([OP1, OP2, OP3], threshold=2)
qa = make_mint_attestation("URUU", 1000, "qtx1", "gsfQ")
try:
    Q.peg_in(qa, qsig(P1, qa))
    check("2-of-3: single sig rejected", False)
except ValueError:
    check("2-of-3: single sig rejected", True)

# 16. 2-of-3: two distinct operator sigs accepted
r = Q.peg_in(qa, [qsig(P1, qa), qsig(P2, qa)])
check("2-of-3: two distinct sigs accepted", r["credited"] == 1000)

# 17. one operator signing twice counts once
qb = make_mint_attestation("URUU", 500, "qtx2", "gsfQ")
try:
    Q.peg_in(qb, [qsig(P1, qb), qsig(P1, qb)])
    check("double-sig by same operator counts once", False)
except ValueError:
    check("double-sig by same operator counts once", True)

# 18. non-operator sig rejected
PX = random.getrandbits(256)
qc = make_mint_attestation("URUU", 500, "qtx3", "gsfQ")
try:
    Q.peg_in(qc, [qsig(P1, qc), qsig(PX, qc)])
    check("non-operator sig rejected", False)
except ValueError:
    check("non-operator sig rejected", True)

# 19. threshold constructor bounds
try:
    BridgeLedger([OP1, OP2], threshold=3)
    check("threshold > N rejected", False)
except AssertionError:
    check("threshold > N rejected", True)

# 20. release against unknown burn_ref rejected
burn = Q.peg_out_burn("gsfQ", "URUU", 400, "0xdest")
rel = make_release_attestation("URUU", 400, "zrelX", "0xdest", "deadbeef" * 8)
try:
    Q.peg_out_release(rel, [qsig(P1, rel), qsig(P3, rel)])
    check("release with unknown burn_ref rejected", False)
except ValueError:
    check("release with unknown burn_ref rejected", True)

# 21. release with wrong amount rejected
rel2 = make_release_attestation("URUU", 300, "zrelY", "0xdest", burn["burn_ref"])
try:
    Q.peg_out_release(rel2, [qsig(P1, rel2), qsig(P2, rel2)])
    check("release with wrong amount rejected", False)
except ValueError:
    check("release with wrong amount rejected", True)

# 22. release happy path: locked decremented
rel3 = make_release_attestation("URUU", 400, "zrel1", "0xdest", burn["burn_ref"])
rr = Q.peg_out_release(rel3, [qsig(P1, rel3), qsig(P3, rel3)])
s = Q.supply("URUU")
check("release decrements locked",
      rr["locked"] == 600 and s["locked"] == 600 and
      s["minted"] - s["burned"] == s["outstanding"] and
      s["locked"] >= s["outstanding"])

# 23. same release attestation replayed -> rejected
try:
    Q.peg_out_release(rel3, [qsig(P1, rel3), qsig(P3, rel3)])
    check("release attestation replay rejected", False)
except ValueError:
    check("release attestation replay rejected", True)

# 24. second release against same burn_ref (fresh attestation) -> rejected
burn2 = Q.peg_out_burn("gsfQ", "URUU", 100, "0xdest2")
relA = make_release_attestation("URUU", 100, "zrelA", "0xdest2", burn2["burn_ref"])
Q.peg_out_release(relA, [qsig(P1, relA), qsig(P2, relA)])
relB = make_release_attestation("URUU", 100, "zrelB", "0xdest2",
                                burn2["burn_ref"])
try:
    Q.peg_out_release(relB, [qsig(P1, relB), qsig(P2, relB)])
    check("burn_ref double-release rejected", False)
except ValueError:
    check("burn_ref double-release rejected", True)

# 25. unreleased_burns work queue
burn3 = Q.peg_out_burn("gsfQ", "URUU", 50, "0xdest3")
pending = Q.unreleased_burns("URUU")
check("unreleased_burns lists pending",
      any(e["burn_ref"] == burn3["burn_ref"] for e in pending) and
      not any(e["burn_ref"] == burn["burn_ref"] for e in pending))

# 26. threshold persists across save/load
p2 = "/tmp/test_aetherion_quorum.json"
Qp = BridgeLedger([OP1, OP2, OP3], threshold=2, path=p2)
Qp.save()
Qq = BridgeLedger([OP1, OP2, OP3], path=p2)
check("threshold persists", Qq.threshold == 2)
qd = make_mint_attestation("SKYNT", 9, "qtx9", "gsfQ")
try:
    Qq.peg_in(qd, qsig(P1, qd))
    check("loaded ledger enforces quorum", False)
except ValueError:
    check("loaded ledger enforces quorum", True)
os.remove(p2)

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("FAILURES:", FAIL)
    sys.exit(1)
print("ALL AETHERION BRIDGE TESTS PASS (v1 + v2)")
