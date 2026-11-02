"""txscript.py — legacy transaction wire format, script, and consensus validation
for the Genesis Fork. Pure Python, stdlib only."""
import hashlib
import struct
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import secp256k1 as secp
from genesis_fork import (sha256d, ser_varint, push, subsidy,
                          QLOCK_ACTIVATION, qlock_activation,
                          QDAY_ACTIVATION, qday_activation,
                          HTLC_ACTIVATION, htlc_activation)
from txpq import decode_witness, trifold_verify

SIGHASH_ALL = 0x01
COINBASE_MATURITY = 100

# ---------------------------------------------------------------- wire parse
def _read_varint(b: bytes, p: int):
    n = b[p]
    if n < 0xfd:
        return n, p + 1
    if n == 0xfd:
        return struct.unpack("<H", b[p + 1:p + 3])[0], p + 3
    if n == 0xfe:
        return struct.unpack("<I", b[p + 1:p + 5])[0], p + 5
    return struct.unpack("<Q", b[p + 1:p + 9])[0], p + 9


def parse_tx(tx: bytes) -> dict:
    """Parse a legacy tx. Raises ValueError on malformed input."""
    p = 0
    if len(tx) < 10:
        raise ValueError("tx too short")
    ver = struct.unpack("<I", tx[p:p + 4])[0]; p += 4
    n_in, p = _read_varint(tx, p)
    if n_in == 0:
        raise ValueError("no inputs")
    vins = []
    for _ in range(n_in):
        if p + 36 > len(tx):
            raise ValueError("truncated vin")
        prev = tx[p:p + 32]; p += 32
        idx = struct.unpack("<I", tx[p:p + 4])[0]; p += 4
        sl, p = _read_varint(tx, p)
        if p + sl + 4 > len(tx):
            raise ValueError("truncated scriptSig")
        ss = tx[p:p + sl]; p += sl
        seq = struct.unpack("<I", tx[p:p + 4])[0]; p += 4
        vins.append({"prev": prev, "idx": idx, "script": ss, "seq": seq})
    n_out, p = _read_varint(tx, p)
    if n_out == 0:
        raise ValueError("no outputs")
    vouts = []
    for _ in range(n_out):
        if p + 8 > len(tx):
            raise ValueError("truncated vout")
        val = struct.unpack("<Q", tx[p:p + 8])[0]; p += 8
        sl, p = _read_varint(tx, p)
        if p + sl > len(tx):
            raise ValueError("truncated scriptPubKey")
        spk = tx[p:p + sl]; p += sl
        vouts.append({"value": val, "script": spk})
    if p + 4 > len(tx):
        raise ValueError("truncated locktime")
    lock = struct.unpack("<I", tx[p:p + 4])[0]; p += 4
    if p != len(tx):
        raise ValueError("trailing bytes")
    return {"version": ver, "vin": vins, "vout": vouts,
            "locktime": lock, "raw": tx}


def ser_tx(t: dict) -> bytes:
    out = struct.pack("<I", t["version"])
    out += ser_varint(len(t["vin"]))
    for v in t["vin"]:
        out += v["prev"] + struct.pack("<I", v["idx"])
        out += ser_varint(len(v["script"])) + v["script"]
        out += struct.pack("<I", v["seq"])
    out += ser_varint(len(t["vout"]))
    for v in t["vout"]:
        out += struct.pack("<Q", v["value"])
        out += ser_varint(len(v["script"])) + v["script"]
    out += struct.pack("<I", t["locktime"])
    return out


def txid_internal(tx: bytes) -> bytes:
    return sha256d(tx)  # wire order


def txid_display(tx: bytes) -> str:
    return sha256d(tx)[::-1].hex()

