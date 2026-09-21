#!/usr/bin/env python3
"""ML-DSA-65 (FIPS 204) in pure Python, stdlib only.

Deterministic internal interface (matches the reference implementation's
``*_internal`` API with the pure-ML-DSA domain separator)::

    keygen(seed: 32 bytes) -> (pk: 1952 bytes, sk: 4032 bytes)
    sign(sk: bytes, msg: bytes, rnd: 32 bytes) -> sig: 3309 bytes
    verify(pk: bytes, msg: bytes, sig: bytes) -> bool

Domain separation is the FIPS 204 "pure" variant: the signed message is
``b"\\x00\\x00" + msg`` (empty context string).

This is a from-scratch implementation of FIPS 204 for the ML-DSA-65
parameter set, cross-checked bit-for-bit against Known-Answer Tests
generated from the pq-crystals/dilithium reference C code
(DILITHIUM_MODE=3); see test_mldsa.py. It is consensus code for the
GF-11 quantum-resistant hard fork: every rejection rule, packing layout,
and reduction is replicated exactly, including rejection-sampling loops.

NIST security category: 3 (192-bit classical security, quantum-resistant).
"""

import hashlib

# ---------------------------------------------------------------- parameters
Q = 8380417
D = 13
TAU = 49
GAMMA1 = 1 << 19
GAMMA2 = (Q - 1) // 32
K = 6
L = 5
ETA = 4
BETA = TAU * ETA
OMEGA = 55
N = 256

SEEDBYTES = 32
CRHBYTES = 64
TRBYTES = 64
CTILDEBYTES = 48

PK_BYTES = 1952
SK_BYTES = 4032
SIG_BYTES = 3309

_MPRE = b"\x00\x00"  # pure ML-DSA domain separator (empty ctx)

# NTT twiddle factors, plain (non-Montgomery) domain, extracted from the
# reference ntt.c zetas table as zetas_c[k] * 2^-32 mod q.
_ZETAS = [0, 4808194, 3765607, 3761513, 5178923, 5496691, 5234739, 5178987, 7778734, 3542485, 2682288, 2129892, 3764867, 7375178, 557458, 7159240, 5010068, 4317364, 2663378, 6705802, 4855975, 7946292, 676590, 7044481, 5152541, 1714295, 2453983, 1460718, 7737789, 4795319, 2815639, 2283733, 3602218, 3182878, 2740543, 4793971, 5269599, 2101410, 3704823, 1159875, 394148, 928749, 1095468, 4874037, 2071829, 4361428, 3241972, 2156050, 3415069, 1759347, 7562881, 4805951, 3756790, 6444618, 6663429, 4430364, 5483103, 3192354, 556856, 3870317, 2917338, 1853806, 3345963, 1858416, 3073009, 1277625, 5744944, 3852015, 4183372, 5157610, 5258977, 8106357, 2508980, 2028118, 1937570, 4564692, 2811291, 5396636, 7270901, 4158088, 1528066, 482649, 1148858, 5418153, 7814814, 169688, 2462444, 5046034, 4213992, 4892034, 1987814, 5183169, 1736313, 235407, 5130263, 3258457, 5801164, 1787943, 5989328, 6125690, 3482206, 4197502, 7080401, 6018354, 7062739, 2461387, 3035980, 621164, 3901472, 7153756, 2925816, 3374250, 1356448, 5604662, 2683270, 5601629, 4912752, 2312838, 7727142, 7921254, 348812, 8052569, 1011223, 6026202, 4561790, 6458164, 6143691, 1744507, 1753, 6444997, 5720892, 6924527, 2660408, 6600190, 8321269, 2772600, 1182243, 87208, 636927, 4415111, 4423672, 6084020, 5095502, 4663471, 8352605, 822541, 1009365, 5926272, 6400920, 1596822, 4423473, 4620952, 6695264, 4969849, 2678278, 4611469, 4829411, 635956, 8129971, 5925040, 4234153, 6607829, 2192938, 6653329, 2387513, 4768667, 8111961, 5199961, 3747250, 2296099, 1239911, 4541938, 3195676, 2642980, 1254190, 8368000, 2998219, 141835, 8291116, 2513018, 7025525, 613238, 7070156, 6161950, 7921677, 6458423, 4040196, 4908348, 2039144, 6500539, 7561656, 6201452, 6757063, 2105286, 6006015, 6346610, 586241, 7200804, 527981, 5637006, 6903432, 1994046, 2491325, 6987258, 507927, 7192532, 7655613, 6545891, 5346675, 8041997, 2647994, 3009748, 5767564, 4148469, 749577, 4357667, 3980599, 2569011, 6764887, 1723229, 1665318, 2028038, 1163598, 5011144, 3994671, 8368538, 7009900, 3020393, 3363542, 214880, 545376, 7609976, 3105558, 7277073, 508145, 7826699, 860144, 3430436, 140244, 6866265, 6195333, 3123762, 2358373, 6187330, 5365997, 6663603, 2926054, 7987710, 8077412, 3531229, 4405932, 4606686, 1900052, 7598542, 1054478, 7648983]

