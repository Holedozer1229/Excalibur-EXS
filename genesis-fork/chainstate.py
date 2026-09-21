#!/usr/bin/env python3
"""ChainState: branched chain storage, most-work selection, and reorgs.

Owns everything the old excal.py kept in loose variables:
  - block index: every validated block on every branch
  - branch tips + best tip (maximum cumulative chainwork)
  - UTXO set for the ACTIVE chain, with per-block undo records
  - atomic, crash-safe persistence (see P2P_SPEC.md)

Consensus is NOT reimplemented here: header checks and full block
validation delegate to genesis_fork.validate_block, the same function
the miner uses. This module only adds branching, chainwork accounting,
UTXO undo, and atomic commits around it.

Conventions: hashes are bytes in DISPLAY order everywhere in memory
(sha256d output reversed), matching excal.py. The wire (p2p.py) uses
internal order and converts at the boundary.
"""
import json
import os
import struct
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from genesis_fork import (
    GENESIS, sha256d, ser_header, bits_to_target, subsidy, txid,
    merkle_root, required_bits, check_coinbase_lineage, coinbase_value,
    validate_block, verify_genesis, use_network, PARAMS,
)
from txscript import (parse_tx, txid_internal, validate_block_txs)

PROTO_VERSION = 1
MAX_MESSAGE = 4 * 1024 * 1024


def block_work(bits: int) -> int:
    """Chainwork contributed by one block: 2^256 / (target+1)."""
    return (1 << 256) // (bits_to_target(bits) + 1)


def enc_block(blk: dict) -> dict:
    return {"version": blk["version"], "prev": blk["prev"].hex(),
            "merkle": blk["merkle"].hex(), "time": blk["time"],
            "bits": blk["bits"], "nonce": blk["nonce"],
            "hash": blk["hash"].hex(),
            "txs": [t.hex() for t in blk["txs"]]}


def dec_block(d: dict) -> dict:
    return {"version": d["version"], "prev": bytes.fromhex(d["prev"]),
            "merkle": bytes.fromhex(d["merkle"]), "time": d["time"],
            "bits": d["bits"], "nonce": d["nonce"],
            "hash": bytes.fromhex(d["hash"]),
            "txs": [bytes.fromhex(t) for t in d["txs"]]}


def _atomic_write_json(path: str, obj) -> None:
    d = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _append_jsonl(path: str, obj) -> None:
    with open(path, "a", buffering=1) as f:
        f.write(json.dumps(obj) + "\n")