# ---------------------------------------------------------------- coinbase v2
def make_coinbase_v2(height: int, bits: int, tag: bytes, fees: int = 0,
                   miner_pubkey: bytes = None, extra_pushes: list = None) -> bytes:
    """Coinbase with a BIP34-style height push: scriptSig =
    push(LE(bits)) + push(tag) + push(LE(height)). First push still LE(bits),
    so check_coinbase_lineage passes; the height push makes the txid unique
    per block (pre-v2 coinbases shared txids within a (bits, tag) era).

    miner_pubkey: the block finder's 33-byte compressed public key. When
    given (and the Lockbox is active), the reward pays that key's PKH lock
    directly — solo miners need no pool. Without it, the opcode-free OPEN
    lock is used (anyone-can-spend, e.g. for historical or custodial
    issuance).

    extra_pushes: optional list of byte strings appended as extra scriptSig
    pushes after the height push (e.g. the UTXO snapshot hash commitment
    at the snapshot activation height). check_coinbase_lineage only
    constrains pushes[0], so extra pushes are consensus-safe.
    """
    from genesis_fork import make_coinbase as _mk
    scriptsig = (push(struct.pack("<I", bits)) + push(tag)
                 + push(struct.pack("<I", height)))
    if extra_pushes:
        for e in extra_pushes:
            scriptsig += push(bytes(e))
    tx = struct.pack("<I", 1)
    tx += b"\x01"
    tx += bytes(32) + struct.pack("<I", 0xffffffff)
    tx += ser_varint(len(scriptsig)) + scriptsig
    tx += struct.pack("<I", 0xffffffff)
    tx += b"\x01"
    tx += struct.pack("<Q", subsidy(height) + fees)
    # Post-Lockbox, coinbases pay the miner's PKH lock when the miner's key
    # is known, else the opcode-free OPEN lock (never OP_TRUE again).
    if height >= qlock_activation():
        clock = (lock_pkh_for_pubkey(miner_pubkey) if miner_pubkey
                 else lock_open())
    else:
        clock = b"\x51"
    tx += ser_varint(len(clock)) + clock
    tx += struct.pack("<I", 0)
    return tx

# ---------------------------------------------------------------- sighash
def sighash_all(t: dict, in_idx: int, script_code: bytes) -> bytes:
    """Legacy SIGHASH_ALL sighash for input in_idx."""
    out = struct.pack("<I", t["version"])
    out += ser_varint(len(t["vin"]))
    for i, v in enumerate(t["vin"]):
        out += v["prev"] + struct.pack("<I", v["idx"])
        sc = script_code if i == in_idx else b""
        out += ser_varint(len(sc)) + sc
        out += struct.pack("<I", v["seq"])
    out += ser_varint(len(t["vout"]))
    for v in t["vout"]:
        out += struct.pack("<Q", v["value"])
        out += ser_varint(len(v["script"])) + v["script"]
    out += struct.pack("<I", t["locktime"])
    out += struct.pack("<I", SIGHASH_ALL)
    return sha256d(out)

# ---------------------------------------------------------------- script
def _parse_script(script: bytes):
    ops = []
    i = 0
    while i < len(script):
        op = script[i]
        if op <= 75:
            if i + 1 + op > len(script):
                raise ValueError("push past end")
            ops.append(script[i + 1:i + 1 + op])
            i += 1 + op
        elif op == 76:  # PUSHDATA1 (accepted, non-standard)
            n = script[i + 1]
            ops.append(script[i + 2:i + 2 + n])
            i += 2 + n
        else:
            ops.append(op)
            i += 1
    return ops


def _eval(script_sig: bytes, script_pubkey: bytes, sighash_fn) -> bool:
    """Execute scriptSig + scriptPubKey. sighash_fn() -> 32-byte hash."""
    try:
        ops = _parse_script(script_sig) + _parse_script(script_pubkey)
    except ValueError:
        return False
    stack = []
    for op in ops:
        if isinstance(op, bytes):
            if len(op) > 520:
                return False
            stack.append(op)
        elif op == 0x00:
            stack.append(b"")
        elif 0x51 <= op <= 0x60:  # OP_1 .. OP_16
            stack.append(bytes([op - 0x50]))
        elif op == 0xAC:  # OP_CHECKSIG
            if len(stack) < 2:
                return False
            pub = stack.pop()
            sig = stack.pop()
            ok = False
            if len(pub) == 33 and len(sig) == 65 and sig[-1] == SIGHASH_ALL:
                try:
                    pt = secp.decompress(pub)
                except Exception:
                    pt = None
                if pt is not None:
                    ok = secp.verify(pt, sig[:-1], sighash_fn())
            stack.append(b"\x01" if ok else b"")
        else:
            return False  # unknown opcode: fail closed
    if not stack:
        return False
    return stack[-1] not in (b"", b"\x00")


def p2pk_script(pubkey_compressed: bytes) -> bytes:
    assert len(pubkey_compressed) == 33
    return b"\x21" + pubkey_compressed + b"\xac"


