"""omega.bip341 -- BIP-341 Taproot output construction.

Implements the wallet-side Taproot construction from BIP-341:
tagged ``TapLeaf`` / ``TapBranch`` / ``TapTweak`` hashes, Merkle-tree
construction from a script tree, output-key tweaking, control-block
construction and verification, and tweaked private-key derivation
for key-path spending. Standard library only.

Rules pinned here (all verified against the official BIP-341
wallet test vectors in the test suite):
- A leaf hash is ``tagged_hash("TapLeaf", leaf_version || compact_size(len(script)) || script)``.
- An inner node hashes its two children sorted lexicographically
  (smaller first) with ``tagged_hash("TapBranch", ...)``.
- The tweak is ``tagged_hash("TapTweak", internal_pubkey || merkle_root)``;
  with no scripts the merkle root is *empty* (zero bytes appended),
  which is a different tweak from a 32-byte all-zero root.
- The tweak must be < n; the output key is ``P + int(tweak)*G``.
- The control block is ``leaf_version | parity_bit`` followed by
  the 32-byte internal key and the Merkle path (leaf to root).
- A tweaked private key negates the internal secret first when
  the internal public key has odd y, then adds the tweak mod n.
"""

from .secp256k1 import (
    G,
    N,
    bytes_from_point,
    has_even_y,
    lift_x,
    point_add,
    point_mul,
    tagged_hash,
)

TAPLEAF_VERSION = 0xC0  # tapscript leaf version (BIP-342)


def compact_size(n):
    """Bitcoin CompactSize encoding of a non-negative integer."""
    if n < 0:
        raise ValueError("CompactSize cannot encode a negative integer")
    if n < 0xFD:
        return bytes([n])
    if n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    if n <= 0xFFFFFFFF:
        return b"\xfe" + n.to_bytes(4, "little")
    return b"\xff" + n.to_bytes(8, "little")


def tapleaf_hash(leaf_version, script):
    """BIP-341 TapLeaf hash for one (version, script) leaf."""
    if not 0 <= leaf_version <= 255:
        raise ValueError("leaf version must be a single byte")
    if len(script) > 0xFFFFFFFF:
        raise ValueError("script too large")
    return tagged_hash(
        "TapLeaf",
        bytes([leaf_version]) + compact_size(len(script)) + script,
    )


def tapbranch_hash(left, right):
    """BIP-341 TapBranch hash of two 32-byte child hashes.

    The children are hashed in lexicographic order (smaller first),
    per the BIP-341 control-block verification rule.
    """
    if len(left) != 32 or len(right) != 32:
        raise ValueError("TapBranch children must be 32 bytes")
    if left < right:
        return tagged_hash("TapBranch", left + right)
    return tagged_hash("TapBranch", right + left)


def tree_hash(tree):
    """Merkle root of a script tree.

    ``tree`` is None (no scripts), a leaf dict
    ``{"script": bytes, "leafVersion": int}`` (or a ``(version, script)``
    tuple), or a 2-element list/tuple ``[left, right]`` of subtrees.
    Returns the 32-byte root, or None when there are no scripts.
    """
    if tree is None:
        return None
    if isinstance(tree, dict):
        return tapleaf_hash(tree["leafVersion"], tree["script"])
    if isinstance(tree, tuple) and len(tree) == 2 and isinstance(tree[0], int):
        version, script = tree
        return tapleaf_hash(version, script)
    if isinstance(tree, (list, tuple)) and len(tree) == 2:
        return tapbranch_hash(tree_hash(tree[0]), tree_hash(tree[1]))
    raise ValueError("malformed script tree")


def _leaf_paths(tree, path=()):
    """Yield ``(leaf, path)`` for every leaf; ``path`` is the list of
    sibling hashes from the leaf up towards the root."""
    if isinstance(tree, dict):
        yield tree, list(path)
        return
    if isinstance(tree, tuple) and len(tree) == 2 and isinstance(tree[0], int):
        yield {"leafVersion": tree[0], "script": tree[1]}, list(path)
        return
    if isinstance(tree, (list, tuple)) and len(tree) == 2:
        left, right = tree
        left_hash, right_hash = tree_hash(left), tree_hash(right)
        # Prepend: the path is ordered leaf-up, so a sibling found
        # deeper in the tree comes before siblings found higher up.
        yield from _leaf_paths(left, (right_hash,) + path)
        yield from _leaf_paths(right, (left_hash,) + path)
        return
    raise ValueError("malformed script tree")


