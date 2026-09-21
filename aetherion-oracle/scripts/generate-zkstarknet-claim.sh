#!/usr/bin/env bash
# Generate public/treasure/zkstarknet-mainnet-claim.json from stark-bridge proof.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SKYNT="${1:-${SKYNT_EXPORT_PATH:-}}"
SOLANA="${SOLANA_DEPLOY_WALLET:-}"
npx --yes tsx -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { buildZkStarknetMainnetClaim } from './src/lib/zkStarknetClaim.ts';
const stark = JSON.parse(readFileSync('public/treasure/stark-bridge-claim-1814332222_88b0.json','utf8'));
let skynt = null;
const p = process.env.SKYNT_PATH;
if (p) skynt = JSON.parse(readFileSync(p,'utf8'));
const claim = buildZkStarknetMainnetClaim(stark, skynt, process.env.SOLANA_WALLET ?? '');
writeFileSync('public/treasure/zkstarknet-mainnet-claim.json', JSON.stringify(claim, null, 2));
console.log('Wrote public/treasure/zkstarknet-mainnet-claim.json —', claim.amountEth, 'ETH');
" SKYNT_PATH="$SKYNT" SOLANA_WALLET="$SOLANA"
