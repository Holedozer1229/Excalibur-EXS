#!/usr/bin/env python3
"""Transaction + script layer for the EXCAL testnet.

Pure Python, stdlib only. Covers what the chain needs and nothing more:

  tx wire format : Bitcoin legacy (version | vin | vout | locktime)
  sighash        : legacy SIGHASH_ALL (type 0x01 only)
  script         : data pushes, OP_0..OP_16, OP_CHECKSIG
  output types   : P2PK  (0x21 <33-byte compressed pubkey> 0xAC)
                   OP_TRUE (0x51) -- the existing anyone-can-spend coinbases
  input scripts  : P2PK spend -> <64-byte sig> <sighash 0x01>
                   OP_TRUE spend -> empty scriptSig

UTXO model
----------
utxo: {(txid_internal: bytes, vout: int): [entries oldest-first]}
entry: (value_sats, scriptPubKey, is_coinbase, height)

Entries are LISTS because the chain's pre-mempool coinbases are
byte-identical within a (bits, tag) era -- their txids collide, so one
(txid, vout) key can own many real outputs. Spends consume oldest-first
(deterministic). New coinbases (make_coinbase_v2) carry a height push and
have unique txids going forward.

Consensus tx validation (validate_tx): syntax, inputs exist in the UTXO
view, no double-spend within the view, coinbase maturity (100), value
conservation (fee >= 0), script execution passes.

Nothing here is imported by genesis_fork.py at module level (it lazy-imports
this module inside validate_block to avoid a cycle).
"""
import hashlib
import struct
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import secp256k1 as secp
import mldsa
from genesis_fork import sha256d, ser_varint, push, subsidy, gf11_active

SIGHASH_ALL = 0x01
COINBASE_MATURITY = 100

# ---------------------------------------------------------------- GF-11 PQ
# Post-quantum output/input formats (bips/GF-11.md).
PQ_VERSION_BYTE = 0x11
PQ_SPK_PREFIX = b"\x00\x11"
PQ_PK_LEN = 1952          # ML-DSA-65 public key bytes
PQ_SIG_LEN = 3309         # ML-DSA-65 signature bytes
PQ_SPK_LEN = 2 + PQ_PK_LEN
PQ_SIGSCRIPT_LEN = 1 + PQ_SIG_LEN
PQ_SIGHASH_DOMAIN = b"EXCAL-GF11-PQ-SIGHASH\x00"
MAX_PQ_SIGS_PER_BLOCK = 64

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
def make_coinbase_v2(height: int, bits: int, tag: bytes, fees: int = 0) -> bytes:
    """Coinbase with a BIP34-style height push: scriptSig =
    push(LE(bits)) + push(tag) + push(LE(height)). First push still LE(bits),
    so check_coinbase_lineage passes; the height push makes the txid unique
    per block (pre-v2 coinbases shared txids within a (bits, tag) era)."""
    from genesis_fork import make_coinbase as _mk
    scriptsig = (push(struct.pack("<I", bits)) + push(tag)
                 + push(struct.pack("<I", height)))
    tx = struct.pack("<I", 1)
    tx += b"\x01"
    tx += bytes(32) + struct.pack("<I", 0xffffffff)
    tx += ser_varint(len(scriptsig)) + scriptsig
    tx += struct.pack("<I", 0xffffffff)
    tx += b"\x01"
    tx += struct.pack("<Q", subsidy(height) + fees)
    tx += ser_varint(1) + b"\x51"
    tx += struct.pack("<I", 0)
    return tx


def make_coinbase_pq(height: int, bits: int, tag: bytes, pq_pubkey: bytes,
                     fees: int = 0) -> bytes:
    """GF-11 coinbase: same lineage scriptSig as v2, but the reward pays to
    a PQ output. Required at/after activation; invalid before it."""
    assert len(pq_pubkey) == PQ_PK_LEN
    scriptsig = (push(struct.pack("<I", bits)) + push(tag)
                 + push(struct.pack("<I", height)))
    tx = struct.pack("<I", 1)
    tx += b"\x01"
    tx += bytes(32) + struct.pack("<I", 0xffffffff)
    tx += ser_varint(len(scriptsig)) + scriptsig
    tx += struct.pack("<I", 0xffffffff)
    tx += b"\x01"
    tx += struct.pack("<Q", subsidy(height) + fees)
    spk = pq_script(pq_pubkey)
    tx += ser_varint(len(spk)) + spk
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


