# Genesis Fork BIPs

Formal specification documents for the EXCAL Genesis Fork (GSF) consensus
changes relative to Bitcoin. Numbered `GF-NN` to avoid collision with
Bitcoin's BIP series. Every rule below is verified against the reference
implementation (`genesis_fork.py`, `txscript.py`, `chainstate.py`,
`excal.py`) and, where noted, against live mainnet chain data.

| BIP | Title | Status |
|-----|-------|--------|
| [GF-01](GF-01.md) | Network identity and chain parameters | Active |
| [GF-02](GF-02.md) | Genesis anchor: byte-identical Bitcoin genesis | Active |
| [GF-03](GF-03.md) | Proof of work and difficulty adjustment | Active |
| [GF-04](GF-04.md) | Coinbase lineage rule (Flo marker) | Active |
| [GF-05](GF-05.md) | Coinbase v2: height push (BIP34 lesson) | Active |
| [GF-06](GF-06.md) | Issuance: subsidy and halving | Active |
| [GF-07](GF-07.md) | Transaction and script consensus subset (v2) | Active |
| [GF-08](GF-08.md) | Block validity: time, size, structure | Active |
| [GF-09](GF-09.md) | Testnet min-difficulty rule | Active |
| [GF-10](GF-10.md) | Replay protection and divergence | Active |

Conventions: "Active" means deployed on Genesis Fork mainnet and enforced
by the reference implementation. Hash and txid values are given in
display order (reversed sha256d), matching the reference code's
`txid()` / block-hash convention.
