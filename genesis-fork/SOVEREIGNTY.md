# EXCAL Sovereignty

Sovereignty principle: **every third-party dependency of the EXCAL Genesis
Fork must have a documented exit path.** This file is the inventory.

Sovereignty is a direction, not a switch. The chain's consensus is already
self-contained; the items below are the remaining external footholds and
how each one is escaped.

## 1. Consensus — sovereign ✅

- Own genesis block, own PoW (SHA-256d), own difficulty retarget, own
  address/transaction/script rules. No external oracle, checkpoint server,
  or timestamp authority sits in the consensus path.
- The shared Bitcoin genesis anchor is a *reference*, not a dependency:
  the chain validates itself without Bitcoin.
- Single local node today (localhost P2P). Public peering is a deployment
  step, not a protocol change.

## 2. Code custody — sovereign copy ✅

- Canonical public mirror: `Holedozer1229/Excalibur-EXS` → `genesis-fork/`
  (GitHub). GitHub is a *mirror*, not the source of truth.
- Sovereign custody artifacts (Travis holds these, off GitHub):
  - `excal-genesis-fork.bundle` — full git history, restorable with
    `git clone excal-genesis-fork.bundle`
  - `excal-genesis-fork-<commit>.tar.gz` — source snapshot
  - `MANIFEST.sha256` — hash attestation of both
- The tree is pure Python (stdlib only) — no build step, no package
  registry, no compiler toolchain needed to run a node.
- Full exit: self-hosted git on hardware Travis controls. The bundle is
  all that is needed to seed it.

## 3. Block explorer — sovereign ✅

- `explorer/explorer_gen.py` reads the local chaindata and emits a single
  self-contained `explorer.html`: no server, no CDN, no external requests.
  Open the file anywhere; it cannot phone home because there is nothing
  to phone home to.
- Regenerate after new blocks: `python3 explorer/explorer_gen.py`.

## 4. Aetherion bridge — quorum-sovereign ✅ (federated)

- M-of-N operator quorum (`BridgeLedger(operators, threshold=M)`), persisted
  with the ledger. One operator signing twice counts once.
- Release integrity is machine-checked: burn_ref must name a real unmatched
  burn, amounts must match exactly, attestations cannot replay, `locked`
  decrements when source coins leave custody.
- Keys live with the operators (Travis), not with any platform.
- Explicit non-goal: the bridge is federated, not trustless. Trustlessness
  would require per-chain light clients on the source chains (future work).

## 5. Ecosystem listing — not a dependency ✅

- `coinbase/mesh-ecosystem` PR #18 is a directory listing request, nothing
  more. The chain, the Rosetta adapter, and the bridge all run without it.
- Rosetta/Mesh support does not imply Coinbase listing, approval, or
  endorsement. A listing is a separate owner-filed process.

## 6. Bitcoin header data — validated locally, fetch is the foothold ⚠️

- `chainmap/` keeps a full Bitcoin header chain. Every header is validated
  locally from first principles (sha256d recomputed, prev-linkage, PoW vs
  own nBits, strict 2016-block retarget, cumulative chainwork). Bad data
  cannot enter; the source is untrusted by design.
- Foothold: headers are *fetched* via mempool.space HTTPS and Electrum.
  Exit path: the validation already treats sources as adversarial —
  adding a second independent fetch source (or Bitcoin P2P from an
  unproxied box) removes the single-source fetch dependency without
  changing any trust assumption.
- This tooling is NOT in EXCAL's consensus path. The fork does not need
  Bitcoin headers to operate.

## 7. Mining pools — not in EXCAL's path ✅

- EXCAL is solo-mined locally; no pool dependency.
- Bitcoin merge-mining (F2Pool) and Scrypt mining (zpool) are revenue
  operations, independent of the fork. They can be stopped without
  affecting the chain.

## 8. DNS / domain / public endpoints — open ⬜

- No domain is registered for EXCAL yet; no public RPC or explorer URL
  exists. This is the one foothold that requires Travis: registering a
  domain and pointing it at infrastructure he controls.
- Honest limit of this build box: it has no public IP. Public endpoints
  (P2P seeds, RPC, hosted explorer) need a server or machine Travis
  controls. Everything in this repo is ready to deploy onto it unchanged.

## Sovereignty checklist

- [x] Consensus self-contained
- [x] Code custody: git bundle + tarball + sha256 manifest in Travis's hands
- [x] Explorer: zero-dependency static file
- [x] Bridge: M-of-N quorum, machine-checked releases, operator-held keys
- [x] No operational dependence on GitHub, Coinbase, pools, or header APIs
- [ ] Domain registered + public endpoints on Travis-controlled hardware
- [ ] Second independent Bitcoin header fetch source
- [ ] Operator key ceremony documented
