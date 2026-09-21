"""Sovereign $EXS chain tokenomics — the executable on-chain policy spec.

Authoritative numbers (published at website/index.html, branch main):

  * Max supply: 21,000,000 EXS
  * Forge (block) reward: 50 EXS, halving every 210,000 blocks
  * Per-forge allocation: 60% PoF miners / 20% liquidity / 15% treasury /
    5% airdrop
  * Treasury tithe: 1% of every forge reward
  * Forge fee: 0.0001 BTC (settled on Bitcoin — recorded here as a constant;
    Bitcoin-side settlement is out of scope for this module)
  * Treasury: 12-month rolling release
  * No premine: the genesis forge pays no one; "shares are fixed at
    genesis — none minted for founders"

All monetary math is integer math in base units. 1 EXS = 100_000_000 base
units (EXS_SATS), satoshis-style. Nothing is invented here: every constant
below traces to the site-published numbers above.

Pure Python, stdlib only.
"""

from __future__ import annotations

from decimal import Decimal

# ---------------------------------------------------------------------------
# Base units
# ---------------------------------------------------------------------------
#: Indivisible base unit of the chain, satoshis-style: 1 EXS == EXS_SATS.
EXS_SATS = 100_000_000

# ---------------------------------------------------------------------------
# Supply schedule
# ---------------------------------------------------------------------------
#: Nominal maximum supply, in whole EXS (site: "21,000,000 Max Supply $EXS").
MAX_SUPPLY_EXS = 21_000_000
#: Nominal maximum supply, in base units.
MAX_SUPPLY_BASE = MAX_SUPPLY_EXS * EXS_SATS

#: Forge (block) reward at height 0, in whole EXS (site: "50 $EXS per forge").
INITIAL_FORGE_REWARD_EXS = 50
#: Forge reward at height 0, in base units.
INITIAL_FORGE_REWARD_BASE = INITIAL_FORGE_REWARD_EXS * EXS_SATS

#: Reward halves every this many forges (site: "halving every 210,000 blocks").
HALVING_INTERVAL_BLOCKS = 210_000

# ---------------------------------------------------------------------------
# Per-forge allocation
# ---------------------------------------------------------------------------
#: Treasury tithe: percent of each forge reward routed to the treasury
#: *before* the allocation split below is applied to the remainder.
TREASURY_TITHE_PCT = 1

#: Allocation of the post-tithe remainder (site tokenomics bars).
ALLOC_MINER_PCT = 60        # PoF miners (forge winner)
ALLOC_LIQUIDITY_PCT = 20    # liquidity
ALLOC_TREASURY_PCT = 15      # treasury
ALLOC_AIRDROP_PCT = 5        # airdrop

# ---------------------------------------------------------------------------
# Forge fee (Bitcoin-side; out of scope for this module)
# ---------------------------------------------------------------------------
#: Forge fee settled on Bitcoin, recorded exactly as published
#: (site: "0.0001 BTC forge fee"). This module performs no Bitcoin
#: settlement; the constant exists so chain code can reference it.
FORGE_FEE_BTC = Decimal("0.0001")

# ---------------------------------------------------------------------------
# Treasury release
# ---------------------------------------------------------------------------
#: Treasury funds unlock on a rolling release of this many months.
TREASURY_RELEASE_MONTHS = 12

#: Assumed forges per month for the release window. This assumes a
#: ~10-minute forge cadence (Bitcoin-like: 144 forges/day * 30 days).
#: The sovereign forge cadence is NOT fixed by this module — callers pass
#: blocks_per_month explicitly when the cadence is known.
ASSUMED_BLOCKS_PER_MONTH = 4_320


