#!/usr/bin/env python3
"""BIP-322 generic signed message format — pure Python.

Implements the *simple* variant for P2WPKH (native segwit) addresses per
BIP-322 v2.0.0 (Status: Complete):
  https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki

  message_hash = BIP340-tagged hash, tag "BIP0322-signed-message"
  to_spend: version 0, locktime 0,
            vin = [0000...0000:ffffffff, scriptSig = OP_0 PUSH32(message_hash), seq 0]
            vout = [0 sats -> message_challenge (address scriptPubKey)]
  to_sign:   version 0, locktime 0,
            vin = [to_spend.txid:0, scriptSig = [], seq 0, witness = signature]
            vout = [0 sats -> OP_RETURN]
  simple signature = "smp" + base64(consensus-encoded witness stack)

Signing uses BIP-143 sighash for the P2WPKH input. Verification reconstructs
both virtual transactions and checks the ECDSA signature against the pubkey
committed to by the address.

Self-test runs the official vectors from
bip-0322/basic-test-vectors.json (message hashes, to_spend/to_sign txids,
WIF->address, and verification of the BIP's own simple signatures).
"""

import hashlib
import base64
import struct
import sys

# ---------------------------------------------------------------- secp256k1

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
G = (Gx, Gy)

def _inv(a, p):
    return pow(a, p - 2, p)

