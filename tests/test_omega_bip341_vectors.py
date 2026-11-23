"""Official BIP-341 wallet test vectors (bitcoin/bips, bip-0341/wallet-test-vectors.json).

Transcribed verbatim from the upstream JSON fetched 2026-11-23
(commit 60f5b33b0a7be3cf09b933d97b78071d684db7d1). Two sets:
``scriptPubKey`` (7 cases: Merkle root, tweak, tweaked pubkey,
scriptPubKey, Bech32m address, control blocks) and ``keyPathSpending``
(7 inputs: tweaked private key, TapSighash, deterministic signature
with all-zero BIP-340 auxiliary randomness).

Only the standard library and the new ``omega`` package are used.
"""

import unittest

from omega import bech32, bip340, bip341
from omega.secp256k1 import tagged_hash


def _leaf(script_hex, version):
    return {"script": bytes.fromhex(script_hex), "leafVersion": version}


# (internal pubkey, script tree, merkle root or None, tweak,
#  tweaked pubkey, scriptPubKey, bech32m address, control blocks)
SCRIPT_PUBKEY_CASES = [
    (
        "d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d",
        None, None,
        "b86e7be8f39bab32a6f2c0443abbc210f0edac0e2c53d501b36b64437d9c6c70",
        "53a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343",
        "512053a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343",
        "bc1p2wsldez5mud2yam29q22wgfh9439spgduvct83k3pm50fcxa5dps59h4z5",
        [],
    ),
    (
        "187791b6f712a8ea41c8ecdd0ee77fab3e85263b37e1ec18a3651926b3a6cf27",
        _leaf("20d85a959b0290bf19bb89ed43c916be835475d013da4b362117393e25a48229b8ac", 192),
        "5b75adecf53548f3ec6ad7d78383bf84cc57b55a3127c72b9a2481752dd88b21",
        "cbd8679ba636c1110ea247542cfbd964131a6be84f873f7f3b62a777528ed001",
        "147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3",
        "5120147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3",
        "bc1pz37fc4cn9ah8anwm4xqqhvxygjf9rjf2resrw8h8w4tmvcs0863sa2e586",
        ["c1187791b6f712a8ea41c8ecdd0ee77fab3e85263b37e1ec18a3651926b3a6cf27"],
    ),
    (
        "93478e9488f956df2396be2ce6c5cced75f900dfa18e7dabd2428aae78451820",
        _leaf("20b617298552a72ade070667e86ca63b8f5789a9fe8731ef91202a91c9f3459007ac", 192),
        "c525714a7f49c28aedbbba78c005931a81c234b2f6c99a73e4d06082adc8bf2b",
        "6af9e28dbf9d6aaf027696e2598a5b3d056f5fd2355a7fd5a37a0e5008132d30",
        "e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e",
        "5120e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e",
        "bc1punvppl2stp38f7kwv2u2spltjuvuaayuqsthe34hd2dyy5w4g58qqfuag5",
        ["c093478e9488f956df2396be2ce6c5cced75f900dfa18e7dabd2428aae78451820"],
    ),
    (
        "ee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592",
        [
            _leaf("20387671353e273264c495656e27e39ba899ea8fee3bb69fb2a680e22093447d48ac", 192),
            _leaf("06424950333431", 250),
        ],
        "6c2dc106ab816b73f9d07e3cd1ef2c8c1256f519748e0813e4edd2405d277bef",
        "9e0517edc8259bb3359255400b23ca9507f2a91cd1e4250ba068b4eafceba4a9",
        "712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5",
        "5120712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5",
        "bc1pwyjywgrd0ffr3tx8laflh6228dj98xkjj8rum0zfpd6h0e930h6saqxrrm",
        [
            "c0ee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592"
            "f224a923cd0021ab202ab139cc56802ddb92dcfc172b9212261a539df79a112a",
            "faee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592"
            "8ad69ec7cf41c2a4001fd1f738bf1e505ce2277acdcaa63fe4765192497f47a7",
        ],
    ),
    (
        "f9f400803e683727b14f463836e1e78e1c64417638aa066919291a225f0e8dd8",
        [
            _leaf("2044b178d64c32c4a05cc4f4d1407268f764c940d20ce97abfd44db5c3592b72fdac", 192),
            _leaf("07546170726f6f74", 192),
        ],
        "ab179431c28d3b68fb798957faf5497d69c883c6fb1e1cd9f81483d87bac90cc",
        "639f0281b7ac49e742cd25b7f188657626da1ad169209078e2761cefd91fd65e",
        "77e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220",
        "512077e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220",
        "bc1pwl3s54fzmk0cjnpl3w9af39je7pv5ldg504x5guk2hpecpg2kgsqaqstjq",
        [
            "c1f9f400803e683727b14f463836e1e78e1c64417638aa066919291a225f0e8dd8"
            "2cb2b90daa543b544161530c925f285b06196940d6085ca9474d41dc3822c5cb",
            "c1f9f400803e683727b14f463836e1e78e1c64417638aa066919291a225f0e8dd8"
            "64512fecdb5afa04f98839b50e6f0cb7b1e539bf6f205f67934083cdcc3c8d89",
        ],
    ),
    (
        "e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f",
        [
            _leaf("2072ea6adcf1d371dea8fba1035a09f3d24ed5a059799bae114084130ee5898e69ac", 192),
            [
                _leaf("202352d137f2f3ab38d1eaa976758873377fa5ebb817372c71e2c542313d4abda8ac", 192),
                _leaf("207337c0dd4253cb86f2c43a2351aadd82cccb12a172cd120452b9bb8324f2186aac", 192),
            ],
        ],
        "ccbd66c6f7e8fdab47b3a486f59d28262be857f30d4773f2d5ea47f7761ce0e2",
        "b57bfa183d28eeb6ad688ddaabb265b4a41fbf68e5fed2c72c74de70d5a786f4",
        "91b64d5324723a985170e4dc5a0f84c041804f2cd12660fa5dec09fc21783605",
        "512091b64d5324723a985170e4dc5a0f84c041804f2cd12660fa5dec09fc21783605",
        "bc1pjxmy65eywgafs5tsunw95ruycpqcqnev6ynxp7jaasylcgtcxczs6n332e",
        [
            "c0e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f"
            "ffe578e9ea769027e4f5a3de40732f75a88a6353a09d767ddeb66accef85e553",
            "c0e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f"
            "9e31407bffa15fefbf5090b149d53959ecdf3f62b1246780238c24501d5ceaf6"
            "2645a02e0aac1fe69d69755733a9b7621b694bb5b5cde2bbfc94066ed62b9817",
            "c0e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f"
            "ba982a91d4fc552163cb1c0da03676102d5b7a014304c01f0c77b2b8e888de1c"
            "2645a02e0aac1fe69d69755733a9b7621b694bb5b5cde2bbfc94066ed62b9817",
        ],
    ),
    (
        "55adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d",
        [
            _leaf("2071981521ad9fc9036687364118fb6ccd2035b96a423c59c5430e98310a11abe2ac", 192),
            [
                _leaf("20d5094d2dbe9b76e2c245a2b89b6006888952e2faa6a149ae318d69e520617748ac", 192),
                _leaf("20c440b462ad48c7a77f94cd4532d8f2119dcebbd7c9764557e62726419b08ad4cac", 192),
            ],
        ],
        "2f6b2c5397b6d68ca18e09a3f05161668ffe93a988582d55c6f07bd5b3329def",
        "6579138e7976dc13b6a92f7bfd5a2fc7684f5ea42419d43368301470f3b74ed9",
        "75169f4001aa68f15bbed28b218df1d0a62cbbcf1188c6665110c293c907b831",
        "512075169f4001aa68f15bbed28b218df1d0a62cbbcf1188c6665110c293c907b831",
        "bc1pw5tf7sqp4f50zka7629jrr036znzew70zxyvvej3zrpf8jg8hqcssyuewe",
        [
            "c155adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d"
            "3cd369a528b326bc9d2133cbd2ac21451acb31681a410434672c8e34fe757e91",
            "c155adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d"
            "d7485025fceb78b9ed667db36ed8b8dc7b1f0b307ac167fa516fe4352b9f4ef7"
            "f154e8e8e17c31d3462d7132589ed29353c6fafdb884c5a6e04ea938834f0d9d",
            "c155adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d"
            "737ed1fe30bc42b8022d717b44f0d93516617af64a64753b7a06bf16b26cd711"
            "f154e8e8e17c31d3462d7132589ed29353c6fafdb884c5a6e04ea938834f0d9d",
        ],
    ),
]

