"""chainstate.py — branched chain state for the Genesis Fork node.

Append-only JSONL block store (crash-safe, resumable). Every accepted block
— main-chain or side branch — is validated under fork consensus before it
lands. Tracks all tips by cumulative work; reorganizes when a side branch
overtakes the active chain.

Block hashes are internal byte order throughout.
"""
import json
import os
import time

from genesis_fork import (GENESIS, genesis_for, genesis_txs,
                          genesis_hash_for,
                          verify_genesis, use_network, NETWORKS,
                          ser_header, sha256d, txid, merkle_root,
                          bits_to_target, required_bits, subsidy,
                          check_coinbase_lineage, validate_block,
                          validate_auxpow, _parse_pushes)
from txscript import (validate_block_txs, apply_block_txs, build_utxo,
                      utxo_stats, txid_internal, parse_tx)
from spent_leaf_registry import (SpentLeafRegistry, extract_pairs,
                                 pair_key)
from utxodb import UtxoSet, SnapshotDB, build_snapshot_db


def _scan_spent_pairs(records):
    """pair_key -> first-spend reference, from a chain path (genesis-first
    records with txs). The chain is the authority: a pair in a confirmed
    block is spent, regardless of any wallet copy's counter."""
    out = {}
    for rec in records:
        for raw in rec.get("txs", [])[1:]:
            tid = txid_internal(raw).hex()
            for root, idx in extract_pairs(raw):
                key = pair_key(root, idx)
                if key not in out:
                    out[key] = {"txid": tid, "height": rec["height"]}
    return out


def _fork_snapshot_paths(data_dir):
    here = os.path.dirname(os.path.abspath(__file__))
    snap_dir = os.path.join(here, "fork_balances")
    return {
        "dat": os.path.join(snap_dir, "snapshot_968698.dat"),
        "meta": os.path.join(snap_dir, "snapshot_968698.json"),
        "meta_legacy": os.path.join(snap_dir, "snapshot.json"),
        "activation": os.path.join(snap_dir, "activation.json"),
        "db": os.path.join(data_dir, "utxo.db"),
    }


def activation_commitment(height, data_dir):
    """Snapshot hash bytes to commit in the coinbase at `height`, or None.

    Reads fork_balances/activation.json (written by the snapshot pipeline).
    Returns None unless height == activation_height, so normal blocks are
    unaffected. Used by the miner when building the activation block.
    """
    p = _fork_snapshot_paths(data_dir)
    try:
        with open(p["activation"]) as f:
            act = json.load(f)
    except (OSError, ValueError):
        return None
    try:
        if int(act.get("activation_height", -1)) != height:
            return None
        return bytes.fromhex(act["snapshot_hash"])
    except (ValueError, TypeError):
        return None


def _block_work(bits):
    return (1 << 256) // (bits_to_target(bits) + 1)


def _header_hash(rec):
    return sha256d(ser_header(rec["version"], rec["prev"], rec["merkle"],
                              rec["time"], rec["bits"], rec["nonce"]))


def _enc_auxpow(ap):
    return {"parent_header": ap["parent_header"].hex(),
            "parent_coinbase": ap["parent_coinbase"].hex(),
            "coinbase_branch": [s.hex() for s in ap["coinbase_branch"]],
            "coinbase_index": ap["coinbase_index"]}


def _dec_auxpow(d):
    return {"parent_header": bytes.fromhex(d["parent_header"]),
            "parent_coinbase": bytes.fromhex(d["parent_coinbase"]),
            "coinbase_branch": [bytes.fromhex(s)
                                 for s in d["coinbase_branch"]],
            "coinbase_index": d["coinbase_index"]}


def _enc_rec(rec):
    out = {"height": rec["height"], "version": rec["version"],
           "prev": rec["prev"].hex(), "merkle": rec["merkle"].hex(),
           "time": rec["time"], "bits": rec["bits"], "nonce": rec["nonce"],
           "hash": rec["hash"].hex(),
           "txs": [t.hex() for t in rec["txs"]]}
    if rec.get("auxpow"):
        out["auxpow"] = _enc_auxpow(rec["auxpow"])
    return out


