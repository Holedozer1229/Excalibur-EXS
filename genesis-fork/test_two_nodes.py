#!/usr/bin/env python3
"""Two-node integrated EXCAL test: real excal.py processes, P2P sync,
reorg across divergent chains, RPC endpoints, restart persistence.

Phase 1: A mines 3 blocks (tag TESTA) and exits; B mines 5 (tag TESTB)
  and exits. Different coinbase tags fork the chains at genesis.
Phase 2: A restarts (stays up, --max-blocks 0, slow pace), dials B;
  B restarts too. A must sync B's 5 headers/blocks over P2P and reorg
  onto the heavier chain.
Phase 3: RPC endpoint checks + restart persistence on B.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def rpc(port, path):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}",
                                 timeout=10) as r:
        return json.load(r)


def wait_tip(port, height, timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            tip = rpc(port, "/tip")
            if tip["height"] >= height:
                return tip
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError(f"port {port} never reached height {height}")


def launch(datadir, p2p, rpcport, tag, max_blocks, pace, peer=None):
    cmd = [sys.executable, os.path.join(HERE, "excal.py"),
           "--datadir", datadir, "--p2p-port", str(p2p),
           "--rpc-port", str(rpcport), "--max-blocks", str(max_blocks),
           "--pace", str(pace), "--tag", tag]
    if peer:
        cmd += ["--peer", peer]
    logf = open(os.path.join(datadir, "test_stdout.log"), "a", buffering=1)
    return subprocess.Popen(cmd, stdout=logf, stderr=subprocess.STDOUT)


def main():
    da, db = tempfile.mkdtemp(prefix="exa_"), tempfile.mkdtemp(prefix="exb_")
    procs = []
    try:
        # Phase 1: mine divergent chains
        a = launch(da, 39444, 29445, "TESTA", 3, 0.2)
        assert a.wait(timeout=120) == 0, "A failed to mine 3"
        ta = rpc(29445, "/tip") if False else None  # A exited; read later
        b = launch(db, 39445, 29446, "TESTB", 5, 0.2)
        assert b.wait(timeout=120) == 0, "B failed to mine 5"
        print("Phase 1: A mined 3 (TESTA fork), B mined 5 (TESTB fork)")

        # Phase 2: restart both, A dials B, A must reorg onto B's chain
        a2 = launch(da, 39444, 29445, "TESTA", 0, 3600,
                    peer="127.0.0.1:39445")
        b2 = launch(db, 39445, 29446, "TESTB", 0, 3600)
        procs = [a2, b2]
        tb = wait_tip(29446, 5)
        h = tb["height"]  # B mines one more block on restart (max-blocks 0
        print(f"B tip: h={h} {tb['hash'][:16]}")  # mines immediately), so
        ta2 = wait_tip(29445, h)  # track its actual height, not a constant
        print(f"A tip after P2P sync: h={ta2['height']} {ta2['hash'][:16]}")
        assert ta2["hash"] == tb["hash"], \
            f"A did not converge: {ta2['hash'][:16]} vs {tb['hash'][:16]}"
        print("PASS reorg over P2P: A converged onto B's heavier chain")

        # RPC endpoints on A (/peers, /reorgs, /tips are {count, [...]} objs)
        peers = rpc(29445, "/peers")["peers"]
        assert any(p["tip_height"] == h for p in peers), peers
        print(f"PASS /peers: {peers}")
        reorgs = rpc(29445, "/reorgs")["reorgs"]
        assert len(reorgs) >= 1, reorgs
        print(f"PASS /reorgs: {len(reorgs)} recorded")
        tips = rpc(29445, "/tips")["tips"]
        print(f"PASS /tips: {len(tips)} branch tips")
        blk = rpc(29445, f"/block?height={h}")
        assert blk["hash"] == tb["hash"], f"wrong block at height {h}"
        print(f"PASS /block?height={h} matches B's tip")
        blk2 = rpc(29445, f"/block?hash={tb['hash']}")
        assert blk2["height"] == h
        print("PASS /block?hash=... resolves")

        # Phase 3: restart B; block h must persist byte-identical on disk
        # (B mines h+1 on restart, so check the persisted block, not tip)
        b2.terminate()
        b2.wait(timeout=20)
        procs.remove(b2)
        b3 = launch(db, 39445, 29446, "TESTB", 0, 3600)
        procs.append(b3)
        wait_tip(29446, h, timeout=60)
        persisted = rpc(29446, f"/block?height={h}")
        assert persisted["hash"] == tb["hash"], "block h changed across restart"
        print(f"PASS restart: B restored block {h} from disk")

        print("\nALL INTEGRATION TESTS PASS")
    finally:
        for p in procs:
            try:
                p.terminate()
                p.wait(timeout=15)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        shutil.rmtree(da, ignore_errors=True)
        shutil.rmtree(db, ignore_errors=True)


if __name__ == "__main__":
    main()