# (txin index, internal privkey, merkle root or None, hash type,
#  internal pubkey, tweak, tweaked privkey, sigMsg, sigHash, witness)
KEY_PATH_CASES = [
    (
        0, "6b973d88838f27366ed61c9ad6367663045cb456e28335c109e30717ae0c6baa",
        None, 3,
        "d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d",
        "b86e7be8f39bab32a6f2c0443abbc210f0edac0e2c53d501b36b64437d9c6c70",
        "2405b971772ad26915c8dcdf10f238753a9b837e5f8e6a86fd7c0cce5b7296d9",
        "0003020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f"
        "58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde6"
        "23ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e21"
        "18959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e"
        "0000000000d0418f0e9a36245b9a50ec87f8bf5be5bcae434337b87139c3a5b1f56e33cba0",
        "2514a6272f85cfa0f45eb907fcb0d121b808ed37c6ea160a5a9046ed5526d555",
        "ed7c1647cb97379e76892be0cacff57ec4a7102aa24296ca39af7541246d8ff14d"
        "38958d4cc1e2e478e4d4a764bbfd835b16d4e314b72937b29833060b87276c03",
    ),
    (
        1, "1e4da49f6aaf4e5cd175fe08a32bb5cb4863d963921255f33d3bc31e1343907f",
        "5b75adecf53548f3ec6ad7d78383bf84cc57b55a3127c72b9a2481752dd88b21",
        131,
        "187791b6f712a8ea41c8ecdd0ee77fab3e85263b37e1ec18a3651926b3a6cf27",
        "cbd8679ba636c1110ea247542cfbd964131a6be84f873f7f3b62a777528ed001",
        "ea260c3b10e60f6de018455cd0278f2f5b7e454be1999572789e6a9565d26080",
        "0083020000000065cd1d00d7b7cab57b1393ace2d064f4d4a2cb8af6def61273e127517d44759b6dafdd99"
        "00000000808f891b00000000225120147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3"
        "ffffffffffcef8fb4ca7efc5433f591ecfc57391811ce1e186a3793024def5c884cba51d",
        "325a644af47e8a5a2591cda0ab0723978537318f10e6a63d4eed783b96a71a4d",
        "052aedffc554b41f52b521071793a6b88d6dbca9dba94cf34c83696de0c1ec35c"
        "a9c5ed4ab28059bd606a4f3a657eec0bb96661d42921b5f50a95ad33675b54f83",
    ),
    (
        3, "d3c7af07da2d54f7a7735d3d0fc4f0a73164db638b2f2f7c43f711f6d4aa7e64",
        "c525714a7f49c28aedbbba78c005931a81c234b2f6c99a73e4d06082adc8bf2b",
        1,
        "93478e9488f956df2396be2ce6c5cced75f900dfa18e7dabd2428aae78451820",
        "6af9e28dbf9d6aaf027696e2598a5b3d056f5fd2355a7fd5a37a0e5008132d30",
        "97323385e57015b75b0339a549c56a948eb961555973f0951f555ae6039ef00d",
        "0001020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f"
        "58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde6"
        "23ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e21"
        "18959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e"
        "a2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc5"
        "0003000000",
        "bf013ea93474aa67815b1b6cc441d23b64fa310911d991e713cd34c7f5d46669",
        "ff45f742a876139946a149ab4d9185574b98dc919d2eb6754f8abaa59d18b0256"
        "37a3aa043b91817739554f4ed2026cf8022dbd83e351ce1fabc272841d2510a01",
    ),
    (
        4, "f36bb07a11e469ce941d16b63b11b9b9120a84d9d87cff2c84a8d4affb438f4e",
        "ccbd66c6f7e8fdab47b3a486f59d28262be857f30d4773f2d5ea47f7761ce0e2",
        0,
        "e0dfe2300b0dd746a3f8674dfd4525623639042569d829c7f0eed9602d263e6f",
        "b57bfa183d28eeb6ad688ddaabb265b4a41fbf68e5fed2c72c74de70d5a786f4",
        "a8e7aa924f0d58854185a490e6c41f6efb7b675c0f3331b7f14b549400b4d501",
        "0000020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f"
        "58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde6"
        "23ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e21"
        "18959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e"
        "a2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc5"
        "0004000000",
        "4f900a0bae3f1446fd48490c2958b5a023228f01661cda3496a11da502a7f7ef",
        "b4010dd48a617db09926f729e79c33ae0b4e94b79f04a1ae93ede6315eb3669de"
        "185a17d2b0ac9ee09fd4c64b678a0b61a0a86fa888a273c8511be83bfd6810f",
    ),
    (
        6, "415cfe9c15d9cea27d8104d5517c06e9de48e2f986b695e4f5ffebf230e725d8",
        "2f6b2c5397b6d68ca18e09a3f05161668ffe93a988582d55c6f07bd5b3329def",
        2,
        "55adf4e8967fbd2e29f20ac896e60c3b0f1d5b0efa9d34941b5958c7b0a0312d",
        "6579138e7976dc13b6a92f7bfd5a2fc7684f5ea42419d43368301470f3b74ed9",
        "241c14f2639d0d7139282aa6abde28dd8a067baa9d633e4e7230287ec2d02901",
        "0002020000000065cd1de3b33bb4ef3a52ad1fffb555c0d82828eb22737036eaeb02a235d82b909c4c3f"
        "58a6964a4f5f8f0b642ded0a8a553be7622a719da71d1f5befcefcdee8e0fde6"
        "23ad0f61ad2bca5ba6a7693f50fce988e17c3780bf2b1e720cfbb38fbdd52e21"
        "18959c7221ab5ce9e26c3cd67b22c24f8baa54bac281d8e6b05e400e6c3a957e"
        "0006000000",
        "15f25c298eb5cdc7eb1d638dd2d45c97c4c59dcaec6679cfc16ad84f30876b85",
        "a3785919a2ce3c4ce26f298c3d51619bc474ae24014bcdd31328cd8cfbab2eff"
        "3395fa0a16fe5f486d12f22a9cedded5ae74feb4bbe5351346508c5405bcfee002",
    ),
    (
        7, "c7b0e81f0a9a0b0499e112279d718cca98e79a12e2f137c72ae5b213aad0d103",
        "6c2dc106ab816b73f9d07e3cd1ef2c8c1256f519748e0813e4edd2405d277bef",
        130,
        "ee4fe085983462a184015d1f782d6a5f8b9c2b60130aff050ce221ecf3786592",
        "9e0517edc8259bb3359255400b23ca9507f2a91cd1e4250ba068b4eafceba4a9",
        "65b6000cd2bfa6b7cf736767a8955760e62b6649058cbc970b7c0871d786346b",
        "0082020000000065cd1d00e9aa6b8e6c9de67619e6a3924ae25696bb7b694bb677a632a74ef7eadfd4eabf"
        "00000000804c8b2000000000225120712447206d7a5238acc7ff53fbe94a3b64539ad291c7cdbc490b7577e4b17df5"
        "ffffffff",
        "cd292de50313804dabe4685e83f923d2969577191a3e1d2882220dca88cbeb10",
        "ea0c6ba90763c2d3a296ad82ba45881abb4f426b3f87af162dd24d5109edc1cdd"
        "11915095ba47c3a9963dc1e6c432939872bc49212fe34c632cd3ab9fed429c482",
    ),
    (
        8, "77863416be0d0665e517e1c375fd6f75839544eca553675ef7fdf4949518ebaa",
        "ab179431c28d3b68fb798957faf5497d69c883c6fb1e1cd9f81483d87bac90cc",
        129,
        "f9f400803e683727b14f463836e1e78e1c64417638aa066919291a225f0e8dd8",
        "639f0281b7ac49e742cd25b7f188657626da1ad169209078e2761cefd91fd65e",
        "ec18ce6af99f43815db543f47b8af5ff5df3b2cb7315c955aa4a86e8143d2bf5",
        "0081020000000065cd1da2e6dab7c1f0dcd297c8d61647fd17d821541ea69c3cc37dcbad7f90d4eb4bc5"
        "00a778eb6a263dc090464cd125c466b5a99667720b1c110468831d058aa1b82af1"
        "01000000002b0c230000000022512077e30a5522dd9f894c3f8b8bd4c4b2cf82ca7da8a3ea6a239655c39c050ab220"
        "ffffffff",
        "cccb739eca6c13a8a89e6e5cd317ffe55669bbda23f2fd37b0f18755e008edd2",
        "bbc9584a11074e83bc8c6759ec55401f0ae7b03ef290c3139814f545b58a9f81"
        "27258000874f44bc46db7646322107d4d86aec8e73b8719a61fff761d75b5dd981",
    ),
]


