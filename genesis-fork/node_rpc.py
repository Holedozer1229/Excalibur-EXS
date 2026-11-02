"""node_rpc.py — localhost JSON-RPC for the Genesis Fork node.

POST / with {"method":..., "params":[...], "id":...}.
Read methods plus sendrawtransaction and a minimal wallet.
"""
import json
import math
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import secp256k1 as secp
from genesis_fork import sha256d, ser_header
from txscript import (parse_tx, ser_tx, txid_internal, p2pk_script,
                      COINBASE_MATURITY, lock_pkh_for_pubkey, lock_pkh,
                      lock_type, sign_pkh_input, sign_input, validate_tx)
import caduceus
import wallet_crypto

# Wallet-spend policy (sendtoaddress): conservative, single-key wallet.
DUST_SWORDS = 1000          # outputs below this are dust (rejected / folded
                            # into the fee); ~30x the vbyte cost of a PKH out
DEFAULT_FEE_RATE_SVB = 1    # swords per vbyte when the caller gives no rate
_VIN_PKH_VBYTES = 139       # 32 prev + 4 idx + 1 varint + 98 scriptSig + 4 seq
_VOUT_VBYTES = 30           # 8 value + 1 varint + 21-byte PKH lock
_TX_OVERHEAD_VBYTES = 10    # 4 version + 1 + 1 varints + 4 locktime


def _est_fee(n_in, n_out, rate):
    """Conservative vsize estimate (no witness data on this chain)."""
    return (_TX_OVERHEAD_VBYTES + _VIN_PKH_VBYTES * n_in
            + _VOUT_VBYTES * n_out) * rate


def _pct(sorted_vals, q):
    """q-th percentile (0-100) of an ascending list, linear interpolation."""
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * q / 100.0
    lo, hi = math.floor(k), math.ceil(k)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def _parse_pkh_address(addr):
    """Excalibur's address is the hex of the PKH lock itself (42 chars:
    '00' + hash160 hex), as returned by getpkhaddress. Also accepts a bare
    40-hex hash160 for convenience. Returns the 21-byte lock."""
    s = str(addr).strip().lower()
    if s.startswith("0x"):
        s = s[2:]
    try:
        if len(s) == 42 and s.startswith("00"):
            lock = bytes.fromhex(s)
        elif len(s) == 40:
            lock = lock_pkh(bytes.fromhex(s))
        else:
            raise ValueError()
    except ValueError:
        raise ValueError("bad address: want PKH lock hex (42 chars) or "
                         "hash160 hex (40 chars)")
    if lock_type(lock) != "pkh":
        raise ValueError("bad address: not a PKH lock")
    return lock


def _find_by_spk(utxo, spk):
    """All UTXO entries paying to lock script spk: [(key, entry)] where
    key=(txid_bytes, vout) and entry=(value, spk, is_cb, cb_h).
    Uses the UTXO set's indexed lookup when it has one (the SQLite
    snapshot store); otherwise falls back to a full scan of the in-memory
    dict. Read-only; never mutates the set."""
    spk = bytes(spk)
    find = getattr(utxo, "find_by_spk", None)
    if callable(find):
        return list(find(spk))
    out = []
    for k, entries in utxo.items():
        for e in entries:
            if bytes(e[1]) == spk:
                out.append((k, e))
    return out


def _read_keyfile(path):
    """Read the wallet passphrase from a keyfile. Never logged."""
    with open(path, "rb") as f:
        pw = f.read().strip()
    if not pw:
        raise ValueError(f"keyfile is empty: {path}")
    return pw


