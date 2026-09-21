#!/usr/bin/env python3
"""
aetherion_bridge.py — Aetherion coins <-> EXCAL (Genesis Fork) connection layer.

What this is:
  A federated, attested bridge LEDGER (off-chain) connecting all seven
  Aetherion coins (registry: aetherion_tokens.json) to the EXCAL Genesis
  Fork chain. Each coin maps to a deterministic EXCAL wrapped asset:

      asset_id(symbol) = sha256d(b"AETHERION-EXCAL-ASSET:" + SYMBOL)

  Peg-in:  coins locked on the source chain -> federation operator verifies
           (off-chain) and signs a MINT attestation -> ledger credits the
           recipient's wrapped balance. source_txid is replay-protected.
  Peg-out: holder burns wrapped -> operator releases on the source chain
           and signs a RELEASE attestation -> ledger verifies the release
           matches a real, unmatched burn (burn_ref), rejects replays,
           decrements locked, and records the release as audit trail.

  Authorization: M-of-N operator quorum (threshold configurable at ledger
           creation, persisted with the ledger). A MINT or RELEASE is valid
           only with signatures from at least `threshold` DISTINCT operators;
           one operator signing twice counts once.

What this is NOT (honest scope):
  - Not consensus. The Genesis Fork v1 chain has no native token script;
    wrapped balances live in this ledger, not in UTXOs. On-chain wrapped
    UTXOs would require a token consensus upgrade (future work, noted in
    AETHERION_CONNECT.md).
  - Not trustless. The federation operators are trusted to verify
    source-chain locks before signing MINT and to actually release on the
    source chain before signing RELEASE. The quorum is M-of-N (configurable);
    the ledger is append-only so any mis-issue is permanently auditable.
  - Not live custody. No real locks/releases are performed by this module;
    it is the accounting + attestation layer. Amounts are integers in the
    source coin's base units.

Supply invariant (enforced on every mutation):
  outstanding(asset) == minted(asset) - burned(asset)
  locked(asset)      >= outstanding(asset)

Pure Python. Depends only on the stdlib + secp256k1.py (sibling module).
"""
import hashlib
import json
import os
import time

from secp256k1 import sign as _sign, verify as _verify, priv_to_pub, compress

REGISTRY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "aetherion_tokens.json")
ASSET_DOMAIN = b"AETHERION-EXCAL-ASSET:"
WRAP_PREFIX = "a"          # aURUU, aAETX, ...
FALLBACK_DECIMALS = 8      # GSF convention when source decimals unknown


def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


# ---------------------------------------------------------------- registry
def load_registry(path: str = REGISTRY_PATH) -> dict:
    with open(path) as f:
        reg = json.load(f)
    coins = reg["coins"]
    assert len(coins) == 7, f"expected 7 coins, got {len(coins)}"
    syms = [c["symbol"] for c in coins]
    assert len(set(syms)) == 7, "duplicate symbols in registry"
    return reg


def get_coin(symbol: str, reg: dict = None) -> dict:
    reg = reg or load_registry()
    for c in reg["coins"]:
        if c["symbol"] == symbol:
            return c
    raise KeyError(f"unknown Aetherion coin: {symbol}")


# ---------------------------------------------------------------- EXCAL wrapped assets
def asset_id(symbol: str) -> bytes:
    """Deterministic 32-byte EXCAL asset id for an Aetherion coin."""
    get_coin(symbol)  # raises KeyError on unknown symbol
    return sha256d(ASSET_DOMAIN + symbol.encode("utf-8"))


def wrapped_symbol(symbol: str) -> str:
    get_coin(symbol)
    return WRAP_PREFIX + symbol


def wrapped_decimals(symbol: str) -> int:
    c = get_coin(symbol)
    return c["decimals"] if isinstance(c.get("decimals"), int) else FALLBACK_DECIMALS


def rosetta_currency(symbol: str) -> dict:
    """Rosetta Currency object for the wrapped asset (Mesh-ready)."""
    c = get_coin(symbol)
    return {
        "symbol": wrapped_symbol(symbol),
        "decimals": wrapped_decimals(symbol),
        "metadata": {
            "asset_id": asset_id(symbol).hex(),
            "source_symbol": symbol,
            "source_chain": c["chain"],
            "source_standard": c["standard"],
            "source_contract": c["contract_or_tick"],
            "bridge": "aetherion-excal-federated-v1",
        },
    }


def all_currencies() -> list:
    reg = load_registry()
    return [rosetta_currency(c["symbol"]) for c in reg["coins"]]


# ---------------------------------------------------------------- attestations
def _canon(obj: dict) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()


def attestation_hash(att: dict) -> bytes:
    return sha256d(_canon(att))


def sign_attestation(priv: int, att: dict) -> str:
    return _sign(priv, attestation_hash(att)).hex()


def verify_attestation(pub_compressed_hex: str, att: dict, sig_hex: str) -> bool:
    from secp256k1 import decompress
    pub = decompress(bytes.fromhex(pub_compressed_hex))
    return _verify(pub, bytes.fromhex(sig_hex), attestation_hash(att))