class ChainState:
    """Branched chain + active-tip UTXO with undo + atomic persistence."""

    def __init__(self, datadir: str, net: str = "testnet"):
        use_network(net)
        self.net = net
        self.P = PARAMS[net]
        self.datadir = os.path.abspath(datadir)
        self.cdir = os.path.join(self.datadir, "chaindata")
        os.makedirs(self.cdir, exist_ok=True)
        self.blocks_path = os.path.join(self.cdir, "blocks.jsonl")
        self.active_path = os.path.join(self.cdir, "active.jsonl")
        self.state_path = os.path.join(self.cdir, "state.json")

        self.index = {}     # hash(display bytes) -> record
        self.tips = {}      # hash -> height (branch tips)
        self.invalid = set()  # hashes that failed full validation (can never win)
        self.orphans = {}   # hash -> block dict (parent unknown), bounded
        self.best = None    # hash of active tip
        self.utxo = {}      # ACTIVE chain UTXO (txscript format)
        self.undo = {}      # block hash -> undo record (active chain only)
        self.reorgs = []    # history of reorg events
        self.genesis_hash = None

    # ------------------------------------------------------------ loading
    def load(self):
        """Load or migrate, then rebuild index + UTXO + undo by replay."""
        if (not os.path.exists(self.blocks_path)
                and not os.path.exists(self.active_path)):
            self._migrate_legacy()
        gh = verify_genesis()
        self.genesis_hash = gh
        # Deterministic rebuild: replay the active chain for UTXO/undo/best,
        # then index every block in blocks.jsonl (side branches), then tips.
        self._rebuild_index_from_files()
        # state.json carries only the reorg log and the invalid set. The
        # active tip is authoritative from the active.jsonl replay above:
        # state.json's best can lag it (crash between the two writes) but
        # is never ahead of it, so it must not override.
        if os.path.exists(self.state_path):
            st = json.load(open(self.state_path))
            self.reorgs = st.get("reorgs", [])
            for hx in st.get("invalid", []):
                hb = bytes.fromhex(hx)
                if hb in self.index:
                    self.invalid.add(hb)
        self._save_state()
        return self

    @staticmethod
    def _read_jsonl_repair(path):
        """Read a JSONL file, repairing a torn trailing line.

        POSIX O_APPEND single-line writes are atomic, but a kill -9 can
        still leave a partial final line. Drop it and rewrite the file
        atomically so the on-disk state is always well-formed.
        """
        with open(path) as f:
            lines = [ln for ln in (l.strip() for l in f) if ln]
        recs, bad = [], 0
        for ln in lines:
            try:
                recs.append(json.loads(ln))
            except Exception:
                bad += 1
                break
        if bad and len(recs) < len(lines):
            tmp = path + ".tmp"
            with open(tmp, "w") as f:
                for r in recs:
                    f.write(json.dumps(r) + "\n")
            os.replace(tmp, path)
        return recs

    def _rebuild_index_from_files(self):
        """Deterministic rebuild: replay active chain for UTXO/undo/best,
        then index every block in blocks.jsonl, then recompute tips."""
        gh = self.genesis_hash
        grec = {"version": GENESIS["version"], "prev": GENESIS["prev"],
                "merkle": GENESIS["merkle"], "time": GENESIS["time"],
                "bits": GENESIS["bits"], "nonce": GENESIS["nonce"],
                "hash": gh, "txs": [],
                "height": 0, "work_cum": block_work(GENESIS["bits"])}
        self.index = {gh: grec}
        self.utxo = {}
        self.undo = {gh: []}
        self.tips = {}
        active = self._read_jsonl_repair(self.active_path)
        prev_h = None
        for rec in active:
            blk = dec_block(rec["block"])
            h = rec["height"]
            if h == 0:
                assert blk["hash"] == gh
                self.best = gh
                prev_h = gh
                continue
            assert blk["prev"] == prev_h, \
                f"active chain prev break at height {h}"
            undo = self._connect_utxo(self.utxo, blk["txs"], h)
            self.undo[blk["hash"]] = undo
            self.index[blk["hash"]] = dict(blk, height=h,
                                           work_cum=rec["work_cum"])
            self.best = blk["hash"]
            prev_h = blk["hash"]
        # all known blocks (branches)
        if os.path.exists(self.blocks_path):
            for rec in self._read_jsonl_repair(self.blocks_path):
                bh = bytes.fromhex(rec["hash"])
                if bh not in self.index:
                    blk = dec_block(rec["block"])
                    self.index[bh] = dict(blk, height=rec["height"],
                                          work_cum=rec["work_cum"])
        # tips: indexed blocks no other indexed block builds on
        parents = {r["prev"] for r in self.index.values()}
        self.tips = {h: r["height"] for h, r in self.index.items()
                     if h not in parents}
        assert self.best in self.index

    def _migrate_legacy(self):
        """One-time import from the pre-P2P testnet_live.jsonl."""
        legacy = os.path.join(self.datadir, "testnet_live.jsonl")
        gh = verify_genesis()
        blocks = []
        if os.path.exists(legacy):
            with open(legacy) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        d = json.loads(line)
                        blocks.append({
                            "version": d["version"],
                            "prev": bytes.fromhex(d["prev"]),
                            "merkle": bytes.fromhex(d["merkle"]),
                            "time": d["time"], "bits": d["bits"],
                            "nonce": d["nonce"],
                            "hash": bytes.fromhex(d["hash"]),
                            "txs": [bytes.fromhex(t) for t in d["txs"]]})
        if not blocks:
            grec = {"version": GENESIS["version"], "prev": GENESIS["prev"],
                    "merkle": GENESIS["merkle"], "time": GENESIS["time"],
                    "bits": GENESIS["bits"], "nonce": GENESIS["nonce"],
                    "hash": gh, "txs": []}
            blocks = [grec]
        assert blocks[0]["hash"] == gh, "legacy chain not on genesis"
        work_cum = 0
        with open(self.blocks_path, "w") as bf, \
                open(self.active_path, "w") as af:
            for h, blk in enumerate(blocks):
                work_cum += block_work(blk["bits"])
                rec = {"height": h, "hash": blk["hash"].hex(),
                       "work_cum": work_cum, "block": enc_block(blk)}
                bf.write(json.dumps(rec) + "\n")
                af.write(json.dumps(rec) + "\n")
                if h > 0:
                    assert blk["prev"] == blocks[h - 1]["hash"], \
                        f"legacy prev break at {h}"
        self._save_state_best(blocks[-1]["hash"])

    def _save_state_best(self, best_hash: bytes):
        _atomic_write_json(self.state_path, {
            "best": best_hash.hex(),
            "height": self.index.get(best_hash, {}).get("height", 0)
            if hasattr(self, "index") and self.index else 0,
            "reorgs": self.reorgs,
            "tips": {h.hex(): ht for h, ht in self.tips.items()},
        })

    @staticmethod
    def _sanitize_event(ev: dict) -> dict:
        """JSON-safe copy of a chain event (raw tx bytes -> hex)."""
        ev = dict(ev)
        ev["disconnected_raw"] = [r.hex() for r in
                                  ev.get("disconnected_raw", [])]
        return ev

    def _save_state(self):
        _atomic_write_json(self.state_path, {
            "best": self.best.hex(),
            "height": self.index[self.best]["height"],
            "reorgs": [self._sanitize_event(e)
                       for e in self.reorgs[-100:]],
            "tips": {h.hex(): ht for h, ht in self.tips.items()},
            "invalid": sorted(h.hex() for h in self.invalid),
        })

    # ------------------------------------------------------------ UTXO ops
    def _connect_utxo(self, utxo: dict, txs: list, height: int):
        """Apply txs (pre-validated). Returns the undo record.

        Undo is a per-tx list in application order:
          {"spent": [(key, entry), ...], "created": [key, ...]}
        spent entries are popped oldest-first; created entries appended.
        Disconnect replays in reverse (see _disconnect_utxo).
        """
        undo = []
        for n, tx in enumerate(txs):
            t = parse_tx(tx)
            rec = {"spent": [], "created": []}
            if n > 0:
                for vin in t["vin"]:
                    key = (vin["prev"], vin["idx"])
                    entries = utxo[key]
                    e = entries.pop(0)
                    if not entries:
                        del utxo[key]
                    rec["spent"].append((key, e))
            tid = txid_internal(tx)
            for j, vout in enumerate(t["vout"]):
                key = (tid, j)
                utxo.setdefault(key, []).append(
                    (vout["value"], vout["script"], n == 0, height))
                rec["created"].append(key)
            undo.append(rec)
        return undo

    def _disconnect_utxo(self, utxo: dict, undo: list):
        """Exact inverse of _connect_utxo."""
        for rec in reversed(undo):
            for key in reversed(rec["created"]):
                entries = utxo[key]
                entries.pop()
                if not entries:
                    del utxo[key]
            for key, e in reversed(rec["spent"]):
                utxo.setdefault(key, []).insert(0, e)

    # ------------------------------------------------------------ validation
    def _bits_context(self, parent_hash: bytes, height: int) -> dict:
        """Height-indexed ancestor records for required_bits.

        required_bits indexes chain[height-1], chain[height-retarget],
        and walks back from height-1 past min-difficulty blocks, so we
        collect heights (height-retarget-1 .. height-1) by parent walk.
        """
        R = self.P["retarget"]
        ctx = {}
        r = self.index.get(parent_hash)
        h = height - 1
        while r is not None and h > height - R - 2:
            ctx[h] = r
            r = self.index.get(r["prev"]) if h > 0 else None
            h -= 1
        return ctx

    def validate_header(self, blk: dict):
        """Header-only validation. Returns (ok, reason, height)."""
        parent = self.index.get(blk["prev"])
        if parent is None:
            return False, "unknown parent", None
        height = parent["height"] + 1
        bad = []
        if blk["time"] <= parent["time"]:
            bad.append("time not increasing")
        if blk["time"] > int(time.time()) + 7200:
            bad.append("time too far in future")
        ctx = self._bits_context(blk["prev"], height)
        want = required_bits(height, ctx, blk["time"])
        if blk["bits"] != want:
            bad.append(f"bits {blk['bits']:#x} != required {want:#x}")
        hdr = ser_header(blk["version"], blk["prev"], blk["merkle"],
                         blk["time"], blk["bits"], blk["nonce"])
        hh = sha256d(hdr)
        if int.from_bytes(hh, "big") > bits_to_target(blk["bits"]):
            bad.append("insufficient PoW")
        if hh[::-1] != blk["hash"]:
            bad.append("header hash mismatch")
        if bad:
            return False, "; ".join(bad), height
        return True, "ok", height

    def validate_block_full(self, blk: dict, height: int, utxo_view: dict):
        """Full validation incl. txs, against the given UTXO view.

        Delegates to genesis_fork.validate_block -- the same consensus
        function the miner uses."""
        parent = self.index.get(blk["prev"])
        if parent is None:
            return False, "unknown parent"
        ctx = self._bits_context(blk["prev"], height)
        bad = validate_block(blk, parent, height, ctx, utxo=utxo_view)
        if bad:
            return False, "; ".join(bad)
        return True, "ok"

    # ------------------------------------------------------------ submission
    def submit_block(self, blk: dict):
        """Accept a new block (mined locally or from a peer).

        Header-validates, stores, updates tips, and advances the active
        chain if appropriate. Returns a result dict:
          {"accepted": bool, "reason": str, "height": int,
           "event": None | {"type": "extension"|"reorg", ...}}
        An "extension" event means the block extended the active tip
        (not a reorg -- not recorded in self.reorgs). A "reorg" event
        means the active tip switched branches (recorded + persisted).
        Both event types carry connected_txids / disconnected_raw for
        mempool fix-up.
        """
        if blk["hash"] in self.index or blk["hash"] in self.orphans:
            return {"accepted": False, "reason": "duplicate", "height": -1,
                    "event": None}
        ok, reason, height = self.validate_header(blk)
        if not ok:
            if reason == "unknown parent":
                if len(self.orphans) < 128:
                    self.orphans[blk["hash"]] = blk
                return {"accepted": False, "reason": "orphan", "height": -1,
                        "event": None}
            return {"accepted": False, "reason": reason, "height": -1,
                    "event": None}
        if blk["prev"] in self.invalid:
            # building on a known-invalid branch: header may be fine, but
            # the branch can never become active.
            self.invalid.add(blk["hash"])
            parent = self.index[blk["prev"]]
            work_cum = parent["work_cum"] + block_work(blk["bits"])
            self.index[blk["hash"]] = dict(blk, height=height,
                                           work_cum=work_cum)
            _append_jsonl(self.blocks_path,
                          {"height": height, "hash": blk["hash"].hex(),
                           "work_cum": work_cum, "block": enc_block(blk)})
            self._save_state()
            return {"accepted": False, "reason": "parent invalid",
                    "height": height, "event": None}
        parent = self.index[blk["prev"]]
        work_cum = parent["work_cum"] + block_work(blk["bits"])
        rec = dict(blk, height=height, work_cum=work_cum)
        self.index[blk["hash"]] = rec
        _append_jsonl(self.blocks_path,
                      {"height": height, "hash": blk["hash"].hex(),
                       "work_cum": work_cum, "block": enc_block(blk)})
        # tips bookkeeping
        if blk["prev"] in self.tips:
            del self.tips[blk["prev"]]
        self.tips[blk["hash"]] = height
        # resolve orphans that were waiting for this block
        self._resolve_orphans(blk["hash"])

        event = None
        if blk["prev"] == self.best:
            # fast path: extends the active tip (the common case)
            ok, reason = self.validate_block_full(blk, height, self.utxo)
            if not ok:
                self.invalid.add(blk["hash"])
                self.tips.pop(blk["hash"], None)
                self._save_state()
                return {"accepted": False,
                        "reason": f"block invalid: {reason}",
                        "height": height, "event": None}
            undo = self._connect_utxo(self.utxo, blk["txs"], height)
            self.undo[blk["hash"]] = undo
            self.best = blk["hash"]
            _append_jsonl(self.active_path,
                          {"height": height, "hash": blk["hash"].hex(),
                           "work_cum": work_cum, "block": enc_block(blk)})
            event = {"type": "extension", "at": time.time(),
                     "height": height, "new_tip": blk["hash"].hex(),
                     "connected_txids": sorted(
                         txid_internal(t).hex() for t in blk["txs"][1:]),
                     "disconnected_raw": []}
        elif work_cum > self.index[self.best]["work_cum"]:
            # slower path: a side branch now carries the most work
            try:
                event = self._reorg_to(blk["hash"])
            except ValueError as e:
                self._save_state()
                return {"accepted": False,
                        "reason": f"branch invalid: {e}",
                        "height": height, "event": None}
        self._save_state()
        return {"accepted": True, "reason": "ok", "height": height,
                "event": event}

    def _resolve_orphans(self, parent_hash: bytes):
        for oh, ob in list(self.orphans.items()):
            if ob["prev"] == parent_hash:
                del self.orphans[oh]
                self.submit_block(ob)

    # ------------------------------------------------------------ reorg
    def _common_ancestor(self, a: bytes, b: bytes):
        """Walk the heavier tip back until heights meet, then together."""
        ra, rb = self.index[a], self.index[b]
        while ra["height"] > rb["height"]:
            a = ra["prev"]
            ra = self.index[a]
        while rb["height"] > ra["height"]:
            b = rb["prev"]
            rb = self.index[b]
        while a != b:
            a = ra["prev"]
            b = rb["prev"]
            ra = self.index[a]
            rb = self.index[b]
        return a

    def _active_chain_hashes(self):
        """Hashes from best back to genesis (tip-first)."""
        out, h = [], self.best
        while True:
            out.append(h)
            if h == self.genesis_hash:
                break
            h = self.index[h]["prev"]
        return out

    def _reorg_to(self, new_tip: bytes):
        """Switch the active chain to new_tip (must have most work).

        Validates the entire new branch against a UTXO copy before
        touching live state; commit is two atomic file rewrites.
        Returns the reorg event dict (also appended to self.reorgs)."""
        old_tip = self.best
        fork = self._common_ancestor(old_tip, new_tip)
        fork_h = self.index[fork]["height"]
        old_h = self.index[old_tip]["height"]
        new_h = self.index[new_tip]["height"]

        # 1. disconnect on a copy
        utxo_copy = {k: list(v) for k, v in self.utxo.items()}
        h = old_tip
        while h != fork:
            self._disconnect_utxo(utxo_copy, self.undo[h])
            h = self.index[h]["prev"]

        # 2. connect the new branch on the copy, fully validating
        branch = []
        h = new_tip
        while h != fork:
            branch.append(h)
            h = self.index[h]["prev"]
        branch.reverse()
        undo_new = {}
        for bh in branch:
            rec = self.index[bh]
            blk = {k: rec[k] for k in ("version", "prev", "merkle", "time",
                                       "bits", "nonce", "hash", "txs")}
            ok, reason = self.validate_block_full(blk, rec["height"],
                                                  utxo_copy)
            if not ok:
                # Branch is invalid: it can never become active. Mark the
                # failing block (and the tip that triggered this attempt --
                # children inherit via submit_block).
                self.invalid.add(bh)
                self.invalid.add(new_tip)
                self.tips.pop(new_tip, None)
                raise ValueError(f"reorg branch invalid at "
                                 f"h={rec['height']}: {reason}")
            undo_new[bh] = self._connect_utxo(utxo_copy, blk["txs"],
                                             rec["height"])

        # 3. commit: atomic rewrite of active.jsonl, then state.json
        new_active = []
        h = new_tip
        while True:
            rec = self.index[h]
            new_active.append({"height": rec["height"],
                               "hash": h.hex(),
                               "work_cum": rec["work_cum"],
                               "block": enc_block(
                                   {k: rec[k] for k in
                                    ("version", "prev", "merkle", "time",
                                     "bits", "nonce", "hash", "txs")})})
            if h == self.genesis_hash:
                break
            h = rec["prev"]
        new_active.reverse()
        fd, tmp = tempfile.mkstemp(dir=self.cdir, prefix=".active-")
        try:
            with os.fdopen(fd, "w") as f:
                for rec in new_active:
                    f.write(json.dumps(rec) + "\n")
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.active_path)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

        # 4. swap live state
        disconnected_txs = []  # non-coinbase txs from orphaned blocks
        h = old_tip
        while h != fork:
            rec = self.index[h]
            disconnected_txs.extend(rec["txs"][1:])
            h = rec["prev"]
        connected_ids = set()
        for bh in branch:
            for tx in self.index[bh]["txs"][1:]:
                connected_ids.add(txid_internal(tx).hex())

        self.utxo = utxo_copy
        # rebuild undo map: keep fork..genesis entries, add the new branch
        new_undo = {hh: u for hh, u in self.undo.items()
                    if self.index[hh]["height"] <= fork_h}
        new_undo.update(undo_new)
        self.undo = new_undo
        self.best = new_tip

        ev = {"type": "reorg", "at": time.time(), "fork_height": fork_h,
              "depth": old_h - fork_h, "new_depth": new_h - fork_h,
              "old_tip": old_tip.hex(), "new_tip": new_tip.hex(),
              "disconnected_txs": [txid_internal(t).hex()
                                   for t in disconnected_txs],
              "connected_txids": sorted(connected_ids)}
        self.reorgs.append(ev)
        self._save_state()
        # return raw txs too for mempool resurrection (not persisted)
        ev["disconnected_raw"] = disconnected_txs
        return ev

    # ------------------------------------------------------------ queries
    def tip(self):
        r = self.index[self.best]
        return {"height": r["height"], "hash": self.best.hex(),
                "work_cum": r["work_cum"]}

    def tips_info(self):
        return [{"hash": h.hex(), "height": ht,
                 "work_cum": self.index[h]["work_cum"]}
                for h, ht in self.tips.items()]

    def chain_hashes(self):
        """Public: hashes of the canonical (active) chain, tip-first."""
        return self._active_chain_hashes()

    def locator(self):
        """Block locator for getheaders: tip, then exponential step-back."""
        out, h, step, n = [], self.best, 1, 0
        while True:
            out.append(h)
            if h == self.genesis_hash:
                break
            for _ in range(step):
                h = self.index[h]["prev"]
                if h == self.genesis_hash:
                    break
            n += 1
            if n > 10:
                step *= 2
        if out[-1] != self.genesis_hash:
            out.append(self.genesis_hash)
        return out

    def headers_since(self, locator: list, stop: bytes, limit: int = 2000):
        """Headers after the newest locator entry we know, up to stop.

        locator/stop are display-order hashes (wire convention); the
        index is display-keyed too, so they compare directly. Returned
        header dicts carry display-order prev/merkle (enc_headers'
        contract).

        Walks forward along the heaviest chain containing the start
        block (not just the active chain), so forked peers can sync."""
        start = None
        for lh in locator:
            if lh in self.index:
                start = lh
                break
        if start is None:
            start = self.genesis_hash
        if stop == bytes(32):
            stop = None
        # children map
        children = {}
        for h, r in self.index.items():
            children.setdefault(r["prev"], []).append(h)
        for ch in children.values():
            ch.sort(key=lambda h: self.index[h]["work_cum"], reverse=True)
        out = []
        cur = start
        while len(out) < limit:
            ch = children.get(cur)
            if not ch:
                break
            cur = ch[0]  # heaviest child
            r = self.index[cur]
            out.append({k: r[k] for k in ("version", "prev", "merkle",
                                          "time", "bits", "nonce")})
            if stop is not None and cur == stop:
                break
        return out