def load_wallet_key(wallet_path, keyfile=None):
    """Load (or create) the node's wallet keypair. Returns
    (priv_bytes, pub_compressed_bytes). The same key funds the miner: blocks
    the node finds pay this key's PKH lock directly.

    keyfile (or the EXCALIBUR_WALLET_KEYFILE env var) supplies the
    passphrase when the wallet file is encrypted (see wallet_crypto.py).
    Plaintext wallets keep loading exactly as before.
    """
    if keyfile is None:
        keyfile = os.environ.get("EXCALIBUR_WALLET_KEYFILE")
    if os.path.exists(wallet_path):
        with open(wallet_path) as f:
            data = json.load(f)
        if wallet_crypto.is_encrypted_wallet(data):
            if not keyfile:
                raise ValueError(
                    "wallet is encrypted; set EXCALIBUR_WALLET_KEYFILE "
                    "or pass --wallet-keyfile")
            data = json.loads(
                wallet_crypto.decrypt_bytes(
                    data, _read_keyfile(keyfile)).decode())
        return bytes.fromhex(data["priv"]), bytes.fromhex(data["pub"])
    priv = int.from_bytes(os.urandom(32), "big") % (secp.N - 1) + 1
    pub = secp.compress(secp.priv_to_pub(priv))
    tmp = wallet_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"priv": f"{priv:064x}", "pub": pub.hex()}, f)
    os.chmod(tmp, 0o600)
    os.replace(tmp, wallet_path)
    return priv.to_bytes(32, "big"), pub


