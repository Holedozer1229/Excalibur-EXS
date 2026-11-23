# EXS Security Rebuild Specification (Draft 0.1)

**Status:** Draft architecture and release gate. Not a consensus specification.  
**Target:** A future, independent ExcalOmega (EXS) network.  
**Compatibility:** This document does not authorize changes to the existing EXCAL chain, its history, consensus, wallet formats, signatures, or spend rules.

## 1. Executive decision

The current EXS repository must be treated as a research prototype until the cryptographic and consensus paths are independently rebuilt and verified. The reported read-only audit identifies critical defects and contradictory specifications. Those findings are recorded as reported findings pending reproduction against a pinned commit; this document does not claim that every finding has been independently reproduced.

**Do not mine, fund, advertise as spendable, or launch an ExcalOmega genesis from the current implementation.** Do not send funds to addresses produced by the existing vault, wallet, foundry, or Taproot demo paths.

The rebuild is a clean, reviewable implementation. Existing code may be retained only after its behavior is isolated, specified, and shown to pass independent tests. A passing legacy self-test is not evidence of BIP-340/341 conformance or production security.

## 1A. Progress log — 2026-11-23 (PR #67)

What changed on this branch, and what it does and does not prove:

- **Audit reproduced twice, reconciled.** The branch reproduction
  (`docs/EXS_REPRODUCED_AUDIT_2026-11-23.md`) and an independent
  reproduction agree on substance: 48 of 67 finding-level claims
  CONFIRMED, 19 CORRECTED (line numbers, attribution, search
  scope, two kernel-description errors), 0 NOT FOUND, 1 partially
  NOT VERIFIABLE (btcd's `ComputeTaprootOutputKey` 2nd-argument
  expectation — no vendored btcd in-tree). No CRITICAL/HIGH
  finding was refuted. Reconciliation:
  `docs/EXS_AUDIT_RECONCILIATION_2026-11-23.md`.
- **Reference primitives implemented (`omega/`, stdlib-only
  Python).** BIP-340 Schnorr, BIP-341 Taproot, BIP-350 Bech32m,
  CSPRNG-only key generation, and the HTLC v1 commitment. The
  suite (`tests/test_omega_*.py`, 45 tests total with the two
  pre-existing vector files) passes: all 19 official BIP-340
  vectors, all 7 official BIP-341 wallet vectors (scriptPubKey +
  key-path spending), official BIP-350 Bech32m vectors, and the
  pinned HTLC v1 vector extended to the full Taproot commitment.
- **Domain registry published** (`docs/EXS_DOMAIN_REGISTRY_V0_1.md`):
  adopted BIP tags, the frozen prophecy candidate, and the
  forbidden constructions (axiom-derived keys, XOR tweaks,
  fabricated addresses, timestamp "signatures", float consensus).
- **Draft network parameters published**
  (`docs/EXS_NETWORK_PARAMETERS_DRAFT_0_1.md`): provisional HRPs
  `exs` / `texs`, NUMS internal key pinned, chain ID / magic /
  genesis unassigned, genesis/supply contradictions recorded
  unresolved.
- **HTLC v1 commitment completed** (serialization layer only):
  NUMS internal key pinned, tweak/output key/control block/
  scriptPubKey/draft-HRP address computed and recorded in
  `spec/vectors/htlc_v1_script.json`.

What this does NOT prove: `omega/` is reference code — not
constant-time, not independently reviewed, not production custody.
BIP-342 tapscript execution, Trifold/FROST, consensus/PoW
selection, genesis construction, node/P2P, and chain-backed
Rosetta are all still open. The unsafe legacy paths
(`warchest_vault.py`, `forge_treasury_key.py`,
`cmd/exs-wallet/wallet_cli.py`, `pkg/foundry/exs_foundry.py`,
`pkg/bitcoin/taproot.go`) are NOT fixed and remain blocked; they
are replaced, not repaired, by `omega/`.

## 2. Hard safety invariants

