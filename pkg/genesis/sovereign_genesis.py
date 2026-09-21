"""Excalibur $EXS — Sovereign Genesis (13-word taproot hard fork).

Built off the Excalibur-EXS repo specs (PROTOCOL_QUICK_REFERENCE.md,
TETRA_POW_ENHANCEMENT.md, ARCHITECTURE.md) — NOT the GSF/genesis_fork chain.

The taproot
-----------
The 13-word AXIOM (published in PROTOCOL_QUICK_REFERENCE.md):
    sword legend pull magic kingdom artist stone destroy forget fire steel honey question
Every forge hash in the EXS protocol is already rooted in it
(`initial_state = f"{axiom}:{nonce}"`). The sovereign genesis makes that
root explicit and binds it into every block's proof-of-work.

The 256-bit anchor seed
-----------------------
    seed = PBKDF2-HMAC-SHA512(password=axiom_utf8,
                              salt=b"EXCALIBUR-SOVEREIGN-GENESIS-v1",
                              iterations=600_000, dklen=32)
The KDF is HPP-1 — the repo's own "quantum hardening" primitive. Honest
reading: 600k iterations raise *classical* brute-force cost; Grover still
halves preimage strength, so the seed carries 256-bit classical / 128-bit
quantum preimage security. The axiom is public by design — the seed is a
*commitment*, not a secret. Anyone who knows the thirteen words recomputes
the seed and proves this is the sovereign genesis.

Seed-anchored proof-of-work
---------------------------
Every block (genesis included) is mined over the domain-separated preimage
    f"{axiom}:{seed_hex}:{nonce}"
through the unmodified Ω′ Δ18 kernel (128 rounds, sha512/sha256/blake2b
fusion). Same kernel, same rounds — the seed only domain-separates the
chain. Verification needs nothing but the thirteen words.

Genesis block (height 0)
------------------------
    { height: 0, prev: 32 zero bytes, axiom, seed, kdf params,
      difficulty (leading zero bytes), nonce, final_hash, timestamp }
No premine: the genesis forge pays no one; supply begins with mined forges.

Usage
-----
    python3 pkg/genesis/sovereign_genesis.py --selftest
        full pipeline at low difficulty (proves every check; minutes)
    python3 pkg/genesis/sovereign_genesis.py --genesis --difficulty 4
        grind the real genesis (spec difficulty; hours — run in background)
    python3 pkg/genesis/sovereign_genesis.py --verify --descriptor FILE
        anyone-can-verify from the thirteen words alone
"""

import argparse
import hashlib
import json
import os
import sys
import time

# Run as `python3 pkg/genesis/sovereign_genesis.py`: put the repo root
# (parent dir of `pkg`) on sys.path so `pkg.mining...` imports resolve.
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from pkg.mining.tetrapow_dice_universal import UniversalMiningKernel

# The published 13-word AXIOM — the taproot of the sovereign genesis.
AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
assert len(AXIOM.split()) == 13, "axiom must be exactly 13 words"

SEED_SALT = b"EXCALIBUR-SOVEREIGN-GENESIS-v1"
SEED_ITERATIONS = 600_000
SEED_DKLEN = 32


def derive_seed(axiom: str) -> bytes:
    """256-bit sovereign anchor seed. Public, deterministic, verifiable."""
    return hashlib.pbkdf2_hmac(
        "sha512",
        axiom.encode("utf-8"),
        SEED_SALT,
        SEED_ITERATIONS,
        SEED_DKLEN,
    )


def domain_axiom(axiom: str, seed: bytes) -> str:
    """Seed-domain-separated mining preimage root."""
    return f"{axiom}:{seed.hex()}"


def _lane_worker(args):
    """One grind lane: disjoint contiguous chunks, round-robin across lanes."""
    daxiom, difficulty, lane, lanes, batch_size, chunk = args
    kernel = UniversalMiningKernel(batch_size=batch_size)
    target = b"\x00" * difficulty
    r = 0
    total = 0
    while True:
        start = (r * lanes + lane) * chunk
        results = kernel.fused_hash_computation(daxiom, start, chunk, rounds=128)
        for n, final_hash, _ in results:
            if final_hash[:difficulty] == target:
                return (n, final_hash.hex(), total)
            total += 1
        r += 1


def mine_parallel(daxiom: str, difficulty: int, lanes: int, batch_size: int = 32):
    """Grind across `lanes` processes; first winner stops the rest."""
    import multiprocessing as mp

    chunk = batch_size * 64
    t0 = time.time()
    with mp.Pool(lanes) as pool:
        args = [(daxiom, difficulty, i, lanes, batch_size, chunk)
                for i in range(lanes)]
        for nonce, fhash, _ in pool.imap_unordered(_lane_worker, args):
            dt = time.time() - t0
            print("[*] lane won in %.1fs" % dt, flush=True)
            pool.terminate()
            return (nonce, bytes.fromhex(fhash), dt)
    raise RuntimeError("parallel grind failed")


def mine(kernel: UniversalMiningKernel, daxiom: str, difficulty: int,
         nonce_start: int = 0, max_attempts: int = 2**63,
         log_every: int = 200_000):
    """Grind the Ω′ Δ18 kernel until `difficulty` leading zero bytes."""
    target = b"\x00" * difficulty
    nonce = nonce_start
    t0 = time.time()
    total = 0
    while total < max_attempts:
        batch = min(kernel.batch_size * 64, max_attempts - total)
        results = kernel.fused_hash_computation(daxiom, nonce, batch, rounds=128)
        for n, final_hash, _ in results:
            if final_hash[:difficulty] == target:
                dt = time.time() - t0
                return (n, final_hash, total + 1, dt)
        nonce += batch
        total += batch
        if total % log_every < batch:
            dt = time.time() - t0
            print("  ... %d hashes (%.1f kH/s)" % (total, total / dt / 1000.0),
                  flush=True)
    raise RuntimeError("exhausted max_attempts=%d" % max_attempts)


