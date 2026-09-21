# Investor targets & outreach

## Thesis for angels / pre-seed

**Verified Cognition Silicon** — Caduceus Soft Silicon live; fabless path to EDGE via MPW. Ask: **$1.5M SAFE** (or $25–100k angel checks into rolling close).

## Target segments

| Segment | Why | Example firm types |
|---------|-----|--------------------|
| Deep-tech angels | Hardware + novel physics | Ex-foundry, ex-NVIDIA/Intel operators |
| Semiconductor seed | Fabless pattern recognition | Chip-focused micro-VCs |
| Defense / dual-use | SOVEREIGN seal story | Defense tech angels (counsel first) |
| Crypto×AI | Sealed agents / oracles | Web3 funds that understand receipts |
| Corporate venture | Foundry / OSAT / cloud | Strategic, slower, useful for PDK intros |

## Rolling close checklist

- [ ] One-pager PDF from `pitch-deck.html` (print to PDF)
- [ ] Data room link: `/chipset` + `hardware/aetherion-qai/`
- [ ] SAFE template (counsel)
- [ ] Cap table snapshot
- [ ] Use-of-funds one slide

## Outreach email (angel)

**Subject:** AETHERION QAI — seal-native AI silicon (Soft Silicon live)

Hi {Name},

We're building **Verified Cognition Silicon** — accelerators that prove what they ran. Caduceus Soft Silicon and the AQAI ISA are live at https://www.excaliburcrypto.com/chipset (design/simulation today; fabless MPW path next — we do not claim shipping die yet).

**Ask:** {CHECK_SIZE} toward a ${TOTAL} pre-seed for FPGA + first MPW.

Deck: attached / {DECK_LINK}  
Lab: /chipset  

If verifiable inference is on your thesis, happy to send the one-pager and book 20 minutes.

— {FOUNDER}

## Outreach email (seed fund)

**Subject:** Fabless VCS — Caduceus Soft→Hard continuity

{Partner},

Category: **Verified Cognition Silicon**. Moat is architectural unity (seal + twin-pipe + skin/EP + PoM), not FLOPs. Soft Silicon opcode map matches planned die (axiom 8).

Traction: live control plane + RTL package. Raise: $1.5M SAFE → FPGA seal demo + shuttle.

Materials: pitch-deck.html · docs/06-capital-manufacturing.md

## What we will not claim in outreach

- Fabricated AQAI die in production  
- Spendable 137 ETH / vacuum profit as chip CapEx  
- Guaranteed CHIPS Act award  

## Send pipeline

```bash
# Dry-run (default): writes public/treasure/aqai-funding-outreach.json
node scripts/aqai-funding-outreach.mjs

# Live SMTP send only when configured:
# AQAI_OUTREACH_LIVE=1 SMTP_HOST=... SMTP_USER=... SMTP_PASS=... SMTP_FROM=...
node scripts/aqai-funding-outreach.mjs
```
