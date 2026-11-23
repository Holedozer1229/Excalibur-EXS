"""Known-answer tests for the ExcalOmega prophecy candidate vector.

These tests exercise only the published byte-level vector. They do not
activate the candidate as consensus and do not test wallet or signing code.
"""
import hashlib
import unittest


AXIOM = (
    "sword legend pull magic kingdom artist stone destroy forget "
    "fire steel honey question"
)
EXPECTED_SHA256 = (
    "87da299f5969e0e38e85840ff13b9aef2044dbfcfed1295a6d042a3bcc6b9181"
)
EXPECTED_NO_SPACE_SHA256 = (
    "bae594495c21f9ba2a0707f56e31f92f763d4570da174e8f28b629c72b5a6e79"
)
EXPECTED_SEED = (
    "582946fd65d357fa6d73dbf071fe70f2a2698ec253a6bec584a86ef500bcfa2d"
)


class ProphecyCommitmentVectorTests(unittest.TestCase):
    def test_exact_utf8_sha256(self):
        encoded = AXIOM.encode("utf-8")
        self.assertEqual(len(encoded), 85)
        self.assertFalse(encoded.endswith(b"\\n"))
        self.assertEqual(hashlib.sha256(encoded).hexdigest(), EXPECTED_SHA256)

    def test_normalized_form_is_identical_for_current_axiom(self):
        normalized = " ".join(AXIOM.lower().split()).encode("utf-8")
        self.assertEqual(normalized, AXIOM.encode("utf-8"))
        self.assertEqual(hashlib.sha256(normalized).hexdigest(), EXPECTED_SHA256)

    def test_no_separator_is_a_distinct_negative_vector(self):
        no_spaces = AXIOM.replace(" ", "").encode("utf-8")
        self.assertEqual(
            hashlib.sha256(no_spaces).hexdigest(),
            EXPECTED_NO_SPACE_SHA256,
        )
        self.assertNotEqual(
            hashlib.sha256(no_spaces).hexdigest(),
            EXPECTED_SHA256,
        )

    def test_sovereign_seed_known_answer(self):
        seed = hashlib.pbkdf2_hmac(
            "sha512",
            AXIOM.encode("utf-8"),
            b"EXCALIBUR-SOVEREIGN-GENESIS-v1",
            600_000,
            32,
        )
        self.assertEqual(seed.hex(), EXPECTED_SEED)

    def test_mutation_changes_candidate_digest(self):
        mutated = (AXIOM + "x").encode("utf-8")
        self.assertNotEqual(hashlib.sha256(mutated).hexdigest(), EXPECTED_SHA256)


if __name__ == "__main__":
    unittest.main()
