"""secp256k1.py — minimal secp256k1 for the Genesis Fork transaction engine.

Curve arithmetic, RFC6979 deterministic signing (low-S), strict DER
encoding, and verification. Pure Python, stdlib only.
"""
import hashlib

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
G = (Gx, Gy)


def _inv(a, p):
    return pow(a, p - 2, p)


def _add(p1, p2):
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0:
            return None
        lam = (3 * x1 * x1) * _inv(2 * y1, P) % P
    else:
        lam = (y2 - y1) * _inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)


def _mul(k, pt=G):
    r = None
    while k:
        if k & 1:
            r = _add(r, pt)
        pt = _add(pt, pt)
        k >>= 1
    return r


def priv_to_pub(d):
    """Private key -> (x, y) point."""
    if not 1 <= d < N:
        raise ValueError("bad private key")
    return _mul(d)


def compress(pt):
    x, y = pt
    return bytes([0x02 | (y & 1)]) + x.to_bytes(32, "big")


def decompress(pub):
    if len(pub) != 33 or pub[0] not in (0x02, 0x03):
        raise ValueError("bad compressed pubkey")
    x = int.from_bytes(pub[1:], "big")
    y = pow((pow(x, 3, P) + 7) % P, (P + 1) // 4, P)
    if (pub[0] == 0x03) != (y & 1):
        y = P - y
    return (x, y)


def _rfc6979(priv, h):
    bx = priv.to_bytes(32, "big")
    v = b"\x01" * 32
    k = b"\x00" * 32
    k = hashlib.sha256(k + v + b"\x00" + bx + h).digest()
    v = hashlib.sha256(k + v).digest()
    k = hashlib.sha256(k + v + b"\x01" + bx + h).digest()
    v = hashlib.sha256(k + v).digest()
    while True:
        v = hashlib.sha256(k + v).digest()
        cand = int.from_bytes(v, "big")
        if 1 <= cand < N:
            return cand
        k = hashlib.sha256(k + v + b"\x00").digest()
        v = hashlib.sha256(k + v).digest()


def der_encode(r, s):
    rb = r.to_bytes(32, "big").lstrip(b"\x00") or b"\x00"
    sb = s.to_bytes(32, "big").lstrip(b"\x00") or b"\x00"
    if rb[0] & 0x80:
        rb = b"\x00" + rb
    if sb[0] & 0x80:
        sb = b"\x00" + sb
    body = b"\x02" + bytes([len(rb)]) + rb + b"\x02" + bytes([len(sb)]) + sb
    return b"\x30" + bytes([len(body)]) + body


def der_decode(sig):
    """Strict DER parse -> (r, s). Raises ValueError on any deviation."""
    if len(sig) < 8 or sig[0] != 0x30:
        raise ValueError("bad DER prefix")
    if sig[1] != len(sig) - 2:
        raise ValueError("bad DER length")
    if sig[2] != 0x02:
        raise ValueError("bad DER r marker")
    lr = sig[3]
    if lr == 0 or lr > 33 or 4 + lr + 2 > len(sig):
        raise ValueError("bad DER r length")
    r = int.from_bytes(sig[4:4 + lr], "big")
    if sig[4 + lr] != 0x02:
        raise ValueError("bad DER s marker")
    ls = sig[5 + lr]
    if ls == 0 or ls > 33 or 6 + lr + ls != len(sig):
        raise ValueError("bad DER s length")
    s = int.from_bytes(sig[6 + lr:6 + lr + ls], "big")
    rb, sb = sig[4:4 + lr], sig[6 + lr:6 + lr + ls]
    # minimal encoding: no unnecessary leading zeros, no negative
    for b in (rb, sb):
        if b[0] & 0x80:
            raise ValueError("negative DER integer")
        if len(b) > 1 and b[0] == 0x00 and not (b[1] & 0x80):
            raise ValueError("non-minimal DER integer")
    if not (1 <= r < N and 1 <= s < N):
        raise ValueError("DER integer out of range")
    return r, s


def _sign_rs(priv, h):
    """RFC6979 deterministic sign -> (r, s), low-S normalized."""
    z = int.from_bytes(h, "big")
    while True:
        k = _rfc6979(priv, h)
        rx, _ = _mul(k)
        r = rx % N
        if r == 0:
            continue
        s = (_inv(k, N) * (z + r * priv)) % N
        if s == 0:
            continue
        if s > N // 2:
            s = N - s
        return r, s


def sign(priv, h):
    """RFC6979 deterministic sign -> 64-byte raw (r || s), low-S."""
    r, s = _sign_rs(priv, h)
    return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def sign_der(priv, h):
    """RFC6979 deterministic sign -> DER bytes, low-S normalized."""
    r, s = _sign_rs(priv, h)
    return der_encode(r, s)


def _verify_rs(pub, h, r, s):
    if not (1 <= r < N and 1 <= s < N):
        return False
    try:
        px, py = decompress(pub) if isinstance(pub, (bytes, bytearray)) else pub
    except (ValueError, TypeError):
        return False
    z = int.from_bytes(h, "big")
    w = _inv(s, N)
    pt = _add(_mul(z * w % N), _mul(r * w % N, (px, py)))
    return pt is not None and pt[0] % N == r


def verify(pub, sig, h):
    """Verify a 64-byte raw (r || s) signature. pub: 33-byte compressed.
    No low-S policy gate — consensus accepts both sides of the mirror
    (see the signing ceremony)."""
    if len(sig) != 64:
        return False
    r = int.from_bytes(sig[:32], "big")
    s = int.from_bytes(sig[32:], "big")
    return _verify_rs(pub, h, r, s)