_INV256 = pow(256, Q - 2, Q)


def _xof128(data: bytes, outlen: int) -> bytes:
    return hashlib.shake_128(data).digest(outlen)


def _xof256(data: bytes, outlen: int) -> bytes:
    return hashlib.shake_256(data).digest(outlen)


# ------------------------------------------------------------------- NTT
def ntt(a):
    """Forward NTT, plain domain. Input/output: list of 256 ints."""
    a = [x % Q for x in a]
    k = 0
    length = 128
    while length:
        start = 0
        while start < N:
            k += 1
            zeta = _ZETAS[k]
            for j in range(start, start + length):
                t = (zeta * a[j + length]) % Q
                a[j + length] = (a[j] - t) % Q
                a[j] = (a[j] + t) % Q
            start += 2 * length
        length >>= 1
    return a


def invntt(a):
    """Inverse NTT, plain domain."""
    a = [x % Q for x in a]
    k = 256
    length = 1
    while length < N:
        start = 0
        while start < N:
            k -= 1
            zeta = (-_ZETAS[k]) % Q
            for j in range(start, start + length):
                t = a[j]
                a[j] = (t + a[j + length]) % Q
                a[j + length] = (zeta * (t - a[j + length])) % Q
            start += 2 * length
        length <<= 1
    return [(x * _INV256) % Q for x in a]


# ------------------------------------------------------------ reductions
def _reduce32(a: int) -> int:
    t = (a + (1 << 22)) >> 23
    return a - t * Q


def _center(a: int) -> int:
    a %= Q
    return a - Q if a > Q // 2 else a


def _power2round(a: int):
    a1 = (a + (1 << (D - 1)) - 1) >> D
    return a1, a - (a1 << D)


def _decompose(a: int):
    """a in [0, Q). Returns (a1 in [0,16), a0 centered)."""
    a1 = (a + 127) >> 7
    a1 = (a1 * 1025 + (1 << 21)) >> 22
    a1 &= 15
    a0 = a - a1 * 2 * GAMMA2
    if a0 > (Q - 1) // 2:
        a0 -= Q
    return a1, a0


def _make_hint(a0: int, a1: int) -> int:
    if a0 > GAMMA2 or a0 < -GAMMA2 or (a0 == -GAMMA2 and a1 != 0):
        return 1
    return 0


def _use_hint(a: int, hint: int) -> int:
    a1, a0 = _decompose(a)
    if hint == 0:
        return a1
    if a0 > 0:
        return (a1 + 1) & 15
    return (a1 - 1) & 15


def _chknorm_poly(poly, bound: int) -> bool:
    """True if any coefficient has |centered| >= bound (reject)."""
    for c in poly:
        v = _center(_reduce32(c))
        if v < 0:
            v = -v
        if v >= bound:
            return True
    return False


def _chknorm_vec(vec, bound: int) -> bool:
    return any(_chknorm_poly(p, bound) for p in vec)


# --------------------------------------------------------------- sampling
def _rej_ntt_poly(buf: bytes):
    """Parse a SHAKE128 stream into NTT-domain coefficients (maybe < 256)."""
    coeffs = []
    for pos in range(0, len(buf) - 2, 3):
        t = buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16)
        t &= 0x7FFFFF
        if t < Q:
            coeffs.append(t)
            if len(coeffs) == N:
                break
    return coeffs


