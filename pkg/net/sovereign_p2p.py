"""Sovereign $EXS peer-to-peer network layer.

Pure Python, stdlib only. Ports the proven structure of the GSF
``genesis-fork/p2p.py`` (transport, handshake, header-first sync, relay,
reorg) to the sovereign chain's block format and EXS network magic.

NETWORK MAGIC
-------------
Bitcoin-style framing; the magic constant is chosen so its big-endian byte
spelling is human-readable (same convention as the GSF spec's 'GSFt'/'GSFk'):

    mainnet 0x4558536b -> bytes 45 58 53 6b -> "EXSk" (EXS Krown)
    testnet 0x45585374 -> bytes 45 58 53 74 -> "EXSt" (EXS testnet)

SOVEREIGN BLOCK FORMAT (defined here -- the GSF spec only covers genesis)
--------------------------------------------------------------------------
Wire ``block`` message::

    header : height u32 LE (4B)
           + prev_hash 32B (INTERNAL byte order, i.e. raw PoW-hash bytes)
           + timestamp u64 LE (8B)
           + nonce u64 LE (8B)                      -> 52 bytes fixed
           + tx_count varint
    body   : tx_count x (varint len + raw tx bytes)

Block id / PoW hash: the unmodified Omega' D18 kernel
(``pkg/mining/tetrapow_dice_universal.UniversalMiningKernel``: 128 rounds of
sha512/sha256/blake2b fusion + final SHA-256) over the domain-separated
preimage::

    f"{axiom}:{seed_hex}:{height}:{prev_hex}:{txroot_hex}:{timestamp}:{nonce}"

where ``prev_hex``/``txroot_hex`` are lowercase hex of the INTERNAL-order
bytes and the integers render as decimal strings. Validity: the resulting
32-byte id has ``difficulty`` leading zero bytes (default 4, parameterizable).

Height 0 is special: the sovereign genesis block's id is the ground
descriptor's ``final_hash`` -- the SAME unmodified kernel over the
genesis-oracle preimage ``f"{axiom}:{seed_hex}:{nonce}"`` (no height,
prev, txroot, or timestamp fields), exactly as
``pkg/genesis/sovereign_genesis.py`` grinds and ``--verify`` checks.
Height-0 blocks MUST carry zero transactions (the no-premine rule; an
empty tx list commits to nothing because txroot is not in the genesis
preimage, so any txs present would be unauthenticated).

``txroot`` is defined precisely as::

    tx_hash_i = sha256d(raw_tx_i)          # internal order, per tx in order
    txroot    = sha256d(tx_hash_0 || tx_hash_1 || ... || tx_hash_{n-1})
    (zero txs -> txroot = sha256d(b""))

BYTE ORDER: unlike the GSF v1 chain (which carries a display/internal quirk),
the sovereign chain uses INTERNAL byte order everywhere -- on the wire, in
the block index, and in hex display. No byte-reversal anywhere in this module.

COINBASE RULE
-------------
Every block at height >= 1 MUST carry a coinbase as tx[0]. Coinbase raw tx::

    b"EXSCB1" (6B magic) + varint n_out
        + n_out x (varint addr_len + addr bytes + amount u64 LE)

Validation is structural (well-formed, >= 1 output, positive amounts) plus,
when ``pkg/economy/sovereign_tokenomics.py`` is importable, an exact check
that the output *amount multiset* equals the ``coinbase_split`` schedule for
that height (1% tithe off the top, then 60/20/15/5 of the remainder with
integer dust to the miner). Address->role mapping is not consensus --
only the amounts are -- but any deviation from the published split is
rejected, so the economics cannot be inflated or redirected by amount.

HEADER-STAGE PoW
----------------
Because the block id commits to ``txroot`` (which needs the tx bodies), a
52-byte header alone cannot prove PoW. The ``headers`` message therefore
carries ``txroot`` alongside each header entry (52B header + 32B txroot +
varint tx_count), so peers validate PoW + linkage at header stage exactly
like the GSF design; the txroot is recomputed and enforced when the full
block arrives in ``submit_block``.

CHAIN SELECTION: heaviest VALID chain wins. Per-block work is
``256**difficulty`` (expected hashes); cumulative work decides. Ties break
toward the first-seen tip. Every validated block on every branch is kept in
the append-only store; only the active-tip pointer moves on reorg.
"""
import argparse
import hashlib
import importlib
import json
import os
import socket
import struct
import sys
import threading
import time

# ---------------------------------------------------------------- constants
AXIOM = ("sword legend pull magic kingdom artist stone destroy forget "
         "fire steel honey question")
SEED_HEX = ("582946fd65d357fa6d73dbf071fe70f2a2698ec253a6bec584a86ef500"
            "bcfa2d")

MAGIC_MAINNET = 0x4558536b   # BE spelling "EXSk" (EXS Krown)
MAGIC_TESTNET = 0x45585374   # BE spelling "EXSt" (EXS testnet)
PORT_MAINNET = 29444
PORT_TESTNET = 39444
DEFAULT_DIFFICULTY = 4       # leading zero bytes

PROTO_VERSION = 1
MAX_MESSAGE = 4 * 1024 * 1024
HANDSHAKE_TIMEOUT = 15
PING_INTERVAL = 60
PING_TIMEOUT = 120
MAX_HEADERS = 2000
GETDATA_BATCH = 32
ORPHAN_LIMIT = 128
MAX_TIME_DRIFT = 7200        # block timestamp may not exceed now + 2h

INV_BLOCK = 1
INV_TX = 2

HEADER_FIXED_LEN = 52        # height u32 + prev 32B + timestamp u64 + nonce u64
COINBASE_MAGIC = b"EXSCB1"
GENESIS_PREV = bytes(32)

# Make pkg/ importable so we can reach the mining kernel as
# ``mining.tetrapow_dice_universal`` regardless of CWD.
_PKG_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PKG_DIR not in sys.path:
    sys.path.insert(0, _PKG_DIR)
try:
    from mining.tetrapow_dice_universal import UniversalMiningKernel
except ImportError:  # pragma: no cover - surfaced clearly at use time
    UniversalMiningKernel = None


def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


# ------------------------------------------------------------------ wire
def ser_varint(n: int) -> bytes:
    if n < 0xfd:
        return struct.pack("B", n)
    if n <= 0xffff:
        return b"\xfd" + struct.pack("<H", n)
    if n <= 0xffffffff:
        return b"\xfe" + struct.pack("<I", n)
    return b"\xff" + struct.pack("<Q", n)


