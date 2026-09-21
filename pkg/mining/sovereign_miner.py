#!/usr/bin/env python3
"""Sovereign $EXS post-genesis miner.

Mines blocks on top of the verified sovereign genesis descriptor:

1. Loads + adopts the descriptor through the P2P ``ChainState`` (which
   runs the independent consensus-oracle verification and the
   final_hash cross-check before adopting block 0).
2. Builds every block's coinbase with the exact tokenomics split --
   ``coinbase_split``: 1% treasury tithe off the top, then 60/20/15/5 of
   the remainder with integer dust to the miner. No premine: height 0
   pays nobody; forging starts at height 1.
3. Grinds the unmodified Omega' D18 kernel, C port (Annunaki SHA-NI)
   when available, Python oracle fallback.
4. Validates every forged block through ``ChainState.submit_block``
   (PoW recompute, linkage, coinbase split) before announcing.
5. Announces accepted blocks to connected peers via P2P ``inv``.

ADDRESSES ARE PARAMETERS. The miner refuses to start unless
``--miner-addr``, ``--treasury-addr``, ``--liquidity-addr`` and
``--airdrop-addr`` are all supplied. No address is ever invented,
defaulted, or derived here -- fund routing is Travis's call.

Engine rule: the C port is a speed layer only. At startup the miner
checks one C hash against the Python consensus oracle and refuses to
mine on mismatch.
"""
import argparse
import os
import sys
import time