def spk_pubkey(spk: bytes):
    """Return the compressed pubkey for a P2PK script, else None."""
    if len(spk) == 35 and spk[0] == 0x21 and spk[34] == 0xAC:
        return spk[1:34]
    return None


def is_anyone(spk: bytes) -> bool:
    return spk == b"\x51"  # OP_TRUE


# ------------------------------------------------- Lockbox: opcode-free locks
# Post-QLOCK_ACTIVATION, outputs are structural locks, not Script programs.
# No opcodes exist: authorization is determined by the lock version byte.
#   PKH  = b"\x00" + hash160(pubkey)   key-hash locked (quantum-safe at rest)
#   OPEN = b"\xff"                     anyone-spend (no key, no opcode)
# Legacy locks (P2PK "0x21<33>0xAC", OP_TRUE 0x51) remain *spendable* for
# existing UTXOs but cannot be *created* after activation.
def hash160(b: bytes) -> bytes:
    try:
        return hashlib.new("ripemd160", hashlib.sha256(b).digest()).digest()
    except Exception:  # OpenSSL without the legacy provider
        from ripemd160_pure import ripemd160_pure
        return ripemd160_pure(hashlib.sha256(b).digest())


def lock_pkh(h160: bytes) -> bytes:
    assert len(h160) == 20
    return b"\x00" + h160


def lock_pkh_for_pubkey(pubkey_compressed: bytes) -> bytes:
    assert len(pubkey_compressed) == 33 and pubkey_compressed[0] in (2, 3)
    return lock_pkh(hash160(pubkey_compressed))


def lock_open() -> bytes:
    return b"\xff"


# --- Q-Day: post-quantum lock (activates at QDAY_ACTIVATION) ----------------
#   PQH = b"\x02" + hash160(trifold_root)   spent by a Trifold witness
# Authorization is hash-only end to end: no curve, no pubkey to expose,
# nothing for a quantum adversary to derive at rest or in flight.
def lock_pqh(h160: bytes) -> bytes:
    assert len(h160) == 20
    return b"\x02" + h160


def lock_pqh_for_root(root: bytes) -> bytes:
    assert len(root) == 32
    return lock_pqh(hash160(root))


# --- HTLC: structural hash-time lock (activates at HTLC_ACTIVATION) ---------
# Why a new lock type instead of a Bitcoin-style HTLC script: the Lockbox
# removed opcodes, so OP_IF / OP_EQUALVERIFY / OP_CHECKLOCKTIMEVERIFY
# scripts are non-standard and tx locktime is unsupported. The HTLC is
# therefore carried the same way PQH is — as a 21-byte structural lock
# committing to a descriptor, with the spend data carried in the scriptSig.
#
# Descriptor (102 bytes, exactly):
#   secret_hash   32 bytes  SHA256 of the secret (claim path only)
#   claim_pubkey  33 bytes  compressed pubkey that may claim with the secret
#   refund_pubkey 33 bytes  compressed pubkey that may refund after timeout
#   timeout        4 bytes  block height, big-endian; refund allowed at
#                            height >= timeout (NOT tx locktime)
# Lock: 0x03 + hash160(descriptor)  (21 bytes, like PKH/PQH)
#
# Claim scriptSig (233 bytes):
#   0x01 | claim_pubkey (33) | sig (64) | SIGHASH_ALL (1) |
#   secret (32) | descriptor (102)
# Refund scriptSig (201 bytes):
#   0x02 | refund_pubkey (33) | sig (64) | SIGHASH_ALL (1) | descriptor (102)
# The sighash is the standard sighash_all over the tx with script_code =
# the HTLC lock itself, so the signature commits to the lock, the amount
# path, and the spend. The descriptor is supplied by the spender and
# verified by hash against the lock, so the lock reveals nothing about
# the secret, the keys, or the timeout until spent (same "hidden" posture
# as PKH, not the pubkey-exposing legacy P2PK form).
HTLC_CLAIM = 0x01
HTLC_REFUND = 0x02


def htlc_descriptor(secret_hash: bytes, claim_pubkey: bytes,
                    refund_pubkey: bytes, timeout: int) -> bytes:
    assert len(secret_hash) == 32, "secret_hash must be 32 bytes"
    assert len(claim_pubkey) == 33 and claim_pubkey[0] in (2, 3)
    assert len(refund_pubkey) == 33 and refund_pubkey[0] in (2, 3)
    assert 0 <= timeout <= 0xFFFFFFFF, "timeout out of range"
    return (secret_hash + claim_pubkey + refund_pubkey
            + struct.pack(">I", timeout))