def read_varint(b: bytes, p: int):
    n = b[p]
    if n < 0xfd:
        return n, p + 1
    if n == 0xfd:
        return struct.unpack("<H", b[p + 1:p + 3])[0], p + 3
    if n == 0xfe:
        return struct.unpack("<I", b[p + 1:p + 5])[0], p + 5
    return struct.unpack("<Q", b[p + 1:p + 9])[0], p + 9


def encode_msg(magic: int, command: str, payload: bytes) -> bytes:
    assert len(command) <= 12
    cmd = command.encode() + b"\x00" * (12 - len(command))
    return (struct.pack("<I", magic) + cmd
            + struct.pack("<I", len(payload))
            + sha256d(payload)[:4] + payload)


class Framer:
    """Incremental message reader for one socket."""

    def __init__(self, magic: int):
        self.magic = magic
        self.buf = b""

    def feed(self, data: bytes):
        self.buf += data

    def next_msg(self):
        """Return (command, payload) or None if incomplete.
        Raises ValueError on framing violations."""
        if len(self.buf) < 24:
            return None
        magic, = struct.unpack("<I", self.buf[:4])
        if magic != self.magic:
            raise ValueError(f"bad magic {magic:#x}")
        command = self.buf[4:16].split(b"\x00")[0].decode("ascii")
        (length,) = struct.unpack("<I", self.buf[16:20])
        if length > MAX_MESSAGE:
            raise ValueError(f"message too large: {length}")
        if len(self.buf) < 24 + length:
            return None
        cksum = self.buf[20:24]
        payload = self.buf[24:24 + length]
        if sha256d(payload)[:4] != cksum:
            raise ValueError("bad checksum")
        self.buf = self.buf[24 + length:]
        return command, payload

# ------------------------------------------------------------- proof of work
def pow_hash(kernel, preimage: str) -> bytes:
    """Run one candidate through the UNMODIFIED Omega' D18 kernel.

    ``preimage`` already contains every domain-separated field (axiom, seed,
    height, prev, txroot, timestamp, nonce); the kernel's own
    ``fused_hash_computation`` would append ":<nonce>" to its axiom argument,
    so we drive ``batch_nonlinear_transform`` directly for a single candidate
    -- the identical 128-round code path, no suffix mangling.
    """
    if kernel is None:
        raise RuntimeError("UniversalMiningKernel unavailable (import failed)")
    data = [preimage.encode("utf-8")]
    for rnd in range(1, 129):
        data = kernel.batch_nonlinear_transform(data, rnd)
    return hashlib.sha256(data[0]).digest()


def genesis_id_for(kernel, nonce: int) -> bytes:
    """Block-0 id: the sovereign genesis PoW.

    Byte-identical to the consensus oracle
    (``pkg/genesis/sovereign_genesis.py``): the unmodified Omega' D18
    kernel over ``f"{AXIOM}:{SEED_HEX}:{nonce}"`` -- no height, prev,
    txroot, or timestamp fields. The ground descriptor's ``final_hash``
    MUST equal this; anything else is not the sovereign genesis.
    """
    if kernel is None:
        raise RuntimeError("UniversalMiningKernel unavailable (import failed)")
    return pow_hash(kernel, f"{AXIOM}:{SEED_HEX}:{nonce}")


def compute_txroot(txs) -> bytes:
    """txroot = sha256d(concat(sha256d(tx) for tx in txs)); empty -> sha256d(b"")."""
    return sha256d(b"".join(sha256d(tx) for tx in txs))


def block_preimage(height: int, prev: bytes, txroot: bytes,
                   timestamp: int, nonce: int) -> str:
    return (f"{AXIOM}:{SEED_HEX}:{height}:{prev.hex()}:{txroot.hex()}:"
            f"{timestamp}:{nonce}")


def block_id_for(kernel, height: int, prev: bytes, txroot: bytes,
                 timestamp: int, nonce: int) -> bytes:
    # Height 0 uses the genesis-oracle preimage (axiom:seed_hex:nonce);
    # every other height uses the full block preimage. This is what lets
    # the ground sovereign descriptor be adopted as block 0 verbatim.
    if height == 0:
        return genesis_id_for(kernel, nonce)
    return pow_hash(kernel, block_preimage(height, prev, txroot,
                                           timestamp, nonce))


def meets_difficulty(block_id: bytes, difficulty: int) -> bool:
    return block_id[:difficulty] == b"\x00" * difficulty


def mine_block(kernel, prev: bytes, height: int, txs, difficulty: int,
               timestamp=None, start_nonce: int = 0,
               max_nonces: int = 2 ** 64):
    """Grind a valid block. Returns dict with height/prev/timestamp/nonce/
    txs/txroot/id. Pure helper -- the P2P layer never mines on its own."""
    ts = int(time.time()) if timestamp is None else timestamp
    txs = list(txs)
    if height == 0:
        # Genesis: the sovereign-oracle preimage (axiom:seed_hex:nonce).
        # No transactions -- the no-premine rule; txs would be
        # unauthenticated since txroot is not in this preimage.
        if txs:
            raise ValueError("mine_block: genesis (height 0) carries no "
                             "transactions")
        if prev != GENESIS_PREV:
            raise ValueError("mine_block: genesis prev must be 32 zero bytes")
        txroot = compute_txroot([])
        prefix = f"{AXIOM}:{SEED_HEX}:"
    else:
        txroot = compute_txroot(txs)
        prev_hex = prev.hex()
        txroot_hex = txroot.hex()
        prefix = f"{AXIOM}:{SEED_HEX}:{height}:{prev_hex}:{txroot_hex}:{ts}:"
    nonce = start_nonce
    while nonce < start_nonce + max_nonces:
        bid = pow_hash(kernel, f"{prefix}{nonce}")
        if bid[:difficulty] == b"\x00" * difficulty:
            return {"height": height, "prev": prev, "timestamp": ts,
                    "nonce": nonce, "txs": txs, "txroot": txroot, "id": bid}
        nonce += 1
    raise RuntimeError("mine_block: nonce space exhausted")


# ---------------------------------------------------------------- coinbase
def encode_coinbase(outputs) -> bytes:
    """outputs: list of (addr_bytes, amount_int)."""
    out = COINBASE_MAGIC + ser_varint(len(outputs))
    for addr, amount in outputs:
        if amount < 0 or amount >= 2 ** 64:
            raise ValueError("coinbase amount out of range")
        out += ser_varint(len(addr)) + bytes(addr) + struct.pack("<Q", amount)
    return out