def make_mint_attestation(symbol: str, amount: int, source_txid: str,
                          recipient: str, nonce: str = "") -> dict:
    assert amount > 0, "amount must be positive"
    get_coin(symbol)
    return {"op": "MINT", "bridge": "aetherion-excal-federated-v1",
            "symbol": symbol, "asset_id": asset_id(symbol).hex(),
            "amount": amount, "source_txid": source_txid,
            "recipient": recipient, "nonce": nonce,
            "issued_at": int(time.time())}


def make_release_attestation(symbol: str, amount: int, source_txid: str,
                             recipient: str, burn_ref: str) -> dict:
    assert amount > 0, "amount must be positive"
    get_coin(symbol)
    return {"op": "RELEASE", "bridge": "aetherion-excal-federated-v1",
            "symbol": symbol, "asset_id": asset_id(symbol).hex(),
            "amount": amount, "source_release_txid": source_txid,
            "recipient": recipient, "burn_ref": burn_ref,
            "issued_at": int(time.time())}


# ---------------------------------------------------------------- ledger
class BridgeLedger:
    """Federated bridge ledger. Enforces the supply invariant on every op."""

    def __init__(self, operators: list, threshold: int = 1, path: str = None):
        """
        operators: list of compressed-pubkey hex strings trusted to sign
                   MINT / RELEASE attestations.
        threshold: M of the M-of-N quorum. An attestation is valid only with
                   signatures from at least `threshold` DISTINCT operators.
                   Persisted with the ledger when path is used.
        """
        assert operators, "at least one operator required"
        assert 1 <= threshold <= len(operators), \
            "threshold must be within 1..len(operators)"
        self.operators = list(operators)
        self.threshold = threshold
        self.path = path
        self.state = {"assets": {}, "used_source_txids": [],
                      "used_burn_refs": [], "used_release_atts": [],
                      "balances": {}, "log": [], "threshold": threshold}
        if path and os.path.exists(path):
            with open(path) as f:
                loaded = json.load(f)
            for k, v in self.state.items():
                loaded.setdefault(k, v)
            self.state = loaded
            self.threshold = loaded.get("threshold", threshold)

    # -- persistence ------------------------------------------------------
    def save(self):
        if self.path:
            tmp = self.path + ".tmp"
            with open(tmp, "w") as f:
                json.dump(self.state, f, indent=2)
            os.replace(tmp, self.path)

    # -- internal ---------------------------------------------------------
    def _asset(self, symbol: str) -> dict:
        a = self.state["assets"].setdefault(
            symbol, {"locked": 0, "minted": 0, "burned": 0})
        return a

    def _check_invariant(self, symbol: str):
        a = self._asset(symbol)
        assert a["minted"] - a["burned"] == self._outstanding(symbol), \
            "invariant broken: minted-burned != outstanding"
        assert a["locked"] >= self._outstanding(symbol), \
            "invariant broken: locked < outstanding"

    def _outstanding(self, symbol: str) -> int:
        aid = asset_id(symbol).hex()
        return sum(bal.get(aid, 0)
                   for bal in self.state["balances"].values())

    def _log(self, entry: dict):
        entry = dict(entry)
        entry["t"] = int(time.time())
        self.state["log"].append(entry)

    def _approvals(self, att: dict, sigs) -> int:
        """Count DISTINCT operators that validly signed this attestation.
        One operator signing twice counts once."""
        if isinstance(sigs, str):
            sigs = [sigs]
        ok = set()
        for i, op in enumerate(self.operators):
            for s in sigs:
                try:
                    if verify_attestation(op, att, s):
                        ok.add(i)
                        break
                except Exception:
                    continue
        return len(ok)

    def _require_quorum(self, att: dict, sigs, op_name: str):
        n = self._approvals(att, sigs)
        if n < self.threshold:
            raise ValueError(
                f"{op_name} attestation: {n} operator approvals, "
                f"threshold is {self.threshold}")

    # -- public ops -------------------------------------------------------
    def balance_of(self, address: str, symbol: str) -> int:
        return self.state["balances"].get(address, {}).get(
            asset_id(symbol).hex(), 0)

    def peg_in(self, att: dict, sigs) -> dict:
        """Credit wrapped asset against a quorum-signed MINT attestation.
        sigs: one hex signature or a list of them (M-of-N quorum)."""
        if att.get("op") != "MINT":
            raise ValueError("attestation op != MINT")
        symbol = att["symbol"]
        get_coin(symbol)  # unknown asset -> KeyError
        self._require_quorum(att, sigs, "MINT")
        stx = att["source_txid"]
        if stx in self.state["used_source_txids"]:
            raise ValueError("MINT attestation: source_txid already used")
        amount = att["amount"]
        if not isinstance(amount, int) or amount <= 0:
            raise ValueError("MINT attestation: bad amount")
        recipient = att["recipient"]
        if not recipient:
            raise ValueError("MINT attestation: empty recipient")

        aid = asset_id(symbol).hex()
        a = self._asset(symbol)
        a["locked"] += amount
        a["minted"] += amount
        bal = self.state["balances"].setdefault(recipient, {})
        bal[aid] = bal.get(aid, 0) + amount
        self.state["used_source_txids"].append(stx)
        self._log({"op": "peg_in", "symbol": symbol, "amount": amount,
                   "recipient": recipient, "source_txid": stx,
                   "attestation": attestation_hash(att).hex()})
        self._check_invariant(symbol)
        self.save()
        return {"symbol": symbol, "wrapped": wrapped_symbol(symbol),
                "credited": amount,
                "balance": bal[aid]}

    def peg_out_burn(self, address: str, symbol: str, amount: int,
                     dest: str) -> dict:
        """Holder burns wrapped asset; returns a burn ref for the operator
        to release the source coins against."""
        get_coin(symbol)
        if not isinstance(amount, int) or amount <= 0:
            raise ValueError("burn amount must be positive int")
        if not dest:
            raise ValueError("empty destination")
        aid = asset_id(symbol).hex()
        bal = self.state["balances"].setdefault(address, {})
        if bal.get(aid, 0) < amount:
            raise ValueError("insufficient wrapped balance")
        bal[aid] -= amount
        a = self._asset(symbol)
        a["burned"] += amount
        burn_ref = sha256d(
            f"BURN:{symbol}:{address}:{amount}:{dest}:{len(self.state['log'])}"
            .encode()).hex()
        self._log({"op": "peg_out_burn", "symbol": symbol, "amount": amount,
                   "holder": address, "dest": dest, "burn_ref": burn_ref})
        self._check_invariant(symbol)
        self.save()
        return {"symbol": symbol, "burned": amount, "burn_ref": burn_ref,
                "balance": bal[aid]}

    def peg_out_release(self, att: dict, sigs) -> dict:
        """Record a quorum-signed RELEASE attestation for a source-chain
        release. Hard requirements:
          - burn_ref must name a real, previously unmatched peg_out_burn
            for the same symbol,
          - attestation amount must equal the burn amount exactly,
          - the attestation hash must never have been recorded before
            (replay protection),
        On success, `locked` is decremented: the source coins left custody.
        sigs: one hex signature or a list of them (M-of-N quorum)."""
        if att.get("op") != "RELEASE":
            raise ValueError("attestation op != RELEASE")
        symbol = att["symbol"]
        get_coin(symbol)
        self._require_quorum(att, sigs, "RELEASE")
        amount = att.get("amount")
        if not isinstance(amount, int) or amount <= 0:
            raise ValueError("RELEASE attestation: bad amount")
        ah = attestation_hash(att).hex()
        if ah in self.state["used_release_atts"]:
            raise ValueError("RELEASE attestation: replay rejected")
        burn_ref = att.get("burn_ref")
        if not burn_ref:
            raise ValueError("RELEASE attestation: missing burn_ref")
        if burn_ref in self.state["used_burn_refs"]:
            raise ValueError("RELEASE attestation: burn_ref already released")
        burn = None
        for e in self.state["log"]:
            if e.get("op") == "peg_out_burn" and e.get("burn_ref") == burn_ref:
                burn = e
                break
        if burn is None:
            raise ValueError("RELEASE attestation: burn_ref has no burn")
        if burn["symbol"] != symbol:
            raise ValueError("RELEASE attestation: symbol != burn symbol")
        if burn["amount"] != amount:
            raise ValueError("RELEASE attestation: amount != burn amount")
        a = self._asset(symbol)
        if a["locked"] < amount:
            raise ValueError("RELEASE attestation: locked underflow")
        a["locked"] -= amount
        self.state["used_burn_refs"].append(burn_ref)
        self.state["used_release_atts"].append(ah)
        self._log({"op": "peg_out_release", "symbol": symbol,
                   "amount": amount,
                   "source_release_txid": att.get("source_release_txid"),
                   "burn_ref": burn_ref,
                   "attestation": ah})
        self._check_invariant(symbol)
        self.save()
        return {"symbol": symbol, "released": amount,
                "source_release_txid": att.get("source_release_txid"),
                "locked": a["locked"]}

    def unreleased_burns(self, symbol: str = None) -> list:
        """Burns awaiting a matching RELEASE (operator work queue)."""
        used = set(self.state["used_burn_refs"])
        out = []
        for e in self.state["log"]:
            if e.get("op") == "peg_out_burn" and \
                    e.get("burn_ref") not in used and \
                    (symbol is None or e.get("symbol") == symbol):
                out.append(e)
        return out

    def supply(self, symbol: str) -> dict:
        get_coin(symbol)
        a = self._asset(symbol)
        return {"symbol": symbol, "wrapped": wrapped_symbol(symbol),
                "asset_id": asset_id(symbol).hex(),
                "locked": a["locked"], "minted": a["minted"],
                "burned": a["burned"],
                "outstanding": self._outstanding(symbol)}