# ---------------------------------------------------------------------------
# Reward schedule
# ---------------------------------------------------------------------------
def block_reward(height: int) -> int:
    """Forge reward at ``height``, in base units (integer math).

    ``INITIAL_FORGE_REWARD_BASE >> (height // HALVING_INTERVAL_BLOCKS)``.
    Right-shifting a non-negative int can only reach 0, never negative —
    the reward decays to exactly 0 at extreme heights.
    """
    if height < 0:
        raise ValueError("height must be >= 0")
    halvings = height // HALVING_INTERVAL_BLOCKS
    return INITIAL_FORGE_REWARD_BASE >> halvings


def supply_at_height(height: int) -> int:
    """Cumulative *scheduled* issuance for forges 0..``height`` (inclusive),
    in base units. Closed-form over halving eras (exact, O(eras)).

    IMPORTANT — schedule vs. consensus: this is the issuance *schedule*.
    The no-premine consensus rule voids the genesis (height-0) coinbase —
    it pays no one — so realized chain supply at genesis is 0. The rule is
    enforced by chain/consensus code, not here; this module provides
    :func:`genesis_coinbase_is_valid` as the check the caller runs.

    Integer halvings truncate toward zero, so realized maximum supply is
    marginally *below* the nominal 21,000,000 EXS cap; the schedule can
    never exceed it.
    """
    if height < 0:
        raise ValueError("height must be >= 0")
    full_eras = (height + 1) // HALVING_INTERVAL_BLOCKS
    total = 0
    for era in range(full_eras):
        total += (INITIAL_FORGE_REWARD_BASE >> era) * HALVING_INTERVAL_BLOCKS
    leftover = (height + 1) % HALVING_INTERVAL_BLOCKS
    if leftover:
        total += (INITIAL_FORGE_REWARD_BASE >> full_eras) * leftover
    return total


# ---------------------------------------------------------------------------
# Allocation
# ---------------------------------------------------------------------------
def validate_allocation() -> bool:
    """Assert the published allocation is internally consistent.

    60 + 20 + 15 + 5 == 100, and the tithe is a sane percent (0 <= t < 100).
    Returns True when valid; raises AssertionError otherwise.
    """
    total = (
        ALLOC_MINER_PCT
        + ALLOC_LIQUIDITY_PCT
        + ALLOC_TREASURY_PCT
        + ALLOC_AIRDROP_PCT
    )
    assert total == 100, f"allocation sums to {total}, expected 100"
    assert 0 <= TREASURY_TITHE_PCT < 100, (
        f"tithe {TREASURY_TITHE_PCT}% out of range"
    )
    return True


def coinbase_split(
    reward_base_units: int,
    treasury_addr,
    liquidity_addr,
    airdrop_addr,
    miner_addr,
) -> dict:
    """Split a forge reward into coinbase payees. Integer math, no dust loss.

    Tithe-before-split rule (explicit design choice, from the site copy):
    the 1% treasury tithe is carved off the *full* forge reward first —
    "50 $EXS per forge — 49.5 to you, 0.5 to the treasury" — and the
    60/20/15/5 allocation is then applied to the *remainder* (49.5 EXS).
    So per 50-EXS forge: treasury gets 0.5 + 15% of 49.5 = 7.925 EXS,
    the miner gets 60% of 49.5 = 29.7 EXS (+ any dust), liquidity 9.9,
    airdrop 2.475. The site's "60% of the 21M to miners" bars describe the
    post-tithe split; this function is the precise rule.

    Addresses are PARAMETERS, never hardcoded — no address is invented
    here. A ``None`` address raises ``ValueError`` (fail closed: forging a
    coinbase with an unassigned payee is refused rather than silently
    burning or misdirecting funds).

    Returns ``{label: (address, amount_base_units)}`` with labels
    "tithe", "miner", "liquidity", "treasury", "airdrop". The parts are
    asserted to sum *exactly* to ``reward_base_units``; any integer-division
    leftover ("dust") is assigned to the miner (the forge winner).
    """
    for label, addr in (
        ("treasury", treasury_addr),
        ("liquidity", liquidity_addr),
        ("airdrop", airdrop_addr),
        ("miner", miner_addr),
    ):
        if addr is None:
            raise ValueError(
                f"{label} address is None: refusing to split a coinbase "
                "with an unassigned payee"
            )
    if reward_base_units < 0:
        raise ValueError("reward must be >= 0")
    validate_allocation()

    tithe = (reward_base_units * TREASURY_TITHE_PCT) // 100
    remainder = reward_base_units - tithe

    miner_amt = (remainder * ALLOC_MINER_PCT) // 100
    liquidity_amt = (remainder * ALLOC_LIQUIDITY_PCT) // 100
    treasury_amt = (remainder * ALLOC_TREASURY_PCT) // 100
    airdrop_amt = (remainder * ALLOC_AIRDROP_PCT) // 100

    dust = remainder - (miner_amt + liquidity_amt + treasury_amt + airdrop_amt)
    assert dust >= 0, "split exceeded remainder"
    miner_amt += dust  # no dust loss: leftover base units go to the winner

    parts = {
        "tithe": (treasury_addr, tithe),
        "miner": (miner_addr, miner_amt),
        "liquidity": (liquidity_addr, liquidity_amt),
        "treasury": (treasury_addr, treasury_amt),
        "airdrop": (airdrop_addr, airdrop_amt),
    }
    total = sum(amount for _, amount in parts.values())
    assert total == reward_base_units, (
        f"coinbase parts sum to {total}, expected {reward_base_units}"
    )
    return parts