def parse_coinbase(raw: bytes):
    if not raw.startswith(COINBASE_MAGIC):
        raise ValueError("missing EXSCB1 magic")
    n, pos = read_varint(raw, len(COINBASE_MAGIC))
    outputs = []
    for _ in range(n):
        alen, pos = read_varint(raw, pos)
        addr = raw[pos:pos + alen]
        pos += alen
        if pos + 8 > len(raw):
            raise ValueError("truncated coinbase output")
        amount, = struct.unpack("<Q", raw[pos:pos + 8])
        pos += 8
        outputs.append((addr, amount))
    if pos != len(raw):
        raise ValueError("trailing bytes in coinbase")
    return outputs


def _tokenomics_fn(name: str):
    """Fetch ``name`` from the sibling tokenomics module, if present."""
    for modname in ("economy.sovereign_tokenomics",
                    "pkg.economy.sovereign_tokenomics"):
        try:
            mod = importlib.import_module(modname)
        except Exception:
            continue
        fn = getattr(mod, name, None)
        if callable(fn):
            return fn
    return None


def _tokenomics_reward_fn():
    """block_reward(height) from the sibling tokenomics module, if present."""
    return _tokenomics_fn("block_reward")


def _expected_split_amounts(height: int):
    """Sorted expected coinbase output amounts for ``height``.

    Address-agnostic: ``coinbase_split`` amounts depend only on the
    reward, so sentinel addresses are used. Returns None when the
    tokenomics module (or its split API) is unavailable.
    """
    reward_fn = _tokenomics_reward_fn()
    split_fn = _tokenomics_fn("coinbase_split")
    if reward_fn is None or split_fn is None:
        return None
    reward = reward_fn(height)
    parts = split_fn(reward, b"\x00treasury", b"\x01liquidity",
                     b"\x02airdrop", b"\x03miner")
    return sorted(amt for _, amt in parts.values())


def validate_coinbase(raw: bytes, height: int):
    """Structural checks always; exact tokenomics-split check when the
    tokenomics module is importable.

    The amount *multiset* must equal the ``coinbase_split`` schedule for
    this height (1% tithe off the top, then 60/20/15/5 of the remainder,
    integer dust to the miner). Address->role mapping is not consensus --
    only the amounts are -- but any deviation from the published split is
    rejected, so the economics cannot be inflated or redirected by amount.
    """
    try:
        outputs = parse_coinbase(raw)
    except ValueError as e:
        return False, f"coinbase malformed: {e}"
    if not outputs:
        return False, "coinbase has no outputs"
    if any(len(a) == 0 for a, _ in outputs):
        return False, "coinbase empty address"
    if any(amt <= 0 for _, amt in outputs):
        return False, "coinbase non-positive output"
    try:
        expected_amounts = _expected_split_amounts(height)
    except Exception as e:
        return False, f"tokenomics split computation failed: {e}"
    if expected_amounts is not None:
        got = sorted(amt for _, amt in outputs)
        if got != expected_amounts:
            return False, (f"coinbase amounts {got} != tokenomics split "
                           f"{expected_amounts} at height {height}")
    return True, "ok"


# ------------------------------------------------------------ block codecs
def enc_header_fixed(height: int, prev: bytes, timestamp: int,
                     nonce: int) -> bytes:
    assert len(prev) == 32
    return (struct.pack("<I", height) + prev
            + struct.pack("<Q", timestamp) + struct.pack("<Q", nonce))


def dec_header_fixed(b: bytes):
    if len(b) != HEADER_FIXED_LEN:
        raise ValueError("bad header length")
    height, = struct.unpack("<I", b[:4])
    prev = b[4:36]
    timestamp, = struct.unpack("<Q", b[36:44])
    nonce, = struct.unpack("<Q", b[44:52])
    return height, prev, timestamp, nonce


def enc_block(height: int, prev: bytes, timestamp: int, nonce: int,
              txs) -> bytes:
    out = enc_header_fixed(height, prev, timestamp, nonce)
    out += ser_varint(len(txs))
    for tx in txs:
        out += ser_varint(len(tx)) + tx
    return out


def enc_block_dict(blk: dict) -> bytes:
    return enc_block(blk["height"], blk["prev"], blk["timestamp"],
                     blk["nonce"], blk["txs"])


def dec_block(p: bytes) -> dict:
    if len(p) < HEADER_FIXED_LEN:
        raise ValueError("truncated block header")
    height, prev, timestamp, nonce = dec_header_fixed(p[:HEADER_FIXED_LEN])
    n, pos = read_varint(p, HEADER_FIXED_LEN)
    txs = []
    for _ in range(n):
        ln, pos = read_varint(p, pos)
        if pos + ln > len(p):
            raise ValueError("truncated tx")
        txs.append(p[pos:pos + ln])
        pos += ln
    if pos != len(p):
        raise ValueError("trailing bytes in block")
    return {"height": height, "prev": prev, "timestamp": timestamp,
            "nonce": nonce, "txs": txs}


# ------------------------------------------------------------- payloads
def enc_version(tip_height: int, tip_hash: bytes, nonce: int) -> bytes:
    assert len(tip_hash) == 32
    return (struct.pack("<I", PROTO_VERSION) + struct.pack("<Q", 0)
            + struct.pack("<q", int(time.time()))
            + struct.pack("<I", tip_height)
            + tip_hash + struct.pack("<Q", nonce))


def dec_version(p: bytes):
    if len(p) != 64:
        raise ValueError("bad version length")
    ver, = struct.unpack("<I", p[:4])
    th, = struct.unpack("<I", p[20:24])
    tip_hash = p[24:56]
    nonce, = struct.unpack("<Q", p[56:64])
    return {"ver": ver, "tip_height": th, "tip_hash": tip_hash,
            "nonce": nonce}


def enc_headers(entries) -> bytes:
    """entries: list of dicts with height/prev/timestamp/nonce/txroot/
    tx_count. txroot is advisory at header stage (recomputed at block
    validation); it is what makes header-stage PoW checks possible."""
    out = ser_varint(len(entries))
    for e in entries:
        assert len(e["txroot"]) == 32
        out += enc_header_fixed(e["height"], e["prev"], e["timestamp"],
                                e["nonce"])
        out += e["txroot"] + ser_varint(e["tx_count"])
    return out


def dec_headers(p: bytes):
    n, pos = read_varint(p, 0)
    out = []
    for _ in range(n):
        if pos + HEADER_FIXED_LEN + 32 > len(p):
            raise ValueError("truncated headers entry")
        height, prev, timestamp, nonce = dec_header_fixed(
            p[pos:pos + HEADER_FIXED_LEN])
        pos += HEADER_FIXED_LEN
        txroot = p[pos:pos + 32]
        pos += 32
        tx_count, pos = read_varint(p, pos)
        out.append({"height": height, "prev": prev, "timestamp": timestamp,
                    "nonce": nonce, "txroot": txroot,
                    "tx_count": tx_count})
    if pos != len(p):
        raise ValueError("trailing bytes in headers")
    return out