class Node:
    def __init__(self, cs, mempool, lock, wallet_path, peermgr=None,
                 wallet_keyfile=None):
        self.cs = cs
        self.mempool = mempool
        self.lock = lock
        self.wallet_path = wallet_path
        self.wallet_keyfile = wallet_keyfile
        self.peermgr = peermgr
        self._srv = None
        # Node-local fee market history (NOT consensus): per accepted block
        # the minimum fee rate among its txs, persisted next to the wallet.
        base, ext = os.path.splitext(wallet_path)
        self._fee_history_path = base + ".fees.json"
        self._fee_history = []
        try:
            with open(self._fee_history_path) as f:
                hist = json.load(f)
            if isinstance(hist, list):
                self._fee_history = [e for e in hist[-200:]
                                     if isinstance(e, dict)]
        except (OSError, ValueError):
            pass

    # ------------------------------------------------------------ wallet
    def _wallet_key(self):
        return load_wallet_key(self.wallet_path, keyfile=self.wallet_keyfile)

    # ------------------------------------------------------ fee history
    def record_block_fees(self, height, tx_fees):
        """Record one accepted block's fee market observation: the minimum
        fee rate (swords/vbyte) among its non-coinbase txs — the marginal
        rate that was just enough to confirm. Node-local statistics only;
        never touches consensus. Safe to call from any thread; failures are
        swallowed so fee stats can never break block processing."""
        try:
            rates = [fee / vsize for vsize, fee in tx_fees if vsize > 0]
            self._fee_history.append(
                {"h": int(height),
                 "min": min(rates) if rates else 0.0,
                 "n": len(rates)})
            del self._fee_history[:-200]
            tmp = self._fee_history_path + ".tmp"
            with open(tmp, "w") as f:
                json.dump(self._fee_history, f)
            os.replace(tmp, self._fee_history_path)
        except Exception:
            pass

    # ------------------------------------------------------------ server
    def serve_thread(self, port, host="127.0.0.1"):
        node = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_GET(self):
                # Liveness probe for Docker HEALTHCHECK / PaaS health checks.
                # Read-only tip status; the JSON-RPC API itself is POST-only.
                try:
                    tip = node.cs.tip()
                    body = json.dumps({"ok": True,
                                       "height": tip["height"],
                                       "hash": tip["hash"]}).encode()
                except Exception:
                    body = b'{"ok": false}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                try:
                    n = int(self.headers.get("Content-Length", 0))
                    req = json.loads(self.rfile.read(n) or b"{}")
                except Exception:
                    return self._reply({"error": "bad request",
                                        "id": None})
                method = req.get("method")
                params = req.get("params", [])
                rid = req.get("id")
                try:
                    result = node.dispatch(method, params)
                    self._reply({"result": result, "error": None,
                                 "id": rid})
                except Exception as e:
                    self._reply({"result": None, "error": str(e),
                                 "id": rid})

            def _reply(self, obj):
                raw = json.dumps(obj).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

        self._srv = HTTPServer((host, port), Handler)
        t = threading.Thread(target=self._srv.serve_forever, daemon=True)
        t.start()
        return t

    def shutdown(self):
        if self._srv:
            self._srv.shutdown()

    # ------------------------------------------------------------ methods
    def dispatch(self, method, params):
        fn = {"getblockcount": self.rpc_getblockcount,
              "getbestblockhash": self.rpc_getbestblockhash,
              "getchaintips": self.rpc_getchaintips,
              "getblock": self.rpc_getblock,
              "getrawmempool": self.rpc_getrawmempool,
              "getmempoolinfo": self.rpc_getmempoolinfo,
              "sendrawtransaction": self.rpc_sendrawtransaction,
              "submitblock": self.rpc_submitblock,
              "getnewaddress": self.rpc_getnewaddress,
              "getpkhaddress": self.rpc_getpkhaddress,
              "getbalance": self.rpc_getbalance,
              "getutxos": self.rpc_getutxos,
              "getpeerinfo": self.rpc_getpeerinfo,
              "sendtoaddress": self.rpc_sendtoaddress,
              "estimatesmartfee": self.rpc_estimatesmartfee,
              "buildtunnelcapsule": self.rpc_buildtunnelcapsule,
              "validatetunnelcapsule": self.rpc_validatetunnelcapsule,
              }.get(method)
        if fn is None:
            raise ValueError(f"unknown method: {method}")
        return fn(params)

    def rpc_getblockcount(self, _p):
        with self.lock:
            return self.cs.tip()["height"]

    def rpc_getbestblockhash(self, _p):
        with self.lock:
            return self.cs.tip()["hash"]

    def rpc_getchaintips(self, _p):
        with self.lock:
            return [{"height": t["height"], "hash": t["hash"],
                     "work": hex(t["work"])} for t in self.cs.tips]

    def rpc_getblock(self, p):
        h = bytes.fromhex(p[0])
        with self.lock:
            rec = self.cs.index.get(h)
            if rec is None:
                raise ValueError("block not found")
            tip = self.cs.tip()["height"]
            return {"hash": rec["hash"].hex(), "height": rec["height"],
                    "confirmations": tip - rec["height"] + 1,
                    "version": rec["version"], "prev": rec["prev"].hex(),
                    "merkle": rec["merkle"].hex(), "time": rec["time"],
                    "bits": hex(rec["bits"]), "nonce": rec["nonce"],
                    "tx": [txid_internal(t).hex() for t in rec["txs"]]}

    def rpc_getrawmempool(self, _p):
        with self.lock:
            return list(self.mempool.txs.keys())

    def rpc_getmempoolinfo(self, _p):
        with self.lock:
            size = sum(len(v) for v in self.mempool.txs.values())
            return {"size": len(self.mempool), "bytes": size}

    def rpc_sendrawtransaction(self, p):
        raw = bytes.fromhex(p[0])
        with self.lock:
            ok, reason = self.mempool.add(raw, self.cs.utxo,
                                          self.cs.tip()["height"] + 1)
        if not ok:
            raise ValueError(f"rejected: {reason}")
        if self.peermgr:
            self.peermgr.broadcast_tx(raw)
        return txid_internal(raw).hex()

    def rpc_submitblock(self, p):
        """Submit a full block for validation and storage.

        params: [block] where block is the chain-record JSON form
        {version, prev (hex), merkle (hex), time, bits, nonce,
         txs: [hex, ...]} plus, for a merged-mined block, an "auxpow"
        attachment {parent_header (hex), parent_coinbase (hex),
        coinbase_branch: [hex, ...], coinbase_index}. AuxPoW blocks are
        validated under the fork's auxpow consensus path (the parent
        block's work replaces the child's own PoW); blocks without an
        attachment go through the ordinary path. Returns
        {"accepted": true, "height", "hash", "status"} on success —
        status is "active chain" when the block became the tip, "side
        branch" when it was stored on a fork — and raises on rejection
        with the consensus reason.
        """
        if not p or not isinstance(p[0], dict):
            raise ValueError("submitblock needs one block object param")
        d = p[0]
        try:
            blk = {"version": d["version"],
                   "prev": bytes.fromhex(d["prev"]),
                   "merkle": bytes.fromhex(d["merkle"]),
                   "time": d["time"], "bits": d["bits"],
                   "nonce": d["nonce"],
                   "txs": [bytes.fromhex(t) for t in d["txs"]]}
            if d.get("auxpow") is not None:
                a = d["auxpow"]
                blk["auxpow"] = {
                    "parent_header": bytes.fromhex(a["parent_header"]),
                    "parent_coinbase": bytes.fromhex(a["parent_coinbase"]),
                    "coinbase_branch": [bytes.fromhex(s) for s in
                                        a.get("coinbase_branch", [])],
                    "coinbase_index": int(a.get("coinbase_index", 0))}
        except (KeyError, TypeError, ValueError) as e:
            raise ValueError(f"malformed block: {e}")
        hh = sha256d(ser_header(blk["version"], blk["prev"],
                                blk["merkle"], blk["time"], blk["bits"],
                                blk["nonce"]))
        with self.lock:
            prev = self.cs.index.get(blk["prev"])
            height = prev["height"] + 1 if prev is not None else None
            sub = self.cs.submit_block(blk)
            if sub["accepted"] and sub.get("event") and self.peermgr:
                # Same side effects as a locally mined block: mempool
                # fix-up plus relay so peers converge on the new tip.
                self.peermgr._apply_reorg_side_effects(sub["event"])
                self.peermgr.broadcast_block(blk)
        if not sub["accepted"]:
            raise ValueError(f"rejected: {sub['reason']}")
        return {"accepted": True, "height": height, "hash": hh.hex(),
                "status": "active chain" if sub.get("event")
                          else "side branch"}

    def rpc_getnewaddress(self, _p):
        _priv, pub = self._wallet_key()
        return pub.hex()

    def rpc_getpkhaddress(self, _p):
        """Opcode-free Lockbox address: the wallet's PKH lock (hex). This is
        the quantum-protected address format for post-activation outputs."""
        _priv, pub = self._wallet_key()
        return lock_pkh_for_pubkey(pub).hex()

    def rpc_getbalance(self, _p):
        _priv, pub = self._wallet_key()
        # Legacy P2PK outputs plus post-Lockbox PKH outputs. Targeted
        # lookups: the full UTXO set is far too large to scan.
        want = [p2pk_script(pub), lock_pkh_for_pubkey(pub)]
        mature = immature = 0
        with self.lock:
            height = self.cs.tip()["height"]
            for spk in want:
                for _key, (value, _s, is_cb, cb_h) in \
                        _find_by_spk(self.cs.utxo, spk):
                    if is_cb and height + 1 - cb_h < COINBASE_MATURITY:
                        immature += value
                    else:
                        mature += value
        return {"balance": mature / 1e8, "immature": immature / 1e8}

    def rpc_getutxos(self, p):
        """List UTXOs paying to a lock script. params: [script_hex].
        Returns [{txid (wire-order hex, as vin prev expects), vout, value
        (swords), mature, coinbase}]. Powers wallet UIs: keys stay client
        side; the UI builds + signs spends and submits via
        sendrawtransaction."""
        spk = bytes.fromhex(p[0])
        out = []
        with self.lock:
            height = self.cs.tip()["height"]
            for (txid_b, vout), (value, _s, is_cb, cb_h) in \
                    _find_by_spk(self.cs.utxo, spk):
                mature = not (is_cb and height + 1 - cb_h < COINBASE_MATURITY)
                out.append({"txid": txid_b.hex(), "vout": vout,
                            "value": value, "mature": mature,
                            "coinbase": bool(is_cb)})
        return out

    def rpc_getpeerinfo(self, _p):
        if not self.peermgr:
            return []
        return [{"addr": f"{a[0]}:{a[1]}"} for _s, a in self.peermgr.peers]

    # ------------------------------------------------------------ wallet
    def rpc_sendtoaddress(self, p):
        """Send coins: params [address, amount_swords,
        fee_rate_swords_per_vbyte?].

        Selects mature confirmed wallet UTXOs (largest first), builds a tx
        paying <address> plus change back to the wallet's PKH lock, signs
        every input with the single wallet key, and submits through the same
        mempool validation path as sendrawtransaction. Returns the txid
        (internal-order hex).

        Errors: bad address, dust amount, insufficient mature funds, no
        wallet key. Dust change is folded into the fee instead of creating
        a dust output.
        """
        if len(p) < 2:
            raise ValueError(
                "sendtoaddress needs [address, amount_swords, fee_rate?]")
        dest_lock = _parse_pkh_address(p[0])
        try:
            amount = int(p[1])
        except (TypeError, ValueError):
            raise ValueError("amount_swords must be an integer")
        if amount <= 0:
            raise ValueError("amount must be positive")
        if amount < DUST_SWORDS:
            raise ValueError(
                f"dust: amount {amount} < {DUST_SWORDS} swords")
        rate = int(p[2]) if len(p) > 2 else DEFAULT_FEE_RATE_SVB
        if rate < 1:
            raise ValueError("fee rate must be >= 1 sword/vbyte")
        if not os.path.exists(self.wallet_path):
            raise ValueError("no wallet key")
        with self.lock:
            priv_b, pub = self._wallet_key()
            priv = int.from_bytes(priv_b, "big")
            height = self.cs.tip()["height"] + 1
            change_lock = lock_pkh_for_pubkey(pub)
            # Candidate wallet UTXOs: post-Lockbox PKH coinbases/payments
            # plus grandfathered legacy P2PK. Skip anything already spent
            # by a mempool tx (no RBF: first-seen wins) and immature
            # coinbases.
            cands = []
            for spk in (change_lock, p2pk_script(pub)):
                for key, (value, _s, is_cb, cb_h) in \
                        _find_by_spk(self.cs.utxo, spk):
                    if key in self.mempool.spent:
                        continue
                    if is_cb and height - cb_h < COINBASE_MATURITY:
                        continue
                    cands.append((key, value, bytes(_s)))
            if not cands:
                raise ValueError(
                    "insufficient funds (no mature wallet UTXOs)")
            cands.sort(key=lambda c: -c[1])  # largest first: fewer inputs
            selected, total, i = [], 0, 0
            while True:
                fee_guess = _est_fee(max(1, len(selected)), 2, rate)
                if selected and total >= amount + fee_guess:
                    break
                if i >= len(cands):
                    raise ValueError(
                        f"insufficient funds: need {amount + fee_guess}, "
                        f"have {total} swords mature")
                selected.append(cands[i])
                total += cands[i][1]
                i += 1

            def build(change_value, with_change):
                vout = [{"value": amount, "script": dest_lock}]
                if with_change:
                    vout.append({"value": change_value,
                                 "script": change_lock})
                t = {"version": 1,
                     "vin": [{"prev": key[0], "idx": key[1], "script": b"",
                              "seq": 0xFFFFFFFF}
                             for key, _v, _s in selected],
                     "vout": vout, "locktime": 0}
                for j, (_key, _v, spk) in enumerate(selected):
                    lt = lock_type(spk)
                    if lt == "pkh":
                        script = sign_pkh_input(t, j, spk, priv)
                    elif lt == "p2pk":
                        script = sign_input(t, j, spk, priv)
                    else:  # anyone/open: empty scriptSig
                        script = b""
                    t["vin"][j]["script"] = script
                return ser_tx(t)

            # Sign once with a placeholder change output to measure the
            # exact vsize, then finalize (output values are sighash-
            # committed, so inputs are re-signed after the change value
            # is set).
            raw = build(0, True)
            fee = len(raw) * rate
            change = total - amount - fee
            if change >= DUST_SWORDS:
                raw = build(change, True)
            else:
                # No change, or dust change: drop the change output and let
                # the remainder ride as fee (avoids creating dust).
                raw = build(0, False)
            ok, reason = self.mempool.add(raw, self.cs.utxo, height)
            if not ok:
                raise ValueError(f"rejected: {reason}")
            if self.peermgr:
                self.peermgr.broadcast_tx(raw)
            return txid_internal(raw).hex()

    def rpc_estimatesmartfee(self, p):
        """Estimate the fee rate for confirmation within target_blocks.

        params: [target_blocks] (default 2, clamped 1..144).
        Returns {"feerate": swords_per_vbyte, "blocks": target_blocks}.

        Methodology (documented, simple, honest):
        1. Confirmed marginals: for each of the last <=200 accepted blocks,
           the node records the MINIMUM fee rate among that block's txs —
           the rate that was just barely enough to confirm. The median of
           those marginals is the baseline: half of recent blocks confirmed
           at or below it.
        2. Urgency (target <= 2): bid to beat most of the current queue —
           max(baseline, 75th percentile of mempool fee rates).
        3. Patience (target >= 6): bid the 25th percentile of confirmed
           marginals — a rate that historically confirmed within a few
           blocks, not the next one.
        4. No history at all (fresh node): fall back to the mempool median,
           else the 1 sword/vbyte floor. Result is ceiled to an integer
           with a floor of 1.
        """
        target = int(p[0]) if p else 2
        target = max(1, min(144, target))
        with self.lock:
            hist = sorted(e["min"] for e in self._fee_history
                          if e.get("n"))
            height = self.cs.tip()["height"] + 1
            mem = []
            for raw in self.mempool.txs.values():
                ok, _, fee = validate_tx(raw, self.cs.utxo, height)
                if ok and raw:
                    mem.append(fee / len(raw))
        mem_s = sorted(mem)
        if hist:
            base = _pct(hist, 50)
        elif mem_s:
            base = _pct(mem_s, 50)
        else:
            base = 1.0
        if mem_s and target <= 2:
            base = max(base, _pct(mem_s, 75))
        elif hist and target >= 6:
            base = _pct(hist, 25)
        feerate = max(1, math.ceil(base - 1e-9))
        return {"feerate": feerate, "blocks": target}

    # ------------------------------------------- BIP-369 CADUCEUS capsules
    def rpc_buildtunnelcapsule(self, p):
        """Build a BIP-369 tunnel capsule. params[0] is an object with the
        build_capsule fields (state_type, index, proper_time_fs, direction,
        wormhole_pulse_id, source, destination, relayer, canonical_label,
        entanglement_chain_labels, bip322_sig, bip143_sig, qr_sig)."""
        if not p or not isinstance(p[0], dict):
            raise ValueError("buildtunnelcapsule needs one object param")
        try:
            return caduceus.build_capsule(**p[0])
        except TypeError as e:
            raise ValueError(f"bad capsule params: {e}")

    def rpc_validatetunnelcapsule(self, p):
        """Validate a BIP-369 tunnel capsule against the four Canons.
        BIP-143-style labels are checked against the live UTXO set."""
        if not p or not isinstance(p[0], dict):
            raise ValueError("validatetunnelcapsule needs one object param")
        with self.lock:
            ok, reasons = caduceus.validate_capsule(p[0], self.cs)
        return {"valid": ok, "reasons": reasons,
                "digest": caduceus.capsule_digest(p[0]) if ok else None}
