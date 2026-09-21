#!/usr/bin/env python3
"""TetraSHA-NI demo miner — EXPERIMENTAL, not consensus.

Mines the sovereign-style preimage f"{axiom}:{seed_hex}:{nonce}" with the
C-accelerated TetraSHA-NI hash. Proves the full mining loop end-to-end.
The canonical Ω′ Δ18 spec is untouched; adoption needs Travis's word.
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))

import tetrasha_ni_c as TSN

AXIOM = ("sword legend pull magic kingdom artist stone destroy forget "
         "fire steel honey question")


def _lane(args):
    daxiom, difficulty, lane, lanes = args
    target = b"\x00" * difficulty
    chunk = 4096
    r = 0
    while True:
        start = (r * lanes + lane) * chunk
        for i in range(chunk):
            nonce = start + i
            h = TSN.hash(("%s:%d" % (daxiom, nonce)).encode())
            if h[:difficulty] == target:
                return nonce, h.hex()
        r += 1


def mine(daxiom: str, difficulty: int, lanes: int = 1):
    import multiprocessing as mp
    t0 = time.time()
    with mp.Pool(lanes) as pool:
        for nonce, hhex in pool.imap_unordered(
                _lane, [(daxiom, difficulty, i, lanes) for i in range(lanes)]):
            dt = time.time() - t0
            pool.terminate()
            return nonce, hhex, dt
    raise RuntimeError("grind failed")


def verify(daxiom: str, nonce: int, difficulty: int) -> bool:
    h = TSN.hash(("%s:%d" % (daxiom, nonce)).encode())
    return h[:difficulty] == b"\x00" * difficulty


def main(argv=None):
    ap = argparse.ArgumentParser(description="TetraSHA-NI demo miner")
    ap.add_argument("--difficulty", type=int, default=3)
    ap.add_argument("--lanes", type=int, default=2)
    ap.add_argument("--seed-hex", default=None,
                    help="anchor seed hex (default: derived demo seed)")
    args = ap.parse_args(argv)

    if args.seed_hex:
        seed_hex = args.seed_hex
    else:
        import hashlib
        seed_hex = hashlib.pbkdf2_hmac(
            "sha512", AXIOM.encode(), b"EXCALIBUR-SOVEREIGN-GENESIS-v1",
            600_000, 32).hex()
        print("[*] demo seed derived (HPP-1, 600k iters)", flush=True)
    daxiom = "%s:%s" % (AXIOM, seed_hex)
    print("[*] mining TetraSHA-NI @ difficulty %d, %d lanes …" %
          (args.difficulty, args.lanes), flush=True)
    nonce, hhex, dt = mine(daxiom, args.difficulty, args.lanes)
    print("[*] FORGED nonce=%d hash=%s (%.1fs)" % (nonce, hhex, dt), flush=True)
    ok = verify(daxiom, nonce, args.difficulty)
    print("[*] verify: %s" % ("OK" if ok else "FAIL"), flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