def _expand_a(rho: bytes):
    a = []
    for i in range(K):
        row = []
        for j in range(L):
            nbytes = 840
            while True:
                coeffs = _rej_ntt_poly(_xof128(rho + bytes([j, i]), nbytes))
                if len(coeffs) == N:
                    row.append(coeffs)
                    break
                nbytes += 168
        a.append(row)
    return a


def _rej_bounded_eta(buf: bytes):
    coeffs = []
    for b in buf:
        t0 = b & 0x0F
        t1 = b >> 4
        if t0 < 9:
            coeffs.append(ETA - t0)
            if len(coeffs) == N:
                break
        if t1 < 9 and len(coeffs) < N:
            coeffs.append(ETA - t1)
            if len(coeffs) == N:
                break
    return coeffs


def _expand_s(rhoprime: bytes):
    s1, s2 = [], []
    for i in range(L):
        nbytes = 272
        while True:
            c = _rej_bounded_eta(_xof256(rhoprime + bytes([i, 0]), nbytes))
            if len(c) == N:
                s1.append(c)
                break
            nbytes += 136
    for i in range(K):
        nbytes = 272
        while True:
            c = _rej_bounded_eta(
                _xof256(rhoprime + bytes([L + i, 0]), nbytes))
            if len(c) == N:
                s2.append(c)
                break
            nbytes += 136
    return s1, s2


def _poly_uniform_gamma1(buf: bytes):
    """Map a SHAKE256 stream to mask coefficients in (-GAMMA1, GAMMA1]."""
    coeffs = []
    for i in range(0, len(buf) - 4, 5):
        t0 = buf[i] | (buf[i + 1] << 8) | ((buf[i + 2] & 0x0F) << 16)
        t1 = (buf[i + 2] >> 4) | (buf[i + 3] << 4) | (buf[i + 4] << 12)
        coeffs.append(GAMMA1 - t0)
        coeffs.append(GAMMA1 - t1)
        if len(coeffs) == N:
            break
    return coeffs


def _expand_mask(rhoprime: bytes, kappa: int):
    y = []
    for i in range(L):
        nonce = L * kappa + i
        buf = _xof256(rhoprime + bytes([nonce & 0xFF, nonce >> 8]), 680)
        y.append(_poly_uniform_gamma1(buf))
    return y


def _sample_in_ball(ctilde: bytes):
    buf = bytearray(_xof256(ctilde, 136))
    signs = int.from_bytes(bytes(buf[:8]), "little")
    pos = 8
    c = [0] * N
    for i in range(N - TAU, N):
        while True:
            if pos >= len(buf):
                have = len(buf)
                buf += _xof256(ctilde, have + 136)[have:]
            b = buf[pos]
            pos += 1
            if b <= i:
                break
        c[i] = c[b]
        c[b] = 1 - 2 * (signs & 1)
        signs >>= 1
    return c

