#!/usr/bin/env python3
"""EXCALcore -- all-in-one EXCAL node.

Built-in mining console + P2P networking + localhost RPC, in a single
process (and a single PyInstaller executable on every desktop OS).

    python3 excalcore.py [--network mainnet|testnet] [options]

Console commands (interactive mode):
    help                 list commands
    status               chain tip, mining state, hashrate, peers, mempool
    start                start the miner
    stop                 stop the miner
    peers                list connected P2P peers
    connect <host:port>  dial a bootstrap peer
    tip                  detailed chain tip
    mempool              mempool summary
    balance <pubkeyhex>  confirmed balance of a compressed pubkey (hex)
    quit | exit          graceful shutdown

Everything is pure-python stdlib: no dependencies to install.
"""
import argparse
import os
import signal
import sys
import threading
import time
import traceback

# -- frozen (PyInstaller) aware base dir -------------------------------------
if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, BASE_DIR)

from genesis_fork import use_network, subsidy, gf11_active      # noqa: E402
from chainstate import ChainState                               # noqa: E402
from mempool import Mempool                                     # noqa: E402
from p2p import PeerManager                                     # noqa: E402
from node_rpc import Node                                       # noqa: E402
from txscript import spk_pubkey                                 # noqa: E402
import excal                                                    # noqa: E402

APP_NAME = "EXCALcore"
VERSION = "1.0.0-gf11"


class Console:
    """Thread-safe console output + interactive command loop."""

    def __init__(self):
        self._lock = threading.Lock()
        self.shutdown = threading.Event()

    def log(self, msg):
        with self._lock:
            print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

    def cmd_help(self, app, _args):
        self.log("commands: help | status | start | stop | peers | "
                 "connect <host:port> | tip | mempool | "
                 "balance <pubkeyhex> | quit")

    def cmd_status(self, app, _args):
        with app.lock:
            tip = app.cs.tip()
            n_peers = len(app.mgr.peer_info()) if app.mgr else 0
            mp = app.mempool.summary()
        up = time.time() - app.started_at
        mining = "ON" if app.mining.is_set() else "OFF"
        self.log(f"tip h={tip['height']} {tip['hash'][:16]}.. "
                 f"| mining {mining} | session {app.blocks_mined} blocks, "
                 f"avg {app.avg_hashrate():,.0f} H/s "
                 f"(cur {app.cur_hashrate:,.0f} H/s) "
                 f"| peers {n_peers} | mempool {len(mp)} txs "
                 f"| uptime {up:.0f}s")

    def cmd_start(self, app, _args):
        if app.mining.is_set():
            self.log("miner already running")
            return
        app.mining.set()
        self.log("miner started")

    def cmd_stop(self, app, _args):
        if not app.mining.is_set():
            self.log("miner not running")
            return
        app.mining.clear()
        excal.STOP = True  # interrupt the in-progress grind promptly
        self.log("miner stopping (finishes current nonce scan fast)")

    def cmd_peers(self, app, _args):
        infos = app.mgr.peer_info() if app.mgr else []
        if not infos:
            self.log("no peers connected")
            return
        for p in infos:
            self.log(f"{p['addr']} tip_h={p['tip_height']} "
                     f"{'in' if p['inbound'] else 'out'} "
                     f"score={p['score']}")

    def cmd_connect(self, app, args):
        if not args:
            self.log("usage: connect <host:port>")
            return
        if not app.mgr:
            self.log("P2P disabled")
            return
        try:
            host, port = args[0].rsplit(":", 1)
            app.mgr.connect(host.strip(), int(port))
            self.log(f"dialing {args[0]}")
        except Exception as e:
            self.log(f"bad peer '{args[0]}': {e}")

    def cmd_tip(self, app, _args):
        with app.lock:
            tip = app.cs.tip()
            full = app.cs.index.get(bytes.fromhex(tip["hash"]), {})
        self.log(f"height={tip['height']} hash={tip['hash']} "
                 f"time={full.get('time', '?')} "
                 f"work={tip.get('work', '?')}")

    def cmd_mempool(self, app, _args):
        with app.lock:
            s = app.mempool.summary()
        fees = sum(t.get("fee", 0) for t in s)
        self.log(f"{len(s)} txs, total fees {fees} sats")

    def cmd_balance(self, app, args):
        if not args:
            self.log("usage: balance <compressed-pubkey-hex>")
            return
        try:
            pb = bytes.fromhex(args[0])
        except ValueError:
            self.log("bad hex")
            return
        sats = n = 0
        with app.lock:
            for entries in app.cs.utxo.values():
                for (v, spk, _is_cb, _cb_h) in entries:
                    if spk_pubkey(spk) == pb:
                        sats += v
                        n += 1
        self.log(f"{n} utxos, {sats} sats = {sats / 1e8:.8f} "
                 f"{app.ticker}")

    def run(self, app):
        cmds = {
            "help": self.cmd_help, "status": self.cmd_status,
            "start": self.cmd_start, "stop": self.cmd_stop,
            "peers": self.cmd_peers, "connect": self.cmd_connect,
            "tip": self.cmd_tip, "mempool": self.cmd_mempool,
            "balance": self.cmd_balance,
        }
        self.log(f"{APP_NAME} v{VERSION} console -- type 'help'")
        while not self.shutdown.is_set():
            try:
                line = input("excal> ").strip()
            except (EOFError, KeyboardInterrupt):
                print(flush=True)
                break
            if not line:
                continue
            parts = line.split()
            cmd, args = parts[0].lower(), parts[1:]
            if cmd in ("quit", "exit"):
                break
            fn = cmds.get(cmd)
            if fn is None:
                self.log(f"unknown command '{cmd}' -- try 'help'")
                continue
            try:
                fn(app, args)
            except Exception as e:
                self.log(f"command error: {e}")


