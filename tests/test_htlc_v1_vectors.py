"""Serialization-only known-answer tests for the proposed ExcalOmega HTLC v1 leaf.

These tests do not execute Bitcoin Script, validate Schnorr signatures, compute
Taproot output keys, or activate consensus. They pin the script template bytes
so independent implementations can agree before cryptographic integration.
"""
import hashlib
import unittest


SECRET = bytes.fromhex(
    "4558532048544c43206b6e6f776e2d616e737765722073656372657420763100"
)
SECRET_HASH = bytes.fromhex(
    "7c83e9955142c0c14e6a38e629aa78e455c5341eb1ea4870dd4938d236074ea5"
)
CLAIM_XONLY = bytes.fromhex(
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
)
REFUND_XONLY = bytes.fromhex(
    "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"
)
REFUND_LOCKTIME_HEIGHT = 500_000
EXPECTED_SCRIPT_HEX = (
    "6382012088a820"
    "7c83e9955142c0c14e6a38e629aa78e455c5341eb1ea4870dd4938d236074ea5"
    "8820"
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    "ac670320a107b17520"
    "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"
    "ac68"
)
EXPECTED_TAPLEAF_HASH = (
    "d5f41c4f765a472b87541f93d49bf5a850f889ddcc645c6f476b2fa72567af00"
)


def push_data(data: bytes) -> bytes:
    if len(data) > 75:
        raise ValueError("test helper only supports direct pushes up to 75 bytes")
    return bytes([len(data)]) + data


def encode_script_number(value: int) -> bytes:
    if value < 0:
        raise ValueError("negative timeout is forbidden")
    if value == 0:
        return b""
    result = bytearray()
    while value:
        result.append(value & 0xFF)
        value >>= 8
    if result[-1] & 0x80:
        result.append(0)
    return bytes(result)


def build_htlc_leaf(secret_hash: bytes, claim_key: bytes,
                    refund_key: bytes, timeout: int) -> bytes:
    if len(secret_hash) != 32 or len(claim_key) != 32 or len(refund_key) != 32:
        raise ValueError("hash and x-only keys must be 32 bytes")
    timeout_bytes = encode_script_number(timeout)
    return (
        b"\x63\x82\x01\x20\x88\xa8"
        + push_data(secret_hash) + b"\x88"
        + push_data(claim_key) + b"\xac\x67"
        + push_data(timeout_bytes) + b"\xb1\x75"
        + push_data(refund_key) + b"\xac\x68"
    )


def tagged_hash(tag: str, message: bytes) -> bytes:
    tag_hash = hashlib.sha256(tag.encode("ascii")).digest()
    return hashlib.sha256(tag_hash + tag_hash + message).digest()


class ExcalOmegaHtlcLeafTests(unittest.TestCase):
    def test_secret_hash_vector(self):
        self.assertEqual(len(SECRET), 32)
        self.assertEqual(hashlib.sha256(SECRET).digest(), SECRET_HASH)

    def test_script_number_encoding(self):
        self.assertEqual(encode_script_number(500_000), bytes.fromhex("20a107"))
        self.assertEqual(encode_script_number(0), b"")
        with self.assertRaises(ValueError):
            encode_script_number(-1)

    def test_exact_htlc_script_bytes(self):
        script = build_htlc_leaf(
            SECRET_HASH, CLAIM_XONLY, REFUND_XONLY, REFUND_LOCKTIME_HEIGHT
        )
        self.assertEqual(len(script), 116)
        self.assertEqual(script.hex(), EXPECTED_SCRIPT_HEX)

    def test_tapleaf_hash_known_answer(self):
        script = build_htlc_leaf(
            SECRET_HASH, CLAIM_XONLY, REFUND_XONLY, REFUND_LOCKTIME_HEIGHT
        )
        # 116-byte script length is a single-byte CompactSize value.
        leaf_hash = tagged_hash("TapLeaf", b"\xc0" + bytes([len(script)]) + script)
        self.assertEqual(leaf_hash.hex(), EXPECTED_TAPLEAF_HASH)

    def test_preimage_mutation_changes_hash(self):
        self.assertNotEqual(
            hashlib.sha256(SECRET + b"x").digest(),
            SECRET_HASH,
        )


if __name__ == "__main__":
    unittest.main()
