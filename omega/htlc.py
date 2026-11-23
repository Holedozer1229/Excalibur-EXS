"""omega.htlc -- ExcalOmega HTLC v1 leaf and Taproot commitment.

Implements the leaf specified in ``docs/EXCALOMEGA_HTLC_V1_DRAFT.md``
and pinned in ``spec/vectors/htlc_v1_script.json``:

    OP_IF
        OP_SIZE 32 OP_EQUALVERIFY
        OP_SHA256 <secret_hash32> OP_EQUALVERIFY
        <claim_xonly_pubkey32> OP_CHECKSIG
    OP_ELSE
        <refund_locktime_height> OP_CHECKLOCKTIMEVERIFY OP_DROP
        <refund_xonly_pubkey32> OP_CHECKSIG
    OP_ENDIF

The leaf is committed with the BIP-341 NUMS internal key (unknown
discrete logarithm), so the output can only be spent via the script
path -- there is no key-path bypass. This module builds the leaf,
its TapLeaf hash, the Taproot output key, the control block, the
scriptPubKey and the Bech32m address. It does NOT execute scripts,
does NOT sign, and does NOT activate consensus: it is the
serialization/commitment layer the draft's activation gates refer to.

All integers in consensus-relevant paths here are exact Python
integers; no floating point is used anywhere in this package.
"""

import hashlib

from .bech32 import segwit_addr_encode
from .bip341 import (
    TAPLEAF_VERSION,
    control_block,
    tapleaf_hash,
    taproot_output_key,
)
from .secp256k1 import NUMS_INTERNAL_KEY_X, lift_x

# The HTLC leaf uses the standard BIP-341 NUMS point as internal key.
NUMS_INTERNAL_KEY = NUMS_INTERNAL_KEY_X


def encode_script_number(value):
    """Minimal Bitcoin script-number encoding of a non-negative int.

    Zero encodes as the empty vector; otherwise little-endian with a
    sign-extension byte appended when the top byte has its high bit
    set (so the value can never be read as negative).
    """
    if value < 0:
        raise ValueError("negative script number is forbidden")
    if value == 0:
        return b""
    result = bytearray()
    while value:
        result.append(value & 0xFF)
        value >>= 8
    if result[-1] & 0x80:
        result.append(0)
    return bytes(result)


def _push_data(data):
    if len(data) > 75:
        raise ValueError("HTLC leaf only uses direct pushes up to 75 bytes")
    return bytes([len(data)]) + data


def build_htlc_leaf(secret_hash, claim_key, refund_key, timeout):
    """Build the exact HTLC v1 tapscript leaf (116 bytes for v1 params).

    ``secret_hash`` is the 32-byte SHA-256 of the preimage,
    ``claim_key`` / ``refund_key`` are 32-byte x-only public keys,
    ``timeout`` is the absolute refund block height. Raises
    ``ValueError`` on wrong lengths or a negative timeout.
    """
    if len(secret_hash) != 32:
        raise ValueError("secret hash must be 32 bytes")
    if len(claim_key) != 32 or len(refund_key) != 32:
        raise ValueError("x-only public keys must be 32 bytes")
    if lift_x(int.from_bytes(claim_key, "big")) is None:
        raise ValueError("claim key is not a valid x-only public key")
    if lift_x(int.from_bytes(refund_key, "big")) is None:
        raise ValueError("refund key is not a valid x-only public key")
    timeout_bytes = encode_script_number(timeout)
    return (
        b"\x63\x82\x01\x20\x88\xa8"
        + _push_data(secret_hash) + b"\x88"
        + _push_data(claim_key) + b"\xac\x67"
        + _push_data(timeout_bytes) + b"\xb1\x75"
        + _push_data(refund_key) + b"\xac\x68"
    )


def secret_hash(preimage):
    """SHA-256 commitment to a 32-byte preimage."""
    if len(preimage) != 32:
        raise ValueError("preimage must be 32 bytes")
    return hashlib.sha256(preimage).digest()


def htlc_output(secret_hash, claim_key, refund_key, timeout, hrp):
    """Full Taproot commitment for an HTLC v1 leaf.

    Returns a dict with the leaf script, TapLeaf hash, tweak,
    output key, parity, 33-byte control block, scriptPubKey and
    Bech32m address (witness v1) for the given human-readable part.
    The internal key is the NUMS point, so no key-path spend exists.
    """
    script = build_htlc_leaf(secret_hash, claim_key, refund_key, timeout)
    leaf_hash = tapleaf_hash(TAPLEAF_VERSION, script)
    tweak, output_pubkey, parity = taproot_output_key(
        NUMS_INTERNAL_KEY, leaf_hash
    )
    # A single-leaf tree has an empty Merkle path: the leaf hash IS
    # the Merkle root, so the control block is just version|parity
    # followed by the internal key (33 bytes total).
    control = control_block(NUMS_INTERNAL_KEY, TAPLEAF_VERSION, [], parity)
    script_pubkey = b"\x51\x20" + output_pubkey
    address = segwit_addr_encode(hrp, 1, output_pubkey)
    if address is None:
        raise ValueError("could not encode Bech32m address for HRP")
    return {
        "script": script,
        "script_hex": script.hex(),
        "script_length_bytes": len(script),
        "tapleaf_hash": leaf_hash,
        "tapleaf_hash_hex": leaf_hash.hex(),
        "internal_key": NUMS_INTERNAL_KEY,
        "internal_key_hex": NUMS_INTERNAL_KEY.hex(),
        "tweak": tweak,
        "tweak_hex": tweak.hex(),
        "output_pubkey": output_pubkey,
        "output_pubkey_hex": output_pubkey.hex(),
        "parity": parity,
        "control_block": control,
        "control_block_hex": control.hex(),
        "script_pubkey": script_pubkey,
        "script_pubkey_hex": script_pubkey.hex(),
        "address": address,
        "hrp": hrp,
    }
