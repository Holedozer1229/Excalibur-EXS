#!/usr/bin/env python3
"""
payout.py — coinbase payout simulation + Satoshi worker address.

Derives the "Satoshi worker address" from Satoshi's own genesis public
key (public knowledge, from the genesis coinbase — no private keys
involved anywhere), expressed in Genesis Fork address formats, then
simulates payout of every mined coinbase in genesis_fork_chain.json
to worker "satoshi".

Pure Python, no dependencies. Self-verifying: RIPEMD-160 is checked
against its standard test vector, and the BTC P2PKH derivation must
reproduce 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa exactly.
"""
import hashlib
import json

# ---------------------------------------------------------------- RIPEMD-160
# stdlib (OpenSSL) implementation — verified against test vectors below.
# A hand-rolled pure-Python version was tried first and FAILED its own
# self-test; the stdlib primitive is correct, so it wins. Flat fact.


def ripemd160(msg: bytes) -> bytes:
    return hashlib.new("ripemd160", msg).digest()


assert ripemd160(b"").hex() == \
    "9c1185a5c5e9fc54612808977ee8f548b2258d31", "RIPEMD-160 self-test failed"
assert ripemd160(b"abc").hex() == \
    "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc", "RIPEMD-160 self-test failed"


def hash160(b: bytes) -> bytes:
    return ripemd160(hashlib.sha256(b).digest())


def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


# ---------------------------------------------------------------- base58check
_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(b: bytes) -> str:
    n = int.from_bytes(b, "big")
    s = ""
    while n:
        n, r = divmod(n, 58)
        s = _B58[r] + s
    pad = len(b) - len(b.lstrip(b"\x00"))
    return "1" * pad + s


def b58check(payload: bytes) -> str:
    return b58encode(payload + sha256d(payload)[:4])


# ---------------------------------------------------------------- bech32
_BECH = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]


def _polymod(vals):
    chk = 1
    for v in vals:
        b = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ v
        for i in range(5):
            chk ^= _GEN[i] if (b >> i) & 1 else 0
    return chk


def _hrp_expand(hrp):
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]


def _convertbits(data, frm, to, pad=True):
    acc = bits = 0
    ret = []
    maxv = (1 << to) - 1
    for v in data:
        acc = (acc << frm) | v
        bits += frm
        while bits >= to:
            bits -= to
            ret.append((acc >> bits) & maxv)
    if pad and bits:
        ret.append((acc << (to - bits)) & maxv)
    return ret


def bech32_encode(hrp: str, witver: int, witprog: bytes) -> str:
    data = [witver] + _convertbits(witprog, 8, 5)
    pm = _polymod(_hrp_expand(hrp) + data + [0] * 6) ^ 1
    chk = [(pm >> 5 * (5 - i)) & 31 for i in range(6)]
    return hrp + "1" + "".join(_BECH[d] for d in data + chk)


# ---------------------------------------------------------------- Satoshi's key -> fork addresses
# Uncompressed pubkey from the genesis coinbase (public knowledge).
SATOSHI_PUBKEY = bytes.fromhex(
    "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb"
    "649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f")

SATOSHI_HASH160 = hash160(SATOSHI_PUBKEY)
assert SATOSHI_HASH160.hex() == \
    "62e907b15cbf27d5425399ebf6f0fb50ebb88f18", "hash160 mismatch"
# the ultimate self-check: must reproduce the famous genesis address
assert b58check(b"\x00" + SATOSHI_HASH160) == \
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "genesis address mismatch"


def compress(pub: bytes) -> bytes:
    x, y = pub[1:33], pub[33:65]
    return (b"\x03" if y[-1] & 1 else b"\x02") + x


ADDRESSES = {
    "btc_p2pkh (sanity)": b58check(b"\x00" + SATOSHI_HASH160),
    "gsf_p2pkh (worker)": b58check(b"\x32" + SATOSHI_HASH160),
    "gsf_p2wpkh (worker)": bech32_encode("gsf", 0,
                                         hash160(compress(SATOSHI_PUBKEY))),
    "tgsf_p2wpkh (worker)": bech32_encode("tgsf", 0,
                                          hash160(compress(SATOSHI_PUBKEY))),
}


# ---------------------------------------------------------------- payout simulation
def main():
    print("=== Satoshi worker address (from genesis pubkey) ===\n")
    for k, v in ADDRESSES.items():
        print(f"  {k:22s} {v}")
    print("\n  key: 04678afd...b11d5f (genesis coinbase, public)")
    print("  worker id: satoshi\n")

    chain = json.load(open("genesis_fork_chain.json"))
    print("=== coinbase payout simulation -> worker 'satoshi' ===\n")
    total = {}
    for net in ("mainnet", "testnet"):
        blocks = chain[net][1:]  # skip genesis
        addr = ADDRESSES["gsf_p2pkh (worker)"] if net == "mainnet" \
            else ADDRESSES["tgsf_p2wpkh (worker)"]
        tick = "GSF" if net == "mainnet" else "tGSF"
        print(f"-- {net} ({tick}), payout address:\n   {addr}")
        sub = 0
        for b in blocks:
            print(f"   block {b['height']:3d}  {b['hash'][:16]}...  "
                  f"+50 {tick}")
            sub += 50
        total[net] = sub
        print(f"   => {sub} {tick} to worker 'satoshi'\n")

    print("=== totals ===")
    print(f"  worker 'satoshi': {total['mainnet']} GSF "
          f"(6 coinbases x 50)")
    print(f"  worker 'satoshi': {total['testnet']} tGSF "
          f"(5 coinbases x 50)")
    print("\nnote: coinbase maturity (100 blocks, Bitcoin rule) is not")
    print("enforced in v1 — payouts shown as credited, not spendable.")
    print("DONE")


if __name__ == "__main__":
    main()
