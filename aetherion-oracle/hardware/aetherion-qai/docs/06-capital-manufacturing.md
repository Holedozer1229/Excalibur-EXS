# Capital & manufacturing path assessment — AQAI

**Verdict (best path):** Stay **fabless**. Fund **Soft Silicon → FPGA → MPW shuttle → EDGE chiplet** with a mix of **non-dilutive grants + angel/pre-seed**, not a captive fab. Owning a foundry is capital suicide at this stage.

## Options ranked

| Rank | Path | CapEx order | Dilution | Time-to-first-silicon | Fit for AQAI |
|------|------|-------------|----------|------------------------|--------------|
| **1** | **Fabless + MPW / shuttle** (TSMC OIP, GlobalFoundries, SkyWater, Europractice, MOSIS) | $0.5–5M to first test chips | Medium (angels + seed) | 12–24 mo after RTL freeze | **Best** |
| **2** | **FPGA Soft Silicon product** first (Caduceus API sells now) | <$200k | Low (Stripe founders + grants) | Weeks (software already live) | **Best wedge** |
| **3** | **Chiplet / OSAT partners** (CORE dielet + partner HBM/IO) | $5–30M | Series A+ | 24–36 mo | Scale path |
| **4** | **IDM / own fab** | $B+ | Impossible / sovereign only | 5–10 yr | **Reject** |
| **5** | **Pure crypto treasury / token raise for fab** | High risk | Regulatory + trust damage | Uncertain | **Reject for silicon CapEx** |

## Recommended capital stack (phase-aligned)

### Phase 0 — Soft Silicon (now)
- **Source:** Founder Stripe seats, oracle/product revenue, small angels ($25–100k checks)
- **Use:** Seal receipt standard, SDK, formal docs, FPGA bring-up plan
- **Goal:** Prove category demand *before* tape-out

### Phase 1 — Non-dilutive + pre-seed ($0.5–2M)
- **Grants:** NSF SBIR/STTR (AI + semiconductors), DOE ASCR / microelectronics, CHIPS Act related programs / state matching, EU Chips Act (if EU entity), DoD SBIR topics on verifiable AI / trusted compute
- **Angels / syndicates:** Deep-tech, semiconductor, defense, crypto×AI crossover angels
- **Use:** FPGA reference board, seal formal verify, first MPW reservation

### Phase 2 — Seed ($2–8M)
- **Investors:** Semiconductor-aware seed funds, corporate venture (foundry / OSAT / cloud)
- **Use:** EDGE SKU RTL freeze, PDK access, MPW + package + bring-up

### Phase 3 — Series A ($15–40M)
- **Use:** Production mask set, yield, CLOUD SKU, go-to-market for sealed inference

## Why not “raise a huge round and build chips tomorrow”

1. **No frozen PDK path yet** — RTL is simulation-first; foundries need process selection + design kit NDAs.
2. **Category is VCS (Verified Cognition Silicon)** — sell seals & Soft Silicon first; FLOPs war is a trap.
3. **Honesty:** Claiming fabricated die without tape-out destroys investor trust. Pitch Soft Silicon + fabless roadmap.

## Manufacturing startup process (deployable)

See [07-manufacturing-startup.md](07-manufacturing-startup.md) and the operator runbook under `funding/`.

## Global scale model

1. **Software / Soft Silicon** — global from day one (excaliburcrypto.com `/chipset`).
2. **EDGE** — regional distributors + module partners.
3. **CLOUD** — hyperscaler / sovereign cloud design wins.
4. **SOVEREIGN** — government / regulated deals (longer cycle, higher ASP).

## Decision record

**Adopted:** Fabless · Soft Silicon wedge · grants + angels for first silicon · MPW before production masks · never own a fab.