def parse_htlc_descriptor(d: bytes) -> dict:
    if len(d) != 102:
        raise ValueError("HTLC descriptor must be 102 bytes")
    secret_hash, claim_pubkey, refund_pubkey = d[:32], d[32:65], d[65:98]
    if claim_pubkey[0] not in (2, 3) or refund_pubkey[0] not in (2, 3):
        raise ValueError("HTLC descriptor pubkey must be compressed")
    return {"secret_hash": secret_hash, "claim_pubkey": claim_pubkey,
            "refund_pubkey": refund_pubkey,
            "timeout": struct.unpack(">I", d[98:102])[0]}


def lock_htlc(secret_hash: bytes, claim_pubkey: bytes,
              refund_pubkey: bytes, timeout: int) -> bytes:
    return b"\x03" + hash160(
        htlc_descriptor(secret_hash, claim_pubkey, refund_pubkey, timeout))


def lock_htlc_for_descriptor(descriptor: bytes) -> bytes:
    parse_htlc_descriptor(descriptor)  # validates shape
    return b"\x03" + hash160(descriptor)


def lock_type(spk: bytes):
    """'pkh' | 'open' | 'pqh' | 'htlc' | 'p2pk' (legacy) | 'anyone' | None."""
    if len(spk) == 21 and spk[0] == 0x03:
        return "htlc"
    if len(spk) == 21 and spk[0] == 0x02:
        return "pqh"
    if len(spk) == 21 and spk[0] == 0x00:
        return "pkh"
    if spk == b"\xff":
        return "open"
    if len(spk) == 35 and spk[0] == 0x21 and spk[34] == 0xAC:
        return "p2pk"
    if spk == b"\x51":
        return "anyone"
    return None


def lock_quantum(spk: bytes) -> str:
    """Quantum exposure of a lock (for BIP-369 policy):
    'exposed' = pubkey visible in the UTXO set (legacy P2PK) -- a quantum
        adversary can derive the key at rest (long-exposure attack);
    'hidden'  = pubkey hidden behind a hash until spent (PKH) -- the key is
        only exposed in the mempool at spend time (short-exposure attack,
        the exact threat BIP-369 addresses);
    'none'    = no key to steal (OPEN / anyone-spend)."""
    lt = lock_type(spk)
    if lt == "p2pk":
        return "exposed"
    if lt == "pkh":
        return "hidden"
    if lt == "htlc":
        return "hidden"  # keys + secret hash hidden behind hash160 until spent
    if lt == "pqh":
        return "pq"
    return "none"


def sign_pkh_input(t: dict, in_idx: int, lock: bytes, priv: int,
                   compressed: bool = True) -> bytes:
    """scriptSig authorizing a PKH input: pubkey || sig(64) || SIGHASH_ALL.
    Compressed form is 98 bytes; uncompressed (65-byte pubkey) is 130 bytes,
    for spending pre-2016 Bitcoin P2PKH outputs whose hash160 commits to an
    uncompressed key. No opcodes; the lock is structural."""
    assert lock_type(lock) == "pkh"
    h = sighash_all(t, in_idx, lock)
    sig = secp.sign(priv, h)
    pt = secp.priv_to_pub(priv)
    if compressed:
        pub = secp.compress(pt)
    else:
        pub = b"\x04" + pt[0].to_bytes(32, "big") + pt[1].to_bytes(32, "big")
    assert hash160(pub) == lock[1:], "key does not match lock"
    return pub + sig + bytes([SIGHASH_ALL])


def sign_input(t: dict, in_idx: int, script_code: bytes, priv: int) -> bytes:
    """Return scriptSig for a P2PK input."""
    h = sighash_all(t, in_idx, script_code)
    sig = secp.sign(priv, h)
    return bytes([65]) + sig + bytes([SIGHASH_ALL])