def enc_inv(entries) -> bytes:
    out = ser_varint(len(entries))
    for typ, h in entries:
        assert len(h) == 32
        out += struct.pack("<I", typ) + h
    return out


def dec_inv(p: bytes):
    n, pos = read_varint(p, 0)
    out = []
    for _ in range(n):
        if pos + 36 > len(p):
            raise ValueError("truncated inv entry")
        typ, = struct.unpack("<I", p[pos:pos + 4])
        h = p[pos + 4:pos + 36]
        pos += 36
        out.append((typ, h))
    if pos != len(p):
        raise ValueError("trailing bytes in inv")
    return out


def enc_getheaders(locator, stop: bytes) -> bytes:
    assert len(stop) == 32
    out = ser_varint(len(locator))
    for h in locator:
        assert len(h) == 32
        out += h
    out += stop
    return out


def dec_getheaders(p: bytes):
    n, pos = read_varint(p, 0)
    loc = []
    for _ in range(n):
        if pos + 32 > len(p):
            raise ValueError("truncated locator")
        loc.append(p[pos:pos + 32])
        pos += 32
    if pos + 32 != len(p):
        raise ValueError("bad getheaders length")
    stop = p[pos:pos + 32]
    return loc, stop


def enc_tx(raw: bytes) -> bytes:
    return ser_varint(len(raw)) + raw


def dec_tx(p: bytes) -> bytes:
    ln, pos = read_varint(p, 0)
    if pos + ln != len(p):
        raise ValueError("trailing bytes in tx")
    return p[pos:pos + ln]

# ------------------------------------------------------------- chain state
def _atomic_write(path: str, data: bytes):
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