class Bip341VectorTests(unittest.TestCase):
    def test_script_pubkey_cases(self):
        self.assertEqual(len(SCRIPT_PUBKEY_CASES), 7)
        for index, (internal, tree, root, tweak, tweaked,
                    spk, address, blocks) in enumerate(SCRIPT_PUBKEY_CASES):
            with self.subTest(case=index):
                internal_bytes = bytes.fromhex(internal)
                root_bytes = bytes.fromhex(root) if root else None
                if root is not None:
                    self.assertEqual(
                        bip341.tree_hash(tree).hex(), root.lower()
                    )
                got_tweak, got_pubkey, _parity = bip341.taproot_output_key(
                    internal_bytes, root_bytes
                )
                self.assertEqual(got_tweak.hex(), tweak.lower())
                self.assertEqual(got_pubkey.hex(), tweaked.lower())
                self.assertEqual(
                    bip341.script_pubkey(internal_bytes, root_bytes).hex(),
                    spk.lower(),
                )
                self.assertEqual(
                    bech32.segwit_addr_encode("bc", 1, got_pubkey), address
                )
                got_blocks = [
                    block.hex()
                    for _leaf, block in bip341.control_blocks_for_tree(
                        internal_bytes, tree
                    )
                ]
                self.assertEqual(got_blocks, [b.lower() for b in blocks])

    def test_control_block_verification(self):
        for index, (internal, tree, root, _tweak, tweaked,
                    _spk, _addr, _blocks) in enumerate(SCRIPT_PUBKEY_CASES):
            if tree is None:
                continue
            with self.subTest(case=index):
                for leaf, block in bip341.control_blocks_for_tree(
                    bytes.fromhex(internal), tree
                ):
                    self.assertTrue(
                        bip341.verify_control_block(
                            bytes.fromhex(tweaked),
                            leaf["leafVersion"],
                            leaf["script"],
                            block,
                        )
                    )
                # A control block for the wrong output key must fail.
                leaf, block = bip341.control_blocks_for_tree(
                    bytes.fromhex(internal), tree
                )[0]
                self.assertFalse(
                    bip341.verify_control_block(
                        bytes(32), leaf["leafVersion"], leaf["script"], block
                    )
                )

    def test_empty_merkle_root_differs_from_zero_root(self):
        # BIP-341: no scripts (empty root) and a 32-byte zero root are
        # different tweaks; only the former is the key-path-only case.
        internal = bytes.fromhex(SCRIPT_PUBKEY_CASES[0][0])
        tweak_empty, _, _ = bip341.taproot_output_key(internal, None)
        tweak_zero, _, _ = bip341.taproot_output_key(internal, bytes(32))
        self.assertNotEqual(tweak_empty, tweak_zero)
        self.assertEqual(
            tweak_empty.hex(),
            SCRIPT_PUBKEY_CASES[0][3].lower(),
        )

    def test_key_path_spending(self):
        self.assertEqual(len(KEY_PATH_CASES), 7)
        for (txin, priv, root, hash_type, internal, tweak,
             tweaked_priv, sig_msg, sig_hash, witness) in KEY_PATH_CASES:
            with self.subTest(txin=txin):
                root_bytes = bytes.fromhex(root) if root else None
                got_priv, got_pub, got_tweak = bip341.tweak_privkey(
                    bytes.fromhex(priv), root_bytes
                )
                self.assertEqual(got_priv.hex(), tweaked_priv.lower())
                self.assertEqual(got_pub.hex(), internal.lower())
                self.assertEqual(got_tweak.hex(), tweak.lower())
                # TapSighash of the given signature message.
                self.assertEqual(
                    tagged_hash("TapSighash", bytes.fromhex(sig_msg)).hex(),
                    sig_hash.lower(),
                )
                # Deterministic BIP-340 signature with zero aux randomness
                # reproduces the vector witness (plus its sighash byte).
                _, tweaked_pub, _ = bip341.taproot_output_key(
                    bytes.fromhex(internal), root_bytes
                )
                sig = bip340.sign(
                    bytes.fromhex(sig_hash),
                    bytes.fromhex(tweaked_priv),
                    bytes(32),
                )
                self.assertTrue(
                    bip340.verify(
                        bytes.fromhex(sig_hash), tweaked_pub, sig
                    )
                )
                witness_bytes = bytes.fromhex(witness)
                self.assertEqual(witness_bytes[:64], sig)
                if hash_type == 0:
                    self.assertEqual(len(witness_bytes), 64)
                else:
                    self.assertEqual(len(witness_bytes), 65)
                    self.assertEqual(witness_bytes[64], hash_type)


if __name__ == "__main__":
    unittest.main()
