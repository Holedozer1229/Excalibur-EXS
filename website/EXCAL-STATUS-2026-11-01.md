# EXCAL — Live status, 2026-11-01
- Fork chain: live, anchored to Bitcoin block 968,698 header (fork block 0).
- Units: EXCAL, 1 EXCAL = 100,000,000 swords. Subsidy 50 EXCAL, halving 210,000, cap 21,000,000.
- Locks: PKH (0x00), OPEN (0xff), PQH quantum-safe (0x02, activation 25212, spent-leaf registry guard live), HTLC (0x03, activation 36010).
- Boundary DAA: fork only, from 29,700, retarget at 60-block boundaries only.
- Fusion / Golden Stone: height 50,000 ONLY must contain 1 EXCAL to fusion PQH lock 02ca2b0a17ca7e6ac8cb275dfaefe45ff160aa32ae. Fusion UTXO verified on the fork.
- HTLC: deployed and activated on the fork. No live HTLC swap executed yet.
- BTC maker HTLC: draft only, tests 48/48, NOT live. No publicly verifiable completed EXCAL/BTC atomic swap yet.
- Solo mining: live pool jobs tested on solo.ckpool.org, worker bc1qj37xg5qmyedwfe70cz0f385cxmf6642kcznjdg (used in tests; confirm before any indefinite run). No solo block found in these tests.
- Source: genesis-fork/ in this repo (live code synced 2026-11-01). Older Go/Rust Excalibur-EXS code remains in pkg/, blockchain/, contracts/ — separate components, not the Python fork chain.
