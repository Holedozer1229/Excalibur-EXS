# Caduceus CryptoX z Tetra — Advanced Schnorr

**Honesty:** Soft Silicon + RTL simulation stub. BIP340 math is exact in TypeScript (`@noble/secp256k1`); the die lane is **not** a full EC accelerator claim.

## Role on chip

| Block | Function |
|-------|----------|
| `caduceus_schnorr.sv` | Fixed-width verify handshake stub (32 B pk, 64 B sig) |
| `CAD.SCHNORR` | Paradigm ISA opcode — verify bit → `rd` |
| `seal_ioc` | Commits seal-bound Schnorr attestations |
| Tetra-PoW rail | Dual-secp commitment + block hash message bind |

CryptoX z Tetra names the **seal-native signature lane** on AQAI-IOC: compact Schnorr receipts for Tetra-PoW miner attestations, Caduceus seal commits, and Taproot-compatible x-only keys.

## Algorithm features (Soft Silicon)

| Feature | Implementation |
|---------|----------------|
| BIP340 Schnorr | `signSchnorr` / `verifySchnorr` — secp256k1, x-only pubkeys |
| Batch verify | Random linear combination + individual fallback |
| MuSig hooks | `musigStartSession`, `musigAggregatePubkey`, partial combine |
| Taproot | `taprootTweakPubkey` — `TapTweak` tagged hash |
| Tetra attestation | `signTetraAttestation` — `tetra-pow\|chain\|block\|dualCommitment` |
| Caduceus seal bind | `caduceusSealMessage` — SHA-256 seal digest as 32 B message |
| Fixed-width | 32 B keys, 64 B signatures; `assertFixedWidth` guards |

Source: `src/lib/qai/caduceusSchnorr.ts`

## ISA

| Mnemonic | Fun | Semantics |
|----------|-----|-----------|
| `CAD.SCHNORR rd, rs1, rs2` | `0x11` | Verify BIP340 sig at `[rs2)` against msg at `[rs1)`; `rd ← 1` if valid |

Added to `docs/01-isa.md`, `asm/caduceus.inc`, and `qai_core.sv` stub (`gate_out` parity).

## Pipeline

```
CAD.SEAL ──► seal digest (32 B)
                │
                ▼
         CAD.SCHNORR ──► verify bit
                │
                ▼
         CAD.VERIFY / seal_ioc
                │
                ▼
    Tetra-PoW attestation (dual-secp commitment)
```

## Lab

`/chipset` → **Run Caduceus Schnorr** — trace lines from `caduceusSchnorrTraceLines()`.

Tests: `src/lib/qai/caduceusSchnorr.test.ts`

## What is not claimed

- Constant-time EC math in JavaScript or this RTL stub
- Hardware MuSig2 nonce protocol on die
- Mainnet broadcast or live Tetra coinbase signing from the lab key
