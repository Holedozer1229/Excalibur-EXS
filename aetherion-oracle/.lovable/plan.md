
## What the numbers actually say (last 30 days)

| Metric | Value | What it means |
|---|---|---|
| `auth_started` sessions | **163** | People DO show up with intent |
| `auth_completed` sessions | **4** (2.4%) | The auth screen is the cliff |
| `lp_visit` events | 4 | `/lp` is unused — almost all traffic hits `/` or `/auth` directly |
| `lp_cast_started` / `completed` | 2 / 2 | Free-cast funnel is basically untracked |
| Anonymous tarot casts (distinct IPs) | **2** | Almost nobody discovers the free cast |
| Waitlist signups | 0 | The waitlist surface isn't pulling weight |
| Profiles / paid | 17 / 3 | Conversion exists but volume is tiny |
| Receipts (30d) | 57 | Mostly from the 17 existing users repeating |

**Verdict:** the bottleneck is **discovery of the free, no-signup cast** + **auth-screen abandonment**. Token design is not the problem — activation is.

---

## The repositioning

Top-level identity becomes **Aetherion — Verifiable AI Artifacts**. Tarot stays the flagship artifact type; Dreams and Oracle become sibling artifact types under the same protocol. Token narrative cleans up to match.

```text
                Aetherion Protocol
          "Verifiable AI Artifacts"
        sealed · wallet-bound · replay-protected
                       │
   ┌───────────────────┼───────────────────┐
 Tarot              Dreams              Oracle Q&A
 (ATART)            (ATART)             (ATART)
                       │
            ┌──────────┴──────────┐
       SKYNT (ERC-20)        AETX (BRC-20)
       ownership /           consumable fuel
       staking / gov         + premium seal
                             ATART = the artifact receipt itself
```

---

## Build plan

### 1. Homepage + `/lp` repositioning (umbrella, tarot as product)
- New hero copy: **"Verifiable AI artifacts. Sealed. Wallet-bound. Replay-protected."** with sub: "Try it with a free tarot reading — no signup."
- Add `<ArtifactTypesStrip>` directly under hero: 3 cards — Tarot (live), Dreams (live), Oracle Q&A (live) — each links to its product page.
- Add `<FoundersStrip>` above the fold: $5.99/mo founder price, $49.99 strikethrough, "X / 500 founder seats remaining" (computed live from `subscribers` where tier='acolyte'), sealed-readings-today counter.
- Inline "ask the deck" input on `/` (same component as `/lp`) so the free cast is one keystroke from landing — kills the discovery problem.
- Update `<Helmet>` title/description/OG across `/`, `/lp`, `/tarot` to lead with "Verifiable AI Artifacts."

### 2. Kill the auth cliff (the 2.4% problem)
- `/tarot` free cast must complete end-to-end with **no auth wall**. Audit `Tarot.tsx` — currently anonymous quota is 1/day per IP which is why only 2 IPs ever cast. Either raise to 3/day per IP or remove the gate for the first cast entirely.
- Replace the mid-flow auth gate with a **post-reading soft prompt**: after the artifact is sealed, show "Your artifact is sealed (nonce `abc…`). Sign up free to claim it on-chain forever + get 15 invocations." The reading itself is never blocked.
- On `/auth` Sign Up screen, add a 3-line "what you get" block: free reading already claimed, founder seat, AETX airdrop eligibility.
- Add Google OAuth as the primary button (one-tap), email fallback secondary.

### 3. AETX activation — both pathways

**a) Claim funnel (acquisition lever)**
- New page `/claim/aetx` — public, indexable.
- Flow: enter BTC address → eligibility check (signup required, 1 reading completed) → reserves N AETX → confirmation page with claim hash.
- New edge function `aetx-claim` (service-role): validates the user, checks `aetx_claims` table for prior claim by user_id or btc_address, inserts row with `status='pending'`, returns claim id. Admin/cron processes the BRC-20 transfer (mirror of `tart-claims-worker` pattern).
- Schema: `aetx_claims (id, user_id, btc_address, amount, status, tx_hash, created_at, processed_at)` + grants + RLS (`user_id = auth.uid()` for select/insert).
- Add `/claim/aetx` to sitemap + nav.

**b) Consumable fuel (depth lever)**
- New `aetx_balances` view derived from a `aetx_ledger` table (mirrors `tart_ledger`): airdrop credits AETX, casting "premium seal" burns 1 AETX.
- On `/tarot`, add an optional **"Premium Seal — burn 1 AETX"** toggle. When toggled, the resulting receipt gets `premium_seal=true` (new column on `divination_receipts`) and a gold sigil on the verify page.
- DB function `burn_aetx_for_seal(_user_id, _receipt_id)` — idempotent on `receipt_id`.
- Free users can still cast; AETX just adds a visible status layer.

### 4. SKYNT / ATART / AETX narrative page
- New page `/tokens` (or rewrite `/token/aetx`) with the three-token diagram and one-line role for each:
  - **SKYNT** — ownership, staking, governance, premium gateway.
  - **ATART** — artifact receipt (1 per verified reading).
  - **AETX** — fuel for premium seals + founder airdrop.
- Cross-links from homepage footer + nav.

### 5. Funnel instrumentation fixes
- `lp_visit` only fires on `/lp`; the homepage isn't tracked. Add `useUtm("home_visit")` to `Index.tsx` and a new `home_cast_started` event when the inline cast form submits from `/`.
- Track `signup_completed_post_reading` separately from generic `auth_completed` so we can measure whether the soft prompt works.
- Add events: `aetx_claim_started`, `aetx_claim_completed`, `premium_seal_burned`.
- Extend admin `/admin/funnel` dashboard with: auth-screen completion rate, free-cast → signup rate, AETX claim funnel.

---

## Technical notes

- All schema changes via migration tool with `GRANT` + RLS in the same migration.
- AETX claim edge function: `verify_jwt = false` in code (use `supabase.auth.getUser(token)` inside), CORS via `npm:@supabase/supabase-js@2/cors`, Zod on inputs.
- No new secrets needed — reuse existing Supabase + Stripe wiring.
- Don't touch `client.ts`, `types.ts`, or `config.toml` env blocks.
- Sitemap + robots updated for `/claim/aetx`, `/tokens`.

---

## Out of scope (intentionally)

- No rewriting of the cryptographic seal protocol — it works.
- No new SKYNT contract work — the token is fine; we're fixing the funnel feeding it.
- No mobile rewrap — Capacitor build stays as-is until web conversion lifts.
- No multi-modality artifact types (image / code / voice receipts) yet — that's the v2 of "verifiable AI artifacts" once tarot proves the funnel.

---

## Order of operations once approved

1. Funnel instrumentation + auth-cliff fix (highest leverage, smallest diff).
2. Homepage repositioning + Founders strip + inline cast.
3. AETX claim page + edge function + ledger.
4. Premium seal burn flow.
5. `/tokens` narrative page.
6. Publish.
