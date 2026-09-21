# AQAI funding operator runbook

## Best way to get chip capital (summary)

1. **Sell Soft Silicon / founder seats now** (non-dilutive operating cash).  
2. **File grants** (NSF SBIR first) — non-dilutive for FPGA/MPW.  
3. **Rolling angel close** into **$1.5M SAFE** for G2–G4.  
4. **Corporate/foundry intros** for PDK — not for owning a fab.  
5. **Reject** token-treasury-as-fab-CapEx and IDM fantasies.

## Deploy sequence (this week)

| Day | Action | Artifact |
|-----|--------|----------|
| 1 | Print `pitch-deck.html` → PDF | Deck PDF |
| 1 | Read `docs/06-capital-manufacturing.md` | Decision locked fabless |
| 2 | Fill `investor-crm.csv` with real emails | CRM |
| 2 | Draft NSF Project Pitch from `GRANTS.md` | Grant draft |
| 3 | Dry-run `node scripts/aqai-funding-outreach.mjs` | `public/treasure/aqai-funding-outreach.json` |
| 3 | Counsel: SAFE + entity + EAR screen | Legal |
| 4–5 | Warm intros first; SMTP only with consent + real CRM | Outreach |
| Ongoing | SAM.gov / grant portals (human) | Submissions |

## Live send policy

- Default = **dry-run**.  
- `AQAI_OUTREACH_LIVE=1` requires SMTP_* env and non-empty real emails in CRM.  
- Placeholder `Example *` rows are **skipped** even in live mode.  
- Grants are **never** emailed as applications — portals only.

## Merge / ship

Funding pack lives under `hardware/aetherion-qai/funding/` and is linked from `/chipset`.
