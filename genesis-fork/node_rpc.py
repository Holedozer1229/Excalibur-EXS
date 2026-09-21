#!/usr/bin/env python3
"""Local RPC for the EXCAL testnet. Localhost only, testnet only, valueless.

Endpoints (amounts in sats):
  GET  /tip                        -> {height, hash}
  GET  /mempool                    -> {count, txs:[{txid,fee,size}]}
  POST /tx            body: raw tx hex -> {txid} | 409 {error}
  GET  /balance?pubkey=<hex33>     -> {sats, tgsf, utxos}
  GET  /utxo?pubkey=<hex33>        -> list of {txid, vout, sats, kind}
  POST /keygen                     -> {privkey, pubkey} (saved to wallet.json)
  GET  /wallet                     -> [pubkey, ...] (no privkeys)
  POST /send   {privkey,to,amount,fee?} -> {txid}
  POST /faucet {to,amount}          -> {txid} (spends a mature anyone-UTXO)
  GET  /peers                      -> connected peers + scores
  POST /addpeer {host,port}         -> connect to a peer
  GET  /tips                       -> all known branch tips
  GET  /reorgs                     -> reorg history (most recent last)
  GET  /block?height=N | ?hash=hex -> block (hex-encoded fields)

Runs in a daemon thread inside the miner; shares chainstate/mempool under
a lock. Reorgs are handled by the chainstate; the mempool is rebuilt by
the peer manager on every chain event.
"""
import json
import os
import struct
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import secp256k1 as secp
from genesis_fork import ser_varint
from chainstate import enc_block
from txscript import (parse_tx, ser_tx, p2pk_script, spk_pubkey, is_anyone,
                      sign_input, txid_internal, txid_display,
                      find_spendable, COINBASE_MATURITY)

SAT = 100_000_000
FAUCET_FEE = 1000
FAUCET_MAX = 10 * SAT


