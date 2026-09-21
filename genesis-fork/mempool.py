#!/usr/bin/env python3
"""Mempool for the EXCAL testnet: validated pending transactions.

Policy (not consensus): max 1000 txs, max 100 kB per tx, no RBF
(first-seen wins on conflicts). Every add is fully validated against the
UTXO set plus already-accepted mempool txs (chained view). Persisted to
mempool.json with atomic writes; revalidated on load.
"""
import json
import os
import tempfile

from txscript import validate_tx, txid_internal, txid_display

MAX_TXS = 1000
MAX_TX_BYTES = 100_000


class Mempool:
    def __init__(self, path: str):
        self.path = path
        self.txs = {}  # txid_internal_hex -> {"raw": bytes, "fee": int}

    def __len__(self):
        return len(self.txs)

    # -- persistence -----------------------------------------------------
    def _save(self):
        d = os.path.dirname(os.path.abspath(self.path))
        fd, tmp = tempfile.mkstemp(dir=d, prefix="mempool-")
        try:
            with os.fdopen(fd, "w") as f:
                json.dump({"txs": [r["raw"].hex() for r in self.txs.values()]},
                          f)
            os.replace(tmp, self.path)
        except BaseException:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

    def load(self, utxo: dict, height: int) -> int:
        """Reload from disk, revalidating each tx. Returns txs kept."""
        if not os.path.exists(self.path):
            return 0
        try:
            data = json.load(open(self.path))
        except Exception:
            return 0
        kept = 0
        for hexraw in data.get("txs", []):
            try:
                raw = bytes.fromhex(hexraw)
            except ValueError:
                continue
            ok, _, _, _ = self.add(raw, utxo, height, save=False)
            if ok:
                kept += 1
        if kept:
            self._save()
        return kept

    # -- admission -------------------------------------------------------
    def _view(self, utxo: dict) -> dict:
        """Scratch view: utxo + all mempool txs applied, oldest first."""
        view = {k: list(v) for k, v in utxo.items()}
        for r in self.txs.values():
            # validated on add; re-apply without re-checking scripts
            from txscript import parse_tx, _spend_from_view, _add_tx_outputs
            t = parse_tx(r["raw"])
            for vin in t["vin"]:
                _spend_from_view(view, (vin["prev"], vin["idx"]))
            _add_tx_outputs(r["raw"], view, 0, is_coinbase=False)
        return view

    def add(self, raw: bytes, utxo: dict, height: int, save: bool = True):
        """Validate and admit a tx. Returns (ok, reason_or_txid)."""
        if len(raw) > MAX_TX_BYTES:
            return False, "tx too large"
        if len(self.txs) >= MAX_TXS:
            return False, "mempool full"
        tid = txid_internal(raw)
        if tid.hex() in self.txs:
            return False, "already in mempool"
        view = self._view(utxo)
        ok, reason, fee, _pq = validate_tx(raw, utxo, height, view=view)
        if not ok:
            return False, reason
        self.txs[tid.hex()] = {"raw": raw, "fee": fee}
        if save:
            self._save()
        return True, txid_display(raw)

    # -- block template --------------------------------------------------
    def select_template(self, utxo: dict, height: int,
                        max_bytes: int = 900_000) -> list:
        """Fee-ordered valid tx set for the next block. Returns list of
        (raw, fee). Drops txs that fail revalidation (defensive; should not
        happen with a single block producer)."""
        ordered = sorted(self.txs.items(),
                         key=lambda kv: kv[1]["fee"], reverse=True)
        view = {k: list(v) for k, v in utxo.items()}
        selected, dropped, total = [], [], 0
        for tid_hex, r in ordered:
            raw = r["raw"]
            if total + len(raw) > max_bytes:
                continue
            ok, _, fee, _pq = validate_tx(raw, utxo, height, view=view)
            if ok:
                selected.append((raw, fee))
                total += len(raw)
            else:
                dropped.append(tid_hex)
        for tid_hex in dropped:
            del self.txs[tid_hex]
        if dropped:
            self._save()
        return selected

    def remove_confirmed(self, raws: list):
        gone = False
        for raw in raws:
            tid = txid_internal(raw).hex()
            if tid in self.txs:
                del self.txs[tid]
                gone = True
        if gone:
            self._save()

    def summary(self):
        return [{"txid": txid_display(r["raw"]), "fee": r["fee"],
                 "size": len(r["raw"])} for r in self.txs.values()]
