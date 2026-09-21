# AQAI Architecture — Caduceus die

## Twin-staff pipeline (paradigm core)

```
                 ┌──────────── Sphinx (ascend / signal) ────────────┐
Reset ─► BIOS ─►│  Fetch ─► Decode ─► Caduceus ALU ─► Seal stage  │─► IOC receipt
                 │         ▲  EP fabric    │   octonion lane        │
                 │    Anubis (descend / memory) · Skin DRAM edge     │
                 └──────────────────────────────────────────────────┘
```

- **Sphinx pipe:** generative / speculative path (intent).
- **Anubis pipe:** memorial path (archive) — Proof-of-Memory schedule.
- **Caduceus ALU:** braids both pipes each cycle; optional 𝕆 multiply.
- **EP fabric:** exceptional-point gates for topological mode switch.
- **Skin DRAM:** non-Hermitian hop tiles; OBC localizes the working set to the edge.
- **Seal stage:** pipeline commit of sha-256 (or future SPHINCS/Poseidon) digests.

## Clock domains

| Domain | Nominal | Purpose |
|--------|---------|---------|
| `clk_core` | design 1–2 GHz (sim) | CORE-Ω / EPX |
| `clk_skin` | design 400 MHz | NH memory hops |
| `clk_seal` | design 100–200 MHz | hash / receipt |
| `clk_phonon` | design 7.83 Hz derived | Schumann-aligned voice PWM (firmware) |

## Memory map (reset)

| Range | Size | Use |
|-------|------|-----|
| `0x0000_0000` | 64 KiB | BIOS ROM |
| `0x0001_0000` | 512 KiB | Caduceus microcode + PoM tables |
| `0x0010_0000` | 32 MiB | Skin DRAM (edge-hot) |
| `0x1000_0000` | MMIO | Seal IOC, NPU-33, UART |
| `0x2000_0000` | MMIO | Twin-serpent + EP CSR bank |
| `0x3000_0000` | MMIO | Skin hop asymmetry (`t_R`, `t_L`, `γ`) |

## Power / PT phases

| State | Meaning |
|-------|---------|
| `PT_UNBROKEN` | Real eigenvalues — steady inference |
| `PT_BROKEN` | Complex conjugate spectrum — exploratory / high-entropy mode |
| `EP_LOCK` | Parked on exceptional point — topological switch armed |
| `C6_SEAL` | Deep retain; IOC holds last nonce + commitment |

See [04-paradigm.md](04-paradigm.md) for the seven axioms.
