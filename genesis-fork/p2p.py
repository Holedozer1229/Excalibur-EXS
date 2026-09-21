#!/usr/bin/env python3
"""EXCAL peer-to-peer transport.

Bitcoin-style binary framing with EXCAL network magic (see P2P_SPEC.md).
One thread per connection; a PeerManager owns the listener, outbound
dials, header sync, block/tx relay, and misbehavior scoring.

Hash byte order: INTERNAL (sha256d output order) on the wire, converted
to/from display order at the chainstate boundary.

BYTE-ORDER CONVENTION (do not "fix" -- verified by t_live_two_node_sync):

ChainState keeps every hash in DISPLAY order (reversed sha256d, the
human-readable form): index keys, best, genesis_hash, locator entries,
block records' prev/merkle/hash, and tip()["hash"] hex. The v1 consensus
quirk is that ser_header itself is fed display-order prev/merkle; P2P
preserves v1 exactly and never reinterprets it.

The wire follows Bitcoin convention: hashes on the wire are in INTERNAL
(little-endian) order. The codecs below are the ONLY place that reverses
bytes: enc_* take display-order dicts and reverse onto the wire; dec_*
reverse wire bytes back to display-order dicts. Call sites must NOT add
extra [::-1] -- one was added once, and it broke sync.

The one exception is the mempool: mempool.txs is keyed by INTERNAL-hex
txids, so tx lookups use h[::-1].hex() on display-order inv hashes.
"""
import os
import socket
import struct
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from genesis_fork import sha256d, ser_header, bits_to_target, PARAMS
from txscript import txid_internal

PROTO_VERSION = 1
MAX_MESSAGE = 4 * 1024 * 1024
HANDSHAKE_TIMEOUT = 15
PING_INTERVAL = 60
PING_TIMEOUT = 120

INV_BLOCK = 1
INV_TX = 2


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


# ------------------------------------------------------------- payloads
def enc_version(tip_height: int, tip_hash_display: bytes, nonce: int) -> bytes:
    return (struct.pack("<I", PROTO_VERSION) + struct.pack("<Q", 0)
            + struct.pack("<q", int(time.time()))
            + struct.pack("<I", tip_height)
            + tip_hash_display[::-1] + struct.pack("<Q", nonce))


def dec_version(p: bytes):
    ver, = struct.unpack("<I", p[:4])
    th, = struct.unpack("<I", p[20:24])
    tip_hash = p[24:56][::-1]
    nonce, = struct.unpack("<Q", p[56:64])
    return {"ver": ver, "tip_height": th, "tip_hash": tip_hash,
            "nonce": nonce}


def enc_headers(headers: list) -> bytes:
    """headers: list of dicts with version/prev/merkle/time/bits/nonce
    (display-order hashes)."""
    out = ser_varint(len(headers))
    for h in headers:
        out += ser_header(h["version"], h["prev"][::-1], h["merkle"][::-1],
                          h["time"], h["bits"], h["nonce"])
    return out


def dec_headers(p: bytes):
    n, pos = read_varint(p, 0)
    out = []
    for _ in range(n):
        if pos + 80 > len(p):
            raise ValueError("truncated headers")
        hb = p[pos:pos + 80]
        pos += 80
        ver, = struct.unpack("<I", hb[:4])
        prev = hb[4:36][::-1]
        merkle = hb[36:68][::-1]
        t, bits, nonce = struct.unpack("<III", hb[68:80])
        out.append({"version": ver, "prev": prev, "merkle": merkle,
                    "time": t, "bits": bits, "nonce": nonce})
    return out


def enc_inv(entries: list) -> bytes:
    out = ser_varint(len(entries))
    for typ, h_display in entries:
        out += struct.pack("<I", typ) + h_display[::-1]
    return out


def dec_inv(p: bytes):
    n, pos = read_varint(p, 0)
    out = []
    for _ in range(n):
        typ, = struct.unpack("<I", p[pos:pos + 4])
        h = p[pos + 4:pos + 36][::-1]
        pos += 36
        out.append((typ, h))
    return out


def enc_getheaders(locator_display: list, stop_display: bytes) -> bytes:
    out = ser_varint(len(locator_display))
    for h in locator_display:
        out += h[::-1]
    out += stop_display[::-1]
    return out


def dec_getheaders(p: bytes):
    n, pos = read_varint(p, 0)
    loc = []
    for _ in range(n):
        loc.append(p[pos:pos + 32][::-1])
        pos += 32
    stop = p[pos:pos + 32][::-1]
    return loc, stop


def enc_block(blk: dict) -> bytes:
    """blk: chainstate block dict (display-order hashes, txs = raw list)."""
    out = ser_header(blk["version"], blk["prev"][::-1],
                     blk["merkle"][::-1], blk["time"], blk["bits"],
                     blk["nonce"])
    out += ser_varint(len(blk["txs"]))
    for tx in blk["txs"]:
        out += ser_varint(len(tx)) + tx
    return out