class Node:
    def __init__(self, chainstate, mempool, lock: threading.Lock,
                 wallet_path: str, peermgr=None):
        self.chainstate = chainstate  # ChainState; miner-owned under lock
        self.mempool = mempool
        self.lock = lock
        self.wallet_path = wallet_path
        self.peermgr = peermgr
        self._server = None

    # -- helpers ---------------------------------------------------------
    def tip_height(self):
        return self.chainstate.tip()["height"]

    def _wallet(self):
        if os.path.exists(self.wallet_path):
            try:
                return json.load(open(self.wallet_path))
            except Exception:
                pass
        return {}

    def _wallet_add(self, priv_hex, pub_hex):
        w = self._wallet()
        w[pub_hex] = priv_hex
        fd = os.open(self.wallet_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
                     0o600)
        with os.fdopen(fd, "w") as f:
            json.dump(w, f, indent=2)

    # -- tx builders (call with lock held) --------------------------------
    def build_faucet(self, to_pub_hex: str, amount: int):
        """Spend one mature anyone-can-spend coinbase output."""
        to_pub = bytes.fromhex(to_pub_hex)
        if len(to_pub) != 33 or to_pub[0] not in (0x02, 0x03):
            return False, "bad pubkey"
        secp.decompress(to_pub)  # raises if not on curve
        if not (0 < amount <= FAUCET_MAX):
            return False, "amount out of range"
        h = self.tip_height()
        cands = find_spendable(
            self.chainstate.utxo, h,
            lambda v, spk, is_cb, cb_h: is_cb and is_anyone(spk),
            min_value=amount + FAUCET_FEE)
        if not cands:
            return False, "no mature faucet UTXO available"
        (key, (value, spk, is_cb, cb_h)) = cands[0]
        change = value - amount - FAUCET_FEE
        outs = [{"value": amount, "script": p2pk_script(to_pub)}]
        if change > 0:
            outs.append({"value": change, "script": b"\x51"})
        t = {"version": 1,
             "vin": [{"prev": key[0], "idx": key[1], "script": b"",
                      "seq": 0xFFFFFFFF}],
             "vout": outs, "locktime": 0}
        raw = ser_tx(t)
        return True, raw

    def build_send(self, priv_hex: str, to_pub_hex: str, amount: int,
                   fee: int):
        priv = int(priv_hex, 16)
        if not (1 <= priv < secp.N):
            return False, "bad privkey"
        pub = secp.compress(secp.priv_to_pub(priv))
        to_pub = bytes.fromhex(to_pub_hex)
        if len(to_pub) != 33 or to_pub[0] not in (0x02, 0x03):
            return False, "bad destination pubkey"
        secp.decompress(to_pub)
        if amount <= 0 or fee < 0:
            return False, "bad amount/fee"
        need = amount + fee
        h = self.tip_height()
        cands = find_spendable(
            self.chainstate.utxo, h,
            lambda v, spk, is_cb, cb_h: spk_pubkey(spk) == pub)
        cands.sort(key=lambda kv: kv[1][0])
        picked, total = [], 0
        for key, e in cands:
            picked.append((key, e))
            total += e[0]
            if total >= need:
                break
        if total < need:
            return False, (f"insufficient funds: have {total} sats, "
                           f"need {need}")
        vins = []
        for key, (value, spk, is_cb, cb_h) in picked:
            vins.append({"prev": key[0], "idx": key[1], "script": b"",
                         "seq": 0xFFFFFFFF, "_spk": spk})
        outs = [{"value": amount, "script": p2pk_script(to_pub)}]
        if total - need > 0:
            outs.append({"value": total - need, "script": p2pk_script(pub)})
        t = {"version": 1, "vin": vins, "vout": outs, "locktime": 0}
        for i, vin in enumerate(t["vin"]):
            vin["script"] = sign_input(t, i, vin.pop("_spk"), priv)
        return True, ser_tx(t)

    # -- server ------------------------------------------------------------
    def serve(self, port: int):
        node = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _json(self, code, obj):
                body = json.dumps(obj).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _body_json(self):
                n = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(n) if n else b""
                try:
                    return json.loads(raw) if raw else {}
                except Exception:
                    return None

            def do_GET(self):
                u = urlparse(self.path)
                q = parse_qs(u.query)
                if u.path == "/tip":
                    with node.lock:
                        h = node.tip_height()
                        hh = node.chainstate.best.hex()
                    self._json(200, {"height": h, "hash": hh})
                elif u.path == "/mempool":
                    with node.lock:
                        s = node.mempool.summary()
                    self._json(200, {"count": len(s), "txs": s})
                elif u.path == "/balance":
                    pub = q.get("pubkey", [""])[0]
                    try:
                        pb = bytes.fromhex(pub)
                    except ValueError:
                        return self._json(400, {"error": "bad pubkey"})
                    sats = n = 0
                    with node.lock:
                        for entries in node.chainstate.utxo.values():
                            for (v, spk, is_cb, cb_h) in entries:
                                if spk_pubkey(spk) == pb:
                                    sats += v
                                    n += 1
                    self._json(200, {"pubkey": pub, "sats": sats,
                                     "tgsf": sats / SAT, "utxos": n})
                elif u.path == "/utxo":
                    pub = q.get("pubkey", [""])[0]
                    try:
                        pb = bytes.fromhex(pub) if pub else None
                    except ValueError:
                        return self._json(400, {"error": "bad pubkey"})
                    out = []
                    with node.lock:
                        for (tid, vout), entries in node.chainstate.utxo.items():
                            for (v, spk, is_cb, cb_h) in entries:
                                if pb and spk_pubkey(spk) != pb:
                                    continue
                                out.append({
                                    "txid": tid[::-1].hex(), "vout": vout,
                                    "sats": v,
                                    "kind": ("coinbase" if is_cb
                                             else "regular"),
                                    "height": cb_h})
                                if len(out) >= 1000:
                                    break
                            if len(out) >= 1000:
                                break
                    self._json(200, {"count": len(out), "utxos": out})
                elif u.path == "/wallet":
                    self._json(200, {"pubkeys": list(node._wallet().keys())})
                elif u.path == "/peers":
                    with node.lock:
                        peers = (node.peermgr.peer_info()
                                 if node.peermgr else [])
                    self._json(200, {"count": len(peers), "peers": peers})
                elif u.path == "/tips":
                    with node.lock:
                        tips = node.chainstate.tips_info()
                    self._json(200, {"count": len(tips), "tips": tips})
                elif u.path == "/reorgs":
                    with node.lock:
                        reorgs = [node.chainstate._sanitize_event(e)
                                  for e in node.chainstate.reorgs[-50:]]
                    self._json(200, {"count": len(reorgs), "reorgs": reorgs})
                elif u.path == "/block":
                    hh = q.get("hash", [""])[0]
                    hs = q.get("height", [""])[0]
                    with node.lock:
                        cs = node.chainstate
                        rec = None
                        if hh:
                            try:
                                rec = cs.index.get(bytes.fromhex(hh))
                            except ValueError:
                                rec = None
                        elif hs:
                            try:
                                h = int(hs)
                                bh = next((b for b in cs.chain_hashes()
                                           if cs.index[b]["height"] == h),
                                          None)
                                rec = cs.index.get(bh) if bh else None
                            except ValueError:
                                rec = None
                        if rec is None:
                            return self._json(404, {"error": "block not found"})
                        blk = {k: rec[k] for k in (
                            "version", "prev", "merkle", "time", "bits",
                            "nonce", "hash", "txs")}
                        out = enc_block(blk)
                        out["height"] = rec["height"]
                    self._json(200, out)
                else:
                    self._json(404, {"error": "unknown endpoint"})

            def do_POST(self):
                u = urlparse(self.path)
                if u.path == "/tx":
                    n = int(self.headers.get("Content-Length", 0))
                    hexraw = (self.rfile.read(n) if n else b"").decode(
                        "ascii", errors="replace").strip()
                    try:
                        raw = bytes.fromhex(hexraw)
                    except ValueError:
                        return self._json(400, {"error": "body not hex"})
                    with node.lock:
                        ok, res = node.mempool.add(
                            raw, node.chainstate.utxo, node.tip_height())
                    if ok:
                        self._json(200, {"txid": res})
                    else:
                        self._json(409, {"error": res})
                elif u.path == "/keygen":
                    d = int.from_bytes(os.urandom(32), "big")
                    d = d % (secp.N - 1) + 1
                    priv_hex = d.to_bytes(32, "big").hex()
                    pub_hex = secp.compress(secp.priv_to_pub(d)).hex()
                    node._wallet_add(priv_hex, pub_hex)
                    self._json(200, {"privkey": priv_hex,
                                     "pubkey": pub_hex,
                                     "note": "testnet-only, valueless"})
                elif u.path == "/faucet":
                    args = self._body_json()
                    if args is None:
                        return self._json(400, {"error": "bad json"})
                    try:
                        amount = int(args.get("amount", 0))
                        to = args["to"]
                    except (KeyError, ValueError, TypeError):
                        return self._json(400, {"error": "need to, amount"})
                    with node.lock:
                        ok, res = node.build_faucet(to, amount)
                        if ok:
                            ok2, res2 = node.mempool.add(
                                res, node.chainstate.utxo, node.tip_height())
                            if not ok2:
                                self._json(409, {"error": res2})
                                return
                            res = res2
                    if ok:
                        self._json(200, {"txid": res})
                    else:
                        self._json(409, {"error": res})
                elif u.path == "/send":
                    args = self._body_json()
                    if args is None:
                        return self._json(400, {"error": "bad json"})
                    try:
                        priv = args["privkey"]
                        to = args["to"]
                        amount = int(args["amount"])
                        fee = int(args.get("fee", 1000))
                    except (KeyError, ValueError, TypeError):
                        return self._json(
                            400, {"error": "need privkey, to, amount"})
                    try:
                        with node.lock:
                            ok, res = node.build_send(priv, to, amount, fee)
                            if ok:
                                ok2, res2 = node.mempool.add(
                                    res, node.chainstate.utxo, node.tip_height())
                                if not ok2:
                                    self._json(409, {"error": res2})
                                    return
                                res = res2
                    except Exception as e:
                        return self._json(409, {"error": str(e)})
                    if ok:
                        self._json(200, {"txid": res})
                    else:
                        self._json(409, {"error": res})
                elif u.path == "/submitrawtx":
                    # Raw transaction submit (Rosetta /construction/submit).
                    # Body: {"raw": "<tx hex>"}. Fully validated on add.
                    args = self._body_json()
                    if args is None:
                        return self._json(400, {"error": "bad json"})
                    try:
                        raw = bytes.fromhex(args["raw"])
                    except (KeyError, ValueError, TypeError):
                        return self._json(
                            400, {"error": "need raw tx hex"})
                    try:
                        with node.lock:
                            ok, res = node.mempool.add(
                                raw, node.chainstate.utxo,
                                node.tip_height())
                    except Exception as e:
                        return self._json(409, {"error": str(e)})
                    if ok:
                        self._json(200, {"txid": res})
                    else:
                        self._json(409, {"error": res})
                elif u.path == "/addpeer":
                    args = self._body_json()
                    if args is None:
                        return self._json(400, {"error": "bad json"})
                    try:
                        host = str(args["host"])
                        port = int(args["port"])
                    except (KeyError, ValueError, TypeError):
                        return self._json(
                            400, {"error": "need host, port"})
                    if node.peermgr is None:
                        return self._json(409, {"error": "p2p disabled"})
                    try:
                        node.peermgr.connect(host, port)
                    except Exception as e:
                        return self._json(409, {"error": str(e)})
                    self._json(200, {"ok": True, "peer": f"{host}:{port}"})
                else:
                    self._json(404, {"error": "unknown endpoint"})

        self._server = ThreadingHTTPServer(("127.0.0.1", port), H)
        self._server.serve_forever()

    def serve_thread(self, port: int) -> threading.Thread:
        th = threading.Thread(target=self.serve, args=(port,), daemon=True,
                              name="excal-rpc")
        th.start()
        return th
