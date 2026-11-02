#!/usr/bin/env python3
"""Excalibur: live miner for the Excalibur chain (mainnet EXCAL and testnet tEXCAL).

Mines real SHA-256d blocks on top of our own chain, validating every
block under fork consensus before it lands. Append-only JSONL chain
file -- crash-safe, resumable.

Usage:
    python3 excalibur.py [--network mainnet|testnet] [--max-blocks N]
                     [--pace SECS] [--tag BYTES]

Block rewards: 50 EXCAL/tEXCAL coinbase to an anyone-can-spend demo output
(OP_TRUE), same as the reference implementation. This is our own chain;
coins have no market value -- the product is the chain itself.

v2: the miner runs a mempool + localhost RPC. New coinbases carry a
BIP34-style height push (unique txids going forward) and collect
mempool fees on top of the subsidy.
"""
import argparse
import json
import os
import queue
import signal
import struct
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from genesis_fork import (GENESIS, PARAMS, make_coinbase, merkle_root,
                          ser_header, sha256d, bits_to_target,
                          required_bits, subsidy, txid, use_network,
                          validate_block, verify_genesis,
                          check_coinbase_lineage)
from txscript import (build_utxo, apply_block_txs, make_coinbase_v2,
                      validate_block_txs, utxo_stats)
from mempool import Mempool
from chainstate import ChainState, activation_commitment
from p2p import PeerManager
from node_rpc import Node, load_wallet_key

CHAIN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "testnet_live.jsonl")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "chaindata")
SUMMARY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "genesis_fork_chain.json")
SPACING = 600
STOP = False

NODE_VERSION = "0.2.0"


def _sig(_s, _f):
    global STOP
    STOP = True


def b2h(b: bytes) -> str:
    return b.hex()


def h2b(s: str) -> bytes:
    return bytes.fromhex(s)


def enc_blk(blk: dict) -> dict:
    return {"version": blk["version"], "prev": b2h(blk["prev"]),
            "merkle": b2h(blk["merkle"]), "time": blk["time"],
            "bits": blk["bits"], "nonce": blk["nonce"],
            "hash": b2h(blk["hash"]),
            "txs": [b2h(t) for t in blk["txs"]]}


def dec_blk(d: dict) -> dict:
    return {"version": d["version"], "prev": h2b(d["prev"]),
            "merkle": h2b(d["merkle"]), "time": d["time"],
            "bits": d["bits"], "nonce": d["nonce"],
            "hash": h2b(d["hash"]),
            "txs": [h2b(t) for t in d["txs"]]}


def rebuild_from_summary():
    """Byte-exact rebuild of testnet blocks 0..5 from the committed summary."""
    summ = json.load(open(SUMMARY_FILE))["testnet"]
    gh = verify_genesis()
    chain = [{"version": GENESIS["version"], "prev": GENESIS["prev"],
              "merkle": GENESIS["merkle"], "time": GENESIS["time"],
              "bits": GENESIS["bits"], "nonce": GENESIS["nonce"],
              "hash": gh, "txs": []}]
    t = GENESIS["time"]
    for s in summ[1:]:
        h = s["height"]
        t += 1500 if h == 5 else SPACING
        bits = int(s["bits"], 16)
        tag = b"GSF/testnet-min-diff" if h == 5 else b"GSF/genesis-fork"  # historical bytes; summary hashes commit to these
        cb = make_coinbase(h, bits, tag)
        assert check_coinbase_lineage(cb, bits)
        mr = merkle_root([txid(cb)])
        hdr = ser_header(1, chain[-1]["hash"], mr, t, bits, s["nonce"])
        hh = sha256d(hdr)[::-1]
        assert hh.hex() == s["hash"], f"rebuild: block {h} hash mismatch"
        blk = {"version": 1, "prev": chain[-1]["hash"], "merkle": mr,
               "time": t, "bits": bits, "nonce": s["nonce"],
               "hash": hh, "txs": [cb]}
        bad = validate_block(blk, chain[-1], h, chain)
        assert not bad, f"rebuild: block {h} invalid: {bad}"
        chain.append(blk)
    return chain


def load_chain():
    """Load the branched chain state (migrates the legacy linear file
    on first run). Returns a ChainState."""
    return ChainState(DATA_DIR).load()


