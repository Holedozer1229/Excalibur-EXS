# FUSION — Repository Map

This repository is the fusion point of three distinct projects. They share
a roof, not an identity. Each subtree keeps its own README, its own
history, and its own honest scope.

## What lives where

| Path | Project | What it is |
|---|---|---|
| `/` (root) | **Excalibur-EXS** ($EXS) | The Excalibur Anomaly Protocol: Proof-of-Forge / Tetra-PoW chain, contracts, miners, forge UIs, and the neon-noir website (`website/`, served at www.excaliburcrypto.com). |
| `genesis-fork/` | **Genesis Fork** (GSF) | Standalone pure-Python UTXO chain node (EXCAL) + its Rosetta (Mesh) Data/Construction API adapter. Listed in the Coinbase Mesh ecosystem. |
| `aetherion-oracle/` | **Aetherion Oracle** | Vite + React + TypeScript oracle application (sealed tarot/dreams/oracle, Caduceus control plane). Build with `npm run build`; output `dist/`. |

## Honest boundaries

- **$EXS ≠ GSF.** Excalibur-EXS and Genesis Fork are separate assets on
  separate chains. The Rosetta/Mesh listing covers Genesis Fork (GSF) only
  and implies no listing or endorsement of anything else.
- **The oracle app is not wired into the website yet.** `aetherion-oracle/`
  is a source tree; serving it from www.excaliburcrypto.com requires a
  Vercel build step (`npm run build` → `dist/`) that the current
  static-site `vercel.json` does not perform. The site's oracle CTAs point
  at the in-repo static oracle page (`/web/knights-round-table/oracle.html`)
  until that build wiring is done.
- **Excluded from the fused subtree:** the source repo's committed
  `.env`, `.env.development`, `.env.production` files were NOT carried
  over. They contain client tokens that should be rotated; see the audit
  note in the fusion report. Provide your own env when building.
- **`genesis-fork/` is untouched by this fusion** — its chain data and
  consensus code were not modified.

## Website repairs shipped with this fusion (branch `fusion/aetherion-oracle`)

- `website/index.html`: removed dead `wormhole-das-uejpylwx.manus.space`
  links (verified HTTP 404); the nav CTA now points to the in-repo oracle
  page. Added the missing `id="prophecy"` anchor target the nav linked to.
- `web/knights-round-table/index.html`: `href="oracle"` → `href="oracle.html"`
  (extensionless link 404s on plain static hosts; Vercel's cleanUrls masked it).
- `web/knights-round-table/oracle.html`: `href="index"` → `href="index.html"` (same reason).
- `index.html` (root redirect stub): moved the Google Fonts `@import` above
  the style rules (browsers ignore `@import` placed after other rules).

Design untouched: the neon-noir cyberpunk portal keeps its exact look.
