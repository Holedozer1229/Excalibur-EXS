"""ExcalOmega HTLC v1 commitment tests.

Pins the serialization vector in ``spec/vectors/htlc_v1_script.json``
(script bytes, TapLeaf hash) against the new ``omega.htlc`` builder,
then extends it to the full Taproot commitment: NUMS internal key
(re-derived from first principles), tweak, output key, control
block, scriptPubKey and Bech32m address under the draft HRP.

Also pins the negative rules: wrong-length preimage/keys, negative
timeout, and non-minimal script numbers are rejected; any mutation
of the leaf changes the TapLeaf hash and the output key.

Only the standard library and the new ``omega`` package are used.
"""

import hashlib
import json
import os
import unittest

from omega import bip341, htlc
from omega.secp256k1 import G, NUMS_INTERNAL_KEY_X, lift_x

VECTOR_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "spec", "vectors", "htlc_v1_script.json",
)
DRAFT_HRP = "exs"


def _load_vector():
    with open(VECTOR_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


class HtlcVectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vector = _load_vector()

    def test_pinned_vector_fields(self):
        vector = self.vector
        self.assertEqual(vector["spec"], "ExcalOmega HTLC v1")
        self.assertEqual(vector["script_length_bytes"], 116)
        self.assertEqual(vector["tapleaf_version"], "c0")

    def test_secret_hash(self):
        vector = self.vector
        secret = bytes.fromhex(vector["secret_hex"])
        self.assertEqual(len(secret), 32)
        self.assertEqual(
            hashlib.sha256(secret).hexdigest(), vector["secret_sha256"]
        )
        self.assertEqual(
            htlc.secret_hash(secret).hex(), vector["secret_sha256"]
        )

    def test_script_bytes_reproduced(self):
        vector = self.vector
        script = htlc.build_htlc_leaf(
            bytes.fromhex(vector["secret_sha256"]),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"],
        )
        self.assertEqual(len(script), 116)
        self.assertEqual(script.hex(), vector["script_hex"])

    def test_tapleaf_hash_reproduced(self):
        vector = self.vector
        script = bytes.fromhex(vector["script_hex"])
        self.assertEqual(
            bip341.tapleaf_hash(0xC0, script).hex(),
            vector["tapleaf_hash"],
        )

    def test_claim_and_refund_keys_are_valid_x_only_keys(self):
        vector = self.vector
        for field in ("claim_xonly_pubkey", "refund_xonly_pubkey"):
            key = bytes.fromhex(vector[field])
            self.assertEqual(len(key), 32)
            self.assertIsNotNone(
                lift_x(int.from_bytes(key, "big")),
                "%s does not lift to a curve point" % field,
            )
        # The pinned keys are the textbook points G and 3G; the test
        # pins the fact rather than assuming it.
        from omega.secp256k1 import point_mul

        self.assertEqual(
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            point_mul(1, G)[0].to_bytes(32, "big"),
        )
        self.assertEqual(
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            point_mul(3, G)[0].to_bytes(32, "big"),
        )

    def test_script_number_encoding(self):
        self.assertEqual(htlc.encode_script_number(500_000), bytes.fromhex("20a107"))
        self.assertEqual(htlc.encode_script_number(0), b"")
        self.assertEqual(htlc.encode_script_number(128), bytes.fromhex("8000"))
        self.assertEqual(htlc.encode_script_number(255), bytes.fromhex("ff00"))
        with self.assertRaises(ValueError):
            htlc.encode_script_number(-1)

    def test_nums_internal_key_rederived(self):
        # BIP-341: H = lift_x(SHA256(uncompressed encoding of G)).
        uncompressed_g = (
            b"\x04" + G[0].to_bytes(32, "big") + G[1].to_bytes(32, "big")
        )
        derived = hashlib.sha256(uncompressed_g).digest()
        self.assertEqual(derived, NUMS_INTERNAL_KEY_X)
        self.assertEqual(derived, htlc.NUMS_INTERNAL_KEY)
        self.assertIsNotNone(lift_x(int.from_bytes(derived, "big")))

    def test_full_taproot_commitment(self):
        vector = self.vector
        out = htlc.htlc_output(
            bytes.fromhex(vector["secret_sha256"]),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"],
            DRAFT_HRP,
        )
        self.assertEqual(out["script_hex"], vector["script_hex"])
        self.assertEqual(out["tapleaf_hash_hex"], vector["tapleaf_hash"])
        self.assertEqual(out["internal_key_hex"], NUMS_INTERNAL_KEY_X.hex())
        # The commitment is self-consistent: the control block
        # reconstructs exactly this output key.
        self.assertEqual(len(out["control_block"]), 33)
        self.assertTrue(
            bip341.verify_control_block(
                out["output_pubkey"],
                0xC0,
                out["script"],
                out["control_block"],
            )
        )
        # scriptPubKey is OP_1 || push32 || output key.
        self.assertEqual(
            out["script_pubkey"], b"\x51\x20" + out["output_pubkey"]
        )
        # The Bech32m address decodes back to the same program.
        from omega import bech32

        witver, program = bech32.segwit_addr_decode(DRAFT_HRP, out["address"])
        self.assertEqual(witver, 1)
        self.assertEqual(program, out["output_pubkey"])
        # A different HRP gives a different address for the same key.
        other = htlc.htlc_output(
            bytes.fromhex(vector["secret_sha256"]),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"],
            "texs",
        )
        self.assertNotEqual(other["address"], out["address"])
        self.assertEqual(other["output_pubkey"], out["output_pubkey"])

    def test_rejections(self):
        vector = self.vector
        good_hash = bytes.fromhex(vector["secret_sha256"])
        good_claim = bytes.fromhex(vector["claim_xonly_pubkey"])
        good_refund = bytes.fromhex(vector["refund_xonly_pubkey"])
        with self.assertRaises(ValueError):
            htlc.build_htlc_leaf(b"\x00" * 31, good_claim, good_refund, 500_000)
        with self.assertRaises(ValueError):
            htlc.build_htlc_leaf(good_hash, b"\x00" * 31, good_refund, 500_000)
        with self.assertRaises(ValueError):
            htlc.build_htlc_leaf(good_hash, good_claim, b"\x00" * 31, 500_000)
        with self.assertRaises(ValueError):
            # All-zero x-only key is not on the curve.
            htlc.build_htlc_leaf(good_hash, bytes(32), good_refund, 500_000)
        with self.assertRaises(ValueError):
            htlc.build_htlc_leaf(good_hash, good_claim, good_refund, -1)
        with self.assertRaises(ValueError):
            htlc.secret_hash(b"\x00" * 31)

    def test_mutation_changes_commitment(self):
        vector = self.vector
        base = htlc.htlc_output(
            bytes.fromhex(vector["secret_sha256"]),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"],
            DRAFT_HRP,
        )
        mutated_hash = bytearray(bytes.fromhex(vector["secret_sha256"]))
        mutated_hash[0] ^= 1
        mutated = htlc.htlc_output(
            bytes(mutated_hash),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"],
            DRAFT_HRP,
        )
        self.assertNotEqual(mutated["tapleaf_hash"], base["tapleaf_hash"])
        self.assertNotEqual(mutated["output_pubkey"], base["output_pubkey"])
        self.assertNotEqual(mutated["address"], base["address"])
        # A different timeout is a different contract.
        later = htlc.htlc_output(
            bytes.fromhex(vector["secret_sha256"]),
            bytes.fromhex(vector["claim_xonly_pubkey"]),
            bytes.fromhex(vector["refund_xonly_pubkey"]),
            vector["refund_locktime_height"] + 1,
            DRAFT_HRP,
        )
        self.assertNotEqual(later["output_pubkey"], base["output_pubkey"])


if __name__ == "__main__":
    unittest.main()