def _grind_range(job, result_q, stop_ev):
    """Worker process: grind nonces in [n_start, n_end); report the winner.

    The 80-byte header is pre-serialized once; only the last 4 bytes
    (little-endian nonce) change per hash, which avoids a struct.pack
    per iteration.
    """
    ver, prev_hash, mr, t, bits, target, n_start, n_end = job
    prefix = ser_header(ver, prev_hash, mr, t, bits, 0)[:76]
    nonce = n_start
    hashes = 0
    while nonce < n_end:
        dh = sha256d(prefix + nonce.to_bytes(4, "little"))
        hashes += 1
        if int.from_bytes(dh, "big") <= target:
            result_q.put((nonce, dh.hex(), hashes))
            return
        nonce += 1
        if (hashes & 0xFFF) == 0 and stop_ev.is_set():
            return
    result_q.put(None)  # range exhausted (practically never at min difficulty)


# ------------------------------------------------------------ coinbase
SPONSORS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "stratum_shim", "sponsors.json")


def _build_coinbase(height, bits, tag, fees, miner_pubkey, extra_pushes):
    """Coinbase for a mined block. If the sponsor registry (the land
    registry the payment watcher writes) has an entry for THIS height,
    the block pays the buyer's lock and seals their tag — the same
    shape fork_child and the stratum shim build, so delivery does not
    depend on which producer finds the block. Extra pushes (snapshot
    commitment, Phase Omega blob) ride last. Any error -> normal path.
    """
    try:
        import json as _json
        with open(SPONSORS_FILE) as f:
            ent = _json.load(f).get(str(height))
        if ent:
            from genesis_fork import push, ser_varint
            from txscript import lock_pkh
            raw = ent["lock"].strip().lower()
            if raw.startswith("0x"):
                raw = raw[2:]
            lock = (bytes.fromhex(raw) if len(raw) == 42
                    else lock_pkh(bytes.fromhex(raw)))
            script = (push(struct.pack("<I", bits)) + push(tag)
                      + push(struct.pack("<I", height))
                      + push(ent["tag"].encode()) + push(b"\x00" * 8))
            if extra_pushes:
                for e in extra_pushes:
                    script += push(bytes(e))
            tx = struct.pack("<I", 1) + b"\x01"
            tx += bytes(32) + struct.pack("<I", 0xFFFFFFFF)
            tx += ser_varint(len(script)) + script
            tx += struct.pack("<I", 0xFFFFFFFF) + b"\x01"
            tx += struct.pack("<Q", subsidy(height) + fees)
            tx += ser_varint(len(lock)) + lock
            tx += struct.pack("<I", 0)
            return tx
    except Exception:
        pass
    return make_coinbase_v2(height, bits, tag, fees, miner_pubkey,
                            extra_pushes=extra_pushes)


def mine_one_parallel(prev: dict, height: int, cs: ChainState, tag: bytes,
                      template: list, utxo_snap: dict, workers: int,
                      miner_pubkey: bytes = None, extra_pushes: list = None):
    """mine_one, but the 2^32 nonce space is split across worker processes.

    Block construction, timestamps, difficulty and validation are identical
    to mine_one -- only the hash grinding is parallelized. The first worker
    to find a valid nonce wins; the rest are stopped.
    """
    import multiprocessing as mp
    prev_hash = bytes.fromhex(prev["hash"])
    t = max(prev["time"] + 1, int(time.time()))
    bits = required_bits(height, cs._bits_context(prev_hash, height), t)
    mem_txs = [raw for raw, _fee in template]
    fees = sum(fee for _raw, fee in template)
    cb = _build_coinbase(height, bits, tag, fees, miner_pubkey,
                         extra_pushes)
    assert check_coinbase_lineage(cb, bits)
    txs = [cb] + mem_txs
    ok, reason, _ = validate_block_txs(txs, utxo_snap, height,
                                       subsidy(height))
    assert ok, f"template invalid pre-mine: {reason}"
    mr = merkle_root([txid(x) for x in txs])
    target = bits_to_target(bits)
    ver = 1
    ctx = mp.get_context("fork")
    result_q = ctx.Queue()
    stop_ev = ctx.Event()
    span = 0x100000000 // workers
    procs = []
    start = time.time()
    for i in range(workers):
        n_start = i * span
        n_end = (i + 1) * span if i + 1 < workers else 0x100000000
        p = ctx.Process(target=_grind_range,
                        args=((ver, prev_hash, mr, t, bits, target,
                               n_start, n_end), result_q, stop_ev))
        p.start()
        procs.append(p)
    blk = None
    winner_hashes = 0
    try:
        while True:
            if STOP:
                return None
            try:
                item = result_q.get(timeout=0.5)
            except queue.Empty:
                if all(not p.is_alive() for p in procs):
                    raise RuntimeError("nonce space exhausted without a block")
                continue
            if item is None:
                continue  # a worker exhausted its range; keep waiting
            nonce, dh_hex, winner_hashes = item
            dh = bytes.fromhex(dh_hex)
            blk = {"version": ver, "prev": prev_hash, "merkle": mr,
                   "time": t, "bits": bits, "nonce": nonce,
                   "hash": dh[::-1], "txs": txs}
            break
    finally:
        stop_ev.set()
        for p in procs:
            p.join(timeout=3)
            if p.is_alive():
                p.terminate()
    dt = time.time() - start
    # All workers ran the full window at ~equal rates, so scale the winner's
    # exact count for the combined hashrate estimate.
    hashes = winner_hashes * workers
    return blk, dt, hashes, fees