# ---------------------------------------------------------------- packing
def _pack_t1(p):
    r = bytearray(320)
    for i in range(N // 4):
        c0, c1, c2, c3 = p[4 * i], p[4 * i + 1], p[4 * i + 2], p[4 * i + 3]
        r[5 * i] = c0 & 0xFF
        r[5 * i + 1] = ((c0 >> 8) | (c1 << 2)) & 0xFF
        r[5 * i + 2] = ((c1 >> 6) | (c2 << 4)) & 0xFF
        r[5 * i + 3] = ((c2 >> 4) | (c3 << 6)) & 0xFF
        r[5 * i + 4] = (c3 >> 2) & 0xFF
    return bytes(r)


def _unpack_t1(b):
    p = [0] * N
    for i in range(N // 4):
        p[4 * i] = (b[5 * i] | (b[5 * i + 1] << 8)) & 0x3FF
        p[4 * i + 1] = ((b[5 * i + 1] >> 2) | (b[5 * i + 2] << 6)) & 0x3FF
        p[4 * i + 2] = ((b[5 * i + 2] >> 4) | (b[5 * i + 3] << 4)) & 0x3FF
        p[4 * i + 3] = ((b[5 * i + 3] >> 6) | (b[5 * i + 4] << 2)) & 0x3FF
    return p


def _pack_t0(p):
    r = bytearray(416)
    for i in range(N // 8):
        t = [(1 << (D - 1)) - p[8 * i + j] for j in range(8)]
        o = 13 * i
        r[o] = t[0] & 0xFF
        r[o + 1] = ((t[0] >> 8) | (t[1] << 5)) & 0xFF
        r[o + 2] = (t[1] >> 3) & 0xFF
        r[o + 3] = ((t[1] >> 11) | (t[2] << 2)) & 0xFF
        r[o + 4] = ((t[2] >> 6) | (t[3] << 7)) & 0xFF
        r[o + 5] = (t[3] >> 1) & 0xFF
        r[o + 6] = ((t[3] >> 9) | (t[4] << 4)) & 0xFF
        r[o + 7] = (t[4] >> 4) & 0xFF
        r[o + 8] = ((t[4] >> 12) | (t[5] << 1)) & 0xFF
        r[o + 9] = ((t[5] >> 7) | (t[6] << 6)) & 0xFF
        r[o + 10] = (t[6] >> 2) & 0xFF
        r[o + 11] = ((t[6] >> 10) | (t[7] << 3)) & 0xFF
        r[o + 12] = (t[7] >> 5) & 0xFF
    return bytes(r)


def _unpack_t0(b):
    p = [0] * N
    for i in range(N // 8):
        o = 13 * i
        v = [0] * 8
        v[0] = (b[o] | (b[o + 1] << 8)) & 0x1FFF
        v[1] = ((b[o + 1] >> 5) | (b[o + 2] << 3) | (b[o + 3] << 11)) & 0x1FFF
        v[2] = ((b[o + 3] >> 2) | (b[o + 4] << 6)) & 0x1FFF
        v[3] = ((b[o + 4] >> 7) | (b[o + 5] << 1) | (b[o + 6] << 9)) & 0x1FFF
        v[4] = ((b[o + 6] >> 4) | (b[o + 7] << 4) | (b[o + 8] << 12)) & 0x1FFF
        v[5] = ((b[o + 8] >> 1) | (b[o + 9] << 7)) & 0x1FFF
        v[6] = ((b[o + 9] >> 6) | (b[o + 10] << 2) | (b[o + 11] << 10)) & 0x1FFF
        v[7] = ((b[o + 11] >> 3) | (b[o + 12] << 5)) & 0x1FFF
        for j in range(8):
            p[8 * i + j] = (1 << (D - 1)) - v[j]
    return p


def _pack_eta(p):
    r = bytearray(128)
    for i in range(N // 2):
        r[i] = (ETA - p[2 * i]) | ((ETA - p[2 * i + 1]) << 4)
    return bytes(r)


def _unpack_eta(b):
    p = [0] * N
    for i in range(N // 2):
        p[2 * i] = ETA - (b[i] & 0x0F)
        p[2 * i + 1] = ETA - (b[i] >> 4)
    return p


def _pack_z(p):
    r = bytearray(640)
    for i in range(N // 2):
        t0 = GAMMA1 - p[2 * i]
        t1 = GAMMA1 - p[2 * i + 1]
        r[5 * i] = t0 & 0xFF
        r[5 * i + 1] = (t0 >> 8) & 0xFF
        r[5 * i + 2] = ((t0 >> 16) | (t1 << 4)) & 0xFF
        r[5 * i + 3] = (t1 >> 4) & 0xFF
        r[5 * i + 4] = (t1 >> 12) & 0xFF
    return bytes(r)


def _unpack_z(b):
    p = [0] * N
    for i in range(N // 2):
        t0 = (b[5 * i] | (b[5 * i + 1] << 8) | (b[5 * i + 2] << 16)) & 0xFFFFF
        t1 = ((b[5 * i + 2] >> 4) | (b[5 * i + 3] << 4)
              | (b[5 * i + 4] << 12)) & 0xFFFFF
        p[2 * i] = GAMMA1 - t0
        p[2 * i + 1] = GAMMA1 - t1
    return p


def _pack_w1(p):
    r = bytearray(128)
    for i in range(N // 2):
        r[i] = (p[2 * i] & 0x0F) | ((p[2 * i + 1] & 0x0F) << 4)
    return bytes(r)


def _pack_h(hvec):
    r = bytearray(OMEGA + K)
    k = 0
    for i in range(K):
        for j in range(N):
            if hvec[i][j]:
                if k >= OMEGA:
                    raise ValueError("too many hints")
                r[k] = j
                k += 1
        r[OMEGA + i] = k
    return bytes(r)


def _unpack_h(b):
    """Returns hint vector or None if malformed."""
    if len(b) != OMEGA + K:
        return None
    hvec = [[0] * N for _ in range(K)]
    k = 0
    for i in range(K):
        if b[OMEGA + i] < k or b[OMEGA + i] > OMEGA:
            return None
        for j in range(k, b[OMEGA + i]):
            if j > k and b[j] <= b[j - 1]:
                return None
            hvec[i][b[j]] = 1
        k = b[OMEGA + i]
    return hvec


# ------------------------------------------------------------------ core
def keygen(seed: bytes):
    """Deterministic key generation. Returns (pk, sk)."""
    assert len(seed) == SEEDBYTES
    exp = _xof256(seed + bytes([K, L]), 128)
    rho, rhoprime, key = exp[0:32], exp[32:96], exp[96:128]

    a_hat = _expand_a(rho)
    s1, s2 = _expand_s(rhoprime)
    s1_hat = [ntt(p) for p in s1]

    # t = A s1 + s2  (standard domain throughout)
    t = []
    for i in range(K):
        acc = [0] * N
        for j in range(L):
            ah = a_hat[i][j]
            yh = s1_hat[j]
            for c_ in range(N):
                acc[c_] += ah[c_] * yh[c_]
        w = invntt([x % Q for x in acc])
        t.append([(w[c_] + s2[i][c_]) % Q for c_ in range(N)])

    t1, t0 = [], []
    for p in t:
        p1, p0 = [], []
        for c_ in p:
            a1, a0 = _power2round(c_ % Q)
            p1.append(a1)
            p0.append(a0)
        t1.append(p1)
        t0.append(p0)

    pk = rho + b"".join(_pack_t1(p) for p in t1)
    tr = _xof256(pk, TRBYTES)
    sk = (rho + key + tr
          + b"".join(_pack_eta(p) for p in s1)
          + b"".join(_pack_eta(p) for p in s2)
          + b"".join(_pack_t0(p) for p in t0))
    assert len(pk) == PK_BYTES and len(sk) == SK_BYTES
    return pk, sk


def _unpack_sk(sk: bytes):
    assert len(sk) == SK_BYTES
    rho, key, tr = sk[0:32], sk[32:64], sk[64:128]
    off = 128
    s1 = [_unpack_eta(sk[off + 128 * i:off + 128 * (i + 1)]) for i in range(L)]
    off += 128 * L
    s2 = [_unpack_eta(sk[off + 128 * i:off + 128 * (i + 1)]) for i in range(K)]
    off += 128 * K
    t0 = [_unpack_t0(sk[off + 416 * i:off + 416 * (i + 1)]) for i in range(K)]
    return rho, key, tr, s1, s2, t0


def _unpack_pk(pk: bytes):
    assert len(pk) == PK_BYTES
    rho = pk[0:32]
    t1 = [_unpack_t1(pk[32 + 320 * i:32 + 320 * (i + 1)]) for i in range(K)]
    return rho, t1


def sign(sk: bytes, msg: bytes, rnd: bytes):
    """Deterministic (given rnd) signing. Returns 3309-byte signature."""
    assert len(rnd) == SEEDBYTES
    rho, key, tr, s1, s2, t0 = _unpack_sk(sk)
    a_hat = _expand_a(rho)
    s1_hat = [ntt(p) for p in s1]
    s2_hat = [ntt(p) for p in s2]
    t0_hat = [ntt(p) for p in t0]

    mu = _xof256(tr + _MPRE + msg, CRHBYTES)
    rhoprime2 = _xof256(key + rnd + mu, CRHBYTES)

    kappa = 0
    while True:
        y = _expand_mask(rhoprime2, kappa)
        kappa += 1
        y_hat = [ntt(p) for p in y]

        # w = A y
        w = []
        for i in range(K):
            acc = [0] * N
            for j in range(L):
                ah, yh = a_hat[i][j], y_hat[j]
                for c_ in range(N):
                    acc[c_] += ah[c_] * yh[c_]
            w.append(invntt([x % Q for x in acc]))

        # decompose w -> w1 (high), w0 (low)
        w1, w0 = [], []
        for p in w:
            p1, p0 = [], []
            for c_ in p:
                a1, a0 = _decompose(c_ % Q)
                p1.append(a1)
                p0.append(a0)
            w1.append(p1)
            w0.append(p0)

        w1enc = b"".join(_pack_w1(p) for p in w1)
        ctilde = _xof256(mu + w1enc, CTILDEBYTES)
        c = _sample_in_ball(ctilde)
        c_hat = ntt(c)

        # z = y + c s1
        z = []
        for i in range(L):
            cs1 = invntt([(c_hat[c_] * s1_hat[i][c_]) % Q for c_ in range(N)])
            z.append([_reduce32((y[i][c_] + cs1[c_]) % Q) for c_ in range(N)])
        if _chknorm_vec(z, GAMMA1 - BETA):
            continue

        # w0 = LowBits(w) - c s2
        for i in range(K):
            cs2 = invntt([(c_hat[c_] * s2_hat[i][c_]) % Q for c_ in range(N)])
            w0[i] = [_reduce32((w0[i][c_] - cs2[c_]) % Q) for c_ in range(N)]
        if _chknorm_vec(w0, GAMMA2 - BETA):
            continue

        # h = c t0 ; hint from (w0 + h), unreduced
        ok, hint = True, []
        for i in range(K):
            ct0 = invntt([(c_hat[c_] * t0_hat[i][c_]) % Q for c_ in range(N)])
            hred = [_reduce32(x % Q) for x in ct0]
            if _chknorm_poly(hred, GAMMA2):
                ok = False
                break
            hint.append([_make_hint(w0[i][c_] + hred[c_], w1[i][c_])
                         for c_ in range(N)])
        if not ok:
            continue
        if sum(sum(row) for row in hint) > OMEGA:
            continue
        zenc = b"".join(_pack_z(p) for p in z)
        return ctilde + zenc + _pack_h(hint)


def verify(pk: bytes, msg: bytes, sig: bytes) -> bool:
    """Verify a signature. Returns True/False (never raises on bad input)."""
    try:
        if len(pk) != PK_BYTES or len(sig) != SIG_BYTES:
            return False
        rho, t1 = _unpack_pk(pk)
        ctilde = sig[:CTILDEBYTES]
        z = [_unpack_z(sig[CTILDEBYTES + 640 * i:
                           CTILDEBYTES + 640 * (i + 1)]) for i in range(L)]
        h = _unpack_h(sig[CTILDEBYTES + 640 * L:])
        if h is None:
            return False
        if _chknorm_vec(z, GAMMA1 - BETA):
            return False

        tr = _xof256(pk, TRBYTES)
        mu = _xof256(tr + _MPRE + msg, CRHBYTES)

        a_hat = _expand_a(rho)
        c = _sample_in_ball(ctilde)
        c_hat = ntt(c)
        z_hat = [ntt(p) for p in z]

        # w' = A z - c t1 2^d
        w1p = []
        for i in range(K):
            acc = [0] * N
            for j in range(L):
                ah, zh = a_hat[i][j], z_hat[j]
                for c_ in range(N):
                    acc[c_] += ah[c_] * zh[c_]
            t1d = [(t1[i][c_] << D) % Q for c_ in range(N)]
            th = ntt(t1d)
            for c_ in range(N):
                acc[c_] -= c_hat[c_] * th[c_]
            wp = invntt([x % Q for x in acc])
            w1p.append([_use_hint(x % Q, h[i][idx])
                        for idx, x in enumerate(wp)])

        buf = b"".join(_pack_w1(p) for p in w1p)
        c2 = _xof256(mu + buf, CTILDEBYTES)
        return c2 == ctilde
    except Exception:
        return False
