"""Secure key-generation tests for ``omega.wallet``.

Pins the rebuild's hard rules: keys come only from the OS CSPRNG,
are in range, are independent across calls, and there is no API in
the wallet module that derives a key from the public prophecy or
any other public data. No secret is printed or logged anywhere in
this test (assertions compare lengths and public keys only).

Only the standard library and the new ``omega`` package are used.
"""

import unittest

from omega import bip340, wallet


class WalletTests(unittest.TestCase):
    def test_generated_key_shape_and_range(self):
        for _ in range(8):
            secret = wallet.generate_secret_key()
            self.assertEqual(len(secret), 32)
            value = int.from_bytes(secret, "big")
            self.assertGreaterEqual(value, 1)
            from omega.secp256k1 import N

            self.assertLess(value, N)

    def test_generated_keys_are_independent(self):
        keys = {wallet.generate_secret_key() for _ in range(32)}
        self.assertEqual(len(keys), 32)

    def test_keypair_round_trip(self):
        secret, public = wallet.generate_keypair()
        self.assertEqual(public, bip340.pubkey_gen(secret))
        self.assertEqual(len(public), 32)

    def test_no_public_data_derivation_api(self):
        # The wallet module must not expose any function that turns
        # public data into a key. If such a helper is ever added,
        # this test must fail loudly so it is reviewed, not merged.
        forbidden = (
            "axiom",
            "prophecy",
            "derive_from",
            "from_seed",
            "from_password",
            "from_public",
        )
        names = [name.lower() for name in dir(wallet)]
        for token in forbidden:
            for name in names:
                self.assertNotIn(
                    token, name,
                    "wallet exposes a public-data derivation API: %s" % name,
                )

    def test_taproot_keypair_is_consistent(self):
        from omega import bip341

        tweaked, internal, output, tweak = wallet.taproot_keypair()
        self.assertEqual(len(tweaked), 32)
        self.assertEqual(len(internal), 32)
        self.assertEqual(len(output), 32)
        self.assertEqual(len(tweak), 32)
        got_tweak, got_output, _parity = bip341.taproot_output_key(
            internal, None
        )
        self.assertEqual(got_tweak, tweak)
        self.assertEqual(got_output, output)
        # The tweaked key is the valid BIP-340 key for the output key.
        self.assertEqual(bip340.pubkey_gen(tweaked), output)

    def test_taproot_keypair_with_script_tree(self):
        from omega import bip341

        tree = {
            "script": bytes.fromhex("20" + "ab" * 32),
            "leafVersion": 0xC0,
        }
        root = bip341.tree_hash(tree)
        tweaked, internal, output, tweak = wallet.taproot_keypair(root)
        got_tweak, got_output, _parity = bip341.taproot_output_key(
            internal, root
        )
        self.assertEqual(got_tweak, tweak)
        self.assertEqual(got_output, output)
        self.assertEqual(bip340.pubkey_gen(tweaked), output)


if __name__ == "__main__":
    unittest.main()
