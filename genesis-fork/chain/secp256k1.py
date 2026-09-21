#!/usr/bin/env python3
"""Pure-Python secp256k1: field/group arithmetic, ECDSA sign/verify.

No dependencies, no CLI, stdlib only. Used by the EXCAL testnet for real
transaction signatures. Cross-validated against coincurve in tests
(production path never imports it).

Curve: y^2 = x^3 + 7 over F_p, p = 2^256 - 2^32 - 977.
"""
import hashlib
import hmac

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
G = (Gx, Gy)
INF = None


def _inv(a: int, m: int) -> int:
    return pow(a % m, m - 2, m)


def _add(p1, p2):
    if p1 is INF:
        return p2
    if p2 is INF:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0:
            return INF
        lam = (3 * x1 * x1) * _inv(2 * y1, P) % P  # doubling
    else:
        lam = (y2 - y1) * _inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)


def _mul(k: int, point=G):
    k %= N
    res = INF
    addend = point
    while k:
        if k & 1:
            res = _add(res, addend)
        addend = _add(addend, addend)
        k >>= 1
    return res


def priv_to_pub(priv: int) -> tuple:
    """Return (x, y) for a private key int."""
    assert 1 <= priv < N
    return _mul(priv)


def compress(pt: tuple) -> bytes:
    x, y = pt
    return bytes([0x02 | (y & 1)]) + x.to_bytes(32, "big")


def decompress(comp: bytes) -> tuple:
    """33-byte compressed pubkey -> (x, y)."""
    assert len(comp) == 33 and comp[0] in (0x02, 0x03)
    x = int.from_bytes(comp[1:], "big")
    y2 = (pow(x, 3, P) + 7) % P
    y = pow(y2, (P + 1) // 4, P)  # p = 3 (mod 4)
    if (y & 1) != (comp[0] & 1):
        y = P - y
    assert (y * y - x * x * x - 7) % P == 0, "point not on curve"
    return (x, y)


def _rfc6979(priv: int, h: bytes) -> int:
    """Deterministic nonce k per RFC 6979 (HMAC-SHA256)."""
    assert len(h) == 32
    bx = priv.to_bytes(32, "big") + h
    v = b"\x01" * 32
    k = b"\x00" * 32
    k = hmac.new(k, v + b"\x00" + bx, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    k = hmac.new(k, v + b"\x01" + bx, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    while True:
        v = hmac.new(k, v, hashlib.sha256).digest()
        cand = int.from_bytes(v, "big")
        if 1 <= cand < N:
            return cand
        k = hmac.new(k, v + b"\x00", hashlib.sha256).digest()
        v = hmac.new(k, v, hashlib.sha256).digest()


def sign(priv: int, h: bytes) -> bytes:
    """ECDSA sign of 32-byte hash; returns 64-byte (r || s), low-S."""
    assert len(h) == 32
    z = int.from_bytes(h, "big")
    while True:
        k = _rfc6979(priv, h)
        r = _mul(k)[0] % N
        if r == 0:
            continue
        s = (_inv(k, N) * (z + r * priv)) % N
        if s == 0:
            continue
        if s > N // 2:  # low-S
            s = N - s
        return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def verify(pub: tuple, sig: bytes, h: bytes) -> bool:
    """ECDSA verify of 64-byte (r || s) against 32-byte hash."""
    try:
        if len(sig) != 64 or len(h) != 32 or pub is INF:
            return False
        r = int.from_bytes(sig[:32], "big")
        s = int.from_bytes(sig[32:], "big")
        if not (1 <= r < N and 1 <= s < N):
            return False
        z = int.from_bytes(h, "big")
        w = _inv(s, N)
        u1 = (z * w) % N
        u2 = (r * w) % N
        pt = _add(_mul(u1), _mul(u2, pub))
        if pt is INF:
            return False
        return pt[0] % N == r
    except Exception:
        return False


def self_test() -> None:
    # generator vector: privkey 1 -> known compressed pubkey
    assert compress(priv_to_pub(1)).hex() == \
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    import os
    for _ in range(5):
        d = int.from_bytes(os.urandom(32), "big") % (N - 1) + 1
        pub = priv_to_pub(d)
        h = hashlib.sha256(os.urandom(32)).digest()
        sig = sign(d, h)
        assert verify(pub, sig, h), "round-trip failed"
        assert not verify(pub, sig, hashlib.sha256(b"tamper").digest())
        # low-S enforced
        assert int.from_bytes(sig[32:], "big") <= N // 2
    # decompress round-trip
    pt = priv_to_pub(0xDEADBEEF)
    assert decompress(compress(pt)) == pt
    print("secp256k1 self-test OK")


if __name__ == "__main__":
    self_test()