def pq_spk_pubkey(spk: bytes):
    """Return the 1952-byte ML-DSA-65 public key for a PQ scriptPubKey,
    else None."""
    if len(spk) == PQ_SPK_LEN and spk[:2] == PQ_SPK_PREFIX:
        return spk[2:]
    return None


def pq_script(pubkey: bytes) -> bytes:
    """Build a GF-11 PQ scriptPubKey from a 1952-byte ML-DSA-65 public key."""
    assert len(pubkey) == PQ_PK_LEN
    return PQ_SPK_PREFIX + pubkey


def pq_sighash(t: dict, in_idx: int, script_code: bytes) -> bytes:
    """GF-11 PQ signature digest (exact): domain || LE32(in_idx) ||
    legacy-SIGHASH_ALL preimage hash, all inside sha256d."""
    h = sighash_all(t, in_idx, script_code)
    return sha256d(PQ_SIGHASH_DOMAIN + struct.pack("<I", in_idx) + h)


def pq_sign_input(t: dict, in_idx: int, script_code: bytes, sk: bytes,
                  rnd: bytes) -> bytes:
    """Return scriptSig for a PQ input (deterministic given rnd)."""
    h = pq_sighash(t, in_idx, script_code)
    sig = mldsa.sign(sk, h, rnd)
    assert len(sig) == PQ_SIG_LEN
    return bytes([PQ_VERSION_BYTE]) + sig


def sign_input(t: dict, in_idx: int, script_code: bytes, priv: int) -> bytes:
    """Return scriptSig for a P2PK input."""
    h = sighash_all(t, in_idx, script_code)
    sig = secp.sign(priv, h)
    return bytes([65]) + sig + bytes([SIGHASH_ALL])

# ---------------------------------------------------------------- validation
def _spend_from_view(view: dict, key):
    """Consume the oldest entry for key. Returns the entry or None."""
    entries = view.get(key)
    if not entries:
        return None
    e = entries.pop(0)
    if not entries:
        del view[key]
    return e


def validate_tx(tx: bytes, utxo: dict, height: int, view: dict = None):
    """Full consensus validation of one non-coinbase tx.

    Returns (ok, reason, fee, pq_sigs). When view is given, spends apply to
    the view (for intra-block chaining); utxo itself is never mutated.

    GF-11: at/after activation, every output must be a PQ output, version 2
    is required to spend PQ outputs, and legacy UTXOs stay spendable.
    """
    try:
        t = parse_tx(tx)
    except ValueError as e:
        return False, f"parse: {e}", 0, 0
    active = gf11_active(height)
    if not active:
        if t["version"] != 1:
            return False, "version != 1", 0, 0
    else:
        if t["version"] not in (1, 2):
            return False, "version not in (1, 2)", 0, 0
    if t["locktime"] != 0:
        return False, "locktime != 0 (unsupported)", 0, 0
    work = dict(utxo) if view is None else view
    # copy entry lists so the caller's utxo is never mutated
    for k in list(work.keys()):
        work[k] = list(work[k])
    seen = set()
    total_in = 0
    spends = []
    pq_sigs = 0
    # GF-11: version 2 is required if any input spends a PQ output.
    if active and t["version"] != 2:
        for vin in t["vin"]:
            entries = work.get((vin["prev"], vin["idx"]))
            if entries and pq_spk_pubkey(entries[0][1]) is not None:
                return False, "PQ spend requires version 2", 0, 0
    for i, vin in enumerate(t["vin"]):
        key = (vin["prev"], vin["idx"])
        if key in seen:
            return False, "duplicate input in tx", 0, 0
        seen.add(key)
        entries = work.get(key)
        if not entries:
            return False, f"input {i}: missing UTXO", 0, 0
        value, spk, is_cb, cb_h = entries[0]  # oldest-first
        if is_cb and height - cb_h < COINBASE_MATURITY:
            return False, f"input {i}: coinbase immature", 0, 0
        pq_pk = pq_spk_pubkey(spk)
        pk = spk_pubkey(spk)
        if not active and pq_pk is not None:
            return False, f"input {i}: non-standard scriptPubKey", 0, 0
        if pq_pk is not None:
            ss = vin["script"]
            if not (len(ss) == PQ_SIGSCRIPT_LEN
                    and ss[0] == PQ_VERSION_BYTE):
                return False, f"input {i}: malformed PQ scriptSig", 0, 0
            h = pq_sighash(t, i, spk)
            try:
                ok = mldsa.verify(pq_pk, h, ss[1:])
            except Exception:
                ok = False
            if not ok:
                return False, f"input {i}: script failed", 0, 0
            pq_sigs += 1
        elif pk is None and not is_anyone(spk):
            return False, f"input {i}: non-standard scriptPubKey", 0, 0
        elif is_anyone(spk):
            if vin["script"] != b"":
                return False, f"input {i}: anyone-spend takes empty scriptSig", 0, 0
        else:
            ss = vin["script"]
            if not (len(ss) == 66 and ss[0] == 65 and ss[-1] == SIGHASH_ALL):
                return False, f"input {i}: malformed P2PK scriptSig", 0, 0
            h = sighash_all(t, i, spk)
            if not _eval(ss, spk, lambda h=h: h):
                return False, f"input {i}: script failed", 0, 0
        total_in += value
        spends.append(key)
    total_out = 0
    for j, vout in enumerate(t["vout"]):
        if vout["value"] > 21_000_000 * 100_000_000:
            return False, f"output {j}: value too large", 0, 0
        if active:
            if pq_spk_pubkey(vout["script"]) is None:
                return False, f"output {j}: non-PQ output after GF-11", 0, 0
        else:
            if (spk_pubkey(vout["script"]) is None
                    and not is_anyone(vout["script"])):
                return False, f"output {j}: non-standard scriptPubKey", 0, 0
        total_out += vout["value"]
        if total_out > 21_000_000 * 100_000_000:
            return False, "outputs overflow", 0, 0
    fee = total_in - total_out
    if fee < 0:
        return False, "outputs exceed inputs", 0, 0
    for key in spends:
        _spend_from_view(work, key)
    _add_tx_outputs(tx, work, height, is_coinbase=False)
    return True, "ok", fee, pq_sigs


