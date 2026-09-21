#!/usr/bin/env python3
"""EXS sovereign genesis grind on the Omega' D18 C port (Annunaki SHA-NI).

Same descriptor format and same thirteen-word verification as
pkg/genesis/sovereign_genesis.py; only the grind engine differs.
The Python kernel inside sovereign_genesis remains the consensus oracle:
every forged descriptor is re-verified through it before we report success.
"""
import json
import multiprocessing as mp
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))

from pkg.genesis.sovereign_genesis import (
    AXIOM, SEED_SALT, SEED_ITERATIONS, SEED_DKLEN,
    derive_seed, domain_axiom, verify_descriptor,
)
from pkg.mining.omegaprime_c import grind as c_grind

CHUNK = 1 << 20  # nonces per C call per lane


def _lane_worker(args):
    daxiom, difficulty, lane, lanes = args
    total = 0
    r = 0
    while True:
        start = (r * lanes + lane) * CHUNK
        hit = c_grind(daxiom, start, CHUNK, difficulty)
        total += CHUNK
        if hit is not None:
            return (hit[0], hit[1].hex(), total)
        r += 1


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    difficulty = int(argv[0]) if len(argv) > 0 else 4
    lanes = int(argv[1]) if len(argv) > 1 else 2
    descriptor = argv[2] if len(argv) > 2 else "sovereign_genesis_exs.json"

    assert len(AXIOM.split()) == 13
    print("[*] deriving 256-bit anchor seed (HPP-1: 600k PBKDF2-HMAC-SHA512)...",
          flush=True)
    t0 = time.time()
    seed = derive_seed(AXIOM)
    print("[*] seed: %s (%.1fs)" % (seed.hex(), time.time() - t0), flush=True)

    daxiom = domain_axiom(AXIOM, seed)
    print("[*] grinding Omega' D18 (C port, Annunaki SHA-NI) genesis "
          "@ difficulty %d zero bytes, %d lanes ..." % (difficulty, lanes),
          flush=True)
    t0 = time.time()
    with mp.Pool(lanes) as pool:
        args = [(daxiom, difficulty, i, lanes) for i in range(lanes)]
        for nonce, fhash_hex, total in pool.imap_unordered(_lane_worker,
                                                           args):
            dt = time.time() - t0
            print("[*] lane won in %.1fs" % dt, flush=True)
            pool.terminate()
            break

    final_hash = bytes.fromhex(fhash_hex)
    print("[*] GENESIS FORGED: nonce=%d hash=%s (c-engine, %.1fs)"
          % (nonce, fhash_hex, dt), flush=True)

    desc = {
        "protocol": "Excalibur $EXS — sovereign genesis hard fork",
        "spec_refs": ["PROTOCOL_QUICK_REFERENCE.md",
                      "TETRA_POW_ENHANCEMENT.md",
                      "ARCHITECTURE.md"],
        "height": 0,
        "prev": "00" * 32,
        "axiom": AXIOM,
        "axiom_words": 13,
        "seed_derivation": {
            "kdf": "PBKDF2-HMAC-SHA512",
            "salt": SEED_SALT.decode(),
            "iterations": SEED_ITERATIONS,
            "dklen": SEED_DKLEN,
            "seed_hex": seed.hex(),
            "security_note": ("256-bit classical / 128-bit quantum (Grover) "
                              "preimage strength; axiom public by design — "
                              "the seed is a commitment, not a secret"),
        },
        "pow": {
            "algorithm": "Ω′ Δ18 (128-round unrolled nonlinear hash)",
            "engine": ("omegaprime_d18 C port: OpenSSL SHA-512 + Annunaki "
                       "hand-rolled SHA-NI SHA-256 + vendored BLAKE2b; "
                       "byte-identical to the Python consensus oracle"),
            "preimage": 'f"{axiom}:{seed_hex}:{nonce}"',
            "difficulty_zero_bytes": difficulty,
            "nonce": nonce,
            "final_hash": fhash_hex,
            "hashes": total,
        },
        "timestamp": int(time.time()),
        "supply_note": "no premine: genesis forge pays no one",
    }
    with open(descriptor, "w") as f:
        json.dump(desc, f, indent=2)
    print("[*] wrote %s" % descriptor, flush=True)
    print("[*] re-verifying from the thirteen words alone ...", flush=True)
    ok = verify_descriptor(desc)
    print("genesis: %s" % ("SOVEREIGN — verified" if ok else "INVALID"),
          flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