def dec_block_wire(p: bytes) -> dict:
    if len(p) < 80:
        raise ValueError("truncated block header")
    hb = p[:80]
    ver, = struct.unpack("<I", hb[:4])
    prev = hb[4:36][::-1]
    merkle = hb[36:68][::-1]
    t, bits, nonce = struct.unpack("<III", hb[68:80])
    n, pos = read_varint(p, 80)
    txs = []
    for _ in range(n):
        ln, pos = read_varint(p, pos)
        txs.append(p[pos:pos + ln])
        pos += ln
    if pos != len(p):
        raise ValueError("trailing bytes in block")
    blk = {"version": ver, "prev": prev, "merkle": merkle, "time": t,
           "bits": bits, "nonce": nonce, "txs": txs}
    # v1 consensus quirk: the block hash is computed over the header with
    # display-order prev/merkle (not the wire-order bytes in hb).
    blk["hash"] = sha256d(
        ser_header(ver, prev, merkle, t, bits, nonce))[::-1]
    return blk


def enc_tx(raw: bytes) -> bytes:
    return ser_varint(len(raw)) + raw


def dec_tx(p: bytes) -> bytes:
    ln, pos = read_varint(p, 0)
    if pos + ln != len(p):
        raise ValueError("trailing bytes in tx")
    return p[pos:pos + ln]


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
                # periodic ping
                if self.veracked and \
                        time.time() - getattr(self, "_last_ping", 0) > PING_INTERVAL:
                    self._last_ping = time.time()
                    self.send("ping", struct.pack("<Q", int(time.time())))
        except (OSError, ConnectionError):
            pass
        finally:
            self.mgr.remove_peer(self)
            self.close()


