#!/usr/bin/env python3
"""Mainnet smoke test: mine 2 blocks on mainnet params in a temp dir,
validate block 1 (bits, time, PoW, lineage), restart, verify persistence."""
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from genesis_fork import (use_network, PARAMS, verify_genesis, bits_to_target,
                          sha256d, ser_header)
from chainstate import ChainState


def rpc(port, path, timeout=10):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}",
                                 timeout=timeout) as r:
        return json.load(r)


def main():
    P = use_network("mainnet")
    assert P["ticker"] == "GSF" and P["magic"] == 0x4753466B
    assert P["p2p_port"] == 18444 and P["rpc_port"] == 18445
    assert P["init_bits"] == 0x1e100000
    gh = verify_genesis()
    assert gh.hex() == "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
    print("mainnet params + shared genesis OK", flush=True)

    d = tempfile.mkdtemp(prefix="mainnet_smoke_")
    # use distinct ports to avoid clashing with the live launch later
    cmd = [sys.executable, os.path.join(HERE, "excal.py"),
           "--network", "mainnet", "--datadir", d,
           "--p2p-port", "19444", "--rpc-port", "19445",
           "--max-blocks", "2", "--pace", "1", "--tag", "SMOKE"]
    logf = open(os.path.join(d, "out.log"), "w", buffering=1)
    p = subprocess.Popen(cmd, stdout=logf, stderr=subprocess.STDOUT)
    assert p.wait(timeout=300) == 0, "smoke miner failed"
    print("mined 2 mainnet blocks", flush=True)

    cs = ChainState(d, net="mainnet").load()
    tip = cs.tip()
    assert tip["height"] == 2, tip
    # fetch block 1 record from index (walk back from tip)
    h2 = cs.index[bytes.fromhex(tip["hash"])]
    h1_hash = h2["prev"]
    b1 = cs.index[h1_hash]
    assert b1["height"] == 1
    assert b1["bits"] == 0x1e100000, hex(b1["bits"])
    now = int(time.time())
    assert b1["time"] >= now - 600, (b1["time"], now)  # wall-clock anchored
    assert b1["time"] <= now + 7200
    # PoW: header hash <= target
    hdr = ser_header(b1["version"], b1["prev"], b1["merkle"],
                     b1["time"], b1["bits"], b1["nonce"])
    assert sha256d(hdr)[::-1] == b1["hash"], "hash mismatch"
    assert int.from_bytes(sha256d(hdr), "big") <= bits_to_target(b1["bits"])
    # coinbase lineage: first push == LE(bits)
    from txscript import parse_tx
    cb = parse_tx(b1["txs"][0])
    script = cb["vin"][0]["script"]
    assert script[0] == 4 and script[1:5] == b1["bits"].to_bytes(4, "little"), \
        "lineage push wrong"
    print(f"block 1 OK: bits=0x1e100000 time={b1['time']} "
          f"hash={b1['hash'].hex()[:16]} lineage=LE(bits)", flush=True)

    # restart persistence: relaunch, tip must still be 2 with same hash
    logf2 = open(os.path.join(d, "out2.log"), "w", buffering=1)
    p2 = subprocess.Popen(
        [sys.executable, os.path.join(HERE, "excal.py"),
         "--network", "mainnet", "--datadir", d,
         "--p2p-port", "19444", "--rpc-port", "19445",
         "--max-blocks", "0", "--pace", "3600", "--tag", "SMOKE"],
        stdout=logf2, stderr=subprocess.STDOUT)
    try:
        t0 = time.time()
        t2 = None
        while time.time() - t0 < 60:
            try:
                t2 = rpc(19445, "/tip", timeout=5)
                break
            except Exception:
                time.sleep(1)
        assert t2 and t2["height"] >= 2 and t2["hash"] == tip["hash"], t2
        print(f"restart OK: tip h={t2['height']} {t2['hash'][:16]}", flush=True)
    finally:
        p2.terminate()
        try:
            p2.wait(timeout=20)
        except Exception:
            p2.kill()
    print("MAINNET SMOKE PASS", flush=True)


if __name__ == "__main__":
    main()
