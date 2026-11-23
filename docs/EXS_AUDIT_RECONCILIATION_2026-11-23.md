# Audit Reconciliation — Branch Reproduction vs Independent Reproduction

**Date:** 2026-11-23  
**Pinned commit (both reproductions):**
`06a4071ad631374d92752a6d71ba1cf586631d01` (Excalibur-EXS main)

## 1. The two documents

| Document | Location |
|---|---|
| Branch reproduction (working record) | `docs/EXS_REPRODUCED_AUDIT_2026-11-23.md` (this branch) |
| Independent reproduction (correction ledger) | `~/workspace/excalibur-exs-audit-reproduction-2026-11-23.md` (outside the repo; 72 KB, read in full, not duplicated here) |

Both are read-only source inspections of the same pinned commit.
Neither executed repository code, ran an exploit, or certified
any implementation. The independent reproduction re-checked all
67 finding-level claims in the original audit plus the 11
consolidated production-readiness gaps, with exact file/line
references and blob SHAs.

## 2. Verdict: agreement on substance, corrections on detail

- Finding-level claims checked: **67 → CONFIRMED 48, CORRECTED 19,
  NOT FOUND 0, NOT VERIFIABLE 1** (partial, §3(c) only).
- Consolidated gaps 1–11: **CONFIRMED 9, CORRECTED 2** (gap 6:
  kernel order/KDF hash; gap 11: Trifold/HTLC scope).
- **No substantive audit finding was refuted.** Every
  CRITICAL/HIGH verdict reproduced exactly: public axiom → key
  derivations, no BIP-340/341 implementation, no canonical
  prophecy commitment, Rosetta as a mock, fabricated addresses,
  three incompatible PoW kernels, the float defect, and the
  genesis/supply contradictions.
- **Divergences between the two reproductions: none of substance.**
  Every divergence is a line number, an attribution (which file a
  formula lives in), a search-scope note, or one of two
  kernel-description errors. The full list is section 3.

## 3. Correction ledger (30 items, from the independent reproduction)

Line-number and detail corrections:

1. `prophet_signature`: `prophecy_engine.py` ~70 → **75–77**.
2. `CANONICAL_AXIOM`: `rune_validation.py` ~25 → **28**; its
   `axiom_hash` is conditional (`None` when invalid) and hashes
   the raw input as passed.
3. Sovereign-genesis `AXIOM`/assert: ~55–57 → **66–67**.
4. `derive_seed` passes constants by name, not inline literals.
5. "Final SHA-256" is NOT in `sovereign_genesis.py`; only in
   `SOVEREIGN_GENESIS.md:48–49`.
6. Post-genesis preimage/txroot is NOT in `sovereign_genesis.py`;
   only in `SOVEREIGN_GENESIS.md:137,142`.
7. `warchest_vault.py` seed constant is line **27**, not 29.
8. Treasury "controls" text is `forge_treasury_key.py:20`, not 14;
   iteration literal is `1200000`, not `1_200_000`.
9. Wallet `_hpp1_derive` is `wallet_cli.py:133–146`, not 36–40
   (plus corrected plaintext-storage, encrypt, address, seed-word
   and balance line ranges).
10. Foundry `hpp1_derive_key` is `exs_foundry.py:47–75`;
    `process_forge` 97–133; `create_taproot_vault` 135–169.
11. `derive_genesis_entropy` is `docs/GENESIS.md:232–260`, not
    157–186; keypair/tweak/output/address helpers 393–500.
12. Taproot internal-key lines are `taproot.go:38,42`, not 37–40.
13. Rust `derive_taproot_address` is `mod.rs:164–180`, not 163–180.
14. Tetrapow difficulty comparison is `tetrapow.go:87–88`, not 82–85.
15. No-separator SHA-256 is `taproot.go:31–35`, not 41–44.
16. SHA-512 binding is `mod.rs:89–97` and
    `proof_of_forge.go:71–81`, not the cited ranges.
17. Zetahash float spans are `proof_of_forge.go:101–141` (float
    line 128) and `mod.rs:117–160` (float line 144).
18. Raw axiom constant is `config.go:40`; the "NEVER store"
    comment alone is 37–39.
