#!/usr/bin/env python3
"""Tests for aetherion_bridge.py — run: python3 test_aetherion_bridge.py"""
import json
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
L = BridgeLedger([OP], fee_bps=0)  # v1 baseline: fee-free mechanics
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
L2 = BridgeLedger([OP], path=p, fee_bps=0)
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
Q = BridgeLedger([OP1, OP2, OP3], threshold=2, fee_bps=0)  # v2 adversarial: fee-free
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
Qp = BridgeLedger([OP1, OP2, OP3], threshold=2, path=p2, fee_bps=0)
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

# 27. default fee is the production toll: 30 bps (0.30%), set 2026-09-21
F0 = BridgeLedger([OP])
f0att = make_mint_attestation("AETX", 100000, "feetx0", "gsfFee")
f0r = F0.peg_in(f0att, sign_attestation(PRIV, f0att))
check("default 30 bps toll on peg-in",
      f0r["credited"] == 99700 and f0r["fee"] == 300)
check("default toll accrues to collector",
      F0.balance_of("bridge-treasury", "AETX") == 300)

# 28. explicit set_fee(30) is a no-op on the new default; toll still applies
F0.set_fee(30)
f1att = make_mint_attestation("AETX", 100000, "feetx1", "gsfFee")
f1r = F0.peg_in(f1att, sign_attestation(PRIV, f1att))
check("peg_in fee split",
      f1r["credited"] == 99700 and f1r["fee"] == 300 and
      f1r["balance"] == 99700 + 99700)
check("collector accrues fee",
      F0.balance_of("bridge-treasury", "AETX") == 600)
s = F0.supply("AETX")
check("supply invariant with fees",
      s["minted"] - s["burned"] == s["outstanding"] and
      s["fees"] == 600 and
      s["outstanding"] == 200000)

# 29. fee on peg-out burn: gross 10000 @30bps -> fee 30, net 9970 releasable
burnf = F0.peg_out_burn("gsfFee", "AETX", 10000, "0xfeeDest")
check("burn fee split",
      burnf["burned"] == 9970 and burnf["fee"] == 30)
check("collector accrues burn fee",
      F0.balance_of("bridge-treasury", "AETX") == 630)
relf = make_release_attestation("AETX", 9970, "zrelFee", "0xfeeDest",
                                burnf["burn_ref"])
relf_bad = make_release_attestation("AETX", 10000, "zrelFeeBad",
                                    "0xfeeDest", burnf["burn_ref"])
try:
    F0.peg_out_release(relf_bad, sign_attestation(PRIV, relf_bad))
    check("release for gross (pre-fee) amount rejected", False)
except ValueError:
    check("release for gross (pre-fee) amount rejected", True)
F0.peg_out_release(relf, sign_attestation(PRIV, relf))
check("release matches net burn amount",
      F0.supply("AETX")["locked"] == 200000 - 9970)

# 30. per-asset override: URUU 100 bps, AETX stays 30
F0.set_fee("URUU", 100)
uatt = make_mint_attestation("URUU", 10000, "feetxU", "gsfFee")
ur = F0.peg_in(uatt, sign_attestation(PRIV, uatt))
check("per-asset override applies",
      ur["fee"] == 100 and ur["credited"] == 9900)
aatt = make_mint_attestation("AETX", 10000, "feetx2", "gsfFee")
ar = F0.peg_in(aatt, sign_attestation(PRIV, aatt))
check("global rate still applies to other assets",
      ar["fee"] == 30 and ar["credited"] == 9970)
check("fees_collected view",
      F0.fees_collected("URUU") == {"URUU": 100} and
      F0.fees_collected("AETX")["AETX"] == 600 + 30 + 30)

# 31. invalid fees rejected
for bad_fee in (-1, 10001, "30"):
    try:
        F0.set_fee(bad_fee)
        check(f"set_fee({bad_fee!r}) rejected", False)
    except (AssertionError, ValueError, TypeError):
        check(f"set_fee({bad_fee!r}) rejected", True)
try:
    BridgeLedger([OP], fee_bps=20000)
    check("constructor fee_bps=20000 rejected", False)
except AssertionError:
    check("constructor fee_bps=20000 rejected", True)

# 32. fee schedule persists across save/load
p3 = "/tmp/test_aetherion_fees.json"
Fp = BridgeLedger([OP], path=p3, fee_bps=25,
                  fee_collector="treasury2")
Fp.set_fee("SKYNT", 75)
Fp.save()
Fq = BridgeLedger([OP], path=p3)
check("fee schedule persists",
      Fq.fee_schedule() == {"global_bps": 25, "collector": "treasury2",
                            "overrides": {"SKYNT": 75}})
os.remove(p3)

# 33. legacy ledger (pre-fee state) migrates: picks up the production default
p4 = "/tmp/test_aetherion_legacy.json"
legacy_state = {"assets": {"URUU": {"locked": 100, "minted": 100,
                                   "burned": 0}},
                "used_source_txids": [], "used_burn_refs": [],
                "used_release_atts": [], "balances": {}, "log": [],
                "threshold": 1}
with open(p4, "w") as f:
    json.dump(legacy_state, f)
Fl = BridgeLedger([OP], path=p4)
check("legacy ledger migrates fee keys",
      Fl.fee_schedule()["global_bps"] == 30 and
      Fl.fees_collected("URUU") == {"URUU": 0})
os.remove(p4)

# 34. fee consuming the entire amount is rejected, not bricked
F0.set_fee(10000)
zatt = make_mint_attestation("EXS", 7, "feetxZ", "gsfFee")
try:
    F0.peg_in(zatt, sign_attestation(PRIV, zatt))
    check("100% fee mint rejected", False)
except ValueError:
    check("100% fee mint rejected", True)
F0.set_fee(0)

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("FAILURES:", FAIL)
    sys.exit(1)
print("ALL AETHERION BRIDGE TESTS PASS (v1 + v2 + fees)")
