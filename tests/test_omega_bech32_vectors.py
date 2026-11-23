"""Official BIP-350 Bech32m test vectors plus SegWit address vectors.

Valid/invalid Bech32m strings and the v0-v16 SegWit address table
are transcribed from BIP-350 (fetched 2026-11-23). The SegWit
address cases come from the BIP-350 table (address -> scriptPubKey);
the P2TR addresses from the BIP-341 wallet vectors are cross-checked
here as Bech32m decode round-trips.

Only the standard library and the new ``omega`` package are used.
"""

import unittest

from omega import bech32

VALID_BECH32M = [
    "A1LQFN3A",
    "a1lqfn3a",
    "an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6",
    "abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx",
    "11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8",
    "split1checkupstagehandshakeupstreamerranterredcaperredlc445v",
    "?1v759aa",
]

# Valid Bech32 strings: they decode fine, but NOT as Bech32m.
VALID_BECH32_NOT_M = [
    "A12UEL5L",
    "a12uel5l",
    "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
]

# Invalid as both Bech32 and Bech32m (BIP-350 invalid list).
INVALID_BECH32M = [
    "\x20" + "1xj0phk",  # HRP character out of range
    "\x7f" + "1g6xzxy",  # HRP character out of range
    "\x80" + "1vctc34",  # HRP character out of range
    # Overall max length exceeded.
    "an84characterslonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11d6pts4",
    "qyrz8wqd2c9m",  # No separator character
    "1qyrz8wqd2c9m",  # Empty HRP
    "y1b0jsk6g",  # Invalid data character
    "lt1igcx5c0",  # Invalid data character
    "in1muywd",  # Too short checksum
    "mm1crxm3i",  # Invalid character in checksum
    "au1s5cgom",  # Invalid character in checksum
    "M1VUXWEZ",  # Checksum calculated with uppercase form of HRP
    "16plkw9",  # Empty HRP
    "1p2gdwpf",  # Empty HRP
]