19. `docs/GENESIS.md` genesis-transaction JSON starts at line 56,
    not ~60.
20. `cmd/tetra_pow/main.go` normalisation/hash is 137–142, not
    137–139.

Scope and substance corrections:

21. **Trifold is NOT absent repo-wide** — 6 hits, all in
    `genesis-fork/` (`txscript.py:14,261,535,547`,
    `genesis_fork.py:111`, `excalibur.py:479`). Absence holds only
    within the original audit's scoped directories. These are
    structural PQH/Trifold countersignature hooks, NOT a reviewed
    BIP-341 three-branch Taproot policy and NOT production FROST.
22. **HTLC is NOT absent repo-wide** — 63 lines; structural HTLC
    lock in `genesis-fork/txscript.py:274–417` (descriptor,
    `lock_htlc`, claim/refund signing helpers), plus status notes
    in `website/` and `README.md:467`. Absence holds only within
    the §7 scoped directories.
23. **"2-of-3 zero hits" is FALSE** — 2 hits in
    `cmd/exs-node/wallet.go:55,142`, and `multisig` has 19 lines
    in scope. They are generic multisig wallet/treasury mentions,
    not a Trifold policy; "no Trifold exists in scope" still holds.
24. **Go/Rust pipeline KDF is PBKDF2-SHA512, not SHA-256** (only
    the standalone `tetrapow.go` `HPP1` helper is SHA-256), and
    **the order is TetraPoW 128 rounds FIRST, then PBKDF2
    tempering** — the audit reversed it
    (`proof_of_forge.go:52–55`, `mod.rs:194–197`).
25. **§3(c) is NOT VERIFIABLE in-tree**: whether btcd's
    `ComputeTaprootOutputKey` expects a Merkle root as its 2nd
    argument cannot be checked from the pinned tree (no `vendor/`;
    `go.mod:8` only pins btcd v0.24.2). The call itself
    (`taproot.go:48`) is confirmed; the expectation is not
    contradicted, just unverified here.
26. "No Merkle-root handling anywhere" needs the SPV caveat:
    transaction-inclusion Merkle proofs exist in
    `pkg/bitcoin/spv_client.go` (unrelated to Taproot).
27. "Full Data + Construction API" (§8(a)) and "Production-ready
    Go + Rust Proof-of-Forge" (§9) are the audit's paraphrases,
    not literal strings; the underlying documented claims exist
    verbatim at the cited lines.
28. The literal strings "test vector" / "known answer" do occur
    in the tree (GF bips, `blockchain/lbhjj`,
    `annunaki_shani.h`, `msmcncncmxmx`, `payout.py`) — none is a
    BIP-340/341 or repo-kernel known-answer test, so "none" stands
    for its intended meaning.
29. `mod.rs` `test_forge_fee_calculation` asserts exact fee values
    — more than length/non-empty — but it tests fee math, not
    crypto vectors.
30. KNOT remains absent repo-wide (0 hits); `TapTweak` 0 hits;
    "three authorization" 0 hits; "three-authorization-branch"
    and "Genesis Trifold Taproot" as Omega concepts remain absent.

## 4. What the rebuild carries forward

- The branch reproduction (`docs/EXS_REPRODUCED_AUDIT_2026-11-23.md`)
  stands as the working record, with the corrections above applied
  wherever the branch cites the affected lines.
- The scope corrections are now load-bearing: Omega's Trifold
  must be designed from scratch; reuse of the legacy
  `genesis-fork/` hooks is not approved; the HTLC v1 design
  (`docs/EXCALOMEGA_HTLC_V1_DRAFT.md`) is a new Taproot-native
  design, not a reuse of the legacy structural HTLC.
- The two sound-as-specified pieces remain the sovereign-seed KDF
  definition and the Python Ω′ Δ18 kernel definition. Everything
  that turns the axiom into keys, tweaks, addresses, vaults, or
  signatures is being re-implemented in `omega/` with official
  BIP-340/341/350 vectors — that work is recorded in the rebuild
  spec, not in this reconciliation.
- The single NOT VERIFIABLE item (§3(c), btcd's 2nd-argument
  expectation) stays open as a documentation gap. It does not
  affect the rebuild: the replacement implementation does not call
  btcd at all.