# ------------------------------------------------------------- manager
class PeerManager:
    def __init__(self, chainstate, mempool, lock: threading.Lock,
                 port: int, bind: str = "127.0.0.1", log=print):
        self.chainstate = chainstate
        self.mempool = mempool
        self.lock = lock
        self.port = port
        self.bind = bind
        self.magic = chainstate.P["magic"]
        self.log = log
        self.stop = threading.Event()
        self.peers = []          # PeerConn list
        self.peers_lock = threading.Lock()
        self.banned = {}         # ip -> unban timestamp
        self.node_nonce = int.from_bytes(os.urandom(8), "big")
        self._listener = None

    # -- lifecycle ----------------------------------------------------
    def start(self):
        self._listener = threading.Thread(target=self._listen, daemon=True,
                                          name="p2p-listen")
        self._listener.start()
        self.log(f"P2P listening on {self.bind}:{self.port}")

    def _listen(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((self.bind, self.port))
        s.listen(16)
        s.settimeout(2)
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
            # Retry until the peer accepts or the manager shuts down.
            # A bootstrap peer that isn't listening yet (still starting)
            # must not be silently dropped after a single attempt.
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
        # blk["hash"] is display-order, matching enc_inv's contract
        self._send_all("inv", enc_inv([(INV_BLOCK, blk["hash"])]))

    def broadcast_tx(self, raw: bytes):
        from txscript import txid_internal
        self._send_all("inv", enc_inv([(INV_TX, txid_internal(raw)[::-1])]))

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
        if pc.inbound:
            # listener already sent version on accept
            pass

    def _on_verack(self, pc: PeerConn, p: bytes):
        pc.veracked = True
        pc.last_pong = time.time()
        self._maybe_sync(pc)

    def _maybe_sync(self, pc: PeerConn):
        """Ask for headers if the peer advertises a heavier tip."""
        with self.lock:
            our = self.chainstate.tip()
            locator = self.chainstate.locator()
        # locator hashes are display-order, matching enc_getheaders'
        # contract (chainstate keeps display order everywhere, incl.
        # inside ser_header -- the v1 consensus quirk).
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
        # Validate the batch as a chain: the first header must connect to
        # our index (full header check incl. bits); the rest are checked
        # for linkage + PoW here, with full validation deferred to
        # submit_block when each block body arrives.
        # Wire hashes decode to display-order; chainstate is display-order
        # throughout (ser_header included -- the v1 quirk), so no
        # byte-reversal is needed here.
        need = []
        prev_hash, prev_time = None, None
        with self.lock:
            for i, h in enumerate(headers):
                hb = ser_header(h["version"], h["prev"], h["merkle"],
                                h["time"], h["bits"], h["nonce"])
                hh = sha256d(hb)[::-1]
                dh = sha256d(hb)
                if int.from_bytes(dh, "big") > bits_to_target(h["bits"]):
                    pc.misbehave(10, "header insufficient PoW")
                    return
                if i == 0:
                    blk = dict(h, hash=hh, txs=None)
                    ok, reason, _height = \
                        self.chainstate.validate_header(blk)
                    if not ok:
                        pc.misbehave(10, f"bad header: {reason}")
                        return
                else:
                    if h["prev"] != prev_hash:
                        pc.misbehave(10, "headers not linked")
                        return
                    if h["time"] <= prev_time:
                        pc.misbehave(10, "header time not increasing")
                        return
                if hh not in self.chainstate.index:
                    need.append(hh)
                prev_hash, prev_time = hh, h["time"]
        if need:
            # request in batches of 32
            for i in range(0, len(need), 32):
                try:
                    pc.send("getdata",
                            enc_inv([(INV_BLOCK, h) for h in need[i:i + 32]]))
                except OSError:
                    return
        else:
            # we have everything; check if peer is still ahead
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
                # block index is display-keyed; mempool keys are
                # internal-hex txids
                if typ == INV_BLOCK and h not in self.chainstate.index:
                    want_blocks.append(h)
                elif typ == INV_TX and h[::-1].hex() not in self.mempool.txs:
                    want_txs.append(h)
        if want_blocks:
            try:
                pc.send("getdata",
                        enc_inv([(INV_BLOCK, h) for h in want_blocks[:32]]))
            except OSError:
                pass
        if want_txs:
            try:
                pc.send("getdata",
                        enc_inv([(INV_TX, h) for h in want_txs[:32]]))
            except OSError:
                pass

    def _on_getdata(self, pc: PeerConn, p: bytes):
        try:
            entries = dec_inv(p)
        except Exception as e:
            pc.misbehave(5, f"bad getdata: {e}")
            return
        with self.lock:
            for typ, h in entries[:32]:
                try:
                    # inv hashes are display-order; index is display-keyed
                    if typ == INV_BLOCK and h in self.chainstate.index:
                        r = self.chainstate.index[h]
                        blk = {k: r[k] for k in
                               ("version", "prev", "merkle", "time",
                                "bits", "nonce", "hash", "txs")}
                        pc.send("block", enc_block(blk))
                    elif typ == INV_TX:
                        # mempool keys are internal-hex txids
                        e = self.mempool.txs.get(h[::-1].hex())
                        if e:
                            pc.send("tx", enc_tx(e["raw"]))
                except OSError:
                    break
                except KeyError:
                    continue

    def _on_block(self, pc: PeerConn, p: bytes):
        try:
            blk = dec_block_wire(p)
        except Exception as e:
            pc.misbehave(10, f"bad block: {e}")
            return
        # dec_block_wire yields display-order hashes; chainstate is
        # display-order throughout, so blk goes straight in.
        with self.lock:
            res = self.chainstate.submit_block(blk)
            ev = res.get("event")
            if ev:
                self._apply_reorg_side_effects(ev)
        if not res["accepted"]:
            if res["reason"] not in ("duplicate",):
                pc.misbehave(10, f"invalid block: {res['reason']}")
            if res["reason"] == "orphan":
                # ask for the missing parents
                with self.lock:
                    locator = self.chainstate.locator()
                try:
                    pc.send("getheaders",
                            enc_getheaders(locator, bytes(32)))
                except OSError:
                    pass
            return
        # relay to everyone else
        self._send_all("inv", enc_inv([(INV_BLOCK, blk["hash"])]), skip=pc)

    def _apply_reorg_side_effects(self, ev: dict):
        """Mempool fix-up after a chain event (extension or reorg).
        Lock must be held. Extensions just confirm txs; reorgs also
        resurrect disconnected ones and revalidate the mempool."""
        mp, cs = self.mempool, self.chainstate
        h = cs.tip()["height"]
        # txs confirmed on the new branch leave the mempool
        confirmed = set(ev.get("connected_txids", []))
        if ev.get("type") == "extension" and not confirmed:
            return  # nothing to do: mempool was valid, nothing confirmed
        # resurrect txs orphaned by the disconnect (revalidate on add)
        resurrect = [r for r in ev.get("disconnected_raw", [])
                     if txid_internal(r).hex() not in confirmed]
        # rebuild the mempool from scratch in original admission order:
        # drop confirmed, re-admit survivors + resurrected txs. Reusing
        # mp.add keeps validation identical to the RPC path.
        survivors = [r["raw"] for r in mp.txs.values()
                     if r["raw"] and txid_internal(r["raw"]).hex()
                     not in confirmed]
        mp.txs.clear()
        dropped = 0
        for raw in survivors + resurrect:
            ok, _ = mp.add(raw, cs.utxo, h, save=False)
            if not ok:
                dropped += 1
        mp._save()
        if dropped:
            self.log(f"reorg: {dropped} mempool txs no longer valid "
                     f"(dropped)")

    def _on_tx(self, pc: PeerConn, p: bytes):
        try:
            raw = dec_tx(p)
        except Exception as e:
            pc.misbehave(5, f"bad tx: {e}")
            return
        with self.lock:
            ok, res = self.mempool.add(raw, self.chainstate.utxo,
                                       self.chainstate.tip()["height"])
        if not ok:
            return  # invalid/double: just don't relay
        self._send_all("inv", enc_inv(
            [(INV_TX, txid_internal(raw)[::-1])]), skip=pc)

    def _on_ping(self, pc: PeerConn, p: bytes):
        try:
            pc.send("pong", p[:8])
        except OSError:
            pass

    def _on_pong(self, pc: PeerConn, p: bytes):
        pc.last_pong = time.time()
