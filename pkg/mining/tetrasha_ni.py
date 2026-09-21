#!/usr/bin/env python3
"""TetraSHA-NI — SHA-NI-native 4-wide 128-round hash (Ω′ Δ18-SN).

Research/experimental. See TETRASHA_NI_DESIGN.md. Not consensus unless
Travis adopts it.

Every compression is SHA-256 (OpenSSL uses SHA-NI automatically where the
CPU flag exists). No SHA-512, no BLAKE2b — those are precisely the legs
SHA-NI cannot accelerate.
"""
import hashlib

ROUNDS = 128
WIDTH = 4  # "tetra"

_DOMAIN = b"TetraSHA-NI"
_INIT_TAG = b"TetraSHA-NI-INIT"
_FINAL_TAG = b"TetraSHA-NI-FINAL"

# Precomputed per-round, per-branch prefixes: salt_r || branch_byte
_PREFIXES = tuple(
    tuple(_DOMAIN + r.to_bytes(2, "little") + bytes([b])
          for b in range(WIDTH))
    for r in range(1, ROUNDS + 1)
)
_ROT = tuple(r % 32 for r in range(1, ROUNDS + 1))

_sha256 = hashlib.sha256


def tetrasha_ni(data: bytes, rounds: int = ROUNDS) -> bytes:
    """TetraSHA-NI(data) -> 32 bytes. Deterministic."""
    s = _sha256(_INIT_TAG + data).digest()
    s_int = int.from_bytes(s, "big")
    for r in range(rounds):
        pre = _PREFIXES[r]
        t = (int.from_bytes(_sha256(pre[0] + s).digest(), "big")
             ^ int.from_bytes(_sha256(pre[1] + s).digest(), "big")
             ^ int.from_bytes(_sha256(pre[2] + s).digest(), "big")
             ^ int.from_bytes(_sha256(pre[3] + s).digest(), "big"))
        s_int = t ^ s_int                      # feedforward
        s = s_int.to_bytes(32, "big")
        rb = _ROT[r]                           # round-dependent byte rotation
        if rb:
            s = s[rb:] + s[:rb]
            s_int = int.from_bytes(s, "big")
    return _sha256(_FINAL_TAG + s).digest()


def tetrasha_ni_batch(datas, rounds: int = ROUNDS):
    """Batched variant: rounds-outer, candidates-inner (matches kernel style)."""
    states = [_sha256(_INIT_TAG + d).digest() for d in datas]
    s_ints = [int.from_bytes(s, "big") for s in states]
    n = len(datas)
    for r in range(rounds):
        pre = _PREFIXES[r]
        rb = _ROT[r]
        for i in range(n):
            s = states[i]
            t = (int.from_bytes(_sha256(pre[0] + s).digest(), "big")
                 ^ int.from_bytes(_sha256(pre[1] + s).digest(), "big")
                 ^ int.from_bytes(_sha256(pre[2] + s).digest(), "big")
                 ^ int.from_bytes(_sha256(pre[3] + s).digest(), "big"))
            s_int = t ^ s_ints[i]
            s = s_int.to_bytes(32, "big")
            if rb:
                s = s[rb:] + s[:rb]
                s_int = int.from_bytes(s, "big")
            states[i] = s
            s_ints[i] = s_int
    return [_sha256(_FINAL_TAG + s).digest() for s in states]


def meets_difficulty(digest: bytes, zero_bytes: int) -> bool:
    return digest[:zero_bytes] == b"\x00" * zero_bytes


if __name__ == "__main__":
    import sys, time
    # --- determinism ---
    a = tetrasha_ni(b"sword legend pull magic kingdom artist stone destroy forget fire steel honey question:0")
    b = tetrasha_ni(b"sword legend pull magic kingdom artist stone destroy forget fire steel honey question:0")
    assert a == b, "non-deterministic!"
    # --- batch == single ---
    outs = tetrasha_ni_batch([b"alpha", b"beta", b"gamma"])
    assert outs[0] == tetrasha_ni(b"alpha") and outs[2] == tetrasha_ni(b"gamma"), "batch mismatch!"
    # --- avalanche ---
    import os
    flips = []
    base = b"A" * 48
    h0 = tetrasha_ni(base)
    for trial in range(20):
        mut = bytearray(base); mut[trial % 48] ^= 1 << (trial % 8)
        h1 = tetrasha_ni(bytes(mut))
        d = sum(bin(x ^ y).count("1") for x, y in zip(h0, h1))
        flips.append(d / 256)
    avg = sum(flips) / len(flips)
    print("determinism: OK  batch==single: OK  avalanche mean: %.1f%% (want ~50%%)" % (avg * 100))
    assert 0.40 <= avg <= 0.60, "diffusion suspect"
    # --- benchmark ---
    N = 300
    t0 = time.perf_counter()
    for _ in range(N):
        tetrasha_ni(b"benchmark input data for tetrasha-ni speed test")
    dt = time.perf_counter() - t0
    print("single-lane: %.0f H/s (%.0f us/hash)" % (N / dt, dt / N * 1e6))
    # batched
    B = 64
    datas = [b"batch %d" % i for i in range(B)]
    t0 = time.perf_counter()
    reps = 8
    for _ in range(reps):
        tetrasha_ni_batch(datas)
    dt = time.perf_counter() - t0
    print("batched(%d): %.0f H/s" % (B, B * reps / dt))
    print("ALL TETRASHA-NI CHECKS PASS")
