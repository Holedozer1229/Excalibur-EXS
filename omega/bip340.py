"""omega.bip340 -- BIP-340 Schnorr signatures over secp256k1.

Faithful transcription of the BIP-340 specification (algorithms
``PubKey``, ``Sign`` and ``Verify``), implemented on top of
:mod:`omega.secp256k1`. Standard library only.

Security notes:
- This is a reference implementation. It is not constant-time and
  must not be used to hold real funds without independent review.
- ``sign`` takes explicit 32-byte auxiliary randomness ``aux_rand``.
  Callers that need randomised signing must supply fresh output from
  a CSPRNG; passing all-zero ``aux_rand`` is deterministic and is
  what the official test vectors use.
- The message is hashed exactly as given. It is never reduced
  modulo p or n (BIP-340 test vector 3 pins this).
"""

from .secp256k1 import (
    G,
    N,
    P,
    bytes_from_point,
    has_even_y,
    lift_x,
    point_add,
    point_mul,
    tagged_hash,
)


class InvalidKeyError(ValueError):
    """Raised when a secret key is outside the range 1..n-1."""


def pubkey_gen(seckey):
    """BIP-340 ``PubKey(sk)``: 32-byte x-only public key.

    ``seckey`` is 32 bytes. Raises :class:`InvalidKeyError` when
    ``int(seckey)`` is 0 or >= n. The returned key is the x-coordinate
    of ``d*G``; the corresponding point is the even-y lift of that
    x-coordinate, so the effective secret key may be ``n - d``.
    """
    if len(seckey) != 32:
        raise InvalidKeyError("secret key must be 32 bytes")
    d = int.from_bytes(seckey, "big")
    if not 1 <= d <= N - 1:
        raise InvalidKeyError("secret key must be in the range 1..n-1")
    return bytes_from_point(point_mul(d, G))


def sign(msg, seckey, aux_rand):
    """BIP-340 ``Sign(sk, m)`` with explicit auxiliary randomness.

    ``msg`` is hashed as given (any length, including empty).
    ``aux_rand`` must be exactly 32 bytes. Returns the 64-byte
    signature ``bytes(R) || bytes((k + e*d) mod n)``. Raises
    :class:`InvalidKeyError` for an out-of-range secret key and
    ``RuntimeError`` if the produced signature does not verify
    (which must never happen for a correct implementation).
    """
    if len(aux_rand) != 32:
        raise ValueError("auxiliary randomness must be 32 bytes")
    d = int.from_bytes(seckey, "big")
    if not 1 <= d <= N - 1:
        raise InvalidKeyError("secret key must be in the range 1..n-1")
    point = point_mul(d, G)
    if not has_even_y(point):
        d = N - d
    t = bytes(d.to_bytes(32, "big")[i] ^ tagged_hash("BIP0340/aux", aux_rand)[i]
            for i in range(32))
    rand = tagged_hash("BIP0340/nonce", t + bytes_from_point(point) + msg)
    k = int.from_bytes(rand, "big") % N
    if k == 0:
        raise RuntimeError("nonce is zero (negligibly unlikely)")
    r_point = point_mul(k, G)
    if not has_even_y(r_point):
        k = N - k
    e = int.from_bytes(
        tagged_hash(
            "BIP0340/challenge",
            bytes_from_point(r_point) + bytes_from_point(point) + msg,
        ),
        "big",
    ) % N
    sig = bytes_from_point(r_point) + ((k + e * d) % N).to_bytes(32, "big")
    if not verify(msg, bytes_from_point(point), sig):
        raise RuntimeError("generated signature failed self-verification")
    return sig


def verify(msg, pubkey, sig):
    """BIP-340 ``Verify(pk, m, sig)``. Returns True/False, never raises.

    Fails closed on: wrong lengths, public key not on the curve,
    ``r >= p``, ``s >= n``, infinite ``s*G - e*P``, odd-y ``R``,
    or ``x(R) != r``.
    """
    if len(pubkey) != 32 or len(sig) != 64:
        return False
    point = lift_x(int.from_bytes(pubkey, "big"))
    if point is None:
        return False
    r = int.from_bytes(sig[0:32], "big")
    if r >= P:
        return False
    s = int.from_bytes(sig[32:64], "big")
    if s >= N:
        return False
    e = int.from_bytes(
        tagged_hash("BIP0340/challenge", sig[0:32] + pubkey + msg), "big"
    ) % N
    r_point = point_add(point_mul(s, G), point_mul(N - e, point))
    if r_point is None:
        return False
    if not has_even_y(r_point):
        return False
    return bytes_from_point(r_point) == sig[0:32]