_HERE = os.path.dirname(os.path.abspath(__file__))
_PKG_DIR = os.path.dirname(_HERE)          # .../pkg
_REPO_ROOT = os.path.dirname(_PKG_DIR)     # repo root
for _p in (_PKG_DIR, _REPO_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from mining.tetrapow_dice_universal import UniversalMiningKernel  # noqa: E402
from net import sovereign_p2p as sp  # noqa: E402

try:
    from pkg.economy.sovereign_tokenomics import (  # noqa: E402
        block_reward, coinbase_split, validate_allocation)
except ImportError:
    try:
        from economy.sovereign_tokenomics import (  # noqa: E402
            block_reward, coinbase_split, validate_allocation)
    except ImportError:
        block_reward = coinbase_split = validate_allocation = None

try:
    from mining.omegaprime_c import grind as c_grind  # noqa: E402
    from mining.omegaprime_c import hash_one as c_hash_one  # noqa: E402
    HAS_C = True
except Exception:
    HAS_C = False

CHUNK = 1 << 20  # C grind nonces per call


def build_coinbase(height: int, addrs: dict) -> bytes:
    """Encode the height's coinbase from the exact tokenomics split.

    ``addrs``: miner/treasury/liquidity/airdrop -> address string.
    Raises ValueError if any payee is unassigned (fail closed).
    """
    reward = block_reward(height)
    parts = coinbase_split(reward,
                           addrs["treasury"], addrs["liquidity"],
                           addrs["airdrop"], addrs["miner"])
    outputs = []
    for label in ("tithe", "miner", "liquidity", "treasury", "airdrop"):
        addr, amt = parts[label]
        outputs.append((str(addr).encode("utf-8"), amt))
    raw = sp.encode_coinbase(outputs)
    ok, why = sp.validate_coinbase(raw, height)
    if not ok:
        raise RuntimeError(f"built coinbase failed validation: {why}")
    return raw


def mine_block_c(kernel, prev: bytes, height: int, txs, difficulty: int,
                 timestamp: int, should_abort=None):
    """Grind one block with the C engine in chunks.

    ``should_abort``: called between chunks; when truthy, abandon this
    candidate (e.g. the tip moved). Returns the sp.mine_block-style dict
    or None when aborted.
    """
    txroot = sp.compute_txroot(txs)
    # C hash_one(daxiom, nonce) == Omega'D18(daxiom + ":" + str(nonce)),
    # so strip the trailing ":" from the block prefix.
    daxiom = (f"{sp.AXIOM}:{sp.SEED_HEX}:{height}:{prev.hex()}:"
              f"{txroot.hex()}:{timestamp}")
    assert not daxiom.endswith(":")
    start = 0
    while True:
        if should_abort is not None and should_abort():
            return None
        hit = c_grind(daxiom, start, CHUNK, difficulty)
        if hit is not None:
            nonce, bid = hit
            return {"height": height, "prev": prev, "timestamp": timestamp,
                    "nonce": nonce, "txs": list(txs), "txroot": txroot,
                    "id": bid}
        start += CHUNK


def check_engine(kernel) -> bool:
    """One C hash vs the Python consensus oracle; False on any mismatch."""
    if not HAS_C:
        return False
    probe = "sovereign-miner-engine-probe"
    try:
        c = c_hash_one(probe, 7)
        py = sp.pow_hash(kernel, f"{probe}:7")
    except Exception:
        return False
    return c == py


def main(argv=None):
    ap = argparse.ArgumentParser(description="Sovereign $EXS post-genesis "
                                 "miner (needs the ground genesis "
                                 "descriptor + all four payee addresses)")
    ap.add_argument("--genesis-json", required=True,
                    help="ground sovereign_genesis_exs.json descriptor")
    ap.add_argument("--datadir", default="./sovereign_chaindata")
    ap.add_argument("--difficulty", type=int, default=4,
                    help="leading zero bytes (default 4 = spec)")
    ap.add_argument("--miner-addr", required=True)
    ap.add_argument("--treasury-addr", required=True)
    ap.add_argument("--liquidity-addr", required=True)
    ap.add_argument("--airdrop-addr", required=True)
    ap.add_argument("--bind", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=None)
    ap.add_argument("--peer", action="append", default=[],
                    help="bootstrap peer host:port (repeatable)")
    ap.add_argument("--testnet", action="store_true")
    args = ap.parse_args(argv)

    if block_reward is None:
        raise SystemExit("tokenomics module not importable; refusing to "
                         "forge without the reward schedule")
    validate_allocation()
    addrs = {"miner": args.miner_addr, "treasury": args.treasury_addr,
             "liquidity": args.liquidity_addr, "airdrop": args.airdrop_addr}

    kernel = UniversalMiningKernel()
    use_c = check_engine(kernel)
    if not use_c:
        raise SystemExit("C engine failed the oracle cross-check; refusing "
                         "to mine rather than risk a consensus split")
    print("[*] mining engine: C port (Annunaki SHA-NI), oracle cross-check "
          "PASSED", flush=True)

    magic = sp.MAGIC_TESTNET if args.testnet else sp.MAGIC_MAINNET
    port = args.port or (sp.PORT_TESTNET if args.testnet else sp.PORT_MAINNET)
    cs = sp.ChainState(args.datadir, kernel, args.difficulty, magic)
    if cs.best is None:
        g, desc = sp._load_genesis_json(args.genesis_json)
        print("[*] verifying genesis descriptor against the consensus "
              "oracle ...", flush=True)
        if not sp._verify_descriptor_oracle(desc):
            raise SystemExit("genesis descriptor FAILED independent oracle "
                             "verification; refusing to mine on it")
        res = cs.submit_block(g)
        if not res["accepted"]:
            raise SystemExit(f"genesis rejected: {res['reason']}")
        if res["id"].hex() != desc["pow"]["final_hash"]:
            raise SystemExit("descriptor final_hash != adopted genesis id")
        print(f"[*] genesis adopted: {res['id'].hex()}", flush=True)

    mp = sp.Mempool()
    mgr = sp.PeerManager(cs, mp, port, bind=args.bind)
    mgr.start()
    for peer in args.peer:
        host, _, p = peer.rpartition(":")
        mgr.connect(host or "127.0.0.1", int(p) if p else port)
    print(f"[*] node up on {args.bind}:{mgr.port}; mining with "
          f"miner={args.miner_addr}", flush=True)

    try:
        while True:
            with cs.lock:
                tip = cs.tip()
                tip_id = bytes.fromhex(tip["hash"])
                height = tip["height"] + 1
                parent_ts = cs.index[tip_id]["timestamp"] \
                    if tip_id in cs.index else 0
            if height < 1:
                time.sleep(1)
                continue
            ts = max(int(time.time()), parent_ts + 1)
            coinbase = build_coinbase(height, addrs)
            txs = [coinbase]  # v1: coinbase only; mempool inclusion later
            tip_now = lambda: cs.tip()["hash"] != tip["hash"]  # noqa: E731
            b = mine_block_c(kernel, tip_id, height, txs,
                             args.difficulty, ts, should_abort=tip_now)
            if b is None:
                print("[*] tip moved while grinding; rebuilding",
                      flush=True)
                continue
            res = cs.submit_block({k: b[k] for k in
                                   ("height", "prev", "timestamp",
                                    "nonce", "txs")})
            if not res["accepted"]:
                print(f"[!] forged block rejected: {res['reason']}; "
                      f"rebuilding", flush=True)
                continue
            mgr.broadcast_block({"id": res["id"]})
            print(f"[*] forged height {height} id={res['id'].hex()} "
                  f"nonce={b['nonce']}; announced", flush=True)
    except KeyboardInterrupt:
        pass
    finally:
        mgr.shutdown()


if __name__ == "__main__":
    main()