def sign_htlc_claim(t: dict, in_idx: int, lock: bytes, priv: int,
                    secret: bytes, descriptor: bytes) -> bytes:
    """Claim scriptSig for an HTLC input: mode | pubkey | sig | sighash |
    secret | descriptor. The caller's key must be the descriptor's
    claim_pubkey and the secret must hash to its secret_hash."""
    assert lock_type(lock) == "htlc"
    d = parse_htlc_descriptor(descriptor)
    assert lock_htlc_for_descriptor(descriptor) == lock, "descriptor != lock"
    assert len(secret) == 32, "secret must be 32 bytes"
    h = sighash_all(t, in_idx, lock)
    sig = secp.sign(priv, h)
    pt = secp.priv_to_pub(priv)
    pub = secp.compress(pt)
    assert pub == d["claim_pubkey"], "key is not the claim key"
    assert hashlib.sha256(secret).digest() == d["secret_hash"], \
        "secret does not match secret_hash"
    return bytes([HTLC_CLAIM]) + pub + sig + bytes([SIGHASH_ALL]) + secret + descriptor


def sign_htlc_refund(t: dict, in_idx: int, lock: bytes, priv: int,
                     descriptor: bytes) -> bytes:
    """Refund scriptSig for an HTLC input: mode | pubkey | sig | sighash |
    descriptor. The caller's key must be the descriptor's refund_pubkey;
    the height check (height >= timeout) is enforced in validation."""
    assert lock_type(lock) == "htlc"
    d = parse_htlc_descriptor(descriptor)
    assert lock_htlc_for_descriptor(descriptor) == lock, "descriptor != lock"
    h = sighash_all(t, in_idx, lock)
    sig = secp.sign(priv, h)
    pt = secp.priv_to_pub(priv)
    pub = secp.compress(pt)
    assert pub == d["refund_pubkey"], "key is not the refund key"
    return bytes([HTLC_REFUND]) + pub + sig + bytes([SIGHASH_ALL]) + descriptor

# ---------------------------------------------------------------- validation
def _view_copy(utxo):
    """Private validation view of a UTXO set. UtxoSet.copy() is cheap (it
    shares the immutable snapshot); plain dicts get the legacy full copy
    (dict.copy() would be shallow and let spends mutate the caller's
    entry lists)."""
    if isinstance(utxo, dict):
        return {k: list(v) for k, v in utxo.items()}
    if hasattr(utxo, "copy"):
        return utxo.copy()
    return {k: list(v) for k, v in utxo.items()}


def _spend_from_view(view: dict, key):
    """Consume the oldest entry for key. Returns the entry or None."""
    entries = view.get(key)
    if not entries:
        return None
    e = entries.pop(0)
    if not entries:
        del view[key]
    return e