def taproot_output_key(internal_pubkey, merkle_root=None):
    """Compute ``(tweak, output_pubkey, parity)`` for a Taproot output.

    ``internal_pubkey`` is 32-byte x-only; ``merkle_root`` is 32 bytes
    or None (no scripts). Raises ``ValueError`` if the internal key
    does not lift to a curve point or the tweak is >= n.
    """
    if len(internal_pubkey) != 32:
        raise ValueError("internal public key must be 32 bytes")
    if merkle_root is not None and len(merkle_root) != 32:
        raise ValueError("merkle root must be 32 bytes or None")
    point = lift_x(int.from_bytes(internal_pubkey, "big"))
    if point is None:
        raise ValueError("internal public key is not on the curve")
    tweak = tagged_hash(
        "TapTweak", internal_pubkey + (merkle_root or b"")
    )
    if int.from_bytes(tweak, "big") >= N:
        raise ValueError("TapTweak is >= curve order (negligibly unlikely)")
    output_point = point_add(point, point_mul(int.from_bytes(tweak, "big"), G))
    if output_point is None:
        raise ValueError("tweaked output key is the point at infinity")
    return tweak, bytes_from_point(output_point), output_point[1] & 1


def script_pubkey(internal_pubkey, merkle_root=None):
    """35-byte P2TR scriptPubKey: ``OP_1 || push32 || output_key``."""
    _, output_pubkey, _ = taproot_output_key(internal_pubkey, merkle_root)
    return b"\x51\x20" + output_pubkey


def control_block(internal_pubkey, leaf_version, merkle_path, parity):
    """Control block for one leaf: version|parity || internal key ||
    Merkle path (leaf to root). ``merkle_path`` is ordered leaf-up."""
    if len(internal_pubkey) != 32:
        raise ValueError("internal public key must be 32 bytes")
    if not 0 <= leaf_version <= 255:
        raise ValueError("leaf version must be a single byte")
    if parity not in (0, 1):
        raise ValueError("parity must be 0 or 1")
    for element in merkle_path:
        if len(element) != 32:
            raise ValueError("Merkle path elements must be 32 bytes")
    return (
        bytes([(leaf_version & 0xFE) | parity])
        + internal_pubkey
        + b"".join(merkle_path)
    )


def control_blocks_for_tree(internal_pubkey, tree):
    """All control blocks for a script tree, keyed by leaf id order.

    Returns a list of ``(leaf, control_block)`` in the order the
    leaves appear in the tree (left to right). Each leaf's path is
    ordered leaf-up, as required by BIP-341 verification.
    """
    if tree is None:
        return []
    merkle_root = tree_hash(tree)
    _, _, parity = taproot_output_key(internal_pubkey, merkle_root)
    result = []
    for leaf, path in _leaf_paths(tree):
        result.append(
            (
                leaf,
                control_block(
                    internal_pubkey, leaf["leafVersion"], path, parity
                ),
            )
        )
    return result


def verify_control_block(output_pubkey, leaf_version, script, control):
    """Verify a control block commits a script to an output key.

    Recomputes the TapLeaf hash, walks the Merkle path, re-derives
    the tweak and output key, and checks both the key and the parity
    bit. Returns True/False, never raises on malformed input.
    """
    try:
        if len(output_pubkey) != 32:
            return False
        if len(control) < 33 or (len(control) - 33) % 32 != 0:
            return False
        if control[0] & 0xFE != leaf_version & 0xFE:
            return False
        internal_pubkey = control[1:33]
        path = [
            control[33 + 32 * i:65 + 32 * i]
            for i in range((len(control) - 33) // 32)
        ]
        leaf = tapleaf_hash(leaf_version, script)
        node = leaf
        for sibling in path:
            node = tapbranch_hash(node, sibling)
        _, derived, parity = taproot_output_key(internal_pubkey, node)
        return derived == output_pubkey and (control[0] & 1) == parity
    except (ValueError, TypeError):
        return False


def tweak_privkey(internal_privkey, merkle_root=None):
    """Tweaked private key for key-path spending (BIP-341).

    Negates the internal secret when its public key has odd y,
    then adds the tweak mod n. Returns
    ``(tweaked_privkey_bytes, internal_pubkey, tweak)``.
    """
    from .bip340 import pubkey_gen

    if len(internal_privkey) != 32:
        raise ValueError("internal private key must be 32 bytes")
    d = int.from_bytes(internal_privkey, "big")
    if not 1 <= d <= N - 1:
        raise ValueError("internal private key must be in the range 1..n-1")
    internal_pubkey = pubkey_gen(internal_privkey)
    # Parity is decided by d*G itself, NOT by lift_x (which always
    # returns the even-y point and would therefore never trigger the
    # negation). Negating d first is what makes the tweaked key match
    # the even-y internal public key.
    point = point_mul(d, G)
    if point is None:
        raise ValueError("internal public key is not on the curve")
    if not has_even_y(point):
        d = N - d
    tweak = tagged_hash(
        "TapTweak", internal_pubkey + (merkle_root or b"")
    )
    if int.from_bytes(tweak, "big") >= N:
        raise ValueError("TapTweak is >= curve order (negligibly unlikely)")
    tweaked = (d + int.from_bytes(tweak, "big")) % N
    return tweaked.to_bytes(32, "big"), internal_pubkey, tweak