def build_genesis(difficulty, batch_size=32, lanes=1):
    assert len(AXIOM.split()) == 13
    print("[*] deriving 256-bit anchor seed (HPP-1: 600k PBKDF2-HMAC-SHA512)…",
          flush=True)
    t0 = time.time()
    seed = derive_seed(AXIOM)
    print("[*] seed: %s (%.1fs)" % (seed.hex(), time.time() - t0), flush=True)

    daxiom = domain_axiom(AXIOM, seed)

    if lanes > 1:
        print("[*] grinding Ω′ Δ18 genesis @ difficulty %d zero bytes, %d lanes …"
              % (difficulty, lanes), flush=True)
        nonce, final_hash, dt = mine_parallel(daxiom, difficulty, lanes,
                                              batch_size)
        hashes = None
        rate_note = "parallel"
    else:
        kernel = UniversalMiningKernel(batch_size=batch_size)
        print("[*] grinding Ω′ Δ18 genesis @ difficulty %d zero bytes …"
              % difficulty, flush=True)
        nonce, final_hash, hashes, dt = mine(kernel, daxiom, difficulty)
        rate_note = "%.1f kH/s" % (hashes / dt / 1000.0)

    print("[*] GENESIS FORGED: nonce=%d hash=%s (%s, %.1fs)"
          % (nonce, final_hash.hex(), rate_note, dt), flush=True)

    desc = {
        "protocol": "Excalibur $EXS — sovereign genesis hard fork",
        "spec_refs": ["PROTOCOL_QUICK_REFERENCE.md",
                      "TETRA_POW_ENHANCEMENT.md",
                      "ARCHITECTURE.md"],
        "height": 0,
        "prev": "0000000000000000000000000000000000000000000000000000000000000000",
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
            "preimage": 'f"{axiom}:{seed_hex}:{nonce}"',
            "difficulty_zero_bytes": difficulty,
            "nonce": nonce,
            "final_hash": final_hash.hex(),
            "hashes": hashes,
        },
        "timestamp": int(time.time()),
        "supply_note": "no premine: genesis forge pays no one",
    }
    return desc


def verify_descriptor(desc):
    ok = True

    def check(name, cond, detail=""):
        print("  [%s] %s %s" % ("PASS" if cond else "FAIL", name, detail),
              flush=True)
        return cond

    words = desc["axiom"].split()
    ok &= check("axiom is exactly 13 words", len(words) == 13,
                "(%d)" % len(words))
    ok &= check("axiom matches published taproot", desc["axiom"] == AXIOM)

    seed = derive_seed(desc["axiom"])
    ok &= check("seed == HPP-1(axiom)",
                seed.hex() == desc["seed_derivation"]["seed_hex"])

    daxiom = domain_axiom(desc["axiom"], seed)
    kernel = UniversalMiningKernel(batch_size=32)
    nonce = desc["pow"]["nonce"]
    res = kernel.fused_hash_computation(daxiom, nonce, 1, rounds=128)
    _, final_hash, _ = res[0]
    ok &= check("final_hash recomputes from axiom+seed+nonce",
                final_hash.hex() == desc["pow"]["final_hash"])

    d = desc["pow"]["difficulty_zero_bytes"]
    ok &= check("genesis meets difficulty (%d zero bytes)" % d,
                final_hash[:d] == b"\x00" * d)
    ok &= check("prev is 32 zero bytes (true genesis)",
                desc["prev"] == "0000000000000000000000000000000000000000000000000000000000000000")
    ok &= check("height is 0", desc["height"] == 0)
    return ok


def selftest():
    print("sovereign genesis selftest (difficulty 2, ~minutes)", flush=True)
    desc = build_genesis(difficulty=2, batch_size=16)
    assert verify_descriptor(desc), "self-verification failed"

    bad = dict(desc)
    bad["axiom"] = " ".join(reversed(desc["axiom"].split()))
    assert not verify_descriptor(bad), "tampered axiom verified?!"
    print("selftest: ALL PASS (tampered axiom correctly FAILS)", flush=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description="EXS sovereign genesis")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--genesis", action="store_true",
                    help="grind the real genesis descriptor")
    ap.add_argument("--difficulty", type=int, default=4,
                    help="leading zero bytes (spec default: 4)")
    ap.add_argument("--lanes", type=int, default=1,
                    help="parallel grind lanes (processes)")
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--descriptor", default="sovereign_genesis_exs.json")
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args(argv)

    if args.selftest:
        selftest()
        return 0

    if args.verify:
        with open(args.descriptor) as f:
            desc = json.load(f)
        ok = verify_descriptor(desc)
        print("descriptor: %s" % ("VALID sovereign genesis" if ok else "INVALID"),
              flush=True)
        return 0 if ok else 1

    if args.genesis:
        desc = build_genesis(args.difficulty, args.batch_size, args.lanes)
        with open(args.descriptor, "w") as f:
            json.dump(desc, f, indent=2)
        print("[*] wrote %s" % args.descriptor, flush=True)
        print("[*] re-verifying from the thirteen words alone …", flush=True)
        ok = verify_descriptor(desc)
        print("genesis: %s" % ("SOVEREIGN — verified" if ok else "INVALID"),
              flush=True)
        return 0 if ok else 1

    ap.error("choose --selftest, --genesis, or --verify")


if __name__ == "__main__":
    sys.exit(main())