# (address, witness version, witness program hex) -- BIP-350 table.
VALID_SEGWIT_ADDRESSES = [
    ("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4", 0,
     "751e76e8199196d454941c45d1b3a323f1433bd6"),
    ("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
     0, "1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262"),
    ("bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
     1, "751e76e8199196d454941c45d1b3a323f1433bd6"
         "751e76e8199196d454941c45d1b3a323f1433bd6"),
    ("BC1SW50QGDZ25J", 16, "751e"),
    ("bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs", 2,
     "751e76e8199196d454941c45d1b3a323"),
    ("tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy",
     0, "000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433"),
    ("tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c",
     1, "000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433"),
    ("bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
     1, "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
]

# Invalid SegWit addresses (BIP-350 invalid list). Decoded with the
# HRP the address claims ("bc" or "tb" as written).
INVALID_SEGWIT_ADDRESSES = [
    ("bc", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh"),  # v0, Bech32m checksum
    ("tb", "tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47"),  # v0, Bech32m
    ("bc", "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd"),  # v1, Bech32 checksum
    ("bc", "bc1pw5dgrnzv"),  # 1-byte program
    ("bc", "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav"),  # 41-byte program
    ("bc", "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P"),  # Bad v0 program length
    ("tb", "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47Zagq"),  # Mixed case
    ("bc", "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf"),  # Zero padding > 4 bits
    ("tb", "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vpggkg4j"),  # Non-zero padding
    ("bc", "bc1gmk9yu"),  # Empty data section
    ("bc", "BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R"),  # Invalid witness version
    ("bc", "tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut"),  # Wrong HRP
]

# BIP-341 wallet-vector P2TR addresses (Bech32m, HRP bc, version 1).
BIP341_P2TR_ADDRESSES = [
    ("bc1p2wsldez5mud2yam29q22wgfh9439spgduvct83k3pm50fcxa5dps59h4z5",
     "53a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343"),
    ("bc1pz37fc4cn9ah8anwm4xqqhvxygjf9rjf2resrw8h8w4tmvcs0863sa2e586",
     "147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3"),
    ("bc1punvppl2stp38f7kwv2u2spltjuvuaayuqsthe34hd2dyy5w4g58qqfuag5",
     "e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e"),
    ("bc1pwyjywgrd0ffr3tx8laflh6228dj98xkjj8rum0zfpd6h0e930h6saqxrrm",
     "712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5"),
    ("bc1pwl3s54fzmk0cjnpl3w9af39je7pv5ldg504x5guk2hpecpg2kgsqaqstjq",
     "77e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220"),
    ("bc1pjxmy65eywgafs5tsunw95ruycpqcqnev6ynxp7jaasylcgtcxczs6n332e",
     "91b64d5324723a985170e4dc5a0f84c041804f2cd12660fa5dec09fc21783605"),
    ("bc1pw5tf7sqp4f50zka7629jrr036znzew70zxyvvej3zrpf8jg8hqcssyuewe",
     "75169f4001aa68f15bbed28b218df1d0a62cbbcf1188c6665110c293c907b831"),
]


class Bech32VectorTests(unittest.TestCase):
    def test_valid_bech32m_strings(self):
        for s in VALID_BECH32M:
            with self.subTest(s=s):
                hrp, data, spec = bech32.bech32_decode(s)
                self.assertEqual(spec, "bech32m")
                self.assertIsNotNone(hrp)
                self.assertIsNotNone(data)

    def test_valid_bech32_strings_are_not_bech32m(self):
        for s in VALID_BECH32_NOT_M:
            with self.subTest(s=s):
                _hrp, _data, spec = bech32.bech32_decode(s)
                self.assertEqual(spec, "bech32")

    def test_invalid_bech32m_strings(self):
        for s in INVALID_BECH32M:
            with self.subTest(s=repr(s)):
                self.assertEqual(
                    bech32.bech32_decode(s), (None, None, None)
                )

    def test_bech32m_round_trip(self):
        for s in VALID_BECH32M:
            with self.subTest(s=s):
                hrp, data, _spec = bech32.bech32_decode(s)
                reencoded = bech32.bech32_encode(hrp, data, bech32.BECH32M_CONST)
                self.assertEqual(reencoded, s.lower())

    def test_valid_segwit_addresses(self):
        for addr, witver, program in VALID_SEGWIT_ADDRESSES:
            with self.subTest(addr=addr):
                hrp = addr[:2].lower()
                got_ver, got_prog = bech32.segwit_addr_decode(hrp, addr)
                self.assertEqual(got_ver, witver)
                self.assertEqual(got_prog.hex(), program)
                self.assertEqual(
                    bech32.segwit_addr_encode(
                        hrp, witver, bytes.fromhex(program)
                    ),
                    addr.lower(),
                )

    def test_invalid_segwit_addresses(self):
        for hrp, addr in INVALID_SEGWIT_ADDRESSES:
            with self.subTest(addr=addr):
                self.assertEqual(
                    bech32.segwit_addr_decode(hrp, addr), (None, None)
                )

    def test_bip341_p2tr_addresses_decode(self):
        for addr, program in BIP341_P2TR_ADDRESSES:
            with self.subTest(addr=addr):
                witver, got_prog = bech32.segwit_addr_decode("bc", addr)
                self.assertEqual(witver, 1)
                self.assertEqual(got_prog.hex(), program)

    def test_wrong_hrp_rejected(self):
        witver, prog = bech32.segwit_addr_decode(
            "tb", BIP341_P2TR_ADDRESSES[0][0]
        )
        self.assertEqual((witver, prog), (None, None))

    def test_v0_with_bech32m_checksum_rejected(self):
        # BIP-350: a v0 program encoded with the Bech32m constant is
        # invalid; a v1 program encoded with the Bech32 constant is
        # invalid too.
        program = bytes.fromhex("751e76e8199196d454941c45d1b3a323f1433bd6")
        bad_v0 = bech32.bech32_encode(
            "bc",
            [0] + bech32.convertbits(program, 8, 5),
            bech32.BECH32M_CONST,
        )
        self.assertEqual(bech32.segwit_addr_decode("bc", bad_v0), (None, None))
        bad_v1 = bech32.bech32_encode(
            "bc",
            [1] + bech32.convertbits(bytes(32), 8, 5),
            bech32.BECH32_CONST,
        )
        self.assertEqual(bech32.segwit_addr_decode("bc", bad_v1), (None, None))


if __name__ == "__main__":
    unittest.main()