def validate_block_txs(txs: list, utxo: dict, height: int, subsidy: int):
    """Validate all txs of a candidate block (txs[0] = coinbase).

    Returns (ok, reason, fees). Never mutates utxo."""
    if not txids_unique(txs):
        return False, "duplicate txid in block", 0
    active = gf11_active(height)
    if active:
        # GF-11: every coinbase output must be a PQ output, even in a
        # coinbase-only block.
        try:
            cb_t = parse_tx(txs[0])
        except ValueError as e:
            return False, f"coinbase parse: {e}", 0
        for j, vout in enumerate(cb_t["vout"]):
            if pq_spk_pubkey(vout["script"]) is None:
                return False, (f"coinbase output {j}: non-PQ output "
                                "after GF-11"), 0
    view = {k: list(v) for k, v in utxo.items()}
    fees = 0
    pq_total = 0
    for tx in txs[1:]:
        ok, reason, fee, pq_sigs = validate_tx(tx, utxo, height, view=view)
        if not ok:
            return False, f"tx {txid_display(tx)[:16]}: {reason}", 0
        fees += fee
        pq_total += pq_sigs
        if active and pq_total > MAX_PQ_SIGS_PER_BLOCK:
            return False, "too many PQ signatures in block", 0
    from genesis_fork import coinbase_value
    if coinbase_value(txs[0]) != subsidy + fees:
        return False, "coinbase value != subsidy + fees", 0
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
def build_utxo(chain) -> dict:
    """Scan the full chain into a UTXO dict. chain[0] may be header-only."""
    utxo = {}
    for h, blk in enumerate(chain):
        txs = blk.get("txs", [])
        for n, tx in enumerate(txs):
            t = parse_tx(tx)
            if n > 0:
                for vin in t["vin"]:
                    _spend_from_view(utxo, (vin["prev"], vin["idx"]))
            _add_tx_outputs(tx, utxo, h, is_coinbase=(n == 0))
    return utxo


def utxo_stats(utxo: dict):
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
          f"{val/1e8:.0f} tGSF")
    # v2 coinbase: unique txid, lineage still holds
    from genesis_fork import check_coinbase_lineage, use_network
    use_network("testnet")
    cb = make_coinbase_v2(999999, 0x1f010000, b"EXCAL", fees=1000)
    assert check_coinbase_lineage(cb, 0x1f010000)
    assert txid_internal(cb) != txid_internal(
        make_coinbase_v2(999998, 0x1f010000, b"EXCAL", fees=1000))
    print("coinbase v2 OK: unique txids, lineage rule holds")