def validate_tx(tx: bytes, utxo: dict, height: int, view: dict = None,
                spent_pairs: set = None):
    """Full consensus validation of one non-coinbase tx.

    Returns (ok, reason, fee). When view is given, spends apply to the view
    (for intra-block chaining); utxo itself is never mutated.

    Spent-leaf guard (Q-Day, one-time leaves): spent_pairs, when given, is
    a mutable set of (root, index) pairs already spent on the chain (or
    earlier in the same block). A PQH input whose pair is in that set, or
    that repeats a pair already used by an earlier input of this same tx,
    is rejected with "spent leaf already used". On success the tx's own
    pairs are added to spent_pairs, so a caller validating a block in
    order gets intra-block protection for free. On failure nothing is
    added. Callers that need atomicity must pass a copy and discard it
    on failure. When spent_pairs is None, only the intra-tx check applies
    (first-spend behaviour is unchanged).
    """
    try:
        t = parse_tx(tx)
    except ValueError as e:
        return False, f"parse: {e}", 0
    if t["version"] != 1:
        return False, "version != 1", 0
    if t["locktime"] != 0:
        return False, "locktime != 0 (unsupported)", 0
    # Private validation view: the caller's utxo is never mutated. UtxoSet
    # copies share the immutable snapshot, so this stays cheap at 10^8
    # outputs; plain-dict callers (tests) get the legacy full copy.
    work = _view_copy(utxo) if view is None else view
    qlock = height >= qlock_activation()  # Lockbox upgrade active?
    qday = height >= qday_activation()    # Q-Day (PQH lock) active?
    htlc_active = height >= htlc_activation()  # HTLC lock active?
    seen = set()
    pqh_pairs = []  # (root, index) pairs revealed by this tx, in order
    total_in = 0
    spends = []
    for i, vin in enumerate(t["vin"]):
        key = (vin["prev"], vin["idx"])
        if key in seen:
            return False, "duplicate input in tx", 0
        seen.add(key)
        entries = work.get(key)
        if not entries:
            return False, f"input {i}: missing UTXO", 0
        value, spk, is_cb, cb_h = entries[0]  # oldest-first
        if is_cb and height - cb_h < COINBASE_MATURITY:
            return False, f"input {i}: coinbase immature", 0
        lt = lock_type(spk)
        if lt is None or (not qlock and lt in ("pkh", "open")) or \
                (lt == "pqh" and not qday) or \
                (lt == "htlc" and not htlc_active):
            return False, f"input {i}: non-standard scriptPubKey", 0
        if lt in ("anyone", "open"):
            if vin["script"] != b"":
                return False, f"input {i}: anyone-spend takes empty scriptSig", 0
        elif lt == "pkh":
            # Opcode-free structural authorization: the scriptSig carries
            # the key and the signature directly; no script is executed.
            # Two forms: 98 bytes (33-byte compressed pubkey) or 130 bytes
            # (65-byte uncompressed pubkey, for pre-2016 Bitcoin P2PKH
            # outputs whose hash160 commits to an uncompressed key).
            ss = vin["script"]
            if len(ss) == 98 and ss[97] == SIGHASH_ALL:
                pk, sig = ss[:33], ss[33:97]
                if pk[0] not in (2, 3):
                    return False, f"input {i}: bad PKH pubkey", 0
            elif len(ss) == 130 and ss[129] == SIGHASH_ALL:
                pk, sig = ss[:65], ss[65:129]
                if len(pk) != 65 or pk[0] != 4:
                    return False, f"input {i}: bad PKH pubkey", 0
            else:
                return False, f"input {i}: malformed PKH scriptSig", 0
            if hash160(pk) != spk[1:]:
                return False, f"input {i}: pubkey does not match lock", 0
            h = sighash_all(t, i, spk)
            if not secp.verify(pk, sig, h):
                return False, f"input {i}: bad PKH signature", 0
        elif lt == "pqh":
            # Q-Day structural authorization: the scriptSig is a Trifold
            # witness (root + one-time signature + ternary path). The
            # root must hash to the lock; the signature must verify
            # against the root over this tx's sighash. Hash-only: no
            # curve arithmetic appears in this spend path.
            try:
                root, tsig = decode_witness(vin["script"])
            except ValueError as e:
                return False, f"input {i}: malformed PQH witness: {e}", 0
            if hash160(root) != spk[1:]:
                return False, f"input {i}: PQH root does not match lock", 0
            h = sighash_all(t, i, spk)
            if not trifold_verify(root, h, tsig):
                return False, f"input {i}: bad PQH signature", 0
            # One-time leaf guard: the pair, not the UTXO, is the unit.
            # Two different PQH UTXOs funded by the same root must not
            # be spent with the same leaf, in this tx, in this block,
            # or ever again on this chain.
            pair = (root, int(tsig["index"]))
            if pair in pqh_pairs:
                return False, (f"input {i}: spent leaf already used: "
                               f"root={root.hex()} index={pair[1]} "
                               f"(same tx)"), 0
            if spent_pairs is not None and pair in spent_pairs:
                return False, (f"input {i}: spent leaf already used: "
                               f"root={root.hex()} index={pair[1]}"), 0
            pqh_pairs.append(pair)
        elif lt == "htlc":
            # Structural HTLC spend. No opcodes are executed; the
            # descriptor is supplied by the spender and verified by hash
            # against the lock, then exactly one path must check out:
            # claim (secret + claim-key signature) or refund (refund-key
            # signature, only at height >= timeout). Tx locktime stays 0;
            # the timeout lives in the descriptor, not in the tx.
            ss = vin["script"]
            if len(ss) not in (233, 201) or ss[0] not in (HTLC_CLAIM, HTLC_REFUND):
                return False, f"input {i}: malformed HTLC scriptSig", 0
            mode = ss[0]
            pk = ss[1:34]
            sig = ss[34:98]
            if pk[0] not in (2, 3) or ss[98] != SIGHASH_ALL:
                return False, f"input {i}: malformed HTLC scriptSig", 0
            if mode == HTLC_CLAIM:
                if len(ss) != 233:
                    return False, f"input {i}: malformed HTLC claim", 0
                secret, desc = ss[99:131], ss[131:233]
            else:
                if len(ss) != 201:
                    return False, f"input {i}: malformed HTLC refund", 0
                secret, desc = None, ss[99:201]
            try:
                d = parse_htlc_descriptor(desc)
            except ValueError as e:
                return False, f"input {i}: malformed HTLC descriptor: {e}", 0
            if hash160(desc) != spk[1:]:
                return False, f"input {i}: HTLC descriptor does not match lock", 0
            if mode == HTLC_CLAIM:
                if pk != d["claim_pubkey"]:
                    return False, f"input {i}: HTLC claim key mismatch", 0
                if hashlib.sha256(secret).digest() != d["secret_hash"]:
                    return False, f"input {i}: HTLC secret mismatch", 0
            else:
                if pk != d["refund_pubkey"]:
                    return False, f"input {i}: HTLC refund key mismatch", 0
                if height < d["timeout"]:
                    return False, f"input {i}: HTLC refund before timeout", 0
            h = sighash_all(t, i, spk)
            if not secp.verify(pk, sig, h):
                return False, f"input {i}: bad HTLC signature", 0
        else:  # legacy P2PK: grandfathered, spendable under old rules
            ss = vin["script"]
            if not (len(ss) == 66 and ss[0] == 65 and ss[-1] == SIGHASH_ALL):
                return False, f"input {i}: malformed P2PK scriptSig", 0
            h = sighash_all(t, i, spk)
            if not _eval(ss, spk, lambda h=h: h):
                return False, f"input {i}: script failed", 0
        total_in += value
        spends.append(key)
    total_out = 0
    for j, vout in enumerate(t["vout"]):
        if vout["value"] > 21_000_000 * 100_000_000:
            return False, f"output {j}: value too large", 0
        lt = lock_type(vout["script"])
        if lt is None or (not qlock and lt in ("pkh", "open")) or \
                (lt == "pqh" and not qday) or \
                (lt == "htlc" and not htlc_active):
            return False, f"output {j}: non-standard scriptPubKey", 0
        if qlock and lt in ("p2pk", "anyone"):
            # No new pubkey-exposing or opcode-based outputs: quantum
            # protection (BIP-361 Phase-A style) and no-opcode rule.
            return False, f"output {j}: legacy lock retired (use PKH/OPEN)", 0
        total_out += vout["value"]
        if total_out > 21_000_000 * 100_000_000:
            return False, "outputs overflow", 0
    fee = total_in - total_out
    if fee < 0:
        return False, "outputs exceed inputs", 0
    for key in spends:
        _spend_from_view(work, key)
    _add_tx_outputs(tx, work, height, is_coinbase=False)
    if spent_pairs is not None:
        spent_pairs.update(pqh_pairs)
    return True, "ok", fee