class ChainState:
    """Validated-block index, branch tips, active tip, heaviest-chain rule.

    Every validated block on every branch is kept (append-only
    ``blocks.jsonl``); ``best`` is the tip with maximum cumulative work
    (``256**difficulty`` per block; ties keep the first-seen tip). Full
    validation -- PoW recompute, prev linkage, height continuity, timestamp
    bounds, coinbase rule -- happens in ``submit_block`` before acceptance.
    """

    def __init__(self, datadir: str, kernel, difficulty: int,
                 magic: int, log=print):
        self.datadir = datadir
        self.kernel = kernel
        self.difficulty = difficulty
        self.magic = magic
        self.log = log
        self.lock = threading.RLock()
        self.index = {}      # block_id bytes -> record
        self.children = {}   # block_id bytes -> [child ids]
        self.tips = {}       # block_id bytes -> height (branch tips)
        self.best = None     # block_id bytes
        self.reorgs = []     # [{fork_height, depth, old_tip, new_tip, time}]
        self.orphans = {}    # block_id bytes -> fields dict (bounded)
        os.makedirs(datadir, exist_ok=True)
        self._load()

    # -- persistence -------------------------------------------------
    def _paths(self):
        d = self.datadir
        return (os.path.join(d, "blocks.jsonl"),
                os.path.join(d, "state.json"),
                os.path.join(d, "active.jsonl"))

    @staticmethod
    def _rec_to_line(r: dict) -> str:
        return json.dumps({
            "id": r["id"].hex(), "height": r["height"],
            "prev": r["prev"].hex(), "timestamp": r["timestamp"],
            "nonce": r["nonce"], "txs": [t.hex() for t in r["txs"]],
            "txroot": r["txroot"].hex(), "work": r["work"],
            "cum_work": r["cum_work"]})

    @staticmethod
    def _line_to_rec(line: str) -> dict:
        d = json.loads(line)
        return {"id": bytes.fromhex(d["id"]), "height": d["height"],
                "prev": bytes.fromhex(d["prev"]),
                "timestamp": d["timestamp"], "nonce": d["nonce"],
                "txs": [bytes.fromhex(t) for t in d["txs"]],
                "txroot": bytes.fromhex(d["txroot"]), "work": d["work"],
                "cum_work": d["cum_work"]}

    def _load(self):
        blocks_p, state_p, _ = self._paths()
        if os.path.exists(blocks_p):
            with open(blocks_p) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self._index_record(self._line_to_rec(line),
                                           persist=False)
        if os.path.exists(state_p):
            try:
                st = json.load(open(state_p))
                best = bytes.fromhex(st["best"])
                if best in self.index:
                    self.best = best
                self.reorgs = st.get("reorgs", [])
            except Exception as e:
                self.log(f"state.json unreadable ({e}); recomputing tip")
        if self.best is None and self.index:
            # fallback: heaviest indexed tip
            self.best = max(self.index,
                            key=lambda i: self.index[i]["cum_work"])

    def _index_record(self, r: dict, persist: bool = True):
        bid = r["id"]
        self.index[bid] = r
        self.children.setdefault(r["prev"], []).append(bid)
        self.children.setdefault(bid, [])
        if r["prev"] in self.tips:
            del self.tips[r["prev"]]
        self.tips[bid] = r["height"]
        if persist:
            blocks_p, _, _ = self._paths()
            with open(blocks_p, "a") as f:
                f.write(self._rec_to_line(r) + "\n")

    def _save_state(self):
        _, state_p, _ = self._paths()
        st = {"best": self.best.hex() if self.best else None,
              "tips": {h.hex(): ht for h, ht in self.tips.items()},
              "reorgs": self.reorgs[-100:],
              "difficulty": self.difficulty, "magic": self.magic,
              "height": self.index[self.best]["height"]
              if self.best else -1}
        _atomic_write(state_p, json.dumps(st, indent=1).encode())

    def _save_active(self):
        """Rewrite the active chain (best -> genesis) in height order."""
        _, _, active_p = self._paths()
        chain = []
        cur = self.best
        while cur is not None:
            chain.append(cur.hex())
            r = self.index[cur]
            cur = r["prev"] if r["prev"] != GENESIS_PREV or \
                r["height"] != 0 else None
            if r["height"] == 0:
                break
        chain.reverse()
        _atomic_write(active_p, ("\n".join(chain) + "\n").encode())

    def _save_tip(self):
        self._save_state()
        self._save_active()

    # -- queries ------------------------------------------------------
    def tip(self):
        with self.lock:
            if self.best is None:
                return {"height": -1, "hash": "00" * 32}
            r = self.index[self.best]
            return {"height": r["height"], "hash": r["id"].hex()}

    def locator(self):
        """Newest-first block ids with exponential step-back to genesis."""
        with self.lock:
            if self.best is None:
                return []
            ids, cur, step, n = [], self.best, 1, 0
            while cur is not None:
                ids.append(cur)
                r = self.index[cur]
                if r["height"] == 0:
                    break
                for _ in range(step):
                    r = self.index.get(r["prev"])
                    if r is None or r["height"] == 0:
                        break
                cur = r["id"] if r is not None else None
                n += 1
                if n > 10:
                    step *= 2
            if ids and self.index[ids[-1]]["height"] != 0:
                # ensure genesis terminates the locator
                g = next((i for i in self.index.values()
                          if i["height"] == 0), None)
                if g is not None:
                    ids.append(g["id"])
            return ids

    def _ancestor_set(self, tip_id):
        s = set()
        cur = tip_id
        while cur is not None:
            s.add(cur)
            r = self.index.get(cur)
            if r is None or r["height"] == 0:
                break
            cur = r["prev"]
        return s

    def headers_since(self, locator, stop: bytes):
        """Best-chain header entries after the fork point (max 2000)."""
        with self.lock:
            if self.best is None:
                return []
            ancestors = self._ancestor_set(self.best)
            fork = next((h for h in locator if h in ancestors), None)
            if fork is None:
                g = next((i for i in self.index.values()
                          if i["height"] == 0), None)
                fork = g["id"] if g else None
            if fork is None:
                return []
            fork_height = self.index[fork]["height"]
            # walk best chain down to fork, then emit upward
            chain = []
            cur = self.best
            while cur != fork:
                chain.append(self.index[cur])
                cur = self.index[cur]["prev"]
            chain.reverse()
            out = []
            for r in chain[:MAX_HEADERS]:
                out.append({"height": r["height"], "prev": r["prev"],
                            "timestamp": r["timestamp"], "nonce": r["nonce"],
                            "txroot": r["txroot"],
                            "tx_count": len(r["txs"])})
                if stop != bytes(32) and r["id"] == stop:
                    break
            return out

    def get_block(self, bid: bytes):
        with self.lock:
            r = self.index.get(bid)
            if r is None:
                return None
            return {"height": r["height"], "prev": r["prev"],
                    "timestamp": r["timestamp"], "nonce": r["nonce"],
                    "txs": r["txs"]}

    # -- validation ---------------------------------------------------
    def submit_block(self, f: dict):
        """Full validation then acceptance. f has height/prev/timestamp/
        nonce/txs (no id -- it is recomputed, never trusted)."""
        with self.lock:
            txs = list(f["txs"])
            if f["height"] == 0 and txs:
                return {"accepted": False,
                        "reason": "bad-genesis: height 0 carries no "
                                  "transactions (no premine)"}
            txroot = compute_txroot(txs)
            bid = block_id_for(self.kernel, f["height"], f["prev"],
                               txroot, f["timestamp"], f["nonce"])
            if bid in self.index:
                return {"accepted": False, "reason": "duplicate"}
            if not meets_difficulty(bid, self.difficulty):
                return {"accepted": False, "reason": "bad-pow"}
            if f["prev"] == GENESIS_PREV:
                if f["height"] != 0:
                    return {"accepted": False,
                            "reason": "bad-height (genesis prev)"}
                if self.index:
                    return {"accepted": False,
                            "reason": "genesis-mismatch"}
                parent_cum, parent_height, parent_ts = 0, -1, -1
            else:
                parent = self.index.get(f["prev"])
                if parent is None:
                    self._add_orphan(bid, f)
                    return {"accepted": False, "reason": "orphan"}
                if f["height"] != parent["height"] + 1:
                    return {"accepted": False, "reason": "bad-height"}
                parent_cum, parent_height = (parent["cum_work"],
                                             parent["height"])
                parent_ts = parent["timestamp"]
            if f["timestamp"] <= parent_ts:
                return {"accepted": False, "reason": "bad-time"}
            if f["timestamp"] > int(time.time()) + MAX_TIME_DRIFT:
                return {"accepted": False, "reason": "time-too-far"}
            if f["height"] >= 1:
                if not txs:
                    return {"accepted": False,
                            "reason": "bad-coinbase: empty block"}
                ok, why = validate_coinbase(txs[0], f["height"])
                if not ok:
                    return {"accepted": False,
                            "reason": f"bad-coinbase: {why}"}
            work = 256 ** self.difficulty
            rec = {"id": bid, "height": f["height"], "prev": f["prev"],
                   "timestamp": f["timestamp"], "nonce": f["nonce"],
                   "txs": txs, "txroot": txroot, "work": work,
                   "cum_work": parent_cum + work}
            self._index_record(rec)
            event = None
            if self.best is None:
                self.best = bid
                event = {"type": "extension", "connected": [rec],
                         "disconnected": []}
            elif f["prev"] == self.best:
                self.best = bid
                event = {"type": "extension", "connected": [rec],
                         "disconnected": []}
            elif rec["cum_work"] > self.index[self.best]["cum_work"]:
                event = self._do_reorg(bid)
            # else: side branch, stored, no tip change
            self._save_tip()
            if event:
                self._try_orphans()
            else:
                self._try_orphans()
            return {"accepted": True, "id": bid, "event": event}

    def _add_orphan(self, bid: bytes, f: dict):
        self.orphans[bid] = dict(f)
        while len(self.orphans) > ORPHAN_LIMIT:
            self.orphans.pop(next(iter(self.orphans)))

    def _try_orphans(self):
        progress = True
        while progress:
            progress = False
            for bid, f in list(self.orphans.items()):
                if f["prev"] in self.index or f["prev"] == GENESIS_PREV:
                    del self.orphans[bid]
                    res = self.submit_block(f)
                    if res["accepted"]:
                        progress = True

    def _do_reorg(self, new_tip: bytes):
        old_tip = self.best
        # fork point = common ancestor
        old_anc = self._ancestor_set(old_tip)
        fork, cur = None, new_tip
        while cur is not None:
            if cur in old_anc:
                fork = cur
                break
            cur = self.index[cur]["prev"]
        fork_height = self.index[fork]["height"] if fork else -1
        # collect disconnected (old best -> fork) and connected (fork -> new)
        disconnected, cur = [], old_tip
        while cur != fork:
            disconnected.append(self.index[cur])
            cur = self.index[cur]["prev"]
        connected, cur = [], new_tip
        while cur != fork:
            connected.append(self.index[cur])
            cur = self.index[cur]["prev"]
        connected.reverse()
        self.best = new_tip
        ev = {"type": "reorg", "fork_height": fork_height,
              "depth": len(disconnected),
              "old_tip": old_tip.hex(), "new_tip": new_tip.hex(),
              "connected": connected, "disconnected": disconnected}
        self.reorgs.append({k: v for k, v in ev.items()
                            if k in ("fork_height", "depth", "old_tip",
                                     "new_tip")})
        self.reorgs[-1]["time"] = int(time.time())
        self.log(f"REORG fork_height={fork_height} depth={len(disconnected)} "
                 f"{old_tip.hex()[:16]} -> {new_tip.hex()[:16]}")
        return ev


