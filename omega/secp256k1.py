"""omega.secp256k1 -- secp256k1 field and group arithmetic (stdlib only).

Reference implementation for the ExcalOmega security rebuild. Pure
Python, standard library only (``hashlib``). It follows the structure
of the BIP-340 reference code and the fork's own pure-Python secp256k1
(``~/workspace/secp256k1.py``, read as reference only; this file is
written fresh for the rebuild).

NOT constant-time and NOT optimised. It exists so that BIP-340/341
behaviour can be pinned against the official test vectors before any
production claim is made. Do not use it to hold real funds.
"""

import hashlib

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
G = (Gx, Gy)

# The NUMS ("nothing up my sleeve") internal key from BIP-341:
# H = lift_x(0x50929b74...), the SHA-256 of the standard uncompressed
# encoding of G, used as an X coordinate. Its discrete logarithm is
# unknown, so a key path built on it cannot be spent. See
# omega.htlc.NUMS_INTERNAL_KEY and the test that re-derives it.
NUMS_INTERNAL_KEY_X = bytes.fromhex(
    "50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0"
)


def inv(a, mod):
    """Modular inverse via Fermat (mod must be prime, a != 0 mod mod)."""
    return pow(a % mod, mod - 2, mod)


def is_infinite(point):
    return point is None


def has_even_y(point):
    if point is None:
        raise ValueError("point at infinity has no y coordinate")
    return point[1] % 2 == 0


def point_add(p1, p2):
    """Add two curve points (None = point at infinity)."""
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0:
            return None
        lam = (3 * x1 * x1) * inv(2 * y1, P) % P
    else:
        lam = (y2 - y1) * inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)


def point_mul(k, point=G):
    """Scalar multiplication by double-and-add in Jacobian coordinates.

    Jacobian coordinates avoid a modular inversion per point addition
    (affine double-and-add needs one per add); only a single
    inversion is needed to convert back to affine at the end.
    """
    if k < 0:
        raise ValueError("negative scalar")
    if k == 0 or point is None:
        return None
    result = (0, 0, 0)  # Jacobian infinity (Z == 0)
    addend = (point[0], point[1], 1)
    while k:
        if k & 1:
            result = _jacobian_add(result, addend)
        addend = _jacobian_double(addend)
        k >>= 1
    return _to_affine(result)


def _jacobian_double(point):
    x, y, z = point
    if z == 0 or y == 0:
        return (0, 0, 0)
    s = 4 * x * y * y % P
    m = 3 * x * x % P  # curve parameter a == 0
    x3 = (m * m - 2 * s) % P
    y3 = (m * (s - x3) - 8 * y * y * y * y) % P
    z3 = 2 * y * z % P
    return (x3, y3, z3)


def _jacobian_add(p1, p2):
    x1, y1, z1 = p1
    x2, y2, z2 = p2
    if z1 == 0:
        return p2
    if z2 == 0:
        return p1
    z1z1 = z1 * z1 % P
    z2z2 = z2 * z2 % P
    u1 = x1 * z2z2 % P
    u2 = x2 * z1z1 % P
    s1 = y1 * z2 * z2z2 % P
    s2 = y2 * z1 * z1z1 % P
    if u1 == u2:
        if s1 != s2:
            return (0, 0, 0)
        return _jacobian_double(p1)
    h = (u2 - u1) % P
    i = (2 * h) ** 2 % P
    j = h * i % P
    r = 2 * (s2 - s1) % P
    v = u1 * i % P
    x3 = (r * r - j - 2 * v) % P
    y3 = (r * (v - x3) - 2 * s1 * j) % P
    z3 = ((z1 + z2) ** 2 - z1z1 - z2z2) * h % P
    return (x3, y3, z3)


def _to_affine(point):
    x, y, z = point
    if z == 0:
        return None
    zinv = inv(z, P)
    zinv2 = zinv * zinv % P
    return (x * zinv2 % P, y * zinv2 * zinv % P)


def lift_x(x):
    """Return the point with x-coordinate x and even y, or None.

    Fails (returns None) when x >= p or when x is not the x-coordinate
    of any curve point, exactly as specified by BIP-340.
    """
    if x >= P:
        return None
    c = (pow(x, 3, P) + 7) % P
    y = pow(c, (P + 1) // 4, P)
    if pow(y, 2, P) != c:
        return None
    if y % 2 != 0:
        y = P - y
    return (x, y)


def bytes_from_point(point):
    """32-byte big-endian encoding of a point's x-coordinate."""
    return point[0].to_bytes(32, "big")


def tagged_hash(tag, msg):
    """BIP-340/341 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || msg)."""
    tag_hash = hashlib.sha256(tag.encode("ascii")).digest()
    return hashlib.sha256(tag_hash + tag_hash + msg).digest()