# --- Golden Stone fusion lock, height 50000 only (applied 2026-10-30) ---
# Triple Midnight fusion commitment (from triple-midnight-genesis-taproot
# prototype): root = bc06e62c... (32 bytes), midnights 2026-11-01/02/03 UTC.
# Fork scripts are 21-byte locks, so the fusion root is carried as a PQH
# lock: 0x02 + hash160(root). This is the actual script checked below;
# the 32-byte hex alone is NOT a fork script.
FUSION_HEIGHT = 50000
FUSION_ROOT_HEX = "bc06e62cef0f3e1c821b4723cd709f68c77be3e0aae2e20c63ccd21659ef6324"
FUSION_VALUE_SW = 100_000_000  # 1 EXCAL


def fusion_pqh_lock() -> bytes:
    return lock_pqh_for_root(bytes.fromhex(FUSION_ROOT_HEX))


def validate_block_txs(txs: list, utxo: dict, height: int, subsidy: int,
                       spent_pairs: set = None):
    """Validate all txs of a candidate block (txs[0] = coinbase).

    Returns (ok, reason, fees). Never mutates utxo.
    Height-50000 rule: block must contain a 1 EXCAL output locked to the
    fusion PQH lock above, else it is invalid. All other heights unaffected.
    Spent-leaf guard: spent_pairs, when given, is the chain's spent set;
    it is updated in place with this block's pairs on success (callers
    needing atomicity pass a copy and discard it on failure). When it is
    None, a fresh local set still rejects a pair reused twice inside
    this block."""
    if not txids_unique(txs):
        return False, "duplicate txid in block", 0
    view = _view_copy(utxo)
    working = spent_pairs if spent_pairs is not None else set()
    fees = 0
    for tx in txs[1:]:
        ok, reason, fee = validate_tx(tx, utxo, height, view=view,
                                      spent_pairs=working)
        if not ok:
            return False, f"tx {txid_display(tx)[:16]}: {reason}", 0
        fees += fee
    from genesis_fork import coinbase_value
    if coinbase_value(txs[0]) != subsidy + fees:
        return False, "coinbase value != subsidy + fees", 0
    if height == FUSION_HEIGHT:
        want = fusion_pqh_lock()
        found = False
        for tx in txs:
            try:
                t = parse_tx(tx)
            except ValueError:
                continue
            for vout in t["vout"]:
                if vout["value"] == FUSION_VALUE_SW and vout["script"] == want:
                    found = True
        if not found:
            return False, "missing Golden Stone fusion lock at 50000", 0
    return True, "ok", fees


