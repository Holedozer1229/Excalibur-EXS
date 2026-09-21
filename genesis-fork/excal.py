#!/usr/bin/env python3
"""EXCAL: live miner for the Genesis Fork (mainnet GSF and testnet tGSF).

Mines real SHA-256d blocks on top of our own chain, validating every
block under fork consensus before it lands. Append-only JSONL chain
file -- crash-safe, resumable.

Usage:
    python3 excal.py [--network mainnet|testnet] [--max-blocks N]
                     [--pace SECS] [--tag BYTES]

Block rewards: 50 GSF/tGSF coinbase to an anyone-can-spend demo output
(OP_TRUE), same as the reference implementation. This is our own chain;
coins have no market value -- the product is the chain itself.

v2: the miner runs a mempool + localhost RPC. New coinbases carry a
BIP34-style height push (unique txids going forward) and collect
mempool fees on top of the subsidy.
"""
import argparse
import json
import os
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
from chainstate import ChainState
from p2p import PeerManager
from node_rpc import Node

CHAIN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "testnet_live.jsonl")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "chaindata")
SUMMARY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "genesis_fork_chain.json")
SPACING = 600
STOP = False


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
        tag = b"GSF/testnet-min-diff" if h == 5 else b"GSF/genesis-fork"
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


def mine_one(prev: dict, height: int, cs: ChainState, tag: bytes,
             template: list, utxo_snap: dict, spacing: float = 600.0):
    """Grind one block; roll ntime if the nonce space ever exhausts.

    template: list of (raw_tx, fee) mempool txs, already validated at
    selection time. Coinbase v2: height push + subsidy + fees.
    utxo_snap: a UTXO snapshot taken under lock (mining reads it unlocked).
    """
    prev_hash = bytes.fromhex(prev["hash"])
    t = prev["time"] + int(spacing)
    if t <= prev["time"]:
        t = prev["time"] + 1  # consensus: strictly increasing
    if height == 1:
        # A fresh chain's first block anchors to wall-clock time instead
        # of sitting at genesis+600s (2009). Still consensus-valid:
        # increasing vs genesis, and never beyond now+2h.
        t = max(t, int(time.time()))
    bits = required_bits(height, cs._bits_context(prev_hash, height), t)
    mem_txs = [raw for raw, _fee in template]
    fees = sum(fee for _raw, fee in template)
    cb = make_coinbase_v2(height, bits, tag, fees)
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
    ap.add_argument("--network", choices=("mainnet", "testnet"),
                    default="testnet",
                    help="which Genesis Fork network to mine")
    ap.add_argument("--max-blocks", type=int, default=0)
    ap.add_argument("--pace", type=float, default=None,
                    help="min seconds between blocks "
                         "(default: 600 mainnet, 1.0 testnet)")
    ap.add_argument("--spacing", type=float, default=600.0,
                    help="chain-time seconds between mined blocks "
                         "(miner policy, default 600)")
    ap.add_argument("--tag", type=str, default="EXCAL")
    ap.add_argument("--rpc-port", type=int, default=None,
                    help="localhost RPC port (0 = disabled; "
                         "default: network's RPC port)")
    ap.add_argument("--no-rpc", action="store_true",
                    help="disable the localhost RPC server")
    ap.add_argument("--p2p-port", type=int, default=None,
                    help="P2P listen port (0 = disabled; "
                         "default: network's P2P port)")
    ap.add_argument("--peer", action="append", default=[],
                    help="bootstrap peer host:port (repeatable)")
    ap.add_argument("--datadir", type=str, default="",
                    help="data directory (default: script dir)")
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
        log_path = os.path.join(here, "excal.log")
    elif args.network == "mainnet":
        # Mainnet gets its own files; the testnet chainstate in
        # chaindata/ is never touched.
        here = scriptdir
        data_dir = os.path.join(scriptdir, "chaindata_mainnet")
        mempool_path = os.path.join(scriptdir, "mempool_mainnet.json")
        wallet_path = os.path.join(scriptdir, "wallet_mainnet.json")
        log_path = os.path.join(scriptdir, "excal_mainnet.log")
    else:
        here = scriptdir
        data_dir = DATA_DIR
        mempool_path = os.path.join(here, "mempool.json")
        wallet_path = os.path.join(here, "wallet.json")
        log_path = os.path.join(here, "excal.log")
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

    mempool = Mempool(mempool_path)
    kept = mempool.load(cs.utxo, cs.tip()["height"])
    log(f"mempool loaded: {kept} txs revalidated")

    lock = threading.Lock()
    mgr = PeerManager(cs, mempool, lock, port=p2p_port, log=log)
    if p2p_port:
        mgr.start()
        log(f"P2P listening on 127.0.0.1:{p2p_port} "
            f"(magic {mgr.magic:#x})")
        for p in args.peer:
            try:
                host, port = p.rsplit(":", 1)
                mgr.connect(host.strip(), int(port))
                log(f"bootstrap peer: {p}")
            except Exception as e:
                log(f"bad --peer {p}: {e}")
    else:
        log("P2P disabled")

    if not args.no_rpc and rpc_port:
        node = Node(cs, mempool, lock, wallet_path, peermgr=mgr)
        node.serve_thread(rpc_port)
        log(f"RPC up on 127.0.0.1:{rpc_port}")
    else:
        log("RPC disabled")

    tip = cs.tip()
    log(f"EXCAL up -- {args.network} tip h={tip['height']} "
        f"hash={tip['hash'][:16]}.. tag={args.tag}")
    mined = 0
    total_hashes = 0
    total_t = 0.0
    while not STOP:
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
            # snapshot for unlocked template validation during mining
            utxo_snap = {k: list(v) for k, v in cs.utxo.items()}
        res = mine_one(prev, h, cs, tag, template, utxo_snap,
                       spacing=args.spacing)
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
    log(f"EXCAL down -- mined {mined} blocks, avg {avg:,.0f} H/s, "
        f"tip now h={cs.tip()['height']}")
    try:
        mgr.shutdown()
    except Exception:
        pass
    logf.close()


if __name__ == "__main__":
    main()