1. Public prophecy words, public genesis parameters, timestamps, nonces, hashes, and public repository contents MUST NOT be used as entropy or passwords for private keys.
2. No private key, seed phrase, recovery share, or secret scalar may be printed, logged, committed, returned by an API, or included in a genesis artifact.
3. Key generation MUST use an operating-system cryptographically secure random number generator or a reviewed hardware signer. Deterministic derivation is permitted only from a genuinely secret, high-entropy input and a specified, reviewed KDF.
4. The 13-word prophecy is public protocol data / a human-readable axiom only. It is not a seed phrase, password, signing key, or source of private-key entropy.
5. No fabricated address encoding is permitted. An address is valid only if decoded and validated by an independent implementation against the specified network parameters.
6. No funds or token allocations may be created until supply, issuance, premine, treasury, and genesis-output rules are resolved in one signed-off specification.
7. Existing EXCAL consensus, signatures, wallets, and chain state remain untouched. ExcalOmega is a separate network with a distinct network identifier and genesis commitment.
8. Every consensus-critical operation MUST be deterministic across supported implementations. Floating-point arithmetic MUST NOT affect consensus.
9. Unknown, malformed, non-canonical, or unsupported encodings MUST fail closed.
10. Cryptographic claims MUST name the exact primitive, construction, version, and test vectors. Terms such as “quantum-proof,” “unbreakable,” and “100% secure” are prohibited.

## 3. Protocol domains and canonical serialization

Before implementation, publish a versioned protocol registry. Every hash, signature message, KDF context, transaction identifier, and commitment MUST have a unique domain tag, including a protocol name and version. Domain tags are literal byte strings and are not interchangeable.

The canonical wire format remains **UNSELECTED** in this draft. Candidate formats must be evaluated for deterministic encoding, integer-width rules, duplicate-key rejection, canonical map ordering, parser interoperability, and test-vector support. No implementation may silently mix JSON, ad-hoc concatenation, CBOR, or language-specific object serialization.

The final specification MUST define:
- byte order and fixed widths for every integer;
- signed-integer representation and overflow behavior;
- length prefixes and maximum lengths;
- text normalization policy (preferably avoid text in consensus-critical fields);
- hash output lengths and exact hash composition;
- canonical transaction, block-header, prophecy, and genesis encodings;
- rejection behavior for trailing bytes, duplicate fields, non-minimal encodings, and unknown critical fields.

No hash may be computed from ambiguous string concatenation. Structured inputs must be encoded canonically before hashing.

## 4. Prophecy commitment

The prophecy is a public, immutable protocol statement, not a secret.

A single canonical prophecy commitment function MUST be selected and specified. The current repository reportedly contains multiple incompatible prophecy encodings and a timestamp-dependent pseudo-signature; none may be treated as canonical until independently replaced.

The commitment specification must state:
- exact UTF-8 / byte representation and normalization rules;
- exact domain tag and protocol version;
- canonical serialization;
- digest algorithm and output length;
- whether the commitment is a genesis field, transaction field, or both;
- how upgrades introduce a new prophecy version without changing historical interpretation.

A prophecy digest is a commitment to bytes. It is not proof that the prophecy is true, author-approved, secret, or signed by a particular person.

## 5. Wallet and signing architecture

### 5.1 Key creation and custody

- Generate signing keys from secure random entropy using a reviewed library.
- Separate consensus identity, user wallet keys, treasury keys, recovery keys, and operator keys.
- Never derive a signing key from the public prophecy, genesis seed, block hash, nonce, timestamp, or public salt.
- If encrypted backups are supported, use a reviewed password-based KDF with unique random salt and calibrated parameters, followed by authenticated encryption. Hashing a seed is not encryption.
- Use authenticated encryption with explicit versioning and associated-data binding. Do not invent encryption or XOR-based key tweaks.
- Secret material must be zeroized where practical and excluded from logs, crash reports, analytics, and test fixtures.
- Wallet files must have a documented schema, integrity protection, backup/restore tests, and clear recovery semantics.

### 5.2 BIP-340 / BIP-341 claims

No Taproot or Schnorr compatibility claim is permitted until the implementation:
- implements BIP-340 Schnorr signing and verification through a reviewed secp256k1 implementation;
- implements BIP-341 Taproot tagged hashes and tweak calculation exactly;
- validates x-only public keys and scalar/point ranges;
- handles key-path and script-path commitments correctly;
- implements Bech32m address encoding/decoding with the EXS network HRP, without borrowing Bitcoin mainnet/testnet prefixes;
- passes official BIP-340 and BIP-341 vectors, plus negative, boundary, malformed, and cross-implementation tests.

