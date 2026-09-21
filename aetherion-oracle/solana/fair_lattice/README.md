# Fair Lattice — Solana Program

Anchor program for the Aetherion fair bonding curve on Solana.

## Program ID

`ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6`

## Instructions

| Instruction | Purpose |
|---|---|
| `initialize_lattice` | Create lattice state PDA |
| `setup_pool` | Create wURUU mint + token/SOL vaults |
| `seed_vault` | Mint wURUU into curve vault (authority) |
| `buy` | SOL → wURUU at spot price (1% fee cap) |
| `sell` | wURUU → SOL at spot price |
| `record_attribute` | Referral volume PDA |
| `update_fee` | Lower fee (never above 1%) |

## Local development

```bash
# Terminal 1 — validator (required flags for Solana 4.x)
solana-test-validator --reset --clone-feature-set --url devnet

# Terminal 2 — build, deploy, test
cd solana/fair_lattice
anchor build
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator --provider.cluster localnet
```

Or from repo root:

```bash
CLUSTER=localnet ./scripts/deploy-solana.sh
./scripts/init-local-lattice.sh
```

## Devnet deploy

```bash
solana config set --url devnet
solana airdrop 2   # if needed
CLUSTER=devnet ./scripts/deploy-solana.sh
```

## On-chain curve note

Buy/sell use **spot price** at the current `tokens_sold` for BPF heap safety. The frontend calculator still quotes the full power-curve integral off-chain.
