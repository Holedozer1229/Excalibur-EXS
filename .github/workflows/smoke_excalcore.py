#!/usr/bin/env python3
"""CI smoke test for a packaged EXCALcore binary (Windows .exe / macOS).

Launches the binary on a fresh testnet datadir with mining enabled and the
localhost RPC server on, polls GET /tip until 2 blocks are mined, then
terminates the process. Exits nonzero on any failure.
"""
import json
import subprocess
import sys
import tempfile
import time
import urllib.request

EXE = sys.argv[1]
RPC_PORT = 28455
TIMEOUT = 150


def tip():
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{RPC_PORT}/tip", timeout=5
        ) as r:
            return json.load(r)
    except Exception:
        return None


def main():
    datadir = tempfile.mkdtemp(prefix="excalcore-smoke-")
    cmd = [
        EXE,
        "--network", "testnet",
        "--datadir", datadir,
        "--no-console",
        "--mine-on-start",
        "--max-blocks", "2",
        "--pace", "0",
        "--spacing", "1",
        "--p2p-port", "0",
        "--rpc-port", str(RPC_PORT),
        "--tag", "SMOKE",
    ]
    print("launching:", " ".join(cmd), flush=True)
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1,
    )
    deadline = time.time() + TIMEOUT
    mined = False
    try:
        while time.time() < deadline:
            t = tip()
            if t and t.get("height", -1) >= 2:
                print(
                    f"smoke: reached tip h={t['height']} "
                    f"hash={t['hash'][:16]}..",
                    flush=True,
                )
                mined = True
                break
            if proc.poll() is not None:
                print(
                    "smoke: process exited early, code",
                    proc.returncode, flush=True,
                )
                break
            time.sleep(2)
        if not mined:
            raise SystemExit("smoke FAILED: tip did not reach height 2")
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                out, _ = proc.communicate(timeout=20)
            except subprocess.TimeoutExpired:
                proc.kill()
                out, _ = proc.communicate()
        else:
            out, _ = proc.communicate()
        tail = "\n".join((out or "").splitlines()[-15:])
        print("--- process output tail ---\n" + tail, flush=True)
    print("smoke PASSED", flush=True)


if __name__ == "__main__":
    main()