A public address generator that discards the corresponding private key is not a usable vault. A demo P2WPKH address is not a Taproot address. A hash passed as a Merkle root is not a substitute for a correctly specified TapTweak construction.

### 5.3 Trifold authorization and recovery

“Genesis Trifold Taproot” is an unimplemented design requirement, not an existing verified feature. It must be specified separately before code is written.

The design review must define:
- the three independent authorization roles and who controls them;
- threshold policy (for example 2-of-3 or 3-of-3), including why it is chosen;
- key generation / distributed key generation, share refresh, backup, rotation, revocation, and recovery;
- nonce generation and reuse prevention for threshold signing;
- signer independence, compromise assumptions, liveness, and operator replacement;
- key-path and script-path behavior, timelocks, emergency recovery, and fee / dust handling;
- exact spending policy and test vectors.

Do not call a scheme FROST-compatible unless the exact ciphersuite, DKG, signing protocol, nonce handling, and interoperability tests conform to a reviewed specification. A three-branch policy is not automatically a three-party threshold signature.

## 6. Consensus and proof of work

The current repository reportedly contains multiple incompatible Tetra-PoW / Ω′Δ18 implementations and a dice-adjusted difficulty path. No implementation is selected as consensus in this draft.

Before consensus implementation:
1. Choose one fully specified PoW algorithm and one canonical byte-level input.
2. Define genesis and non-genesis header serialization, target encoding, target comparison, difficulty retargeting, timestamps, nonce width, and overflow behavior.
3. Define chain selection, reorg limits (if any), block validity, transaction ordering, and activation rules.
4. Eliminate floating-point operations from consensus. Use exact integer or rational arithmetic with explicit rounding.
5. Ensure miners cannot alter difficulty by PRNG output or other non-consensus randomness.
6. Provide independent reference implementations and cross-language known-answer vectors.
7. Run adversarial tests for boundary targets, overflow, timestamp manipulation, duplicate blocks, malformed headers, and reorgs.

The previously described Python Ω′Δ18 path and seed KDF are candidates for further examination only. Their reported internal consistency does not establish security, uniqueness, fairness, ASIC resistance, quantum resistance, or suitability as consensus.

## 7. Genesis and monetary policy — BLOCKING

The repository is reported to contain contradictory supply and genesis descriptions, including no-premine language versus a 50 EXS genesis output / warchest path, and conflicting allocation schedules.

Genesis MUST remain unmined and unfunded until a single approved document defines:
- total supply and maximum supply;
- issuance schedule and reward calculation;
- premine policy (explicitly zero or a fully disclosed amount);
- treasury / warchest existence, ownership, spend policy, and recovery;
- genesis transaction outputs and destination-key proof of control;
- founder, developer, validator, and community allocations, if any;
- vesting, lockups, and unlock conditions;
- fee policy and dust thresholds;
- treatment of lost keys and unspendable outputs;
- chain ID, network magic, address HRP, genesis timestamp, and genesis hash derivation.

A “no premine” statement and a funded genesis vault cannot both describe the same genesis. No allocation is real until it is encoded in the canonical genesis transaction and independently reproduced.

## 8. Smart contracts, locks, and interoperability

CLTV / HTLC / KNOT functionality is not considered complete based on a partial script or a structural test. Each supported opcode and script path needs exact semantics, boundary vectors, interpreter tests, and spend tests. Numeric encoding must handle sign bits and maximum values correctly.

Rosetta support is a separate integration milestone. A server with mock block heights, balances, or empty transactions is not a chain-backed Rosetta implementation. A production claim requires complete supported Data and Construction endpoints, real node integration, network/status/block/account/transaction consistency, error semantics, and external Rosetta conformance testing.

## 9. Required test and review gates

A release candidate MUST pass all gates below. Tests must be reproducible from a clean checkout and pinned toolchain.

| Gate | Minimum evidence |
|---|---|
| Serialization | Canonical vectors, malformed input rejection, cross-language byte equality |
| Hashing | Domain-separation vectors, boundary and mutation tests |
| Wallet | Secure random key generation, authenticated backup/restore, no secret leakage |
| Schnorr | Official BIP-340 vectors and independent implementation agreement |
| Taproot | Official BIP-341 vectors, tweak edge cases, Bech32m round trips |
| Trifold | DKG/signing/recovery vectors, nonce-reuse tests, signer-failure tests |
| Consensus | Header/block vectors, target boundaries, deterministic integer arithmetic |
| Genesis | Independent genesis hash reproduction and allocation reconciliation |
| Network | Multi-node sync, fork/reorg, restart, persistence, adversarial P2P tests |
| Rosetta | Real-node integration and external conformance tests |
| Security | Independent cryptographic review and remediation of critical/high findings |

