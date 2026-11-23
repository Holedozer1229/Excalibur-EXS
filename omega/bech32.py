"""omega.bech32 -- Bech32 / Bech32m encoding (BIP-173 / BIP-350).

Faithful transcription of the BIP-173 reference implementation with
the BIP-350 Bech32m constant (``0x2bc830a3``). Includes native
SegWit address (``segwit_addr_encode`` / ``segwit_addr_decode``)
support: witness version 0 uses Bech32, version 1+ uses Bech32m.

Standard library only. Decoding fails closed: mixed case, bad
characters, bad checksum, wrong length, and a version/checksum
mismatch are all rejected.
"""

CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

BECH32_CONST = 1
BECH32M_CONST = 0x2BC830A3


def _polymod(values):
    chk = 1
    generator = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    for value in values:
        top = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ value
        for i in range(5):
            chk ^= generator[i] if ((top >> i) & 1) else 0
    return chk


def _hrp_expand(hrp):
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]


def _verify_checksum(hrp, data):
    const = _polymod(_hrp_expand(hrp) + data)
    if const == BECH32_CONST:
        return "bech32"
    if const == BECH32M_CONST:
        return "bech32m"
    return None


def _create_checksum(hrp, data, spec_const):
    values = _hrp_expand(hrp) + data
    polymod = _polymod(values + [0, 0, 0, 0, 0, 0]) ^ spec_const
    return [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]


def bech32_encode(hrp, data, spec_const):
    """Encode ``data`` (list of 5-bit values) with ``hrp``.

    ``spec_const`` is :data:`BECH32_CONST` or :data:`BECH32M_CONST`.
    """
    combined = data + _create_checksum(hrp, data, spec_const)
    return hrp + "1" + "".join([CHARSET[d] for d in combined])


def bech32_decode(bech):
    """Decode a Bech32/Bech32m string.

    Returns ``(hrp, data, spec)`` where ``spec`` is ``"bech32"`` or
    ``"bech32m"``, or ``(None, None, None)`` when invalid.
    """
    if any(ord(x) < 33 or ord(x) > 126 for x in bech):
        return (None, None, None)
    if bech.lower() != bech and bech.upper() != bech:
        return (None, None, None)
    bech = bech.lower()
    pos = bech.rfind("1")
    if pos < 1 or pos + 7 > len(bech) or len(bech) > 90:
        return (None, None, None)
    if not all(x in CHARSET for x in bech[pos + 1:]):
        return (None, None, None)
    hrp = bech[:pos]
    data = [CHARSET.find(x) for x in bech[pos + 1:]]
    spec = _verify_checksum(hrp, data)
    if spec is None:
        return (None, None, None)
    return (hrp, data[:-6], spec)


def convertbits(data, frombits, tobits, pad=True):
    """Regroup bits (BIP-173 reference ``convertbits``).

    Returns a list of ``tobits``-bit values, or None on error.
    """
    acc = 0
    bits = 0
    ret = []
    maxv = (1 << tobits) - 1
    max_acc = (1 << (frombits + tobits - 1)) - 1
    for value in data:
        if value < 0 or (value >> frombits):
            return None
        acc = ((acc << frombits) | value) & max_acc
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad:
        if bits:
            ret.append((acc << (tobits - bits)) & maxv)
    elif bits >= frombits or ((acc << (tobits - bits)) & maxv):
        return None
    return ret


def segwit_addr_encode(hrp, witver, witprog):
    """Encode a native SegWit address.

    Witness version 0 uses Bech32; version 1..16 uses Bech32m
    (BIP-350). ``witprog`` is 2..40 bytes. Returns the address
    string, or None when the inputs are invalid.
    """
    if not 0 <= witver <= 16:
        return None
    if len(witprog) < 2 or len(witprog) > 40:
        return None
    if witver == 0 and len(witprog) not in (20, 32):
        return None
    data = [witver] + convertbits(witprog, 8, 5)
    spec_const = BECH32_CONST if witver == 0 else BECH32M_CONST
    return bech32_encode(hrp, data, spec_const)


def segwit_addr_decode(hrp, addr):
    """Decode a native SegWit address.

    Returns ``(witver, witprog)`` on success, or ``(None, None)``.
    The HRP must match, and the checksum variant must match the
    witness version (v0 -> Bech32, v1+ -> Bech32m).
    """
    hrpgot, data, spec = bech32_decode(addr)
    if hrpgot != hrp:
        return (None, None)
    if data is None or len(data) < 1 or data[0] > 16:
        return (None, None)
    if data[0] == 0 and spec != "bech32":
        return (None, None)
    if data[0] != 0 and spec != "bech32m":
        return (None, None)
    decoded = convertbits(data[1:], 5, 8, False)
    if decoded is None or len(decoded) < 2 or len(decoded) > 40:
        return (None, None)
    if data[0] == 0 and len(decoded) not in (20, 32):
        return (None, None)
    return (data[0], bytes(decoded))