# ---------------------------------------------------------------- mempool
class Mempool:
    """Simple relay mempool: txid (internal hex) -> raw. No UTXO set, so
    admission is syntactic; disconnected-branch txs are dropped, not
    resurrected (resurrection needs a UTXO view -- documented TODO)."""

    def __init__(self, max_txs: int = 10000,
                 max_tx_bytes: int = 1_000_000):
        self.txs = {}
        self.max_txs = max_txs
        self.max_tx_bytes = max_tx_bytes

    def add(self, raw: bytes):
        if not raw or len(raw) > self.max_tx_bytes:
            return False, "bad-size"
        if raw.startswith(COINBASE_MAGIC):
            return False, "coinbase-not-relayed"
        txid = sha256d(raw).hex()
        if txid in self.txs:
            return False, "duplicate"
        if len(self.txs) >= self.max_txs:
            return False, "mempool-full"
        self.txs[txid] = raw
        return True, txid

    def remove_confirmed(self, txs):
        for raw in txs:
            self.txs.pop(sha256d(raw).hex(), None)

# ------------------------------------------------------------- connection
class PeerConn(threading.Thread):
    def __init__(self, mgr, sock: socket.socket, addr, inbound: bool):
        super().__init__(daemon=True, name=f"peer-{addr[0]}:{addr[1]}")
        self.mgr = mgr
        self.sock = sock
        self.addr = addr
        self.inbound = inbound
        self.framer = Framer(mgr.magic)
        self.send_lock = threading.Lock()
        self.veracked = False
        self.peer_tip_height = -1
        self.peer_tip_hash = None
        self.peer_nonce = None
        self.score = 0
        self.last_pong = time.time()
        self._closed = False

    def send(self, command: str, payload: bytes):
        data = encode_msg(self.mgr.magic, command, payload)
        with self.send_lock:
            self.sock.sendall(data)

    def misbehave(self, points: int, why: str):
        self.score += points
        self.mgr.log(f"peer {self.addr}: misbehavior +{points} ({why}) "
                     f"score={self.score}")
        if self.score >= 50:
            self.mgr.log(f"peer {self.addr}: BANNED")
            self.mgr.ban(self.addr[0])
            self.close()

    def close(self):
        if not self._closed:
            self._closed = True
            try:
                self.sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self.sock.close()

    def run(self):
        try:
            self.sock.settimeout(5)
            if not self.inbound:
                tip = self.mgr.chainstate.tip()
                self.send("version", enc_version(
                    tip["height"], bytes.fromhex(tip["hash"]),
                    self.mgr.node_nonce))
            deadline = time.time() + HANDSHAKE_TIMEOUT
            while not self.mgr.stop.is_set() and not self._closed:
                try:
                    data = self.sock.recv(65536)
                except socket.timeout:
                    data = b""
                if data:
                    self.framer.feed(data)
                    while True:
                        try:
                            m = self.framer.next_msg()
                        except ValueError as e:
                            self.misbehave(10, f"framing: {e}")
                            return
                        if m is None:
                            break
                        self.mgr.on_message(self, m[0], m[1])
                if not self.veracked and time.time() > deadline:
                    self.mgr.log(f"peer {self.addr}: handshake timeout")
                    return
                if self.veracked and \
                        time.time() - self.last_pong > PING_TIMEOUT:
                    self.mgr.log(f"peer {self.addr}: ping timeout")
                    return
                if self.veracked and \
                        time.time() - getattr(self, "_last_ping", 0) > \
                        PING_INTERVAL:
                    self._last_ping = time.time()
                    self.send("ping", struct.pack("<Q", int(time.time())))
        except (OSError, ConnectionError):
            pass
        finally:
            self.mgr.remove_peer(self)
            self.close()