The test suite must include negative vectors: wrong domain, wrong network, wrong key, malformed signature, invalid tweak, zero/out-of-range scalar, truncated payload, duplicate field, non-canonical encoding, expired/revoked policy, and altered evidence.

A test passing proves only the tested property under the tested conditions. It does not prove the system secure in general.

## 10. Reported audit findings — reproduction required

The following categories were reported in a read-only audit supplied by the project owner. They are **not independently reproduced by this document** and must be checked against a pinned commit with file/line references:

- incompatible prophecy commitments and timestamp-derived pseudo-signatures;
- public prophecy/genesis material used to derive private-key-like values;
- fabricated or unspendable wallet/vault addresses and discarded private keys;
- incorrect or incomplete BIP-340/341 / Taproot handling;
- inconsistent PoW implementations and floating-point consensus arithmetic;
- dice-derived difficulty behavior;
- incomplete CLTV / absent or incomplete HTLC/KNOT paths;
- mock rather than chain-backed Rosetta endpoints;
- conflicting genesis supply, premine, and allocation documents;
- missing official cryptographic test vectors.

Each reproduced finding must become a tracked issue with severity, affected commit, exact file/line range, exploitability, remediation commit, and regression test. Do not erase or rewrite historical findings; close them only with evidence.

## 11. Implementation sequence

1. Pin and archive the audited repository commit; reproduce the reported findings read-only.
2. Freeze unsafe wallet, treasury, vault, prophecy-key, and genesis-funding paths.
3. Resolve genesis economics and protocol identity before choosing a genesis hash.
4. Publish canonical serialization, domain registry, hash, and prophecy-commitment vectors.
5. Implement secure wallet/key custody and reviewed Schnorr/Taproot primitives.
6. Specify and implement Trifold authorization/recovery with independent review.
7. Select and implement one deterministic consensus/PoW path.
8. Implement genesis construction and independent genesis reproduction.
9. Implement node, P2P, persistence, and chain-backed Rosetta.
10. Run the full test matrix, external review, testnet, and incident/recovery drills.
11. Only then consider a separately announced mainnet genesis.

## 12. Explicit non-goals and claims policy

This draft does not:
- modify or migrate the existing EXCAL chain;
- establish that any current EXS address is spendable;
- certify the existing implementation;
- prove the 13-word prophecy;
- establish quantum resistance;
- guarantee Coinbase listing, exchange support, token value, or commercial success;
- authorize treasury funding, token sale, premine, or genesis mining.

**Release principle:** No genesis without reproducible vectors. No funds without demonstrated spendability. No security claim without independent verification.


## HTLC is a first-class ExcalOmega feature

The proposed native Taproot claim/refund contract is specified in [`EXCALOMEGA_HTLC_V1_DRAFT.md`](EXCALOMEGA_HTLC_V1_DRAFT.md), with a pinned script/TapLeaf vector in [`spec/vectors/htlc_v1_script.json`](../spec/vectors/htlc_v1_script.json) and serialization tests in [`tests/test_htlc_v1_vectors.py`](../tests/test_htlc_v1_vectors.py). This is a proposed design, not an implementation or activation. The legacy `genesis-fork/` structural HTLC is historical research and is not reused as the normative Omega design. Genesis remains blocked until BIP-340/341/342 implementation, NUMS internal-key construction, control-block validation, and cross-language vectors pass independent review.

Status 2026-11-23: the BIP-340/341 implementation and the NUMS
internal-key construction now exist as reference code (`omega/`,
all official BIP-340/341/350 vectors passing), the control block
is validated against the pinned vector, and the full Taproot
commitment (tweak, output key, scriptPubKey, draft-HRP address)
is recorded in the vector file. Still open: BIP-342 tapscript
execution, the TapSighash construction for the HTLC leaf,
claim/refund spend tests, cross-language vectors, independent
review, and activation.
