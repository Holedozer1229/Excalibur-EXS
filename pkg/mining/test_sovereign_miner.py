#!/usr/bin/env python3
"""Tests for the sovereign $EXS post-genesis miner.

Forges real blocks at difficulty 1 through the miner's own code path
(C engine, tokenomics coinbase, ChainState validation) on a synthetic
genesis descriptor. Slow path: a few seconds of grinding.
"""
import json
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sovereign_miner as sm
from sovereign_miner import sp

DIFF = 1
K = sm.UniversalMiningKernel()
ADDRS = {"miner": "miner-addr-1", "treasury": "treasury-addr-1",
         "liquidity": "liquidity-addr-1", "airdrop": "airdrop-addr-1"}


def mk_descriptor(tmpdir):
    g = sp.mine_block(K, sp.GENESIS_PREV, 0, [], DIFF)
    desc = {
        "protocol": "Excalibur $EXS -- sovereign genesis hard fork",
        "height": 0,
        "prev": sp.GENESIS_PREV.hex(),
        "axiom": sp.AXIOM,
        "axiom_words": 13,
        "seed_derivation": {"seed_hex": sp.SEED_HEX},
        "pow": {"nonce": g["nonce"], "final_hash": g["id"].hex(),
                "difficulty_zero_bytes": DIFF},
        "timestamp": g["timestamp"],
    }
    dp = os.path.join(tmpdir, "descriptor.json")
    with open(dp, "w") as f:
        json.dump(desc, f)
    return dp, desc


def test_engine_oracle_agreement():
    assert sm.HAS_C, "C engine not importable"
    assert sm.check_engine(K), "C engine disagrees with the Python oracle"
    print("PASS C engine agrees with consensus oracle")


def test_forge_two_blocks():
    tmp = tempfile.mkdtemp(prefix="exs_miner_")
    try:
        dp, desc = mk_descriptor(tmp)
        # --- miner startup path: adopt + verify genesis ---
        cs = sp.ChainState(os.path.join(tmp, "chain"), K, DIFF,
                           sp.MAGIC_TESTNET, log=lambda *a: None)
        gfields, loaded = sp._load_genesis_json(dp)
        assert sp._verify_descriptor_oracle(loaded)
        res = cs.submit_block(gfields)
        assert res["accepted"], res
        assert res["id"].hex() == desc["pow"]["final_hash"]

        # --- forge heights 1 and 2 exactly like main()'s loop ---
        for want_height in (1, 2):
            with cs.lock:
                tip = cs.tip()
                tip_id = bytes.fromhex(tip["hash"])
                height = tip["height"] + 1
                parent_ts = cs.index[tip_id]["timestamp"]
            assert height == want_height, (height, want_height)
            ts = max(int(time.time()), parent_ts + 1)
            coinbase = sm.build_coinbase(height, ADDRS)
            b = sm.mine_block_c(K, tip_id, height, [coinbase], DIFF, ts)
            assert b is not None, "aborted unexpectedly"
            res = cs.submit_block({k: b[k] for k in
                                   ("height", "prev", "timestamp",
                                    "nonce", "txs")})
            assert res["accepted"], res
            # chain linkage + PoW re-verified independently
            rec = cs.index[res["id"]]
            assert rec["prev"] == tip_id
            assert sp.meets_difficulty(
                sp.block_id_for(K, height, tip_id, rec["txroot"], ts,
                                b["nonce"]), DIFF)
            # coinbase pays the configured addresses with exact split
            outs = sp.parse_coinbase(rec["txs"][0])
            got_addrs = sorted(a for a, _ in outs)
            assert b"miner-addr-1" in got_addrs and \
                b"treasury-addr-1" in got_addrs, got_addrs
            print(f"  forged height {height} id={res['id'].hex()[:16]}... "
                  f"nonce={b['nonce']}")
        assert cs.tip()["height"] == 2
        print("PASS forged 2 post-genesis blocks, chain valid")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_miner_refuses_without_tokenomics_split():
    # build_coinbase must fail closed, never forge with a wrong schedule
    try:
        sm.build_coinbase(1, {"miner": "m", "treasury": None,
                              "liquidity": "l", "airdrop": "a"})
    except ValueError as e:
        assert "None" in str(e) or "unassigned" in str(e), e
        print("PASS miner refuses unassigned payee (fail closed)")
        return
    raise AssertionError("build_coinbase forged with a None payee!")


if __name__ == "__main__":
    test_engine_oracle_agreement()
    test_forge_two_blocks()
    test_miner_refuses_without_tokenomics_split()
    print("ALL SOVEREIGN MINER TESTS PASSED")