# ------------------------------------------------------------- manager
class PeerManager:
    def __init__(self, chainstate: ChainState, mempool: Mempool,
                 port: int, bind: str = "127.0.0.1", log=print,
                 lock=None):
        self.chainstate = chainstate
        self.mempool = mempool
        self.port = port
        self.bind = bind
        self.magic = chainstate.magic
        self.log = log
        self.lock = lock or chainstate.lock
        self.stop = threading.Event()
        self.peers = []
        self.peers_lock = threading.Lock()
        self.banned = {}
        self.node_nonce = int.from_bytes(os.urandom(8), "big")
        self._listener = None

    # -- lifecycle ----------------------------------------------------
    def start(self):
        self._listener = threading.Thread(target=self._listen, daemon=True,
                                          name="p2p-listen")
        self._listener.start()

    def _listen(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((self.bind, self.port))
        self.port = s.getsockname()[1]  # publish the real port (0 -> ephemeral)
        s.listen(16)
        s.settimeout(2)
        self.log(f"P2P listening on {self.bind}:{self.port}")
        while not self.stop.is_set():
            try:
                c, a = s.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            if self.banned.get(a[0], 0) > time.time():
                c.close()
                continue
            self._add_peer(c, a, inbound=True)
        s.close()

    def connect(self, host: str, port: int):
        def _dial():
            # Retry until the peer accepts or the manager shuts down: a
            # bootstrap peer that isn't listening yet must not be silently
            # dropped after a single attempt.
            while not self.stop.is_set():
                try:
                    s = socket.create_connection((host, port), timeout=10)
                    self._add_peer(s, (host, port), inbound=False)
                    return
                except OSError as e:
                    self.log(f"dial {host}:{port} failed: {e} (retrying)")
                self.stop.wait(5)
        threading.Thread(target=_dial, daemon=True,
                         name="p2p-dial").start()

    def _add_peer(self, sock, addr, inbound: bool):
        pc = PeerConn(self, sock, addr, inbound)
        with self.peers_lock:
            self.peers.append(pc)
        pc.start()
        # inbound: send our version first too (both sides send version)
        if inbound:
            try:
                tip = self.chainstate.tip()
                pc.send("version", enc_version(
                    tip["height"], bytes.fromhex(tip["hash"]),
                    self.node_nonce))
            except OSError:
                pass

    def remove_peer(self, pc: PeerConn):
        with self.peers_lock:
            if pc in self.peers:
                self.peers.remove(pc)

    def ban(self, ip: str):
        self.banned[ip] = time.time() + 3600

    def shutdown(self):
        self.stop.set()
        with self.peers_lock:
            for p in list(self.peers):
                p.close()

    def peer_info(self):
        with self.peers_lock:
            return [{"addr": f"{p.addr[0]}:{p.addr[1]}",
                     "inbound": p.inbound,
                     "tip_height": p.peer_tip_height,
                     "score": p.score,
                     "veracked": p.veracked} for p in self.peers]

    # -- broadcast ----------------------------------------------------
    def _send_all(self, command, payload, skip=None):
        with self.peers_lock:
            peers = list(self.peers)
        for p in peers:
            if p is skip or not p.veracked:
                continue
            try:
                p.send(command, payload)
            except OSError:
                pass

    def broadcast_block(self, blk: dict):
        """blk: dict with an "id" (internal-order bytes, e.g. from
        mine_block or an index record)."""
        self._send_all("inv", enc_inv([(INV_BLOCK, blk["id"])]))

    def broadcast_tx(self, raw: bytes):
        self._send_all("inv", enc_inv([(INV_TX, sha256d(raw))]))

    # -- message dispatch ---------------------------------------------
    def on_message(self, pc: PeerConn, command: str, payload: bytes):
        try:
            h = getattr(self, "_on_" + command, None)
            if h is None:
                pc.misbehave(1, f"unknown command {command}")
                return
            h(pc, payload)
        except Exception as e:
            pc.misbehave(5, f"handler {command} failed: {e}")

    def _on_version(self, pc: PeerConn, p: bytes):
        try:
            v = dec_version(p)
        except Exception as e:
            pc.misbehave(10, f"bad version: {e}")
            return
        if v["ver"] != PROTO_VERSION:
            pc.misbehave(10, f"proto version {v['ver']}")
            return
        if v["nonce"] == self.node_nonce:
            pc.close()  # self-connection
            return
        pc.peer_tip_height = v["tip_height"]
        pc.peer_tip_hash = v["tip_hash"]
        pc.peer_nonce = v["nonce"]
        try:
            pc.send("verack", b"")
        except OSError:
            return

    def _on_verack(self, pc: PeerConn, p: bytes):
        pc.veracked = True
        pc.last_pong = time.time()
        self._maybe_sync(pc)

    def _maybe_sync(self, pc: PeerConn):
        """Ask for headers if the peer advertises a heavier tip."""
        with self.lock:
            our = self.chainstate.tip()
            locator = self.chainstate.locator()
        if pc.peer_tip_height > our["height"] or \
                (pc.peer_tip_height == our["height"]
                 and pc.peer_tip_hash.hex() != our["hash"]):
            try:
                pc.send("getheaders",
                        enc_getheaders(locator, bytes(32)))
            except OSError:
                pass

    def _on_getheaders(self, pc: PeerConn, p: bytes):
        try:
            locator, stop = dec_getheaders(p)
        except Exception as e:
            pc.misbehave(5, f"bad getheaders: {e}")
            return
        with self.lock:
            headers = self.chainstate.headers_since(locator, stop)
        try:
            pc.send("headers", enc_headers(headers))
        except OSError:
            pass

    def _on_headers(self, pc: PeerConn, p: bytes):
        try:
            headers = dec_headers(p)
        except Exception as e:
            pc.misbehave(10, f"bad headers: {e}")
            return
        if not headers:
            return
        # Header-stage validation: PoW (via the advertised txroot), linkage,
        # height continuity, increasing timestamps. The txroot is advisory
        # here and is recomputed + enforced when each block body arrives.
        need = []
        with self.lock:
            prev_id, prev_height, prev_time = None, None, None
            for i, h in enumerate(headers):
                bid = block_id_for(self.chainstate.kernel, h["height"],
                                   h["prev"], h["txroot"], h["timestamp"],
                                   h["nonce"])
                if not meets_difficulty(bid, self.chainstate.difficulty):
                    pc.misbehave(10, "header insufficient PoW")
                    return
                if i == 0:
                    parent = self.chainstate.index.get(h["prev"])
                    if parent is None:
                        # Unknown branch root: not necessarily hostile
                        # (could be a longer side branch), but we cannot
                        # validate it -- ask again later, no penalty.
                        return
                    if h["height"] != parent["height"] + 1:
                        pc.misbehave(10, "header height discontinuity")
                        return
                    prev_time = parent["timestamp"]
                else:
                    if h["prev"] != prev_id:
                        pc.misbehave(10, "headers not linked")
                        return
                    if h["height"] != prev_height + 1:
                        pc.misbehave(10, "header height discontinuity")
                        return
                if h["timestamp"] <= prev_time:
                    pc.misbehave(10, "header time not increasing")
                    return
                if bid not in self.chainstate.index:
                    need.append(bid)
                prev_id, prev_height, prev_time = \
                    bid, h["height"], h["timestamp"]
        if need:
            for i in range(0, len(need), GETDATA_BATCH):
                try:
                    pc.send("getdata",
                            enc_inv([(INV_BLOCK, x)
                                     for x in need[i:i + GETDATA_BATCH]]))
                except OSError:
                    return
        else:
            self._maybe_sync(pc)

    def _on_inv(self, pc: PeerConn, p: bytes):
        try:
            entries = dec_inv(p)
        except Exception as e:
            pc.misbehave(5, f"bad inv: {e}")
            return
        want_blocks, want_txs = [], []
        with self.lock:
            for typ, h in entries:
                if typ == INV_BLOCK and h not in self.chainstate.index:
                    want_blocks.append(h)
                elif typ == INV_TX and h.hex() not in self.mempool.txs:
                    want_txs.append(h)
        if want_blocks:
            try:
                pc.send("getdata",
                        enc_inv([(INV_BLOCK, h)
                                 for h in want_blocks[:GETDATA_BATCH]]))
            except OSError:
                pass
        if want_txs:
            try:
                pc.send("getdata",
                        enc_inv([(INV_TX, h) for h in want_txs[:GETDATA_BATCH]]))
            except OSError:
                pass

    def _on_getdata(self, pc: PeerConn, p: bytes):
        try:
            entries = dec_inv(p)
        except Exception as e:
            pc.misbehave(5, f"bad getdata: {e}")
            return
        with self.lock:
            for typ, h in entries[:GETDATA_BATCH]:
                try:
                    if typ == INV_BLOCK:
                        blk = self.chainstate.get_block(h)
                        if blk:
                            pc.send("block", enc_block_dict(blk))
                    elif typ == INV_TX:
                        raw = self.mempool.txs.get(h.hex())
                        if raw:
                            pc.send("tx", enc_tx(raw))
                except OSError:
                    break

    def _on_block(self, pc: PeerConn, p: bytes):
        try:
            blk = dec_block(p)
        except Exception as e:
            pc.misbehave(10, f"bad block: {e}")
            return
        with self.lock:
            res = self.chainstate.submit_block(blk)
            ev = res.get("event")
            if ev:
                self._chain_event(ev)
        if not res["accepted"]:
            if res["reason"] not in ("duplicate",):
                pc.misbehave(10, f"invalid block: {res['reason']}")
            if res["reason"] == "orphan":
                with self.lock:
                    locator = self.chainstate.locator()
                try:
                    pc.send("getheaders",
                            enc_getheaders(locator, bytes(32)))
                except OSError:
                    pass
            return
        # relay to everyone else
        self._send_all("inv",
                       enc_inv([(INV_BLOCK, res["id"])]), skip=pc)

    def _chain_event(self, ev: dict):
        """Mempool fix-up after an extension or reorg. Lock must be held:
        drop txs confirmed by the newly connected blocks."""
        for rec in ev.get("connected", []):
            self.mempool.remove_confirmed(
                [t for t in rec["txs"]
                 if not t.startswith(COINBASE_MAGIC)])

    def _on_tx(self, pc: PeerConn, p: bytes):
        try:
            raw = dec_tx(p)
        except Exception as e:
            pc.misbehave(5, f"bad tx: {e}")
            return
        with self.lock:
            ok, _ = self.mempool.add(raw)
        if not ok:
            return  # invalid/double: just don't relay
        self._send_all("inv", enc_inv([(INV_TX, sha256d(raw))]), skip=pc)

    def _on_ping(self, pc: PeerConn, p: bytes):
        try:
            pc.send("pong", p[:8])
        except OSError:
            pass

    def _on_pong(self, pc: PeerConn, p: bytes):
        pc.last_pong = time.time()


# ------------------------------------------------------------------ node
def _load_genesis_json(path: str):
    """Load a ground sovereign descriptor.

    Returns (block_fields, descriptor). The descriptor schema is the one
    written by ``pkg/genesis/sovereign_genesis.build_genesis``: nonce and
    final_hash live under ``pow``. Raises on any shape mismatch -- a
    descriptor that is not really the sovereign genesis must never be
    adopted silently.
    """
    d = json.load(open(path))
    if d.get("height", 0) != 0:
        raise ValueError("descriptor height is not 0")
    if d.get("prev") != GENESIS_PREV.hex():
        raise ValueError("descriptor prev is not 32 zero bytes")
    pow_ = d.get("pow") or {}
    if "nonce" not in pow_ or "final_hash" not in pow_:
        raise ValueError("descriptor pow.nonce/pow.final_hash missing")
    fields = {"height": 0, "prev": GENESIS_PREV,
              "timestamp": d["timestamp"], "nonce": pow_["nonce"],
              "txs": []}
    return fields, d


def _verify_descriptor_oracle(d: dict) -> bool:
    """Independent genesis check via the consensus oracle module.

    Recomputes the seed binding (axiom == published taproot, seed_hex ==
    the HPP-1 commitment) and the final hash from axiom+seed+nonce. This
    is the same verification ``sovereign_genesis.py --verify`` performs;
    the node refuses to adopt a descriptor that fails it.
    """
    repo_root = os.path.dirname(_PKG_DIR)
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    from pkg.genesis.sovereign_genesis import verify_descriptor
    return bool(verify_descriptor(d))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Sovereign $EXS P2P node")
    ap.add_argument("--testnet", action="store_true")
    ap.add_argument("--bind", default="127.0.0.1",
                    help="bind address (default: localhost-only)")
    ap.add_argument("--port", type=int, default=None,
                    help="P2P port (default 29444 mainnet / 39444 testnet)")
    ap.add_argument("--peer", action="append", default=[],
                    help="bootstrap peer host:port (repeatable)")
    ap.add_argument("--datadir", default="./sovereign_chaindata")
    ap.add_argument("--difficulty", type=int, default=DEFAULT_DIFFICULTY,
                    help="leading zero bytes (default 4)")
    ap.add_argument("--genesis-json", default=None,
                    help="pre-ground genesis descriptor JSON")
    args = ap.parse_args(argv)

    magic = MAGIC_TESTNET if args.testnet else MAGIC_MAINNET
    port = args.port or (PORT_TESTNET if args.testnet else PORT_MAINNET)
    if UniversalMiningKernel is None:
        raise SystemExit("UniversalMiningKernel import failed; "
                         "run from the repo with pkg/ intact")
    kernel = UniversalMiningKernel()

    cs = ChainState(args.datadir, kernel, args.difficulty, magic)
    if cs.best is None:
        if args.genesis_json:
            g, desc = _load_genesis_json(args.genesis_json)
            print("verifying genesis descriptor against the consensus "
                  "oracle ...")
            if not _verify_descriptor_oracle(desc):
                raise SystemExit("genesis descriptor FAILED independent "
                                 "oracle verification; refusing to adopt it")
            res = cs.submit_block(g)
            if not res["accepted"]:
                raise SystemExit(f"genesis rejected: {res['reason']}")
            if res["id"].hex() != desc["pow"]["final_hash"]:
                raise SystemExit(
                    "descriptor final_hash does not match the adopted "
                    "genesis id; refusing to adopt it")
            print(f"genesis loaded: {res['id'].hex()}")
        else:
            print(f"no chain in {args.datadir}: mining genesis at "
                  f"difficulty {args.difficulty} ...")
            if not args.testnet and args.difficulty >= 4:
                print("WARNING: mining a mainnet difficulty-4 genesis "
                      "takes weeks; prefer --genesis-json with the "
                      "ground sovereign descriptor.")
            g = mine_block(kernel, GENESIS_PREV, 0, [], args.difficulty)
            res = cs.submit_block({k: g[k] for k in
                                   ("height", "prev", "timestamp",
                                    "nonce", "txs")})
            assert res["accepted"], res
            print(f"genesis mined: {res['id'].hex()}")

    mp = Mempool()
    mgr = PeerManager(cs, mp, port, bind=args.bind)
    mgr.start()
    for peer in args.peer:
        host, _, p = peer.rpartition(":")
        mgr.connect(host or "127.0.0.1", int(p) if p else port)
    print(f"tip: {cs.tip()}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        mgr.shutdown()


if __name__ == "__main__":
    main()