def mine_one(prev: dict, height: int, cs: ChainState, tag: bytes,
             template: list, utxo_snap: dict, miner_pubkey: bytes = None,
             extra_pushes: list = None):
    """Grind one block; roll ntime if the nonce space ever exhausts.

    template: list of (raw_tx, fee) mempool txs, already validated at
    selection time. Coinbase v2: height push + subsidy + fees.
    utxo_snap: a UTXO snapshot taken under lock (mining reads it unlocked).
    """
    prev_hash = bytes.fromhex(prev["hash"])
    # Wall-clock anchored, strictly increasing — like a real miner. (An
    # earlier schedule-anchored t = prev_time + spacing let fast mining
    # drift past the +2h future-tolerance, so the node rejected its own
    # blocks once height*spacing exceeded 7200s.)
    t = max(prev["time"] + 1, int(time.time()))
    bits = required_bits(height, cs._bits_context(prev_hash, height), t)
    mem_txs = [raw for raw, _fee in template]
    fees = sum(fee for _raw, fee in template)
    cb = _build_coinbase(height, bits, tag, fees, miner_pubkey,
                         extra_pushes)
    assert check_coinbase_lineage(cb, bits)
    txs = [cb] + mem_txs
    ok, reason, _ = validate_block_txs(txs, utxo_snap, height,
                                       subsidy(height))
    assert ok, f"template invalid pre-mine: {reason}"
    mr = merkle_root([txid(x) for x in txs])
    target = bits_to_target(bits)
    ver = 1
    nonce = 0
    start = time.time()
    hashes = 0
    while True:
        if STOP:
            return None
        hdr = ser_header(ver, prev_hash, mr, t, bits, nonce)
        dh = sha256d(hdr)
        hashes += 1
        if int.from_bytes(dh, "big") <= target:
            blk = {"version": ver, "prev": prev_hash, "merkle": mr,
                   "time": t, "bits": bits, "nonce": nonce,
                   "hash": dh[::-1], "txs": txs}
            return blk, time.time() - start, hashes, fees
        nonce += 1
        if nonce == 0x100000000:
            t += 1  # ntime roll; new timestamp, fresh nonce space
            nonce = 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--network", choices=("mainnet", "testnet", "fork"),
                    default="testnet",
                    help="which Genesis Fork network to mine")
    ap.add_argument("--max-blocks", type=int, default=0)
    ap.add_argument("--pace", type=float, default=None,
                    help="min seconds between blocks "
                         "(default: 600 mainnet, 1.0 testnet)")
    ap.add_argument("--tag", type=str, default="Excalibur")
    ap.add_argument("--workers", type=int, default=1,
                    help="parallel nonce-grinding processes (default 1)")
    ap.add_argument("--rpc-port", type=int, default=None,
                    help="localhost RPC port (0 = disabled; "
                         "default: network's RPC port)")
    ap.add_argument("--no-rpc", action="store_true",
                    help="disable the localhost RPC server")
    ap.add_argument("--rpc-host", type=str, default="127.0.0.1",
                    help="RPC listen address (default: 127.0.0.1; "
                         "use 0.0.0.0 for a public launch -- RPC has no "
                         "authentication, so only do this behind a firewall)")
    ap.add_argument("--version", action="version",
                    version=f"%(prog)s {NODE_VERSION}")
    ap.add_argument("--p2p-port", type=int, default=None,
                    help="P2P listen port (0 = disabled; "
                         "default: network's P2P port)")
    ap.add_argument("--p2p-host", type=str, default="127.0.0.1",
                    help="P2P listen address (default: 127.0.0.1; "
                         "use 0.0.0.0 for a public launch)")
    ap.add_argument("--no-mine", action="store_true",
                    help="serve P2P/RPC without mining "
                         "(read-only node; safe alongside an external miner)")
    ap.add_argument("--peer", action="append", default=[],
                    help="bootstrap peer host:port (repeatable)")
    ap.add_argument("--datadir", type=str, default="",
                    help="data directory (default: script dir)")
    ap.add_argument("--wallet-keyfile", type=str, default="",
                    help="file holding the wallet passphrase (or set "
                         "EXCALIBUR_WALLET_KEYFILE); needed when the "
                         "wallet file is encrypted")
    args = ap.parse_args()

    signal.signal(signal.SIGTERM, _sig)
    signal.signal(signal.SIGINT, _sig)

    P = use_network(args.network)
    ticker = P["ticker"]
    rpc_port = P["rpc_port"] if args.rpc_port is None else args.rpc_port
    p2p_port = P["p2p_port"] if args.p2p_port is None else args.p2p_port
    if args.pace is None:
        pace = 600.0 if args.network == "mainnet" else 1.0
    else:
        pace = args.pace

    scriptdir = os.path.dirname(os.path.abspath(__file__))
    if args.datadir:
        here = os.path.abspath(args.datadir)
        os.makedirs(here, exist_ok=True)
        data_dir = here
        mempool_path = os.path.join(here, "mempool.json")
        wallet_path = os.path.join(here, "wallet.json")
        log_path = os.path.join(here, "excalibur.log")
    elif args.network == "mainnet":
        # Mainnet gets its own files; the testnet chainstate in
        # chaindata/ is never touched.
        here = scriptdir
        data_dir = os.path.join(scriptdir, "chaindata_mainnet")
        mempool_path = os.path.join(scriptdir, "mempool_mainnet.json")
        wallet_path = os.path.join(scriptdir, "wallet_mainnet.json")
        log_path = os.path.join(scriptdir, "excalibur_mainnet.log")
    elif args.network == "fork":
        # BTC-tip fork chain gets its own files too.
        here = scriptdir
        data_dir = os.path.join(scriptdir, "chaindata_fork")
        mempool_path = os.path.join(scriptdir, "mempool_fork.json")
        wallet_path = os.path.join(scriptdir, "wallet_fork.json")
        log_path = os.path.join(scriptdir, "excalibur_fork.log")
    else:
        here = scriptdir
        data_dir = DATA_DIR
        mempool_path = os.path.join(here, "mempool.json")
        wallet_path = os.path.join(here, "wallet.json")
        log_path = os.path.join(here, "excalibur.log")
    cs = ChainState(data_dir, net=args.network).load()
    tag = args.tag.encode()
    logf = open(log_path, "a", buffering=1)

    def log(msg):
        line = f"[{time.strftime('%H:%M:%S')}] {msg}"
        print(line, flush=True)
        logf.write(line + "\n")

    n_u, v_u = utxo_stats(cs.utxo)
    log(f"chainstate loaded: tip h={cs.tip()['height']}, "
        f"{n_u} UTXOs, {v_u/1e8:.0f} {ticker}, "
        f"{len(cs.tips)} branch tips")

    mempool = Mempool(mempool_path,
                      chain_spent_pairs=getattr(cs, "spent_pqh_pairs", None))
    kept = mempool.load(cs.utxo, cs.tip()["height"])
    log(f"mempool loaded: {kept} txs revalidated")

    lock = threading.Lock()
    mgr = PeerManager(cs, mempool, lock, port=p2p_port, log=log,
                      host=args.p2p_host)
    if p2p_port:
        mgr.start()
        mgr.start_redial()
        log(f"P2P listening on {args.p2p_host}:{p2p_port} "
            f"(magic {mgr.magic:#x})")
        for p in args.peer:
            try:
                host, port = p.rsplit(":", 1)
                host = host.strip()
                if host.startswith("[") and host.endswith("]"):
                    host = host[1:-1]  # IPv6 literal [::1]:port form
                mgr.connect(host, int(port))
                log(f"bootstrap peer: {p}")
            except Exception as e:
                log(f"bad --peer {p}: {e}")
    else:
        log("P2P disabled")

    if not args.no_rpc and rpc_port:
        node = Node(cs, mempool, lock, wallet_path, peermgr=mgr,
                    wallet_keyfile=args.wallet_keyfile or None)
        node.serve_thread(rpc_port, host=args.rpc_host)
        log(f"RPC up on {args.rpc_host}:{rpc_port}")
        # Node-local fee market stats: the P2P layer reports every accepted
        # block's per-tx fee rates (not consensus, just estimatesmartfee
        # fuel).
        mgr.on_block = node.record_block_fees
    else:
        node = None
        log("RPC disabled")

    tip = cs.tip()
    log(f"Excalibur up -- {args.network} tip h={tip['height']} "
        f"hash={tip['hash'][:16]}.. tag={args.tag}")
    if args.no_mine:
        log("mining disabled (--no-mine): serving P2P/RPC only")
        while not STOP:
            time.sleep(0.5)
    # The block reward pays this node's wallet key directly — every block
    # found is solo-mined income, no pool required.
    _miner_priv, miner_pub = load_wallet_key(
        wallet_path, keyfile=args.wallet_keyfile or None)
    from txscript import hash160 as _h160
    log(f"coinbase pays PKH {_h160(miner_pub).hex()[:16]}.. (this node's wallet)")
    mined = 0
    total_hashes = 0
    total_t = 0.0
    while not STOP and not args.no_mine:
        if args.max_blocks and mined >= args.max_blocks:
            break
        t0 = time.time()
        with lock:
            tip = cs.tip()
            h = tip["height"] + 1
            # mine_one needs the full parent record (time); the tip
            # summary only carries height/hash/work.
            prec = cs.index[bytes.fromhex(tip["hash"])]
            prev = {"hash": tip["hash"], "time": prec["time"]}
            template = mempool.select_template(cs.utxo, h)
            # snapshot for unlocked template validation during mining.
            # UtxoSet.copy() is cheap (shares the immutable snapshot).
            utxo_snap = cs.utxo.copy()
        # Snapshot activation: at the activation height the coinbase must
        # push the snapshot hash (consensus-enforced in submit_block).
        commit = activation_commitment(h, cs.data_dir)
        extra = [commit] if commit else None
        # Phase Omega (2026-10-23): this block's coinbase countersigns
        # the parent header with a Trifold signature (omega_sign,
        # flock-allocated one-time leaves). Best-effort: any failure
        # leaves the template unsigned; mining never depends on it.
        try:
            import omega_sign as _om
            def _hx(x):
                return bytes.fromhex(x) if isinstance(x, str) else bytes(x)
            _phdr = ser_header(prec["version"], _hx(prec["prev"]),
                               _hx(prec["merkle"]), prec["time"],
                               prec["bits"], prec["nonce"])
            if sha256d(_phdr).hex() == tip["hash"]:
                _blob = _om.omega_blob(_phdr)
                if _blob:
                    extra = (extra or []) + [_blob]
        except Exception:
            pass
        if commit:
            log(f"mining snapshot activation block {h} "
                f"(committing {commit.hex()[:16]}..)")
        if args.workers > 1:
            res = mine_one_parallel(prev, h, cs, tag, template, utxo_snap,
                                    args.workers, miner_pub,
                                    extra_pushes=extra)
        else:
            res = mine_one(prev, h, cs, tag, template, utxo_snap, miner_pub,
                           extra_pushes=extra)
        if res is None:
            break
        blk, dt, hashes, fees = res
        with lock:
            sub = cs.submit_block(blk)
            ev = sub.get("event")
            if sub["accepted"] and ev:
                # our block joined the active chain: mempool fix-up +
                # announce to peers
                mgr._apply_reorg_side_effects(ev)
                mgr.broadcast_block(blk)
            elif sub["accepted"]:
                log(f"block {h} became a side branch "
                    f"(lost a race) -- txs stay in mempool")
            else:
                log(f"!! own block {h} rejected: {sub['reason']}")
                continue
        if sub["accepted"] and node is not None:
            # Node-local fee observation for estimatesmartfee (the template
            # already carries per-tx fees; not consensus).
            node.record_block_fees(
                h, [(len(r), f) for r, f in template])
        mined += 1
        total_hashes += hashes
        total_t += dt
        hr = hashes / dt if dt > 0 else 0
        ntx = len(blk["txs"]) - 1
        log(f"block {h}: {blk['hash'].hex()[:16]}.. nonce={blk['nonce']} "
            f"{hr:,.0f} H/s ({dt:.2f}s) subsidy={subsidy(h)/1e8:.0f} {ticker} "
            f"txs={ntx} fees={fees}")
        wait = pace - (time.time() - t0)
        if wait > 0:
            # Sleep in short increments so SIGTERM/SIGINT (which sets STOP)
            # takes effect promptly instead of after the full pace delay.
            deadline = time.time() + wait
            while not STOP:
                remaining = deadline - time.time()
                if remaining <= 0:
                    break
                time.sleep(min(0.5, remaining))
    avg = total_hashes / total_t if total_t > 0 else 0
    log(f"Excalibur down -- mined {mined} blocks, avg {avg:,.0f} H/s, "
        f"tip now h={cs.tip()['height']}")
    try:
        mgr.shutdown()
    except Exception:
        pass
    logf.close()


if __name__ == "__main__":
    main()