# ---------------------------------------------------------------------------
# Treasury rolling release
# ---------------------------------------------------------------------------
def treasury_unlock_schedule(
    months: int = TREASURY_RELEASE_MONTHS,
    blocks_per_month: int = ASSUMED_BLOCKS_PER_MONTH,
) -> dict:
    """Parameters of the 12-month rolling treasury release.

    Rule: treasury funds unlock *linearly* over the trailing ``months`` of
    blocks, measured from each deposit's height. ``blocks_per_month`` is a
    documented assumption (default: 4,320 ≈ 10-minute forge cadence);
    pass the real cadence when known.
    """
    if months <= 0:
        raise ValueError("months must be > 0")
    if blocks_per_month <= 0:
        raise ValueError("blocks_per_month must be > 0")
    return {
        "months": months,
        "blocks_per_month": blocks_per_month,
        "window_blocks": months * blocks_per_month,
    }


def treasury_releasable(
    deposits,
    current_height: int,
    months: int = TREASURY_RELEASE_MONTHS,
    blocks_per_month: int = ASSUMED_BLOCKS_PER_MONTH,
) -> int:
    """Total treasury amount releasable at ``current_height``, base units.

    ``deposits`` is an iterable of ``(deposit_height, amount_base_units)``.
    Each deposit vests linearly: at ``elapsed = current_height -
    deposit_height`` blocks after deposit, the releasable fraction is
    ``min(1, elapsed / window_blocks)`` (integer math, truncating).
    Deposits at future heights release nothing.
    """
    if current_height < 0:
        raise ValueError("current_height must be >= 0")
    window = treasury_unlock_schedule(months, blocks_per_month)["window_blocks"]
    total = 0
    for dep_height, amount in deposits:
        if amount < 0:
            raise ValueError("deposit amount must be >= 0")
        elapsed = current_height - dep_height
        if elapsed <= 0:
            continue
        vested = amount if elapsed >= window else (amount * elapsed) // window
        total += vested
    return total


# ---------------------------------------------------------------------------
# No-premine consensus check (enforced by the caller)
# ---------------------------------------------------------------------------
def genesis_coinbase_is_valid(coinbase_outputs) -> bool:
    """True iff the genesis coinbase pays no one.

    The no-premine rule — "the genesis forge pays no one", "shares are
    fixed at genesis — none minted for founders" — is a consensus rule the
    chain enforces. This module does not mint; it hands the caller the
    check: pass the genesis block's coinbase outputs (any sequence); valid
    only when empty.
    """
    return len(list(coinbase_outputs)) == 0