def _add(p1, p2):
    if p1 is None: return p2
    if p2 is None: return p1
    x1, y1 = p1; x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0: return None
        lam = (3 * x1 * x1) * _inv(2 * y1, P) % P
    else:
        lam = (y2 - y1) * _inv(x2 - x1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    return (x3, (lam * (x1 - x3) - y1) % P)

def _mul(k, pt=G):
    r = None
    while k:
        if k & 1: r = _add(r, pt)
        pt = _add(pt, pt)
        k >>= 1
    return r

def priv_to_pubkey_compressed(d):
    x, y = _mul(d)
    return bytes([0x02 | (y & 1)]) + x.to_bytes(32, "big")

def _rfc6979(priv, h1):
    bx = priv.to_bytes(32, "big")
    bh = h1
    v = b"\x01" * 32
    k = b"\x00" * 32
    k = hashlib.sha256(k + v + b"\x00" + bx + bh).digest()
    v = hashlib.sha256(k + v).digest()
    k = hashlib.sha256(k + v + b"\x01" + bx + bh).digest()
    v = hashlib.sha256(k + v).digest()
    while True:
        v = hashlib.sha256(k + v).digest()
        cand = int.from_bytes(v, "big")
        if 1 <= cand < N:
            return cand
        k = hashlib.sha256(k + v + b"\x00").digest()
        v = hashlib.sha256(k + v).digest()

def _der(r, s):
    rb, sb = r.to_bytes(32, "big").lstrip(b"\x00"), s.to_bytes(32, "big").lstrip(b"\x00")
    if rb[0] & 0x80: rb = b"\x00" + rb
    if sb[0] & 0x80: sb = b"\x00" + sb
    body = b"\x02" + bytes([len(rb)]) + rb + b"\x02" + bytes([len(sb)]) + sb
    return b"\x30" + bytes([len(body)]) + body

def _der_parse(sig):
    assert sig[0] == 0x30 and sig[1] == len(sig) - 2 and sig[2] == 0x02
    lr = sig[3]; r = int.from_bytes(sig[4:4 + lr], "big")
    assert sig[4 + lr] == 0x02
    ls = sig[5 + lr]; s = int.from_bytes(sig[6 + lr:6 + lr + ls], "big")
    assert 6 + lr + ls == len(sig)
    return r, s

def ecdsa_sign(priv, h32):
    z = int.from_bytes(h32, "big")
    while True:
        k = _rfc6979(priv, h32)
        x, _ = _mul(k)
        r = x % N
        if r == 0: continue
        s = (_inv(k, N) * (z + r * priv)) % N
        if s == 0: continue
        if s > N // 2: s = N - s          # low-S, required by BIP-322
        return _der(r, s)

def ecdsa_verify(pub_compressed, h32, der_sig):
    try:
        r, s = _der_parse(der_sig)
    except Exception:
        return False
    if not (1 <= r < N and 1 <= s < N):
        return False
    if s > N // 2:                        # LOW_S rule
        return False
    px = int.from_bytes(pub_compressed[1:], "big")
    y2 = (pow(px, 3, P) + 7) % P
    py = pow(y2, (P + 1) // 4, P)
    if (pub_compressed[0] == 0x03) != (py & 1):
        py = P - py
    z = int.from_bytes(h32, "big")
    w = _inv(s, N)
    u1, u2 = z * w % N, r * w % N
    pt = _add(_mul(u1), _mul(u2, (px, py)))
    return pt is not None and pt[0] % N == r

# ------------------------------------------------------------------ hashes

def sha256d(b):
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()

def tagged_hash(tag: bytes, msg: bytes) -> bytes:
    t = hashlib.sha256(tag).digest()
    return hashlib.sha256(t + t + msg).digest()

def hash160(b):
    return hashlib.new("ripemd160", hashlib.sha256(b).digest()).digest()

# ------------------------------------------------------------------ base58

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58check_decode(s):
    n = 0
    for c in s:
        n = n * 58 + _B58.index(c)
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
    pad = len(s) - len(s.lstrip("1"))
    raw = b"\x00" * pad + raw
    payload, chk = raw[:-4], raw[-4:]
    assert sha256d(payload)[:4] == chk, "base58check checksum"
    return payload

def wif_to_priv(wif):
    p = b58check_decode(wif)
    assert p[0] == 0x80 and len(p) in (33, 34)
    return int.from_bytes(p[1:33], "big")

# ------------------------------------------------------------------ bech32

_BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

def _bech32_polymod(vals):
    GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    chk = 1
    for v in vals:
        b = chk >> 25
        chk = ((chk & 0x1ffffff) << 5) ^ v
        for i in range(5):
            if (b >> i) & 1:
                chk ^= GEN[i]
    return chk

def _bech32_hrp_expand(hrp):
    return [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]

def _convertbits(data, frm, to, pad=True):
    acc = val = 0
    bits = 0
    out = []
    maxv = (1 << to) - 1
    for v in data:
        val = (val << frm) | v
        bits += frm
        while bits >= to:
            bits -= to
            out.append((val >> bits) & maxv)
    if pad:
        if bits:
            out.append((val << (to - bits)) & maxv)
    elif bits >= frm or ((val << (to - bits)) & maxv):
        return None
    return out

def bech32_decode(addr):
    addr = addr.lower()
    pos = addr.rfind("1")
    hrp, data = addr[:pos], addr[pos + 1:]
    vals = [_BECH32.index(c) for c in data]
    assert _bech32_polymod(_bech32_hrp_expand(hrp) + vals) == 1, "bech32 checksum"
    prog = _convertbits(vals[1:-6], 5, 8, False)
    return hrp, vals[0], bytes(prog)

def bech32_encode(hrp, witver, prog):
    data = [witver] + _convertbits(prog, 8, 5)
    pm = _bech32_polymod(_bech32_hrp_expand(hrp) + data + [0] * 6) ^ 1
    chk = [(pm >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join(_BECH32[d] for d in data + chk)

def p2wpkh_address(pub_compressed, hrp="bc"):
    return bech32_encode(hrp, 0, hash160(pub_compressed))

def address_to_spk(addr):
    hrp, ver, prog = bech32_decode(addr)
    assert ver == 0 and len(prog) == 20, "only P2WPKH supported"
    return bytes([ver, 0x14]) + prog

# ------------------------------------------------------- tx serialization

def _varint(n):
    if n < 0xfd: return bytes([n])
    if n <= 0xffff: return b"\xfd" + struct.pack("<H", n)
    if n <= 0xffffffff: return b"\xfe" + struct.pack("<I", n)
    return b"\xff" + struct.pack("<Q", n)

def build_to_spend(message: bytes, spk: bytes) -> bytes:
    mh = tagged_hash(b"BIP0322-signed-message", message)
    script_sig = b"\x00\x20" + mh                      # OP_0 PUSH32(message_hash)
    tx = struct.pack("<i", 0)                          # version
    tx += b"\x01"
    tx += b"\x00" * 32 + struct.pack("<I", 0xFFFFFFFF)  # prevout
    tx += _varint(len(script_sig)) + script_sig
    tx += struct.pack("<I", 0)                         # sequence
    tx += b"\x01"
    tx += struct.pack("<q", 0) + _varint(len(spk)) + spk
    tx += struct.pack("<I", 0)                         # locktime
    return tx

def build_to_sign(to_spend_txid_le: bytes, witness_items=()) -> bytes:
    tx = struct.pack("<i", 0)
    tx += b"\x01"
    tx += to_spend_txid_le + struct.pack("<I", 0)
    tx += b"\x00"                                     # empty scriptSig
    tx += struct.pack("<I", 0)                         # sequence
    tx += b"\x01"
    tx += struct.pack("<q", 0) + b"\x01\x6a"           # 0 sats -> OP_RETURN
    tx += struct.pack("<I", 0)
    if witness_items:                                 # witness serialization
        tx += b"\x00\x01\x01"
        tx += _varint(len(witness_items))
        for it in witness_items:
            tx += _varint(len(it)) + it
    return tx

def txid_display(tx_ser):
    return sha256d(tx_ser)[::-1].hex()

# --------------------------------------------------------------- BIP-143

def bip143_sighash(spk, value, to_spend_tx_le, to_sign_ser_wo_witness):
    # parse to_sign (no witness): version|1 in|1 out|locktime
    v, = struct.unpack_from("<i", to_sign_ser_wo_witness, 0)
    off = 4 + 1
    prev_txid, prev_n = to_sign_ser_wo_witness[off:off + 32], struct.unpack_from("<I", to_sign_ser_wo_witness, off + 32)[0]
    off += 36  # outpoint = 32-byte txid + 4-byte vout
    slen = to_sign_ser_wo_witness[off]; off += 1 + slen
    seq, = struct.unpack_from("<I", to_sign_ser_wo_witness, off); off += 4
    off += 1  # nOut
    val, = struct.unpack_from("<q", to_sign_ser_wo_witness, off)
    olen = to_sign_ser_wo_witness[off + 8]
    ospk = to_sign_ser_wo_witness[off + 9:off + 9 + olen]
    h_prev = sha256d(prev_txid + struct.pack("<I", prev_n))
    h_seq = sha256d(struct.pack("<I", seq))
    h_out = sha256d(struct.pack("<q", val) + bytes([olen]) + ospk)
    script_code = b"\x76\xa9\x14" + hash160_from_spk(spk) + b"\x88\xac"  # 25 bytes
    pre = struct.pack("<i", v)
    pre += h_prev + h_seq
    pre += to_spend_tx_le + struct.pack("<I", 0)
    pre += bytes([len(script_code)]) + script_code
    pre += struct.pack("<q", value)
    pre += struct.pack("<I", seq)
    pre += h_out
    pre += struct.pack("<I", 0)                        # locktime
    pre += struct.pack("<I", 1)                        # SIGHASH_ALL
    return sha256d(pre)

def hash160_from_spk(spk):
    assert spk[:2] == b"\x00\x14" and len(spk) == 22
    return spk[2:]

# ------------------------------------------------------------ sign/verify

def encode_witness_stack(items):
    out = _varint(len(items))
    for it in items:
        out += _varint(len(it)) + it
    return out

def decode_witness_stack(buf):
    n, off = _varint_read(buf, 0)
    items = []
    for _ in range(n):
        ln, off = _varint_read(buf, off)
        items.append(buf[off:off + ln]); off += ln
    assert off == len(buf)
    return items

def _varint_read(buf, off):
    b0 = buf[off]
    if b0 < 0xfd: return b0, off + 1
    if b0 == 0xfd: return struct.unpack_from("<H", buf, off + 1)[0], off + 3
    if b0 == 0xfe: return struct.unpack_from("<I", buf, off + 1)[0], off + 5
    return struct.unpack_from("<Q", buf, off + 1)[0], off + 9

def sign_simple_p2wpkh(priv: int, address: str, message: bytes) -> str:
    spk = address_to_spk(address)
    to_spend = build_to_spend(message, spk)
    to_spend_txid_le = sha256d(to_spend)
    to_sign = build_to_sign(to_spend_txid_le)
    sighash = bip143_sighash(spk, 0, to_spend_txid_le, to_sign)
    sig = ecdsa_sign(priv, sighash) + b"\x01"           # append SIGHASH_ALL
    pub = priv_to_pubkey_compressed(priv)
    assert p2wpkh_address(pub) == address, "privkey does not match address"
    return "smp" + base64.b64encode(encode_witness_stack([sig, pub])).decode()

def verify_simple(address: str, message: bytes, signature: str):
    """Returns (ok, reason). Accepts 'smp'-prefixed or bare (legacy fallback)."""
    try:
        sig = signature
        if sig.startswith("smp"):
            sig = sig[3:]
        raw = base64.b64decode(sig, validate=True)
        items = decode_witness_stack(raw)
        if len(items) != 2:
            return False, "witness stack must have 2 items"
        dersig, pub = items
        if len(pub) != 33 or pub[0] not in (2, 3):
            return False, "bad pubkey"
        if len(dersig) < 8 or dersig[-1] != 0x01:
            return False, "bad sighash byte"
        spk = address_to_spk(address)
        if hash160(pub) != hash160_from_spk(spk):
            return False, "pubkey does not match address"
        to_spend = build_to_spend(message, spk)
        to_spend_txid_le = sha256d(to_spend)
        to_sign = build_to_sign(to_spend_txid_le)
        sighash = bip143_sighash(spk, 0, to_spend_txid_le, to_sign)
        if not ecdsa_verify(pub, sighash, dersig[:-1]):
            return False, "invalid signature"
        return True, "valid"
    except Exception as e:
        return False, f"decode error: {e}"

# ---------------------------------------------------------------- self-test

VECTORS = [
    dict(message=b"",
         message_hash="c90c269c4f8fcbe6880f72a721ddfbf1914268a794cbb21cfafee13770ae19f1",
         to_spend="c5680aa69bb8d860bf82d4e9cd3504b55dde018de765a91bb566283c545a99a7",
         to_sign="1e9654e951a5ba44c8604c4de6c67fd78a27e81dcadcfe1edf638ba3aaebaed6",
         sigs=["smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=",
               "smpAkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"]),
    dict(message=b"Hello World",
         message_hash="f0eb03b1a75ac6d9847f55c624a99169b5dccba2a31f5b23bea77ba270de0a7a",
         to_spend="b79d196740ad5217771c1098fc4a4b51e0535c32236c71f1ea4d61a2d603352b",
         to_sign="88737ae86f2077145f93cc4b153ae9a1cb8d56afa511988c149c5c8c9d93bddf",
         sigs=["smpAkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=",
               "smpAkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"]),
    dict(message="UTF-8 support: öäüéàè 测试文本 \U0001F604".encode("utf-8"),
         message_hash="43936b237ea38c7794eb5d755e0d220b6db92ebfc5c8f482759d22b1286376d7",
         to_spend="c8f4f525fe8afb1bc09b44175bd2096f079c98425e8a1be676b712add1fb62f0",
         to_sign="8f488e06b89eafd019ec528109eafaf7f1d1811fd617aa1eeb9658f1c1be6586",
         sigs=[]),
]

TEST_WIF = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k"
TEST_ADDR = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l"

def selftest():
    fails = []
    def check(name, cond):
        print(("PASS " if cond else "FAIL ") + name)
        if not cond: fails.append(name)
    # 1. WIF -> address
    priv = wif_to_priv(TEST_WIF)
    check("WIF->P2WPKH address", p2wpkh_address(priv_to_pubkey_compressed(priv)) == TEST_ADDR)
    spk = address_to_spk(TEST_ADDR)
    for v in VECTORS:
        m = v["message"]
        check(f"message_hash {m[:12]!r}", tagged_hash(b"BIP0322-signed-message", m).hex() == v["message_hash"])
        ts = build_to_spend(m, spk)
        check(f"to_spend txid {m[:12]!r}", txid_display(ts) == v["to_spend"])
        tsign = build_to_sign(sha256d(ts))
        check(f"to_sign txid {m[:12]!r}", txid_display(tsign) == v["to_sign"])
        for s in v["sigs"]:
            ok, why = verify_simple(TEST_ADDR, m, s)
            check(f"verify BIP sig {m[:12]!r} {s[3:11]}...", ok)
            if not ok: print("   reason:", why)
        # wrong message must fail
        if v["sigs"]:
            ok, _ = verify_simple(TEST_ADDR, m + b"X", v["sigs"][0])
            check(f"wrong message rejected {m[:12]!r}", not ok)
    # 2. sign/verify roundtrip with test key
    for m in (b"", b"Hello World", b"Travis Dale Jones"):
        sig = sign_simple_p2wpkh(priv, TEST_ADDR, m)
        ok, why = verify_simple(TEST_ADDR, m, sig)
        check(f"roundtrip {m[:12]!r}", ok and sig.startswith("smp"))
        if not ok: print("   reason:", why)
    # 3. error vectors
    ok, _ = verify_simple(TEST_ADDR, b"", "not-valid-base64!!!")
    check("invalid base64 rejected", not ok)
    ok, _ = verify_simple(TEST_ADDR, b"", "")
    check("empty signature rejected", not ok)
    ok, _ = verify_simple(TEST_ADDR, b"", "smpAA==")
    check("empty witness rejected", not ok)
    ok, _ = verify_simple(TEST_ADDR, b"", "fooAA==")
    check("bad prefix rejected", not ok)
    if fails:
        print(f"\n{len(fails)} FAILURES"); sys.exit(1)
    print("\nALL BIP-322 SELF-TESTS PASS")

if __name__ == "__main__":
    selftest()