class App:
    def __init__(self, args, console):
        self.args = args
        self.console = console
        self.lock = threading.Lock()
        self.mining = threading.Event()
        self.shutdown = threading.Event()
        self.started_at = time.time()
        self.blocks_mined = 0
        self.total_hashes = 0
        self.total_mine_t = 0.0
        self.cur_hashrate = 0.0
        self.pq_pubkey = None

        P = use_network(args.network)
        self.ticker = P["ticker"]
        rpc_port = P["rpc_port"] if args.rpc_port is None else args.rpc_port
        p2p_port = P["p2p_port"] if args.p2p_port is None else args.p2p_port
        if args.pace is None:
            self.pace = 600.0 if args.network == "mainnet" else 1.0
        else:
            self.pace = args.pace

        if args.pq_pubkey_hex:
            pk = bytes.fromhex(args.pq_pubkey_hex)
            if len(pk) != 1952:
                raise SystemExit("--pq-pubkey-hex must be 1952 bytes "
                                 "(3904 hex chars) of ML-DSA-65 public key")
            self.pq_pubkey = pk

        if args.datadir:
            here = os.path.abspath(args.datadir)
            os.makedirs(here, exist_ok=True)
        else:
            here = BASE_DIR
        if args.network == "mainnet":
            data_dir = os.path.join(here, "chaindata_mainnet")
            mempool_path = os.path.join(here, "mempool_mainnet.json")
            wallet_path = os.path.join(here, "wallet_mainnet.json")
            self.log_path = os.path.join(here, "excalcore_mainnet.log")
        else:
            data_dir = os.path.join(here, "chaindata")
            mempool_path = os.path.join(here, "mempool.json")
            wallet_path = os.path.join(here, "wallet.json")
            self.log_path = os.path.join(here, "excalcore.log")

        self.cs = ChainState(data_dir, net=args.network).load()
        self.mempool = Mempool(mempool_path)
        kept = self.mempool.load(self.cs.utxo, self.cs.tip()["height"])
        self.log(f"chainstate: tip h={self.cs.tip()['height']}, "
                 f"mempool: {kept} txs revalidated")

        self.mgr = None
        if p2p_port:
            self.mgr = PeerManager(self.cs, self.mempool, self.lock,
                                   port=p2p_port, log=self.log)
            self.mgr.start()
            self.log(f"P2P listening on 127.0.0.1:{p2p_port} "
                     f"(magic {self.mgr.magic:#x})")
            for p in args.peer:
                try:
                    host, port = p.rsplit(":", 1)
                    self.mgr.connect(host.strip(), int(port))
                    self.log(f"bootstrap peer: {p}")
                except Exception as e:
                    self.log(f"bad --peer {p}: {e}")
        else:
            self.log("P2P disabled")

        self.node = None
        if not args.no_rpc and rpc_port:
            self.node = Node(self.cs, self.mempool, self.lock,
                             wallet_path, peermgr=self.mgr)
            self.node.serve_thread(rpc_port)
            self.log(f"RPC up on 127.0.0.1:{rpc_port}")
        else:
            self.log("RPC disabled")

        self.tag = args.tag.encode()
        tip = self.cs.tip()
        self.log(f"{APP_NAME} v{VERSION} up -- {args.network} "
                 f"tip h={tip['height']} hash={tip['hash'][:16]}.. "
                 f"tag={args.tag}")

    def log(self, msg):
        self.console.log(msg)

    def avg_hashrate(self):
        return (self.total_hashes / self.total_mine_t
                if self.total_mine_t > 0 else 0.0)

    def mine_loop(self):
        """Background miner; one block per iteration, paced."""
        args = self.args
        while not self.shutdown.is_set():
            if not self.mining.is_set():
                time.sleep(0.25)
                continue
            if args.max_blocks and self.blocks_mined >= args.max_blocks:
                self.log(f"max-blocks {args.max_blocks} reached; "
                         f"miner idle")
                self.mining.clear()
                continue
            excal.STOP = False
            t0 = time.time()
            try:
                with self.lock:
                    tip = self.cs.tip()
                    h = tip["height"] + 1
                    prec = self.cs.index[bytes.fromhex(tip["hash"])]
                    prev = {"hash": tip["hash"], "time": prec["time"]}
                    template = self.mempool.select_template(self.cs.utxo, h)
                    utxo_snap = {k: list(v)
                                 for k, v in self.cs.utxo.items()}
                res = excal.mine_one(prev, h, self.cs, self.tag,
                                     template, utxo_snap,
                                     spacing=args.spacing,
                                     pq_pubkey=self.pq_pubkey)
            except RuntimeError as e:
                # e.g. GF-11 active with no PQ coinbase key configured
                self.log(f"!! mining halted: {e}")
                self.mining.clear()
                continue
            except Exception:
                self.log("!! miner exception:\n" +
                         traceback.format_exc(limit=3))
                time.sleep(1.0)
                continue
            if res is None:  # interrupted by stop
                excal.STOP = False
                continue
            blk, dt, hashes, fees = res
            with self.lock:
                sub = self.cs.submit_block(blk)
                ev = sub.get("event")
                if sub["accepted"] and ev and self.mgr:
                    self.mgr._apply_reorg_side_effects(ev)
                    self.mgr.broadcast_block(blk)
            if not sub["accepted"]:
                self.log(f"!! own block {h} rejected: {sub['reason']}")
                continue
            self.blocks_mined += 1
            self.total_hashes += hashes
            self.total_mine_t += dt
            hr = hashes / dt if dt > 0 else 0
            self.cur_hashrate = hr
            ntx = len(blk["txs"]) - 1
            self.log(f"block {h}: {blk['hash'].hex()[:16]}.. "
                     f"nonce={blk['nonce']} {hr:,.0f} H/s ({dt:.2f}s) "
                     f"subsidy={subsidy(h) / 1e8:.0f} {self.ticker} "
                     f"txs={ntx} fees={fees}")
            wait = self.pace - (time.time() - t0)
            if wait > 0:
                deadline = time.time() + wait
                while (not self.shutdown.is_set()
                       and self.mining.is_set()):
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        break
                    time.sleep(min(0.5, remaining))

    def run(self):
        t = threading.Thread(target=self.mine_loop, daemon=True,
                             name="miner")
        t.start()
        if self.args.mine_on_start:
            self.mining.set()
            self.log("miner auto-started (--mine-on-start)")
        else:
            self.log("miner idle -- type 'start' to mine")
        if self.args.no_console:
            self.log("console disabled -- running headless; "
                     "Ctrl+C / SIGTERM to stop")
            try:
                # NOTE: the signal handler sets console.shutdown, so the
                # headless loop must watch it (not self.shutdown).
                while not self.console.shutdown.is_set():
                    time.sleep(0.5)
            except KeyboardInterrupt:
                pass
        else:
            self.console.run(self)
        self.stop()

    def stop(self):
        self.shutdown.set()
        self.console.shutdown.set()
        self.mining.clear()
        excal.STOP = True
        try:
            if self.mgr:
                self.mgr.shutdown()
        except Exception:
            pass
        self.log(f"{APP_NAME} down -- mined {self.blocks_mined} blocks "
                 f"this session, avg {self.avg_hashrate():,.0f} H/s, "
                 f"tip now h={self.cs.tip()['height']}")


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog=APP_NAME,
        description="EXCALcore: all-in-one EXCAL node -- mining console "
                    "+ P2P + RPC.")
    ap.add_argument("--network", choices=("mainnet", "testnet"),
                    default="testnet")
    ap.add_argument("--datadir", default="",
                    help="data directory (default: next to the executable)")
    ap.add_argument("--p2p-port", type=int, default=None,
                    help="P2P listen port (0 = disabled; default: "
                         "network default)")
    ap.add_argument("--rpc-port", type=int, default=None,
                    help="localhost RPC port (0 = disabled; default: "
                         "network default)")
    ap.add_argument("--no-rpc", action="store_true",
                    help="disable the localhost RPC server")
    ap.add_argument("--peer", action="append", default=[],
                    help="bootstrap peer host:port (repeatable)")
    ap.add_argument("--tag", default="EXCALcore",
                    help="coinbase tag (default: EXCALcore)")
    ap.add_argument("--pace", type=float, default=None,
                    help="min seconds between blocks "
                         "(default: 600 mainnet, 1.0 testnet)")
    ap.add_argument("--spacing", type=float, default=600.0,
                    help="chain-time seconds between mined blocks "
                         "(miner policy, default 600)")
    ap.add_argument("--max-blocks", type=int, default=0,
                    help="stop mining after N blocks (0 = unlimited)")
    ap.add_argument("--mine-on-start", action="store_true",
                    help="start mining immediately instead of idling")
    ap.add_argument("--no-console", action="store_true",
                    help="headless mode: no interactive console")
    ap.add_argument("--pq-pubkey-hex", default="",
                    help="1952-byte ML-DSA-65 pubkey (hex) for coinbase "
                         "after the GF-11 quantum-resistant fork activates")
    ap.add_argument("--version", action="version",
                    version=f"{APP_NAME} {VERSION}")
    args = ap.parse_args(argv)

    console = Console()

    def _sig(_s, _f):
        console.shutdown.set()

    try:
        signal.signal(signal.SIGTERM, _sig)
        signal.signal(signal.SIGINT, _sig)
    except Exception:
        pass  # Windows: SIGTERM may be unavailable; console handles Ctrl+C

    try:
        app = App(args, console)
    except SystemExit:
        raise
    except Exception:
        console.log("!! startup failed:\n" + traceback.format_exc(limit=5))
        return 2
    app.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