def txids_unique(txs: list) -> bool:
    ids = [txid_internal(t) for t in txs]
    return len(set(ids)) == len(ids)


def _add_tx_outputs(tx: bytes, view: dict, height: int, is_coinbase: bool):
    t = parse_tx(tx)
    tid = txid_internal(tx)
    for j, vout in enumerate(t["vout"]):
        view.setdefault((tid, j), []).append(
            (vout["value"], vout["script"], is_coinbase, height))


def apply_block_txs(txs: list, utxo: dict, height: int):
    """Apply a validated block's txs to the UTXO set (mutates utxo)."""
    for n, tx in enumerate(txs):
        t = parse_tx(tx)
        if n > 0:  # not coinbase: spend inputs
            for vin in t["vin"]:
                _spend_from_view(utxo, (vin["prev"], vin["idx"]))
        _add_tx_outputs(tx, utxo, height, is_coinbase=(n == 0))

# ---------------------------------------------------------------- UTXO set
def build_utxo(chain, base=None) -> dict:
    """Scan the full chain into a UTXO dict. chain[0] may be header-only.
    If base is given (e.g. a UtxoSet over the Bitcoin snapshot), replay
    applies on top of it instead of starting empty."""
    utxo = base if base is not None else {}
    for h, blk in enumerate(chain):
        txs = blk.get("txs", [])
        for n, tx in enumerate(txs):
            t = parse_tx(tx)
            if n > 0:
                for vin in t["vin"]:
                    _spend_from_view(utxo, (vin["prev"], vin["idx"]))
            _add_tx_outputs(tx, utxo, h, is_coinbase=(n == 0))
    return utxo


def utxo_stats(utxo):
    if hasattr(utxo, "stats"):
        return utxo.stats()
    n = sum(len(v) for v in utxo.values())
    val = sum(e[0] for v in utxo.values() for e in v)
    return n, val


def find_spendable(utxo: dict, height: int, predicate, min_value: int = 0):
    """All unspent entries matching predicate(value, spk, is_cb, cb_h),
    oldest-first. Returns list of (key, entry)."""
    out = []
    for key, entries in utxo.items():
        for e in entries:
            value, spk, is_cb, cb_h = e
            if value < min_value:
                continue
            if is_cb and height - cb_h < COINBASE_MATURITY:
                continue
            if predicate(value, spk, is_cb, cb_h):
                out.append((key, e))
    return out


if __name__ == "__main__":
    import json
    recs = [json.loads(l) for l in
            open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "testnet_live.jsonl"))]
    tip = recs[-1]
    raw = bytes.fromhex(tip["txs"][0])
    t = parse_tx(raw)
    assert len(t["vin"]) == 1 and len(t["vout"]) == 1
    assert ser_tx(t) == raw, "serialize round-trip failed"
    chain = [{"txs": []}] + [
        {"txs": [bytes.fromhex(r["txs"][0])]} for r in recs[1:]]
    u = build_utxo(chain)
    n, val = utxo_stats(u)
    nblocks = len(recs) - 1
    assert n == nblocks, f"UTXO entries {n} != coinbases {nblocks}"
    print(f"txscript smoke OK: tip coinbase parses, UTXO {n} entries, "
          f"{val/1e8:.0f} tEXCAL")
    # v2 coinbase: unique txid, lineage still holds
    from genesis_fork import check_coinbase_lineage, use_network
    use_network("testnet")
    cb = make_coinbase_v2(999999, 0x1f010000, b"Excalibur", fees=1000)
    assert check_coinbase_lineage(cb, 0x1f010000)
    assert txid_internal(cb) != txid_internal(
        make_coinbase_v2(999998, 0x1f010000, b"Excalibur", fees=1000))
    print("coinbase v2 OK: unique txids, lineage rule holds")
