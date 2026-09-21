#!/usr/bin/env python3
"""
zero_sign.py — sign the 00000...0000 transaction.

The ceremony:
  Z  = 32 zero bytes — the null hash. Every coinbase input in every
       chain references it (prev txid 0000...0000); it is the void
       each chain spends to begin.
  D  = sha256d(Z) — the DOUBLE ZERO HASH. Used as private key material:
       d = int(D) mod n. Public by construction -> ceremonial, not secure.
  Sign m = Z with key d  ->  (r, s).
  The INVERSE on the other side of the critical line: ECDSA signatures
  come in mirror pairs (r, s) / (r, n-s), reflected across the critical
  line s = n/2. Bitcoin standardness (BIP-146) admits only low-S; the
  high-S twin is valid mathematics living on the other side.

Both signatures are verified in-code. Pure Python, deterministic,
reproducible. Symbolic act, real cryptography.
"""
import hashlib
import json

# ---------------------------------------------------------------- secp256k1
P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
G = (Gx, Gy)


def inv(a, m):
    return pow(a % m, m - 2, m)


def padd(p1, p2):
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0:
            return None
        lam = (3 * x1 * x1) * inv(2 * y1, P) % P  # doubling
    else:
        lam = (y2 - y1) * inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)


def pmul(k, pt=G):
    r = None
    while k:
        if k & 1:
            r = padd(r, pt)
        pt = padd(pt, pt)
        k >>= 1
    return r


def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


# ---------------------------------------------------------------- ECDSA (deterministic k, ceremony-grade)
def sign(msg: bytes, d: int):
    z = int.from_bytes(msg, "big")
    k = int.from_bytes(sha256d(d.to_bytes(32, "big") + msg), "big") % N
    assert 1 <= k < N
    R = pmul(k)
    r = R[0] % N
    assert r != 0
    s = inv(k, N) * (z + r * d) % N
    assert s != 0
    return r, s


def verify(msg: bytes, r: int, s: int, Q):
    if not (1 <= r < N and 1 <= s < N):
        return False
    z = int.from_bytes(msg, "big")
    w = inv(s, N)
    u1, u2 = z * w % N, r * w % N
    R = padd(pmul(u1), pmul(u2, Q))
    return R is not None and R[0] % N == r


# ---------------------------------------------------------------- ceremony
def main():
    print("=== signing the 00000...0000 transaction ===\n")

    Z = bytes(32)
    print(f"Z  (null hash)        : {Z.hex()}")

    D = sha256d(Z)
    print(f"D  (double zero hash) : {D.hex()}")
    print(f"D^-1 (byte-inverse)  : {D[::-1].hex()}")

    d = int.from_bytes(D, "big") % N
    assert 1 <= d < N, "degenerate key (won't happen)"
    Q = pmul(d)
    prefix = "03" if Q[1] & 1 else "02"
    print(f"d  (key = int(D)%n)   : {d:064x}")
    print(f"Q  (pubkey)          : {prefix}{Q[0]:064x}")
    print("     ^ public by construction — ceremonial signature, not secure\n")

    # sign the zero hash with the double-zero-hash key
    r, s = sign(Z, d)
    slow = s if s <= N // 2 else N - s   # canonical low-S
    shigh = N - slow                      # mirror across s = n/2
    print(f"sig (r, s_low)  : r={r:064x}\n"
          f"                    s={slow:064x}   (s <= n/2: canonical side)")
    print(f"sig (r, s_high) : r={r:064x}\n"
          f"                    s={shigh:064x}   (s >  n/2: other side)")

    ok_low = verify(Z, r, slow, Q)
    ok_high = verify(Z, r, shigh, Q)
    print(f"\nverify (r, s_low)  : {ok_low}")
    print(f"verify (r, s_high) : {ok_high}")
    assert ok_low and ok_high, "signature verification failed"

    print("\ncritical line: s = n/2")
    print(f"  s_low  {'<=' if slow <= N // 2 else '>'} n/2  (this side)")
    print(f"  s_high {'>' if shigh > N // 2 else '<='} n/2  (other side)")
    print("  both verify: the signature and its inverse, mirrored.")

    artifact = {
        "ceremony": "sign the 00000...0000 transaction",
        "Z_null_hash": Z.hex(),
        "D_double_zero_hash": D.hex(),
        "D_byte_inverse": D[::-1].hex(),
        "private_key_d_hex": f"{d:064x}",
        "public_key_compressed": f"{prefix}{Q[0]:064x}",
        "message_signed": Z.hex(),
        "r": f"{r:064x}",
        "s_low": f"{slow:064x}",
        "s_high": f"{shigh:064x}",
        "critical_line": "s = n/2",
        "verify_low": ok_low,
        "verify_high": ok_high,
        "note": "key is sha256d(zeros): public by construction. "
                "Ceremonial, not secure. Real ECDSA math throughout.",
    }
    with open("zero_signature.json", "w") as f:
        json.dump(artifact, f, indent=2)
    print("\nartifact -> zero_signature.json")
    print("DONE")


if __name__ == "__main__":
    main()