def _dec_rec(d):
    rec = {"height": d["height"], "version": d["version"],
           "prev": bytes.fromhex(d["prev"]),
           "merkle": bytes.fromhex(d["merkle"]),
           "time": d["time"], "bits": d["bits"], "nonce": d["nonce"],
           "hash": bytes.fromhex(d["hash"]),
           "txs": [bytes.fromhex(t) for t in d["txs"]]}
    if d.get("auxpow"):
        rec["auxpow"] = _dec_auxpow(d["auxpow"])
    return rec


class ChainState:
    def __init__(self, data_dir, net="testnet"):
        self.data_dir = data_dir
        self.net = net
        self.params = NETWORKS[net]
        self.chain_path = os.path.join(data_dir, "chain.jsonl")
        self.index = {}      # hash bytes -> record
        self.children = {}   # hash bytes -> [child hash bytes]
        self.tips = []       # [{"height","hash","work"}] by work desc
        self.utxo = None     # UtxoSet; built in load()
        self._snapshot = None  # SnapshotDB (fork net only)
        self._snapshot_hash = None      # bytes: sha256d of snapshot_968698.dat
        self._activation_height = None  # fork height where snapshot activates
        # COMPAT SHIM (2026-09-26, Bodhi): another builder is mid-flight on
        # fork_balances/ (snapshot not built yet) and made the snapshot a
        # hard startup requirement, which crash-loops the node. Until the
        # snapshot exists the node runs on fork blocks alone — the behavior
        # every block so far was validated under. When the snapshot lands,
        # a restart picks it up via the normal path below.
        self._snapshot_unavailable = False
        self._tip_hash = None
        self._active_work = 0
        # Spent-leaf set for the ACTIVE chain, mutated in place so a
        # mempool holding a reference to it always sees the current set.
        self.spent_pqh_pairs = set()
        self.spent_registry = None

    # ---------------------------------------------------------------- load
    def load(self):
        use_network(self.net)
        os.makedirs(self.data_dir, exist_ok=True)
        if os.path.exists(self.chain_path):
            records = self._load_records_tolerant()
        else:
            records = self._migrate_legacy()
        if not records:
            records = [self._genesis_record()]
            with open(self.chain_path, "w") as f:
                f.write(json.dumps(_enc_rec(records[0])) + "\n")
        for rec in records:
            self._index_record(rec)
        self._select_best_tip()
        self._replay_active()
        return self

    def _load_records_tolerant(self):
        """Read chain.jsonl, stopping at the first undecodable line.

        A truncated/corrupt tail (e.g. from a crash mid-append) is dropped
        and the file is truncated back to the last good record, instead of
        crashing the load. Only parsing is affected — every successfully
        decoded record loads exactly as before, so validation outcomes are
        unchanged.
        """
        records = []
        good_upto = 0
        dropped = 0
        with open(self.chain_path, "rb") as f:
            while True:
                line = f.readline()
                if not line:
                    break
                if not line.strip():
                    good_upto = f.tell()
                    continue
                try:
                    rec = _dec_rec(json.loads(line.decode("utf-8")))
                except (json.JSONDecodeError, UnicodeDecodeError,
                        ValueError, KeyError, TypeError):
                    dropped += 1
                    break  # stop at first bad line: drop the tail
                records.append(rec)
                good_upto = f.tell()
        if dropped:
            # Truncate the corrupt tail so later appends land cleanly and
            # the next load sees the same prefix.
            with open(self.chain_path, "r+b") as f:
                f.truncate(good_upto)
        return records

    def _genesis_record(self):
        g = genesis_for(self.net)
        h = verify_genesis(self.net)
        return {"height": 0, "version": g["version"], "prev": g["prev"],
                "merkle": g["merkle"], "time": g["time"], "bits": g["bits"],
                "nonce": g["nonce"], "hash": h, "txs": genesis_txs(self.net)}

    def _migrate_legacy(self):
        """Best-effort import of the old linear testnet_live.jsonl."""
        if self.net != "testnet":
            return []
        here = os.path.dirname(os.path.abspath(__file__))
        legacy = os.path.join(here, "testnet_live.jsonl")
        if not os.path.exists(legacy):
            return []
        records = []
        with open(legacy) as f:
            for i, line in enumerate(f):
                d = json.loads(line)
                rec = {"height": i, "version": d["version"],
                       "prev": bytes.fromhex(d["prev"]),
                       "merkle": bytes.fromhex(d["merkle"]),
                       "time": d["time"], "bits": d["bits"],
                       "nonce": d["nonce"],
                       "hash": bytes.fromhex(d["hash"]),
                       "txs": [bytes.fromhex(t) for t in d["txs"]]}
                records.append(rec)
        with open(self.chain_path, "w") as f:
            for rec in records:
                f.write(json.dumps(_enc_rec(rec)) + "\n")
        return records

    # -------------------------------------------------------------- index
    def _index_record(self, rec):
        h = rec["hash"]
        self.index[h] = rec
        self.children.setdefault(h, [])
        self.children.setdefault(rec["prev"], []).append(h)
        rec["work"] = self.index.get(rec["prev"], {}).get("work", 0) \
            + _block_work(rec["bits"])

    def _path_to(self, tip_hash):
        """Records from genesis to tip_hash (inclusive), genesis-first."""
        path = []
        h = tip_hash
        while True:
            rec = self.index[h]
            path.append(rec)
            if rec["height"] == 0:
                break
            h = rec["prev"]
        path.reverse()
        return path

    def _select_best_tip(self):
        best, best_work = None, -1
        for h, rec in self.index.items():
            if not self.children.get(h) and rec["work"] > best_work:
                best, best_work = h, rec["work"]
        self._tip_hash = best
        self._active_work = best_work
        tips = [{"height": rec["height"], "hash": h.hex(),
                 "work": rec["work"]}
                for h, rec in self.index.items() if not self.children.get(h)]
        tips.sort(key=lambda t: -t["work"])
        self.tips = tips

    def _open_snapshot(self):
        """Open (building if needed) the fork's Bitcoin UTXO snapshot.

        Returns None when no snapshot has been built yet (see the compat
        shim in __init__): the node then runs on fork blocks alone.

        Also loads the activation config (activation.json): the snapshot
        only becomes the UTXO base at activation_height, and the activation
        block's coinbase must push the snapshot hash.
        """
        p = _fork_snapshot_paths(self.data_dir)
        meta_path = p["meta"] if os.path.exists(p["meta"]) else p["meta_legacy"]
        if not os.path.exists(meta_path):
            print("snapshot: fork_balances/snapshot_968698.json not built "
                  "yet — running on fork blocks only", flush=True)
            return None
        with open(meta_path) as f:
            meta = json.load(f)
        if not os.path.exists(p["db"]):
            build_snapshot_db(p["dat"], p["db"], meta["sha256d"],
                              meta["height"], log=print)
        db = SnapshotDB(p["db"])
        if db.get_meta("snapshot_hash") != meta["sha256d"]:
            db.close()
            raise RuntimeError("snapshot DB hash mismatch: delete utxo.db "
                               "and rebuild")
        # Activation gating: snapshot activates at a future fork height,
        # committed in that block's coinbase. Before that height the node
        # runs on fork blocks alone (preserving existing history).
        self._snapshot_hash = bytes.fromhex(meta["sha256d"])
        self._activation_height = None
        if os.path.exists(p["activation"]):
            with open(p["activation"]) as f:
                act = json.load(f)
            if act.get("snapshot_hash") != meta["sha256d"]:
                db.close()
                raise RuntimeError(
                    "activation.json snapshot_hash does not match "
                    "snapshot_968698.json")
            self._activation_height = int(act["activation_height"])
            print(f"snapshot: activation at fork height "
                  f"{self._activation_height}, hash "
                  f"{meta['sha256d'][:16]}..", flush=True)
        else:
            print("snapshot: built but activation.json missing — "
                  "running on fork blocks only", flush=True)
        return db

    def _snapshot_active_at(self, height):
        """True if the snapshot is the UTXO base at fork `height`."""
        return (self._snapshot is not None
                and self._activation_height is not None
                and height >= self._activation_height)

    def _replay_active(self):
        # Fork net: before the snapshot activation height the state is
        # fork blocks alone (history is preserved); at/after activation
        # the Bitcoin snapshot becomes the base beneath the fork overlay.
        base = None
        if self.net == "fork":
            if self._snapshot is None and not self._snapshot_unavailable:
                self._snapshot = self._open_snapshot()
                if self._snapshot is None:
                    self._snapshot_unavailable = True
            tip_height = self.index[self._tip_hash]["height"]
            if self._snapshot_active_at(tip_height):
                base = UtxoSet(snapshot=self._snapshot)
        path = self._path_to(self._tip_hash)
        self.utxo = build_utxo([{"txs": rec["txs"]} for rec in path],
                               base=base)
        # Spent-leaf registry: rebuilt from the confirmed chain, then
        # persisted in the chain data directory (never in a wallet file,
        # so a wallet restore cannot resurrect a spent leaf).
        refs = _scan_spent_pairs(path)
        if self.spent_registry is None:
            self.spent_registry = SpentLeafRegistry(
                os.path.join(self.data_dir, "spent_pqh_registry.json"))
        self.spent_registry.replace_with(refs)
        self.spent_pqh_pairs.clear()
        for key in refs:
            root_hex, idx = key.rsplit(":", 1)
            self.spent_pqh_pairs.add((bytes.fromhex(root_hex), int(idx)))

    # -------------------------------------------------------------- views
    def tip(self):
        rec = self.index[self._tip_hash]
        return {"height": rec["height"], "hash": self._tip_hash.hex()}

    def _bits_context(self, prev_hash, height):
        """Ancestor {height: {"time","bits"}} for required_bits."""
        ctx = {}
        h = prev_hash
        for _ in range(self.params["retarget_interval"]):
            rec = self.index.get(h)
            if rec is None:
                break
            ctx[rec["height"]] = {"time": rec["time"], "bits": rec["bits"]}
            if rec["height"] == 0:
                break
            h = rec["prev"]
        return ctx

    def _fork_utxo(self, prev_hash):
        """UTXO set as of the block prev_hash. Tip case is a cheap copy
        (the snapshot is shared); side branches replay fork blocks over a
        fresh overlay (fork history is short).

        The snapshot is the base only when the child height reaches the
        activation height; earlier blocks validate against fork history
        alone, exactly as they did before the snapshot existed.
        """
        if prev_hash == self._tip_hash:
            return self.utxo.copy()
        base = None
        if self.net == "fork":
            if self._snapshot is None and not self._snapshot_unavailable:
                self._snapshot = self._open_snapshot()
                if self._snapshot is None:
                    self._snapshot_unavailable = True
            prev_height = self.index[prev_hash]["height"]
            if self._snapshot_active_at(prev_height + 1):
                base = UtxoSet(snapshot=self._snapshot)
        path = self._path_to(prev_hash)
        return build_utxo([{"txs": rec["txs"]} for rec in path], base=base)

    def _check_activation_commitment(self, txs, height):
        """At the snapshot activation height the coinbase scriptSig must
        push the snapshot hash (32 bytes). Returns None if OK (or not the
        activation height), else an error string."""
        if height != self._activation_height:
            return None
        if self._snapshot_hash is None:
            return "activation height reached but snapshot not loaded"
        try:
            cb = txs[0]
            # scriptSig starts after: version(4) + vin_count(1) +
            # prev_txid(32) + prev_vout(4)
            off = 4 + 1 + 32 + 4
            slen = cb[off]
            off += 1
            script = cb[off:off + slen]
            pushes = _parse_pushes(script)
        except Exception:
            return "activation block: cannot parse coinbase scriptSig"
        if self._snapshot_hash not in pushes:
            return "activation block: coinbase missing snapshot hash commitment"
        return None

    # -------------------------------------------------------------- submit
    def submit_block(self, blk):
        """Validate and store a block. Returns {"accepted": bool,
        "event": {...}|None, "reason": str}."""
        use_network(self.net)
        try:
            prev_hash = bytes(blk["prev"])
            txs = [bytes(t) for t in blk["txs"]]
        except Exception:
            return {"accepted": False, "event": None,
                    "reason": "malformed block fields"}
        auxpow = None
        if blk.get("auxpow") is not None:
            try:
                ap = blk["auxpow"]
                auxpow = {"parent_header": bytes(ap["parent_header"]),
                          "parent_coinbase": bytes(ap["parent_coinbase"]),
                          "coinbase_branch": [bytes(s) for s in
                                              ap["coinbase_branch"]],
                          "coinbase_index": int(ap["coinbase_index"])}
            except Exception:
                return {"accepted": False, "event": None,
                        "reason": "malformed auxpow attachment"}
        prev = self.index.get(prev_hash)
        if prev is None:
            return {"accepted": False, "event": None,
                    "reason": "orphan: unknown prev"}
        height = prev["height"] + 1
        norm = {"version": blk["version"], "prev": prev_hash,
                "merkle": bytes(blk["merkle"]), "time": blk["time"],
                "bits": blk["bits"], "nonce": blk["nonce"], "txs": txs}
        if auxpow is not None:
            norm["auxpow"] = auxpow
        hh = _header_hash(norm)
        if hh in self.index:
            # Already known (e.g. block arrived via both inv->getblock and
            # a broadcast push). Reject cleanly instead of re-appending a
            # duplicate record to the chain file.
            return {"accepted": False, "event": None,
                    "reason": "duplicate block"}
        fork_utxo = self._fork_utxo(prev_hash)
        path = self._path_to(prev_hash)
        bad = self._check_activation_commitment(txs, height)
        if bad:
            return {"accepted": False, "event": None, "reason": bad}
        # Spent-leaf candidate set: the parent path's spent pairs, as a
        # copy — validation may add this block's pairs to it, but a
        # rejected block must not pollute the active set.
        if prev_hash == self._tip_hash:
            candidate_spent = set(self.spent_pqh_pairs)
        else:
            candidate_spent = set()
            for key in _scan_spent_pairs(path):
                root_hex, idx = key.rsplit(":", 1)
                candidate_spent.add((bytes.fromhex(root_hex), int(idx)))
        if auxpow is not None:
            bad = validate_auxpow(norm, prev, height, path, utxo=fork_utxo,
                                  spent_pairs=candidate_spent)
        else:
            bad = validate_block(norm, prev, height, path, utxo=fork_utxo,
                                 spent_pairs=candidate_spent)
        if bad:
            return {"accepted": False, "event": None, "reason": bad}
        rec = dict(norm, height=height, hash=hh, txs=txs)
        # append first: crash-safe, the record is fully validated
        with open(self.chain_path, "a") as f:
            f.write(json.dumps(_enc_rec(rec)) + "\n")
        self._index_record(rec)
        new_work = rec["work"]
        if new_work > self._active_work:
            # new best chain: reorg (or plain extension)
            old_path = self._path_to(self._tip_hash)
            new_path = self._path_to(hh)
            fork = 0
            while (fork < len(old_path) and fork < len(new_path)
                   and old_path[fork]["hash"] == new_path[fork]["hash"]):
                fork += 1
            removed = old_path[fork:]
            added = new_path[fork:]
            # Deep-reorg guard (small-chain 51% protection): refuse to unwind
            # more than max_reorg_depth blocks for a heavier branch — unless
            # our own tip is stale, in which case we are catching up after
            # downtime, not under attack.
            max_depth = self.params.get("max_reorg_depth", 0)
            if max_depth and len(removed) > max_depth:
                spacing = self.params.get("daa_spacing",
                                          self.params["target_spacing"])
                tip_time = old_path[-1]["time"] if old_path else 0
                stale = tip_time < time.time() - 2 * max_depth * spacing
                if not stale:
                    return {"accepted": False, "event": None,
                            "reason": "reorg too deep"}
            # fork_utxo is already a private UtxoSet (tip copy or fresh
            # side-branch replay): apply the block onto it directly.
            apply_block_txs(txs, fork_utxo, height)
            self.utxo = fork_utxo
            self._tip_hash = hh
            self._active_work = new_work
            # Commit the spent-leaf set in place (mempool holds a
            # reference to this set) and persist it with real txid/height
            # references from the new active path.
            self.spent_pqh_pairs.clear()
            self.spent_pqh_pairs.update(candidate_spent)
            new_path = self._path_to(hh)
            if self.spent_registry is not None:
                self.spent_registry.replace_with(
                    _scan_spent_pairs(new_path))
            self._select_best_tip()
            event = {"height": height, "hash": hh.hex(),
                     "added": added, "removed": removed}
            return {"accepted": True, "event": event, "reason": "ok"}
        self._select_best_tip()
        return {"accepted": True, "event": None, "reason": "side branch"}
